alter table ai_agent_results
add column if not exists decision_status text not null default 'pending',
add column if not exists decision_reason text,
add column if not exists decided_at timestamptz,
add column if not exists accepted_by uuid references auth.users(id) on delete set null,
add column if not exists confidence numeric,
add column if not exists predicted_effect jsonb not null default '{}'::jsonb;

alter table ai_agent_scorecards
add column if not exists accepted_count integer not null default 0,
add column if not exists rejected_count integer not null default 0,
add column if not exists apply_ready_count integer not null default 0,
add column if not exists avg_confidence numeric not null default 0,
add column if not exists avg_risk numeric not null default 0,
add column if not exists estimated_ctr_lift numeric not null default 0,
add column if not exists estimated_cvr_lift numeric not null default 0,
add column if not exists estimated_bounce_reduction numeric not null default 0,
add column if not exists router_score numeric not null default 0;

create table if not exists landing_page_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references ad_projects(id) on delete cascade,
  landing_page_id uuid not null references landing_pages(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  change_summary text,
  created_from_history_id uuid references change_history(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(landing_page_id, version_number)
);

create table if not exists codex_task_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references ad_projects(id) on delete set null,
  source_ai_result_id uuid not null references ai_agent_results(id) on delete cascade,
  title text not null,
  target_files_hint text[] not null default '{}',
  implementation_goal text not null,
  constraints jsonb not null default '[]'::jsonb,
  acceptance_criteria jsonb not null default '[]'::jsonb,
  prompt jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

alter table landing_page_versions enable row level security;
alter table codex_task_prompts enable row level security;

create policy "Users can select own landing page versions" on landing_page_versions for select using (auth.uid() = user_id);
create policy "Users can insert own landing page versions" on landing_page_versions for insert with check (auth.uid() = user_id);
create policy "Users can update own landing page versions" on landing_page_versions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own landing page versions" on landing_page_versions for delete using (auth.uid() = user_id);

create policy "Users can select own codex task prompts" on codex_task_prompts for select using (auth.uid() = user_id);
create policy "Users can insert own codex task prompts" on codex_task_prompts for insert with check (auth.uid() = user_id);
create policy "Users can update own codex task prompts" on codex_task_prompts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own codex task prompts" on codex_task_prompts for delete using (auth.uid() = user_id);
