-- Hi!Book 2.0 — inactive account lifecycle
-- Adds inactivity pause, hidden deletion-pending state, and a 30-day recovery window.
-- Permanent account/data purge is performed by the trusted purge worker, not by this scheduler.

begin;

alter table public.users
  add column if not exists lifecycle_state text not null default 'ACTIVE',
  add column if not exists paused_at timestamptz,
  add column if not exists deletion_scheduled_at timestamptz,
  add column if not exists deletion_recovery_deadline_at timestamptz;

alter table public.users
  drop constraint if exists users_lifecycle_state_check;
alter table public.users
  add constraint users_lifecycle_state_check
  check (lifecycle_state in ('ACTIVE', 'PAUSED', 'PENDING_DELETION', 'DELETED'));

alter table public.account_deletion_request
  add column if not exists lifecycle_source text not null default 'MANUAL';

alter table public.account_deletion_request
  drop constraint if exists account_deletion_request_lifecycle_source_check;
alter table public.account_deletion_request
  add constraint account_deletion_request_lifecycle_source_check
  check (lifecycle_source in ('MANUAL', 'INACTIVITY'));

create index if not exists users_inactive_lifecycle_due_idx
  on public.users (paused_at)
  where lifecycle_state = 'PAUSED';

create index if not exists users_pending_deletion_deadline_idx
  on public.users (deletion_recovery_deadline_at)
  where lifecycle_state = 'PENDING_DELETION';

create or replace function public.prevent_client_account_status_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is not null
     and auth.role() = 'authenticated'
     and coalesce(current_setting('hibook.system_operation', true), 'false') <> 'true' then
    if new.account_status is distinct from old.account_status
       or new.deleted_at is distinct from old.deleted_at
       or new.lifecycle_state is distinct from old.lifecycle_state
       or new.paused_at is distinct from old.paused_at
       or new.deletion_scheduled_at is distinct from old.deletion_scheduled_at
       or new.deletion_recovery_deadline_at is distinct from old.deletion_recovery_deadline_at then
      raise exception 'Account lifecycle state is server-controlled' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.process_inactive_account_lifecycle()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_processed integer := 0;
  v_count integer := 0;
begin
  if not (
    coalesce(auth.role(), '') in ('service_role', 'supabase_admin')
    or current_user in ('postgres', 'supabase_admin')
  ) then
    raise exception 'Trusted server role required' using errcode = '42501';
  end if;

  perform set_config('hibook.system_operation', 'true', true);

  -- Pause accounts after 180 days without a successful Supabase Auth login.
  -- created_at is the fallback for accounts that have never logged in.
  with stale_accounts as (
    update public.users u
       set lifecycle_state = 'PAUSED',
           paused_at = now(),
           updated_at = now()
      from auth.users au
     where au.id = u.id
       and u.account_status = 'ACTIVE'
       and u.lifecycle_state = 'ACTIVE'
       and coalesce(au.last_sign_in_at, au.created_at) <= now() - interval '180 days'
    returning u.id
  )
  select count(*) into v_count from stale_accounts;
  v_processed := v_processed + v_count;

  -- After 90 days paused, hide the account and open a 30-day recovery window.
  with pending_deletion as (
    update public.users u
       set lifecycle_state = 'PENDING_DELETION',
           account_status = 'DEACTIVATED',
           deletion_scheduled_at = now(),
           deletion_recovery_deadline_at = now() + interval '30 days',
           updated_at = now()
     where u.account_status = 'ACTIVE'
       and u.lifecycle_state = 'PAUSED'
       and u.paused_at <= now() - interval '90 days'
    returning u.id, u.deletion_scheduled_at, u.deletion_recovery_deadline_at
  ), requests as (
    insert into public.account_deletion_request (
      user_id, status, requested_at, scheduled_for, lifecycle_source
    )
    select id, 'SCHEDULED', deletion_scheduled_at, deletion_recovery_deadline_at, 'INACTIVITY'
      from pending_deletion
    returning user_id
  )
  select count(*) into v_count from requests;
  v_processed := v_processed + v_count;

  return v_processed;
end;
$$;

revoke all on function public.process_inactive_account_lifecycle() from public, anon, authenticated;
grant execute on function public.process_inactive_account_lifecycle() to service_role;

