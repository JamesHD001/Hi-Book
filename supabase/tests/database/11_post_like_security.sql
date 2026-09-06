begin;

select plan(8);

select ok(exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'toggle_post_like'
), 'toggle_post_like RPC exists');

select ok((select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'toggle_post_like' limit 1), 'toggle_post_like is SECURITY DEFINER');

select ok((select 'search_path=""' = any(coalesce(p.proconfig, '{}'::text[])) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'toggle_post_like' limit 1), 'toggle_post_like has an empty controlled search_path');

select is((select has_function_privilege('public', p.oid, 'EXECUTE') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'toggle_post_like' limit 1), false, 'toggle_post_like is not executable by PUBLIC');

select is((select has_function_privilege('anon', p.oid, 'EXECUTE') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'toggle_post_like' limit 1), false, 'toggle_post_like is not executable by anon');

select ok((select has_function_privilege('authenticated', p.oid, 'EXECUTE') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'toggle_post_like' limit 1), 'authenticated can execute toggle_post_like');

select ok(exists (select 1 from pg_constraint c join pg_class r on r.oid = c.conrelid join pg_namespace n on n.oid = r.relnamespace where n.nspname = 'public' and r.relname = 'post_likes' and c.contype = 'u' and pg_get_constraintdef(c.oid) like '%post_id%user_id%'), 'post_likes enforces one active like per user/post');

select is((select pg_get_function_result(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'get_post_like_state' limit 1), 'TABLE(liked boolean, like_count bigint)', 'like state exposes only liked state and count');

select * from finish();
rollback;
