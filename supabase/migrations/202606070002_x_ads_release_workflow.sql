alter table twitter_ads
  add column if not exists x_connection_id uuid null,
  add column if not exists x_account_id text null,
  add column if not exists x_campaign_id text null,
  add column if not exists x_line_item_id text null,
  add column if not exists x_tweet_id text null,
  add column if not exists x_promoted_tweet_id text null,
  add column if not exists source text not null default 'manual',
  add column if not exists last_synced_at timestamptz null,
  add column if not exists sync_metadata jsonb not null default '{}'::jsonb;

create table if not exists x_ads_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  x_user_id text null,
  x_username text null,
  encrypted_access_token text not null,
  encrypted_access_token_secret text not null,
  scopes text[] not null default '{}'::text[],
  status text not null default 'pending' check (status in ('pending', 'active', 'invalid', 'revoked')),
  last_verified_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table twitter_ads
  drop constraint if exists twitter_ads_x_connection_id_fkey;
alter table twitter_ads
  add constraint twitter_ads_x_connection_id_fkey
  foreign key (x_connection_id) references x_ads_connections(id) on delete set null;

create table if not exists x_ads_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references x_ads_connections(id) on delete cascade,
  x_account_id text not null,
  name text not null,
  currency text null,
  timezone text null,
  permissions text[] not null default '{}'::text[],
  promotable_users jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  last_synced_at timestamptz null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, connection_id, x_account_id)
);

create table if not exists x_ads_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid null references ad_projects(id) on delete set null,
  twitter_ad_id uuid null references twitter_ads(id) on delete set null,
  connection_id uuid not null references x_ads_connections(id) on delete cascade,
  x_account_id text not null,
  x_campaign_id text null,
  x_line_item_id text null,
  x_tweet_id text null,
  snapshot_date date not null,
  granularity text not null default 'DAY',
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  conversions bigint not null default 0,
  spend numeric not null default 0,
  engagements bigint not null default 0,
  video_views bigint not null default 0,
  raw_metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, connection_id, x_account_id, x_tweet_id, snapshot_date, granularity)
);

create table if not exists x_ads_publish_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid null references ad_projects(id) on delete set null,
  ad_lp_pair_id uuid not null references ad_lp_pairs(id) on delete cascade,
  source_ad_id uuid not null references twitter_ads(id) on delete cascade,
  source_ai_result_id uuid not null references ai_agent_results(id) on delete cascade,
  connection_id uuid not null references x_ads_connections(id) on delete restrict,
  x_account_id text not null,
  x_line_item_id text not null,
  proposed_text text not null,
  destination_url text not null,
  hypothesis text null,
  primary_metric text not null default 'ctr' check (primary_metric in ('ctr', 'cvr', 'cpc')),
  risk_level text null,
  approval_status text not null default 'draft' check (approval_status in ('draft', 'approved', 'rejected')),
  publish_status text not null default 'not_started' check (publish_status in ('not_started', 'publishing', 'published', 'failed')),
  idempotency_key text not null,
  approved_by uuid null references auth.users(id) on delete set null,
  approved_at timestamptz null,
  published_at timestamptz null,
  published_tweet_id text null,
  promoted_tweet_id text null,
  created_ad_id uuid null references twitter_ads(id) on delete set null,
  ab_test_id uuid null references ad_ab_tests(id) on delete set null,
  outcome_id uuid null references improvement_outcomes(id) on delete set null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists x_ads_publish_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  publish_request_id uuid not null references x_ads_publish_requests(id) on delete cascade,
  event_type text not null,
  status text not null,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  error_message text null,
  created_at timestamptz not null default now()
);

create index if not exists x_ads_connections_user_idx on x_ads_connections(user_id, created_at desc);
create index if not exists x_ads_accounts_connection_idx on x_ads_accounts(user_id, connection_id);
create index if not exists x_ads_metric_snapshots_ad_idx on x_ads_metric_snapshots(user_id, twitter_ad_id, snapshot_date desc);
create index if not exists x_ads_publish_requests_project_idx on x_ads_publish_requests(user_id, project_id, created_at desc);
create index if not exists x_ads_publish_events_request_idx on x_ads_publish_events(user_id, publish_request_id, created_at asc);

alter table x_ads_connections enable row level security;
alter table x_ads_accounts enable row level security;
alter table x_ads_metric_snapshots enable row level security;
alter table x_ads_publish_requests enable row level security;
alter table x_ads_publish_events enable row level security;

drop policy if exists "Users manage own x ads connections" on x_ads_connections;
create policy "Users manage own x ads connections" on x_ads_connections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own x ads accounts" on x_ads_accounts;
create policy "Users manage own x ads accounts" on x_ads_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own x ads metric snapshots" on x_ads_metric_snapshots;
create policy "Users manage own x ads metric snapshots" on x_ads_metric_snapshots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own x ads publish requests" on x_ads_publish_requests;
create policy "Users manage own x ads publish requests" on x_ads_publish_requests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own x ads publish events" on x_ads_publish_events;
create policy "Users manage own x ads publish events" on x_ads_publish_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists x_ads_connections_updated_at on x_ads_connections;
create trigger x_ads_connections_updated_at before update on x_ads_connections for each row execute function set_adflow_updated_at();
drop trigger if exists x_ads_accounts_updated_at on x_ads_accounts;
create trigger x_ads_accounts_updated_at before update on x_ads_accounts for each row execute function set_adflow_updated_at();
drop trigger if exists x_ads_publish_requests_updated_at on x_ads_publish_requests;
create trigger x_ads_publish_requests_updated_at before update on x_ads_publish_requests for each row execute function set_adflow_updated_at();
