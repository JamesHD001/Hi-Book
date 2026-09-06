-- Hi!Book 2.0 — message permission direction correction
-- FOLLOWERS means the sender follows the recipient.

begin;

create or replace function public.can_message_user(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    auth.uid() is not null
    and auth.uid() <> other_user_id
    and not public.is_blocked_between(other_user_id)
    and exists (
      select 1
      from public.users u
      join public.user_privacy_settings ps on ps.user_id = u.id
      where u.id = other_user_id
        and u.account_status = 'ACTIVE'
        and (
          ps.message_permission = 'EVERYONE'
          or (ps.message_permission = 'FOLLOWERS' and exists (
            select 1
            from public.follows f
            where f.follower_id = auth.uid()
              and f.following_id = other_user_id
          ))
        )
    );
$$;

revoke all on function public.can_message_user(uuid) from public;
grant execute on function public.can_message_user(uuid) to authenticated;

commit;
