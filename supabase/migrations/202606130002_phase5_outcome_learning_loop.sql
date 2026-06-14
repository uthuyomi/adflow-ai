update improvement_outcomes
set outcome_status = case outcome_status
  when 'pending' then 'DRAFT'
  when 'PENDING_MEASUREMENT' then 'PENDING_MEASUREMENT'
  when 'implemented' then 'PENDING_MEASUREMENT'
  when 'measured' then 'MEASURING'
  when 'positive' then 'SUCCESS'
  when 'neutral' then 'PARTIAL_SUCCESS'
  when 'negative' then 'FAILED'
  when 'inconclusive' then 'NO_IMPACT'
  else 'DRAFT'
end;

alter table improvement_outcomes
  drop constraint if exists improvement_outcomes_outcome_status_check;

alter table improvement_outcomes
  add column if not exists source_github_pr_id uuid null references github_pull_requests(id) on delete set null,
  add column if not exists summary text null,
  add column if not exists expected_impact jsonb not null default '{}'::jsonb,
  add column if not exists measurement_plan jsonb not null default '{}'::jsonb,
  add column if not exists measurement_period jsonb not null default '{}'::jsonb,
  add column if not exists measurement_method text null,
  add column if not exists evidence_data jsonb not null default '[]'::jsonb,
  add column if not exists evaluation_thresholds jsonb not null default '{}'::jsonb,
  add column if not exists improvement_rate numeric null,
  add column if not exists evaluation_result jsonb not null default '{}'::jsonb,
  add column if not exists measurement_source text not null default 'MANUAL',
  add column if not exists created_by uuid null references auth.users(id) on delete set null,
  add column if not exists updated_by uuid null references auth.users(id) on delete set null,
  add column if not exists status_updated_at timestamptz not null default now(),
  add column if not exists archived_at timestamptz null;

update improvement_outcomes
set created_by = user_id,
    summary = coalesce(summary, outcome_summary, description),
    expected_impact = case when expected_impact = '{}'::jsonb then expected_metrics else expected_impact end
where created_by is null or summary is null or expected_impact = '{}'::jsonb;

alter table improvement_outcomes
  alter column outcome_status set default 'DRAFT',
  alter column created_by set not null,
  add constraint improvement_outcomes_outcome_status_check check (
    outcome_status in ('DRAFT', 'PENDING_MEASUREMENT', 'MEASURING', 'SUCCESS', 'PARTIAL_SUCCESS', 'NO_IMPACT', 'FAILED', 'ARCHIVED')
  );

create unique index if not exists improvement_outcomes_source_ai_unique_idx
  on improvement_outcomes(user_id, source_ai_result_id)
  where source_ai_result_id is not null;
create unique index if not exists improvement_outcomes_source_codex_unique_idx
  on improvement_outcomes(user_id, source_codex_task_id)
  where source_codex_task_id is not null;
create unique index if not exists improvement_outcomes_source_pr_unique_idx
  on improvement_outcomes(user_id, source_github_pr_id)
  where source_github_pr_id is not null;
create index if not exists improvement_outcomes_user_status_created_idx
  on improvement_outcomes(user_id, outcome_status, created_at desc);

create table if not exists outcome_status_history (
  id uuid primary key default gen_random_uuid(),
  outcome_id uuid not null references improvement_outcomes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  old_status text null,
  new_status text not null check (
    new_status in ('DRAFT', 'PENDING_MEASUREMENT', 'MEASURING', 'SUCCESS', 'PARTIAL_SUCCESS', 'NO_IMPACT', 'FAILED', 'ARCHIVED')
  ),
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now(),
  reason text null,
  measurement_source text null
);

create index if not exists outcome_status_history_outcome_changed_idx
  on outcome_status_history(outcome_id, changed_at asc);
alter table outcome_status_history enable row level security;
create policy "Users read own outcome status history" on outcome_status_history
for select using (auth.uid() = user_id);

