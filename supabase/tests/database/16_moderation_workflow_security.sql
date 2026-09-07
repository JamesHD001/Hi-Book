begin;

select plan(12);

select has_function('public', 'get_moderation_case_detail', ARRAY['uuid'], 'case detail RPC exists');
select has_function('public', 'add_moderation_note', ARRAY['uuid','text'], 'moderation note RPC exists');
select has_function('public', 'execute_moderation_action', ARRAY['uuid','public.moderation_action_type','text','public.severity_type','integer'], 'moderation action RPC exists');

select is((select prosecdef from pg_proc where oid = 'public.get_moderation_case_detail(uuid)'::regprocedure), true, 'case detail is SECURITY DEFINER');
select is((select prosecdef from pg_proc where oid = 'public.add_moderation_note(uuid,text)'::regprocedure), true, 'note RPC is SECURITY DEFINER');
select is((select prosecdef from pg_proc where oid = 'public.execute_moderation_action(uuid,public.moderation_action_type,text,public.severity_type,integer)'::regprocedure), true, 'action RPC is SECURITY DEFINER');

select is((select proconfig from pg_proc where oid = 'public.get_moderation_case_detail(uuid)'::regprocedure), ARRAY['search_path=""']::text[], 'case detail pins empty search_path');
select is((select proconfig from pg_proc where oid = 'public.add_moderation_note(uuid,text)'::regprocedure), ARRAY['search_path=""']::text[], 'note RPC pins empty search_path');
select is((select proconfig from pg_proc where oid = 'public.execute_moderation_action(uuid,public.moderation_action_type,text,public.severity_type,integer)'::regprocedure), ARRAY['search_path=""']::text[], 'action RPC pins empty search_path');

select has_function_privilege('anon', 'public.get_moderation_case_detail(uuid)', 'EXECUTE') is false;
select has_function_privilege('anon', 'public.execute_moderation_action(uuid,public.moderation_action_type,text,public.severity_type,integer)', 'EXECUTE') is false;

select finish();
rollback;
