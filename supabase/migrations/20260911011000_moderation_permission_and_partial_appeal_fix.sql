begin;

-- Moderation action execution and appeal review are distinct privileged
-- operations. The action executor must require the explicit action permission;
-- assigning a case is not sufficient authority to execute enforcement.
create or replace function public.execute_moderation_action(
  target_case_id uuid,
  target_action_type public.moderation_action_type,
  target_reason text,
  target_severity public.severity_type default 'MEDIUM',
  target_starts_at timestamptz default now(),
  target_expires_at timestamptz default null,
  target_metadata jsonb default '{}'::jsonb
)
returns public.moderation_actions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_case public.moderation_cases;
  v_action public.moderation_actions;
  v_target_user uuid;
  v_previous_status public.account_status;
begin
  if auth.uid() is null or not public.is_admin_permission('moderation.actions.execute') then
    raise exception 'Moderation action denied';
  end if;

  select * into v_case
  from public.moderation_cases
  where id = target_case_id
  for update;

  if not found then raise exception 'Moderation case not found'; end if;
  if v_case.status in ('RESOLVED','CLOSED') then raise exception 'Moderation case is already closed'; end if;
  if target_expires_at is not null and target_expires_at <= target_starts_at then
    raise exception 'Moderation action expiry must be after its start';
  end if;

  if target_action_type in ('USER_RESTRICTED','USER_SUSPENDED','USER_DEACTIVATED','USER_BANNED') then
    if v_case.target_type <> 'USER' then raise exception 'User action requires a USER moderation case'; end if;
    v_target_user := v_case.target_id;
    select u.account_status into v_previous_status
    from public.users u
    where u.id = v_target_user
    for update;
    if not found then raise exception 'Target user not found'; end if;
  elsif target_action_type in ('CONTENT_HIDDEN','CONTENT_REMOVED','CONTENT_RESTRICTED') then
    if v_case.target_type = 'POST' then
      update public.posts
         set status = case when target_action_type = 'CONTENT_REMOVED' then 'REMOVED'::public.post_status else 'HIDDEN'::public.post_status end,
             updated_at = now()
       where id = v_case.target_id;
    elsif v_case.target_type = 'COMMENT' then
      update public.comments
         set status = case when target_action_type = 'CONTENT_REMOVED' then 'REMOVED'::public.comment_status else 'HIDDEN'::public.comment_status end,
             updated_at = now()
       where id = v_case.target_id;
    else
      raise exception 'Content action requires a POST or COMMENT case';
    end if;
  elsif target_action_type = 'MESSAGE_RESTRICTED' then
    if v_case.target_type <> 'MESSAGE' then raise exception 'Message action requires a MESSAGE moderation case'; end if;
    update public.messages set status = 'HIDDEN', updated_at = now() where id = v_case.target_id;
  elsif target_action_type in ('WARNING','NO_ACTION') then
    null;
  else
    raise exception 'Unsupported moderation action';
  end if;

  insert into public.moderation_actions (
    case_id, target_type, target_id, action_type, reason, severity,
    performed_by, starts_at, expires_at, metadata
  ) values (
    target_case_id, v_case.target_type, v_case.target_id, target_action_type,
    target_reason, target_severity, auth.uid(), target_starts_at,
    target_expires_at,
    target_metadata || jsonb_build_object(
      'previous_account_status',
      case when v_previous_status is null then null else v_previous_status::text end
    )
  ) returning * into v_action;

  if target_action_type = 'USER_SUSPENDED' then
    update public.users set account_status = 'SUSPENDED', updated_at = now() where id = v_target_user;
  elsif target_action_type in ('USER_DEACTIVATED','USER_BANNED') then
    update public.users set account_status = 'DEACTIVATED', updated_at = now() where id = v_target_user;
  end if;

  update public.moderation_cases
     set status = 'RESOLVED', resolved_at = now(), updated_at = now()
   where id = target_case_id;

  insert into public.moderation_audit_logs (
    actor_id, action_type, target_type, target_id, case_id, metadata
  ) values (
    auth.uid(), 'MODERATION_ACTION_EXECUTED', v_case.target_type::text,
    v_case.target_id, target_case_id,
    jsonb_build_object('action_id', v_action.id, 'action_type', target_action_type::text, 'reason', target_reason)
  );

  if v_case.target_type = 'USER' then
    insert into public.notifications (recipient_id, actor_id, type, entity_type, entity_id, content)
    values (
      v_case.target_id, auth.uid(), 'MODERATION', 'MODERATION', target_case_id,
      case
        when target_action_type = 'WARNING' then 'A moderator issued a warning on your account.'
        when target_action_type = 'USER_RESTRICTED' then 'Your account has been temporarily restricted.'
        when target_action_type = 'USER_SUSPENDED' then 'Your account has been suspended.'
        when target_action_type in ('USER_DEACTIVATED','USER_BANNED') then 'Your account has been deactivated.'
        else 'A moderation action was applied to your account.'
      end
    );
  end if;

  return v_action;
