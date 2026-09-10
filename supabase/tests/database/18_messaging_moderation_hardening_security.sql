begin;

select plan(12);

select is(has_function_privilege('authenticated'::name, 'public.get_latest_messages_for_conversations(uuid[])'::text, 'EXECUTE'), true, 'authenticated can execute latest-message batch RPC');
select is(has_function_privilege('anon'::name, 'public.get_latest_messages_for_conversations(uuid[])'::text, 'EXECUTE'), false, 'anon cannot execute latest-message batch RPC');
select is((select prosecdef from pg_proc where oid='public.get_latest_messages_for_conversations(uuid[])'::regprocedure), true, 'latest-message batch RPC is SECURITY DEFINER');
select is((select proconfig from pg_proc where oid='public.get_latest_messages_for_conversations(uuid[])'::regprocedure), array['search_path=""']::text[], 'latest-message batch RPC pins empty search_path');
select ok(exists (select 1 from pg_indexes where schemaname='public' and tablename='messages' and indexname='messages_conversation_created_id_idx'), 'latest-message lookup has deterministic composite index');

select is((select prosecdef from pg_proc where oid='public.execute_moderation_action(uuid,public.moderation_action_type,text,public.severity_type,integer)'::regprocedure), true, 'moderation action API remains SECURITY DEFINER');
select is((select proconfig from pg_proc where oid='public.execute_moderation_action(uuid,public.moderation_action_type,text,public.severity_type,integer)'::regprocedure), array['search_path=""']::text[], 'moderation action API pins empty search_path');
select is((select proconfig from pg_proc where oid='public.execute_moderation_action(uuid,public.moderation_action_type,text,public.severity_type,timestamptz,timestamptz,jsonb)'::regprocedure), array['search_path=""']::text[], 'internal moderation action RPC pins empty search_path');
select is(has_function_privilege('anon'::name,'public.execute_moderation_action(uuid,public.moderation_action_type,text,public.severity_type,integer)'::text,'EXECUTE'), false, 'anon cannot execute moderation action API');
select is((select prosecdef from pg_proc where oid='public.is_user_restricted(uuid)'::regprocedure), true, 'restriction helper is SECURITY DEFINER');
select is((select proconfig from pg_proc where oid='public.is_user_restricted(uuid)'::regprocedure), array['search_path=""']::text[], 'restriction helper pins empty search_path');
select is((select prosecdef from pg_proc where oid='public.review_moderation_appeal(uuid,public.appeal_status,text)'::regprocedure), true, 'appeal review remains SECURITY DEFINER');

select * from finish();
rollback;
