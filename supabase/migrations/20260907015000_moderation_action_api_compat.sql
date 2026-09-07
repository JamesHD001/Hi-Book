begin;

-- Keep the UI-facing RPC small and duration-based while the internal action
-- function retains explicit timestamps for trusted server workflows.
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
  v_expires_at timestamptz;
begin
  if duration_minutes is not null and (duration_minutes < 1 or duration_minutes > 525600) then
    raise exception 'Duration must be between 1 and 525600 minutes';
  end if;

  v_expires_at := case
    when duration_minutes is null then null
    else now() + make_interval(mins => duration_minutes)
  end;

  return public.execute_moderation_action(
    target_case_id,
    action,
    action_reason,
    action_severity,
    now(),
    v_expires_at,
    jsonb_build_object('duration_minutes', duration_minutes)
  );
end;
$$;

revoke all on function public.execute_moderation_action(uuid, public.moderation_action_type, text, public.severity_type, integer) from public, anon;
grant execute on function public.execute_moderation_action(uuid, public.moderation_action_type, text, public.severity_type, integer) to authenticated;

commit;
