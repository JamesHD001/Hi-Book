-- Hi!Book 2.0 — database integrity/security enforcement
-- Final hardening layer after schema + RLS migrations.
-- Complex workflows remain server/RPC owned; these constraints prevent direct-state corruption.

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
declare
  t text;
begin
  foreach t in array array[
    'users','profiles','user_privacy_settings','user_preferences','user_legal_acceptance',
    'notification_preferences','account_deletion_request','reports','posts','comments',
    'conversations','conversation_participants','messages','discovery_preferences',
    'notifications','moderation_notes','moderation_actions','appeals','admin_permissions',
    'admin_roles','admin_user_roles','platform_configurations','feature_flags',
    'analytics_event_definitions','currency','payment_provider','payment_method',
    'monetization_product','product_price','purchase','payment','coin_wallet',
    'virtual_gift','refund','payment_reconciliation'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
      execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
    end if;
  end loop;
end $do$;

-- ============================================================
-- USER/PROFILE INTEGRITY
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
-- POST INTEGRITY
-- ============================================================

create or replace function public.validate_post_content()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  media_count integer;
begin
  select count(*) into media_count
  from public.post_media pm
  where pm.post_id = new.id
    and pm.deleted_at is null;

  if coalesce(char_length(trim(new.content)), 0) = 0 and media_count = 0 then
    raise exception 'Post must contain text or media';
  end if;

  return new;
end;
$$;

-- Deferred validation is performed by the service/RPC transaction because a post and
-- its media are normally inserted as separate rows. The trigger below protects updates
-- that would turn a post into an empty post; creation workflow calls validate_post_content().
drop trigger if exists trg_posts_validate_content on public.posts;
create trigger trg_posts_validate_content
after insert or update of content on public.posts
for each row execute function public.validate_post_content();

create or replace function public.validate_post_media()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.media_type <> 'IMAGE' then
    raise exception 'MVP post media supports images only';
  end if;
  if new.file_size > 10485760 then
    raise exception 'Post image exceeds 10MB limit';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_post_media_validate on public.post_media;
create trigger trg_post_media_validate
before insert or update on public.post_media
for each row execute function public.validate_post_media();

-- Prevent a client from changing moderation lifecycle fields through broad owner UPDATEs.
create or replace function public.protect_post_moderation_state()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if current_user <> 'postgres'
     and (new.status is distinct from old.status or new.deleted_at is distinct from old.deleted_at) then
    raise exception 'Post moderation state is server controlled';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_posts_protect_state on public.posts;
create trigger trg_posts_protect_state
before update on public.posts
for each row execute function public.protect_post_moderation_state();

-- ============================================================
-- COMMENT INTEGRITY
-- ============================================================

create or replace function public.validate_comment_parent()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  parent_post uuid;
  parent_parent uuid;
begin
  if new.parent_comment_id is not null then
    select c.post_id, c.parent_comment_id
      into parent_post, parent_parent
    from public.comments c
    where c.id = new.parent_comment_id;
    if parent_post is null then raise exception 'Parent comment does not exist'; end if;
    if parent_parent is not null then raise exception 'Nested comment replies are not allowed'; end if;
    if parent_post <> new.post_id then raise exception 'Parent comment must belong to the same post'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_comments_validate_parent on public.comments;
create trigger trg_comments_validate_parent
before insert or update of post_id,parent_comment_id on public.comments
for each row execute function public.validate_comment_parent();

-- ============================================================
-- MESSAGE INTEGRITY
-- ============================================================

create or replace function public.validate_message_shape()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.message_type = 'TEXT' and coalesce(char_length(trim(new.content)),0) = 0 then
    raise exception 'Text message requires content';
  end if;
  if new.message_type = 'POST_SHARE' and new.shared_post_id is null then
    raise exception 'Post-share message requires shared_post_id';
  end if;
  if new.message_type <> 'POST_SHARE' and new.shared_post_id is not null then
    raise exception 'Only POST_SHARE messages may reference a shared post';
  end if;
  if new.message_type = 'IMAGE' and not exists (
    select 1 from public.message_media mm where mm.message_id = new.id and mm.deleted_at is null
  ) then
    raise exception 'Image message requires media';
  end if;
  return new;
end;
$$;

-- Message media can be attached in the same transaction after message creation; service/RPC
-- must run final shape validation before commit for IMAGE messages.
drop trigger if exists trg_messages_validate_shape on public.messages;
create trigger trg_messages_validate_shape
before insert or update on public.messages
for each row execute function public.validate_message_shape();

create or replace function public.validate_message_reply()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare parent_conversation uuid;
begin
  if new.reply_to_message_id is not null then
    select conversation_id into parent_conversation from public.messages where id = new.reply_to_message_id;
    if parent_conversation is null or parent_conversation <> new.conversation_id then
      raise exception 'Message reply must reference a message in the same conversation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_messages_validate_reply on public.messages;
create trigger trg_messages_validate_reply
before insert or update of conversation_id,reply_to_message_id on public.messages
for each row execute function public.validate_message_reply();

create or replace function public.protect_message_moderation_state()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if current_user <> 'postgres'
     and (new.status is distinct from old.status or new.deleted_at is distinct from old.deleted_at) then
    raise exception 'Message moderation state is server controlled';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_messages_protect_state on public.messages;
create trigger trg_messages_protect_state
before update on public.messages
for each row execute function public.protect_message_moderation_state();

-- ============================================================
-- DIRECT CONVERSATION INTEGRITY
-- ============================================================

alter table public.conversations add column if not exists direct_pair_key text;

create or replace function public.set_direct_pair_key()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.type = 'DIRECT' and new.direct_pair_key is null then
    -- Key is populated by the trusted conversation-creation RPC once both participants exist.
    null;
  elsif new.type <> 'DIRECT' then
    new.direct_pair_key := null;
  end if;
  return new;
end;
$$;

drop index if exists conversations_direct_pair_uq;
create unique index conversations_direct_pair_uq
on public.conversations(direct_pair_key)
where type = 'DIRECT' and direct_pair_key is not null;

-- ============================================================
-- REPORT LIFECYCLE
-- ============================================================

alter table public.reports drop constraint if exists reports_check;
alter table public.reports drop constraint if exists reports_status_resolved_check;

alter table public.reports add constraint reports_lifecycle_check check (
  (status in ('PENDING','IN_REVIEW') and resolved_at is null and resolution is null)
  or
  (status in ('RESOLVED','DISMISSED','DUPLICATE') and resolved_at is not null and resolution is not null)
);

-- ============================================================
-- FINANCIAL INTEGRITY
-- ============================================================

alter table public.purchase
  add constraint purchase_quantity_positive check (quantity > 0),
  add constraint purchase_amounts_positive check (unit_amount > 0 and total_amount > 0),
  add constraint purchase_total_matches_quantity check (total_amount = unit_amount * quantity);

alter table public.payment
  add constraint payment_amount_positive check (amount > 0);

alter table public.payment_attempt
  add constraint payment_attempt_amount_positive check (requested_amount > 0);

alter table public.coin_wallet
  add constraint coin_wallet_balance_nonnegative check (available_balance >= 0);

alter table public.coin_transaction_entry
  add constraint coin_entry_amount_positive check (amount > 0);

alter table public.financial_ledger_entry
  add constraint financial_entry_amount_positive check (amount > 0);

-- Wallet currency must be virtual.
create or replace function public.validate_virtual_wallet()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not exists (select 1 from public.currency c where c.id = new.currency_id and c.currency_type = 'VIRTUAL') then
    raise exception 'Coin wallet must use a virtual currency';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_coin_wallet_virtual_currency on public.coin_wallet;
create trigger trg_coin_wallet_virtual_currency
before insert or update of currency_id on public.coin_wallet
for each row execute function public.validate_virtual_wallet();

-- Financial ledger entries are append-only after creation. Corrections must use reversal entries.
create or replace function public.protect_ledger_entry()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if current_user <> 'postgres' then
    raise exception 'Financial ledger entries are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_financial_ledger_immutable on public.financial_ledger_entry;
create trigger trg_financial_ledger_immutable
before update or delete on public.financial_ledger_entry
for each row execute function public.protect_ledger_entry();

-- ============================================================
-- AUDIT LOG APPEND-ONLY
-- ============================================================

create or replace function public.protect_audit_log()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if current_user <> 'postgres' then
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
-- MESSAGE/POST TIMELINE MAINTENANCE
-- ============================================================

create or replace function public.touch_conversation_last_message()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  update public.conversations
     set last_message_at = greatest(coalesce(last_message_at, new.created_at), new.created_at),
         updated_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_messages_touch_conversation on public.messages;
create trigger trg_messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_last_message();

commit;