end;
$$;

-- Appeal reviewers need the dedicated appeal-review permission rather than the
-- broader case-assignment permission.
create or replace function public.review_moderation_appeal(
  target_appeal_id uuid,
  decision public.appeal_status,
  resolution_text text
)
returns public.appeals
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appeal public.appeals;
  v_action public.moderation_actions;
  v_previous_status public.account_status;
  v_result public.appeals;
begin
  if auth.uid() is null or not public.is_admin_permission('moderation.appeals.review') then
    raise exception 'Appeal review denied';
  end if;

  if decision not in ('UPHELD','REVERSED','PARTIALLY_REVERSED','CLOSED') then
    raise exception 'Invalid appeal decision';
  end if;

  select * into v_appeal
  from public.appeals
  where id = target_appeal_id
  for update;
  if not found then raise exception 'Appeal not found'; end if;
  if v_appeal.status not in ('SUBMITTED','IN_REVIEW') then raise exception 'Appeal is already resolved'; end if;

  select * into v_action
  from public.moderation_actions
  where id = v_appeal.action_id
  for update;
  if not found then raise exception 'Moderation action not found'; end if;

  update public.appeals
     set status = decision,
         reviewed_by = auth.uid(),
         updated_at = now(),
         resolved_at = now(),
         resolution = nullif(trim(resolution_text), '')
   where id = target_appeal_id
   returning * into v_result;

  -- A partial reversal has no structured scope in the current appeal contract.
  -- Do not silently turn it into a full reversal. The reviewer can record the
  -- partial decision, while the existing enforcement remains active until an
  -- explicit moderation action changes it.
  if decision = 'REVERSED' then
    update public.moderation_actions
       set revoked_at = coalesce(revoked_at, now())
     where id = v_action.id;

    if v_action.target_type = 'USER' and v_action.action_type in ('USER_SUSPENDED','USER_DEACTIVATED','USER_BANNED') then
      v_previous_status := nullif(v_action.metadata ->> 'previous_account_status', '')::public.account_status;
      update public.users
         set account_status = coalesce(v_previous_status, 'ACTIVE'::public.account_status), updated_at = now()
       where id = v_action.target_id;
    elsif v_action.target_type = 'POST' and v_action.action_type in ('CONTENT_HIDDEN','CONTENT_REMOVED','CONTENT_RESTRICTED') then
      update public.posts set status = 'PUBLISHED', updated_at = now() where id = v_action.target_id;
    elsif v_action.target_type = 'COMMENT' and v_action.action_type in ('CONTENT_HIDDEN','CONTENT_REMOVED','CONTENT_RESTRICTED') then
      update public.comments set status = 'PUBLISHED', updated_at = now() where id = v_action.target_id;
    elsif v_action.target_type = 'MESSAGE' and v_action.action_type = 'MESSAGE_RESTRICTED' then
      update public.messages set status = 'SENT', updated_at = now() where id = v_action.target_id;
    end if;
  end if;

  insert into public.moderation_audit_logs (actor_id, action_type, target_type, target_id, metadata)
  values (
    auth.uid(), 'APPEAL_REVIEWED', 'APPEAL', target_appeal_id,
    jsonb_build_object('decision', decision::text, 'action_id', v_action.id)
  );

  insert into public.notifications (recipient_id, actor_id, type, entity_type, entity_id, content)
  values (
    v_appeal.appellant_id, auth.uid(), 'MODERATION', 'MODERATION', v_action.id,
    case
      when decision = 'REVERSED' then 'Your moderation appeal was accepted and the action was reversed.'
      when decision = 'PARTIALLY_REVERSED' then 'Your moderation appeal was partially accepted; the remaining enforcement stays in effect.'
      when decision = 'UPHELD' then 'Your moderation appeal was reviewed and the action remains in effect.'
      else 'Your moderation appeal has been closed.'
    end
  );

  return v_result;
end;
$$;

revoke all on function public.execute_moderation_action(uuid, public.moderation_action_type, text, public.severity_type, timestamptz, timestamptz, jsonb) from public, anon;
grant execute on function public.execute_moderation_action(uuid, public.moderation_action_type, text, public.severity_type, timestamptz, timestamptz, jsonb) to authenticated;
revoke all on function public.review_moderation_appeal(uuid, public.appeal_status, text) from public, anon;
grant execute on function public.review_moderation_appeal(uuid, public.appeal_status, text) to authenticated;

commit;
