begin;

select plan(23);

select has_function('public', 'is_user_restricted', array['uuid']);
select function_returns('public', 'is_user_restricted', array['uuid'], 'boolean');
select has_function('public', 'execute_moderation_action', array['uuid','public.moderation_action_type','text','public.severity_type','timestamptz','timestamptz','jsonb']);
select function_returns('public', 'execute_moderation_action', array['uuid','public.moderation_action_type','text','public.severity_type','timestamptz','timestamptz','jsonb'], 'public.moderation_actions');
select has_function('public', 'execute_moderation_action', array['uuid','public.moderation_action_type','text','public.severity_type','integer']);
select function_returns('public', 'execute_moderation_action', array['uuid','public.moderation_action_type','text','public.severity_type','integer'], 'public.moderation_actions');
select has_function('public', 'submit_moderation_appeal', array['uuid','text']);
select function_returns('public', 'submit_moderation_appeal', array['uuid','text'], 'public.appeals');
select has_function('public', 'review_moderation_appeal', array['uuid','public.appeal_status','text']);
select function_returns('public', 'review_moderation_appeal', array['uuid','public.appeal_status','text'], 'public.appeals');
select has_function('public', 'get_active_moderation_actions', array['uuid']);
select function_returns('public', 'get_active_moderation_actions', array['uuid'], 'setof record');

select is((select prosecdef from pg_proc where oid = 'public.is_user_restricted(uuid)'::regprocedure), true, 'is_user_restricted is SECURITY DEFINER');
select is((select prosecdef from pg_proc where oid = 'public.execute_moderation_action(uuid,public.moderation_action_type,text,public.severity_type,timestamptz,timestamptz,jsonb)'::regprocedure), true, 'full moderation action RPC is SECURITY DEFINER');
select is((select prosecdef from pg_proc where oid = 'public.execute_moderation_action(uuid,public.moderation_action_type,text,public.severity_type,integer)'::regprocedure), true, 'compat moderation action RPC is SECURITY DEFINER');
select is((select prosecdef from pg_proc where oid = 'public.submit_moderation_appeal(uuid,text)'::regprocedure), true, 'appeal submission is SECURITY DEFINER');
select is((select prosecdef from pg_proc where oid = 'public.review_moderation_appeal(uuid,public.appeal_status,text)'::regprocedure), true, 'appeal review is SECURITY DEFINER');
select is((select 'search_path=""'=any(coalesce(proconfig,'{}'::text[])) from pg_proc where oid = 'public.execute_moderation_action(uuid,public.moderation_action_type,text,public.severity_type,timestamptz,timestamptz,jsonb)'::regprocedure), true, 'full moderation action RPC has empty search_path');
select is((select 'search_path=""'=any(coalesce(proconfig,'{}'::text[])) from pg_proc where oid = 'public.review_moderation_appeal(uuid,public.appeal_status,text)'::regprocedure), true, 'appeal review has empty search_path');
select is(has_function_privilege('anon'::name, 'public.execute_moderation_action(uuid,public.moderation_action_type,text,public.severity_type,timestamptz,timestamptz,jsonb)'::text, 'EXECUTE'), false, 'full moderation action RPC is not executable by anon');
select is(has_function_privilege('anon'::name, 'public.review_moderation_appeal(uuid,public.appeal_status,text)'::text, 'EXECUTE'), false, 'appeal review is not executable by anon');
select is(has_function_privilege('authenticated'::name, 'public.execute_moderation_action(uuid,public.moderation_action_type,text,public.severity_type,timestamptz,timestamptz,jsonb)'::text, 'EXECUTE'), true, 'authenticated can execute moderation action RPC');
select is(has_function_privilege('authenticated'::name, 'public.review_moderation_appeal(uuid,public.appeal_status,text)'::text, 'EXECUTE'), true, 'authenticated can execute appeal review RPC');

select * from finish();
rollback;
