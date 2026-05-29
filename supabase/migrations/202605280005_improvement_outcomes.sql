create table if not exists improvement_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references ad_projects(id) on delete set null,
  ad_lp_pair_id uuid not null references ad_lp_pairs(id) on delete cascade,
  source_ai_result_id uuid references ai_agent_results(id) on delete set null,
  source_codex_task_id uuid references codex_task_prompts(id) on delete set null,
  title text not null,
  description text,
  implemented_at timestamptz,
  measured_at timestamptz,
  before_metrics jsonb not null default '{}'::jsonb,
  after_metrics jsonb not null default '{}'::jsonb,
  metric_delta jsonb not null default '{}'::jsonb,
  outcome_status text not null default 'pending' check (
    outcome_status in ('pending', 'implemented', 'measured', 'positive', 'neutral', 'negative', 'inconclusive')
  ),
  outcome_summary text,
  learning_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists improvement_outcomes_pair_created_idx on improvement_outcomes(ad_lp_pair_id, created_at desc);
create index if not exists improvement_outcomes_ai_result_idx on improvement_outcomes(source_ai_result_id);
create index if not exists improvement_outcomes_codex_task_idx on improvement_outcomes(source_codex_task_id);

alter table improvement_outcomes enable row level security;

create policy "Users can select own improvement outcomes" on improvement_outcomes for select using (auth.uid() = user_id);
create policy "Users can insert own improvement outcomes" on improvement_outcomes for insert with check (auth.uid() = user_id);
create policy "Users can update own improvement outcomes" on improvement_outcomes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own improvement outcomes" on improvement_outcomes for delete using (auth.uid() = user_id);
