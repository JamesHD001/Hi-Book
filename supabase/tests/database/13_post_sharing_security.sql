begin;

select plan(11);

select has_function_privilege(
  'public.share_post(uuid)',
  'execute',
  'authenticated'
);

select has_function_privilege(
  'public.share_post(uuid)',
  'execute',
  'anon'
) is false;

select has_function_privilege(
  'public.share_post(uuid)',
  'execute',
  'public'
) is false;

select has_function_privilege(
  'public.share_post_to_conversation(uuid,uuid)',
  'execute',
  'authenticated'
);

select has_function_privilege(
  'public.share_post_to_conversation(uuid,uuid)',
  'execute',
  'anon'
) is false;

select has_function_privilege(
  'public.share_post_to_conversation(uuid,uuid)',
  'execute',
  'public'
) is false;

select is(
  (select prosecdef from pg_proc where oid = 'public.share_post(uuid)'::regprocedure),
  true,
  'share_post is SECURITY DEFINER'
);

select is(
  (select prosecdef from pg_proc where oid = 'public.share_post_to_conversation(uuid,uuid)'::regprocedure),
  true,
  'share_post_to_conversation is SECURITY DEFINER'
);

select is(
  (select proconfig from pg_proc where oid = 'public.share_post(uuid)'::regprocedure),
  array['search_path=""']::text[],
  'share_post uses an empty search_path'
);

select is(
  (select proconfig from pg_proc where oid = 'public.share_post_to_conversation(uuid,uuid)'::regprocedure),
  array['search_path=""']::text[],
  'share_post_to_conversation uses an empty search_path'
);

select has_table_privilege(
  'authenticated',
  'public.post_shares',
  'insert'
) is false;

select * from finish();
rollback;
