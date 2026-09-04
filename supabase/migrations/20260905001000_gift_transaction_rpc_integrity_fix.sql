-- Hi!Book 2.0 — gift transaction integrity correction
-- Fixes server-side block checking and ensures the wallet debit references
-- the gift transaction that it atomically belongs to.

begin;

create or replace function public.send_virtual_gift(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_gift_id uuid,
  p_quantity bigint,
  p_idempotency_key varchar(255),
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_gift public.virtual_gifts%rowtype;
  v_tx public.gift_transactions%rowtype;
  v_total bigint;
  v_debit_tx uuid;
  v_existing public.gift_transactions%rowtype;
  v_hbc_currency_id uuid;
begin
  if not public.is_trusted_server() then
    raise exception 'Gift transactions are server-only';
  end if;

  if p_sender_id is null or p_recipient_id is null or p_gift_id is null then
    raise exception 'Sender, recipient and gift are required';
  end if;

  if p_sender_id = p_recipient_id then
    raise exception 'Users cannot send gifts to themselves';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Gift quantity must be greater than zero';
  end if;

  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'Idempotency key is required';
  end if;

  if p_message is not null and char_length(p_message) > 500 then
    raise exception 'Gift message is too long';
  end if;

  if not exists (
    select 1 from public.users
     where id = p_sender_id and account_status = 'ACTIVE'
  ) then
    raise exception 'Sender account is not active';
  end if;

  if not exists (
    select 1 from public.users
     where id = p_recipient_id and account_status = 'ACTIVE'
  ) then
    raise exception 'Recipient account is not active';
  end if;

  -- This RPC runs as service_role, so the authenticated-user helper
  -- cannot be used for arbitrary sender/recipient pairs. Check both
  -- block directions explicitly here.
  if exists (
    select 1
      from public.blocks b
     where (b.blocker_id = p_sender_id and b.blocked_id = p_recipient_id)
        or (b.blocker_id = p_recipient_id and b.blocked_id = p_sender_id)
  ) then
    raise exception 'Gift cannot be sent because the users are blocked';
  end if;

  select * into v_gift
    from public.virtual_gifts
   where id = p_gift_id
     and is_active = true
   for update;

  if not found then
    raise exception 'Gift is not available';
  end if;

  if v_gift.hbc_price <= 0 then
    raise exception 'Gift price is invalid';
  end if;

  if p_quantity > floor(9223372036854775807::numeric / v_gift.hbc_price) then
    raise exception 'Gift total exceeds supported HBC range';
  end if;

  v_total := v_gift.hbc_price * p_quantity;

  select * into v_existing
    from public.gift_transactions
   where sender_id = p_sender_id
     and idempotency_key = btrim(p_idempotency_key)
   for update;

  if found then
    if v_existing.recipient_id <> p_recipient_id
       or v_existing.gift_id <> p_gift_id
       or v_existing.quantity <> p_quantity
       or v_existing.total_hbc <> v_total then
      raise exception 'Idempotency key was already used for a different gift operation';
    end if;
    return v_existing.id;
  end if;

  select id into v_hbc_currency_id
    from public.currencies
   where code = 'HBC'
     and currency_type = 'VIRTUAL'
     and is_active = true;

  if v_hbc_currency_id is null then
    raise exception 'HBC currency is unavailable';
  end if;

  -- Create the domain transaction first so the debit can reference its
  -- immutable ID. If the debit fails, the entire SQL transaction rolls back.
  insert into public.gift_transactions (
    gift_id,
    sender_id,
    recipient_id,
    quantity,
    unit_price_hbc,
    total_hbc,
    status,
    message,
    created_at,
    idempotency_key
  ) values (
    p_gift_id,
    p_sender_id,
    p_recipient_id,
    p_quantity,
    v_gift.hbc_price,
    v_total,
    'PENDING',
    nullif(btrim(p_message), ''),
    now(),
    btrim(p_idempotency_key)
  )
  returning * into v_tx;

  v_debit_tx := public.debit_coin_wallet(
    p_sender_id,
    v_hbc_currency_id,
    v_total,
    'gift:' || btrim(p_idempotency_key),
    'GIFT_TRANSACTION',
    v_tx.id,
    'Virtual gift purchase'
  );

  update public.gift_transactions
     set status = 'COMPLETED',
         completed_at = now()
   where id = v_tx.id;

  return v_tx.id;
end;
$$;

revoke all on function public.send_virtual_gift(uuid, uuid, uuid, bigint, varchar, text)
  from public, anon, authenticated;
grant execute on function public.send_virtual_gift(uuid, uuid, uuid, bigint, varchar, text)
  to service_role;

commit;
