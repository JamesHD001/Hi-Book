begin;

-- Secure moderation case detail, internal notes, and action execution.
-- All privileged writes derive the actor from auth.uid() and require explicit permissions.

create or replace function public.get_moderation_case_detail(target_case_id uuid)
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
  closed_at timestamptz,
  evidence jsonb,
  notes jsonb,
  actions jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_admin_permission('moderation.cases.view') then
    raise exception 'Moderation case access denied';
  end if;

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
    mc.closed_at,
    coalesce((select jsonb_agg(jsonb_build_object(
      'id', me.id,
      'evidence_type', me.evidence_type,
      'source_type', me.source_type,
      'source_id', me.source_id,
      'metadata', me.metadata,
      'captured_at', me.captured_at,
      'created_at', me.created_at
    ) order by me.created_at asc) from public.moderation_evidence me where me.case_id = mc.id and me.deleted_at is null), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object(
      'id', mn.id,
      'author_id', mn.author_id,
      'content', mn.content,
      'created_at', mn.created_at,
      'updated_at', mn.updated_at
    ) order by mn.created_at asc) from public.moderation_notes mn where mn.case_id = mc.id and mn.deleted_at is null), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object(
      'id', ma.id,
      'target_type', ma.target_type,
      'target_id', ma.target_id,
      'action_type', ma.action_type,
      'reason', ma.reason,
      'severity', ma.severity,
      'performed_by', ma.performed_by,
      'starts_at', ma.starts_at,
      'expires_at', ma.expires_at,
      'revoked_at', ma.revoked_at,
      'created_at', ma.created_at
    ) order by ma.created_at desc) from public.moderation_actions ma where ma.case_id = mc.id), '[]'::jsonb)
  from public.moderation_cases mc
  where mc.id = target_case_id;

  if not found then
    raise exception 'Moderation case not found';
  end if;
end;
$$;

create or replace function public.add_moderation_note(
  target_case_id uuid,
  note_content text
)
returns public.moderation_notes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note public.moderation_notes;
  v_content text := btrim(coalesce(note_content, ''));
begin
  if auth.uid() is null or not public.is_admin_permission('moderation.cases.view') then
    raise exception 'Moderation note access denied';
  end if;
  if not public.is_admin_permission('moderation.cases.assign') then
    raise exception 'Moderation note permission denied';
  end if;
  if char_length(v_content) < 1 or char_length(v_content) > 5000 then
    raise exception 'Moderation note must contain 1 to 5000 characters';
  end if;
  if not exists (select 1 from public.moderation_cases mc where mc.id = target_case_id) then
    raise exception 'Moderation case not found';
  end if;

  insert into public.moderation_notes (case_id, author_id, content, visibility)
  values (target_case_id, auth.uid(), v_content, 'INTERNAL')
  returning * into v_note;

  insert into public.moderation_audit_logs (actor_id, action_type, target_type, target_id, case_id, metadata)
  values (auth.uid(), 'NOTE_ADDED', 'MODERATION_CASE', target_case_id, target_case_id, jsonb_build_object('note_id', v_note.id));

  return v_note;
end;
$$;

create or replace function public.execute_moderation_action(
  target_case_id uuid,
  action public.moderation_action_type,
  action_reason text,
  action_severity public.severity_type default 'MEDIUM',
  duration_minutes integer default null
)
returns public.moderation_actions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_case public.moderation_cases;
  v_action public.moderation_actions;
  v_expires timestamptz;
  v_reason text := nullif(btrim(coalesce(action_reason, '')), '');
  v_target_status public.account_status;
