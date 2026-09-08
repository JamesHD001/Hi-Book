begin;

-- A deterministic pair key gives DIRECT conversations a database-enforced
-- identity. Existing legacy DIRECT rows may remain null; all newly-created
-- DIRECT conversations use the key.
alter table public.conversations
  add column if not exists direct_pair_key text;

create unique index if not exists conversations_direct_pair_uq
  on public.conversations (direct_pair_key)
  where type = 'DIRECT' and direct_pair_key is not null;

create index if not exists conversations_updated_idx
  on public.conversations (updated_at desc);

-- Preserve the original parameter name so CREATE OR REPLACE is compatible
-- with the existing function signature.
create or replace function public.get_or_create_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_pair_key text;
  v_conversation_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_user_id = p_other_user_id then
    raise exception 'Cannot start a conversation with yourself';
  end if;

  if not exists (
    select 1 from public.users
    where id = v_user_id and account_status = 'ACTIVE'
  ) then
    raise exception 'Active account required';
  end if;

  if not exists (
    select 1 from public.users
    where id = p_other_user_id and account_status = 'ACTIVE'
  ) then
    raise exception 'User is unavailable';
  end if;

  if not public.can_message_user(p_other_user_id) then
    raise exception 'Messaging is not permitted';
  end if;

  v_pair_key := least(v_user_id::text, p_other_user_id::text)
    || ':' || greatest(v_user_id::text, p_other_user_id::text);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_pair_key, 0)
  );

  select c.id into v_conversation_id
  from public.conversations c
  where c.type = 'DIRECT'
    and c.direct_pair_key = v_pair_key
  limit 1;

  if v_conversation_id is null then
    select c.id into v_conversation_id
    from public.conversations c
    where c.type = 'DIRECT'
      and exists (
        select 1 from public.conversation_participants cp
        where cp.conversation_id = c.id and cp.user_id = v_user_id
      )
      and exists (
        select 1 from public.conversation_participants cp
        where cp.conversation_id = c.id and cp.user_id = p_other_user_id
      )
      and 2 = (
        select count(*) from public.conversation_participants cp
        where cp.conversation_id = c.id
      )
    order by c.created_at asc
    limit 1;
  end if;

  if v_conversation_id is not null then
    update public.conversations
    set direct_pair_key = v_pair_key,
        updated_at = now()
    where id = v_conversation_id
      and (direct_pair_key is null or direct_pair_key = v_pair_key);
    return v_conversation_id;
  end if;

  v_conversation_id := gen_random_uuid();

  insert into public.conversations (id, type, direct_pair_key, created_at, updated_at)
  values (v_conversation_id, 'DIRECT', v_pair_key, now(), now());

  insert into public.conversation_participants
    (conversation_id, user_id, joined_at, last_read_at, updated_at)
  values
    (v_conversation_id, v_user_id, now(), now(), now()),
    (v_conversation_id, p_other_user_id, now(), null, now());

  return v_conversation_id;
exception
  when unique_violation then
    select c.id into v_conversation_id
    from public.conversations c
    where c.type = 'DIRECT'
      and c.direct_pair_key = v_pair_key
    limit 1;

    if v_conversation_id is null then
      raise;
    end if;
    return v_conversation_id;
end;
$$;

revoke all on function public.get_or_create_direct_conversation(uuid) from public;
revoke all on function public.get_or_create_direct_conversation(uuid) from anon;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

commit;
