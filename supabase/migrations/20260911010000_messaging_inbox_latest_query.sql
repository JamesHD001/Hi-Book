begin;

-- The lateral lookup below is indexed by conversation and descending message
-- chronology, so the database can stop after the newest row for each thread.
create index if not exists idx_messages_conversation_created_id_desc
  on public.messages (conversation_id, created_at desc, id desc);

-- Return the authenticated user's direct conversations together with the other
-- participant and exactly one latest message per conversation. Keeping the
-- latest-message selection inside PostgreSQL avoids fetching a global message
-- window and then reducing it in application code, which can miss conversations
-- when the account has more than the arbitrary window size.
create or replace function public.get_message_inbox()
returns table (
  conversation_id uuid,
  conversation_type public.conversation_type,
  conversation_updated_at timestamptz,
  other_user_id uuid,
  last_read_at timestamptz,
  last_message_id uuid,
  last_message_sender_id uuid,
  last_message_type public.message_type,
  last_message_content text,
  last_message_created_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select
    c.id,
    c.type,
    c.updated_at,
    other_cp.user_id,
    me_cp.last_read_at,
    lm.id,
    lm.sender_id,
    lm.message_type,
    lm.content,
    lm.created_at
  from public.conversation_participants me_cp
  join public.conversations c
    on c.id = me_cp.conversation_id
   and c.type = 'DIRECT'
  join public.conversation_participants other_cp
    on other_cp.conversation_id = c.id
   and other_cp.user_id <> auth.uid()
  left join lateral (
    select
      m.id,
      m.sender_id,
      m.message_type,
      m.content,
      m.created_at
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc, m.id desc
    limit 1
  ) lm on true
  where me_cp.user_id = auth.uid()
  order by coalesce(lm.created_at, c.updated_at) desc, c.id desc;
$$;

revoke all on function public.get_message_inbox() from public, anon;
grant execute on function public.get_message_inbox() to authenticated;

commit;
