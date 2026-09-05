-- Hi!Book 2.0 — RLS / security foundation
-- Depends on 20260904180000_initial_schema.sql.
-- Principle: RLS is a database safety boundary; server-side authorization remains authoritative for complex workflows.
-- Supabase service-role operations must never be exposed to clients.

begin;

-- ============================================================
-- SECURITY HELPERS
-- ============================================================

create or replace function public.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid();
$$;

create or replace function public.is_admin_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.admin_user_roles aur
    join public.admin_roles ar on ar.id = aur.role_id
    join public.admin_role_permissions arp on arp.role_id = ar.id
    join public.admin_permissions ap on ap.id = arp.permission_id
    join public.users u on u.id = aur.user_id
    where aur.user_id = auth.uid()
      and aur.revoked_at is null
      and u.account_status = 'ACTIVE'
      and ap.permission_key = required_permission
  );
$$;

create or replace function public.is_blocked_between(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = other_user_id)
       or (b.blocker_id = other_user_id and b.blocked_id = auth.uid())
  );
$$;

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
            select 1 from public.follows f
            where f.follower_id = other_user_id
              and f.following_id = auth.uid()
          ))
        )
    );
$$;

create or replace function public.can_view_profile(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.users u
      join public.user_privacy_settings ps on ps.user_id = u.id
      where u.id = other_user_id
        and u.account_status = 'ACTIVE'
        and (
          u.id = auth.uid()
          or (
            ps.profile_visibility = 'PUBLIC'
            and not public.is_blocked_between(other_user_id)
          )
          or (
            ps.profile_visibility = 'PRIVATE'
            and not public.is_blocked_between(other_user_id)
            and exists (
              select 1 from public.follows f
              where f.follower_id = auth.uid()
                and f.following_id = other_user_id
            )
          )
        )
    );
$$;

-- ============================================================
-- ENABLE RLS
-- ============================================================

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.user_privacy_settings enable row level security;
alter table public.user_preferences enable row level security;
alter table public.language enable row level security;
alter table public.user_language enable row level security;
alter table public.interest enable row level security;
alter table public.user_interest enable row level security;
alter table public.legal_document enable row level security;
alter table public.user_legal_acceptance enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.account_deletion_request enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.post_shares enable row level security;
alter table public.mentions enable row level security;
alter table public.post_tags enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_media enable row level security;
alter table public.discovery_preferences enable row level security;
alter table public.discovery_country_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.moderation_cases enable row level security;
alter table public.moderation_evidence enable row level security;
alter table public.moderation_notes enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.appeals enable row level security;
alter table public.moderation_audit_logs enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.admin_roles enable row level security;
alter table public.admin_role_permissions enable row level security;
alter table public.admin_user_roles enable row level security;
alter table public.platform_configurations enable row level security;
alter table public.feature_flags enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.system_jobs enable row level security;
alter table public.analytics_event_definitions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.telemetry_events enable row level security;
alter table public.analytics_daily_metrics enable row level security;
alter table public.analytics_daily_dimension_metrics enable row level security;
alter table public.currencies enable row level security;
alter table public.payment_providers enable row level security;
alter table public.payment_methods enable row level security;
alter table public.monetization_products enable row level security;
alter table public.product_prices enable row level security;
alter table public.purchases enable row level security;
alter table public.payments enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.coin_wallets enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.coin_transaction_entries enable row level security;
alter table public.financial_accounts enable row level security;
alter table public.financial_ledger_entries enable row level security;
alter table public.virtual_gifts enable row level security;
alter table public.gift_transactions enable row level security;
alter table public.refunds enable row level security;
alter table public.payment_reconciliations enable row level security;

-- ============================================================
-- ACCOUNT / IDENTITY
-- ============================================================

create policy users_self_select on public.users for select using (id = auth.uid() or public.is_admin_permission('users.view'));
create policy users_self_update on public.users for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_select on public.profiles for select using (public.can_view_profile(user_id) or public.is_admin_permission('users.view'));
create policy profiles_insert on public.profiles for insert with check (user_id = auth.uid());
create policy profiles_update on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_delete on public.profiles for delete using (user_id = auth.uid());

