-- Hi!Book 2.0 — final integrity fixes + transactional RPC foundation
-- Depends on the canonical schema and prior RLS migrations.
-- This migration corrects transaction-ordering bugs in the previous hardening pass
-- and establishes narrow SECURITY DEFINER functions for high-risk multi-row writes.

begin;

-- ============================================================
-- 1. REMOVE INVALID UPDATED_AT TRIGGER TARGET
-- ============================================================

-- user_legal_acceptance intentionally has no updated_at column.
drop trigger if exists trg_user_legal_acceptance_updated_at on public.user_legal_acceptance;

-- ============================================================
-- 2. TRUST BOUNDARY: JWT ROLE, NOT current_user
-- ============================================================

create or replace function public.is_trusted_server()
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  select coalesce(auth.role(), '') in ('service_role', 'supabase_admin');
$$;

-- ============================================================
-- 3. POST VALIDATION MUST BE DEFERRED
-- ============================================================

create or replace function public.validate_post_final()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  target_post_id uuid;
  post_status post_status;
  post_content text;
  media_count integer;
begin
  target_post_id := case when tg_table_name = 'post_media' then coalesce(new.post_id, old.post_id) else new.id end;

  select p.status, p.content
    into post_status, post_content
  from public.posts p
  where p.id = target_post_id;

  if post_status is null then
    return coalesce(new, old);
  end if;

  if post_status <> 'DELETED' then
    select count(*) into media_count
    from public.post_media pm
    where pm.post_id = target_post_id
      and pm.deleted_at is null;

    if coalesce(char_length(trim(post_content)), 0) = 0 and media_count = 0 then
      raise exception 'Post must contain text or media';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_posts_validate_content on public.posts;
drop trigger if exists trg_posts_validate_final on public.posts;
create constraint trigger trg_posts_validate_final
  after insert or update of content, status on public.posts
  deferrable initially deferred
  for each row execute function public.validate_post_final();

drop trigger if exists trg_post_media_validate_final on public.post_media;
create constraint trigger trg_post_media_validate_final
  after insert or update or delete on public.post_media
  deferrable initially deferred
  for each row execute function public.validate_post_final();

-- MVP media constraints remain immediate.
create or replace function public.validate_post_media()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.media_type <> 'IMAGE' then
    raise exception 'MVP post media supports images only';
  end if;
  if new.file_size <= 0 or new.file_size > 10485760 then
    raise exception 'Post image must be between 1 byte and 10MB';
  end if;
  if new.mime_type not in ('image/jpeg','image/png','image/webp','image/gif') then
    raise exception 'Unsupported post image MIME type';
  end if;
  if new.storage_path !~ ('^posts/' || new.post_id::text || '/')
     and new.storage_path !~ ('^posts/' || auth.uid()::text || '/') then
    -- Exact ownership/path enforcement is repeated by the trusted RPC.
    raise exception 'Invalid post media storage path';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_post_media_validate on public.post_media;
create trigger trg_post_media_validate
  before insert or update on public.post_media
  for each row execute function public.validate_post_media();

-- ============================================================
-- 4. MESSAGE SHAPE MUST BE DEFERRED
-- ============================================================

create or replace function public.validate_message_final()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  target_message_id uuid;
  msg_type message_type;
  msg_content text;
  shared_id uuid;
  media_count integer;
begin
  target_message_id := case when tg_table_name = 'message_media' then coalesce(new.message_id, old.message_id) else new.id end;

  select m.message_type, m.content, m.shared_post_id
    into msg_type, msg_content, shared_id
  from public.messages m
  where m.id = target_message_id;

  if msg_type is null then
    return coalesce(new, old);
  end if;

  if msg_type = 'TEXT' and coalesce(char_length(trim(msg_content)), 0) = 0 then
    raise exception 'Text message requires content';
  end if;

  if msg_type = 'POST_SHARE' and shared_id is null then
    raise exception 'Post-share message requires shared_post_id';
  end if;

  if msg_type <> 'POST_SHARE' and shared_id is not null then
    raise exception 'Only POST_SHARE messages may reference a shared post';
  end if;

  select count(*) into media_count
  from public.message_media mm
  where mm.message_id = target_message_id
    and mm.deleted_at is null;

  if msg_type = 'IMAGE' and media_count = 0 then
    raise exception 'Image message requires media';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_messages_validate_shape on public.messages;
drop trigger if exists trg_messages_validate_final on public.messages;
create constraint trigger trg_messages_validate_final
  after insert or update on public.messages
  deferrable initially deferred
  for each row execute function public.validate_message_final();

drop trigger if exists trg_message_media_validate_final on public.message_media;
create constraint trigger trg_message_media_validate_final
  after insert or update or delete on public.message_media
  deferrable initially deferred
  for each row execute function public.validate_message_final();

