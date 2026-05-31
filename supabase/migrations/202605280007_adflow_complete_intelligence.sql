alter table evidence_sources add column if not exists monitoring_run_id uuid;
alter table evidence_clusters add column if not exists monitoring_run_id uuid;
alter table evidence_clusters add column if not exists trend_score numeric;

create table if not exists product_roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  product_review_run_id uuid,
  title text not null,
  summary text,
  now_items jsonb not null default '[]'::jsonb,
  next_items jsonb not null default '[]'::jsonb,
  later_items jsonb not null default '[]'::jsonb,
  do_not_build_items jsonb not null default '[]'::jsonb,
  needs_more_evidence_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_roadmaps_user_id_idx on product_roadmaps(user_id);
create index if not exists product_roadmaps_project_id_idx on product_roadmaps(project_id);
create index if not exists product_roadmaps_review_run_id_idx on product_roadmaps(product_review_run_id);

alter table product_roadmaps enable row level security;

drop policy if exists "Users can manage own product_roadmaps" on product_roadmaps;
create policy "Users can manage own product_roadmaps"
on product_roadmaps
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists monitoring_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  ad_lp_pair_id uuid,
  query text,
  status text not null default 'pending',
  monitoring_type text not null default 'market',
  evidence_count integer not null default 0,
  new_cluster_count integer not null default 0,
  changed_cluster_count integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  alerts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists monitoring_runs_user_id_idx on monitoring_runs(user_id);
create index if not exists monitoring_runs_project_id_idx on monitoring_runs(project_id);
create index if not exists monitoring_runs_pair_id_idx on monitoring_runs(ad_lp_pair_id);
create index if not exists monitoring_runs_type_idx on monitoring_runs(monitoring_type);

alter table monitoring_runs enable row level security;

drop policy if exists "Users can manage own monitoring_runs" on monitoring_runs;
create policy "Users can manage own monitoring_runs"
on monitoring_runs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists intelligence_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  ad_lp_pair_id uuid,
  monitoring_run_id uuid,
  alert_type text not null,
  severity text not null default 'medium',
  title text not null,
  description text not null,
  evidence_cluster_ids jsonb not null default '[]'::jsonb,
  evidence_source_ids jsonb not null default '[]'::jsonb,
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intelligence_alerts_user_id_idx on intelligence_alerts(user_id);
create index if not exists intelligence_alerts_project_id_idx on intelligence_alerts(project_id);
create index if not exists intelligence_alerts_pair_id_idx on intelligence_alerts(ad_lp_pair_id);
create index if not exists intelligence_alerts_status_idx on intelligence_alerts(status);
create index if not exists intelligence_alerts_severity_idx on intelligence_alerts(severity);

alter table intelligence_alerts enable row level security;

drop policy if exists "Users can manage own intelligence_alerts" on intelligence_alerts;
create policy "Users can manage own intelligence_alerts"
on intelligence_alerts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists learning_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  pattern_type text not null,
  target_area text,
  title text not null,
  description text,
  source_outcome_ids jsonb not null default '[]'::jsonb,
  source_backlog_item_ids jsonb not null default '[]'::jsonb,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  inconclusive_count integer not null default 0,
  confidence_score numeric,
  recommendation_bias numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_patterns_user_id_idx on learning_patterns(user_id);
create index if not exists learning_patterns_project_id_idx on learning_patterns(project_id);
create index if not exists learning_patterns_type_idx on learning_patterns(pattern_type);

alter table learning_patterns enable row level security;

drop policy if exists "Users can manage own learning_patterns" on learning_patterns;
create policy "Users can manage own learning_patterns"
on learning_patterns
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
