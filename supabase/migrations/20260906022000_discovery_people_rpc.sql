-- Hi!Book 2.0 — Secure people discovery RPC
-- Discovery is a read domain. The RPC exposes only fields that are safe for
-- an eligible discovery candidate; sensitive identity fields remain hidden.

begin;

create or replace function public.discover_people(candidate_limit integer default 20)
returns table (
  user_id uuid,
  username varchar(30),
  display_name varchar(80),
  bio text,
  avatar_path text,
  country_code char(2),
  shared_interest_count bigint,
  shared_language_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with viewer as (
    select
      auth.uid() as id,
      dp.country_filter_mode,
      dp.interest_matching_enabled,
      dp.language_matching_enabled,
      dp.global_discovery_enabled
    from public.discovery_preferences dp
    where dp.user_id = auth.uid()
  ),
  viewer_countries as (
    select dcp.country_code
    from public.discovery_country_preferences dcp
    where dcp.user_id = auth.uid()
  ),
  candidates as (
    select
      u.id,
      p.username,
      p.display_name,
      p.bio,
      p.avatar_path,
      case when ups.country_visibility = 'PUBLIC' then u.country_code else null end as visible_country,
      case when v.interest_matching_enabled then (
        select count(*)
        from public.user_interest vi
        join public.user_interest ci on ci.interest_id = vi.interest_id
        where vi.user_id = v.id and ci.user_id = u.id
      ) else 0 end as shared_interests,
      case when v.language_matching_enabled then (
        select count(*)
        from public.user_language vl
        join public.user_language cl on cl.language_id = vl.language_id
        where vl.user_id = v.id and cl.user_id = u.id
      ) else 0 end as shared_languages
    from viewer v
    join public.users u on u.id <> v.id
    join public.profiles p on p.user_id = u.id
    join public.user_privacy_settings ups on ups.user_id = u.id
    where v.global_discovery_enabled
      and u.account_status = 'ACTIVE'
      and ups.discoverable
      and ups.profile_visibility = 'PUBLIC'
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = v.id and b.blocked_id = u.id)
           or (b.blocker_id = u.id and b.blocked_id = v.id)
      )
      and not exists (
        select 1 from public.follows f
        where f.follower_id = v.id and f.following_id = u.id
      )
      and (
        v.country_filter_mode = 'ANY'
        or (
          v.country_filter_mode = 'SELECTED'
          and ups.country_visibility = 'PUBLIC'
          and exists (
            select 1 from viewer_countries vc
            where vc.country_code = u.country_code
          )
        )
      )
  )
  select
    c.id,
    c.username,
    c.display_name,
    c.bio,
    c.avatar_path,
    c.visible_country,
    c.shared_interests,
    c.shared_languages
  from candidates c
  order by
    (c.shared_interests + c.shared_languages) desc,
    c.shared_interests desc,
    c.shared_languages desc,
    md5(c.id::text || auth.uid()::text),
    c.id
  limit greatest(1, least(coalesce(candidate_limit, 20), 50));
$$;

revoke all on function public.discover_people(integer) from public;
revoke all on function public.discover_people(integer) from anon;
grant execute on function public.discover_people(integer) to authenticated;

commit;
