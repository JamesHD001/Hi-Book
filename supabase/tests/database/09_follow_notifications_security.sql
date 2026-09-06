begin;

select plan(5);

select ok(exists (
  select 1 from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  where c.relname = 'follows'
    and t.tgname = 'follows_create_notification'
    and not t.tgisinternal
), 'follow notification trigger exists');

select ok((select prosecdef
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_follow_notification'
  limit 1), 'follow notification function is SECURITY DEFINER');

select ok((select 'search_path=""' = any(coalesce(p.proconfig, '{}'::text[]))
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_follow_notification'
  limit 1), 'follow notification function has an empty controlled search_path');

select is((select has_function_privilege('public', p.oid, 'EXECUTE')
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_follow_notification'
  limit 1), false, 'follow notification function is not executable by PUBLIC');

select is((select has_function_privilege('authenticated', p.oid, 'EXECUTE')
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_follow_notification'
  limit 1), false, 'follow notification function is not directly executable by authenticated');

select * from finish();
rollback;
