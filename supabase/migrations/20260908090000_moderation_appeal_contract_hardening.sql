begin;

-- Recreate the existing appeal-review function so its input parameter name
-- remains compatible with PostgreSQL's existing function contract.
drop function if exists public.review_moderation_appeal(uuid, public.appeal_status, text);

create function public.review_moderation_appeal(
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
  if decision not in ('UPHELD', 'REVERSED', 'PARTIALLY_REVERSED', 'CLOSED') then
    raise exception 'Invalid appeal decision';
  end if;
  if resolution_text is null or char_length(btrim(resolution_text)) < 10 or char_length(resolution_text) > 3000 then
    raise exception 'Decision reason must contain 10 to 3000 characters';
  end if;

  select * into v_appeal from public.appeals where id = target_appeal_id for update;
  if not found then raise exception 'Appeal not found'; end if;
  if v_appeal.status not in ('SUBMITTED', 'IN_REVIEW') then raise exception 'Appeal is already resolved'; end if;

  select * into v_action from public.moderation_actions where id = v_appeal.action_id for update;
  if not found then raise exception 'Moderation action not found'; end if;
  if v_action.performed_by = auth.uid() then raise exception 'A moderator cannot review their own moderation action'; end if;

  update public.appeals
  set status = decision,
      reviewed_by = auth.uid(),
      updated_at = now(),
      resolved_at = now(),
      resolution = btrim(resolution_text)
  where id = target_appeal_id
  returning * into v_result;

  if decision in ('REVERSED', 'PARTIALLY_REVERSED') then
    update public.moderation_actions
    set revoked_at = coalesce(revoked_at, now())
    where id = v_action.id;

    if v_action.target_type = 'USER'
       and v_action.action_type in ('USER_SUSPENDED','USER_DEACTIVATED','USER_BANNED') then
      v_previous_status := nullif(v_action.metadata ->> 'previous_account_status', '')::public.account_status;
      update public.users
      set account_status = coalesce(v_previous_status, 'ACTIVE'::public.account_status),
          updated_at = now()
      where id = v_action.target_id;
    elsif v_action.target_type = 'POST'
          and v_action.action_type in ('CONTENT_HIDDEN','CONTENT_REMOVED','CONTENT_RESTRICTED') then
      update public.posts set status = 'PUBLISHED', updated_at = now() where id = v_action.target_id;
    elsif v_action.target_type = 'COMMENT'
          and v_action.action_type in ('CONTENT_HIDDEN','CONTENT_REMOVED','CONTENT_RESTRICTED') then
      update public.comments set status = 'PUBLISHED', updated_at = now() where id = v_action.target_id;
    elsif v_action.target_type = 'MESSAGE'
          and v_action.action_type = 'MESSAGE_RESTRICTED' then
      update public.messages set status = 'SENT', updated_at = now() where id = v_action.target_id;
    end if;
  end if;

  insert into public.moderation_audit_logs
    (actor_id, action_type, target_type, target_id, case_id, metadata)
  values
    (auth.uid(), 'APPEAL_REVIEWED', 'APPEAL', target_appeal_id, v_action.case_id,
     jsonb_build_object('decision', decision::text, 'action_id', v_action.id));

  insert into public.notifications
    (recipient_id, actor_id, type, entity_type, entity_id, content)
  values
    (v_appeal.appellant_id, auth.uid(), 'MODERATION', 'MODERATION', v_action.id,
     case
       when decision = 'REVERSED' then 'Your moderation appeal was accepted and the action was reversed.'
       when decision = 'PARTIALLY_REVERSED' then 'Your moderation appeal was partially accepted.'
       when decision = 'UPHELD' then 'Your moderation appeal was reviewed and the action remains in effect.'
       else 'Your moderation appeal has been closed.'
     end);

  return v_result;
end;
$$;

revoke all on function public.review_moderation_appeal(uuid, public.appeal_status, text) from public, anon;
grant execute on function public.review_moderation_appeal(uuid, public.appeal_status, text) to authenticated;

commit;
