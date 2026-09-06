begin;

select plan(11);

select ok(exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_comment'
), 'create_comment RPC exists');

select ok((select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_comment' limit 1), 'create_comment is SECURITY DEFINER');

select ok((select 'search_path=""' = any(coalesce(p.proconfig, '{}'::text[]))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_comment' limit 1), 'create_comment has an empty controlled search_path');

select is((select has_function_privilege('public', p.oid, 'EXECUTE')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_comment' limit 1), false, 'create_comment is not executable by PUBLIC');

select ok((select has_function_privilege('authenticated', p.oid, 'EXECUTE')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_comment' limit 1), 'authenticated can execute create_comment');

select is((select pg_get_function_result(p.oid)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_comment' limit 1),
  'TABLE(comment_id uuid, user_id uuid, parent_comment_id uuid, content text, created_at timestamp with time zone)',
  'create_comment exposes only comment creation fields');

select ok(exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'toggle_comment_like'
), 'toggle_comment_like RPC exists');

select ok((select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'toggle_comment_like' limit 1), 'toggle_comment_like is SECURITY DEFINER');

select is((select has_function_privilege('anon', p.oid, 'EXECUTE')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'toggle_comment_like' limit 1), false, 'toggle_comment_like is not executable by anon');

select ok(exists (
  select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
  where c.relname = 'comments' and t.tgname = 'comments_validate_parent'
), 'comment parent integrity trigger exists');

select ok(exists (
  select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
  where c.relname = 'comments' and t.tgname = 'comments_create_notification'
), 'comment notification trigger exists');

select * from finish();
rollback;
