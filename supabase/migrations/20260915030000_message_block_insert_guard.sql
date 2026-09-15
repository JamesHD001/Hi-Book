begin;

-- Defense in depth: every message row must respect the bilateral block boundary,
-- including any future authenticated write path that might bypass send_message.
create or replace function private.prevent_blocked_message_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.conversation_participants cp
    join public.blocks b
      on (b.blocker_id = new.sender_id and b.blocked_id = cp.user_id)
      or (b.blocker_id = cp.user_id and b.blocked_id = new.sender_id)
    where cp.conversation_id = new.conversation_id
      and cp.user_id <> new.sender_id
  ) then
    raise exception 'Messaging unavailable';
  end if;

  return new;
end;
$$;

revoke all on function private.prevent_blocked_message_insert() from public, anon, authenticated;

drop trigger if exists trg_prevent_blocked_message_insert on public.messages;
create trigger trg_prevent_blocked_message_insert
before insert on public.messages
for each row execute function private.prevent_blocked_message_insert();

commit;
