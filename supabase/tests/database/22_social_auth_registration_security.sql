begin;

create extension if not exists pgtap;

select plan(11);

select ok(exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'complete_social_registration'
), 'complete_social_registration RPC exists');
select ok((select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'complete_social_registration'), 'social registration is SECURITY DEFINER');
select ok((select 'search_path=""' = any(coalesce(p.proconfig, '{}'::text[])) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'complete_social_registration'), 'social registration has an empty search_path');
select is((select has_function_privilege('public', p.oid, 'EXECUTE') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'complete_social_registration'), false, 'social registration is not executable by PUBLIC');
select is((select has_function_privilege('anon', p.oid, 'EXECUTE') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'complete_social_registration'), false, 'social registration is not executable by anon');
select ok((select has_function_privilege('authenticated', p.oid, 'EXECUTE') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'complete_social_registration'), 'authenticated can complete social registration');

select is((select attnotnull from pg_attribute where attrelid = 'public.users'::regclass and attname = 'country_code'), true,
  'country remains database-required for every initialized user');
select ok(exists (select 1 from pg_trigger where tgname = 'on_auth_user_created'), 'auth-user bootstrap trigger remains installed');
select ok((select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'handle_auth_user_created'), 'auth-user bootstrap remains SECURITY DEFINER');
select is((select has_function_privilege('public', p.oid, 'EXECUTE') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'handle_auth_user_created'), false, 'auth-user bootstrap is not executable by PUBLIC');
select ok(exists (select 1 from public.legal_document where document_type = 'TERMS_OF_USE' and published_at is not null)
  and exists (select 1 from public.legal_document where document_type = 'PRIVACY_POLICY' and published_at is not null),
  'social registration has current legal documents to record');

select * from finish();
rollback;