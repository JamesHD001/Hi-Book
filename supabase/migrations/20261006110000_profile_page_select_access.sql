begin;

grant select on table
  public.profiles,
  public.user_privacy_settings,
  public.user_language,
  public.user_interest,
  public.language,
  public.interest
to authenticated;

commit;