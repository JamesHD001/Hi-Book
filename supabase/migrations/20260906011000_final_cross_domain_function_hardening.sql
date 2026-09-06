begin;

-- Cross-domain validator trigger functions execute privileged integrity checks
-- against server-owned financial/fulfillment tables. Keep their execution
-- context controlled and prevent direct public invocation.

create or replace function public.validate_hbc_recovery_cross_domain()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_fulfillment public.fulfillments%rowtype;
  v_refund public.refunds%rowtype;
  v_purchase public.purchases%rowtype;
begin
  select * into v_fulfillment from public.fulfillments where id = new.fulfillment_id;
  if not found then raise exception 'HBC recovery fulfillment does not exist'; end if;
  if new.user_id <> v_fulfillment.user_id then raise exception 'HBC recovery user does not match fulfillment user'; end if;
  if new.currency_id <> v_fulfillment.currency_id then raise exception 'HBC recovery currency does not match fulfillment currency'; end if;
  if new.source_type = 'REFUND' then
    select * into v_refund from public.refunds where id = new.source_id;
    if not found then raise exception 'HBC recovery refund does not exist'; end if;
    if v_refund.purchase_id <> v_fulfillment.purchase_id then raise exception 'HBC recovery refund does not match fulfillment purchase'; end if;
    select * into v_purchase from public.purchases where id = v_refund.purchase_id;
    if not found or v_purchase.user_id <> new.user_id then raise exception 'HBC recovery user does not match refund purchase'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.validate_payment_purchase_identity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_provider public.payment_providers%rowtype;
begin
  select * into v_purchase from public.purchases where id = new.purchase_id;
  if not found then raise exception 'Payment purchase does not exist'; end if;
  if new.user_id <> v_purchase.user_id then raise exception 'Payment user does not match purchase user'; end if;
  select * into v_provider from public.payment_providers where id = new.provider_id;
  if not found then raise exception 'Payment provider does not exist'; end if;
  return new;
end;
$$;

create or replace function public.validate_payment_attempt_consistency()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_payment public.payments%rowtype;
begin
  select * into v_payment from public.payments where id = new.payment_id;
  if not found then raise exception 'Payment attempt payment does not exist'; end if;
  if new.provider_id <> v_payment.provider_id then raise exception 'Payment attempt provider does not match payment provider'; end if;
  if new.currency_id <> v_payment.currency_id then raise exception 'Payment attempt currency does not match payment currency'; end if;
  if new.requested_amount <> v_payment.amount then raise exception 'Payment attempt amount does not match payment amount'; end if;
  return new;
end;
$$;

create or replace function public.validate_fulfillment_user_consistency()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_purchase public.purchases%rowtype;
  v_rule public.product_fulfillment_rules%rowtype;
begin
  select * into v_purchase from public.purchases where id = new.purchase_id;
  if not found then raise exception 'Fulfillment purchase does not exist'; end if;
  if new.user_id <> v_purchase.user_id or new.product_id <> v_purchase.product_id then raise exception 'Fulfillment does not match purchase identity'; end if;
  if new.fulfillment_rule_id is not null then
    select * into v_rule from public.product_fulfillment_rules where id = new.fulfillment_rule_id;
    if not found then raise exception 'Fulfillment rule does not exist'; end if;
    if v_rule.product_id <> new.product_id or v_rule.fulfillment_type <> new.fulfillment_type then raise exception 'Fulfillment rule does not match fulfillment'; end if;
    if new.currency_id is not null and v_rule.currency_id is not null and new.currency_id <> v_rule.currency_id then raise exception 'Fulfillment currency does not match fulfillment rule'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.validate_payment_webhook_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_payment public.payments%rowtype;
  v_provider public.payment_providers%rowtype;
begin
  select * into v_provider from public.payment_providers where id = new.provider_id;
  if not found then raise exception 'Webhook provider does not exist'; end if;
  if new.payment_id is not null then
    select * into v_payment from public.payments where id = new.payment_id;
    if not found then raise exception 'Webhook payment does not exist'; end if;
    if v_payment.provider_id <> new.provider_id then raise exception 'Webhook provider does not match payment provider'; end if;
    if new.provider_reference is not null and new.provider_reference <> v_payment.provider_reference then raise exception 'Webhook provider reference does not match payment'; end if;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_hbc_recovery_cross_domain() from public;
revoke all on function public.validate_payment_purchase_identity() from public;
revoke all on function public.validate_payment_attempt_consistency() from public;
revoke all on function public.validate_fulfillment_user_consistency() from public;
revoke all on function public.validate_payment_webhook_event() from public;

commit;
