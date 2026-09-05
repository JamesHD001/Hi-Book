-- Hi!Book 2.0 — final cross-domain security audit hardening
-- This migration closes gaps found after the schema/RLS/payment/HBC review.
-- It is intentionally additive and keeps high-risk state server-owned.

begin;

-- ============================================================
-- 1. LATE-ADDED FINANCIAL/FULFILLMENT TABLES: RLS
-- ============================================================

alter table public.product_fulfillment_rules enable row level security;
alter table public.fulfillments enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.hbc_recovery_obligations enable row level security;

-- These tables have no client policies by design. Trusted server/worker
-- functions operate through SECURITY DEFINER/service-role boundaries.

-- ============================================================
-- 2. HBC RECOVERY UPDATED_AT ENFORCEMENT
-- ============================================================

drop trigger if exists trg_hbc_recovery_obligations_updated_at on public.hbc_recovery_obligations;
create trigger trg_hbc_recovery_obligations_updated_at
before update on public.hbc_recovery_obligations
for each row execute function public.set_updated_at();

-- ============================================================
-- 3. HBC RECOVERY CROSS-DOMAIN CONSISTENCY
-- ============================================================

create or replace function public.validate_hbc_recovery_cross_domain()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_fulfillment public.fulfillments%rowtype;
  v_refund public.refunds%rowtype;
  v_purchase public.purchases%rowtype;
begin
  select * into v_fulfillment
    from public.fulfillments
   where id = new.fulfillment_id;

  if not found then
    raise exception 'HBC recovery fulfillment does not exist';
  end if;

  if new.user_id <> v_fulfillment.user_id then
    raise exception 'HBC recovery user does not match fulfillment user';
  end if;

  if new.currency_id <> v_fulfillment.currency_id then
    raise exception 'HBC recovery currency does not match fulfillment currency';
  end if;

  if new.source_type = 'REFUND' then
    select * into v_refund
      from public.refunds
     where id = new.source_id;

    if not found then
      raise exception 'HBC recovery refund does not exist';
    end if;

    if v_refund.purchase_id <> v_fulfillment.purchase_id then
      raise exception 'HBC recovery refund does not match fulfillment purchase';
    end if;

    select * into v_purchase
      from public.purchases
     where id = v_refund.purchase_id;

    if not found or v_purchase.user_id <> new.user_id then
      raise exception 'HBC recovery user does not match refund purchase';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_hbc_recovery_cross_domain on public.hbc_recovery_obligations;
create trigger trg_validate_hbc_recovery_cross_domain
before insert or update on public.hbc_recovery_obligations
for each row execute function public.validate_hbc_recovery_cross_domain();

-- ============================================================
-- 4. PAYMENT ↔ PURCHASE IDENTITY INTEGRITY
-- ============================================================

create or replace function public.validate_payment_purchase_identity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_provider public.payment_providers%rowtype;
begin
  select * into v_purchase
    from public.purchases
   where id = new.purchase_id;

  if not found then
    raise exception 'Payment purchase does not exist';
  end if;

  if new.user_id <> v_purchase.user_id then
    raise exception 'Payment user does not match purchase user';
  end if;

  select * into v_provider
    from public.payment_providers
   where id = new.provider_id;

  if not found then
    raise exception 'Payment provider does not exist';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_payment_purchase_identity on public.payments;
create trigger trg_validate_payment_purchase_identity
before insert or update of purchase_id,user_id,provider_id on public.payments
for each row execute function public.validate_payment_purchase_identity();

-- ============================================================
-- 5. PAYMENT ATTEMPT ↔ PAYMENT INTEGRITY
-- ============================================================

create or replace function public.validate_payment_attempt_consistency()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_payment public.payments%rowtype;
begin
  select * into v_payment
    from public.payments
   where id = new.payment_id;

  if not found then
    raise exception 'Payment attempt payment does not exist';
  end if;

  if new.provider_id <> v_payment.provider_id then
    raise exception 'Payment attempt provider does not match payment provider';
  end if;

  if new.currency_id <> v_payment.currency_id then
    raise exception 'Payment attempt currency does not match payment currency';
  end if;

  if new.requested_amount <> v_payment.amount then
    raise exception 'Payment attempt amount does not match payment amount';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_payment_attempt_consistency on public.payment_attempts;
create trigger trg_validate_payment_attempt_consistency
before insert or update of payment_id,provider_id,requested_amount,currency_id on public.payment_attempts
for each row execute function public.validate_payment_attempt_consistency();

-- ============================================================
-- 6. FULFILLMENT CANNOT DELIVER TO A DIFFERENT PURCHASE USER
-- ============================================================

create or replace function public.validate_fulfillment_user_consistency()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_rule public.product_fulfillment_rules%rowtype;
begin
  select * into v_purchase
    from public.purchases
   where id = new.purchase_id;

  if not found then
    raise exception 'Fulfillment purchase does not exist';
  end if;

  if new.user_id <> v_purchase.user_id or new.product_id <> v_purchase.product_id then
    raise exception 'Fulfillment does not match purchase identity';
  end if;

  if new.fulfillment_rule_id is not null then
    select * into v_rule
      from public.product_fulfillment_rules
     where id = new.fulfillment_rule_id;

    if not found then
      raise exception 'Fulfillment rule does not exist';
    end if;

    if v_rule.product_id <> new.product_id or v_rule.fulfillment_type <> new.fulfillment_type then
      raise exception 'Fulfillment rule does not match fulfillment';
    end if;

    if new.currency_id is not null and v_rule.currency_id is not null and new.currency_id <> v_rule.currency_id then
      raise exception 'Fulfillment currency does not match fulfillment rule';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_fulfillment_user_consistency on public.fulfillments;
create trigger trg_validate_fulfillment_user_consistency
before insert or update of purchase_id,user_id,product_id,fulfillment_rule_id,fulfillment_type,currency_id on public.fulfillments
for each row execute function public.validate_fulfillment_user_consistency();

-- ============================================================
-- 7. WEBHOOK EVENT SANITY
-- ============================================================

create or replace function public.validate_payment_webhook_event()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_payment public.payments%rowtype;
  v_provider public.payment_providers%rowtype;
begin
  select * into v_provider from public.payment_providers where id = new.provider_id;
  if not found then
    raise exception 'Webhook provider does not exist';
  end if;

  if new.payment_id is not null then
    select * into v_payment from public.payments where id = new.payment_id;
    if not found then
      raise exception 'Webhook payment does not exist';
    end if;
    if v_payment.provider_id <> new.provider_id then
      raise exception 'Webhook provider does not match payment provider';
    end if;
    if new.provider_reference is not null and new.provider_reference <> v_payment.provider_reference then
      raise exception 'Webhook provider reference does not match payment';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_payment_webhook_event on public.payment_webhook_events;
create trigger trg_validate_payment_webhook_event
before insert or update of provider_id,payment_id,provider_reference on public.payment_webhook_events
for each row execute function public.validate_payment_webhook_event();

commit;
