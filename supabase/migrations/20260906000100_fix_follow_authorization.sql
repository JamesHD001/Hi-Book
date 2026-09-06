-- Hi!Book 2.0 — Follow authorization RLS correction
-- The follows INSERT policy must not depend on the target user's row being
-- visible through users_self_select. Authorization checks therefore use a
-- SECURITY DEFINER helper that reads the authoritative users/blocks tables.

begin;

create or replace function public.can_follow_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    auth.uid() is not null
    and target_user_id is not null
    and auth.uid() <> target_user_id
    and exists (
      select 1
      from public.users u
      where u.id = target_user_id
        and u.account_status = 'ACTIVE'
    )
    and not public.is_blocked_between(target_user_id);
$$;

revoke all on function public.can_follow_user(uuid) from public;
grant execute on function public.can_follow_user(uuid) to authenticated;

-- Replace the policy so target-user eligibility is evaluated by the helper,
-- rather than through the target user's RLS-filtered visibility.
drop policy if exists follows_insert on public.follows;

create policy follows_insert on public.follows
for insert
with check (
  follower_id = auth.uid()
  and public.can_follow_user(following_id)
);

commit;
