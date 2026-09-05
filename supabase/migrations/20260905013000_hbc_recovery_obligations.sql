-- Hi!Book 2.0 — HBC recovery obligations
-- A refunded/charged-back HBC delivery may already have been spent.
-- Never create a negative wallet balance or silently convert HBC to fiat.
-- Instead, recover only available HBC and preserve any remaining HBC quantity
-- as an explicit recovery obligation.

begin;

-- ============================================================
-- 1. DEDICATED HBC REFUND REVERSAL TRANSACTION TYPE
-- ============================================================

do $$
begin
  alter type public.coin_transaction_type add value if not exists 'HBC_REFUND_REVERSAL';
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- 2. HBC RECOVERY OBLIGATION
-- ============================================================

create table if not exists public.hbc_recovery_obligations (
  id uuid primary key default gen_random_uuid(),
  source_type varchar(30) not null,
  source_id uuid not null,
  fulfillment_id uuid not null references public.fulfillments(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete restrict,
  currency_id uuid not null references public.currencies(id) on delete restrict,
  original_quantity bigint not null,
  recovered_quantity bigint not null default 0,
  outstanding_quantity bigint not null,
  status varchar(30) not null default 'OPEN',
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint hbc_recovery_source_type_chk check (source_type in ('REFUND','CHARGEBACK','ADMIN')),
  constraint hbc_recovery_original_qty_chk check (original_quantity > 0),
  constraint hbc_recovery_recovered_qty_chk check (recovered_quantity >= 0 and recovered_quantity <= original_quantity),
  constraint hbc_recovery_outstanding_qty_chk check (outstanding_quantity >= 0 and outstanding_quantity = original_quantity - recovered_quantity),
  constraint hbc_recovery_status_chk check (status in ('OPEN','PARTIALLY_RECOVERED','RECOVERED','CANCELLED')),
  constraint hbc_recovery_resolved_at_chk check (
    (status = 'RECOVERED' and resolved_at is not null)
    or (status <> 'RECOVERED')
  )
);

create unique index if not exists hbc_recovery_source_uq
  on public.hbc_recovery_obligations(source_type, source_id);

create unique index if not exists hbc_recovery_fulfillment_active_uq
  on public.hbc_recovery_obligations(fulfillment_id)
  where status in ('OPEN','PARTIALLY_RECOVERED');

create index if not exists hbc_recovery_user_status_idx
  on public.hbc_recovery_obligations(user_id, status, created_at desc);

create index if not exists hbc_recovery_fulfillment_idx
  on public.hbc_recovery_obligations(fulfillment_id);

create or replace function public.validate_hbc_recovery_obligation_row()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.original_quantity <= 0 then
    raise exception 'HBC recovery original quantity must be positive';
  end if;

  if new.recovered_quantity < 0 or new.recovered_quantity > new.original_quantity then
    raise exception 'Invalid HBC recovery quantity';
  end if;

  if new.outstanding_quantity <> new.original_quantity - new.recovered_quantity then
    raise exception 'HBC recovery outstanding quantity is inconsistent';
  end if;

  if new.outstanding_quantity = 0 and new.status <> 'RECOVERED' then
    raise exception 'Fully recovered HBC obligation must be RECOVERED';
  end if;

  if new.outstanding_quantity > 0 and new.status = 'RECOVERED' then
    raise exception 'Recovered HBC obligation cannot have an outstanding quantity';
  end if;

  if new.status = 'RECOVERED' and new.resolved_at is null then
    raise exception 'Recovered HBC obligation requires resolved_at';
  end if;

  if new.status <> 'RECOVERED' and new.resolved_at is not null then
    raise exception 'Only recovered HBC obligations may have resolved_at';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_hbc_recovery_obligation_row on public.hbc_recovery_obligations;
create trigger trg_validate_hbc_recovery_obligation_row
before insert or update on public.hbc_recovery_obligations
for each row execute function public.validate_hbc_recovery_obligation_row();

-- ============================================================
-- 3. REPLACE REFUND REVERSAL WITH NON-ROLLBACK SHORTFALL HANDLING
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
  v_purchase public.purchases%rowtype;
  v_fulfillment public.fulfillments%rowtype;
  v_wallet public.coin_wallets%rowtype;
  v_hbc_to_remove bigint;
  v_available bigint;
  v_recovered bigint;
  v_outstanding bigint;
  v_reason text;
  v_reversal_key varchar(255);
  v_recovery public.hbc_recovery_obligations%rowtype;
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

  select * into v_purchase
    from public.purchases
   where id = v_refund.purchase_id
   for update;

  if not found then
    raise exception 'Refund purchase does not exist';
  end if;

  select * into v_fulfillment
    from public.fulfillments
   where purchase_id = v_purchase.id
     and fulfillment_type = 'HBC_CREDIT'
   for update;

  if not found then
    return null;
  end if;

  if v_fulfillment.status <> 'COMPLETED' then
    raise exception 'HBC fulfillment is not completed';
  end if;

  if v_fulfillment.delivered_quantity is null or v_fulfillment.delivered_quantity <= 0 then
    raise exception 'HBC fulfillment has no delivered quantity';
  end if;

  -- One recovery obligation is created per refund. Re-running the refund
  -- workflow returns the existing obligation instead of issuing another debit.
  select * into v_recovery
    from public.hbc_recovery_obligations
   where source_type = 'REFUND'
     and source_id = p_refund_id
   for update;

  if found then
    return v_recovery.fulfillment_id;
  end if;

  v_hbc_to_remove := v_fulfillment.delivered_quantity;
  v_reason := coalesce(nullif(btrim(p_reason), ''), 'HBC recovery for completed refund ' || p_refund_id::text);

  if char_length(v_reason) > 2000 then
    raise exception 'HBC recovery reason is too long';
  end if;

  select * into v_wallet
    from public.coin_wallets
   where user_id = v_purchase.user_id
     and currency_id = v_fulfillment.currency_id
   for update;

  if not found then
    raise exception 'HBC wallet does not exist';
  end if;

  -- Never debit below zero. The unavailable portion becomes an explicit
  -- recovery obligation rather than an implicit negative balance.
  v_available := greatest(v_wallet.available_balance, 0);
  v_recovered := least(v_available, v_hbc_to_remove);
  v_outstanding := v_hbc_to_remove - v_recovered;

  if v_recovered > 0 then
    v_reversal_key := 'hbc-refund:' || p_refund_id::text || ':' || p_idempotency_key;
    perform public.apply_coin_wallet_transaction(
      v_purchase.user_id,
      v_fulfillment.currency_id,
      'HBC_REFUND_REVERSAL',
      'DEBIT',
      v_recovered,
      v_reversal_key,
      'REFUND',
      p_refund_id,
      v_reason
    );
  end if;

  update public.fulfillments
     set reversed_quantity = v_recovered,
         reversed_at = case when v_recovered > 0 then now() else null end,
         reversal_reason = v_reason,
         updated_at = now()
   where id = v_fulfillment.id;

  insert into public.hbc_recovery_obligations (
    source_type,
    source_id,
    fulfillment_id,
    user_id,
    currency_id,
    original_quantity,
    recovered_quantity,
    outstanding_quantity,
    status,
    reason,
    resolved_at
  ) values (
    'REFUND',
    p_refund_id,
    v_fulfillment.id,
    v_purchase.user_id,
    v_fulfillment.currency_id,
    v_hbc_to_remove,
    v_recovered,
    v_outstanding,
    case when v_outstanding = 0 then 'RECOVERED' else case when v_recovered > 0 then 'PARTIALLY_RECOVERED' else 'OPEN' end end,
    v_reason,
    case when v_outstanding = 0 then now() else null end
  )
  returning * into v_recovery;

  return v_recovery.fulfillment_id;
end;
$$;

revoke all on function public.reverse_hbc_fulfillment_for_refund(uuid, varchar, text) from public, anon, authenticated;
grant execute on function public.reverse_hbc_fulfillment_for_refund(uuid, varchar, text) to service_role;

-- ============================================================
-- 4. SERVER-ONLY HBC RECOVERY RETRY
-- ============================================================

create or replace function public.recover_hbc_recovery_obligation(
  p_obligation_id uuid,
  p_idempotency_key varchar(255),
  p_max_quantity bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_obligation public.hbc_recovery_obligations%rowtype;
  v_wallet public.coin_wallets%rowtype;
  v_available bigint;
  v_to_recover bigint;
  v_key varchar(255);
  v_new_recovered bigint;
  v_new_outstanding bigint;
  v_status varchar(30);
begin
  if not public.is_trusted_server() then
    raise exception 'HBC recovery is server-only';
  end if;

  if p_obligation_id is null or p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'Obligation and idempotency key are required';
  end if;

  select * into v_obligation
    from public.hbc_recovery_obligations
   where id = p_obligation_id
   for update;

  if not found then
    raise exception 'HBC recovery obligation does not exist';
  end if;

  if v_obligation.status in ('RECOVERED','CANCELLED') or v_obligation.outstanding_quantity = 0 then
    return 0;
  end if;

  if p_max_quantity is not null and p_max_quantity <= 0 then
    raise exception 'Maximum recovery quantity must be positive';
  end if;

  select * into v_wallet
    from public.coin_wallets
   where user_id = v_obligation.user_id
     and currency_id = v_obligation.currency_id
   for update;

  if not found then
    raise exception 'HBC wallet does not exist';
  end if;

  v_available := greatest(v_wallet.available_balance, 0);
  v_to_recover := least(v_available, v_obligation.outstanding_quantity);
  if p_max_quantity is not null then
    v_to_recover := least(v_to_recover, p_max_quantity);
  end if;

  if v_to_recover = 0 then
    return 0;
  end if;

  v_key := 'hbc-recovery:' || p_obligation_id::text || ':' || p_idempotency_key;

  perform public.apply_coin_wallet_transaction(
    v_obligation.user_id,
    v_obligation.currency_id,
    'HBC_REFUND_REVERSAL',
    'DEBIT',
    v_to_recover,
    v_key,
    'REFUND_RECOVERY',
    v_obligation.source_id,
    'HBC recovery obligation ' || p_obligation_id::text
  );

  v_new_recovered := v_obligation.recovered_quantity + v_to_recover;
  v_new_outstanding := v_obligation.original_quantity - v_new_recovered;
  v_status := case
    when v_new_outstanding = 0 then 'RECOVERED'
    else 'PARTIALLY_RECOVERED'
  end;

  update public.hbc_recovery_obligations
     set recovered_quantity = v_new_recovered,
         outstanding_quantity = v_new_outstanding,
         status = v_status,
         resolved_at = case when v_new_outstanding = 0 then now() else null end,
         updated_at = now()
   where id = v_obligation.id;

  update public.fulfillments
     set reversed_quantity = greatest(reversed_quantity, v_new_recovered),
         reversed_at = coalesce(reversed_at, now()),
         updated_at = now()
   where id = v_obligation.fulfillment_id;

  return v_to_recover;
end;
$$;

revoke all on function public.recover_hbc_recovery_obligation(uuid, varchar, bigint) from public, anon, authenticated;
grant execute on function public.recover_hbc_recovery_obligation(uuid, varchar, bigint) to service_role;

-- ============================================================
-- 5. COMPLETE REFUND: ALLOW REFUND + RECORD SHORTFALL ATOMICALLY
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
  v_hbc_recovery_required boolean := false;
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

  select * into v_hbc_fulfillment
    from public.fulfillments
   where purchase_id = v_purchase.id
     and fulfillment_type = 'HBC_CREDIT'
   for update;

  if found and v_hbc_fulfillment.status = 'COMPLETED' and v_hbc_fulfillment.reversed_quantity = 0 then
    if v_refund.amount <> v_payment.amount then
      raise exception 'Partial refunds of HBC purchases are not supported until proportional fulfillment reversal is implemented';
    end if;
    v_hbc_recovery_required := true;
  elsif found and v_hbc_fulfillment.status = 'COMPLETED' then
    -- A prior recovery may exist. A new refund against the same HBC
    -- fulfillment is still not allowed unless a separate proportional
    -- fulfillment policy exists.
    if v_refund.amount <> v_payment.amount then
      raise exception 'Partial refunds of HBC purchases are not supported';
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

  if v_hbc_recovery_required then
    perform public.reverse_hbc_fulfillment_for_refund(
      v_refund.id,
      'refund-' || v_refund.id::text,
      'HBC recovery for completed refund ' || v_refund.id::text
    );
  end if;

  return v_refund.id;
end;
$$;

revoke all on function public.complete_refund(uuid,varchar) from public, anon, authenticated;
grant execute on function public.complete_refund(uuid,varchar) to service_role;

commit;
