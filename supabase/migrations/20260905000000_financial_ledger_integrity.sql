-- Hi!Book 2.0 — financial ledger integrity
-- Financial ledger entries are server-only, append-only and balanced per transaction group.
-- Corrections are represented by complete reversing transactions, never by editing posted entries.

begin;

-- ============================================================
-- 1. LEDGER IMMUTABILITY + SERVER-ONLY WRITES
-- ============================================================

create or replace function public.protect_financial_ledger_entry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_trusted_server() then
    raise exception 'Financial ledger is server-only';
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    raise exception 'Financial ledger entries are immutable; use a reversal transaction';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_financial_ledger_protect on public.financial_ledger_entries;
create trigger trg_financial_ledger_protect
before insert or update or delete on public.financial_ledger_entries
for each row execute function public.protect_financial_ledger_entry();

create unique index if not exists financial_ledger_reversal_uq
  on public.financial_ledger_entries(reversed_entry_id)
  where reversed_entry_id is not null;

-- ============================================================
-- 2. ENTRY-LEVEL INTEGRITY
-- ============================================================

create or replace function public.validate_financial_ledger_entry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_account_currency uuid;
  v_reversed public.financial_ledger_entries%rowtype;
begin
  if new.transaction_group_id is null then
    raise exception 'Ledger transaction group is required';
  end if;

  if new.amount is null or new.amount <= 0 then
    raise exception 'Ledger amount must be greater than zero';
  end if;

  if new.reference_type is not null and new.reference_id is null then
    raise exception 'Reference ID is required when reference type is supplied';
  end if;

  if new.reference_type is null and new.reference_id is not null then
    raise exception 'Reference type is required when reference ID is supplied';
  end if;

  select currency_id into v_account_currency
    from public.financial_accounts
   where id = new.account_id;

  if v_account_currency is null then
    raise exception 'Financial account does not exist';
  end if;

  if v_account_currency <> new.currency_id then
    raise exception 'Ledger currency does not match account currency';
  end if;

  if not exists (
    select 1 from public.financial_accounts
     where id = new.account_id
       and status = 'ACTIVE'
  ) then
    raise exception 'Financial account is not active';
  end if;

  if new.reversed_entry_id is not null then
    if new.reversed_entry_id = new.id then
      raise exception 'Ledger entry cannot reverse itself';
    end if;

    select * into v_reversed
      from public.financial_ledger_entries
     where id = new.reversed_entry_id;

    if not found then
      raise exception 'Reversed ledger entry does not exist';
    end if;

    if v_reversed.account_id <> new.account_id
       or v_reversed.currency_id <> new.currency_id
       or v_reversed.amount <> new.amount
       or v_reversed.direction = new.direction then
      raise exception 'Reversal must match account, currency and amount and use the opposite direction';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_financial_ledger_validate_entry on public.financial_ledger_entries;
create trigger trg_financial_ledger_validate_entry
before insert on public.financial_ledger_entries
for each row execute function public.validate_financial_ledger_entry();

-- ============================================================
-- 3. TRANSACTION-GROUP BALANCE
-- ============================================================

create or replace function public.validate_financial_ledger_group()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_group uuid := coalesce(new.transaction_group_id, old.transaction_group_id);
  v_currency_count integer;
  v_entry_count integer;
  v_debits numeric;
  v_credits numeric;
begin
  select count(distinct currency_id), count(*),
         coalesce(sum(case when direction = 'DEBIT' then amount::numeric else 0 end),0),
         coalesce(sum(case when direction = 'CREDIT' then amount::numeric else 0 end),0)
    into v_currency_count, v_entry_count, v_debits, v_credits
    from public.financial_ledger_entries
   where transaction_group_id = v_group;

  if v_entry_count < 2 then
    raise exception 'Financial transaction must contain at least two ledger entries';
  end if;

  if v_currency_count <> 1 then
    raise exception 'All ledger entries in a transaction must use one currency';
  end if;

  if v_debits <> v_credits then
    raise exception 'Financial transaction is not balanced: debits %, credits %', v_debits, v_credits;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_financial_ledger_group_balance on public.financial_ledger_entries;
create constraint trigger trg_financial_ledger_group_balance
after insert or update or delete on public.financial_ledger_entries
deferrable initially deferred
for each row execute function public.validate_financial_ledger_group();

-- ============================================================
-- 4. ATOMIC FINANCIAL TRANSACTION POSTING
-- ============================================================