create policy privacy_self_select on public.user_privacy_settings for select using (user_id = auth.uid());
create policy privacy_self_insert on public.user_privacy_settings for insert with check (user_id = auth.uid());
create policy privacy_self_update on public.user_privacy_settings for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy preferences_self_all on public.user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notification_preferences_self_all on public.notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy discovery_preferences_self_all on public.discovery_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy discovery_country_preferences_self_all on public.discovery_country_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy language_public_select on public.language for select using (true);
create policy interest_public_select on public.interest for select using (true);
create policy user_language_self_all on public.user_language for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_interest_self_all on public.user_interest for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy legal_document_public_select on public.legal_document for select using (published_at is not null and published_at <= now());
create policy legal_document_admin_manage on public.legal_document for all using (public.is_admin_permission('platform.config.manage')) with check (public.is_admin_permission('platform.config.manage'));
create policy legal_acceptance_self_select on public.user_legal_acceptance for select using (user_id = auth.uid());
create policy legal_acceptance_self_insert on public.user_legal_acceptance for insert with check (user_id = auth.uid());

create policy deletion_self_select on public.account_deletion_request for select using (user_id = auth.uid());
create policy deletion_self_insert on public.account_deletion_request for insert with check (user_id = auth.uid());
create policy deletion_self_update on public.account_deletion_request for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- SOCIAL GRAPH
-- ============================================================

create policy follows_select on public.follows for select using (
  (follower_id = auth.uid() or following_id = auth.uid())
  and not public.is_blocked_between(case when follower_id = auth.uid() then following_id else follower_id end)
);
create policy follows_insert on public.follows for insert with check (
  follower_id = auth.uid()
  and follower_id <> following_id
  and not public.is_blocked_between(following_id)
  and exists (select 1 from public.users u where u.id = following_id and u.account_status = 'ACTIVE')
);
create policy follows_delete on public.follows for delete using (follower_id = auth.uid() or following_id = auth.uid());

create policy blocks_self_select on public.blocks for select using (blocker_id = auth.uid());
create policy blocks_self_insert on public.blocks for insert with check (blocker_id = auth.uid() and blocker_id <> blocked_id);
create policy blocks_self_delete on public.blocks for delete using (blocker_id = auth.uid());

create policy reports_insert on public.reports for insert with check (
  reporter_id = auth.uid()
  and not (target_type = 'USER' and target_id = auth.uid())
);
create policy reports_self_select on public.reports for select using (reporter_id = auth.uid());
create policy reports_moderator_select on public.reports for select using (public.is_admin_permission('reports.view'));
create policy reports_moderator_update on public.reports for update using (public.is_admin_permission('reports.manage')) with check (public.is_admin_permission('reports.manage'));

-- ============================================================
-- CONTENT
-- ============================================================

create policy posts_select on public.posts for select using (
  (user_id = auth.uid())
  or (
    status = 'PUBLISHED'
    and not public.is_blocked_between(user_id)
    and (
      visibility = 'PUBLIC'
      or (visibility = 'FOLLOWERS' and exists (
        select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = user_id
      ))
    )
  )
  or public.is_admin_permission('posts.view')
);
create policy posts_insert on public.posts for insert with check (user_id = auth.uid());
create policy posts_update on public.posts for update using (user_id = auth.uid() or public.is_admin_permission('posts.remove')) with check (user_id = auth.uid() or public.is_admin_permission('posts.remove'));
create policy posts_delete on public.posts for delete using (user_id = auth.uid() or public.is_admin_permission('posts.remove'));

create policy post_media_select on public.post_media for select using (
  exists (select 1 from public.posts p where p.id = post_id and (p.user_id = auth.uid() or (p.status = 'PUBLISHED' and not public.is_blocked_between(p.user_id) and (p.visibility = 'PUBLIC' or (p.visibility = 'FOLLOWERS' and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.user_id))))))
  or public.is_admin_permission('posts.view')
);
create policy post_media_insert on public.post_media for insert with check (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));
create policy post_media_update on public.post_media for update using (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())) with check (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));
create policy post_media_delete on public.post_media for delete using (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));

