begin;

-- Direct messages are rendered live by ConversationView through Supabase
-- Realtime. Keep the publication membership explicit and idempotent so a
-- fresh local/prod database receives the same realtime contract.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
end;
$$;

commit;
