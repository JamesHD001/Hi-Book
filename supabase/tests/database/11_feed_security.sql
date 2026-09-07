begin;

select plan(7);

select ok(exists (
  select 1 from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_post_feed'
), 'get_post_feed RPC exists');

select ok((select prosecdef
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_post_feed'
  limit 1), 'get_post_feed is SECURITY DEFINER');

select ok((select 'search_path=""' = any(coalesce(p.proconfig, '{}'::text[]))
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_post_feed'
  limit 1), 'get_post_feed has an empty controlled search_path');

select is((select has_function_privilege('public', p.oid, 'EXECUTE')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_post_feed'
  limit 1), false, 'get_post_feed is not executable by PUBLIC');

select is((select has_function_privilege('anon', p.oid, 'EXECUTE')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_post_feed'
  limit 1), false, 'get_post_feed is not executable by anon');

select ok((select has_function_privilege('authenticated', p.oid, 'EXECUTE')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_post_feed'
  limit 1), 'authenticated can execute get_post_feed');

select is((select pg_get_function_result(p.oid)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_post_feed'
  limit 1), 'TABLE(post_id uuid, author_id uuid, username character varying, display_name character varying, avatar_path text, content text, visibility post_visibility, created_at timestamp with time zone, published_at timestamp with time zone, media jsonb)', 'get_post_feed exposes only feed-safe fields');

select * from finish();
rollback;
