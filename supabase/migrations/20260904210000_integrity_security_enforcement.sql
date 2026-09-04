-- Hi!Book 2.0 — database integrity/security enforcement
-- Corrected implementation layer after schema + foundational RLS.
-- Transaction-order-sensitive post/message validation lives in the later deferred layer.

begin;

-- ============================================================
-- COMMON UPDATED_AT ENFORCEMENT
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $do$
declare t text;
begin
  foreach t in array array[
    'users','profiles','user_privacy_settings','user_preferences',
    'notification_preferences','account_deletion_request','reports','posts','comments',
    'conversations','conversation_participants','messages','discovery_preferences',
    'notifications','moderation_cases','moderation_notes','moderation_actions','appeals',
    'admin_permissions','admin_roles','admin_user_roles','platform_configurations','feature_flags',
    'analytics_event_definitions','analytics_daily_metrics','analytics_daily_dimension_metrics',
    'currencies','payment_providers','payment_methods','monetization_products','product_prices',
    'purchases','payments','coin_wallets','virtual_gifts','refunds'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
      execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
    end if;
  end loop;
end $do$;

-- ============================================================
-- USER / PROFILE INTEGRITY
-- ============================================================

create or replace function public.normalize_username()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.username := lower(trim(new.username));
  new.username_normalized := new.username;
  if new.username !~ '^[a-z0-9_.]{3,30}$' then
    raise exception 'Invalid username format';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_normalize_username on public.profiles;
create trigger trg_profiles_normalize_username
before insert or update of username on public.profiles
for each row execute function public.normalize_username();

-- ============================================================
-- COMMENT / MESSAGE RELATIONSHIP INTEGRITY
-- ============================================================

create or replace function public.validate_comment_parent()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.parent_comment_id is not null and not exists (
    select 1 from public.comments c
    where c.id=new.parent_comment_id
      and c.post_id=new.post_id
      and c.parent_comment_id is null
  ) then
    raise exception 'Comment parent must be a top-level comment on the same post';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_comments_validate_parent on public.comments;
create trigger trg_comments_validate_parent
before insert or update of post_id,parent_comment_id on public.comments
for each row execute function public.validate_comment_parent();

create or replace function public.validate_message_reply()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.reply_to_message_id is not null and not exists (
    select 1 from public.messages m
    where m.id=new.reply_to_message_id
      and m.conversation_id=new.conversation_id
  ) then
    raise exception 'Message reply must reference a message in the same conversation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_messages_validate_reply on public.messages;
create trigger trg_messages_validate_reply
before insert or update of reply_to_message_id,conversation_id on public.messages
for each row execute function public.validate_message_reply();

-- ============================================================
-- REPORT LIFECYCLE
-- ============================================================

alter table public.reports drop constraint if exists reports_check;
alter table public.reports drop constraint if exists reports_status_resolved_check;
alter table public.reports drop constraint if exists reports_lifecycle_check;

alter table public.reports add constraint reports_lifecycle_check check (
  (status in ('PENDING','IN_REVIEW') and resolved_at is null and resolution is null)
  or
  (status in ('RESOLVED','DISMISSED','DUPLICATE') and resolved_at is not null and resolution is not null)
);

-- ============================================================
-- FINANCIAL BASIC INTEGRITY
-- ============================================================

alter table public.purchases drop constraint if exists purchase_quantity_positive;
alter table public.purchases add constraint purchase_quantity_positive check (quantity > 0);
alter table public.purchases drop constraint if exists purchase_amounts_positive;
alter table public.purchases add constraint purchase_amounts_positive check (unit_amount > 0 and total_amount > 0);
alter table public.purchases drop constraint if exists purchase_total_matches_quantity;
alter table public.purchases add constraint purchase_total_matches_quantity check (total_amount = unit_amount * quantity);

alter table public.payments drop constraint if exists payment_amount_positive;
alter table public.payments add constraint payment_amount_positive check (amount > 0);

alter table public.payment_attempts drop constraint if exists payment_attempt_amount_positive;
alter table public.payment_attempts add constraint payment_attempt_amount_positive check (requested_amount > 0);

alter table public.coin_wallets drop constraint if exists coin_wallet_balance_nonnegative;
alter table public.coin_wallets add constraint coin_wallet_balance_nonnegative check (available_balance >= 0);

alter table public.coin_transaction_entries drop constraint if exists coin_entry_amount_positive;
alter table public.coin_transaction_entries add constraint coin_entry_amount_positive check (amount > 0);

alter table public.financial_ledger_entries drop constraint if exists financial_entry_amount_positive;
alter table public.financial_ledger_entries add constraint financial_entry_amount_positive check (amount > 0);

create or replace function public.validate_virtual_wallet()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.currencies c
    where c.id=new.currency_id and c.currency_type='VIRTUAL'
  ) then
    raise exception 'Coin wallet must use a virtual currency';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_coin_wallet_virtual_currency on public.coin_wallets;
create trigger trg_coin_wallet_virtual_currency
before insert or update of currency_id on public.coin_wallets
for each row execute function public.validate_virtual_wallet();

-- ============================================================
-- IMMUTABILITY / TRUSTED SERVER BOUNDARY
-- ============================================================

create or replace function public.protect_ledger_entry()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not public.is_trusted_server() then
    raise exception 'Financial ledger entries are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_financial_ledger_immutable on public.financial_ledger_entries;
create trigger trg_financial_ledger_immutable
before update or delete on public.financial_ledger_entries
for each row execute function public.protect_ledger_entry();

create or replace function public.protect_audit_log()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not public.is_trusted_server() then
    raise exception 'Audit logs are append-only';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_moderation_audit_immutable on public.moderation_audit_logs;
create trigger trg_moderation_audit_immutable
before update or delete on public.moderation_audit_logs
for each row execute function public.protect_audit_log();

drop trigger if exists trg_admin_audit_immutable on public.admin_audit_logs;
create trigger trg_admin_audit_immutable
before update or delete on public.admin_audit_logs
for each row execute function public.protect_audit_log();

-- ============================================================
-- CONVERSATION TIMELINE
-- ============================================================

create or replace function public.touch_conversation_last_message()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  update public.conversations
     set last_message_at=greatest(coalesce(last_message_at,new.created_at),new.created_at),
         updated_at=now()
   where id=new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_messages_touch_conversation on public.messages;
create trigger trg_messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_last_message();

commit;
