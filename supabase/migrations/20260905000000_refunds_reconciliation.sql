-- Hi!Book 2.0 — refunds and payment reconciliation integrity
-- Refunds are server-controlled financial state transitions.
-- Provider reconciliation identifies discrepancies; it never silently overwrites local truth.

begin;

-- ============================================================
-- 1. REFUND INTEGRITY
-- ============================================================

create or replace function public.validate_refund_row()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_payment public.payments%rowtype;
  v_purchase public.purchases%rowtype;
  v_total_refunded bigint;
  v_other_refunded bigint;
begin
  select * into v_payment
    from public.payments
   where id = new.payment_id;
  if not found then
    raise exception 'Refund payment does not exist';
  end if;

  select * into v_purchase
    from public.purchases
   where id = new.purchase_id;
  if not found then
    raise exception 'Refund purchase does not exist';
  end if;

  if v_payment.purchase_id <> v_purchase.id then
    raise exception 'Refund payment and purchase do not match';
  end if;

  if new.currency_id <> v_payment.currency_id then
    raise exception 'Refund currency must match payment currency';
  end if;

  if new.amount <= 0 or new.amount > v_payment.amount then
    raise exception 'Refund amount is outside the payment amount';
  end if;

  if new.status in ('COMPLETED','PROCESSING') and v_payment.status not in ('SUCCEEDED','REFUNDED','PARTIALLY_REFUNDED') then
    raise exception 'Payment is not eligible for refund processing';
  end if;

  select coalesce(sum(r.amount), 0) into v_other_refunded
    from public.refunds r
   where r.payment_id = new.payment_id
     and r.status = 'COMPLETED'
     and r.id <> new.id;

  v_total_refunded := v_other_refunded + case when new.status = 'COMPLETED' then new.amount else 0 end;

  if v_total_refunded > v_payment.amount then
    raise exception 'Total completed refunds exceed payment amount';
  end if;

  if new.status = 'COMPLETED' and new.completed_at is null then
    raise exception 'Completed refund requires completed_at';
  end if;

  if new.status <> 'COMPLETED' and new.completed_at is not null then
    raise exception 'Only completed refunds may have completed_at';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_refund_row on public.refunds;
create trigger trg_validate_refund_row
before insert or update on public.refunds
for each row execute function public.validate_refund_row();

-- Provider references must be idempotent when supplied.
create unique index if not exists refunds_provider_reference_uq
  on public.refunds(provider_reference)
  where provider_reference is not null;

-- ============================================================
-- 2. SERVER-ONLY REFUND REQUEST
-- ============================================================

