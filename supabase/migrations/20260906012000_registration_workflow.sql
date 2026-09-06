-- Hi!Book 2.0 — authenticated registration workflow
-- Bridges Supabase Auth into the locked public identity model without exposing
-- service-role credentials or allowing clients to self-promote account status.

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
begin
  v_first_name := nullif(trim(new.raw_user_meta_data ->> 'first_name'), '');
  v_middle_name := nullif(trim(new.raw_user_meta_data ->> 'middle_name'), '');
  v_last_name := nullif(trim(new.raw_user_meta_data ->> 'last_name'), '');
  v_date_of_birth := (new.raw_user_meta_data ->> 'date_of_birth')::date;
  v_gender := (new.raw_user_meta_data ->> 'gender')::public.gender_type;
  v_country_code := upper(nullif(trim(new.raw_user_meta_data ->> 'country_code'), ''))::char(2);

  if v_first_name is null or v_last_name is null or v_date_of_birth is null
     or v_gender is null or v_country_code is null then
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
  values (new.id, v_username, lower(v_username), trim(v_first_name || ' ' || v_last_name));

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_auth_user_created();

revoke all on function public.handle_auth_user_created() from public, anon, authenticated;
revoke update on public.users from authenticated;
grant update (country_code) on public.users to authenticated;

-- Users may edit country through the normal RLS path, but account status,
-- legal identity fields and verification state are not client-writable.
drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users
for update using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.complete_registration()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_terms_id uuid;
  v_privacy_id uuid;
  v_email_confirmed timestamptz;
  v_phone_confirmed timestamptz;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select au.email_confirmed_at, au.phone_confirmed_at
    into v_email_confirmed, v_phone_confirmed
  from auth.users au where au.id = v_user_id;

  if v_email_confirmed is null and v_phone_confirmed is null then
    raise exception 'A verified email address or phone number is required';
  end if;

  select ld.id into v_terms_id from public.legal_document ld
  where ld.document_type = 'TERMS_OF_USE' and ld.published_at is not null and ld.published_at <= now()
  order by ld.effective_at desc, ld.created_at desc limit 1;

  select ld.id into v_privacy_id from public.legal_document ld
  where ld.document_type = 'PRIVACY_POLICY' and ld.published_at is not null and ld.published_at <= now()
  order by ld.effective_at desc, ld.created_at desc limit 1;

  if v_terms_id is null or v_privacy_id is null then
    raise exception 'Current legal documents are not configured';
  end if;

  if not exists (select 1 from public.users u where u.id = v_user_id and u.account_status = 'PENDING_VERIFICATION') then
    return exists (select 1 from public.users u where u.id = v_user_id and u.account_status = 'ACTIVE');
  end if;

  insert into public.user_legal_acceptance (user_id, legal_document_id)
  values (v_user_id, v_terms_id), (v_user_id, v_privacy_id);

  update public.users set account_status = 'ACTIVE', updated_at = now() where id = v_user_id;
  return true;
end;
$$;

revoke all on function public.complete_registration() from public, anon;
grant execute on function public.complete_registration() to authenticated;

commit;