create or replace function public.post_financial_transaction(
  p_currency_id uuid,
  p_lines jsonb,
  p_reference_type varchar(100) default null,
  p_reference_id uuid default null,
  p_occurred_at timestamptz default now(),
  p_description text default null,
  p_transaction_group_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_group_id uuid := coalesce(p_transaction_group_id, gen_random_uuid());
  v_line jsonb;
  v_account_id uuid;
  v_direction coin_entry_direction;
  v_amount bigint;
  v_count integer := 0;
  v_debits numeric := 0;
  v_credits numeric := 0;
  v_account_currency uuid;
begin
  if not public.is_trusted_server() then
    raise exception 'Financial transaction posting is server-only';
  end if;

  if p_currency_id is null then
    raise exception 'Currency is required';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    raise exception 'Ledger lines must be a JSON array';
  end if;

  if jsonb_array_length(p_lines) < 2 then
    raise exception 'Financial transaction requires at least two lines';
  end if;

  if p_reference_type is not null and p_reference_id is null then
    raise exception 'Reference ID is required when reference type is supplied';
  end if;

  if p_reference_type is null and p_reference_id is not null then
    raise exception 'Reference type is required when reference ID is supplied';
  end if;

  if p_occurred_at is null then
    p_occurred_at := now();
  end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_account_id := (v_line->>'account_id')::uuid;
    v_direction := upper(btrim(v_line->>'direction'))::coin_entry_direction;
    v_amount := (v_line->>'amount')::bigint;

    if v_account_id is null or v_direction is null or v_amount is null or v_amount <= 0 then
      raise exception 'Each ledger line requires account_id, direction and positive amount';
    end if;

    select currency_id into v_account_currency
      from public.financial_accounts
     where id = v_account_id
       and status = 'ACTIVE';

    if v_account_currency is null then
      raise exception 'Ledger account is missing or inactive';
    end if;

    if v_account_currency <> p_currency_id then
      raise exception 'Ledger account currency mismatch';
    end if;

    v_count := v_count + 1;
    if v_direction = 'DEBIT' then
      v_debits := v_debits + v_amount;
    else
      v_credits := v_credits + v_amount;
    end if;
  end loop;

  if v_count < 2 or v_debits <> v_credits then
    raise exception 'Financial transaction must balance before posting: debits %, credits %', v_debits, v_credits;
  end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_account_id := (v_line->>'account_id')::uuid;
    v_direction := upper(btrim(v_line->>'direction'))::coin_entry_direction;
    v_amount := (v_line->>'amount')::bigint;

    insert into public.financial_ledger_entries (
      transaction_group_id,
      account_id,
      currency_id,
      direction,
      amount,
      reference_type,
      reference_id,
      description,
      occurred_at
    ) values (
      v_group_id,
      v_account_id,
      p_currency_id,
      v_direction,
      v_amount,
      p_reference_type,
      p_reference_id,
      coalesce(v_line->>'description', p_description),
      p_occurred_at
    );
  end loop;

  return v_group_id;
end;
$$;

revoke all on function public.post_financial_transaction(uuid, jsonb, varchar, uuid, timestamptz, text, uuid) from public, anon, authenticated;
grant execute on function public.post_financial_transaction(uuid, jsonb, varchar, uuid, timestamptz, text, uuid) to service_role;

-- ============================================================
-- 5. COMPLETE TRANSACTION REVERSAL
-- ============================================================

create or replace function public.reverse_financial_transaction(
  p_transaction_group_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_original public.financial_ledger_entries%rowtype;
  v_new_group uuid := gen_random_uuid();
  v_count integer := 0;
begin
  if not public.is_trusted_server() then
    raise exception 'Financial transaction reversal is server-only';
  end if;

  if p_transaction_group_id is null then
    raise exception 'Transaction group is required';
  end if;

  if not exists (
    select 1 from public.financial_ledger_entries
     where transaction_group_id = p_transaction_group_id
  ) then
    raise exception 'Financial transaction does not exist';
  end if;

  if exists (
    select 1
      from public.financial_ledger_entries
     where transaction_group_id = p_transaction_group_id
       and reversed_entry_id is not null
  ) then
    raise exception 'Financial transaction has already been reversed';
  end if;

  for v_original in
    select *
      from public.financial_ledger_entries
     where transaction_group_id = p_transaction_group_id
     order by id
     for update
  loop
    insert into public.financial_ledger_entries (
      transaction_group_id,
      account_id,
      currency_id,
      direction,
      amount,
      reference_type,
      reference_id,
      description,
      occurred_at,
      reversed_entry_id
    ) values (
      v_new_group,
      v_original.account_id,
      v_original.currency_id,
      case when v_original.direction = 'DEBIT' then 'CREDIT' else 'DEBIT' end,
      v_original.amount,
      'LEDGER_REVERSAL',
      v_original.id,
      coalesce(p_reason, 'Reversal of financial transaction ' || p_transaction_group_id::text),
      now(),
      v_original.id
    );
    v_count := v_count + 1;
  end loop;

  if v_count < 2 then
    raise exception 'Cannot reverse an incomplete financial transaction';
  end if;

  return v_new_group;
end;
$$;

revoke all on function public.reverse_financial_transaction(uuid, text) from public, anon, authenticated;
grant execute on function public.reverse_financial_transaction(uuid, text) to service_role;

commit;
