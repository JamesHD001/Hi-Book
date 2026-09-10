begin;
select plan(19);

select is((select prosecdef from pg_proc where oid = 'public.is_user_restricted(uuid)'::regprocedure), true, 'restriction helper is SECURITY DEFINER');
select is((select proconfig from pg_proc where oid = 'public.is_user_restricted(uuid)'::regprocedure), array['search_path=""']::text[], 'restriction helper pins empty search_path');
select is(has_function_privilege('authenticated'::name,'public.is_user_restricted(uuid)'::text,'EXECUTE'), true, 'authenticated can execute restriction helper');
select is(has_function_privilege('anon'::name,'public.is_user_restricted(uuid)'::text,'EXECUTE'), false, 'anon cannot execute restriction helper');

select is((select prosecdef from pg_proc where oid = 'public.enforce_user_restriction_on_state_change()'::regprocedure), true, 'state-change guard is SECURITY DEFINER');
select is((select proconfig from pg_proc where oid = 'public.enforce_user_restriction_on_state_change()'::regprocedure), array['search_path=""']::text[], 'state-change guard pins empty search_path');
select is(has_function_privilege('anon'::name,'public.enforce_user_restriction_on_state_change()'::text,'EXECUTE'), false, 'anon cannot execute state-change guard');

select is((select count(*) from pg_trigger where tgname = 'enforce_user_restriction_follow'), 1::bigint, 'follow restriction trigger exists');
select is((select count(*) from pg_trigger where tgname = 'enforce_user_restriction_post'), 1::bigint, 'post restriction trigger exists');
select is((select count(*) from pg_trigger where tgname = 'enforce_user_restriction_post_media'), 1::bigint, 'post media restriction trigger exists');
select is((select count(*) from pg_trigger where tgname = 'enforce_user_restriction_post_like'), 1::bigint, 'post like restriction trigger exists');
select is((select count(*) from pg_trigger where tgname = 'enforce_user_restriction_comment'), 1::bigint, 'comment restriction trigger exists');
select is((select count(*) from pg_trigger where tgname = 'enforce_user_restriction_comment_like'), 1::bigint, 'comment like restriction trigger exists');
select is((select count(*) from pg_trigger where tgname = 'enforce_user_restriction_post_share'), 1::bigint, 'post share restriction trigger exists');
select is((select count(*) from pg_trigger where tgname = 'enforce_user_restriction_mention'), 1::bigint, 'mention restriction trigger exists');
select is((select count(*) from pg_trigger where tgname = 'enforce_user_restriction_post_tag'), 1::bigint, 'post tag restriction trigger exists');
select is((select count(*) from pg_trigger where tgname = 'enforce_user_restriction_message'), 1::bigint, 'message restriction trigger exists');

select is((select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid where t.tgname like 'enforce_user_restriction_%' and c.relname in ('follows','posts','post_media','post_likes','comments','comment_likes','post_shares','mentions','post_tags','messages')), 10::bigint, 'all ten state-changing domains are guarded');

select is((select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid where t.tgname like 'enforce_user_restriction_%' and c.relname in ('blocks','reports','notifications')), 0::bigint, 'safety/reporting and notification tables are not blocked by restriction guard');

select * from finish();
rollback;
