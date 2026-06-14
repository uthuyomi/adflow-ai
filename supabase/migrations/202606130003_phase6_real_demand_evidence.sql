alter table demand_intelligence_runs
  add column if not exists evidence_summary jsonb not null default '{}'::jsonb,
  add column if not exists demand_score_summary jsonb not null default '{}'::jsonb,
  add column if not exists competitor_summary jsonb not null default '{}'::jsonb,
  add column if not exists learning_context jsonb not null default '{}'::jsonb;

alter table demand_source_runs drop constraint if exists demand_source_runs_status_check;
alter table demand_source_runs add constraint demand_source_runs_status_check
  check (status in ('pending', 'running', 'completed', 'partial', 'failed', 'skipped', 'unavailable'));

create table if not exists demand_connector_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connector_key text not null,
  fingerprint text not null,
  query text not null,
  request_payload jsonb not null default '{}'::jsonb,
  signals jsonb not null default '[]'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, connector_key, fingerprint)
);

create table if not exists demand_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references demand_intelligence_runs(id) on delete cascade,
  signal_id uuid not null references demand_intelligence_signals(id) on delete cascade,
  source_type text not null,
  source_url text not null,
  connector text not null,
  title text not null,
  quote text not null,
  collected_at timestamptz not null,
  relevance_score numeric not null default 0 check (relevance_score between 0 and 100),
  analysis_reference text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, run_id, signal_id, analysis_reference)
);

create table if not exists demand_competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references demand_intelligence_runs(id) on delete cascade,
  name text not null,
  domain text not null,
  source_url text not null,
  category text not null,
  source_type text not null,
  comparison_data jsonb not null default '{}'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb,
  collected_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(user_id, run_id, domain)
);

create table if not exists demand_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references demand_intelligence_runs(id) on delete cascade,
  project_id uuid null references ad_projects(id) on delete set null,
  ad_lp_pair_id uuid null references ad_lp_pairs(id) on delete set null,
  score numeric not null check (score between 0 and 100),
  search_demand numeric not null default 0,
  competitor_density numeric not null default 0,
  review_pain numeric not null default 0,
  trend_strength numeric not null default 0,
  social_discussion numeric not null default 0,
  growth_signal numeric not null default 0,
  weights jsonb not null default '{}'::jsonb,
  reasons jsonb not null default '[]'::jsonb,
  evidence_count integer not null default 0,
  real_source_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, run_id)
);

create table if not exists demand_learning_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references demand_intelligence_runs(id) on delete cascade,
  project_id uuid null references ad_projects(id) on delete set null,
  market_type text not null,
  signal_quality numeric not null default 0,
  competitor_density numeric not null default 0,
  trend_strength numeric not null default 0,
  evidence_count integer not null default 0,
  discovery_score numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, run_id)
);

create index if not exists demand_evidence_run_idx on demand_evidence(user_id, run_id, relevance_score desc);
create index if not exists demand_competitors_run_idx on demand_competitors(user_id, run_id);
create index if not exists demand_scores_project_idx on demand_scores(user_id, project_id, created_at desc);
create index if not exists demand_learning_contexts_project_idx on demand_learning_contexts(user_id, project_id, created_at desc);
create index if not exists demand_connector_cache_lookup_idx on demand_connector_cache(user_id, connector_key, fingerprint, expires_at desc);

alter table demand_evidence enable row level security;
alter table demand_competitors enable row level security;
alter table demand_scores enable row level security;
alter table demand_learning_contexts enable row level security;
alter table demand_connector_cache enable row level security;

create policy "Users read own demand evidence" on demand_evidence for select using (auth.uid() = user_id);
create policy "Users read own demand competitors" on demand_competitors for select using (auth.uid() = user_id);
create policy "Users read own demand scores" on demand_scores for select using (auth.uid() = user_id);
create policy "Users read own demand learning contexts" on demand_learning_contexts for select using (auth.uid() = user_id);
create policy "Users read own demand connector cache" on demand_connector_cache for select using (auth.uid() = user_id);
