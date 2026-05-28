create table if not exists ai_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_key text not null,
  display_name text not null,
  provider text not null,
  role text not null,
  strengths text[] not null default '{}',
  default_tasks text[] not null default '{}',
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, agent_key)
);

create table if not exists ai_orchestration_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references ad_projects(id) on delete set null,
  ad_lp_pair_id uuid references ad_lp_pairs(id) on delete cascade,
  platform text not null,
  objective text not null,
  router_version text not null default 'rules.v1',
  route_plan jsonb not null default '[]'::jsonb,
  route_reason text,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists ai_agent_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references ad_projects(id) on delete set null,
  orchestration_run_id uuid not null references ai_orchestration_runs(id) on delete cascade,
  ad_lp_pair_id uuid references ad_lp_pairs(id) on delete cascade,
  agent_key text not null,
  provider text not null,
  role text not null,
  task text not null,
  input_summary text,
  output jsonb not null default '{}'::jsonb,
  score numeric,
  risk_level text,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create table if not exists ai_agent_scorecards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_key text not null,
  provider text not null,
  platform text not null,
  metric text not null,
  sample_count integer not null default 0,
  average_score numeric not null default 0,
  last_result_id uuid references ai_agent_results(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(user_id, agent_key, platform, metric)
);

drop trigger if exists set_ai_agents_updated_at on ai_agents;
create trigger set_ai_agents_updated_at
before update on ai_agents
for each row execute function set_adflow_updated_at();

alter table ai_agents enable row level security;
alter table ai_orchestration_runs enable row level security;
alter table ai_agent_results enable row level security;
alter table ai_agent_scorecards enable row level security;

create policy "Users can select own ai agents" on ai_agents for select using (auth.uid() = user_id);
create policy "Users can insert own ai agents" on ai_agents for insert with check (auth.uid() = user_id);
create policy "Users can update own ai agents" on ai_agents for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own ai agents" on ai_agents for delete using (auth.uid() = user_id);

create policy "Users can select own ai orchestration runs" on ai_orchestration_runs for select using (auth.uid() = user_id);
create policy "Users can insert own ai orchestration runs" on ai_orchestration_runs for insert with check (auth.uid() = user_id);
create policy "Users can update own ai orchestration runs" on ai_orchestration_runs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own ai orchestration runs" on ai_orchestration_runs for delete using (auth.uid() = user_id);

create policy "Users can select own ai agent results" on ai_agent_results for select using (auth.uid() = user_id);
create policy "Users can insert own ai agent results" on ai_agent_results for insert with check (auth.uid() = user_id);
create policy "Users can update own ai agent results" on ai_agent_results for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own ai agent results" on ai_agent_results for delete using (auth.uid() = user_id);

create policy "Users can select own ai agent scorecards" on ai_agent_scorecards for select using (auth.uid() = user_id);
create policy "Users can insert own ai agent scorecards" on ai_agent_scorecards for insert with check (auth.uid() = user_id);
create policy "Users can update own ai agent scorecards" on ai_agent_scorecards for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own ai agent scorecards" on ai_agent_scorecards for delete using (auth.uid() = user_id);