create or replace function public.validate_message_media()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.media_type <> 'IMAGE' then
    raise exception 'MVP message media supports images only';
  end if;
  if new.file_size <= 0 or new.file_size > 10485760 then
    raise exception 'Message image must be between 1 byte and 10MB';
  end if;
  if new.mime_type not in ('image/jpeg','image/png','image/webp','image/gif') then
    raise exception 'Unsupported message image MIME type';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_message_media_validate on public.message_media;
create trigger trg_message_media_validate
  before insert or update on public.message_media
  for each row execute function public.validate_message_media();

-- ============================================================
-- 5. DIRECT CONVERSATION PAIR IS DERIVED AT COMMIT
-- ============================================================

create or replace function public.sync_direct_pair_key()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_conversation_id uuid;
  first_user uuid;
  second_user uuid;
  participant_count integer;
begin
  target_conversation_id := coalesce(new.conversation_id, old.conversation_id);

  select count(*) into participant_count
  from public.conversation_participants cp
  where cp.conversation_id = target_conversation_id;

  if exists (
    select 1 from public.conversations c
    where c.id = target_conversation_id and c.type = 'DIRECT'
  ) then
    if participant_count <> 2 then
      raise exception 'DIRECT conversation must have exactly two participants';
    end if;

    select cp.user_id into first_user
    from public.conversation_participants cp
    where cp.conversation_id = target_conversation_id
    order by cp.user_id
    limit 1;

    select cp.user_id into second_user
    from public.conversation_participants cp
    where cp.conversation_id = target_conversation_id
    order by cp.user_id
    offset 1 limit 1;

    update public.conversations
       set direct_pair_key = first_user::text || ':' || second_user::text,
           updated_at = now()
     where id = target_conversation_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_direct_pair_key on public.conversation_participants;
create constraint trigger trg_sync_direct_pair_key
  after insert or update or delete on public.conversation_participants
  deferrable initially deferred
  for each row execute function public.sync_direct_pair_key();

-- Remove the old nonfunctional placeholder trigger if present.
drop trigger if exists trg_set_direct_pair_key on public.conversations;

-- ============================================================
-- 6. BLOCK => REMOVE BOTH FOLLOW DIRECTIONS TRANSACTIONALLY
-- ============================================================

create or replace function public.remove_follows_on_block()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  delete from public.follows
   where (follower_id = new.blocker_id and following_id = new.blocked_id)
      or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end;
$$;

drop trigger if exists trg_blocks_remove_follows on public.blocks;
create trigger trg_blocks_remove_follows
after insert on public.blocks
for each row execute function public.remove_follows_on_block();

-- ============================================================
-- 7. SERVER-ONLY MODERATION / FINANCE / AUDIT MUTATION GUARD
-- ============================================================

create or replace function public.protect_post_moderation_state()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not public.is_trusted_server()
     and (new.status is distinct from old.status or new.deleted_at is distinct from old.deleted_at) then
    raise exception 'Post moderation state is server controlled';
  end if;
  return new;
end;
$$;

create or replace function public.protect_message_moderation_state()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not public.is_trusted_server()
     and (new.status is distinct from old.status or new.deleted_at is distinct from old.deleted_at) then
    raise exception 'Message moderation state is server controlled';
  end if;
  return new;
end;
$$;

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

-- ============================================================
-- 8. NARROW TRANSACTIONAL RPC: CREATE POST + MEDIA
-- ============================================================

create or replace function public.create_post(
  p_content text,
  p_visibility post_visibility default 'PUBLIC',
  p_media jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_post_id uuid := gen_random_uuid();
  v_item jsonb;
  v_order integer := 0;
  v_path text;
  v_mime text;
  v_size bigint;
  v_width integer;
  v_height integer;
  v_alt text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.users u where u.id = v_user_id and u.account_status = 'ACTIVE') then
    raise exception 'Active account required';
  end if;
  if coalesce(char_length(p_content),0) > 5000 then raise exception 'Post content exceeds 5000 characters'; end if;
  if jsonb_typeof(p_media) <> 'array' then raise exception 'Media must be a JSON array'; end if;
  if jsonb_array_length(p_media) > 10 then raise exception 'A post may contain at most 10 images'; end if;
  if coalesce(char_length(trim(p_content)),0) = 0 and jsonb_array_length(p_media) = 0 then
    raise exception 'Post must contain text or media';
  end if;

  insert into public.posts(id,user_id,content,visibility,status,published_at)
  values (v_post_id,v_user_id,nullif(trim(p_content),''),p_visibility,'PUBLISHED',now());

  for v_item in select * from jsonb_array_elements(p_media) loop
    v_path := v_item->>'storage_path';
    v_mime := v_item->>'mime_type';
    v_size := (v_item->>'file_size')::bigint;
    v_width := nullif(v_item->>'width','')::integer;
    v_height := nullif(v_item->>'height','')::integer;
    v_alt := left(v_item->>'alt_text',500);

    if v_path is null or v_path <> 'posts/' || v_user_id::text || '/' || v_post_id::text || '/' || split_part(v_path,'/',4) then
      raise exception 'Invalid post media storage path';
    end if;
    if v_mime not in ('image/jpeg','image/png','image/webp','image/gif') then raise exception 'Unsupported image MIME type'; end if;
    if v_size is null or v_size <= 0 or v_size > 10485760 then raise exception 'Invalid image size'; end if;

    insert into public.post_media(id,post_id,media_type,storage_path,mime_type,file_size,width,height,display_order,alt_text)
    values (gen_random_uuid(),v_post_id,'IMAGE',v_path,v_mime,v_size,v_width,v_height,v_order,v_alt);
    v_order := v_order + 1;
  end loop;

  return v_post_id;
