begin;

create extension if not exists pgtap;

select plan(8);

select is(has_function_privilege('authenticated'::name, 'public.get_or_create_direct_conversation(uuid)'::text, 'EXECUTE'), true, 'authenticated can execute direct conversation creation');
select is(has_function_privilege('anon'::name, 'public.get_or_create_direct_conversation(uuid)'::text, 'EXECUTE'), false, 'anon cannot execute direct conversation creation');
select is((select prosecdef from pg_proc where oid = 'public.get_or_create_direct_conversation(uuid)'::regprocedure), true, 'direct conversation creation is SECURITY DEFINER');
select is((select proconfig from pg_proc where oid = 'public.get_or_create_direct_conversation(uuid)'::regprocedure), array['search_path=""']::text[], 'direct conversation creation uses an empty search_path');
select ok(exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'conversations' and column_name = 'direct_pair_key'), 'DIRECT conversations have a deterministic pair-key column');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'conversations' and indexname = 'conversations_direct_pair_uq'), 'DIRECT conversation pair key has a unique index');
select ok((select relrowsecurity from pg_class where oid = 'public.conversations'::regclass), 'conversations remain protected by RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.conversation_participants'::regclass), 'conversation participants remain protected by RLS');

select * from finish();
rollback;
