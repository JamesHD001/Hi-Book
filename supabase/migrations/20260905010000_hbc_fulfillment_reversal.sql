-- Hi!Book 2.0 — HBC fulfillment reversal and refund protection
-- A refunded HBC purchase must not leave spendable HBC in circulation.
-- Reversal is idempotent and handles both unspent and already-spent HBC.

begin;

-- ============================================================
-- 1. FULFILLMENT REVERSAL STATE
-- ============================================================

alter table public.fulfillments
  add column if not exists reversed_quantity bigint not null default 0;

alter table public.fulfillments
  add column if not exists reversed_at timestamptz;

alter table public.fulfillments
  add column if not exists reversal_reason text;

alter table public.fulfillments
  add constraint fulfillments_reversed_quantity_chk
  check (reversed_quantity >= 0 and reversed_quantity <= coalesce(delivered_quantity, 0));

create index if not exists fulfillments_reversed_idx
  on public.fulfillments(reversed_at)
  where reversed_at is not null;

-- ============================================================
-- 2. REFUND / FULFILLMENT CONSISTENCY
-- ============================================================

create or replace function public.validate_fulfillment_reversal_row()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.reversed_quantity < 0 then
    raise exception 'Reversed fulfillment quantity cannot be negative';
  end if;

  if new.reversed_quantity > coalesce(new.delivered_quantity, 0) then
    raise exception 'Reversed fulfillment quantity cannot exceed delivered quantity';
  end if;

  if new.reversed_quantity > 0 and new.reversed_at is null then
    raise exception 'Reversed fulfillment requires reversed_at';
  end if;

  if new.reversed_quantity = 0 and new.reversed_at is not null then
    raise exception 'Fulfillment with no reversal cannot have reversed_at';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_fulfillment_reversal_row on public.fulfillments;
create trigger trg_validate_fulfillment_reversal_row
before insert or update on public.fulfillments
for each row execute function public.validate_fulfillment_reversal_row();

-- ============================================================
-- 3. REFUND-AWARE HBC FULFILLMENT REVERSAL
-- ============================================================