create table if not exists outcome_learning_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  outcome_id uuid not null references improvement_outcomes(id) on delete cascade,
  project_id uuid null references ad_projects(id) on delete set null,
  improvement_id uuid null references ai_agent_results(id) on delete set null,
  improvement_type text not null,
  project_type text null,
  market_type text null,
  before_metrics jsonb not null default '{}'::jsonb,
  after_metrics jsonb not null default '{}'::jsonb,
  improvement_rate numeric not null default 0,
  success_flag boolean not null default false,
  confidence_score numeric not null default 0,
  measurement_quality numeric not null default 0,
  outcome_status text not null,
  learning_score numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, outcome_id)
);

create index if not exists outcome_learning_data_user_score_idx
  on outcome_learning_data(user_id, learning_score desc);
create index if not exists outcome_learning_data_project_idx
  on outcome_learning_data(user_id, project_id, created_at desc);
alter table outcome_learning_data enable row level security;
create policy "Users read own outcome learning data" on outcome_learning_data
for select using (auth.uid() = user_id);

create or replace function validate_outcome_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.outcome_status = old.outcome_status then
    return new;
  end if;
  if not (
    (old.outcome_status = 'DRAFT' and new.outcome_status in ('PENDING_MEASUREMENT', 'ARCHIVED')) or
    (old.outcome_status = 'PENDING_MEASUREMENT' and new.outcome_status in ('MEASURING', 'ARCHIVED')) or
    (old.outcome_status = 'MEASURING' and new.outcome_status in ('SUCCESS', 'PARTIAL_SUCCESS', 'NO_IMPACT', 'FAILED', 'ARCHIVED')) or
    (old.outcome_status = 'FAILED' and new.outcome_status in ('MEASURING', 'ARCHIVED')) or
    (old.outcome_status in ('SUCCESS', 'PARTIAL_SUCCESS', 'NO_IMPACT') and new.outcome_status = 'ARCHIVED')
  ) then
    raise exception 'Invalid outcome status transition: % -> %', old.outcome_status, new.outcome_status;
  end if;
  if new.updated_by is null then
    raise exception 'updated_by is required for outcome status transitions.';
  end if;
  new.status_updated_at := now();
  if new.outcome_status = 'ARCHIVED' then
    new.archived_at := now();
  end if;
  return new;
end;
$$;

create or replace function validate_outcome_initial_status()
returns trigger
language plpgsql
as $$
begin
  if new.outcome_status <> 'DRAFT' then
    raise exception 'New outcomes must start in DRAFT status.';
  end if;
  return new;
end;
$$;

create or replace function record_outcome_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into outcome_status_history(outcome_id, user_id, old_status, new_status, changed_by, reason, measurement_source)
    values (new.id, new.user_id, null, new.outcome_status, new.created_by, 'Outcome created.', new.measurement_source);
  elsif new.outcome_status is distinct from old.outcome_status then
    insert into outcome_status_history(outcome_id, user_id, old_status, new_status, changed_by, reason, measurement_source)
    values (new.id, new.user_id, old.outcome_status, new.outcome_status, new.updated_by, new.outcome_summary, new.measurement_source);
  end if;
  return new;
end;
$$;

drop trigger if exists validate_improvement_outcome_transition on improvement_outcomes;
create trigger validate_improvement_outcome_transition
before update of outcome_status on improvement_outcomes
for each row execute function validate_outcome_status_transition();

drop trigger if exists validate_improvement_outcome_initial_status on improvement_outcomes;
create trigger validate_improvement_outcome_initial_status
before insert on improvement_outcomes
for each row execute function validate_outcome_initial_status();

drop trigger if exists record_improvement_outcome_status on improvement_outcomes;
create trigger record_improvement_outcome_status
after insert or update of outcome_status on improvement_outcomes
for each row execute function record_outcome_status_history();

insert into outcome_status_history(outcome_id, user_id, old_status, new_status, changed_by, changed_at, reason, measurement_source)
select outcome.id, outcome.user_id, null, outcome.outcome_status, outcome.created_by, outcome.created_at, 'Backfilled existing outcome.', outcome.measurement_source
from improvement_outcomes outcome
where not exists (select 1 from outcome_status_history history where history.outcome_id = outcome.id);

drop trigger if exists outcome_learning_data_updated_at on outcome_learning_data;
create trigger outcome_learning_data_updated_at
before update on outcome_learning_data
for each row execute function set_adflow_updated_at();
