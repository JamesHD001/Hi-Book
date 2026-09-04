-- Hi!Book 2.0 — verified payment and webhook processing foundation
-- External provider callbacks are never trusted by the client.
-- Provider signature verification belongs in the server/Edge Function layer.

begin;

-- ============================================================
-- 1. VERIFIED PAYMENT TRANSITION
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
  v_payment_currency uuid;
  v_existing_reference varchar(255);
begin
  if not public.is_trusted_server() then
    raise exception 'Payment verification is server-only';
  end if;

  if p_payment_id is null
     or p_provider_reference is null
     or btrim(p_provider_reference) = ''
     or p_amount is null
     or p_amount <= 0
     or p_currency_id is null
     or p_provider_status is null
     or btrim(p_provider_status) = '' then
    raise exception 'Payment verification parameters are incomplete';
  end if;

  select * into v_payment
    from public.payments
   where id = p_payment_id
   for update;

  if not found then
    raise exception 'Payment does not exist';
  end if;

  select * into v_purchase
    from public.purchases
   where id = v_payment.purchase_id
   for update;

  if not found then
    raise exception 'Payment purchase does not exist';
  end if;

  select * into v_provider
    from public.payment_providers
   where id = v_payment.provider_id;

  if not found then
    raise exception 'Payment provider does not exist';
  end if;

  if v_payment.provider_reference is null then
    raise exception 'Payment has no expected provider reference';
  end if;

  if v_payment.provider_reference <> btrim(p_provider_reference) then
    raise exception 'Provider reference mismatch';
  end if;

  if v_payment.amount <> p_amount then
    raise exception 'Payment amount mismatch';
  end if;

  if v_payment.currency_id <> p_currency_id then
    raise exception 'Payment currency mismatch';
  end if;

  -- The provider's exact success vocabulary is interpreted by the
  -- server integration. This RPC accepts only a normalized success state.
  if upper(btrim(p_provider_status)) <> 'SUCCEEDED' then
    raise exception 'Payment provider status is not successful';
  end if;

  if p_verified_at is null then
    raise exception 'Verified timestamp is required';
  end if;

  if p_paid_at is null then
    p_paid_at := p_verified_at;
  end if;

  -- A previously successful payment is safe to retry only when all
  -- immutable verification values match the existing record.
  if v_payment.status = 'SUCCEEDED' then
    if v_payment.provider_reference <> btrim(p_provider_reference)
       or v_payment.amount <> p_amount
       or v_payment.currency_id <> p_currency_id then
      raise exception 'Conflicting duplicate payment verification';
    end if;
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

  return v_payment.id;
end;
$$;

revoke all on function public.record_verified_payment(uuid, varchar, bigint, uuid, varchar, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.record_verified_payment(uuid, varchar, bigint, uuid, varchar, timestamptz, timestamptz) to service_role;

-- ============================================================
-- 2. IDEMPOTENT WEBHOOK INGESTION
-- ============================================================

create or replace function public.record_payment_webhook_event(
  p_provider_id uuid,
  p_provider_event_id varchar(255),
  p_event_type varchar(150),
  p_provider_reference varchar(255) default null,
  p_payload jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing public.payment_webhook_events%rowtype;
  v_event_id uuid;
begin
  if not public.is_trusted_server() then
    raise exception 'Payment webhook ingestion is server-only';
  end if;

  if p_provider_id is null
     or p_provider_event_id is null
     or btrim(p_provider_event_id) = ''
     or p_event_type is null
     or btrim(p_event_type) = '' then
    raise exception 'Webhook event parameters are incomplete';
  end if;

  select * into v_existing
    from public.payment_webhook_events
   where provider_id = p_provider_id
     and provider_event_id = btrim(p_provider_event_id)
   for update;

  if found then
    return v_existing.id;
  end if;

  insert into public.payment_webhook_events (
    provider_id,
    provider_event_id,
    event_type,
    provider_reference,
    payload,
    status,
    received_at
  ) values (
    p_provider_id,
    btrim(p_provider_event_id),
    btrim(p_event_type),
    nullif(btrim(p_provider_reference), ''),
    p_payload,
    'RECEIVED',
    now()
  )
  returning id into v_event_id;

  return v_event_id;
exception
  when unique_violation then
    select id into v_event_id
      from public.payment_webhook_events
     where provider_id = p_provider_id
       and provider_event_id = btrim(p_provider_event_id);
    if v_event_id is not null then
      return v_event_id;
    end if;
    raise;
end;
$$;

revoke all on function public.record_payment_webhook_event(uuid, varchar, varchar, varchar, jsonb) from public, anon, authenticated;
grant execute on function public.record_payment_webhook_event(uuid, varchar, varchar, varchar, jsonb) to service_role;

-- ============================================================
-- 3. WEBHOOK EVENT PROCESSING STATE
-- ============================================================

create or replace function public.claim_payment_webhook_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_event public.payment_webhook_events%rowtype;
begin
  if not public.is_trusted_server() then
    raise exception 'Payment webhook processing is server-only';
  end if;

  select * into v_event
    from public.payment_webhook_events
   where id = p_event_id
   for update;

  if not found then
    raise exception 'Webhook event does not exist';
  end if;

  if v_event.status = 'PROCESSED' or v_event.status = 'IGNORED' then
    return false;
  end if;

  if v_event.status = 'PROCESSING' then
    return false;
  end if;

  update public.payment_webhook_events
     set status = 'PROCESSING',
         error_code = null
   where id = p_event_id;

  return true;
end;
$$;

revoke all on function public.claim_payment_webhook_event(uuid) from public, anon, authenticated;
grant execute on function public.claim_payment_webhook_event(uuid) to service_role;

create or replace function public.complete_payment_webhook_event(
  p_event_id uuid,
  p_status varchar(30),
  p_error_code varchar(100) default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status varchar(30) := upper(btrim(p_status));
  v_rows integer;
begin
  if not public.is_trusted_server() then
    raise exception 'Payment webhook processing is server-only';
  end if;

  if v_status not in ('PROCESSED','IGNORED','FAILED') then
    raise exception 'Invalid webhook completion status';
  end if;

  update public.payment_webhook_events
     set status = v_status,
         processed_at = case when v_status in ('PROCESSED','IGNORED') then now() else processed_at end,
         error_code = nullif(btrim(p_error_code), '')
   where id = p_event_id
     and status = 'PROCESSING';

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

revoke all on function public.complete_payment_webhook_event(uuid, varchar, varchar) from public, anon, authenticated;
grant execute on function public.complete_payment_webhook_event(uuid, varchar, varchar) to service_role;

commit;