begin
  if auth.uid() is null or not public.is_admin_permission('moderation.actions.execute') then
    raise exception 'Moderation action denied';
  end if;
  if duration_minutes is not null and (duration_minutes < 1 or duration_minutes > 525600) then
    raise exception 'Invalid moderation action duration';
  end if;
  if v_reason is null or char_length(v_reason) > 2000 then
    raise exception 'Moderation action reason is required and must be at most 2000 characters';
  end if;

  select * into v_case from public.moderation_cases mc where mc.id = target_case_id for update;
  if not found then
    raise exception 'Moderation case not found';
  end if;
  if v_case.status in ('RESOLVED','CLOSED') then
    raise exception 'Closed moderation case cannot receive a new action';
  end if;

  if action in ('USER_RESTRICTED','USER_SUSPENDED','USER_DEACTIVATED','USER_BANNED','WARNING')
     and v_case.target_type <> 'USER' then
    raise exception 'Selected action requires a USER case';
  end if;
  if action in ('CONTENT_HIDDEN','CONTENT_REMOVED','CONTENT_RESTRICTED')
     and v_case.target_type not in ('POST','COMMENT') then
    raise exception 'Selected content action requires a POST or COMMENT case';
  end if;
  if action = 'MESSAGE_RESTRICTED' and v_case.target_type <> 'MESSAGE' then
    raise exception 'Message restriction requires a MESSAGE case';
  end if;

  if duration_minutes is not null then
    v_expires := now() + make_interval(mins => duration_minutes);
  end if;

  insert into public.moderation_actions (
    case_id, target_type, target_id, action_type, reason, severity,
    performed_by, starts_at, expires_at, metadata
  ) values (
    target_case_id, v_case.target_type, v_case.target_id, action, v_reason,
    action_severity, auth.uid(), now(), v_expires,
    jsonb_build_object('duration_minutes', duration_minutes)
  ) returning * into v_action;

  if action in ('CONTENT_HIDDEN','CONTENT_REMOVED','CONTENT_RESTRICTED') then
    if v_case.target_type = 'POST' then
      update public.posts
         set status = case
           when action = 'CONTENT_HIDDEN' then 'HIDDEN'::public.post_status
           else 'REMOVED'::public.post_status
         end,
         updated_at = now()
       where id = v_case.target_id;
      if not found then raise exception 'Target post not found'; end if;
    elsif v_case.target_type = 'COMMENT' then
      update public.comments
         set status = case
           when action = 'CONTENT_HIDDEN' then 'HIDDEN'::public.comment_status
           else 'REMOVED'::public.comment_status
         end,
         updated_at = now()
       where id = v_case.target_id;
      if not found then raise exception 'Target comment not found'; end if;
    end if;
  elsif action in ('USER_SUSPENDED','USER_DEACTIVATED','USER_BANNED') then
    v_target_status := case
      when action = 'USER_SUSPENDED' then 'SUSPENDED'::public.account_status
      when action = 'USER_DEACTIVATED' then 'DEACTIVATED'::public.account_status
      else 'DELETED'::public.account_status
    end;
    update public.users set account_status = v_target_status, updated_at = now() where id = v_case.target_id;
    if not found then raise exception 'Target user not found'; end if;
  end if;

  update public.moderation_cases
     set status = 'RESOLVED', resolved_at = now(), updated_at = now()
   where id = target_case_id;

  insert into public.moderation_audit_logs (
    actor_id, action_type, target_type, target_id, case_id, metadata
  ) values (
    auth.uid(), 'MODERATION_ACTION_EXECUTED', v_case.target_type::text, v_case.target_id,
    target_case_id,
    jsonb_build_object(
      'action_id', v_action.id,
      'action_type', action::text,
      'severity', action_severity::text,
      'expires_at', v_expires
    )
  );

  return v_action;
end;
$$;

revoke all on function public.get_moderation_case_detail(uuid) from public, anon;
revoke all on function public.add_moderation_note(uuid, text) from public, anon;
revoke all on function public.execute_moderation_action(uuid, public.moderation_action_type, text, public.severity_type, integer) from public, anon;
grant execute on function public.get_moderation_case_detail(uuid) to authenticated;
grant execute on function public.add_moderation_note(uuid, text) to authenticated;
grant execute on function public.execute_moderation_action(uuid, public.moderation_action_type, text, public.severity_type, integer) to authenticated;

commit;
