alter table ad_ab_tests drop constraint if exists ad_ab_tests_status_check;
alter table ad_ab_tests drop constraint if exists ad_ab_tests_primary_metric_check;

update ad_ab_tests
set status = case lower(status)
  when 'draft' then 'DRAFT'
  when 'running' then 'RUNNING'
  when 'completed' then 'COMPLETED'
  when 'archived' then 'ARCHIVED'
  else 'DRAFT'
end;
alter table ad_ab_tests
  alter column status set default 'DRAFT',
  add column if not exists experiment_type text not null default 'AD',
  add column if not exists target_type text not null default 'AD',
  add column if not exists target_id uuid null,
  add column if not exists outcome_id uuid null references improvement_outcomes(id) on delete set null,
  add column if not exists minimum_sample_size integer not null default 100 check (minimum_sample_size > 0),
  add column if not exists confidence_threshold numeric not null default 0.95 check (confidence_threshold between 0.5 and 0.999),
  add column if not exists evaluation_window_days integer not null default 7 check (evaluation_window_days > 0),
  add column if not exists winner_variant_id uuid null,
  add column if not exists evaluation_summary jsonb not null default '{}'::jsonb,
  add column if not exists failure_reason text null,
  add column if not exists paused_at timestamptz null,
  add column if not exists completed_at timestamptz null,
  add column if not exists archived_at timestamptz null,
  add column if not exists created_by uuid null references auth.users(id) on delete set null,
  add column if not exists updated_by uuid null references auth.users(id) on delete set null,
  add column if not exists public_tracking_token text null unique,
  add constraint ad_ab_tests_status_check check (
    status in ('DRAFT', 'READY', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'ARCHIVED')
  ),
  add constraint ad_ab_tests_primary_metric_check check (
    primary_metric in ('ctr', 'cvr', 'cpc', 'cpa', 'conversion', 'revenue', 'roas', 'bounce_rate', 'cta_click_rate', 'form_submit_rate')
  );

update ad_ab_tests set created_by = user_id where created_by is null;
update ad_ab_tests set public_tracking_token = encode(gen_random_bytes(24), 'hex') where public_tracking_token is null;
alter table ad_ab_tests alter column created_by set not null;
alter table ad_ab_tests alter column public_tracking_token set not null;

alter table ad_ab_test_variants
  alter column twitter_ad_id drop not null,
  add column if not exists name text null,
  add column if not exists description text null,
  add column if not exists allocation numeric not null default 50 check (allocation > 0 and allocation <= 100),
  add column if not exists status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'WINNER', 'LOSER', 'ARCHIVED')),
  add column if not exists landing_page_id uuid null references landing_pages(id) on delete set null,
  add column if not exists configuration jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

update ad_ab_test_variants set name = coalesce(name, 'Variant ' || label);
alter table ad_ab_test_variants alter column name set not null;

alter table ad_ab_tests
  drop constraint if exists ad_ab_tests_winner_variant_id_fkey;
alter table ad_ab_tests
  add constraint ad_ab_tests_winner_variant_id_fkey
  foreign key (winner_variant_id) references ad_ab_test_variants(id) on delete set null;

create table if not exists experiment_status_history (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references ad_ab_tests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  variant_id uuid null references ad_ab_test_variants(id) on delete set null,
  old_status text null,
  new_status text not null,
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now(),
  reason text null
);

create table if not exists lp_analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references ad_projects(id) on delete cascade,
  experiment_id uuid null references ad_ab_tests(id) on delete set null,
  variant_id uuid null references ad_ab_test_variants(id) on delete set null,
  landing_page_id uuid null references landing_pages(id) on delete set null,
  session_id text not null,
  event_name text not null check (event_name in ('PAGE_VIEW', 'BOUNCE', 'SCROLL_DEPTH', 'TIME_ON_PAGE', 'CTA_CLICK', 'FORM_SUBMIT', 'CONVERSION', 'REVENUE')),
  event_value numeric null,
  revenue numeric not null default 0,
  occurred_at timestamptz not null,
  source text not null default 'LP_RUNTIME',
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, idempotency_key)
);

