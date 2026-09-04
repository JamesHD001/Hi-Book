-- Hi!Book 2.0 — atomic HBC wallet operations
-- Financial integrity layer: wallet mutations are server-only, row-locked, atomic and idempotent.

begin;

-- ============================================================
-- TRUSTED SERVER BOUNDARY
-- ============================================================

-- Supabase service_role is the only caller permitted to perform
-- system-level wallet mutations through these RPCs.
create or replace function public.is_trusted_server()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(auth.role(), '') = 'service_role';
$$;

revoke all on function public.is_trusted_server() from public;
grant execute on function public.is_trusted_server() to service_role;

-- ============================================================
-- IDEMPOTENCY
-- ============================================================

alter table public.coin_transactions
  add column if not exists idempotency_key varchar(255);

create unique index if not exists coin_transactions_wallet_idempotency_uq
  on public.coin_transactions(wallet_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists coin_transactions_type_status_idx
  on public.coin_transactions(transaction_type, status, created_at desc);

-- ============================================================
-- INTERNAL ATOMIC WALLET OPERATION
-- ============================================================

create or replace function public.apply_coin_wallet_transaction(
  p_user_id uuid,
  p_currency_id uuid,
  p_transaction_type coin_transaction_type,
  p_direction coin_entry_direction,
  p_amount bigint,
  p_idempotency_key varchar(255),
  p_reference_type varchar(100) default null,
  p_reference_id uuid default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_wallet public.coin_wallets%rowtype;
  v_existing public.coin_transactions%rowtype;
  v_transaction_id uuid;
  v_entry_amount bigint;
  v_expected_opposite coin_entry_direction;
begin
  if not public.is_trusted_server() then
    raise exception 'Wallet operations are server-only';
  end if;

  if p_user_id is null or p_currency_id is null then
    raise exception 'User and currency are required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Coin amount must be greater than zero';
  end if;

  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'Idempotency key is required';
  end if;

  if p_reference_type is not null and p_reference_id is null then
    raise exception 'Reference ID is required when reference type is supplied';
  end if;

  if p_reference_type is null and p_reference_id is not null then
    raise exception 'Reference type is required when reference ID is supplied';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = p_user_id
      and u.account_status = 'ACTIVE'
  ) then
    raise exception 'User account is not active';
  end if;

  if not exists (
    select 1
    from public.currencies c
    where c.id = p_currency_id
      and c.currency_type = 'VIRTUAL'
  ) then
    raise exception 'Coin wallet operations require a virtual currency';
  end if;

  -- Lock the wallet row before checking or changing its balance.
  -- This serializes concurrent debits/credits for the same wallet.
  select *
    into v_wallet
    from public.coin_wallets cw
   where cw.user_id = p_user_id
     and cw.currency_id = p_currency_id
   for update;

  if not found then
    raise exception 'Coin wallet does not exist';
  end if;

  if v_wallet.status <> 'ACTIVE' then
    raise exception 'Coin wallet is not active';
  end if;

  -- Idempotency is scoped to the wallet. If the same key is retried,
  -- return the original transaction only when its operation matches.
  select ct.*
    into v_existing
    from public.coin_transactions ct
   where ct.wallet_id = v_wallet.id
     and ct.idempotency_key = btrim(p_idempotency_key)
   for update;

  if found then
    select cte.amount
      into v_entry_amount
      from public.coin_transaction_entries cte
     where cte.coin_transaction_id = v_existing.id
       and cte.wallet_id = v_wallet.id
       and cte.direction = p_direction
     limit 1;

    if v_existing.transaction_type <> p_transaction_type
       or v_entry_amount is distinct from p_amount
       or v_existing.reference_type is distinct from p_reference_type
       or v_existing.reference_id is distinct from p_reference_id then
      raise exception 'Idempotency key was already used for a different wallet operation';
    end if;

    return v_existing.id;
  end if;

  if p_direction = 'DEBIT' then
    if v_wallet.available_balance < p_amount then
      raise exception 'Insufficient HBC balance';
    end if;
    v_expected_opposite := 'CREDIT';
  else
    v_expected_opposite := 'DEBIT';
  end if;

  insert into public.coin_transactions (
    wallet_id,
    transaction_type,
    status,
    reference_type,
    reference_id,
    description,
    idempotency_key,
    created_at,
    completed_at
  ) values (
    v_wallet.id,
    p_transaction_type,
    'COMPLETED',
    p_reference_type,
    p_reference_id,
    p_description,
    btrim(p_idempotency_key),
    now(),
    now()
  )
  returning id into v_transaction_id;

  -- The wallet-side entry and balancing platform-side entry form the
  -- complete HBC movement. HBC remains a closed-loop virtual currency.
  insert into public.coin_transaction_entries (
    coin_transaction_id,
    account_type,
    wallet_id,
    direction,
    amount
  ) values (
    v_transaction_id,
    'USER_WALLET',
    v_wallet.id,
    p_direction,
    p_amount
  );

  insert into public.coin_transaction_entries (
    coin_transaction_id,
    account_type,
    wallet_id,
    direction,
    amount
  ) values (
    v_transaction_id,
    'PLATFORM_HBC_POOL',
    null,
    v_expected_opposite,
    p_amount
  );

  if p_direction = 'DEBIT' then
    update public.coin_wallets
       set available_balance = available_balance - p_amount,
           updated_at = now()
     where id = v_wallet.id;
  else
    update public.coin_wallets
       set available_balance = available_balance + p_amount,
           updated_at = now()
     where id = v_wallet.id;
  end if;

  return v_transaction_id;
exception
  when unique_violation then
    -- A concurrent retry may win the unique idempotency index between
    -- the initial lookup and INSERT. Re-read the winning transaction.
    select ct.*
      into v_existing
      from public.coin_transactions ct
     where ct.wallet_id = v_wallet.id
       and ct.idempotency_key = btrim(p_idempotency_key)
     for update;

    if found then
      select cte.amount
        into v_entry_amount
        from public.coin_transaction_entries cte
       where cte.coin_transaction_id = v_existing.id
         and cte.wallet_id = v_wallet.id
         and cte.direction = p_direction
       limit 1;

      if v_existing.transaction_type <> p_transaction_type
         or v_entry_amount is distinct from p_amount
         or v_existing.reference_type is distinct from p_reference_type
         or v_existing.reference_id is distinct from p_reference_id then
        raise exception 'Idempotency key was already used for a different wallet operation';
      end if;

      return v_existing.id;
    end if;

    raise;
end;
$$;

revoke all on function public.apply_coin_wallet_transaction(
  uuid, uuid, coin_transaction_type, coin_entry_direction, bigint, varchar, varchar, uuid, text
) from public, anon, authenticated;
grant execute on function public.apply_coin_wallet_transaction(
  uuid, uuid, coin_transaction_type, coin_entry_direction, bigint, varchar, varchar, uuid, text
) to service_role;

-- ============================================================
-- EXPLICIT CREDIT / DEBIT RPCs
-- ============================================================

create or replace function public.credit_coin_wallet(
  p_user_id uuid,
  p_currency_id uuid,
  p_amount bigint,
  p_idempotency_key varchar(255),
  p_reference_type varchar(100) default null,
  p_reference_id uuid default null,
  p_description text default null
)
returns uuid
language sql
security definer
set search_path = pg_catalog, public
as $$
  select public.apply_coin_wallet_transaction(
    p_user_id,
    p_currency_id,
    'PURCHASE_CREDIT',
    'CREDIT',
    p_amount,
    p_idempotency_key,
    p_reference_type,
    p_reference_id,
    p_description
  );
$$;

create or replace function public.debit_coin_wallet(
  p_user_id uuid,
  p_currency_id uuid,
  p_amount bigint,
  p_idempotency_key varchar(255),
  p_reference_type varchar(100) default null,
  p_reference_id uuid default null,
  p_description text default null
)
returns uuid
language sql
security definer
set search_path = pg_catalog, public
as $$
  select public.apply_coin_wallet_transaction(
    p_user_id,
    p_currency_id,
    'GIFT_DEBIT',
    'DEBIT',
    p_amount,
    p_idempotency_key,
    p_reference_type,
    p_reference_id,
    p_description
  );
$$;

revoke all on function public.credit_coin_wallet(uuid, uuid, bigint, varchar, varchar, uuid, text) from public, anon, authenticated;
revoke all on function public.debit_coin_wallet(uuid, uuid, bigint, varchar, varchar, uuid, text) from public, anon, authenticated;
grant execute on function public.credit_coin_wallet(uuid, uuid, bigint, varchar, varchar, uuid, text) to service_role;
grant execute on function public.debit_coin_wallet(uuid, uuid, bigint, varchar, varchar, uuid, text) to service_role;

commit;