end;
$$;

revoke all on function public.create_post(text,post_visibility,jsonb) from public;
grant execute on function public.create_post(text,post_visibility,jsonb) to authenticated;

-- ============================================================
-- 9. TRANSACTIONAL RPC: GET OR CREATE DIRECT CONVERSATION
-- ============================================================

create or replace function public.get_or_create_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_me uuid := auth.uid();
  v_conversation_id uuid;
  v_low uuid;
  v_high uuid;
  v_pair text;
begin
  if v_me is null or p_other_user_id is null or v_me = p_other_user_id then raise exception 'Invalid participant'; end if;
  if not exists (select 1 from public.users where id=v_me and account_status='ACTIVE') then raise exception 'Active account required'; end if;
  if not exists (select 1 from public.users where id=p_other_user_id and account_status='ACTIVE') then raise exception 'Target account unavailable'; end if;
  if public.is_blocked_between(p_other_user_id) then raise exception 'Messaging unavailable'; end if;
  if not public.can_message_user(p_other_user_id) then raise exception 'Messaging not permitted'; end if;

  v_low := least(v_me,p_other_user_id);
  v_high := greatest(v_me,p_other_user_id);
  v_pair := v_low::text || ':' || v_high::text;

  select c.id into v_conversation_id
  from public.conversations c
  where c.type='DIRECT' and c.direct_pair_key=v_pair
  limit 1;

  if v_conversation_id is not null then return v_conversation_id; end if;

  insert into public.conversations(type,direct_pair_key)
  values ('DIRECT',v_pair)
  returning id into v_conversation_id;

  insert into public.conversation_participants(conversation_id,user_id)
  values (v_conversation_id,v_low),(v_conversation_id,v_high);

  return v_conversation_id;
exception
  when unique_violation then
    select c.id into v_conversation_id
    from public.conversations c
    where c.type='DIRECT' and c.direct_pair_key=v_pair
    limit 1;
    if v_conversation_id is null then raise; end if;
    return v_conversation_id;
end;
$$;

revoke all on function public.get_or_create_direct_conversation(uuid) from public;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

-- ============================================================
-- 10. TRANSACTIONAL RPC: FOLLOW / UNFOLLOW
-- ============================================================

create or replace function public.follow_user(p_following_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null or p_following_id is null or v_me = p_following_id then raise exception 'Invalid follow target'; end if;
  if not exists (select 1 from public.users where id=v_me and account_status='ACTIVE') then raise exception 'Active account required'; end if;
  if not exists (select 1 from public.users where id=p_following_id and account_status='ACTIVE') then raise exception 'Target unavailable'; end if;
  if public.is_blocked_between(p_following_id) then raise exception 'Follow unavailable'; end if;
  if exists (select 1 from public.user_privacy_settings ups where ups.user_id=p_following_id and ups.profile_visibility='PRIVATE') then
    raise exception 'Private profiles are not followable in MVP';
  end if;
  insert into public.follows(follower_id,following_id) values(v_me,p_following_id) on conflict do nothing;
  return true;
end;
$$;

create or replace function public.unfollow_user(p_following_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  delete from public.follows where follower_id=auth.uid() and following_id=p_following_id;
  return true;
end;
$$;

revoke all on function public.follow_user(uuid) from public;
revoke all on function public.unfollow_user(uuid) from public;
grant execute on function public.follow_user(uuid) to authenticated;
grant execute on function public.unfollow_user(uuid) to authenticated;

-- ============================================================
-- 11. TRANSACTIONAL RPC: BLOCK / UNBLOCK
-- ============================================================

create or replace function public.block_user(p_blocked_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or p_blocked_id is null or auth.uid()=p_blocked_id then raise exception 'Invalid block target'; end if;
  if not exists (select 1 from public.users where id=auth.uid() and account_status='ACTIVE') then raise exception 'Active account required'; end if;
  insert into public.blocks(blocker_id,blocked_id) values(auth.uid(),p_blocked_id) on conflict do nothing;
  return true;
end;
$$;

create or replace function public.unblock_user(p_blocked_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  delete from public.blocks where blocker_id=auth.uid() and blocked_id=p_blocked_id;
  return true;
end;
$$;

revoke all on function public.block_user(uuid) from public;
revoke all on function public.unblock_user(uuid) from public;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;

commit;
