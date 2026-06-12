update codex_task_prompts
set status = 'CREATED'
where status not in ('CREATED', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'PR_CREATED', 'OUTCOME_CREATED');

alter table codex_task_prompts
  alter column status set default 'CREATED',
  add column if not exists summary text null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists last_run_at timestamptz null,
  add column if not exists result_summary text null,
  add column if not exists execution_mode text null
    check (execution_mode in ('REAL_EXECUTION', 'MANUAL_EXECUTION', 'MOCK')),
  add column if not exists pr_url text null,
  add column if not exists outcome_id uuid null references improvement_outcomes(id) on delete set null,
  add column if not exists error_message text null,
  add column if not exists error_code text null,
  add column if not exists updated_by uuid null references auth.users(id) on delete set null;

alter table codex_task_prompts
  add constraint codex_task_prompts_status_check
  check (status in ('CREATED', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'PR_CREATED', 'OUTCOME_CREATED'));

create index if not exists codex_task_prompts_user_status_created_idx
  on codex_task_prompts(user_id, status, created_at desc);
create index if not exists codex_task_prompts_source_result_idx
  on codex_task_prompts(source_ai_result_id, created_at desc);

create table if not exists codex_task_executions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references codex_task_prompts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  execution_mode text not null
    check (execution_mode in ('REAL_EXECUTION', 'MANUAL_EXECUTION', 'MOCK')),
  status text not null check (status in ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
  idempotency_key text not null,
  started_at timestamptz null,
  finished_at timestamptz null,
  stdout text null,
  stderr text null,
  summary text null,
  files_changed jsonb not null default '[]'::jsonb,
  diff_summary text null,
  error_message text null,
  error_code text null,
  operator_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(user_id, idempotency_key)
);

create table if not exists codex_task_status_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references codex_task_prompts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  old_status text null,
  new_status text not null,
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now(),
  reason text null,
  execution_id uuid null references codex_task_executions(id) on delete set null,
  related_pr_id uuid null references github_pull_requests(id) on delete set null,
  related_outcome_id uuid null references improvement_outcomes(id) on delete set null
);

create index if not exists codex_task_executions_task_created_idx
  on codex_task_executions(task_id, created_at desc);
create index if not exists codex_task_status_history_task_changed_idx
  on codex_task_status_history(task_id, changed_at asc);

alter table codex_task_executions enable row level security;
alter table codex_task_status_history enable row level security;

create policy "Users read own codex executions" on codex_task_executions
for select using (auth.uid() = user_id);
create policy "Users read own codex task history" on codex_task_status_history
for select using (auth.uid() = user_id);

insert into codex_task_status_history(task_id, user_id, old_status, new_status, changed_by, changed_at, reason)
select task.id, task.user_id, null, task.status, task.user_id, task.created_at, 'Backfilled existing Codex task.'
from codex_task_prompts task
where not exists (select 1 from codex_task_status_history history where history.task_id = task.id);

alter table github_pull_requests
  add column if not exists codex_task_id uuid null references codex_task_prompts(id) on delete set null,
  add column if not exists codex_execution_id uuid null references codex_task_executions(id) on delete set null;

alter table github_pull_requests
  drop constraint if exists github_pull_requests_user_id_improvement_id_repository_key;

create unique index if not exists github_pull_requests_codex_task_repository_idx
  on github_pull_requests(user_id, codex_task_id, repository)
  where codex_task_id is not null;

alter table credit_transactions
  add column if not exists idempotency_key text null;

create unique index if not exists credit_transactions_user_idempotency_idx
  on credit_transactions(user_id, idempotency_key)
  where idempotency_key is not null;

alter table improvement_outcomes
  drop constraint if exists improvement_outcomes_outcome_status_check;
alter table improvement_outcomes
  add column if not exists expected_metrics jsonb not null default '{}'::jsonb,
  add column if not exists measurement_scheduled_at timestamptz null,
  add column if not exists related_pr_url text null,
  add column if not exists implementation_summary text null;
alter table improvement_outcomes
  add constraint improvement_outcomes_outcome_status_check check (
    outcome_status in ('pending', 'PENDING_MEASUREMENT', 'implemented', 'measured', 'positive', 'neutral', 'negative', 'inconclusive')
  );