create table if not exists experiment_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references ad_projects(id) on delete cascade,
  experiment_id uuid not null references ad_ab_tests(id) on delete cascade,
  variant_id uuid not null references ad_ab_test_variants(id) on delete cascade,
  source text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  sessions bigint not null default 0,
  impressions bigint not null default 0,
  page_views bigint not null default 0,
  clicks bigint not null default 0,
  cta_clicks bigint not null default 0,
  form_submits bigint not null default 0,
  conversions bigint not null default 0,
  bounces bigint not null default 0,
  scroll_depth numeric not null default 0,
  time_on_page numeric not null default 0,
  spend numeric not null default 0,
  revenue numeric not null default 0,
  calculated_metrics jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, experiment_id, variant_id, source, period_start, period_end)
);

create table if not exists experiment_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references ad_projects(id) on delete cascade,
  experiment_id uuid not null references ad_ab_tests(id) on delete cascade,
  winner_variant_id uuid null references ad_ab_test_variants(id) on delete set null,
  loser_variant_ids jsonb not null default '[]'::jsonb,
  metric text not null,
  improvement_rate numeric not null default 0,
  confidence_score numeric not null default 0,
  statistically_significant boolean not null default false,
  sample_size bigint not null default 0,
  status text not null check (status in ('INSUFFICIENT_DATA', 'WINNER_FOUND', 'NO_WINNER', 'FAILED')),
  reason text not null,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists experiment_learning_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references ad_projects(id) on delete cascade,
  experiment_id uuid not null references ad_ab_tests(id) on delete cascade,
  evaluation_id uuid not null references experiment_evaluations(id) on delete cascade,
  experiment_type text not null,
  winner_pattern jsonb not null default '{}'::jsonb,
  loser_pattern jsonb not null default '{}'::jsonb,
  impact_score numeric not null default 0,
  confidence_score numeric not null default 0,
  market_segment text null,
  created_at timestamptz not null default now(),
  unique(user_id, experiment_id, evaluation_id)
);

create table if not exists revenue_impacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references ad_projects(id) on delete cascade,
  experiment_id uuid not null references ad_ab_tests(id) on delete cascade,
  outcome_id uuid null references improvement_outcomes(id) on delete set null,
  evaluation_id uuid not null references experiment_evaluations(id) on delete cascade,
  baseline_conversions numeric not null default 0,
  measured_conversions numeric not null default 0,
  incremental_conversions numeric not null default 0,
  baseline_revenue numeric not null default 0,
  measured_revenue numeric not null default 0,
  incremental_revenue numeric not null default 0,
  cpa_improvement numeric not null default 0,
  roas_improvement numeric not null default 0,
  calculation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, experiment_id, evaluation_id)
);

create table if not exists experiment_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references ad_projects(id) on delete cascade,
  experiment_id uuid not null references ad_ab_tests(id) on delete cascade,
  evaluation_id uuid not null references experiment_evaluations(id) on delete cascade,
  title text not null,
  summary text not null,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lp_analytics_events_experiment_idx on lp_analytics_events(user_id, experiment_id, variant_id, occurred_at);
create index if not exists experiment_measurements_experiment_idx on experiment_measurements(user_id, experiment_id, created_at desc);
create index if not exists experiment_evaluations_experiment_idx on experiment_evaluations(user_id, experiment_id, created_at desc);
create index if not exists experiment_learning_project_idx on experiment_learning_data(user_id, project_id, created_at desc);
create index if not exists revenue_impacts_project_idx on revenue_impacts(user_id, project_id, created_at desc);
create index if not exists experiment_status_history_idx on experiment_status_history(user_id, experiment_id, changed_at);

alter table experiment_status_history enable row level security;
alter table lp_analytics_events enable row level security;
alter table experiment_measurements enable row level security;
alter table experiment_evaluations enable row level security;
alter table experiment_learning_data enable row level security;
alter table revenue_impacts enable row level security;
alter table experiment_insights enable row level security;

create policy "Users read own experiment history" on experiment_status_history for select using (auth.uid() = user_id);
create policy "Users manage own lp analytics events" on lp_analytics_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users read own experiment measurements" on experiment_measurements for select using (auth.uid() = user_id);
create policy "Users read own experiment evaluations" on experiment_evaluations for select using (auth.uid() = user_id);
create policy "Users read own experiment learning" on experiment_learning_data for select using (auth.uid() = user_id);
create policy "Users read own revenue impacts" on revenue_impacts for select using (auth.uid() = user_id);
create policy "Users read own experiment insights" on experiment_insights for select using (auth.uid() = user_id);

