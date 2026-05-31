create table if not exists evidence_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid,
  ad_lp_pair_id uuid,
  market_research_run_id uuid,
  product_review_run_id uuid,
  source_type text not null,
  source_platform text,
  source_url text,
  title text,
  author text,
  published_at timestamptz,
  collected_at timestamptz not null default now(),
  query text,
  language text,
  region text,
  raw_content text not null,
  normalized_content text,
  content_hash text,
  sentiment text,
  relevance_score numeric,
  credibility_score numeric,
  spam_score numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evidence_sources_user_id_idx on evidence_sources(user_id);
create index if not exists evidence_sources_project_id_idx on evidence_sources(project_id);
create index if not exists evidence_sources_pair_id_idx on evidence_sources(ad_lp_pair_id);
create index if not exists evidence_sources_source_type_idx on evidence_sources(source_type);
create index if not exists evidence_sources_content_hash_idx on evidence_sources(content_hash);

alter table evidence_sources enable row level security;

drop policy if exists "Users can manage own evidence_sources" on evidence_sources;
create policy "Users can manage own evidence_sources"
on evidence_sources
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists evidence_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  evidence_source_id uuid not null references evidence_sources(id) on delete cascade,
  provider text not null default 'fallback',
  model text,
  dimensions integer,
  embedding jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists evidence_embeddings_user_id_idx on evidence_embeddings(user_id);
create index if not exists evidence_embeddings_source_id_idx on evidence_embeddings(evidence_source_id);

alter table evidence_embeddings enable row level security;

drop policy if exists "Users can manage own evidence_embeddings" on evidence_embeddings;
create policy "Users can manage own evidence_embeddings"
on evidence_embeddings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists evidence_clusters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid,
  ad_lp_pair_id uuid,
  market_research_run_id uuid,
  product_review_run_id uuid,
  cluster_type text not null,
  label text not null,
  description text,
  evidence_count integer not null default 0,
  severity_score numeric,
  frequency_score numeric,
  urgency_score numeric,
  opportunity_score numeric,
  confidence numeric,
  representative_evidence_ids jsonb not null default '[]'::jsonb,
  keywords jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evidence_clusters_user_id_idx on evidence_clusters(user_id);
create index if not exists evidence_clusters_project_id_idx on evidence_clusters(project_id);
create index if not exists evidence_clusters_pair_id_idx on evidence_clusters(ad_lp_pair_id);
create index if not exists evidence_clusters_type_idx on evidence_clusters(cluster_type);

alter table evidence_clusters enable row level security;

drop policy if exists "Users can manage own evidence_clusters" on evidence_clusters;
create policy "Users can manage own evidence_clusters"
on evidence_clusters
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists product_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  product_name text not null,
  product_url text,
  short_description text,
  target_users text,
  core_value text,
  current_features jsonb not null default '[]'::jsonb,
  pricing_model text,
  current_stage text,
  positioning_notes text,
  known_constraints text,
  do_not_build jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_profiles_user_id_idx on product_profiles(user_id);
create index if not exists product_profiles_project_id_idx on product_profiles(project_id);

alter table product_profiles enable row level security;

drop policy if exists "Users can manage own product_profiles" on product_profiles;
create policy "Users can manage own product_profiles"
on product_profiles
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists product_review_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  ad_lp_pair_id uuid,
  query text,
  status text not null default 'pending',
  review_mode text not null default 'standard',
  evidence_collection_mode text not null default 'manual_or_mock',
  evidence_count integer not null default 0,
  cluster_count integer not null default 0,
  product_opportunity_score numeric,
  need_score numeric,
  pain_score numeric,
  gap_score numeric,
  product_fit_score numeric,
  message_fit_score numeric,
  acquisition_fit_score numeric,
  evidence_confidence numeric,
  implementation_cost_risk numeric,
  summary jsonb not null default '{}'::jsonb,
  recommendations jsonb not null default '{}'::jsonb,
  roadmap_candidates jsonb not null default '[]'::jsonb,
  do_not_build jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists product_review_runs_user_id_idx on product_review_runs(user_id);
create index if not exists product_review_runs_project_id_idx on product_review_runs(project_id);
create index if not exists product_review_runs_pair_id_idx on product_review_runs(ad_lp_pair_id);

alter table product_review_runs enable row level security;

drop policy if exists "Users can manage own product_review_runs" on product_review_runs;
create policy "Users can manage own product_review_runs"
on product_review_runs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists product_improvement_backlog (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  ad_lp_pair_id uuid,
  product_review_run_id uuid references product_review_runs(id) on delete set null,
  title text not null,
  description text not null,
  category text not null,
  priority text not null default 'medium',
  status text not null default 'candidate',
  impact_score numeric,
  cost_score numeric,
  confidence_score numeric,
  evidence_count integer not null default 0,
  impact_cost_ratio numeric,
  target_area text,
  affected_files_hint jsonb not null default '[]'::jsonb,
  acceptance_criteria jsonb not null default '[]'::jsonb,
  evidence_cluster_ids jsonb not null default '[]'::jsonb,
  evidence_source_ids jsonb not null default '[]'::jsonb,
  rationale text,
  risk_notes text,
  do_not_do text,
  source text not null default 'product_review',
  converted_codex_task_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_improvement_backlog_user_id_idx on product_improvement_backlog(user_id);
create index if not exists product_improvement_backlog_project_id_idx on product_improvement_backlog(project_id);
create index if not exists product_improvement_backlog_pair_id_idx on product_improvement_backlog(ad_lp_pair_id);
create index if not exists product_improvement_backlog_status_idx on product_improvement_backlog(status);
create index if not exists product_improvement_backlog_priority_idx on product_improvement_backlog(priority);

alter table product_improvement_backlog enable row level security;

drop policy if exists "Users can manage own product_improvement_backlog" on product_improvement_backlog;
create policy "Users can manage own product_improvement_backlog"
on product_improvement_backlog
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

alter table codex_task_prompts alter column source_ai_result_id drop not null;
