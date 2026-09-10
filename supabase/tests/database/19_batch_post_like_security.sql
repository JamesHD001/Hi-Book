begin;

select plan(5);

select is(has_function_privilege('authenticated'::name, 'public.get_post_like_states(uuid[])'::text, 'EXECUTE'), true, 'authenticated can execute batch post-like state RPC');
select is(has_function_privilege('anon'::name, 'public.get_post_like_states(uuid[])'::text, 'EXECUTE'), false, 'anon cannot execute batch post-like state RPC');
select is((select prosecdef from pg_proc where oid='public.get_post_like_states(uuid[])'::regprocedure), true, 'batch post-like state RPC is SECURITY DEFINER');
select is((select proconfig from pg_proc where oid='public.get_post_like_states(uuid[])'::regprocedure), array['search_path=""']::text[], 'batch post-like state RPC pins empty search_path');
select ok((select pronargs from pg_proc where oid='public.get_post_like_states(uuid[])'::regprocedure) = 1, 'batch post-like state RPC accepts one array argument');

select * from finish();
rollback;
