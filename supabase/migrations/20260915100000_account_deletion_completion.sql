-- Hi!Book 2.0 — due account deletion completion
-- Server/worker-only transition from scheduled deletion to DELETED.

begin;

create extension if not exists pg_cron with schema extensions;

create or replace function public.process_due_account_deletions()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_processed integer := 0;
begin
  if coalesce(auth.role(), '') not in ('service_role', 'supabase_admin', 'postgres') then
    raise exception 'Trusted server role required';
  end if;

  perform set_config('hibook.system_operation', 'true', true);

  with due_requests as (
    select adr.id, adr.user_id
    from public.account_deletion_request adr
    where adr.status = 'SCHEDULED'
      and adr.scheduled_for is not null
      and adr.scheduled_for <= now()
    for update skip locked
  ), completed as (
    update public.account_deletion_request adr
       set status = 'COMPLETED',
           completed_at = now(),
           updated_at = now()
      from due_requests due
     where adr.id = due.id
    returning adr.user_id
  )
  update public.users u
     set account_status = 'DELETED',
         deleted_at = coalesce(u.deleted_at, now()),
         updated_at = now()
    from completed c
   where u.id = c.user_id;

  get diagnostics v_processed = row_count;
  return v_processed;
end;
$$;

revoke all on function public.process_due_account_deletions() from public;
grant execute on function public.process_due_account_deletions() to service_role;

do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'hibook-account-deletion-completion';

  perform cron.schedule(
    'hibook-account-deletion-completion',
    '*/15 * * * *',
    'select public.process_due_account_deletions();'
  );
end;
$$;

commit;
