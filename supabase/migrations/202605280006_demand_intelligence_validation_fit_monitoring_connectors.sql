alter table demand_intelligence_runs
  add column if not exists real_sources_enabled boolean not null default false,
  add column if not exists source_status_summary jsonb not null default '{}'::jsonb,
  add column if not exists validation_summary jsonb not null default '{}'::jsonb,
  add column if not exists solution_fit_summary jsonb not null default '{}'::jsonb,
  add column if not exists monitoring_summary jsonb not null default '{}'::jsonb;

alter table demand_intelligence_clusters
  add column if not exists validation_score numeric not null default 0,
  add column if not exists fit_score numeric,
  add column if not exists trend_status text not null default 'unknown',
  add column if not exists source_diversity integer not null default 0,
  add column if not exists noise_ratio numeric not null default 0,
  add column if not exists duplicate_ratio numeric not null default 0,
  add column if not exists evidence_quality_score numeric not null default 0;

alter table demand_intelligence_signals
  add column if not exists external_id text,
  add column if not exists connector_key text,
  add column if not exists quality_score numeric not null default 0,
  add column if not exists noise_score numeric not null default 0,
  add column if not exists spam_score numeric not null default 0,
  add column if not exists duplicate_group_id text,
  add column if not exists validation_score numeric not null default 0;

create table if not exists demand_signal_validations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references demand_intelligence_runs(id) on delete cascade,
  cluster_id uuid null references demand_intelligence_clusters(id) on delete cascade,
  signal_id uuid null references demand_intelligence_signals(id) on delete cascade,
  validation_target text not null check (validation_target in ('signal', 'cluster', 'run_summary')),
  validation_score numeric not null default 0,
  confidence numeric not null default 0,
  cross_source_confirmed boolean not null default false,
  source_diversity integer not null default 0,
  duplicate_ratio numeric not null default 0,
  noise_ratio numeric not null default 0,
  spam_ratio numeric not null default 0,
  recency_score numeric not null default 0,
  continuity_score numeric not null default 0,
  bias_warnings jsonb not null default '[]'::jsonb,
  validation_reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists demand_solution_fits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references demand_intelligence_runs(id) on delete cascade,
  project_id uuid null references ad_projects(id) on delete set null,
  ad_lp_pair_id uuid null references ad_lp_pairs(id) on delete set null,
  cluster_id uuid null references demand_intelligence_clusters(id) on delete cascade,
  fit_target_type text not null check (fit_target_type in ('app_idea', 'ad_copy', 'lp_hero', 'lp_offer', 'feature', 'positioning', 'pair')),
  fit_target_id text null,
  fit_target_text text not null,
  fit_score numeric not null default 0,
  coverage_score numeric not null default 0,
  gap_score numeric not null default 0,
  confidence numeric not null default 0,
  matched_pains jsonb not null default '[]'::jsonb,
  unmatched_pains jsonb not null default '[]'::jsonb,
  recommended_adjustments jsonb not null default '[]'::jsonb,
  evidence_signal_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists demand_signal_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid null references ad_projects(id) on delete set null,
  ad_lp_pair_id uuid null references ad_lp_pairs(id) on delete set null,
  run_id uuid null references demand_intelligence_runs(id) on delete set null,
  cluster_id uuid null references demand_intelligence_clusters(id) on delete set null,
  cluster_name text not null,
  cluster_type text not null,
  category text null,
  snapshot_date date not null default current_date,
  signal_count integer not null default 0,
  source_count integer not null default 0,
  demand_signal_score numeric not null default 0,
  validation_score numeric not null default 0,
  fit_score numeric null,
  growth_7d numeric null,
  growth_30d numeric null,
  growth_90d numeric null,
  trend_status text not null default 'unknown' check (trend_status in ('unknown', 'emerging', 'growing', 'stable', 'declining', 'spike', 'noise')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists demand_source_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references demand_intelligence_runs(id) on delete cascade,
  source_type text not null,
  query text not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'partial', 'failed', 'skipped')),
  requested_count integer not null default 0,
  collected_count integer not null default 0,
  stored_count integer not null default 0,
  error_message text null,
  started_at timestamptz null,
  completed_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists demand_connector_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid null references demand_intelligence_runs(id) on delete cascade,
  source_run_id uuid null references demand_source_runs(id) on delete cascade,
  connector_key text not null,
  level text not null default 'info' check (level in ('debug', 'info', 'warning', 'error')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists demand_signal_validations_run_idx on demand_signal_validations(run_id);
create index if not exists demand_solution_fits_run_idx on demand_solution_fits(run_id);
create index if not exists demand_signal_snapshots_pair_idx on demand_signal_snapshots(ad_lp_pair_id, cluster_name, snapshot_date desc);
create index if not exists demand_source_runs_run_idx on demand_source_runs(run_id);
create index if not exists demand_connector_logs_run_idx on demand_connector_logs(run_id);

alter table demand_signal_validations enable row level security;
alter table demand_solution_fits enable row level security;
alter table demand_signal_snapshots enable row level security;
alter table demand_source_runs enable row level security;
alter table demand_connector_logs enable row level security;

create policy "Users manage own demand signal validations" on demand_signal_validations
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own demand solution fits" on demand_solution_fits
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own demand signal snapshots" on demand_signal_snapshots
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own demand source runs" on demand_source_runs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own demand connector logs" on demand_connector_logs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