create policy post_likes_select on public.post_likes for select using (exists (select 1 from public.posts p where p.id = post_id and (p.user_id = auth.uid() or (p.status = 'PUBLISHED' and not public.is_blocked_between(p.user_id) and (p.visibility = 'PUBLIC' or (p.visibility = 'FOLLOWERS' and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.user_id)))))));
create policy post_likes_insert on public.post_likes for insert with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.status = 'PUBLISHED' and not public.is_blocked_between(p.user_id) and (p.visibility = 'PUBLIC' or (p.visibility = 'FOLLOWERS' and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.user_id)))));
create policy post_likes_delete on public.post_likes for delete using (user_id = auth.uid());

create policy comments_select on public.comments for select using (
  user_id = auth.uid()
  or exists (select 1 from public.posts p where p.id = post_id and p.status = 'PUBLISHED' and not public.is_blocked_between(p.user_id) and (p.visibility = 'PUBLIC' or (p.visibility = 'FOLLOWERS' and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.user_id))))
  or public.is_admin_permission('posts.view')
);
create policy comments_insert on public.comments for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.posts p where p.id = post_id and p.status = 'PUBLISHED' and not public.is_blocked_between(p.user_id) and (p.visibility = 'PUBLIC' or (p.visibility = 'FOLLOWERS' and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.user_id))))
);
create policy comments_update on public.comments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy comments_delete on public.comments for delete using (user_id = auth.uid());

create policy comment_likes_select on public.comment_likes for select using (exists (select 1 from public.comments c where c.id = comment_id and c.status = 'PUBLISHED' and exists (select 1 from public.posts p where p.id = c.post_id and p.status = 'PUBLISHED' and not public.is_blocked_between(p.user_id) and (p.visibility = 'PUBLIC' or (p.visibility = 'FOLLOWERS' and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.user_id))))));
create policy comment_likes_insert on public.comment_likes for insert with check (user_id = auth.uid() and exists (select 1 from public.comments c where c.id = comment_id and c.status = 'PUBLISHED'));
create policy comment_likes_delete on public.comment_likes for delete using (user_id = auth.uid());

create policy post_shares_select on public.post_shares for select using (user_id = auth.uid() or public.is_admin_permission('posts.view'));
create policy post_shares_insert on public.post_shares for insert with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.status = 'PUBLISHED' and not public.is_blocked_between(p.user_id) and (p.visibility = 'PUBLIC' or (p.visibility = 'FOLLOWERS' and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.user_id)))));
create policy post_shares_delete on public.post_shares for delete using (user_id = auth.uid());

create policy mentions_select on public.mentions for select using (mentioned_user_id = auth.uid() or public.is_admin_permission('posts.view'));
create policy mentions_insert on public.mentions for insert with check (
  exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
  or exists (select 1 from public.comments c where c.id = comment_id and c.user_id = auth.uid())
);
create policy mentions_delete on public.mentions for delete using (
  exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
  or exists (select 1 from public.comments c where c.id = comment_id and c.user_id = auth.uid())
);

create policy post_tags_select on public.post_tags for select using (tagged_user_id = auth.uid() or public.is_admin_permission('posts.view'));
create policy post_tags_insert on public.post_tags for insert with check (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));
create policy post_tags_delete on public.post_tags for delete using (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()) or tagged_user_id = auth.uid());

-- ============================================================
-- MESSAGING
-- ============================================================

create policy conversations_select on public.conversations for select using (exists (select 1 from public.conversation_participants cp where cp.conversation_id = id and cp.user_id = auth.uid()) or public.is_admin_permission('messages.view_moderation'));
create policy conversations_insert on public.conversations for insert with check (auth.uid() is not null);
create policy conversations_update on public.conversations for update using (exists (select 1 from public.conversation_participants cp where cp.conversation_id = id and cp.user_id = auth.uid()));