create or replace function public.request_refund(
  p_payment_id uuid,
  p_amount bigint,
  p_currency_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_payment public.payments%rowtype;
  v_purchase public.purchases%rowtype;
  v_refund_id uuid;
  v_refundable bigint;
  v_reason text;
begin
  if not public.is_trusted_server() then
    raise exception 'Refund requests are server-only';
  end if;

  if p_payment_id is null or p_amount is null or p_amount <= 0 or p_currency_id is null then
    raise exception 'Refund parameters are incomplete';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Payment does not exist'; end if;

  select * into v_purchase from public.purchases where id = v_payment.purchase_id for update;
  if not found then raise exception 'Purchase does not exist'; end if;

  if v_payment.currency_id <> p_currency_id then
    raise exception 'Refund currency mismatch';
  end if;

  if v_payment.status not in ('SUCCEEDED','PARTIALLY_REFUNDED') then
    raise exception 'Payment is not refundable in its current state';
  end if;

  select v_payment.amount - coalesce(sum(r.amount) filter (where r.status in ('REQUESTED','PROCESSING','COMPLETED')),0)
    into v_refundable
    from public.refunds r
   where r.payment_id = v_payment.id;

  if p_amount > v_refundable then
    raise exception 'Refund amount exceeds refundable amount';
  end if;

  v_reason := nullif(btrim(p_reason), '');
  if v_reason is not null and char_length(v_reason) > 2000 then
    raise exception 'Refund reason is too long';
  end if;

  insert into public.refunds(payment_id,purchase_id,amount,currency_id,reason,status,requested_at,created_at)
  values(v_payment.id,v_purchase.id,p_amount,p_currency_id,v_reason,'REQUESTED',now(),now())
  returning id into v_refund_id;

  return v_refund_id;
end;
$$;

revoke all on function public.request_refund(uuid,bigint,uuid,text) from public, anon, authenticated;
grant execute on function public.request_refund(uuid,bigint,uuid,text) to service_role;

-- ============================================================
-- 3. SERVER-ONLY REFUND COMPLETION
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
  if not public.is_trusted_server() then
    raise exception 'Refund completion is server-only';
  end if;

  select * into v_refund from public.refunds where id = p_refund_id for update;
  if not found then raise exception 'Refund does not exist'; end if;

  select * into v_payment from public.payments where id = v_refund.payment_id for update;
  if not found then raise exception 'Refund payment does not exist'; end if;

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
   where id = v_refund.purchase_id
     and status in ('PAID','FULFILLED','REFUNDED','PARTIALLY_REFUNDED');

  return v_refund.id;
end;
$$;

revoke all on function public.complete_refund(uuid,varchar) from public, anon, authenticated;
grant execute on function public.complete_refund(uuid,varchar) to service_role;

-- ============================================================
-- 4. RECONCILIATION INTEGRITY
-- ============================================================

alter table public.payment_reconciliations
  add column if not exists discrepancy_amount bigint not null default 0;

create or replace function public.validate_payment_reconciliation_row()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.expected_count < 0 or new.provider_count < 0 or new.discrepancy_count < 0 then
    raise exception 'Reconciliation counts cannot be negative';
  end if;
  if new.expected_amount < 0 or new.provider_amount < 0 or new.discrepancy_amount < 0 then
    raise exception 'Reconciliation amounts cannot be negative';
  end if;

  if new.discrepancy_count <> abs(new.expected_count - new.provider_count) then
    raise exception 'Reconciliation discrepancy_count must equal count difference';
  end if;

  if new.discrepancy_amount <> abs(new.expected_amount - new.provider_amount) then
    raise exception 'Reconciliation discrepancy_amount must equal amount difference';
  end if;

  if new.status in ('MATCHED','RESOLVED') and (new.discrepancy_count <> 0 or new.discrepancy_amount <> 0) then
    raise exception 'Matched or resolved reconciliation cannot contain unresolved discrepancies';
  end if;

  if new.status = 'PENDING' and new.completed_at is not null then
    raise exception 'Pending reconciliation cannot have completed_at';
  end if;

  if new.status in ('MATCHED','DISCREPANCY','RESOLVED','FAILED') and new.completed_at is null then
    raise exception 'Terminal reconciliation requires completed_at';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_payment_reconciliation_row on public.payment_reconciliations;
create trigger trg_validate_payment_reconciliation_row
before insert or update on public.payment_reconciliations
for each row execute function public.validate_payment_reconciliation_row();

create or replace function public.record_payment_reconciliation(
  p_provider_id uuid,
  p_reconciliation_date date,
  p_currency_id uuid,
  p_expected_count bigint,
  p_expected_amount bigint,
  p_provider_count bigint,
  p_provider_amount bigint,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
  v_discrepancy_count bigint;
  v_discrepancy_amount bigint;
  v_status public.reconciliation_status;
  v_notes text;
begin
  if not public.is_trusted_server() then
    raise exception 'Payment reconciliation is server-only';
  end if;
  if p_provider_id is null or p_reconciliation_date is null or p_currency_id is null then
    raise exception 'Reconciliation parameters are incomplete';
  end if;
  if p_expected_count < 0 or p_provider_count < 0 or p_expected_amount < 0 or p_provider_amount < 0 then
    raise exception 'Reconciliation values cannot be negative';
  end if;

  v_discrepancy_count := abs(p_expected_count - p_provider_count);
  v_discrepancy_amount := abs(p_expected_amount - p_provider_amount);
  v_status := case when v_discrepancy_count = 0 and v_discrepancy_amount = 0 then 'MATCHED' else 'DISCREPANCY' end;
  v_notes := nullif(btrim(p_notes), '');
  if v_notes is not null and char_length(v_notes) > 5000 then raise exception 'Reconciliation notes are too long'; end if;

  insert into public.payment_reconciliations(
    provider_id,reconciliation_date,currency_id,expected_count,expected_amount,
    provider_count,provider_amount,discrepancy_count,discrepancy_amount,status,
    notes,created_at,completed_at
  ) values (
    p_provider_id,p_reconciliation_date,p_currency_id,p_expected_count,p_expected_amount,
    p_provider_count,p_provider_amount,v_discrepancy_count,v_discrepancy_amount,v_status,
    v_notes,now(),now()
  )
  on conflict (provider_id,reconciliation_date,currency_id)
  do update set
    expected_count = excluded.expected_count,
    expected_amount = excluded.expected_amount,
    provider_count = excluded.provider_count,
    provider_amount = excluded.provider_amount,
    discrepancy_count = excluded.discrepancy_count,
    discrepancy_amount = excluded.discrepancy_amount,
    status = excluded.status,
    notes = excluded.notes,
    completed_at = excluded.completed_at
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_payment_reconciliation(uuid,date,uuid,bigint,bigint,bigint,bigint,text) from public, anon, authenticated;
grant execute on function public.record_payment_reconciliation(uuid,date,uuid,bigint,bigint,bigint,bigint,text) to service_role;

-- ============================================================
-- 5. FINANCIAL / REFUND INDEXES
-- ============================================================

create index if not exists refunds_payment_status_idx
  on public.refunds(payment_id, status, created_at desc);

create index if not exists payment_reconciliations_provider_status_idx
  on public.payment_reconciliations(provider_id, status, reconciliation_date desc);

commit;
