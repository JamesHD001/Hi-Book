-- Hi!Book 2.0 — registration activation must use the server-operation trust boundary
-- The account lifecycle guard intentionally blocks direct client account-status changes.
-- complete_registration is already SECURITY DEFINER and therefore must explicitly
-- mark its controlled status transition as a system operation, just like the
-- account deletion RPCs.

begin;

create or replace function public.complete_registration()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_terms_id uuid;
  v_privacy_id uuid;
  v_email_confirmed timestamptz;
  v_phone_confirmed timestamptz;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select au.email_confirmed_at, au.phone_confirmed_at
    into v_email_confirmed, v_phone_confirmed
  from auth.users au where au.id = v_user_id;

  if v_email_confirmed is null and v_phone_confirmed is null then
    raise exception 'A verified email address or phone number is required';
  end if;

  select ld.id into v_terms_id from public.legal_document ld
  where ld.document_type = 'TERMS_OF_USE' and ld.published_at is not null and ld.published_at <= now()
  order by ld.effective_at desc, ld.created_at desc limit 1;

  select ld.id into v_privacy_id from public.legal_document ld
  where ld.document_type = 'PRIVACY_POLICY' and ld.published_at is not null and ld.published_at <= now()
  order by ld.effective_at desc, ld.created_at desc limit 1;

  if v_terms_id is null or v_privacy_id is null then
    raise exception 'Current legal documents are not configured';
  end if;

  if not exists (select 1 from public.users u where u.id = v_user_id and u.account_status = 'PENDING_VERIFICATION') then
    return exists (select 1 from public.users u where u.id = v_user_id and u.account_status = 'ACTIVE');
  end if;

  insert into public.user_legal_acceptance (user_id, legal_document_id)
  values (v_user_id, v_terms_id), (v_user_id, v_privacy_id);

  perform set_config('hibook.system_operation', 'true', true);
  update public.users
     set account_status = 'ACTIVE',
         updated_at = now()
   where id = v_user_id;

  return true;
end;
$$;

revoke all on function public.complete_registration() from public, anon;
grant execute on function public.complete_registration() to authenticated;

commit;
