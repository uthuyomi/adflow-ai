create table if not exists market_research_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references ad_projects(id) on delete set null,
  ad_lp_pair_id uuid references ad_lp_pairs(id) on delete cascade,
  query text not null,
  status text not null default 'running',
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists market_research_sources (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid not null references market_research_runs(id) on delete cascade,
  source_type text not null check (source_type in ('twitter', 'reddit', 'search', 'competitor', 'review', 'forum', 'youtube')),
  title text not null,
  url text,
  content text not null,
  sentiment text,
  relevance_score numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists market_research_insights (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid not null references market_research_runs(id) on delete cascade,
  category text not null,
  title text not null,
  description text not null,
  confidence numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists market_research_runs_pair_created_idx on market_research_runs(ad_lp_pair_id, created_at desc);
create index if not exists market_research_runs_project_created_idx on market_research_runs(project_id, created_at desc);
create index if not exists market_research_sources_run_idx on market_research_sources(research_run_id);
create index if not exists market_research_insights_run_idx on market_research_insights(research_run_id);

alter table market_research_runs enable row level security;
alter table market_research_sources enable row level security;
alter table market_research_insights enable row level security;

create policy "Users can select own market research runs" on market_research_runs for select using (auth.uid() = user_id);
create policy "Users can insert own market research runs" on market_research_runs for insert with check (auth.uid() = user_id);
create policy "Users can update own market research runs" on market_research_runs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own market research runs" on market_research_runs for delete using (auth.uid() = user_id);

create policy "Users can select sources for own market research" on market_research_sources
for select using (
  exists (
    select 1 from market_research_runs
    where market_research_runs.id = market_research_sources.research_run_id
      and market_research_runs.user_id = auth.uid()
  )
);
create policy "Users can insert sources for own market research" on market_research_sources
for insert with check (
  exists (
    select 1 from market_research_runs
    where market_research_runs.id = market_research_sources.research_run_id
      and market_research_runs.user_id = auth.uid()
  )
);
create policy "Users can update sources for own market research" on market_research_sources
for update using (
  exists (
    select 1 from market_research_runs
    where market_research_runs.id = market_research_sources.research_run_id
      and market_research_runs.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from market_research_runs
    where market_research_runs.id = market_research_sources.research_run_id
      and market_research_runs.user_id = auth.uid()
  )
);
create policy "Users can delete sources for own market research" on market_research_sources
for delete using (
  exists (
    select 1 from market_research_runs
    where market_research_runs.id = market_research_sources.research_run_id
      and market_research_runs.user_id = auth.uid()
  )
);

create policy "Users can select insights for own market research" on market_research_insights
for select using (
  exists (
    select 1 from market_research_runs
    where market_research_runs.id = market_research_insights.research_run_id
      and market_research_runs.user_id = auth.uid()
  )
);
create policy "Users can insert insights for own market research" on market_research_insights
for insert with check (
  exists (
    select 1 from market_research_runs
    where market_research_runs.id = market_research_insights.research_run_id
      and market_research_runs.user_id = auth.uid()
  )
);
create policy "Users can update insights for own market research" on market_research_insights
for update using (
  exists (
    select 1 from market_research_runs
    where market_research_runs.id = market_research_insights.research_run_id
      and market_research_runs.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from market_research_runs
    where market_research_runs.id = market_research_insights.research_run_id
      and market_research_runs.user_id = auth.uid()
  )
);
create policy "Users can delete insights for own market research" on market_research_insights
for delete using (
  exists (
    select 1 from market_research_runs
    where market_research_runs.id = market_research_insights.research_run_id
      and market_research_runs.user_id = auth.uid()
  )
);
