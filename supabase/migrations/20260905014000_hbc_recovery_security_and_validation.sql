-- Hi!Book 2.0 — HBC recovery security and cross-domain validation
-- Recovery obligations are financial-risk records and are never client-writable.

begin;

-- ============================================================
-- 1. HBC RECOVERY RLS / CLIENT ACCESS
-- ============================================================

alter table public.hbc_recovery_obligations enable row level security;

revoke all on table public.hbc_recovery_obligations from anon, authenticated;

-- No ordinary user policy is provided intentionally. Recovery obligations
-- are operational/financial records and are exposed only through controlled
-- server-side workflows or future permissioned admin read models.

-- ============================================================
-- 2. CROSS-DOMAIN RECOVERY VALIDATION
-- ============================================================

create or replace function public.validate_hbc_recovery_obligation_context()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_fulfillment public.fulfillments%rowtype;
  v_currency public.currencies%rowtype;
  v_refund public.refunds%rowtype;
begin
  select * into v_fulfillment
    from public.fulfillments
   where id = new.fulfillment_id;

  if not found then
    raise exception 'HBC recovery fulfillment does not exist';
  end if;

  if v_fulfillment.user_id <> new.user_id then
    raise exception 'HBC recovery user does not match fulfillment';
  end if;

  if v_fulfillment.currency_id <> new.currency_id then
    raise exception 'HBC recovery currency does not match fulfillment';
  end if;

  if v_fulfillment.fulfillment_type <> 'HBC_CREDIT' then
    raise exception 'HBC recovery requires an HBC fulfillment';
  end if;

  select * into v_currency
    from public.currencies
   where id = new.currency_id;

  if not found or v_currency.code <> 'HBC' or v_currency.currency_type <> 'VIRTUAL' then
    raise exception 'HBC recovery must use the HBC virtual currency';
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

    if v_refund.status <> 'COMPLETED' then
      raise exception 'HBC recovery requires a completed refund';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_hbc_recovery_obligation_context on public.hbc_recovery_obligations;
create trigger trg_validate_hbc_recovery_obligation_context
before insert or update on public.hbc_recovery_obligations
for each row execute function public.validate_hbc_recovery_obligation_context();

-- ============================================================
-- 3. PROTECT RECOVERY SOURCE / IMMUTABLE CORE FIELDS
-- ============================================================

create or replace function public.protect_hbc_recovery_obligation_identity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not public.is_trusted_server() then
    raise exception 'HBC recovery obligations are server-only';
  end if;

  if tg_op = 'UPDATE' then
    if new.source_type <> old.source_type
       or new.source_id <> old.source_id
       or new.fulfillment_id <> old.fulfillment_id
       or new.user_id <> old.user_id
       or new.currency_id <> old.currency_id
       or new.original_quantity <> old.original_quantity then
      raise exception 'HBC recovery obligation identity is immutable';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_hbc_recovery_obligation_identity on public.hbc_recovery_obligations;
create trigger trg_protect_hbc_recovery_obligation_identity
before insert or update on public.hbc_recovery_obligations
for each row execute function public.protect_hbc_recovery_obligation_identity();

revoke all on function public.validate_hbc_recovery_obligation_context() from public, anon, authenticated;
revoke all on function public.protect_hbc_recovery_obligation_identity() from public, anon, authenticated;

commit;
