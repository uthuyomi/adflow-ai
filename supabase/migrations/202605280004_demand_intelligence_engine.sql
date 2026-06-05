create table if not exists demand_intelligence_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references ad_projects(id) on delete set null,
  ad_lp_pair_id uuid not null references ad_lp_pairs(id) on delete cascade,
  query text not null,
  status text not null default 'running',
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists demand_intelligence_signals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references demand_intelligence_runs(id) on delete cascade,
  collected_at timestamptz not null default now(),
  source_type text not null check (
    source_type in (
      'x',
      'reddit',
      'yahoo_chiebukuro',
      'amazon_review',
      'rakuten_review',
      'kakaku_review',
      'youtube_comment',
      'google_search',
      'google_related_search',
      'google_suggest',
      'google_people_also_ask',
      'competitor_lp',
      'competitor_review',
      'comparison_article',
      'note',
      'qiita',
      'zenn',
      'bbs',
      'forum',
      'review_site',
      'app_store_review',
      'google_play_review'
    )
  ),
  source_name text not null,
  url text,
  title text not null,
  body text not null,
  posted_at timestamptz,
  engagement jsonb not null default '{}'::jsonb,
  language text not null default 'ja',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists demand_intelligence_embeddings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references demand_intelligence_runs(id) on delete cascade,
  signal_index integer not null,
  embedding jsonb not null,
  model_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists demand_intelligence_clusters (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references demand_intelligence_runs(id) on delete cascade,
  cluster_type text not null check (cluster_type in ('pain', 'desire')),
  name text not null,
  category text not null,
  count integer not null default 0,
  source_count integer not null default 0,
  representative_quotes jsonb not null default '[]'::jsonb,
  growth_rate numeric not null default 0,
  confidence numeric not null default 0,
  persona_ratios jsonb not null default '{}'::jsonb,
  root_causes jsonb not null default '[]'::jsonb,
  demand_signal_score integer not null default 0,
  trend text not null default '横ばい',
  evidence_signal_indexes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists demand_intelligence_runs_pair_created_idx on demand_intelligence_runs(ad_lp_pair_id, created_at desc);
create index if not exists demand_intelligence_runs_project_created_idx on demand_intelligence_runs(project_id, created_at desc);
create index if not exists demand_intelligence_signals_run_idx on demand_intelligence_signals(run_id);
create index if not exists demand_intelligence_embeddings_run_idx on demand_intelligence_embeddings(run_id);
create index if not exists demand_intelligence_clusters_run_score_idx on demand_intelligence_clusters(run_id, demand_signal_score desc);

alter table demand_intelligence_runs enable row level security;
alter table demand_intelligence_signals enable row level security;
alter table demand_intelligence_embeddings enable row level security;
alter table demand_intelligence_clusters enable row level security;

create policy "Users can select own demand intelligence runs" on demand_intelligence_runs for select using (auth.uid() = user_id);
create policy "Users can insert own demand intelligence runs" on demand_intelligence_runs for insert with check (auth.uid() = user_id);
create policy "Users can update own demand intelligence runs" on demand_intelligence_runs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own demand intelligence runs" on demand_intelligence_runs for delete using (auth.uid() = user_id);

create policy "Users can select signals for own demand intelligence" on demand_intelligence_signals
for select using (
  exists (
    select 1 from demand_intelligence_runs
    where demand_intelligence_runs.id = demand_intelligence_signals.run_id
      and demand_intelligence_runs.user_id = auth.uid()
  )
);
create policy "Users can insert signals for own demand intelligence" on demand_intelligence_signals
for insert with check (
  exists (
    select 1 from demand_intelligence_runs
    where demand_intelligence_runs.id = demand_intelligence_signals.run_id
      and demand_intelligence_runs.user_id = auth.uid()
  )
);
create policy "Users can update signals for own demand intelligence" on demand_intelligence_signals
for update using (
  exists (
    select 1 from demand_intelligence_runs
    where demand_intelligence_runs.id = demand_intelligence_signals.run_id
      and demand_intelligence_runs.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from demand_intelligence_runs
    where demand_intelligence_runs.id = demand_intelligence_signals.run_id
      and demand_intelligence_runs.user_id = auth.uid()
  )
);
create policy "Users can delete signals for own demand intelligence" on demand_intelligence_signals
for delete using (
  exists (
    select 1 from demand_intelligence_runs
    where demand_intelligence_runs.id = demand_intelligence_signals.run_id
      and demand_intelligence_runs.user_id = auth.uid()
  )
);

create policy "Users can select embeddings for own demand intelligence" on demand_intelligence_embeddings
for select using (
  exists (
    select 1 from demand_intelligence_runs
    where demand_intelligence_runs.id = demand_intelligence_embeddings.run_id
      and demand_intelligence_runs.user_id = auth.uid()
  )
);
create policy "Users can insert embeddings for own demand intelligence" on demand_intelligence_embeddings
for insert with check (
  exists (
    select 1 from demand_intelligence_runs
    where demand_intelligence_runs.id = demand_intelligence_embeddings.run_id
      and demand_intelligence_runs.user_id = auth.uid()
  )
);

create policy "Users can select clusters for own demand intelligence" on demand_intelligence_clusters
for select using (
  exists (
    select 1 from demand_intelligence_runs
    where demand_intelligence_runs.id = demand_intelligence_clusters.run_id
      and demand_intelligence_runs.user_id = auth.uid()
  )
);
create policy "Users can insert clusters for own demand intelligence" on demand_intelligence_clusters
for insert with check (
  exists (
    select 1 from demand_intelligence_runs
    where demand_intelligence_runs.id = demand_intelligence_clusters.run_id
      and demand_intelligence_runs.user_id = auth.uid()
  )
);
create policy "Users can update clusters for own demand intelligence" on demand_intelligence_clusters
for update using (
  exists (
    select 1 from demand_intelligence_runs
    where demand_intelligence_runs.id = demand_intelligence_clusters.run_id
      and demand_intelligence_runs.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from demand_intelligence_runs
    where demand_intelligence_runs.id = demand_intelligence_clusters.run_id
      and demand_intelligence_runs.user_id = auth.uid()
  )
);
create policy "Users can delete clusters for own demand intelligence" on demand_intelligence_clusters
for delete using (
  exists (
    select 1 from demand_intelligence_runs
    where demand_intelligence_runs.id = demand_intelligence_clusters.run_id
      and demand_intelligence_runs.user_id = auth.uid()
  )
);