create or replace function public.recover_inactive_account()
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_state text;
  v_deadline timestamptz;
  v_required_login_at timestamptz;
  v_last_sign_in_at timestamptz;
begin
  if v_user_id is null or coalesce(auth.role(), '') <> 'authenticated' then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select lifecycle_state, deletion_recovery_deadline_at,
         case
           when lifecycle_state = 'PAUSED' then paused_at
           when lifecycle_state = 'PENDING_DELETION' then deletion_scheduled_at
           else null
         end
    into v_state, v_deadline, v_required_login_at
    from public.users
   where id = v_user_id
   for update;

  if not found then
    raise exception 'Account not found';
  end if;

  select last_sign_in_at
    into v_last_sign_in_at
    from auth.users
   where id = v_user_id;

  if v_state in ('PAUSED', 'PENDING_DELETION')
     and (v_last_sign_in_at is null or v_required_login_at is null or v_last_sign_in_at < v_required_login_at) then
    raise exception 'Fresh sign-in required to recover this account' using errcode = '42501';
  end if;

  if v_state = 'PAUSED' then
    perform set_config('hibook.system_operation', 'true', true);
    update public.users
       set lifecycle_state = 'ACTIVE',
           paused_at = null,
           updated_at = now()
     where id = v_user_id;
    return 'ACTIVE';
  end if;

  if v_state = 'PENDING_DELETION' and v_deadline is not null and now() < v_deadline then
    perform set_config('hibook.system_operation', 'true', true);

    update public.account_deletion_request
       set status = 'CANCELLED',
           cancelled_at = now(),
           updated_at = now()
     where user_id = v_user_id
       and lifecycle_source = 'INACTIVITY'
       and status = 'SCHEDULED';

    update public.users
       set lifecycle_state = 'ACTIVE',
           account_status = 'ACTIVE',
           paused_at = null,
           deletion_scheduled_at = null,
           deletion_recovery_deadline_at = null,
           deleted_at = null,
           updated_at = now()
     where id = v_user_id;

    return 'ACTIVE';
  end if;

  if v_state = 'PENDING_DELETION' then
    raise exception 'The recovery window has expired';
  end if;

  if v_state = 'DELETED' then
    raise exception 'This account has been permanently deleted';
  end if;

  return 'ACTIVE';
end;
$$;

revoke all on function public.recover_inactive_account() from public, anon;
grant execute on function public.recover_inactive_account() to authenticated;

-- Paused users remain visible but cannot create or mutate social activity.
create or replace function public.prevent_paused_account_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_record jsonb;
  v_actor_id uuid;
  v_lifecycle_state text;
begin
  if auth.uid() is null
     or coalesce(current_setting('hibook.system_operation', true), 'false') = 'true' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  v_record := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_actor_id := case tg_table_name
    when 'users' then nullif(v_record ->> 'id', '')::uuid
    when 'follows' then nullif(v_record ->> 'follower_id', '')::uuid
    when 'blocks' then nullif(v_record ->> 'blocker_id', '')::uuid
    when 'messages' then nullif(v_record ->> 'sender_id', '')::uuid
    when 'notifications' then nullif(v_record ->> 'actor_id', '')::uuid
    else nullif(v_record ->> 'user_id', '')::uuid
  end;

  if tg_table_name = 'post_media' then
    select p.user_id into v_actor_id
      from public.posts p
     where p.id = nullif(v_record ->> 'post_id', '')::uuid;
  elsif tg_table_name = 'mentions' then
    if nullif(v_record ->> 'post_id', '') is not null then
      select p.user_id into v_actor_id
        from public.posts p
       where p.id = nullif(v_record ->> 'post_id', '')::uuid;
    elsif nullif(v_record ->> 'comment_id', '') is not null then
      select c.user_id into v_actor_id
        from public.comments c
       where c.id = nullif(v_record ->> 'comment_id', '')::uuid;
    end if;
  elsif tg_table_name = 'post_tags' then
    select p.user_id into v_actor_id
      from public.posts p
     where p.id = nullif(v_record ->> 'post_id', '')::uuid;
  elsif tg_table_name = 'message_media' then
    select m.sender_id into v_actor_id
      from public.messages m
     where m.id = nullif(v_record ->> 'message_id', '')::uuid;
  end if;

  if v_actor_id is null or v_actor_id <> auth.uid() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  select lifecycle_state into v_lifecycle_state
    from public.users
   where id = v_actor_id;

  if v_lifecycle_state in ('PAUSED', 'PENDING_DELETION', 'DELETED') then
    raise exception 'This account is paused and cannot perform this action until it is reactivated'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.prevent_paused_account_mutation() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'users','profiles','user_privacy_settings','user_preferences',
    'notification_preferences','discovery_preferences','discovery_country_preference',
    'discovery_country_preferences','user_interest','user_language',
    'follows','blocks','posts','post_media','post_likes','comments','comment_likes',
    'post_shares','mentions','post_tags','messages','message_media',
    'conversation_participants','notifications'
  ] loop
    execute format('drop trigger if exists enforce_paused_account_mutation on public.%I', t);
    execute format(
      'create trigger enforce_paused_account_mutation before insert or update or delete on public.%I for each row execute function public.prevent_paused_account_mutation()',
      t
    );
  end loop;
