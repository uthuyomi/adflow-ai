alter table demand_intelligence_runs
  add column if not exists search_demand_summary jsonb not null default '{}'::jsonb,
  add column if not exists market_size_summary jsonb not null default '{}'::jsonb,
  add column if not exists outcome_learning_summary jsonb not null default '{}'::jsonb;

create table if not exists demand_search_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references demand_intelligence_runs(id) on delete cascade,
  project_id uuid null references ad_projects(id) on delete set null,
  ad_lp_pair_id uuid null references ad_lp_pairs(id) on delete set null,
  query text not null,
  keyword text not null,
  source_type text not null,
  search_volume_estimate integer null,
  competition_level text null,
  cpc_estimate numeric null,
  related_keywords jsonb not null default '[]'::jsonb,
  suggest_queries jsonb not null default '[]'::jsonb,
  people_also_ask jsonb not null default '[]'::jsonb,
  trend_status text not null default 'unknown',
  confidence numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists demand_market_size_estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references demand_intelligence_runs(id) on delete cascade,
  project_id uuid null references ad_projects(id) on delete set null,
  ad_lp_pair_id uuid null references ad_lp_pairs(id) on delete set null,
  cluster_id uuid null references demand_intelligence_clusters(id) on delete set null,
  segment_name text not null,
  persona text null,
  estimated_audience_size_min integer null,
  estimated_audience_size_max integer null,
  search_demand_score numeric not null default 0,
  pain_signal_score numeric not null default 0,
  competitor_gap_score numeric not null default 0,
  market_size_score numeric not null default 0,
  confidence numeric not null default 0,
  assumptions jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists demand_outcome_learning_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid null references demand_intelligence_runs(id) on delete cascade,
  cluster_id uuid null references demand_intelligence_clusters(id) on delete set null,
  ad_lp_pair_id uuid null references ad_lp_pairs(id) on delete cascade,
  analysis_run_id uuid null references analysis_runs(id) on delete set null,
  outcome_id uuid null references improvement_outcomes(id) on delete set null,
  demand_signal_score numeric null,
  validation_score numeric null,
  fit_score numeric null,
  search_demand_score numeric null,
  market_size_score numeric null,
  before_metrics jsonb not null default '{}'::jsonb,
  after_metrics jsonb not null default '{}'::jsonb,
  metric_delta jsonb not null default '{}'::jsonb,
  learning_status text not null default 'unknown' check (learning_status in ('positive', 'neutral', 'negative', 'inconclusive', 'unknown')),
  learning_summary text null,
  created_at timestamptz not null default now()
);

create index if not exists demand_search_signals_run_idx on demand_search_signals(run_id);
create index if not exists demand_search_signals_pair_keyword_idx on demand_search_signals(ad_lp_pair_id, keyword);
create index if not exists demand_market_size_estimates_run_idx on demand_market_size_estimates(run_id);
create index if not exists demand_market_size_estimates_pair_score_idx on demand_market_size_estimates(ad_lp_pair_id, market_size_score desc);
create index if not exists demand_outcome_learning_links_pair_idx on demand_outcome_learning_links(ad_lp_pair_id, created_at desc);
create index if not exists demand_outcome_learning_links_run_idx on demand_outcome_learning_links(run_id);

alter table demand_search_signals enable row level security;
alter table demand_market_size_estimates enable row level security;
alter table demand_outcome_learning_links enable row level security;

create policy "Users manage own demand search signals" on demand_search_signals
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own demand market size estimates" on demand_market_size_estimates
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own demand outcome learning links" on demand_outcome_learning_links
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
