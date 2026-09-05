-- Hi!Book 2.0 — Discovery schema
-- Discovery preferences are stored separately from user_privacy_settings.
-- user_privacy_settings.discoverable controls whether the user may be discovered;
-- these tables control what the user wants to discover.

create table if not exists discovery_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  country_filter_mode country_filter_mode not null default 'ANY',
  interest_matching_enabled boolean not null default true,
  language_matching_enabled boolean not null default true,
  global_discovery_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists discovery_country_preferences (
  user_id uuid not null references users(id) on delete cascade,
  country_code char(2) not null,
  created_at timestamptz not null default now(),
  primary key (user_id, country_code)
);

create index if not exists discovery_country_preferences_country_idx
  on discovery_country_preferences(country_code);

comment on table discovery_preferences is
  'Private preferences describing what a user wants to discover; distinct from profile discoverability.';
comment on table discovery_country_preferences is
  'Private normalized country preferences used when country_filter_mode is SELECTED.';
