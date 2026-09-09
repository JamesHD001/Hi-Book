begin;

create extension if not exists pgtap;

select plan(9);

select has_function_privilege('authenticated', 'public.get_or_create_direct_conversation(uuid)', 'execute');
select is(has_function_privilege('anon', 'public.get_or_create_direct_conversation(uuid)', 'execute'), false);
select is(has_function_privilege('public', 'public.get_or_create_direct_conversation(uuid)', 'execute'), false);
select is((select prosecdef from pg_proc where oid = 'public.get_or_create_direct_conversation(uuid)'::regprocedure), true, 'direct conversation creation is SECURITY DEFINER');
select is((select proconfig from pg_proc where oid = 'public.get_or_create_direct_conversation(uuid)'::regprocedure), array['search_path=""']::text[], 'direct conversation creation uses an empty search_path');
select ok(exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'conversations' and column_name = 'direct_pair_key'), 'DIRECT conversations have a deterministic pair-key column');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'conversations' and indexname = 'conversations_direct_pair_uq'), 'DIRECT conversation pair key has a unique index');
select is(has_table_privilege('authenticated', 'public.conversations', 'insert'), false, 'authenticated cannot insert conversations directly');
select is(has_table_privilege('authenticated', 'public.conversation_participants', 'insert'), false, 'authenticated cannot insert participants directly');

select * from finish();
rollback;