create or replace function validate_experiment_transition()
returns trigger language plpgsql as $$
begin
  if new.status = old.status then return new; end if;
  if not (
    (old.status = 'DRAFT' and new.status in ('READY', 'ARCHIVED')) or
    (old.status = 'READY' and new.status in ('RUNNING', 'ARCHIVED', 'FAILED')) or
    (old.status = 'RUNNING' and new.status in ('PAUSED', 'COMPLETED', 'FAILED')) or
    (old.status = 'PAUSED' and new.status in ('RUNNING', 'COMPLETED', 'FAILED', 'ARCHIVED')) or
    (old.status = 'FAILED' and new.status in ('READY', 'ARCHIVED')) or
    (old.status = 'COMPLETED' and new.status = 'ARCHIVED')
  ) then raise exception 'Invalid experiment status transition: % -> %', old.status, new.status; end if;
  if new.updated_by is null then raise exception 'updated_by is required for experiment transitions.'; end if;
  if new.status = 'RUNNING' and new.started_at is null then new.started_at := now(); end if;
  if new.status = 'PAUSED' then new.paused_at := now(); end if;
  if new.status = 'COMPLETED' then new.completed_at := now(); new.ended_at := now(); end if;
  if new.status = 'ARCHIVED' then new.archived_at := now(); end if;
  return new;
end $$;

create or replace function record_experiment_status_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into experiment_status_history(experiment_id, user_id, old_status, new_status, changed_by, reason)
    values (new.id, new.user_id, null, new.status, new.created_by, 'Experiment created.');
  elsif new.status is distinct from old.status then
    insert into experiment_status_history(experiment_id, user_id, old_status, new_status, changed_by, reason)
    values (new.id, new.user_id, old.status, new.status, new.updated_by, coalesce(new.failure_reason, 'Experiment status updated.'));
  end if;
  return new;
end $$;

drop trigger if exists validate_ad_ab_test_transition on ad_ab_tests;
create trigger validate_ad_ab_test_transition before update of status on ad_ab_tests
for each row execute function validate_experiment_transition();
drop trigger if exists record_ad_ab_test_status on ad_ab_tests;
create trigger record_ad_ab_test_status after insert or update of status on ad_ab_tests
for each row execute function record_experiment_status_history();

insert into experiment_status_history(experiment_id, user_id, old_status, new_status, changed_by, changed_at, reason)
select t.id, t.user_id, null, t.status, t.created_by, t.created_at, 'Backfilled existing experiment.'
from ad_ab_tests t
where not exists (select 1 from experiment_status_history h where h.experiment_id = t.id);

create or replace function get_experiment_executive_dashboard(p_user_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'active_experiments', (select count(*) from ad_ab_tests where user_id = p_user_id and status in ('READY', 'RUNNING', 'PAUSED')),
    'completed_experiments', (select count(*) from ad_ab_tests where user_id = p_user_id and status = 'COMPLETED'),
    'winning_variants', (select count(*) from ad_ab_test_variants where user_id = p_user_id and status = 'WINNER'),
    'failing_variants', (select count(*) from ad_ab_test_variants where user_id = p_user_id and status = 'LOSER'),
    'success_rate', (select case when count(*) = 0 then 0 else round(count(*) filter (where status = 'WINNER_FOUND') * 100.0 / count(*), 2) end from experiment_evaluations where user_id = p_user_id),
    'average_improvement_rate', (select coalesce(avg(improvement_rate), 0) from experiment_evaluations where user_id = p_user_id and status = 'WINNER_FOUND'),
    'total_revenue_impact', (select coalesce(sum(incremental_revenue), 0) from revenue_impacts where user_id = p_user_id),
    'learning_insights', (select count(*) from experiment_learning_data where user_id = p_user_id),
    'recent_insights', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select id, title, summary, created_at from experiment_insights where user_id = p_user_id order by created_at desc limit 10) x)
  );
$$;

revoke execute on function get_experiment_executive_dashboard(uuid) from anon, authenticated;
grant execute on function get_experiment_executive_dashboard(uuid) to service_role;
