begin;

-- Profile editing spans the account, public profile, privacy, and selection
-- tables. Keep the whole database portion in one transaction so a validation,
-- constraint, or authorization failure cannot leave a partially updated profile.
create or replace function public.update_profile_atomic(
  p_display_name text,
  p_bio text,
  p_country_code char(2),
  p_profile_visibility public.profile_visibility,
  p_country_visibility public.profile_visibility,
  p_message_permission public.message_permission,
  p_discoverable boolean,
  p_language_ids uuid[] default '{}'::uuid[],
  p_interest_ids uuid[] default '{}'::uuid[],
  p_avatar_path text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_language_ids uuid[] := coalesce(p_language_ids, '{}'::uuid[]);
  v_interest_ids uuid[] := coalesce(p_interest_ids, '{}'::uuid[]);
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.users
    where id = v_user_id and account_status = 'ACTIVE'
  ) then
    raise exception 'Active account required';
  end if;

  if p_display_name is null or char_length(trim(p_display_name)) not between 1 and 80 then
    raise exception 'Display name must be between 1 and 80 characters';
  end if;

  if p_bio is not null and char_length(trim(p_bio)) > 500 then
    raise exception 'Bio must be 500 characters or fewer';
  end if;

  if p_country_code is null or p_country_code !~ '^[A-Z]{2}$' then
    raise exception 'Country must use its two-letter ISO code';
  end if;

  if cardinality(v_language_ids) > 5 then
    raise exception 'A maximum of 5 languages may be selected';
  end if;

  if cardinality(v_interest_ids) > 10 then
    raise exception 'A maximum of 10 interests may be selected';
  end if;

  if exists (
    select 1
    from unnest(v_language_ids) as selected(id)
    left join public.language l on l.id = selected.id
    where l.id is null
  ) then
    raise exception 'One or more selected languages are invalid';
  end if;

  if exists (
    select 1
    from unnest(v_interest_ids) as selected(id)
    left join public.interest i on i.id = selected.id
    where i.id is null
  ) then
    raise exception 'One or more selected interests are invalid';
  end if;

  if p_avatar_path is not null and p_avatar_path !~ ('^' || v_user_id::text || '/[^/]+\\.webp$') then
    raise exception 'Invalid avatar storage path';
  end if;

  update public.profiles
     set display_name = trim(p_display_name),
         bio = nullif(trim(p_bio), ''),
         avatar_path = coalesce(p_avatar_path, avatar_path),
         updated_at = now()
   where user_id = v_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;

  update public.users
     set country_code = p_country_code,
         updated_at = now()
   where id = v_user_id;

  update public.user_privacy_settings
     set profile_visibility = p_profile_visibility,
         country_visibility = p_country_visibility,
         message_permission = p_message_permission,
         discoverable = p_discoverable,
         updated_at = now()
   where user_id = v_user_id;

  if not found then
    raise exception 'Privacy settings not found';
  end if;

  delete from public.user_language where user_id = v_user_id;
  insert into public.user_language (user_id, language_id)
  select v_user_id, id from unnest(v_language_ids) as selected(id);

  delete from public.user_interest where user_id = v_user_id;
  insert into public.user_interest (user_id, interest_id)
  select v_user_id, id from unnest(v_interest_ids) as selected(id);
end;
$$;

revoke all on function public.update_profile_atomic(text, text, char(2), public.profile_visibility, public.profile_visibility, public.message_permission, boolean, uuid[], uuid[], text) from public, anon;
grant execute on function public.update_profile_atomic(text, text, char(2), public.profile_visibility, public.profile_visibility, public.message_permission, boolean, uuid[], uuid[], text) to authenticated;

commit;
