-- Hi!Book 2.0 — standard chart of accounts + payment/refund ledger posting
-- The existing financial_accounts table is the chart of accounts.
-- This migration adds controlled system accounts and idempotent posting RPCs.

begin;

-- ============================================================
-- 1. STANDARD ACCOUNT CODES
-- ============================================================
-- Account codes are generated per currency because every ledger account
-- has exactly one currency. These are the minimum accounts needed for
-- current payment/refund accounting. More specialized accounts can be
-- added later without changing ledger mechanics.

create or replace function public.ensure_standard_financial_accounts(p_currency_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_currency public.currencies%rowtype;
  v_clearing uuid;
  v_revenue uuid;
  v_refund_contra uuid;
begin
  if not public.is_trusted_server() then
    raise exception 'Chart-of-accounts changes are server-only';
  end if;

  select * into v_currency from public.currencies where id = p_currency_id for update;
  if not found then raise exception 'Currency does not exist'; end if;

  insert into public.financial_accounts(account_code,account_name,account_type,currency_id,status)
  values
    ('PAYMENT_CLEARING_' || upper(v_currency.code), 'Payment Clearing - ' || upper(v_currency.code), 'ASSET', v_currency.id, 'ACTIVE'),
    ('PLATFORM_REVENUE_' || upper(v_currency.code), 'Platform Revenue - ' || upper(v_currency.code), 'REVENUE', v_currency.id, 'ACTIVE'),
    ('REFUND_CONTRA_REVENUE_' || upper(v_currency.code), 'Refund Contra-Revenue - ' || upper(v_currency.code), 'REVENUE', v_currency.id, 'ACTIVE')
  on conflict (account_code) do update
    set account_name = excluded.account_name;

  select id into v_clearing from public.financial_accounts
   where account_code = 'PAYMENT_CLEARING_' || upper(v_currency.code)
     and currency_id = v_currency.id;
  select id into v_revenue from public.financial_accounts
   where account_code = 'PLATFORM_REVENUE_' || upper(v_currency.code)
     and currency_id = v_currency.id;
  select id into v_refund_contra from public.financial_accounts
   where account_code = 'REFUND_CONTRA_REVENUE_' || upper(v_currency.code)
     and currency_id = v_currency.id;

  return jsonb_build_object(
    'currency_id', v_currency.id,
    'payment_clearing_account_id', v_clearing,
    'platform_revenue_account_id', v_revenue,
    'refund_contra_revenue_account_id', v_refund_contra
  );
end;
$$;

revoke all on function public.ensure_standard_financial_accounts(uuid) from public, anon, authenticated;
grant execute on function public.ensure_standard_financial_accounts(uuid) to service_role;

-- ============================================================
-- 2. IDEMPOTENT PAYMENT POSTING
-- ============================================================

create or replace function public.post_payment_financial_transaction(p_payment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_payment public.payments%rowtype;
  v_purchase public.purchases%rowtype;
  v_currency public.currencies%rowtype;
  v_clearing uuid;
  v_revenue uuid;
  v_existing uuid;
  v_group uuid;
begin
  if not public.is_trusted_server() then
    raise exception 'Payment financial posting is server-only';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Payment does not exist'; end if;

  select * into v_purchase from public.purchases where id = v_payment.purchase_id for update;
  if not found then raise exception 'Purchase does not exist'; end if;

  if v_payment.user_id <> v_purchase.user_id then
    raise exception 'Payment user does not match purchase user';
  end if;

  if v_payment.amount <> v_purchase.total_amount or v_payment.currency_id <> v_purchase.currency_id then
    raise exception 'Payment snapshot does not match purchase snapshot';
  end if;

  if v_payment.status not in ('SUCCEEDED','PARTIALLY_REFUNDED','REFUNDED') then
    raise exception 'Only successful payments may be posted';
  end if;

  select id into v_existing
    from public.financial_ledger_entries
   where reference_type = 'PAYMENT'
     and reference_id = v_payment.id
   limit 1;
  if v_existing is not null then
    select transaction_group_id into v_group from public.financial_ledger_entries where id = v_existing;
    return v_group;
  end if;

  select * into v_currency from public.currencies where id = v_payment.currency_id and is_active = true;
  if not found then raise exception 'Payment currency is inactive or missing'; end if;

  perform public.ensure_standard_financial_accounts(v_currency.id);

  select id into v_clearing from public.financial_accounts
   where account_code = 'PAYMENT_CLEARING_' || upper(v_currency.code) and status = 'ACTIVE';
  select id into v_revenue from public.financial_accounts
   where account_code = 'PLATFORM_REVENUE_' || upper(v_currency.code) and status = 'ACTIVE';

  v_group := public.post_financial_transaction(
    v_currency.id,
    jsonb_build_array(
      jsonb_build_object('account_id', v_clearing, 'direction', 'DEBIT', 'amount', v_payment.amount, 'description', 'Payment clearing for ' || v_payment.provider_reference),
      jsonb_build_object('account_id', v_revenue, 'direction', 'CREDIT', 'amount', v_payment.amount, 'description', 'Revenue recognition for purchase ' || v_purchase.id::text)
    ),
    'PAYMENT',
    v_payment.id,
    coalesce(v_payment.paid_at, now()),
    'Payment financial posting ' || v_payment.id::text,
    null
  );

  return v_group;
end;
$$;

revoke all on function public.post_payment_financial_transaction(uuid) from public, anon, authenticated;
grant execute on function public.post_payment_financial_transaction(uuid) to service_role;

-- ============================================================
-- 3. IDEMPOTENT REFUND POSTING
-- ============================================================

create or replace function public.post_refund_financial_transaction(p_refund_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_refund public.refunds%rowtype;
  v_payment public.payments%rowtype;
  v_currency public.currencies%rowtype;
  v_clearing uuid;
  v_refund_contra uuid;
  v_existing uuid;
  v_group uuid;
begin
  if not public.is_trusted_server() then
    raise exception 'Refund financial posting is server-only';
  end if;

  select * into v_refund from public.refunds where id = p_refund_id for update;
  if not found then raise exception 'Refund does not exist'; end if;

  select * into v_payment from public.payments where id = v_refund.payment_id for update;
  if not found then raise exception 'Refund payment does not exist'; end if;

  if v_refund.purchase_id <> v_payment.purchase_id then
    raise exception 'Refund purchase does not match payment purchase';
  end if;

  if v_refund.currency_id <> v_payment.currency_id then
    raise exception 'Refund currency does not match payment currency';
  end if;

  if v_refund.status <> 'COMPLETED' then
    raise exception 'Only completed refunds may be posted';
  end if;

  select transaction_group_id into v_group
    from public.financial_ledger_entries
   where reference_type = 'REFUND'
     and reference_id = v_refund.id
   limit 1;
  if v_group is not null then return v_group; end if;

  select * into v_currency from public.currencies where id = v_refund.currency_id and is_active = true;
  if not found then raise exception 'Refund currency is inactive or missing'; end if;

  perform public.ensure_standard_financial_accounts(v_currency.id);

  select id into v_clearing from public.financial_accounts
   where account_code = 'PAYMENT_CLEARING_' || upper(v_currency.code) and status = 'ACTIVE';
  select id into v_refund_contra from public.financial_accounts
   where account_code = 'REFUND_CONTRA_REVENUE_' || upper(v_currency.code) and status = 'ACTIVE';

  v_group := public.post_financial_transaction(
    v_currency.id,
    jsonb_build_array(
      jsonb_build_object('account_id', v_refund_contra, 'direction', 'DEBIT', 'amount', v_refund.amount, 'description', 'Refund contra-revenue for refund ' || v_refund.id::text),
      jsonb_build_object('account_id', v_clearing, 'direction', 'CREDIT', 'amount', v_refund.amount, 'description', 'Refund settlement for payment ' || v_payment.id::text)
    ),
    'REFUND',
    v_refund.id,
    coalesce(v_refund.completed_at, now()),
    'Refund financial posting ' || v_refund.id::text,
    null
  );

  return v_group;
end;
$$;

revoke all on function public.post_refund_financial_transaction(uuid) from public, anon, authenticated;
grant execute on function public.post_refund_financial_transaction(uuid) to service_role;

commit;