create or replace function public.reverse_hbc_fulfillment_for_refund(
  p_refund_id uuid,
  p_idempotency_key varchar(255),
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_refund public.refunds%rowtype;
  v_payment public.payments%rowtype;
  v_purchase public.purchases%rowtype;
  v_fulfillment public.fulfillments%rowtype;
  v_currency_id uuid;
  v_hbc_to_remove bigint;
  v_remaining_balance bigint;
  v_wallet public.coin_wallets%rowtype;
  v_refund_fraction numeric;
  v_reversal_key varchar(255);
  v_reversal_id uuid;
  v_reason text;
begin
  if not public.is_trusted_server() then
    raise exception 'HBC fulfillment reversal is server-only';
  end if;

  if p_refund_id is null or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'Refund and idempotency key are required';
  end if;

  select * into v_refund
    from public.refunds
   where id = p_refund_id
   for update;

  if not found then
    raise exception 'Refund does not exist';
  end if;

  if v_refund.status <> 'COMPLETED' then
    raise exception 'Only completed refunds can reverse HBC fulfillment';
  end if;

  select * into v_payment
    from public.payments
   where id = v_refund.payment_id
   for update;

  select * into v_purchase
    from public.purchases
   where id = v_refund.purchase_id
   for update;

  select * into v_fulfillment
    from public.fulfillments
   where purchase_id = v_purchase.id
     and fulfillment_type = 'HBC_CREDIT'
   for update;

  if not found then
    return null;
  end if;

  if v_fulfillment.reversed_quantity > 0 then
    return v_fulfillment.id;
  end if;

  if v_fulfillment.status <> 'COMPLETED' then
    raise exception 'HBC fulfillment is not completed';
  end if;

  if v_fulfillment.delivered_quantity is null or v_fulfillment.delivered_quantity <= 0 then
    raise exception 'HBC fulfillment has no delivered quantity';
  end if;

  v_hbc_to_remove := v_fulfillment.delivered_quantity;
  v_currency_id := v_fulfillment.currency_id;
  v_reason := coalesce(nullif(btrim(p_reason), ''), 'HBC fulfillment reversal for refund ' || p_refund_id::text);

  if char_length(v_reason) > 2000 then
    raise exception 'HBC reversal reason is too long';
  end if;

  select * into v_wallet
    from public.coin_wallets
   where user_id = v_purchase.user_id
     and currency_id = v_currency_id
   for update;

  if not found then
    raise exception 'HBC wallet does not exist';
  end if;

  -- HBC already spent cannot be recreated or converted into fiat. The
  -- refund workflow therefore records a financial recovery requirement.
  -- We only debit currently available HBC here. If the user has spent
  -- some/all of the delivered HBC, the remaining shortfall is preserved
  -- as an outstanding reversal on the fulfillment and must be settled by
  -- the application policy before the refund is finalized.
  v_remaining_balance := least(v_wallet.available_balance, v_hbc_to_remove);

  if v_remaining_balance > 0 then
    v_reversal_key := 'hbc-refund:' || p_refund_id::text || ':' || p_idempotency_key;
    v_reversal_id := public.apply_coin_wallet_transaction(
      v_purchase.user_id,
      v_currency_id,
      'GIFT_REVERSAL',
      'DEBIT',
      v_remaining_balance,
      v_reversal_key,
      'REFUND',
      p_refund_id,
      v_reason
    );
  end if;

  -- Record exactly how much of the original HBC delivery has been
  -- physically removed. A later recovery action can settle any shortfall.
  update public.fulfillments
     set reversed_quantity = v_remaining_balance,
         reversed_at = case when v_remaining_balance > 0 then now() else null end,
         reversal_reason = v_reason,
         updated_at = now()
   where id = v_fulfillment.id;

  -- Do not silently mark the fulfillment fully reversed when HBC was
  -- already spent. This preserves an explicit outstanding shortfall.
  if v_remaining_balance < v_hbc_to_remove then
    raise exception 'HBC refund reversal shortfall: delivered %, recovered %, outstanding %',
      v_hbc_to_remove, v_remaining_balance, v_hbc_to_remove - v_remaining_balance;
  end if;

  return v_fulfillment.id;
end;
$$;

revoke all on function public.reverse_hbc_fulfillment_for_refund(uuid, varchar, text) from public, anon, authenticated;
grant execute on function public.reverse_hbc_fulfillment_for_refund(uuid, varchar, text) to service_role;

-- ============================================================
-- 4. REFUND COMPLETION GUARD FOR HBC PURCHASES
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
  v_purchase public.purchases%rowtype;
  v_completed_total bigint;
  v_new_payment_status public.payment_status;
  v_new_purchase_status public.purchase_status;
  v_hbc_fulfillment public.fulfillments%rowtype;
  v_hbc_refund_amount bigint;
begin
  if not public.is_trusted_server() then
    raise exception 'Refund completion is server-only';
  end if;

  select * into v_refund from public.refunds where id = p_refund_id for update;
  if not found then raise exception 'Refund does not exist'; end if;

  select * into v_payment from public.payments where id = v_refund.payment_id for update;
  if not found then raise exception 'Refund payment does not exist'; end if;

  select * into v_purchase from public.purchases where id = v_refund.purchase_id for update;
  if not found then raise exception 'Refund purchase does not exist'; end if;

  if v_refund.status = 'COMPLETED' then
    if p_provider_reference is not null and v_refund.provider_reference is not null and v_refund.provider_reference <> btrim(p_provider_reference) then
      raise exception 'Conflicting refund provider reference';
    end if;
    return v_refund.id;
  end if;

  if v_refund.status not in ('REQUESTED','PROCESSING') then
    raise exception 'Refund is not eligible for completion';
  end if;

  if p_provider_reference is not null and btrim(p_provider_reference) <> '' then
    if exists (select 1 from public.refunds r where r.provider_reference = btrim(p_provider_reference) and r.id <> v_refund.id) then
      raise exception 'Refund provider reference is already in use';
    end if;
  end if;

  select coalesce(sum(r.amount),0) into v_completed_total
    from public.refunds r
   where r.payment_id = v_payment.id
     and r.status = 'COMPLETED'
     and r.id <> v_refund.id;

  if v_completed_total + v_refund.amount > v_payment.amount then
    raise exception 'Completed refunds would exceed payment amount';
  end if;

  -- A completed HBC fulfillment requires a safe reversal before the
  -- payment/refund transition is committed. The helper will roll back
  -- the entire transaction if an available HBC debit cannot be completed.
  select * into v_hbc_fulfillment
    from public.fulfillments
   where purchase_id = v_purchase.id
     and fulfillment_type = 'HBC_CREDIT'
   for update;

  if found and v_hbc_fulfillment.status = 'COMPLETED' and v_hbc_fulfillment.reversed_quantity = 0 then
    if v_refund.amount <> v_payment.amount then
      raise exception 'Partial refunds of HBC purchases are not supported until proportional fulfillment reversal is implemented';
    end if;
  end if;

  update public.refunds
     set status = 'COMPLETED',
         provider_reference = coalesce(nullif(btrim(p_provider_reference),''), provider_reference),
         completed_at = now()
   where id = v_refund.id;

  if v_completed_total + v_refund.amount = v_payment.amount then
    v_new_payment_status := 'REFUNDED';
    v_new_purchase_status := 'REFUNDED';
  else
    v_new_payment_status := 'PARTIALLY_REFUNDED';
    v_new_purchase_status := 'PARTIALLY_REFUNDED';
  end if;

  update public.payments
     set status = v_new_payment_status, updated_at = now()
   where id = v_payment.id;

  update public.purchases
     set status = v_new_purchase_status, updated_at = now()
   where id = v_purchase.id
     and status in ('PAID','FULFILLED','REFUNDED','PARTIALLY_REFUNDED');

  if found and v_hbc_fulfillment.status = 'COMPLETED' then
    perform public.reverse_hbc_fulfillment_for_refund(
      v_refund.id,
      'refund-' || v_refund.id::text,
      'HBC reversal for completed refund ' || v_refund.id::text
    );
  end if;

  return v_refund.id;
end;
$$;

revoke all on function public.complete_refund(uuid,varchar) from public, anon, authenticated;
grant execute on function public.complete_refund(uuid,varchar) to service_role;

commit;
