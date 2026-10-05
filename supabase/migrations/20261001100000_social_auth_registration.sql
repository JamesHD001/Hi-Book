-- OAuth users may authenticate before supplying required Hi!Book registration
-- fields. Keep them out of the application schema until onboarding is complete.

begin;

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first_name varchar(50);
  v_middle_name varchar(50);
  v_last_name varchar(50);
  v_date_of_birth date;
  v_gender public.gender_type;
  v_country_code char(2);
  v_base_username text;
  v_username text;
  v_is_social_provider boolean;
begin
  v_first_name := nullif(trim(new.raw_user_meta_data ->> 'first_name'), '');
  v_middle_name := nullif(trim(new.raw_user_meta_data ->> 'middle_name'), '');
  v_last_name := nullif(trim(new.raw_user_meta_data ->> 'last_name'), '');
  v_date_of_birth := (new.raw_user_meta_data ->> 'date_of_birth')::date;
  v_gender := (new.raw_user_meta_data ->> 'gender')::public.gender_type;
  v_country_code := upper(nullif(trim(new.raw_user_meta_data ->> 'country_code'), ''))::char(2);
  v_is_social_provider := lower(coalesce(new.raw_app_meta_data ->> 'provider', '')) in ('google', 'apple')
    or coalesce(new.raw_app_meta_data -> 'providers', '[]'::jsonb) ?| array['google', 'apple'];

  if v_first_name is null or v_last_name is null or v_date_of_birth is null
     or v_gender is null or v_country_code is null then
    if v_is_social_provider then
      return new;
    end if;
    raise exception 'Required registration data is missing';
  end if;

  if v_date_of_birth > current_date - interval '13 years' then
    raise exception 'Users under 13 are not eligible for Hi!Book';
  end if;

  if v_date_of_birth < current_date - interval '120 years' then
    raise exception 'Invalid date of birth';
  end if;

  if v_country_code !~ '^[A-Z]{2}$' then
    raise exception 'Invalid country code';
  end if;

  v_base_username := lower(regexp_replace(v_first_name || v_last_name, '[^a-zA-Z0-9]', '', 'g'));
  if char_length(v_base_username) < 3 then
    v_base_username := 'hibookuser';
  end if;
  v_base_username := left(v_base_username, 21);
  v_username := left(v_base_username || '_' || replace(new.id::text, '-', ''), 30);

  insert into public.users (id, first_name, middle_name, last_name, date_of_birth, gender, country_code, account_status)
  values (new.id, v_first_name, v_middle_name, v_last_name, v_date_of_birth, v_gender, v_country_code, 'PENDING_VERIFICATION');

  insert into public.profiles (user_id, username, username_normalized, display_name)
  values (new.id, v_username, lower(v_username), left(trim(v_first_name || ' ' || v_last_name), 80));

  insert into public.user_privacy_settings (user_id) values (new.id);
  insert into public.user_preferences (user_id, language_code) values (new.id, 'en');
  insert into public.notification_preferences (user_id) values (new.id);
  insert into public.discovery_preferences (user_id) values (new.id);

  return new;
exception
  when unique_violation then
    raise exception 'Unable to create the account profile because a unique identity value already exists';
end;
$$;

revoke all on function public.handle_auth_user_created() from public, anon, authenticated;

