begin;

select plan(4);

select is(has_function_privilege('authenticated'::name, 'public.get_comment_like_states(uuid[])'::text, 'EXECUTE'), true, 'authenticated can execute batch comment-like state RPC');
select is(has_function_privilege('anon'::name, 'public.get_comment_like_states(uuid[])'::text, 'EXECUTE'), false, 'anon cannot execute batch comment-like state RPC');
select is((select prosecdef from pg_proc where oid='public.get_comment_like_states(uuid[])'::regprocedure), true, 'batch comment-like state RPC is SECURITY DEFINER');
select is((select proconfig from pg_proc where oid='public.get_comment_like_states(uuid[])'::regprocedure), array['search_path=""']::text[], 'batch comment-like state RPC pins empty search_path');

select * from finish();
rollback;