end;
$$;

do $$
begin
  perform cron.unschedule(jobid)
    from cron.job
   where jobname = 'hibook-inactive-account-lifecycle';

  perform cron.schedule(
    'hibook-inactive-account-lifecycle',
    '*/15 * * * *',
    'select public.process_inactive_account_lifecycle();'
  );
end;
$$;


-- Storage RLS must enforce the same read-only pause state as database writes.
-- Service-role purge operations bypass these client-facing policies.
drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.users u where u.id = auth.uid() and u.lifecycle_state = 'ACTIVE' and u.account_status = 'ACTIVE')
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.users u where u.id = auth.uid() and u.lifecycle_state = 'ACTIVE' and u.account_status = 'ACTIVE')
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.users u where u.id = auth.uid() and u.lifecycle_state = 'ACTIVE' and u.account_status = 'ACTIVE')
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.users u where u.id = auth.uid() and u.lifecycle_state = 'ACTIVE' and u.account_status = 'ACTIVE')
  );

drop policy if exists messages_insert_own on storage.objects;
create policy messages_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'messages'
    and (storage.foldername(name))[1] = auth.uid()::text
    and array_length(storage.foldername(name), 1) >= 4
    and ((storage.foldername(name))[2])::uuid is not null
    and ((storage.foldername(name))[3])::uuid is not null
    and ((storage.foldername(name))[4])::uuid is not null
    and exists (select 1 from public.users u where u.id = auth.uid() and u.lifecycle_state = 'ACTIVE' and u.account_status = 'ACTIVE')
  );

drop policy if exists messages_update_own on storage.objects;
create policy messages_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'messages'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.users u where u.id = auth.uid() and u.lifecycle_state = 'ACTIVE' and u.account_status = 'ACTIVE')
  )
  with check (
    bucket_id = 'messages'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.users u where u.id = auth.uid() and u.lifecycle_state = 'ACTIVE' and u.account_status = 'ACTIVE')
  );

drop policy if exists messages_delete_own on storage.objects;
create policy messages_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'messages'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.users u where u.id = auth.uid() and u.lifecycle_state = 'ACTIVE' and u.account_status = 'ACTIVE')
  );

drop policy if exists posts_insert_own on storage.objects;
create policy posts_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = 'posts'
    and (storage.foldername(name))[2] = auth.uid()::text
    and array_length(storage.foldername(name), 1) >= 3
    and ((storage.foldername(name))[3])::uuid is not null
    and storage.filename(name) ~ '^[0-9a-fA-F-]{36}[.]webp$'
    and split_part(storage.filename(name), '.', 1)::uuid is not null
    and exists (select 1 from public.users u where u.id = auth.uid() and u.lifecycle_state = 'ACTIVE' and u.account_status = 'ACTIVE')
  );

drop policy if exists posts_update_own on storage.objects;
create policy posts_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = 'posts'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (select 1 from public.users u where u.id = auth.uid() and u.lifecycle_state = 'ACTIVE' and u.account_status = 'ACTIVE')
  )
  with check (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = 'posts'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (select 1 from public.users u where u.id = auth.uid() and u.lifecycle_state = 'ACTIVE' and u.account_status = 'ACTIVE')
  );

drop policy if exists posts_delete_own on storage.objects;
create policy posts_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = 'posts'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (select 1 from public.users u where u.id = auth.uid() and u.lifecycle_state = 'ACTIVE' and u.account_status = 'ACTIVE')
  );

commit;