create or replace function public.complete_social_registration(
  p_first_name text,
  p_middle_name text,
  p_last_name text,
  p_date_of_birth date,
  p_gender text,
  p_country_code text,
  p_accept_terms boolean,
  p_accept_privacy boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_auth_user auth.users%rowtype;
  v_first_name varchar(50) := nullif(trim(p_first_name), '');
  v_middle_name varchar(50) := nullif(trim(p_middle_name), '');
  v_last_name varchar(50) := nullif(trim(p_last_name), '');
  v_gender public.gender_type;
  v_country_code char(2);
  v_terms_id uuid;
  v_privacy_id uuid;
  v_base_username text;
  v_username text;
begin
  if v_user_id is null or auth.role() <> 'authenticated' then
    raise exception 'Authentication required';
  end if;

  select * into v_auth_user from auth.users where id = v_user_id;
  if not found
     or (lower(coalesce(v_auth_user.raw_app_meta_data ->> 'provider', '')) not in ('google', 'apple')
         and not (coalesce(v_auth_user.raw_app_meta_data -> 'providers', '[]'::jsonb) ?| array['google', 'apple'])) then
    raise exception 'A Google or Apple account is required';
  end if;

  if v_auth_user.email_confirmed_at is null and v_auth_user.phone_confirmed_at is null then
    raise exception 'A verified email address or phone number is required';
  end if;

  if p_accept_terms is distinct from true or p_accept_privacy is distinct from true then
    raise exception 'Accept the Terms of Use and Privacy Policy to continue';
  end if;

  if exists (select 1 from public.users where id = v_user_id) then
    return exists (select 1 from public.users where id = v_user_id and account_status = 'ACTIVE');
  end if;

  if v_first_name is null or v_last_name is null
     or char_length(v_first_name) > 50 or char_length(v_middle_name) > 50 or char_length(v_last_name) > 50 then
    raise exception 'Enter a valid first and last name';
  end if;

  if p_date_of_birth is null
     or p_date_of_birth > current_date - interval '13 years'
     or p_date_of_birth < current_date - interval '120 years' then
    raise exception 'Enter a valid date of birth. Hi!Book accounts are available from age 13.';
  end if;

  if p_gender is null or upper(trim(p_gender)) not in ('MALE', 'FEMALE', 'UNDISCLOSED') then
    raise exception 'Select a valid gender option';
  end if;
  v_gender := upper(trim(p_gender))::public.gender_type;

  if p_country_code is null or upper(trim(p_country_code)) !~ '^[A-Z]{2}$' then
    raise exception 'Enter a valid two-letter country code';
  end if;
  v_country_code := upper(trim(p_country_code))::char(2);

  select id into v_terms_id from public.legal_document
   where document_type = 'TERMS_OF_USE' and published_at is not null and published_at <= now()
   order by effective_at desc, created_at desc limit 1;
  select id into v_privacy_id from public.legal_document
   where document_type = 'PRIVACY_POLICY' and published_at is not null and published_at <= now()
   order by effective_at desc, created_at desc limit 1;
  if v_terms_id is null or v_privacy_id is null then
    raise exception 'Current legal documents are not configured';
  end if;

  v_base_username := lower(regexp_replace(v_first_name || v_last_name, '[^a-zA-Z0-9]', '', 'g'));
  if char_length(v_base_username) < 3 then
    v_base_username := 'hibookuser';
  end if;
  v_base_username := left(v_base_username, 21);
  v_username := left(v_base_username || '_' || replace(v_user_id::text, '-', ''), 30);

  insert into public.users (id, first_name, middle_name, last_name, date_of_birth, gender, country_code, account_status)
  values (v_user_id, v_first_name, v_middle_name, v_last_name, p_date_of_birth, v_gender, v_country_code, 'PENDING_VERIFICATION');

  insert into public.profiles (user_id, username, username_normalized, display_name)
  values (v_user_id, v_username, lower(v_username), left(trim(v_first_name || ' ' || v_last_name), 80));
  insert into public.user_privacy_settings (user_id) values (v_user_id);
  insert into public.user_preferences (user_id, language_code) values (v_user_id, 'en');
  insert into public.notification_preferences (user_id) values (v_user_id);
  insert into public.discovery_preferences (user_id) values (v_user_id);
  insert into public.user_legal_acceptance (user_id, legal_document_id)
  values (v_user_id, v_terms_id), (v_user_id, v_privacy_id);

  perform set_config('hibook.system_operation', 'true', true);
  update public.users set account_status = 'ACTIVE', updated_at = now() where id = v_user_id;

  return true;
end;
$$;

revoke all on function public.complete_social_registration(text, text, text, date, text, text, boolean, boolean) from public, anon;
grant execute on function public.complete_social_registration(text, text, text, date, text, text, boolean, boolean) to authenticated;

commit;