create or replace function validate_codex_task_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if not (
    (old.status = 'CREATED' and new.status in ('QUEUED', 'CANCELLED')) or
    (old.status = 'QUEUED' and new.status in ('RUNNING', 'CANCELLED')) or
    (old.status = 'RUNNING' and new.status in ('SUCCEEDED', 'FAILED', 'CANCELLED')) or
    (old.status = 'FAILED' and new.status = 'QUEUED') or
    (old.status = 'SUCCEEDED' and new.status in ('PR_CREATED', 'OUTCOME_CREATED')) or
    (old.status = 'PR_CREATED' and new.status = 'OUTCOME_CREATED')
  ) then
    raise exception 'Invalid Codex task status transition: % -> %', old.status, new.status;
  end if;
  if new.updated_by is null then
    raise exception 'updated_by is required for Codex task status transitions.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists validate_codex_task_transition on codex_task_prompts;
create trigger validate_codex_task_transition
before update of status on codex_task_prompts
for each row execute function validate_codex_task_status_transition();

create or replace function consume_user_credits_idempotent(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns user_credit_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance user_credit_balances;
  v_monthly_spend integer;
  v_purchased_spend integer;
begin
  if p_amount <= 0 or nullif(trim(p_idempotency_key), '') is null then
    raise exception 'Positive amount and idempotency key are required.';
  end if;
  if exists (select 1 from credit_transactions where user_id = p_user_id and idempotency_key = p_idempotency_key) then
    select * into v_balance from ensure_credit_balance(p_user_id);
    return v_balance;
  end if;
  select * into v_balance from ensure_credit_balance(p_user_id);
  select * into v_balance from user_credit_balances where user_id = p_user_id for update;
  if (v_balance.monthly_credits + v_balance.purchased_credits) < p_amount then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;
  v_monthly_spend := least(v_balance.monthly_credits, p_amount);
  v_purchased_spend := p_amount - v_monthly_spend;
  update user_credit_balances
  set monthly_credits = monthly_credits - v_monthly_spend,
      purchased_credits = purchased_credits - v_purchased_spend,
      lifetime_used_credits = lifetime_used_credits + p_amount
  where user_id = p_user_id returning * into v_balance;
  insert into credit_transactions(user_id, type, amount, reason, idempotency_key, metadata)
  values (p_user_id, 'consume', -p_amount, p_reason, p_idempotency_key, coalesce(p_metadata, '{}'::jsonb));
  return v_balance;
end;
$$;

create or replace function refund_consumed_credits_idempotent(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns user_credit_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance user_credit_balances;
begin
  if p_amount <= 0 or nullif(trim(p_idempotency_key), '') is null then
    raise exception 'Positive amount and idempotency key are required.';
  end if;
  if exists (select 1 from credit_transactions where user_id = p_user_id and idempotency_key = p_idempotency_key) then
    select * into v_balance from ensure_credit_balance(p_user_id);
    return v_balance;
  end if;
  select * into v_balance from ensure_credit_balance(p_user_id);
  select * into v_balance from user_credit_balances where user_id = p_user_id for update;
  update user_credit_balances
  set monthly_credits = monthly_credits + p_amount,
      lifetime_used_credits = greatest(lifetime_used_credits - p_amount, 0)
  where user_id = p_user_id returning * into v_balance;
  insert into credit_transactions(user_id, type, amount, reason, idempotency_key, metadata)
  values (p_user_id, 'refund', p_amount, p_reason, p_idempotency_key, coalesce(p_metadata, '{}'::jsonb));
  return v_balance;
end;
$$;

revoke execute on function consume_user_credits_idempotent(uuid, integer, text, text, jsonb) from anon, authenticated;
revoke execute on function refund_consumed_credits_idempotent(uuid, integer, text, text, jsonb) from anon, authenticated;
grant execute on function consume_user_credits_idempotent(uuid, integer, text, text, jsonb) to service_role;
grant execute on function refund_consumed_credits_idempotent(uuid, integer, text, text, jsonb) to service_role;
