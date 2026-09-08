begin;

-- Harden the remaining moderation restriction helper to the project's
-- SECURITY DEFINER search_path contract.
create or replace function public.is_user_restricted(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.moderation_actions ma
    where ma.target_type = 'USER'
      and ma.target_id = target_user_id
      and ma.action_type = 'USER_RESTRICTED'
      and ma.revoked_at is null
      and ma.starts_at <= now()
      and (ma.expires_at is null or ma.expires_at > now())
  );
$$;

revoke all on function public.is_user_restricted(uuid) from public, anon;
grant execute on function public.is_user_restricted(uuid) to authenticated;

-- Moderator-only appeal queue. The RPC exposes only fields needed for review.
create or replace function public.get_moderation_appeal_queue(page_limit integer default 50)
returns table (
  appeal_id uuid,
  case_id uuid,
  case_number varchar,
  action_id uuid,
  appellant_id uuid,
  target_type public.moderation_target_type,
  target_id uuid,
  action_type public.moderation_action_type,
  action_reason text,
  reason text,
  status public.appeal_status,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin_permission('moderation.appeals.review') then
    raise exception 'Appeal queue access denied';
  end if;

  if page_limit < 1 or page_limit > 100 then
    raise exception 'Page limit must be between 1 and 100';
  end if;

  return query
  select
    a.id,
    mc.id,
    mc.case_number,
    ma.id,
    a.appellant_id,
    ma.target_type,
    ma.target_id,
    ma.action_type,
    ma.reason,
    a.reason,
    a.status,
    a.submitted_at
  from public.appeals a
  join public.moderation_actions ma on ma.id = a.action_id
  left join public.moderation_cases mc on mc.id = ma.case_id
  where a.status in ('SUBMITTED','IN_REVIEW')
  order by
    case ma.severity when 'CRITICAL' then 0 when 'HIGH' then 1 when 'MEDIUM' then 2 else 3 end,
    a.submitted_at asc
  limit page_limit;
end;
$$;

revoke all on function public.get_moderation_appeal_queue(integer) from public, anon;
grant execute on function public.get_moderation_appeal_queue(integer) to authenticated;

-- Moderator-only appeal detail. Do not return unrelated private account data.
create or replace function public.get_moderation_appeal(target_appeal_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_admin_permission('moderation.appeals.review') then
    raise exception 'Appeal access denied';
  end if;

  select jsonb_build_object(
    'appeal_id', a.id,
    'case_id', mc.id,
    'case_number', mc.case_number,
    'action_id', ma.id,
    'appellant_id', a.appellant_id,
    'target_type', ma.target_type,
    'target_id', ma.target_id,
    'action_type', ma.action_type,
    'action_reason', ma.reason,
    'appeal_reason', a.reason,
    'status', a.status,
    'created_at', a.submitted_at,
    'reviewed_by', a.reviewed_by,
    'resolved_at', a.resolved_at,
    'resolution', a.resolution
  )
  into v_result
  from public.appeals a
  join public.moderation_actions ma on ma.id = a.action_id
  left join public.moderation_cases mc on mc.id = ma.case_id
  where a.id = target_appeal_id;

  if v_result is null then
    raise exception 'Appeal not found';
  end if;

  return v_result;
end;
$$;

revoke all on function public.get_moderation_appeal(uuid) from public, anon;
grant execute on function public.get_moderation_appeal(uuid) to authenticated;

commit;
