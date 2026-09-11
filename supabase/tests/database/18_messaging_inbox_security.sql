begin;
select plan(6);

select is(
  has_function_privilege('authenticated'::name, 'public.get_message_inbox()'::text, 'EXECUTE'),
  true,
  'authenticated can execute get_message_inbox'
);
select is(
  has_function_privilege('anon'::name, 'public.get_message_inbox()'::text, 'EXECUTE'),
  false,
  'anon cannot execute get_message_inbox'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.get_message_inbox()'::regprocedure),
  true,
  'get_message_inbox is SECURITY DEFINER'
);
select is(
  (select proconfig from pg_proc where oid = 'public.get_message_inbox()'::regprocedure),
  array['search_path=""']::text[],
  'get_message_inbox uses an empty search_path'
);
select is(
  (select pronargs::integer from pg_proc where oid = 'public.get_message_inbox()'::regprocedure),
  0,
  'get_message_inbox accepts no client-controlled identifiers'
);
select is(
  (select prorettype = 'record'::regtype from pg_proc where oid = 'public.get_message_inbox()'::regprocedure),
  true,
  'get_message_inbox returns a protected row shape'
);

select * from finish();
rollback;
