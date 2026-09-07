begin;

-- Safety foundation: turn each accepted user report into a server-owned
-- moderation case and expose only an authorization-checked moderator queue.

create or replace function public.create_moderation_case_from_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_case_id uuid;
  v_case_number text;
  v_priority public.moderation_priority := 'NORMAL';
begin
  if new.target_type = 'USER' and new.reason in ('CHILD_SAFETY','THREATS_OR_VIOLENCE','SELF_HARM') then
    v_priority := 'CRITICAL';
  elsif new.reason in ('HATE_OR_DISCRIMINATION','SEXUAL_CONTENT','ILLEGAL_CONTENT','SCAM_OR_FRAUD') then
    v_priority := 'HIGH';
  elsif new.reason in ('HARASSMENT','PRIVACY_VIOLATION','IMPERSONATION') then
    v_priority := 'NORMAL';
  else
    v_priority := 'LOW';
  end if;

  v_case_id := gen_random_uuid();
  v_case_number := 'MOD-' || upper(substr(replace(v_case_id::text, '-', ''), 1, 12));

  insert into public.moderation_cases (
    id,
    case_number,
    target_type,
    target_id,
    source_type,
    priority,
    status
  ) values (
    v_case_id,
    v_case_number,
    new.target_type::text::public.moderation_target_type,
    new.target_id,
    'USER_REPORT',
    v_priority,
    'OPEN'
  );

  insert into public.moderation_evidence (
    case_id,
    evidence_type,
    source_type,
    source_id,
    metadata,
    captured_at
  ) values (
    v_case_id,
    'REPORT_DESCRIPTION',
    'REPORT',
    new.id,
    jsonb_build_object(
      'reason', new.reason::text,
      'description', new.description
    ),
    new.created_at
  );

  return new;
end;
$$;

drop trigger if exists trg_create_moderation_case_from_report on public.reports;
create trigger trg_create_moderation_case_from_report
after insert on public.reports
for each row execute function public.create_moderation_case_from_report();

revoke all on function public.create_moderation_case_from_report() from public, anon, authenticated;

create or replace function public.get_moderation_queue(
  case_status_filter public.moderation_case_status default null,
  priority_filter public.moderation_priority default null,
  page_limit integer default 50
)
returns table (
  case_id uuid,
  case_number varchar,
  target_type public.moderation_target_type,
  target_id uuid,
  source_type public.moderation_source_type,
  priority public.moderation_priority,
  status public.moderation_case_status,
  assigned_to uuid,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin_permission('moderation.cases.view') then
    raise exception 'Moderation queue access denied';
  end if;

  page_limit := greatest(1, least(coalesce(page_limit, 50), 100));

  return query
  select
    mc.id,
    mc.case_number,
    mc.target_type,
    mc.target_id,
    mc.source_type,
    mc.priority,
    mc.status,
    mc.assigned_to,
    mc.created_at,
    mc.updated_at,
    mc.resolved_at,
    mc.closed_at
  from public.moderation_cases mc
  where (case_status_filter is null or mc.status = case_status_filter)
    and (priority_filter is null or mc.priority = priority_filter)
  order by
    case mc.priority
      when 'CRITICAL' then 1
      when 'HIGH' then 2
      when 'NORMAL' then 3
      else 4
    end,
    mc.created_at asc
  limit page_limit;
end;
$$;

revoke all on function public.get_moderation_queue(public.moderation_case_status, public.moderation_priority, integer) from public, anon;
grant execute on function public.get_moderation_queue(public.moderation_case_status, public.moderation_priority, integer) to authenticated;

create or replace function public.assign_moderation_case(
  target_case_id uuid,
  assignee_id uuid default null
)
returns public.moderation_cases
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignee uuid := coalesce(assignee_id, auth.uid());
  v_case public.moderation_cases;
begin
  if auth.uid() is null or not public.is_admin_permission('moderation.cases.assign') then
    raise exception 'Moderation case assignment denied';
  end if;

  if v_assignee is null then
    raise exception 'Assignee is required';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_assignee
      and u.account_status = 'ACTIVE'
  ) then
    raise exception 'Assignee must be an active user';
  end if;

  if not exists (
    select 1
    from public.admin_user_roles aur
    join public.admin_roles ar on ar.id = aur.role_id
    join public.admin_role_permissions arp on arp.role_id = ar.id
    join public.admin_permissions ap on ap.id = arp.permission_id
    where aur.user_id = v_assignee
      and aur.revoked_at is null
      and ap.permission_key = 'moderation.cases.view'
  ) then
    raise exception 'Assignee does not have moderation access';
  end if;

  update public.moderation_cases
     set assigned_to = v_assignee,
         status = case when status = 'OPEN' then 'IN_REVIEW' else status end,
         updated_at = now()
   where id = target_case_id
   returning * into v_case;

  if not found then
    raise exception 'Moderation case not found';
  end if;

  insert into public.moderation_audit_logs (
    actor_id,
    action_type,
    target_type,
    target_id,
    case_id,
    metadata
  ) values (
    auth.uid(),
    'CASE_ASSIGNED',
    'MODERATION_CASE',
    target_case_id,
    target_case_id,
    jsonb_build_object('assigned_to', v_assignee)
  );

  return v_case;
end;
$$;

revoke all on function public.assign_moderation_case(uuid, uuid) from public, anon;
grant execute on function public.assign_moderation_case(uuid, uuid) to authenticated;

commit;
