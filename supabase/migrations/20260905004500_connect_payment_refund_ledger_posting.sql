-- Hi!Book 2.0 — connect payment/refund state transitions to accounting
-- This migration keeps payment state and ledger posting atomic.
-- If ledger posting fails, the payment/refund transition rolls back.

begin;

-- ============================================================
-- 1. VERIFIED PAYMENT -> FINANCIAL LEDGER
-- ============================================================

create or replace function public.record_verified_payment(
  p_payment_id uuid,
  p_provider_reference varchar(255),
  p_amount bigint,
  p_currency_id uuid,
  p_provider_status varchar(100),
  p_paid_at timestamptz default null,
  p_verified_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_payment public.payments%rowtype;
  v_purchase public.purchases%rowtype;
  v_provider public.payment_providers%rowtype;
begin
  if not public.is_trusted_server() then
    raise exception 'Payment verification is server-only';
  end if;

  if p_payment_id is null or p_provider_reference is null or btrim(p_provider_reference) = ''
     or p_amount is null or p_amount <= 0 or p_currency_id is null
     or p_provider_status is null or btrim(p_provider_status) = '' then
    raise exception 'Payment verification parameters are incomplete';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Payment does not exist'; end if;

  select * into v_purchase from public.purchases where id = v_payment.purchase_id for update;
  if not found then raise exception 'Payment purchase does not exist'; end if;

  select * into v_provider from public.payment_providers where id = v_payment.provider_id;
  if not found then raise exception 'Payment provider does not exist'; end if;

  if v_payment.provider_reference <> btrim(p_provider_reference) then raise exception 'Provider reference mismatch'; end if;
  if v_payment.amount <> p_amount then raise exception 'Payment amount mismatch'; end if;
  if v_payment.currency_id <> p_currency_id then raise exception 'Payment currency mismatch'; end if;
  if v_payment.user_id <> v_purchase.user_id then raise exception 'Payment user does not match purchase user'; end if;
  if v_payment.amount <> v_purchase.total_amount or v_payment.currency_id <> v_purchase.currency_id then
    raise exception 'Payment snapshot does not match purchase snapshot';
  end if;
  if upper(btrim(p_provider_status)) <> 'SUCCEEDED' then raise exception 'Payment provider status is not successful'; end if;
  if p_verified_at is null then raise exception 'Verified timestamp is required'; end if;
  if p_paid_at is null then p_paid_at := p_verified_at; end if;

  -- A successful payment is idempotent. Accounting posting is also idempotent.
  if v_payment.status = 'SUCCEEDED' then
    perform public.post_payment_financial_transaction(v_payment.id);
    return v_payment.id;
  end if;

  if v_payment.status not in ('INITIATED','PENDING') then
    raise exception 'Payment is not eligible for successful verification';
  end if;

  if v_purchase.status not in ('CREATED','PENDING_PAYMENT','PAID','FULFILLED') then
    raise exception 'Purchase is not eligible for successful payment verification';
  end if;

  update public.payments
     set status = 'SUCCEEDED',
         provider_status = 'SUCCEEDED',
         paid_at = coalesce(paid_at, p_paid_at),
         verified_at = coalesce(verified_at, p_verified_at),
         updated_at = now()
   where id = v_payment.id;

  update public.purchases
     set status = case when status in ('PAID','FULFILLED') then status else 'PAID' end,
         updated_at = now()
   where id = v_purchase.id;

  -- Accounting is part of the same DB transaction as the payment state change.
  perform public.post_payment_financial_transaction(v_payment.id);

  return v_payment.id;
end;
$$;

revoke all on function public.record_verified_payment(uuid,varchar,bigint,uuid,varchar,timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.record_verified_payment(uuid,varchar,bigint,uuid,varchar,timestamptz,timestamptz) to service_role;

-- ============================================================
-- 2. COMPLETED REFUND -> FINANCIAL LEDGER
-- ============================================================

create or replace function public.complete_refund(
  p_refund_id uuid,
  p_provider_reference varchar(255) default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_refund public.refunds%rowtype;
  v_payment public.payments%rowtype;
  v_completed_total bigint;
  v_new_payment_status public.payment_status;
  v_new_purchase_status public.purchase_status;
begin
  if not public.is_trusted_server() then raise exception 'Refund completion is server-only'; end if;

  select * into v_refund from public.refunds where id = p_refund_id for update;
  if not found then raise exception 'Refund does not exist'; end if;
  select * into v_payment from public.payments where id = v_refund.payment_id for update;
  if not found then raise exception 'Refund payment does not exist'; end if;

  if v_refund.status = 'COMPLETED' then
    if p_provider_reference is not null and v_refund.provider_reference is not null
       and v_refund.provider_reference <> btrim(p_provider_reference) then
      raise exception 'Conflicting refund provider reference';
    end if;
    perform public.post_refund_financial_transaction(v_refund.id);
    return v_refund.id;
  end if;

  if v_refund.status not in ('REQUESTED','PROCESSING') then raise exception 'Refund is not eligible for completion'; end if;

  if p_provider_reference is not null and btrim(p_provider_reference) <> ''
     and exists (select 1 from public.refunds r where r.provider_reference=btrim(p_provider_reference) and r.id<>v_refund.id) then
    raise exception 'Refund provider reference is already in use';
  end if;

  select coalesce(sum(r.amount),0) into v_completed_total
    from public.refunds r
   where r.payment_id=v_payment.id and r.status='COMPLETED' and r.id<>v_refund.id;

  if v_completed_total + v_refund.amount > v_payment.amount then raise exception 'Completed refunds would exceed payment amount'; end if;

  update public.refunds
     set status='COMPLETED',
         provider_reference=coalesce(nullif(btrim(p_provider_reference),''),provider_reference),
         completed_at=now()
   where id=v_refund.id;

  if v_completed_total + v_refund.amount = v_payment.amount then
    v_new_payment_status := 'REFUNDED';
    v_new_purchase_status := 'REFUNDED';
  else
    v_new_payment_status := 'PARTIALLY_REFUNDED';
    v_new_purchase_status := 'PARTIALLY_REFUNDED';
  end if;

  update public.payments set status=v_new_payment_status, updated_at=now() where id=v_payment.id;
  update public.purchases
     set status=v_new_purchase_status, updated_at=now()
   where id=v_refund.purchase_id and status in ('PAID','FULFILLED','REFUNDED','PARTIALLY_REFUNDED');

  -- Accounting is part of the same transaction as refund completion.
  perform public.post_refund_financial_transaction(v_refund.id);

  return v_refund.id;
end;
$$;

revoke all on function public.complete_refund(uuid,varchar) from public, anon, authenticated;
grant execute on function public.complete_refund(uuid,varchar) to service_role;

commit;
