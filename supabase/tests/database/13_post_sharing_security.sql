begin;

select plan(11);

select is(has_function_privilege('authenticated'::name, 'public.share_post(uuid)'::text, 'EXECUTE'), true, 'authenticated can execute share_post');
select is(has_function_privilege('anon'::name, 'public.share_post(uuid)'::text, 'EXECUTE'), false, 'anon cannot execute share_post');
select is(has_function_privilege('authenticated'::name, 'public.share_post_to_conversation(uuid,uuid)'::text, 'EXECUTE'), true, 'authenticated can execute share_post_to_conversation');
select is(has_function_privilege('anon'::name, 'public.share_post_to_conversation(uuid,uuid)'::text, 'EXECUTE'), false, 'anon cannot execute share_post_to_conversation');
select is((select prosecdef from pg_proc where oid = 'public.share_post(uuid)'::regprocedure), true, 'share_post is SECURITY DEFINER');
select is((select prosecdef from pg_proc where oid = 'public.share_post_to_conversation(uuid,uuid)'::regprocedure), true, 'share_post_to_conversation is SECURITY DEFINER');
select is((select proconfig from pg_proc where oid = 'public.share_post(uuid)'::regprocedure), array['search_path=""']::text[], 'share_post uses an empty search_path');
select is((select proconfig from pg_proc where oid = 'public.share_post_to_conversation(uuid,uuid)'::regprocedure), array['search_path=""']::text[], 'share_post_to_conversation uses an empty search_path');
select is(has_table_privilege('authenticated', 'public.post_shares', 'insert'), false, 'authenticated cannot insert post shares directly');
select is(has_table_privilege('anon', 'public.post_shares', 'insert'), false, 'anon cannot insert post shares directly');
select ok((select relrowsecurity from pg_class where oid = 'public.post_shares'::regclass), 'post shares remain protected by RLS');

select * from finish();
rollback;
