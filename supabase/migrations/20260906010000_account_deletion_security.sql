-- Hi!Book 2.0 — account deletion workflow security
-- Locks deletion requests behind server-controlled transitions.

begin;

-- Clients must not mutate lifecycle state directly. Account deletion and
-- moderation workers are responsible for lifecycle transitions.
create or replace function public.prevent_client_account_status_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is not null and auth.role() = 'authenticated' then
    if new.account_status is distinct from old.account_status then
      raise exception 'Account status is server-controlled';
    end if;
    if new.deleted_at is distinct from old.deleted_at then
      raise exception 'Account deletion timestamp is server-controlled';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_client_account_status_mutation on public.users;
create trigger trg_prevent_client_account_status_mutation
before update on public.users
for each row execute function public.prevent_client_account_status_mutation();

-- Direct client writes to deletion requests are disabled. The application
-- must use these SECURITY DEFINER RPCs after performing reauthentication.
drop policy if exists deletion_self_insert on public.account_deletion_request;
drop policy if exists deletion_self_update on public.account_deletion_request;

create or replace function public.request_account_deletion()
returns public.account_deletion_request
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.account_deletion_request%rowtype;
begin
  if v_user_id is null or auth.role() <> 'authenticated' then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.users
    where id = v_user_id
      and account_status = 'ACTIVE'
  ) then
    raise exception 'Only active accounts can request deletion';
  end if;

  if exists (
    select 1 from public.account_deletion_request
    where user_id = v_user_id
      and status in ('REQUESTED','SCHEDULED')
  ) then
    raise exception 'An active deletion request already exists';
  end if;

  insert into public.account_deletion_request(
    user_id, status, requested_at, scheduled_for
  ) values (
    v_user_id, 'SCHEDULED', now(), now() + interval '30 days'
  )
  returning * into v_request;

  update public.users
     set account_status = 'DEACTIVATED',
         updated_at = now()
   where id = v_user_id;

  return v_request;
end;
$$;

create or replace function public.cancel_account_deletion()
returns public.account_deletion_request
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.account_deletion_request%rowtype;
begin
  if v_user_id is null or auth.role() <> 'authenticated' then
    raise exception 'Authentication required';
  end if;

  select * into v_request
    from public.account_deletion_request
   where user_id = v_user_id
     and status = 'SCHEDULED'
   order by requested_at desc
   limit 1;

  if not found then
    raise exception 'No scheduled deletion request exists';
  end if;

  update public.account_deletion_request
     set status = 'CANCELLED',
         cancelled_at = now(),
         updated_at = now()
   where id = v_request.id
  returning * into v_request;

  update public.users
     set account_status = 'ACTIVE',
         deleted_at = null,
         updated_at = now()
   where id = v_user_id
     and account_status = 'DEACTIVATED';

  return v_request;
end;
$$;

revoke all on function public.request_account_deletion() from public;
grant execute on function public.request_account_deletion() to authenticated;

revoke all on function public.cancel_account_deletion() from public;
grant execute on function public.cancel_account_deletion() to authenticated;

-- The request row remains private/read-only to its owner. Server/worker code
-- owns creation, scheduling, cancellation and completion transitions.
create policy deletion_self_select on public.account_deletion_request
for select using (user_id = auth.uid());

commit;
