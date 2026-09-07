begin;

create or replace function public.mark_conversation_read(target_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  update public.conversation_participants
  set last_read_at = now(), updated_at = now()
  where conversation_id = target_conversation_id
    and user_id = v_user_id;
  if not found then raise exception 'Conversation access denied'; end if;
  return true;
end;
$$;

create or replace function public.get_conversation_read_state(target_conversation_id uuid)
returns table (last_read_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select cp.last_read_at
  from public.conversation_participants cp
  join public.conversations c on c.id = cp.conversation_id
  where cp.conversation_id = target_conversation_id
    and cp.user_id = auth.uid()
    and c.type = 'DIRECT';
$$;

revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
revoke all on function public.get_conversation_read_state(uuid) from public, anon;
grant execute on function public.get_conversation_read_state(uuid) to authenticated;

commit;
