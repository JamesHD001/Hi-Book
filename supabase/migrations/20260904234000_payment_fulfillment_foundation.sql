-- Hi!Book 2.0 — payment fulfillment foundation
-- Payment success and product delivery are separate state transitions.
-- Provider callbacks must be idempotent and fulfillment must be retry-safe.

begin;

create table if not exists public.product_fulfillment_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.monetization_products(id) on delete restrict,
  fulfillment_type public.fulfillment_type not null,
  currency_id uuid references public.currencies(id) on delete restrict,
  fulfillment_quantity bigint,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fulfillment_quantity is null or fulfillment_quantity > 0)
);

create index if not exists product_fulfillment_rules_product_idx on public.product_fulfillment_rules(product_id, is_active);
create unique index if not exists product_fulfillment_rules_active_uq on public.product_fulfillment_rules(product_id, fulfillment_type) where is_active = true;

create table if not exists public.fulfillments (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete restrict,
  product_id uuid not null references public.monetization_products(id) on delete restrict,
  fulfillment_rule_id uuid references public.product_fulfillment_rules(id) on delete restrict,
  fulfillment_type public.fulfillment_type not null,
  status varchar(30) not null default 'PENDING',
  quantity bigint not null default 1,
  currency_id uuid references public.currencies(id) on delete restrict,
  delivered_quantity bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  error_code varchar(100),
  check (status in ('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED')),
  check (quantity > 0),
  check (delivered_quantity is null or delivered_quantity >= 0)
);

create unique index if not exists fulfillments_purchase_uq on public.fulfillments(purchase_id);
create index if not exists fulfillments_user_idx on public.fulfillments(user_id, created_at desc);
create index if not exists fulfillments_status_idx on public.fulfillments(status, created_at desc);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.payment_providers(id) on delete restrict,
  provider_event_id varchar(255) not null,
  event_type varchar(150) not null,
  payment_id uuid references public.payments(id) on delete restrict,
  provider_reference varchar(255),
  payload jsonb,
  status varchar(30) not null default 'RECEIVED',
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_code varchar(100),
  check (status in ('RECEIVED','PROCESSING','PROCESSED','IGNORED','FAILED')),
  unique (provider_id, provider_event_id)
);

create index if not exists payment_webhook_events_payment_idx on public.payment_webhook_events(payment_id, received_at desc);
create index if not exists payment_webhook_events_reference_idx on public.payment_webhook_events(provider_id, provider_reference);
create index if not exists payment_webhook_events_status_idx on public.payment_webhook_events(status, received_at desc);

create or replace function public.validate_fulfillment_row()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare v_purchase public.purchases%rowtype;
begin
  select * into v_purchase from public.purchases where id = new.purchase_id;
  if not found then raise exception 'Fulfillment purchase does not exist'; end if;
  if new.user_id <> v_purchase.user_id or new.product_id <> v_purchase.product_id then
    raise exception 'Fulfillment does not match purchase';
  end if;
  if new.status = 'COMPLETED' and new.completed_at is null then
    raise exception 'Completed fulfillment requires completed_at';
  end if;
  if new.status <> 'COMPLETED' and new.completed_at is not null then
    raise exception 'Only completed fulfillment may have completed_at';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_fulfillment_row on public.fulfillments;
create trigger trg_validate_fulfillment_row before insert or update on public.fulfillments for each row execute function public.validate_fulfillment_row();

create or replace function public.fulfill_hbc_purchase(p_purchase_id uuid, p_idempotency_key varchar(255))
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_purchase public.purchases%rowtype;
  v_rule public.product_fulfillment_rules%rowtype;
  v_fulfillment public.fulfillments%rowtype;
  v_currency_id uuid;
  v_hbc_amount bigint;
  v_existing public.fulfillments%rowtype;
begin
  if not public.is_trusted_server() then raise exception 'Purchase fulfillment is server-only'; end if;
  if p_purchase_id is null or p_idempotency_key is null or btrim(p_idempotency_key) = '' then raise exception 'Purchase and idempotency key are required'; end if;

  select * into v_purchase from public.purchases where id = p_purchase_id for update;
  if not found then raise exception 'Purchase does not exist'; end if;
  if v_purchase.status not in ('PAID','FULFILLED') then raise exception 'Purchase is not eligible for fulfillment'; end if;

  if not exists (select 1 from public.monetization_products where id = v_purchase.product_id) then
    raise exception 'Purchase product does not exist';
  end if;

  select * into v_rule
    from public.product_fulfillment_rules
   where product_id = v_purchase.product_id
     and fulfillment_type = 'HBC_CREDIT'
     and is_active = true
   for update;
  if not found then raise exception 'No active HBC fulfillment rule exists for this product'; end if;
  if v_rule.currency_id is null or v_rule.fulfillment_quantity is null then raise exception 'HBC fulfillment rule is incomplete'; end if;

  select id into v_currency_id from public.currencies
   where id = v_rule.currency_id and code = 'HBC' and currency_type = 'VIRTUAL' and is_active = true;
  if v_currency_id is null then raise exception 'HBC currency is unavailable'; end if;

  if v_purchase.quantity > floor(9223372036854775807::numeric / v_rule.fulfillment_quantity) then raise exception 'Fulfillment quantity exceeds supported HBC range'; end if;
  v_hbc_amount := v_rule.fulfillment_quantity * v_purchase.quantity;

  select * into v_existing from public.fulfillments where purchase_id = v_purchase.id for update;
  if found then
    if v_existing.status = 'COMPLETED' then return v_existing.id; end if;
    if v_existing.fulfillment_rule_id <> v_rule.id or v_existing.delivered_quantity is distinct from v_hbc_amount then raise exception 'Existing fulfillment does not match current fulfillment rule'; end if;
    v_fulfillment := v_existing;
    update public.fulfillments set status = 'PROCESSING', updated_at = now(), failed_at = null, error_code = null where id = v_fulfillment.id;
  else
    insert into public.fulfillments (purchase_id,user_id,product_id,fulfillment_rule_id,fulfillment_type,status,quantity,currency_id,delivered_quantity)
    values (v_purchase.id,v_purchase.user_id,v_purchase.product_id,v_rule.id,'HBC_CREDIT','PROCESSING',v_purchase.quantity,v_currency_id,v_hbc_amount)
    returning * into v_fulfillment;
  end if;

  perform public.credit_coin_wallet(v_purchase.user_id,v_currency_id,v_hbc_amount,'purchase:' || p_purchase_id::text,'PURCHASE',p_purchase_id,'HBC purchase fulfillment');

  update public.fulfillments set status = 'COMPLETED', completed_at = now(), updated_at = now() where id = v_fulfillment.id;
  update public.purchases set status = 'FULFILLED', completed_at = coalesce(completed_at, now()), updated_at = now() where id = v_purchase.id;
  return v_fulfillment.id;
end;
$$;

revoke all on function public.fulfill_hbc_purchase(uuid, varchar) from public, anon, authenticated;
grant execute on function public.fulfill_hbc_purchase(uuid, varchar) to service_role;

commit;
