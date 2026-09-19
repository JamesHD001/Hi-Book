-- Hi!Book 2.0 — production security and index cleanup
-- Remediates confirmed Supabase advisor findings without weakening intended RPC access.

begin;

-- These are internal/server-managed tables. They intentionally have no client
-- data-access API. Keep RLS enabled and add explicit deny policies so future
-- grants cannot accidentally expose them through the public API.
create policy discovery_country_preference_client_deny
  on public.discovery_country_preference
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy fulfillments_client_deny
  on public.fulfillments
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy hbc_recovery_obligations_client_deny
  on public.hbc_recovery_obligations
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy payment_webhook_events_client_deny
  on public.payment_webhook_events
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy product_fulfillment_rules_client_deny
  on public.product_fulfillment_rules
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Remove the incidental table privileges previously present on these
-- server-managed tables. SECURITY DEFINER server operations and postgres-owned
-- triggers continue to work.
revoke all on table public.discovery_country_preference,
  public.fulfillments,
  public.hbc_recovery_obligations,
  public.payment_webhook_events,
  public.product_fulfillment_rules
  from anon, authenticated;

-- Fix the only confirmed mutable SECURITY DEFINER search_path finding.
create or replace function public.validate_direct_conversation_participant_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if exists (
    select 1
    from public.conversations c
    where c.id = new.conversation_id
      and c.type = 'DIRECT'
      and (
        select count(*)
        from public.conversation_participants cp
        where cp.conversation_id = c.id
      ) > 2
  ) then
    raise exception 'DIRECT conversation cannot have more than two participants';
  end if;

  return new;
end;
$function$;

-- Trigger/maintenance helpers are not client RPCs. Revoke direct API
-- execution while preserving trigger execution by the database.
revoke all on function public.prevent_client_account_status_mutation() from public, anon, authenticated;
revoke all on function public.protect_financial_ledger_entry() from public, anon, authenticated;
revoke all on function public.remove_follows_on_block() from public, anon, authenticated;
revoke all on function public.sync_direct_pair_key() from public, anon, authenticated;
revoke all on function public.validate_financial_ledger_entry() from public, anon, authenticated;
revoke all on function public.validate_financial_ledger_group() from public, anon, authenticated;
revoke all on function public.validate_direct_conversation_participant_count() from public, anon, authenticated;

-- These helpers are legitimate authenticated RPCs where needed, but they do
-- not need to be callable by anonymous clients.
revoke execute on function public.current_user_id() from anon;
revoke execute on function public.direct_conversation_other_user(uuid) from anon;
revoke execute on function public.is_conversation_participant(uuid) from anon;

-- Remove confirmed duplicate indexes. Retain the canonical names already used
-- by the feature migrations.
drop index if exists public.gift_transactions_recipient_idx;
drop index if exists public.gift_transactions_status_idx;
drop index if exists public.idx_messages_conversation_created_id_desc;

commit;
