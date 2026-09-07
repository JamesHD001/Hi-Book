begin;

create extension if not exists pgtap;

select plan(9);

select has_function_privilege(
  'public.get_or_create_direct_conversation(uuid)',
  'execute',
  'authenticated'
);

select has_function_privilege(
  'public.get_or_create_direct_conversation(uuid)',
  'execute',
  'anon'
) is false;

select has_function_privilege(
  'public.get_or_create_direct_conversation(uuid)',
  'execute',
  'public'
) is false;

select is(
  (select prosecdef from pg_proc where oid = 'public.get_or_create_direct_conversation(uuid)'::regprocedure),
  true,
  'direct conversation creation is SECURITY DEFINER'
);

select is(
  (select proconfig from pg_proc where oid = 'public.get_or_create_direct_conversation(uuid)'::regprocedure),
  array['search_path=""']::text[],
  'direct conversation creation uses an empty search_path'
);

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'conversations'
      and column_name = 'direct_pair_key'
  ),
  'DIRECT conversations have a deterministic pair-key column'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'conversations'
      and indexname = 'conversations_direct_pair_uq'
  ),
  'DIRECT conversation pair key has a unique index'
);

select has_table_privilege(
  'authenticated',
  'public.conversations',
  'insert'
) is false;

select has_table_privilege(
  'authenticated',
  'public.conversation_participants',
  'insert'
) is false;

select * from finish();
rollback;