create policy conversation_participants_select on public.conversation_participants for select using (user_id = auth.uid() or exists (select 1 from public.conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid()) or public.is_admin_permission('messages.view_moderation'));
create policy conversation_participants_insert on public.conversation_participants for insert with check (exists (select 1 from public.conversations c where c.id = conversation_id));
create policy conversation_participants_update on public.conversation_participants for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy messages_select on public.messages for select using (
  exists (select 1 from public.conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid())
  or public.is_admin_permission('messages.view_moderation')
);
create policy messages_insert on public.messages for insert with check (
  sender_id = auth.uid()
  and exists (select 1 from public.conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid())
);
create policy messages_update on public.messages for update using (sender_id = auth.uid()) with check (sender_id = auth.uid());
create policy messages_delete on public.messages for delete using (sender_id = auth.uid());

create policy message_media_select on public.message_media for select using (exists (select 1 from public.messages m join public.conversation_participants cp on cp.conversation_id = m.conversation_id where m.id = message_id and cp.user_id = auth.uid()) or public.is_admin_permission('messages.view_moderation'));
create policy message_media_insert on public.message_media for insert with check (exists (select 1 from public.messages m where m.id = message_id and m.sender_id = auth.uid()));
create policy message_media_update on public.message_media for update using (exists (select 1 from public.messages m where m.id = message_id and m.sender_id = auth.uid())) with check (exists (select 1 from public.messages m where m.id = message_id and m.sender_id = auth.uid()));
create policy message_media_delete on public.message_media for delete using (exists (select 1 from public.messages m where m.id = message_id and m.sender_id = auth.uid()));

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create policy notifications_select on public.notifications for select using (recipient_id = auth.uid());
create policy notifications_update on public.notifications for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- Clients never create arbitrary notifications.
-- Inserts are performed by trusted server/worker functions.

-- ============================================================
-- MODERATION
-- ============================================================

create policy moderation_cases_select on public.moderation_cases for select using (public.is_admin_permission('moderation.cases.view'));
create policy moderation_cases_manage on public.moderation_cases for all using (public.is_admin_permission('moderation.cases.assign')) with check (public.is_admin_permission('moderation.cases.assign'));

create policy moderation_evidence_select on public.moderation_evidence for select using (public.is_admin_permission('moderation.cases.view'));
create policy moderation_evidence_manage on public.moderation_evidence for all using (public.is_admin_permission('moderation.cases.view')) with check (public.is_admin_permission('moderation.cases.view'));

create policy moderation_notes_select on public.moderation_notes for select using (public.is_admin_permission('moderation.cases.view'));
create policy moderation_notes_manage on public.moderation_notes for all using (public.is_admin_permission('moderation.cases.view')) with check (public.is_admin_permission('moderation.cases.view'));

create policy moderation_actions_select on public.moderation_actions for select using (public.is_admin_permission('moderation.cases.view'));
create policy moderation_actions_manage on public.moderation_actions for all using (public.is_admin_permission('moderation.actions.execute')) with check (public.is_admin_permission('moderation.actions.execute'));

create policy appeals_select on public.appeals for select using (appellant_id = auth.uid() or public.is_admin_permission('moderation.appeals.view'));
create policy appeals_insert on public.appeals for insert with check (appellant_id = auth.uid());
create policy appeals_update on public.appeals for update using (public.is_admin_permission('moderation.appeals.review')) with check (public.is_admin_permission('moderation.appeals.review'));

create policy moderation_audit_select on public.moderation_audit_logs for select using (public.is_admin_permission('audit_logs.view'));
-- Append-only audit records are created by trusted server functions.

-- ============================================================
-- ADMIN / OPERATIONS
-- ============================================================

create policy admin_permissions_select on public.admin_permissions for select using (public.is_admin_permission('admin.roles.manage'));
create policy admin_roles_select on public.admin_roles for select using (public.is_admin_permission('admin.roles.manage'));
create policy admin_roles_manage on public.admin_roles for all using (public.is_admin_permission('admin.roles.manage')) with check (public.is_admin_permission('admin.roles.manage'));
create policy admin_role_permissions_manage on public.admin_role_permissions for all using (public.is_admin_permission('admin.roles.manage')) with check (public.is_admin_permission('admin.roles.manage'));
create policy admin_user_roles_select on public.admin_user_roles for select using (user_id = auth.uid() or public.is_admin_permission('admin.users.manage'));
create policy admin_user_roles_manage on public.admin_user_roles for all using (public.is_admin_permission('admin.users.manage')) with check (public.is_admin_permission('admin.users.manage'));

