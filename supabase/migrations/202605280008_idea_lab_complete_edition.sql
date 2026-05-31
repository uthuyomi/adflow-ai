alter table evidence_sources add column if not exists idea_session_id uuid;
alter table evidence_clusters add column if not exists idea_session_id uuid;

create table if not exists idea_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid,
  title text not null default 'Untitled idea',
  status text not null default 'active',
  memory jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idea_sessions_user_id_idx on idea_sessions(user_id);
create index if not exists idea_sessions_project_id_idx on idea_sessions(project_id);

alter table idea_sessions enable row level security;

drop policy if exists "Users can manage own idea_sessions" on idea_sessions;
create policy "Users can manage own idea_sessions"
on idea_sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists idea_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null references idea_sessions(id) on delete cascade,
  role text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idea_messages_user_id_idx on idea_messages(user_id);
create index if not exists idea_messages_session_id_idx on idea_messages(session_id);

alter table idea_messages enable row level security;

drop policy if exists "Users can manage own idea_messages" on idea_messages;
create policy "Users can manage own idea_messages"
on idea_messages
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists idea_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null references idea_sessions(id) on delete cascade,
  title text not null default 'Untitled idea',
  target_users text,
  problem_statement text,
  proposed_solution text,
  market_category text,
  monetization_model text,
  estimated_complexity text,
  constraints text,
  notes text,
  evidence_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idea_profiles_user_id_idx on idea_profiles(user_id);
create index if not exists idea_profiles_session_id_idx on idea_profiles(session_id);

alter table idea_profiles enable row level security;

drop policy if exists "Users can manage own idea_profiles" on idea_profiles;
create policy "Users can manage own idea_profiles"
on idea_profiles
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists idea_review_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null references idea_sessions(id) on delete cascade,
  status text not null default 'pending',
  need_score numeric,
  pain_score numeric,
  competition_score numeric,
  monetization_score numeric,
  implementation_score numeric,
  confidence_score numeric,
  idea_opportunity_score numeric,
  decision text,
  decision_reason text,
  summary jsonb not null default '{}'::jsonb,
  mvp_plan jsonb not null default '{}'::jsonb,
  evidence_count integer not null default 0,
  cluster_count integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idea_review_runs_user_id_idx on idea_review_runs(user_id);
create index if not exists idea_review_runs_session_id_idx on idea_review_runs(session_id);

alter table idea_review_runs enable row level security;

drop policy if exists "Users can manage own idea_review_runs" on idea_review_runs;
create policy "Users can manage own idea_review_runs"
on idea_review_runs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists idea_backlog (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null references idea_sessions(id) on delete cascade,
  idea_review_run_id uuid references idea_review_runs(id) on delete set null,
  title text not null,
  description text not null,
  category text not null,
  priority text not null default 'medium',
  status text not null default 'candidate',
  impact_score numeric,
  confidence_score numeric,
  evidence_count integer not null default 0,
  rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idea_backlog_user_id_idx on idea_backlog(user_id);
create index if not exists idea_backlog_session_id_idx on idea_backlog(session_id);

alter table idea_backlog enable row level security;

drop policy if exists "Users can manage own idea_backlog" on idea_backlog;
create policy "Users can manage own idea_backlog"
on idea_backlog
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists idea_roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null references idea_sessions(id) on delete cascade,
  idea_review_run_id uuid references idea_review_runs(id) on delete set null,
  now_items jsonb not null default '[]'::jsonb,
  next_items jsonb not null default '[]'::jsonb,
  later_items jsonb not null default '[]'::jsonb,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idea_roadmaps_user_id_idx on idea_roadmaps(user_id);
create index if not exists idea_roadmaps_session_id_idx on idea_roadmaps(session_id);

alter table idea_roadmaps enable row level security;

drop policy if exists "Users can manage own idea_roadmaps" on idea_roadmaps;
create policy "Users can manage own idea_roadmaps"
on idea_roadmaps
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists idea_monitoring_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null references idea_sessions(id) on delete cascade,
  query text,
  status text not null default 'pending',
  monitoring_type text not null default 'pain_trend',
  evidence_count integer not null default 0,
  alerts jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idea_monitoring_runs_user_id_idx on idea_monitoring_runs(user_id);
create index if not exists idea_monitoring_runs_session_id_idx on idea_monitoring_runs(session_id);

alter table idea_monitoring_runs enable row level security;

drop policy if exists "Users can manage own idea_monitoring_runs" on idea_monitoring_runs;
create policy "Users can manage own idea_monitoring_runs"
on idea_monitoring_runs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
