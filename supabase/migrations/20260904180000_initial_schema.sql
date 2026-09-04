-- Hi!Book 2.0 — Canonical PostgreSQL foundation
-- Architecture phase: schema specification only.
-- This migration intentionally excludes RLS policies and seed data; those are specified separately after security review.
-- Supabase Auth remains authoritative for credentials, sessions, MFA, email and phone verification.

create extension if not exists pgcrypto;

-- ============================================================
-- ENUMS
-- ============================================================

do $$ begin
  create type account_status as enum ('PENDING_VERIFICATION','ACTIVE','SUSPENDED','DEACTIVATED','DELETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gender_type as enum ('MALE','FEMALE','UNDISCLOSED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type profile_visibility as enum ('PUBLIC','PRIVATE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_permission as enum ('EVERYONE','FOLLOWERS','NO_ONE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type theme_type as enum ('SYSTEM','LIGHT','DARK');
exception when duplicate_object then null; end $$;

do $$ begin
  create type legal_document_type as enum ('TERMS_OF_USE','PRIVACY_POLICY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deletion_status as enum ('REQUESTED','SCHEDULED','CANCELLED','COMPLETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_target_type as enum ('USER','POST','COMMENT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_reason as enum ('SPAM','HARASSMENT','HATE_OR_DISCRIMINATION','THREATS_OR_VIOLENCE','SEXUAL_CONTENT','CHILD_SAFETY','SELF_HARM','ILLEGAL_CONTENT','IMPERSONATION','SCAM_OR_FRAUD','PRIVACY_VIOLATION','COPYRIGHT','MISINFORMATION','OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('PENDING','IN_REVIEW','RESOLVED','DISMISSED','DUPLICATE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_resolution as enum ('CONTENT_REMOVED','CONTENT_RESTRICTED','USER_WARNED','USER_SUSPENDED','USER_DEACTIVATED','USER_BANNED','NO_VIOLATION','DUPLICATE_REPORT','OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_visibility as enum ('PUBLIC','FOLLOWERS','PRIVATE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum ('DRAFT','PUBLISHED','HIDDEN','REMOVED','DELETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_type as enum ('IMAGE','VIDEO','AUDIO','GIF','DOCUMENT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type comment_status as enum ('PUBLISHED','HIDDEN','REMOVED','DELETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type conversation_type as enum ('DIRECT','GROUP');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_type as enum ('TEXT','IMAGE','POST_SHARE','VIDEO','AUDIO','FILE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_status as enum ('SENT','HIDDEN','REMOVED','DELETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type country_filter_mode as enum ('ANY','SELECTED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_status as enum ('UNREAD','READ');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum ('FOLLOW','POST_LIKE','COMMENT','COMMENT_LIKE','COMMENT_REPLY','POST_SHARE','MESSAGE','MENTION','TAG','SYSTEM','MODERATION','COIN_PURCHASE','GIFT_SENT','GIFT_RECEIVED','REFUND','PAYOUT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_entity_type as enum ('USER','POST','COMMENT','MESSAGE','CONVERSATION','SYSTEM','MODERATION');
exception when duplicate_object then null; end $$;

do $$ begin
  create type moderation_target_type as enum ('USER','POST','COMMENT','MESSAGE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type moderation_source_type as enum ('USER_REPORT','AUTOMATED_DETECTION','MODERATOR','SYSTEM');
exception when duplicate_object then null; end $$;

do $$ begin
  create type moderation_priority as enum ('LOW','NORMAL','HIGH','CRITICAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type moderation_case_status as enum ('OPEN','IN_REVIEW','WAITING','ESCALATED','RESOLVED','CLOSED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type moderation_evidence_type as enum ('REPORT_DESCRIPTION','POST','COMMENT','MESSAGE','USER_PROFILE','MEDIA','SYSTEM_EVENT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type moderation_note_visibility as enum ('INTERNAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type moderation_action_type as enum ('WARNING','CONTENT_HIDDEN','CONTENT_REMOVED','CONTENT_RESTRICTED','USER_RESTRICTED','USER_SUSPENDED','USER_DEACTIVATED','USER_BANNED','MESSAGE_RESTRICTED','NO_ACTION');
exception when duplicate_object then null; end $$;

do $$ begin
  create type severity_type as enum ('LOW','MEDIUM','HIGH','CRITICAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appeal_status as enum ('SUBMITTED','IN_REVIEW','UPHELD','REVERSED','PARTIALLY_REVERSED','CLOSED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type admin_permission_resource as enum ('USERS','POSTS','REPORTS','MODERATION_CASES','MODERATION_ACTIONS','APPEALS','MESSAGES','ADMIN_USERS','PLATFORM_CONFIG','FEATURE_FLAGS','AUDIT_LOGS','PAYMENTS','COINS','PAYOUTS','FINANCIAL_REPORTS');
exception when duplicate_object then null; end $$;

do $$ begin
  create type admin_permission_action as enum ('VIEW','MANAGE','RESTRICT','SUSPEND','DEACTIVATE','REMOVE','EXECUTE','ASSIGN','REVIEW','REFUND','RECONCILE','ADJUST');
exception when duplicate_object then null; end $$;

do $$ begin
  create type currency_type as enum ('FIAT','VIRTUAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method_type as enum ('CARD','BANK_TRANSFER','MOBILE_MONEY','WALLET','APP_STORE','PLAY_STORE','OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type monetization_product_type as enum ('COIN_PACKAGE','MEMBERSHIP','SUBSCRIPTION','MEETING','GIFT','PREMIUM_FEATURE','OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fulfillment_type as enum ('HBC_CREDIT','ENTITLEMENT','SERVICE','OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type billing_interval_type as enum ('DAY','WEEK','MONTH','YEAR');
exception when duplicate_object then null; end $$;

do $$ begin
  create type purchase_status as enum ('CREATED','PENDING_PAYMENT','PAID','FULFILLED','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('INITIATED','PENDING','SUCCEEDED','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_attempt_status as enum ('INITIATED','PENDING','SUCCEEDED','FAILED','CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type wallet_status as enum ('ACTIVE','FROZEN','CLOSED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type coin_transaction_type as enum ('PURCHASE_CREDIT','GIFT_DEBIT','GIFT_REVERSAL','REFUND_CREDIT','ADMIN_ADJUSTMENT','ADMIN_REVERSAL','EXPIRATION','OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type coin_transaction_status as enum ('PENDING','COMPLETED','REVERSED','FAILED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type coin_entry_direction as enum ('CREDIT','DEBIT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type financial_account_type as enum ('ASSET','LIABILITY','REVENUE','EXPENSE','EQUITY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gift_transaction_status as enum ('PENDING','COMPLETED','REVERSED','FAILED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type refund_status as enum ('REQUESTED','PROCESSING','COMPLETED','FAILED','CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reconciliation_status as enum ('PENDING','MATCHED','DISCREPANCY','RESOLVED','FAILED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type analytics_category as enum ('AUTHENTICATION','PROFILE','SOCIAL','CONTENT','MESSAGING','DISCOVERY','NOTIFICATION','MODERATION','MONETIZATION','SYSTEM');
exception when duplicate_object then null; end $$;

do $$ begin
  create type telemetry_severity as enum ('DEBUG','INFO','WARNING','ERROR','CRITICAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED');
exception when duplicate_object then null; end $$;

-- ============================================================
-- ACCOUNT / IDENTITY
-- ============================================================

create table if not exists users (
  id uuid primary key references auth.users(id) on delete restrict,
  first_name varchar(50) not null,
  middle_name varchar(50),
  last_name varchar(50) not null,
  date_of_birth date not null,
  gender gender_type not null,
  country_code char(2) not null,
  account_status account_status not null default 'PENDING_VERIFICATION',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists profiles (
  user_id uuid primary key references users(id) on delete cascade,
  username varchar(30) not null,
  username_normalized varchar(30) not null,
  display_name varchar(80) not null,
  bio text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 500),
  constraint profiles_username_length check (char_length(username) between 3 and 30),
  constraint profiles_username_normalized_length check (char_length(username_normalized) between 3 and 30)
);
create unique index if not exists profiles_username_uq on profiles(username);
create unique index if not exists profiles_username_normalized_uq on profiles(username_normalized);
create index if not exists profiles_username_normalized_idx on profiles(username_normalized);

create table if not exists user_privacy_settings (
  user_id uuid primary key references users(id) on delete cascade,
  profile_visibility profile_visibility not null default 'PUBLIC',
  country_visibility profile_visibility not null default 'PUBLIC',
  message_permission message_permission not null default 'FOLLOWERS',
  discoverable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  language_code varchar(10) not null,
  theme theme_type not null default 'SYSTEM',
  autoplay_media boolean not null default true,
  reduced_motion boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists language (
  id uuid primary key default gen_random_uuid(),
  code varchar(20) unique not null,
  name varchar(100) unique not null,
  created_at timestamptz not null default now()
);

create table if not exists user_language (
  user_id uuid not null references users(id) on delete cascade,
  language_id uuid not null references language(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, language_id)
);

create table if not exists interest (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) unique not null,
  slug varchar(100) unique not null,
  created_at timestamptz not null default now()
);

create table if not exists user_interest (
  user_id uuid not null references users(id) on delete cascade,
  interest_id uuid not null references interest(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, interest_id)
);

create table if not exists legal_document (
  id uuid primary key default gen_random_uuid(),
  document_type legal_document_type not null,
  version varchar(50) not null,
  title varchar(200) not null,
  effective_at timestamptz not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (document_type, version)
);

create table if not exists user_legal_acceptance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete restrict,
  legal_document_id uuid not null references legal_document(id) on delete restrict,
  accepted_at timestamptz not null default now(),
  ip_address inet
);
create index if not exists user_legal_acceptance_user_idx on user_legal_acceptance(user_id, accepted_at desc);

create table if not exists notification_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  follows_enabled boolean not null default true,
  likes_enabled boolean not null default true,
  comments_enabled boolean not null default true,
  messages_enabled boolean not null default true,
  mentions_enabled boolean not null default true,
  system_enabled boolean not null default true,
  moderation_enabled boolean not null default true,
  push_enabled boolean not null default true,
  email_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists account_deletion_request (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete restrict,
  status deletion_status not null default 'REQUESTED',
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create unique index if not exists account_deletion_active_uq on account_deletion_request(user_id) where status in ('REQUESTED','SCHEDULED');

-- ============================================================
-- SOCIAL GRAPH
-- ============================================================

create table if not exists follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references users(id) on delete cascade,
  following_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_follower_idx on follows(follower_id, created_at desc);
create index if not exists follows_following_idx on follows(following_id, created_at desc);

create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references users(id) on delete cascade,
  blocked_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocker_idx on blocks(blocker_id, created_at desc);
create index if not exists blocks_blocked_idx on blocks(blocked_id, created_at desc);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id) on delete restrict,
  target_type report_target_type not null,
  target_id uuid not null,
  reason report_reason not null,
  description text,
  status report_status not null default 'PENDING',
  resolution report_resolution,
  resolved_by uuid references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (description is null or char_length(description) <= 2000),
  check ((status in ('PENDING','IN_REVIEW') and resolved_at is null) or (status in ('RESOLVED','DISMISSED','DUPLICATE'))),
  check ((resolved_at is null and resolution is null) or (resolved_at is not null and resolution is not null))
);
create index if not exists reports_reporter_idx on reports(reporter_id, created_at desc);
create index if not exists reports_target_idx on reports(target_type, target_id);
create index if not exists reports_status_idx on reports(status, created_at desc);
create unique index if not exists reports_active_uq on reports(reporter_id, target_type, target_id, reason) where status in ('PENDING','IN_REVIEW');

-- ============================================================
-- CONTENT
-- ============================================================

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  content text,
  visibility post_visibility not null default 'PUBLIC',
  status post_status not null default 'PUBLISHED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  deleted_at timestamptz,
  check (content is null or char_length(content) <= 5000),
  check ((status = 'DRAFT' and published_at is null) or (status <> 'DRAFT' and published_at is not null)),
  check ((status = 'DELETED' and deleted_at is not null) or status <> 'DELETED')
);
create index if not exists posts_user_idx on posts(user_id, created_at desc);
create index if not exists posts_feed_idx on posts(status, visibility, published_at desc);

create table if not exists post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  media_type media_type not null default 'IMAGE',
  storage_path text not null,
  mime_type varchar(100) not null,
  file_size bigint not null,
  width integer,
  height integer,
  display_order integer not null,
  alt_text text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (post_id, display_order),
  check (file_size > 0),
  check (display_order >= 0),
  check (width is null or width > 0),
  check (height is null or height > 0)
);
create index if not exists post_media_post_idx on post_media(post_id, display_order);

create table if not exists post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  parent_comment_id uuid references comments(id) on delete set null,
  content text not null,
  status comment_status not null default 'PUBLISHED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (char_length(trim(content)) between 1 and 2000)
);
create index if not exists comments_post_idx on comments(post_id, created_at desc);
create index if not exists comments_parent_idx on comments(parent_comment_id);

create table if not exists comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references comments(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create table if not exists post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists post_shares_post_idx on post_shares(post_id, created_at desc);
create index if not exists post_shares_user_idx on post_shares(user_id, created_at desc);

create table if not exists mentions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  comment_id uuid references comments(id) on delete cascade,
  mentioned_user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((post_id is null) <> (comment_id is null))
);
create index if not exists mentions_user_idx on mentions(mentioned_user_id, created_at desc);

create table if not exists post_tags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  tagged_user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, tagged_user_id)
);
create index if not exists post_tags_user_idx on post_tags(tagged_user_id, created_at desc);

-- ============================================================
-- MESSAGING
-- ============================================================

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  type conversation_type not null default 'DIRECT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table if not exists conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);
create index if not exists conversation_participants_user_idx on conversation_participants(user_id, updated_at desc);
create index if not exists conversation_participants_conversation_idx on conversation_participants(conversation_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references users(id) on delete restrict,
  message_type message_type not null default 'TEXT',
  content text,
  shared_post_id uuid references posts(id) on delete restrict,
  reply_to_message_id uuid references messages(id) on delete set null,
  status message_status not null default 'SENT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  check (content is null or char_length(content) <= 4000)
);
create index if not exists messages_conversation_idx on messages(conversation_id, created_at desc);
create index if not exists messages_sender_idx on messages(sender_id, created_at desc);
create index if not exists messages_reply_idx on messages(reply_to_message_id);
create index if not exists messages_shared_post_idx on messages(shared_post_id);

create table if not exists message_media (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  media_type media_type not null default 'IMAGE',
  storage_path text not null,
  mime_type varchar(100) not null,
  file_size bigint not null,
  width integer,
  height integer,
  display_order integer not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (message_id, display_order),
  check (file_size > 0),
  check (display_order >= 0)
);
create index if not exists message_media_message_idx on message_media(message_id, display_order);

-- ============================================================
-- DISCOVERY
-- ============================================================

create table if not exists discovery_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  country_filter_mode country_filter_mode not null default 'ANY',
  interest_matching_enabled boolean not null default true,
  language_matching_enabled boolean not null default true,
  global_discovery_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists discovery_country_preference (
  user_id uuid not null references users(id) on delete cascade,
  country_code char(2) not null,
  created_at timestamptz not null default now(),
  primary key (user_id, country_code)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references users(id) on delete cascade,
  actor_id uuid references users(id) on delete set null,
  type notification_type not null,
  entity_type notification_entity_type,
  entity_id uuid,
  content text,
  status notification_status not null default 'UNREAD',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (content is null or char_length(content) <= 500),
  check ((status = 'READ' and read_at is not null) or (status = 'UNREAD' and read_at is null))
);
create index if not exists notifications_recipient_idx on notifications(recipient_id, created_at desc);
create index if not exists notifications_unread_idx on notifications(recipient_id, created_at desc) where status = 'UNREAD';
create index if not exists notifications_actor_idx on notifications(actor_id, created_at desc);
create index if not exists notifications_entity_idx on notifications(entity_type, entity_id);

-- ============================================================
-- MODERATION / SAFETY
-- ============================================================

create table if not exists moderation_cases (
  id uuid primary key default gen_random_uuid(),
  case_number varchar(50) unique not null,
  target_type moderation_target_type not null,
  target_id uuid not null,
  source_type moderation_source_type not null,
  priority moderation_priority not null default 'NORMAL',
  status moderation_case_status not null default 'OPEN',
  assigned_to uuid references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz
);
create index if not exists moderation_cases_target_idx on moderation_cases(target_type, target_id);
create index if not exists moderation_cases_status_idx on moderation_cases(status, priority, created_at desc);

create table if not exists moderation_evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references moderation_cases(id) on delete restrict,
  evidence_type moderation_evidence_type not null,
  source_type varchar(50),
  source_id uuid,
  storage_path text,
  metadata jsonb,
  captured_at timestamptz,
  created_by uuid references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists moderation_evidence_case_idx on moderation_evidence(case_id, created_at);

create table if not exists moderation_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references moderation_cases(id) on delete restrict,
  author_id uuid not null references users(id) on delete restrict,
  content text not null,
  visibility moderation_note_visibility not null default 'INTERNAL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (char_length(content) <= 5000)
);
create index if not exists moderation_notes_case_idx on moderation_notes(case_id, created_at);

create table if not exists moderation_actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references moderation_cases(id) on delete restrict,
  target_type moderation_target_type not null,
  target_id uuid not null,
  action_type moderation_action_type not null,
  reason text,
  severity severity_type not null default 'MEDIUM',
  performed_by uuid references users(id) on delete restrict,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (expires_at is null or expires_at > starts_at)
);
create index if not exists moderation_actions_target_idx on moderation_actions(target_type, target_id, starts_at desc);
create index if not exists moderation_actions_case_idx on moderation_actions(case_id, created_at desc);

create table if not exists appeals (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references moderation_actions(id) on delete restrict,
  appellant_id uuid not null references users(id) on delete restrict,
  reason text not null,
  status appeal_status not null default 'SUBMITTED',
  reviewed_by uuid references users(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text
);
create unique index if not exists appeals_active_uq on appeals(action_id) where status in ('SUBMITTED','IN_REVIEW');
create index if not exists appeals_appellant_idx on appeals(appellant_id, submitted_at desc);

create table if not exists moderation_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  action_type varchar(100) not null,
  target_type varchar(50),
  target_id uuid,
  case_id uuid references moderation_cases(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists moderation_audit_logs_case_idx on moderation_audit_logs(case_id, created_at desc);
create index if not exists moderation_audit_logs_target_idx on moderation_audit_logs(target_type, target_id, created_at desc);

-- ============================================================
-- ADMIN / OPERATIONS
-- ============================================================

create table if not exists admin_permissions (
  id uuid primary key default gen_random_uuid(),
  permission_key varchar(150) unique not null,
  name varchar(150) not null,
  description text,
  resource admin_permission_resource not null,
  action admin_permission_action not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_roles (
  id uuid primary key default gen_random_uuid(),
  role_key varchar(100) unique not null,
  name varchar(150) not null,
  description text,
  is_system_role boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_role_permissions (
  role_id uuid not null references admin_roles(id) on delete cascade,
  permission_id uuid not null references admin_permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists admin_user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete restrict,
  role_id uuid not null references admin_roles(id) on delete restrict,
  assigned_by uuid references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create unique index if not exists admin_user_roles_active_uq on admin_user_roles(user_id, role_id) where revoked_at is null;
create index if not exists admin_user_roles_user_idx on admin_user_roles(user_id);

create table if not exists platform_configurations (
  id uuid primary key default gen_random_uuid(),
  config_key varchar(150) unique not null,
  config_value jsonb not null,
  value_type varchar(20) not null,
  description text,
  is_sensitive boolean not null default false,
  updated_by uuid references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (value_type in ('STRING','INTEGER','DECIMAL','BOOLEAN','JSON'))
);

create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  flag_key varchar(150) not null,
  name varchar(150) not null,
  description text,
  enabled boolean not null default false,
  rollout_percentage numeric(5,2) not null default 0,
  environment varchar(20) not null,
  created_by uuid references users(id) on delete restrict,
  updated_by uuid references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (flag_key, environment),
  check (rollout_percentage between 0 and 100),
  check (environment in ('DEVELOPMENT','STAGING','PRODUCTION'))
);

create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  action_type varchar(100) not null,
  target_type varchar(50),
  target_id uuid,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_logs_actor_idx on admin_audit_logs(actor_id, created_at desc);
create index if not exists admin_audit_logs_target_idx on admin_audit_logs(target_type, target_id, created_at desc);

create table if not exists system_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type varchar(100) not null,
  status job_status not null default 'QUEUED',
  priority integer not null default 100,
  attempts integer not null default 0,
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  last_error text,
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (attempts >= 0)
);
create index if not exists system_jobs_queue_idx on system_jobs(status, priority, scheduled_at);

-- ============================================================
-- ANALYTICS / TELEMETRY
-- ============================================================

create table if not exists analytics_event_definitions (
  id uuid primary key default gen_random_uuid(),
  event_name varchar(150) unique not null,
  description text,
  category analytics_category not null,
  schema_version integer not null default 1,
  payload_schema jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (schema_version > 0)
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name varchar(150) not null,
  event_version integer not null,
  user_id uuid references users(id) on delete set null,
  session_id uuid,
  anonymous_id uuid,
  entity_type varchar(50),
  entity_id uuid,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  properties jsonb,
  context jsonb,
  created_at timestamptz not null default now(),
  check (event_version > 0)
);
create index if not exists analytics_events_user_idx on analytics_events(user_id, occurred_at desc);
create index if not exists analytics_events_name_idx on analytics_events(event_name, occurred_at desc);
create index if not exists analytics_events_entity_idx on analytics_events(entity_type, entity_id, occurred_at desc);

create table if not exists telemetry_events (
  id uuid primary key default gen_random_uuid(),
  event_name varchar(150) not null,
  severity telemetry_severity not null,
  service varchar(100) not null,
  environment varchar(20) not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  trace_id varchar(200),
  request_id varchar(200),
  user_id uuid references users(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists telemetry_events_time_idx on telemetry_events(occurred_at desc);
create index if not exists telemetry_events_service_idx on telemetry_events(service, occurred_at desc);
create index if not exists telemetry_events_severity_idx on telemetry_events(severity, occurred_at desc);

create table if not exists analytics_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_date date not null,
  metric_key varchar(150) not null,
  metric_value numeric(30,6) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (metric_date, metric_key)
);

create table if not exists analytics_daily_dimension_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_date date not null,
  metric_key varchar(150) not null,
  dimension_type varchar(50) not null,
  dimension_value varchar(150) not null,
  metric_value numeric(30,6) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (metric_date, metric_key, dimension_type, dimension_value)
);

-- ============================================================
-- PAYMENTS / MONETIZATION / FINANCE
-- ============================================================

create table if not exists currencies (
  id uuid primary key default gen_random_uuid(),
  code varchar(20) unique not null,
  name varchar(100) not null,
  currency_type currency_type not null,
  decimal_places smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (decimal_places between 0 and 18)
);

create table if not exists payment_providers (
  id uuid primary key default gen_random_uuid(),
  provider_key varchar(100) unique not null,
  name varchar(150) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payment_methods (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references payment_providers(id) on delete restrict,
  method_key varchar(100) not null,
  name varchar(150) not null,
  method_type payment_method_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, method_key)
);

create table if not exists monetization_products (
  id uuid primary key default gen_random_uuid(),
  product_key varchar(150) unique not null,
  name varchar(200) not null,
  description text,
  product_type monetization_product_type not null,
  fulfillment_type fulfillment_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references monetization_products(id) on delete restrict,
  currency_id uuid not null references currencies(id) on delete restrict,
  unit_amount bigint not null,
  billing_interval billing_interval_type,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (unit_amount > 0),
  check (effective_to is null or effective_to > effective_from)
);
create index if not exists product_prices_product_idx on product_prices(product_id, currency_id, effective_from desc);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete restrict,
  product_id uuid not null references monetization_products(id) on delete restrict,
  product_price_id uuid not null references product_prices(id) on delete restrict,
  quantity bigint not null default 1,
  currency_id uuid not null references currencies(id) on delete restrict,
  unit_amount bigint not null,
  total_amount bigint not null,
  status purchase_status not null default 'CREATED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  check (quantity > 0),
  check (unit_amount > 0),
  check (total_amount > 0)
);
create index if not exists purchases_user_idx on purchases(user_id, created_at desc);
create index if not exists purchases_status_idx on purchases(status, created_at desc);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete restrict,
  user_id uuid not null references users(id) on delete restrict,
  provider_id uuid not null references payment_providers(id) on delete restrict,
  currency_id uuid not null references currencies(id) on delete restrict,
  amount bigint not null,
  provider_reference varchar(255) not null,
  status payment_status not null default 'INITIATED',
  provider_status varchar(150),
  paid_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount > 0),
  unique (provider_id, provider_reference)
);
create index if not exists payments_user_idx on payments(user_id, created_at desc);
create index if not exists payments_provider_idx on payments(provider_id, created_at desc);
create index if not exists payments_status_idx on payments(status, created_at desc);

create table if not exists payment_attempts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete restrict,
  provider_id uuid not null references payment_providers(id) on delete restrict,
  attempt_number integer not null,
  provider_reference varchar(255) not null,
  status payment_attempt_status not null default 'INITIATED',
  requested_amount bigint not null,
  currency_id uuid not null references currencies(id) on delete restrict,
  error_code varchar(150),
  error_message text,
  initiated_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (payment_id, attempt_number),
  unique (provider_id, provider_reference),
  check (attempt_number > 0),
  check (requested_amount > 0)
);

create table if not exists coin_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete restrict,
  currency_id uuid not null references currencies(id) on delete restrict,
  available_balance bigint not null default 0,
  status wallet_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, currency_id),
  check (available_balance >= 0)
);

create table if not exists coin_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references coin_wallets(id) on delete restrict,
  transaction_type coin_transaction_type not null,
  status coin_transaction_status not null default 'PENDING',
  reference_type varchar(100),
  reference_id uuid,
  description text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists coin_transactions_wallet_idx on coin_transactions(wallet_id, created_at desc);
create index if not exists coin_transactions_reference_idx on coin_transactions(reference_type, reference_id);

create table if not exists coin_transaction_entries (
  id uuid primary key default gen_random_uuid(),
  coin_transaction_id uuid not null references coin_transactions(id) on delete restrict,
  account_type varchar(50) not null,
  wallet_id uuid references coin_wallets(id) on delete restrict,
  direction coin_entry_direction not null,
  amount bigint not null,
  created_at timestamptz not null default now(),
  check (amount > 0)
);
create index if not exists coin_transaction_entries_transaction_idx on coin_transaction_entries(coin_transaction_id);
create index if not exists coin_transaction_entries_wallet_idx on coin_transaction_entries(wallet_id, created_at desc);

create table if not exists financial_accounts (
  id uuid primary key default gen_random_uuid(),
  account_code varchar(100) unique not null,
  account_name varchar(200) not null,
  account_type financial_account_type not null,
  currency_id uuid not null references currencies(id) on delete restrict,
  status varchar(30) not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('ACTIVE','FROZEN','CLOSED'))
);

create table if not exists financial_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_group_id uuid not null,
  account_id uuid not null references financial_accounts(id) on delete restrict,
  currency_id uuid not null references currencies(id) on delete restrict,
  direction coin_entry_direction not null,
  amount bigint not null,
  reference_type varchar(100),
  reference_id uuid,
  description text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  reversed_entry_id uuid references financial_ledger_entries(id) on delete restrict,
  check (amount > 0)
);
create index if not exists financial_ledger_account_idx on financial_ledger_entries(account_id, occurred_at desc);
create index if not exists financial_ledger_group_idx on financial_ledger_entries(transaction_group_id);
create index if not exists financial_ledger_reference_idx on financial_ledger_entries(reference_type, reference_id);

create table if not exists virtual_gifts (
  id uuid primary key default gen_random_uuid(),
  gift_key varchar(100) unique not null,
  name varchar(150) not null,
  description text,
  icon_path text,
  hbc_price bigint not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (hbc_price > 0)
);

create table if not exists gift_transactions (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references virtual_gifts(id) on delete restrict,
  sender_id uuid not null references users(id) on delete restrict,
  recipient_id uuid not null references users(id) on delete restrict,
  quantity bigint not null default 1,
  unit_price_hbc bigint not null,
  total_hbc bigint not null,
  status gift_transaction_status not null default 'PENDING',
  message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (sender_id <> recipient_id),
  check (quantity > 0),
  check (unit_price_hbc > 0),
  check (total_hbc > 0),
  check (message is null or char_length(message) <= 500)
);
create index if not exists gift_transactions_sender_idx on gift_transactions(sender_id, created_at desc);
create index if not exists gift_transactions_recipient_idx on gift_transactions(recipient_id, created_at desc);
create index if not exists gift_transactions_status_idx on gift_transactions(status, created_at desc);

create table if not exists refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete restrict,
  purchase_id uuid not null references purchases(id) on delete restrict,
  amount bigint not null,
  currency_id uuid not null references currencies(id) on delete restrict,
  reason text,
  status refund_status not null default 'REQUESTED',
  provider_reference varchar(255),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (amount > 0)
);
create index if not exists refunds_payment_idx on refunds(payment_id, created_at desc);
create index if not exists refunds_purchase_idx on refunds(purchase_id, created_at desc);
create index if not exists refunds_status_idx on refunds(status, created_at desc);

create table if not exists payment_reconciliations (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references payment_providers(id) on delete restrict,
  reconciliation_date date not null,
  currency_id uuid not null references currencies(id) on delete restrict,
  expected_count bigint not null default 0,
  expected_amount bigint not null default 0,
  provider_count bigint not null default 0,
  provider_amount bigint not null default 0,
  discrepancy_count bigint not null default 0,
  discrepancy_amount bigint not null default 0,
  status reconciliation_status not null default 'PENDING',
  notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (provider_id, reconciliation_date, currency_id),
  check (expected_count >= 0 and provider_count >= 0 and discrepancy_count >= 0),
  check (expected_amount >= 0 and provider_amount >= 0 and discrepancy_amount >= 0)
);

-- ============================================================
-- BASIC CROSS-ROW VALIDATION FUNCTIONS
-- ============================================================

create or replace function validate_comment_parent()
returns trigger
language plpgsql
as $$
begin
  if new.parent_comment_id is not null then
    if not exists (
      select 1 from comments c
      where c.id = new.parent_comment_id
        and c.post_id = new.post_id
        and c.parent_comment_id is null
    ) then
      raise exception 'Comment parent must be a top-level comment on the same post';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists comments_validate_parent on comments;
create trigger comments_validate_parent
before insert or update of parent_comment_id, post_id on comments
for each row execute function validate_comment_parent();

create or replace function validate_message_reply()
returns trigger
language plpgsql
as $$
begin
  if new.reply_to_message_id is not null then
    if not exists (
      select 1 from messages m
      where m.id = new.reply_to_message_id
        and m.conversation_id = new.conversation_id
    ) then
      raise exception 'Message reply must reference a message in the same conversation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_validate_reply on messages;
create trigger messages_validate_reply
before insert or update of reply_to_message_id, conversation_id on messages
for each row execute function validate_message_reply();

create or replace function validate_direct_conversation_participant_count()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from conversations c
    where c.id = new.conversation_id
      and c.type = 'DIRECT'
      and (select count(*) from conversation_participants cp where cp.conversation_id = c.id) > 2
  ) then
    raise exception 'DIRECT conversation cannot have more than two participants';
  end if;
  return new;
end;
$$;

drop trigger if exists conversation_participants_validate_direct_count on conversation_participants;
create constraint trigger conversation_participants_validate_direct_count
after insert or update of conversation_id on conversation_participants
deferrable initially deferred
for each row execute function validate_direct_conversation_participant_count();

-- ============================================================
-- NOTES FOR FOLLOW-UP SECURITY MIGRATION
-- ============================================================
-- 1. Add RLS to every user-facing table.
-- 2. Add SECURITY DEFINER authorization helpers carefully, with fixed search_path.
-- 3. Add exact Supabase Storage bucket/policy definitions.
-- 4. Add transactional block->unfollow behavior.
-- 5. Add canonical direct-conversation pair enforcement.
-- 6. Add post/message type/media consistency triggers.
-- 7. Add post text-or-media existence validation at transaction boundary.
-- 8. Add financial double-entry balance validation and immutable-ledger protections.
-- 9. Add wallet atomic debit/credit functions.
-- 10. Add idempotent payment/fulfillment/outbox functions.
-- 11. Add account-deletion worker/state transitions.
-- 12. Add minor-safety policy enforcement before production.
