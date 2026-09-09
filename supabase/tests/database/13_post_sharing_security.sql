begin;

select plan(11);

select has_function_privilege('authenticated', 'public.share_post(uuid)', 'execute');
select is(has_function_privilege('anon', 'public.share_post(uuid)', 'execute'), false);
select is(has_function_privilege('public', 'public.share_post(uuid)', 'execute'), false);
select has_function_privilege('authenticated', 'public.share_post_to_conversation(uuid,uuid)', 'execute');
select is(has_function_privilege('anon', 'public.share_post_to_conversation(uuid,uuid)', 'execute'), false);
select is(has_function_privilege('public', 'public.share_post_to_conversation(uuid,uuid)', 'execute'), false);
select is((select prosecdef from pg_proc where oid = 'public.share_post(uuid)'::regprocedure), true, 'share_post is SECURITY DEFINER');
select is((select prosecdef from pg_proc where oid = 'public.share_post_to_conversation(uuid,uuid)'::regprocedure), true, 'share_post_to_conversation is SECURITY DEFINER');
select is((select proconfig from pg_proc where oid = 'public.share_post(uuid)'::regprocedure), array['search_path=""']::text[], 'share_post uses an empty search_path');
select is((select proconfig from pg_proc where oid = 'public.share_post_to_conversation(uuid,uuid)'::regprocedure), array['search_path=""']::text[], 'share_post_to_conversation uses an empty search_path');
select is(has_table_privilege('authenticated', 'public.post_shares', 'insert'), false, 'authenticated cannot insert post shares directly');

select * from finish();
rollback;
