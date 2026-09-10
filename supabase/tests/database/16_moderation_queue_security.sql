begin;

select plan(18);

select ok(exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='create_moderation_case_from_report' and p.pronargs = 0), 'report-to-case trigger function exists');
select ok(exists (select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.relname='reports' and t.tgname='trg_create_moderation_case_from_report' and not t.tgisinternal), 'reports create moderation case trigger exists');
select is((select prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='create_moderation_case_from_report' limit 1), true, 'report-to-case function is SECURITY DEFINER');
select is((select 'search_path=""'=any(coalesce(p.proconfig,'{}'::text[])) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='create_moderation_case_from_report' limit 1), true, 'report-to-case function has empty search_path');
select is(has_function_privilege('authenticated'::name, (select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='create_moderation_case_from_report' limit 1), 'EXECUTE'), false, 'report-to-case function cannot be called directly by authenticated users');
select is(has_function_privilege('anon'::name, 'public.get_moderation_queue(public.moderation_case_status,public.moderation_priority,integer)'::text, 'EXECUTE'), false, 'moderation queue is not executable by anon');
select ok((select prosecdef from pg_proc where oid='public.get_moderation_queue(public.moderation_case_status,public.moderation_priority,integer)'::regprocedure), 'get_moderation_queue is SECURITY DEFINER');
select is((select 'search_path=""'=any(coalesce(proconfig,'{}'::text[])) from pg_proc where oid='public.get_moderation_queue(public.moderation_case_status,public.moderation_priority,integer)'::regprocedure), true, 'get_moderation_queue has empty search_path');
select ok((select has_function_privilege('authenticated'::name, 'public.get_moderation_queue(public.moderation_case_status,public.moderation_priority,integer)'::text, 'EXECUTE')), 'authenticated can execute get_moderation_queue');
select ok((select prosecdef from pg_proc where oid='public.assign_moderation_case(uuid,uuid)'::regprocedure), 'assign_moderation_case is SECURITY DEFINER');
select is((select 'search_path=""'=any(coalesce(proconfig,'{}'::text[])) from pg_proc where oid='public.assign_moderation_case(uuid,uuid)'::regprocedure), true, 'assign_moderation_case has empty search_path');
select is((select prosecdef from pg_proc where oid='public.is_user_restricted(uuid)'::regprocedure), true, 'restriction helper is SECURITY DEFINER');
select is((select 'search_path=""'=any(coalesce(proconfig,'{}'::text[])) from pg_proc where oid='public.is_user_restricted(uuid)'::regprocedure), true, 'restriction helper has empty search_path');
select is(has_function_privilege('anon'::name,'public.is_user_restricted(uuid)'::text,'EXECUTE'), false, 'restriction helper is not executable by anon');
select is((select prosecdef from pg_proc where oid='public.can_message_user(uuid)'::regprocedure), true, 'message authorization is SECURITY DEFINER');
select is((select 'search_path=""'=any(coalesce(proconfig,'{}'::text[])) from pg_proc where oid='public.can_message_user(uuid)'::regprocedure), true, 'message authorization has empty search_path');
select is(has_function_privilege('anon'::name,'public.can_message_user(uuid)'::text,'EXECUTE'), false, 'message authorization is not executable by anon');
select is((select prosecdef from pg_proc where oid='public.review_moderation_appeal(uuid,public.appeal_status,text)'::regprocedure), true, 'appeal review is SECURITY DEFINER');

select * from finish();
rollback;
