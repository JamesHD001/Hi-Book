-- Hi!Book 2.0 — foundational RLS/security layer
-- This migration intentionally keeps sensitive account and financial writes server-owned.

begin;

-- ============================================================
-- CANONICAL AUTHORIZATION HELPERS
-- ============================================================

create or replace function public.is_blocked_between(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = p_other_user_id)
       or (b.blocker_id = p_other_user_id and b.blocked_id = auth.uid())
  );
$$;

create or replace function public.is_admin_permission(p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.admin_user_roles aur
    join public.admin_role_permissions arp on arp.role_id = aur.role_id
    join public.admin_permissions ap on ap.id = arp.permission_id
    join public.users u on u.id = aur.user_id
    where aur.user_id = auth.uid()
      and aur.revoked_at is null
      and u.account_status = 'ACTIVE'
      and ap.permission_key = p_permission_key
  );
$$;

create or replace function public.can_message_user(p_target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    auth.uid() is not null
    and p_target_user_id is not null
    and auth.uid() <> p_target_user_id
    and not public.is_blocked_between(p_target_user_id)
    and exists (select 1 from public.users u where u.id=p_target_user_id and u.account_status='ACTIVE')
    and (
      exists (select 1 from public.user_privacy_settings ups where ups.user_id=p_target_user_id and ups.message_permission='EVERYONE')
      or (
        exists (select 1 from public.user_privacy_settings ups where ups.user_id=p_target_user_id and ups.message_permission='FOLLOWERS')
        and exists (select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p_target_user_id)
      )
    );
$$;

-- ============================================================
-- ENABLE RLS ON USER-FACING TABLES
-- ============================================================

do $do$
declare t text;
begin
  foreach t in array array[
    'users','profiles','user_privacy_settings','user_preferences','user_language','user_interest',
    'legal_document','user_legal_acceptance','notification_preferences','account_deletion_request',
    'follows','blocks','reports','posts','post_media','post_likes','comments','comment_likes',
    'post_shares','mentions','post_tags','conversations','conversation_participants','messages','message_media',
    'discovery_preferences','discovery_country_preference','notifications',
    'moderation_cases','moderation_evidence','moderation_notes','moderation_actions','appeals',
    'admin_permissions','admin_roles','admin_role_permissions','admin_user_roles','platform_configurations',
    'feature_flags','analytics_event_definitions','analytics_events','telemetry_events',
    'analytics_daily_metrics','analytics_daily_dimension_metrics','currencies','payment_providers',
    'payment_methods','monetization_products','product_prices','purchases','payments','payment_attempts',
    'coin_wallets','coin_transactions','coin_transaction_entries','financial_accounts',
    'financial_ledger_entries','virtual_gifts','gift_transactions','refunds','payment_reconciliations','system_jobs',
    'moderation_audit_logs','admin_audit_logs'
  ] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $do$;

-- ============================================================
-- PROFILE / SETTINGS
-- ============================================================

create policy profiles_select on public.profiles
for select using (
  user_id = auth.uid()
  or (profile_visibility = 'PUBLIC')
  or public.is_admin_permission('users.view')
);

-- Profile edits are ownership-scoped. username normalization is DB-enforced.
create policy profiles_update on public.profiles
for update using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy user_privacy_select on public.user_privacy_settings
for select using (user_id = auth.uid() or public.is_admin_permission('users.view'));
create policy user_privacy_update on public.user_privacy_settings
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy user_preferences_select on public.user_preferences
for select using (user_id = auth.uid());
create policy user_preferences_update on public.user_preferences
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy user_language_select on public.user_language
for select using (user_id = auth.uid() or public.is_admin_permission('users.view'));
create policy user_language_insert on public.user_language
for insert with check (user_id = auth.uid());
create policy user_language_delete on public.user_language
for delete using (user_id = auth.uid());

create policy user_interest_select on public.user_interest
for select using (user_id = auth.uid() or public.is_admin_permission('users.view'));
create policy user_interest_insert on public.user_interest
for insert with check (user_id = auth.uid());
create policy user_interest_delete on public.user_interest
for delete using (user_id = auth.uid());

-- ============================================================
-- ACCOUNT DATA: NO BROAD CLIENT SELECT
-- ============================================================

-- The users table contains DOB, gender, legal names and account state.
-- It is intentionally server-owned; profile reads expose public identity.

-- ============================================================
-- SOCIAL GRAPH
-- ============================================================

create policy follows_select on public.follows
for select using (follower_id=auth.uid() or following_id=auth.uid() or public.is_admin_permission('users.view'));
create policy follows_insert on public.follows
for insert with check (follower_id=auth.uid());
create policy follows_delete on public.follows
for delete using (follower_id=auth.uid());

create policy blocks_select on public.blocks
for select using (blocker_id=auth.uid());
create policy blocks_insert on public.blocks
for insert with check (blocker_id=auth.uid() and blocked_id<>auth.uid());
create policy blocks_delete on public.blocks
for delete using (blocker_id=auth.uid());

create policy reports_select on public.reports
for select using (reporter_id=auth.uid() or public.is_admin_permission('reports.view'));
create policy reports_insert on public.reports
for insert with check (reporter_id=auth.uid());

-- ============================================================
-- CONTENT
-- ============================================================

create policy posts_select on public.posts
for select using (
  status='PUBLISHED'
  and (
    visibility='PUBLIC'
    or user_id=auth.uid()
    or (visibility='FOLLOWERS' and exists (select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=posts.user_id))
  )
  and not public.is_blocked_between(user_id)
);

create policy posts_insert on public.posts
for insert with check (user_id=auth.uid());
create policy posts_update on public.posts
for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy posts_delete on public.posts
for delete using (user_id=auth.uid());

create policy post_media_select on public.post_media
for select using (exists (select 1 from public.posts p where p.id=post_id));
create policy post_likes_select on public.post_likes
for select using (exists (select 1 from public.posts p where p.id=post_id and p.status='PUBLISHED'));
create policy post_likes_insert on public.post_likes
for insert with check (user_id=auth.uid());
create policy post_likes_delete on public.post_likes
for delete using (user_id=auth.uid());

create policy comments_select on public.comments
for select using (exists (select 1 from public.posts p where p.id=post_id and p.status='PUBLISHED') and not public.is_blocked_between(user_id));
create policy comments_insert on public.comments
for insert with check (user_id=auth.uid());
create policy comments_update on public.comments
for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy comments_delete on public.comments
for delete using (user_id=auth.uid());

create policy comment_likes_select on public.comment_likes
for select using (exists (select 1 from public.comments c where c.id=comment_id and c.status='PUBLISHED'));
create policy comment_likes_insert on public.comment_likes
for insert with check (user_id=auth.uid());
create policy comment_likes_delete on public.comment_likes
for delete using (user_id=auth.uid());

create policy post_shares_select on public.post_shares
for select using (user_id=auth.uid() or public.is_admin_permission('posts.view'));
create policy post_shares_insert on public.post_shares
for insert with check (user_id=auth.uid());

create policy mentions_select on public.mentions
for select using (mentioned_user_id=auth.uid() or public.is_admin_permission('posts.view'));
create policy post_tags_select on public.post_tags
for select using (tagged_user_id=auth.uid() or public.is_admin_permission('posts.view'));

-- ============================================================
-- MESSAGING
-- ============================================================

-- Conversation membership is checked through the SECURITY DEFINER helper to avoid RLS recursion.
create policy conversations_select on public.conversations
for select using (public.is_conversation_participant(id) or public.is_admin_permission('messages.view_moderation'));

create policy conversation_participants_select on public.conversation_participants
for select using (user_id=auth.uid() or public.is_conversation_participant(conversation_id) or public.is_admin_permission('messages.view_moderation'));

create policy messages_select on public.messages
for select using (public.is_conversation_participant(conversation_id) or public.is_admin_permission('messages.view_moderation'));

-- Message/conversation creation is performed by narrow RPCs. No generic participant insert policy.

create policy message_media_select on public.message_media
for select using (exists (select 1 from public.messages m where m.id=message_id and public.is_conversation_participant(m.conversation_id)));

-- ============================================================
-- DISCOVERY / NOTIFICATIONS
-- ============================================================

create policy discovery_preferences_select on public.discovery_preferences
for select using (user_id=auth.uid());
create policy discovery_preferences_update on public.discovery_preferences
for update using (user_id=auth.uid()) with check (user_id=auth.uid());

create policy discovery_country_preference_select on public.discovery_country_preference
for select using (user_id=auth.uid());
create policy discovery_country_preference_insert on public.discovery_country_preference
for insert with check (user_id=auth.uid());
create policy discovery_country_preference_delete on public.discovery_country_preference
for delete using (user_id=auth.uid());

create policy notifications_select on public.notifications
for select using (recipient_id=auth.uid());
create policy notifications_update on public.notifications
for update using (recipient_id=auth.uid()) with check (recipient_id=auth.uid());

create policy notification_preferences_select on public.notification_preferences
for select using (user_id=auth.uid());
create policy notification_preferences_update on public.notification_preferences
for update using (user_id=auth.uid()) with check (user_id=auth.uid());

-- ============================================================
-- READ-ONLY CATALOGS
-- ============================================================

create policy language_select on public.language for select using (true);
create policy interest_select on public.interest for select using (true);
create policy legal_document_select on public.legal_document for select using (published_at is not null and published_at <= now());
create policy currencies_select on public.currencies for select using (is_active=true);
create policy payment_providers_select on public.payment_providers for select using (is_active=true);
create policy payment_methods_select on public.payment_methods for select using (is_active=true);
create policy monetization_products_select on public.monetization_products for select using (is_active=true);
create policy product_prices_select on public.product_prices for select using (is_active=true and effective_from <= now() and (effective_to is null or effective_to > now()));
create policy virtual_gifts_select on public.virtual_gifts for select using (is_active=true);

-- ============================================================
-- USER FINANCIAL READS; NO CLIENT WRITES
-- ============================================================

create policy purchases_select on public.purchases
for select using (user_id=auth.uid());
create policy payments_select on public.payments
for select using (user_id=auth.uid());
create policy payment_attempts_select on public.payment_attempts
for select using (exists (select 1 from public.payments p where p.id=payment_id and p.user_id=auth.uid()));
create policy coin_wallets_select on public.coin_wallets
for select using (user_id=auth.uid());
create policy coin_transactions_select on public.coin_transactions
for select using (exists (select 1 from public.coin_wallets w where w.id=wallet_id and w.user_id=auth.uid()));
create policy coin_transaction_entries_select on public.coin_transaction_entries
for select using (exists (select 1 from public.coin_transactions ct join public.coin_wallets w on w.id=ct.wallet_id where ct.id=coin_transaction_id and w.user_id=auth.uid()));
create policy gift_transactions_select on public.gift_transactions
for select using (sender_id=auth.uid() or recipient_id=auth.uid());
create policy refunds_select on public.refunds
for select using (exists (select 1 from public.payments p where p.id=payment_id and p.user_id=auth.uid()));

-- Financial accounting, reconciliation, system jobs, moderation evidence/audit and admin data remain privileged.

commit;
