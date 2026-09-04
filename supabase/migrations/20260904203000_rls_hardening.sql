-- Hi!Book 2.0 — RLS hardening pass
-- Depends on 20260904180000_rls_security.sql.
-- This migration closes client-side state mutation and RLS-recursion gaps found during security review.

begin;

-- Analytics requires its own explicit administrative permission.
alter type admin_permission_resource add value if not exists 'ANALYTICS';

-- SECURITY DEFINER helper avoids recursive RLS evaluation when checking conversation membership.
create or replace function public.is_conversation_participant(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = target_conversation_id
      and cp.user_id = auth.uid()
  );
$$;

-- Return the other participant in an MVP DIRECT conversation.
create or replace function public.direct_conversation_other_user(target_conversation_id uuid)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select cp.user_id
  from public.conversation_participants cp
  where cp.conversation_id = target_conversation_id
    and cp.user_id <> auth.uid()
  limit 1;
$$;

-- ============================================================
-- REMOVE UNSAFE DIRECT STATE MUTATION
-- ============================================================

-- Account status, DOB, gender and other account-state fields are not client-writable.
drop policy if exists users_self_update on public.users;

-- Deletion state is controlled by the deletion workflow, not arbitrary client UPDATEs.
drop policy if exists deletion_self_update on public.account_deletion_request;

-- Conversations and participant membership are created/changed by trusted server functions.
drop policy if exists conversations_insert on public.conversations;
drop policy if exists conversations_update on public.conversations;
drop policy if exists conversation_participants_insert on public.conversation_participants;

-- ============================================================
-- CONVERSATION RLS WITHOUT SELF-RECURSION
-- ============================================================

drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
for select using (
  public.is_conversation_participant(id)
  or public.is_admin_permission('messages.view_moderation')
);

drop policy if exists conversation_participants_select on public.conversation_participants;
create policy conversation_participants_select on public.conversation_participants
for select using (
  user_id = auth.uid()
  or public.is_conversation_participant(conversation_id)
  or public.is_admin_permission('messages.view_moderation')
);

drop policy if exists conversation_participants_update on public.conversation_participants;
-- Read-state updates should be exposed through a narrow trusted RPC so joined_at/user_id
-- cannot be modified by a normal client UPDATE.

-- ============================================================
-- MESSAGE AUTHORIZATION
-- ============================================================

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
for select using (
  public.is_conversation_participant(conversation_id)
  or public.is_admin_permission('messages.view_moderation')
);

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
for insert with check (
  sender_id = auth.uid()
  and public.is_conversation_participant(conversation_id)
  and not exists (
    select 1
    from public.blocks b
    join public.conversation_participants cp on cp.user_id = b.blocked_id
    where cp.conversation_id = conversation_id
      and b.blocker_id = auth.uid()
  )
  and not exists (
    select 1
    from public.blocks b
    join public.conversation_participants cp on cp.user_id = b.blocker_id
    where cp.conversation_id = conversation_id
      and b.blocked_id = auth.uid()
  )
  and (
    direct_conversation_other_user(conversation_id) is null
    or public.can_message_user(direct_conversation_other_user(conversation_id))
  )
);

-- ============================================================
-- COMMENT-LIKE ACCESS FIX
-- ============================================================

drop policy if exists comment_likes_insert on public.comment_likes;
create policy comment_likes_insert on public.comment_likes
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.comments c
    join public.posts p on p.id = c.post_id
    where c.id = comment_id
      and c.status = 'PUBLISHED'
      and p.status = 'PUBLISHED'
      and not public.is_blocked_between(p.user_id)
      and (
        p.visibility = 'PUBLIC'
        or (p.visibility = 'FOLLOWERS' and exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid()
            and f.following_id = p.user_id
        ))
      )
  )
);

-- ============================================================
-- LEGAL ACCEPTANCE HARDENING
-- ============================================================

drop policy if exists legal_acceptance_self_insert on public.user_legal_acceptance;
create policy legal_acceptance_self_insert on public.user_legal_acceptance
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.legal_document ld
    where ld.id = legal_document_id
      and ld.published_at is not null
      and ld.published_at <= now()
      and ld.effective_at <= now()
  )
);

-- ============================================================
-- PROFILE / USER-EDITABLE FIELD BOUNDARY
-- ============================================================

-- username_normalized must be server-derived from username. The service layer owns
-- username changes; the policy below only permits ownership, while a DB trigger/RPC
-- must enforce normalization before production account/profile editing is enabled.

-- ============================================================
-- ANALYTICS PERMISSION POLICY
-- ============================================================

drop policy if exists analytics_event_definitions_admin on public.analytics_event_definitions;
create policy analytics_event_definitions_admin on public.analytics_event_definitions
for all using (public.is_admin_permission('analytics.view'))
with check (public.is_admin_permission('analytics.view'));

drop policy if exists analytics_events_admin on public.analytics_events;
create policy analytics_events_admin on public.analytics_events
for select using (public.is_admin_permission('analytics.view'));

drop policy if exists telemetry_admin on public.telemetry_events;
create policy telemetry_admin on public.telemetry_events
for select using (public.is_admin_permission('analytics.view'));

drop policy if exists analytics_daily_metrics_admin on public.analytics_daily_metrics;
create policy analytics_daily_metrics_admin on public.analytics_daily_metrics
for select using (public.is_admin_permission('analytics.view'));

drop policy if exists analytics_daily_dimension_metrics_admin on public.analytics_daily_dimension_metrics;
create policy analytics_daily_dimension_metrics_admin on public.analytics_daily_dimension_metrics
for select using (public.is_admin_permission('analytics.view'));

-- ============================================================
-- EXPLICITLY SERVER-OWNED TABLES
-- ============================================================

-- These tables intentionally have no client write policies:
-- payments, payment_attempts, purchases, coin_wallets, coin_transactions,
-- coin_transaction_entries, financial_accounts, financial_ledger_entries,
-- refunds, payment_reconciliation, notifications, moderation audit logs,
-- admin audit logs, analytics ingestion, telemetry, and system jobs.

commit;
