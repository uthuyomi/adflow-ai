update ai_agent_results
set decision_status = case lower(decision_status)
  when 'accepted' then 'APPROVED'
  when 'rejected' then 'REJECTED'
  when 'apply_ready' then 'APPLY_READY'
  when 'applied' then 'APPLIED'
  when 'failed' then 'FAILED'
  else 'GENERATED'
end;

alter table ai_agent_results
  alter column decision_status set default 'GENERATED',
  add column if not exists updated_by uuid null references auth.users(id) on delete set null,
  add column if not exists status_updated_at timestamptz not null default now(),
  add column if not exists apply_ready_metadata jsonb not null default '{}'::jsonb;

alter table ai_agent_results
  drop constraint if exists ai_agent_results_decision_status_check;

alter table ai_agent_results
  add constraint ai_agent_results_decision_status_check
  check (decision_status in ('GENERATED', 'APPROVED', 'REJECTED', 'APPLY_READY', 'APPLIED', 'FAILED'));

create index if not exists ai_agent_results_user_status_created_idx
  on ai_agent_results(user_id, decision_status, created_at desc);

create table if not exists improvement_status_history (
  id uuid primary key default gen_random_uuid(),
  improvement_id uuid not null references ai_agent_results(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  old_status text null,
  new_status text not null
    check (new_status in ('GENERATED', 'APPROVED', 'REJECTED', 'APPLY_READY', 'APPLIED', 'FAILED')),
  changed_by uuid not null references auth.users(id) on delete cascade,
  changed_at timestamptz not null default now(),
  reason text null
);

create index if not exists improvement_status_history_improvement_changed_idx
  on improvement_status_history(improvement_id, changed_at desc);
create index if not exists improvement_status_history_user_changed_idx
  on improvement_status_history(user_id, changed_at desc);

alter table improvement_status_history enable row level security;

drop policy if exists "Users can select own improvement status history" on improvement_status_history;
create policy "Users can select own improvement status history"
on improvement_status_history for select using (auth.uid() = user_id);

create or replace function validate_improvement_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.decision_status = old.decision_status then
    return new;
  end if;

  if not (
    (old.decision_status = 'GENERATED' and new.decision_status in ('APPROVED', 'REJECTED')) or
    (old.decision_status = 'APPROVED' and new.decision_status in ('APPLY_READY', 'REJECTED')) or
    (old.decision_status = 'APPLY_READY' and new.decision_status in ('APPLIED', 'FAILED')) or
    (old.decision_status = 'FAILED' and new.decision_status = 'APPLY_READY')
  ) then
    raise exception 'Invalid improvement status transition: % -> %', old.decision_status, new.decision_status;
  end if;

  if new.decision_status = 'REJECTED' and nullif(trim(coalesce(new.decision_reason, '')), '') is null then
    raise exception 'A rejection reason is required.';
  end if;

  if new.updated_by is null then
    raise exception 'updated_by is required for improvement status transitions.';
  end if;

  new.status_updated_at := now();
  return new;
end;
$$;

create or replace function validate_improvement_initial_status()
returns trigger
language plpgsql
as $$
begin
  if new.decision_status <> 'GENERATED' then
    raise exception 'New improvements must start in GENERATED status.';
  end if;
  return new;
end;
$$;

create or replace function record_improvement_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into improvement_status_history (
      improvement_id, user_id, old_status, new_status, changed_by, reason
    ) values (
      new.id, new.user_id, null, new.decision_status, new.user_id, new.decision_reason
    );
  elsif new.decision_status is distinct from old.decision_status then
    insert into improvement_status_history (
      improvement_id, user_id, old_status, new_status, changed_by, reason
    ) values (
      new.id, new.user_id, old.decision_status, new.decision_status, new.updated_by, new.decision_reason
    );
  end if;
  return new;
end;
$$;

drop trigger if exists validate_ai_agent_result_improvement_transition on ai_agent_results;
create trigger validate_ai_agent_result_improvement_transition
before update of decision_status on ai_agent_results
for each row execute function validate_improvement_status_transition();

drop trigger if exists validate_ai_agent_result_initial_improvement_status on ai_agent_results;
create trigger validate_ai_agent_result_initial_improvement_status
before insert on ai_agent_results
for each row execute function validate_improvement_initial_status();

drop trigger if exists record_ai_agent_result_improvement_status on ai_agent_results;
create trigger record_ai_agent_result_improvement_status
after insert or update of decision_status on ai_agent_results
for each row execute function record_improvement_status_history();

insert into improvement_status_history (
  improvement_id, user_id, old_status, new_status, changed_by, changed_at, reason
)
select
  results.id,
  results.user_id,
  null,
  results.decision_status,
  coalesce(results.updated_by, results.accepted_by, results.user_id),
  coalesce(results.status_updated_at, results.decided_at, results.created_at),
  results.decision_reason
from ai_agent_results as results
where not exists (
  select 1 from improvement_status_history as history
  where history.improvement_id = results.id
);

create or replace function get_improvement_workflow_stats(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with status_counts as (
    select decision_status, count(*)::integer as count
    from ai_agent_results
    where user_id = p_user_id
    group by decision_status
  ),
  totals as (
    select
      coalesce(sum(count), 0)::integer as total,
      coalesce(sum(count) filter (where decision_status in ('APPROVED', 'APPLY_READY', 'APPLIED')), 0)::integer as approved,
      coalesce(sum(count) filter (where decision_status = 'REJECTED'), 0)::integer as rejected
    from status_counts
  )
  select jsonb_build_object(
    'total', totals.total,
    'counts', jsonb_build_object(
      'GENERATED', coalesce((select count from status_counts where decision_status = 'GENERATED'), 0),
      'APPROVED', coalesce((select count from status_counts where decision_status = 'APPROVED'), 0),
      'REJECTED', coalesce((select count from status_counts where decision_status = 'REJECTED'), 0),
      'APPLY_READY', coalesce((select count from status_counts where decision_status = 'APPLY_READY'), 0),
      'APPLIED', coalesce((select count from status_counts where decision_status = 'APPLIED'), 0),
      'FAILED', coalesce((select count from status_counts where decision_status = 'FAILED'), 0)
    ),
    'approval_rate', case when totals.total = 0 then 0 else round(totals.approved * 100.0 / totals.total, 2) end,
    'rejection_rate', case when totals.total = 0 then 0 else round(totals.rejected * 100.0 / totals.total, 2) end
  )
  from totals;
$$;

revoke execute on function get_improvement_workflow_stats(uuid) from anon, authenticated;
grant execute on function get_improvement_workflow_stats(uuid) to service_role;