create policy platform_config_select on public.platform_configurations for select using (public.is_admin_permission('platform.config.view'));
create policy platform_config_manage on public.platform_configurations for all using (public.is_admin_permission('platform.config.manage')) with check (public.is_admin_permission('platform.config.manage'));
create policy feature_flags_select on public.feature_flags for select using (public.is_admin_permission('feature_flags.view'));
create policy feature_flags_manage on public.feature_flags for all using (public.is_admin_permission('feature_flags.manage')) with check (public.is_admin_permission('feature_flags.manage'));
create policy admin_audit_select on public.admin_audit_logs for select using (public.is_admin_permission('audit_logs.view'));
create policy system_jobs_select on public.system_jobs for select using (public.is_admin_permission('platform.config.view'));

-- ============================================================
-- ANALYTICS / TELEMETRY
-- ============================================================

create policy analytics_event_definitions_admin on public.analytics_event_definitions for all using (public.is_admin_permission('analytics.view')) with check (public.is_admin_permission('analytics.view'));
create policy analytics_events_admin on public.analytics_events for select using (public.is_admin_permission('analytics.view'));
create policy telemetry_admin on public.telemetry_events for select using (public.is_admin_permission('analytics.view'));
create policy analytics_daily_metrics_admin on public.analytics_daily_metrics for select using (public.is_admin_permission('analytics.view'));
create policy analytics_daily_dimension_metrics_admin on public.analytics_daily_dimension_metrics for select using (public.is_admin_permission('analytics.view'));

-- ============================================================
-- FINANCE / MONETIZATION
-- ============================================================

create policy currencies_public_select on public.currencies for select using (is_active = true);
create policy payment_providers_public_select on public.payment_providers for select using (is_active = true);
create policy payment_methods_public_select on public.payment_methods for select using (is_active = true);
create policy monetization_products_public_select on public.monetization_products for select using (is_active = true);
create policy product_prices_public_select on public.product_prices for select using (is_active = true and effective_from <= now() and (effective_to is null or effective_to > now()));

create policy purchases_self_select on public.purchases for select using (user_id = auth.uid() or public.is_admin_permission('payments.view'));
create policy payments_self_select on public.payments for select using (user_id = auth.uid() or public.is_admin_permission('payments.view'));
create policy payment_attempts_self_select on public.payment_attempts for select using (exists (select 1 from public.payments p where p.id = payment_id and (p.user_id = auth.uid() or public.is_admin_permission('payments.view'))));

create policy coin_wallets_self_select on public.coin_wallets for select using (user_id = auth.uid() or public.is_admin_permission('coins.view'));
create policy coin_transactions_self_select on public.coin_transactions for select using (exists (select 1 from public.coin_wallets w where w.id = wallet_id and (w.user_id = auth.uid() or public.is_admin_permission('coins.view'))));
create policy coin_transaction_entries_self_select on public.coin_transaction_entries for select using (exists (select 1 from public.coin_transactions ct join public.coin_wallets w on w.id = ct.wallet_id where ct.id = coin_transaction_id and (w.user_id = auth.uid() or public.is_admin_permission('coins.view'))));

create policy virtual_gifts_public_select on public.virtual_gifts for select using (is_active = true);
create policy gift_transactions_select on public.gift_transactions for select using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin_permission('coins.view'));

create policy refunds_self_select on public.refunds for select using (exists (select 1 from public.purchases p where p.id = purchase_id and (p.user_id = auth.uid() or public.is_admin_permission('payments.view'))));
create policy reconciliation_admin_select on public.payment_reconciliations for select using (public.is_admin_permission('payments.reconcile'));
create policy financial_accounts_admin_select on public.financial_accounts for select using (public.is_admin_permission('financial_reports.view'));
create policy financial_ledger_entries_admin_select on public.financial_ledger_entries for select using (public.is_admin_permission('financial_reports.view'));

-- No direct client INSERT/UPDATE/DELETE policies exist for payment, wallet, coin,
-- ledger, refund or reconciliation state. Trusted server functions/workers only.

commit;
