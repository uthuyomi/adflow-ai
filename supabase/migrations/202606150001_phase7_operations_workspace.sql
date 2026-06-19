alter table ad_projects
  add column if not exists status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED')),
  add column if not exists archived_at timestamptz null,
  add column if not exists deleted_at timestamptz null,
  add column if not exists duplicated_from uuid null references ad_projects(id) on delete set null;

create index if not exists ad_projects_user_status_updated_idx
  on ad_projects(user_id, status, updated_at desc);

alter table demand_discovery_sessions
  add column if not exists project_id uuid null references ad_projects(id) on delete set null,
  add column if not exists is_favorite boolean not null default false,
  add column if not exists deleted_at timestamptz null;

alter table demand_discovery_sessions drop constraint if exists demand_discovery_sessions_status_check;
alter table demand_discovery_sessions add constraint demand_discovery_sessions_status_check
  check (status in ('active', 'archived', 'deleted'));

create index if not exists demand_discovery_sessions_user_status_favorite_idx
  on demand_discovery_sessions(user_id, status, is_favorite desc, updated_at desc);

create index if not exists ad_projects_search_idx on ad_projects
  using gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '')));
create index if not exists demand_discovery_sessions_search_idx on demand_discovery_sessions
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(last_input, '')));
create index if not exists demand_intelligence_runs_search_idx on demand_intelligence_runs
  using gin (to_tsvector('simple', coalesce(query, '') || ' ' || coalesce(problem_statement, '') || ' ' || coalesce(product_idea, '')));
create index if not exists demand_competitors_search_idx on demand_competitors
  using gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(domain, '') || ' ' || coalesce(category, '')));
create index if not exists ai_agent_results_search_idx on ai_agent_results
  using gin (to_tsvector('simple', coalesce(task, '') || ' ' || coalesce(input_summary, '')));
create index if not exists codex_task_prompts_search_idx on codex_task_prompts
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(implementation_goal, '')));
create index if not exists improvement_outcomes_search_idx on improvement_outcomes
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(description, '')));

create table if not exists user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  body text not null default '',
  target_type text not null,
  target_id uuid null,
  target_url text null,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists background_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid null references ad_projects(id) on delete set null,
  job_type text not null,
  target_type text null,
  target_id uuid null,
  status text not null default 'QUEUED'
    check (status in ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error_code text null,
  error_message text null,
  started_at timestamptz null,
  finished_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid null references ad_projects(id) on delete set null,
  category text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid null,
  title text not null,
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  view_type text not null,
  filters jsonb not null default '{}'::jsonb,
  search_query text not null default '',
  sort jsonb not null default '{}'::jsonb,
  is_favorite boolean not null default false,
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_workspace_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Asia/Tokyo',
  locale text not null default 'ja',
  default_view text not null default '/dashboard',
  display_density text not null default 'comfortable'
    check (display_density in ('compact', 'comfortable')),
  search_preferences jsonb not null default '{}'::jsonb,
  notification_preferences jsonb not null default '{"enabled": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_notifications_unread_idx
  on user_notifications(user_id, created_at desc) where read_at is null;
create index if not exists background_jobs_user_status_idx
  on background_jobs(user_id, status, created_at desc);
create unique index if not exists background_jobs_target_idx
  on background_jobs(user_id, job_type, target_id) where target_id is not null;
create index if not exists activity_events_project_created_idx
  on activity_events(user_id, project_id, created_at desc);
create index if not exists activity_events_entity_idx
  on activity_events(user_id, entity_type, entity_id, created_at desc);
create index if not exists saved_views_user_type_idx
  on saved_views(user_id, view_type, is_favorite desc, updated_at desc);

alter table user_notifications enable row level security;
alter table background_jobs enable row level security;
alter table activity_events enable row level security;
alter table saved_views enable row level security;
alter table user_workspace_settings enable row level security;

alter table user_notifications replica identity full;
alter table background_jobs replica identity full;
alter table activity_events replica identity full;

create policy "Users manage own notifications" on user_notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users read own background jobs" on background_jobs
  for select using (auth.uid() = user_id);
create policy "Users read own activity events" on activity_events
  for select using (auth.uid() = user_id);
create policy "Users manage own saved views" on saved_views
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own workspace settings" on user_workspace_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists background_jobs_updated_at on background_jobs;
create trigger background_jobs_updated_at before update on background_jobs
for each row execute function set_adflow_updated_at();
drop trigger if exists saved_views_updated_at on saved_views;
create trigger saved_views_updated_at before update on saved_views
for each row execute function set_adflow_updated_at();
drop trigger if exists user_workspace_settings_updated_at on user_workspace_settings;
create trigger user_workspace_settings_updated_at before update on user_workspace_settings
for each row execute function set_adflow_updated_at();

create or replace function record_operational_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_project_id uuid;
  v_entity_id uuid;
  v_title text;
  v_action text;
  v_status text;
  v_url text;
  v_notify boolean := false;
begin
  v_user_id := (to_jsonb(new)->>'user_id')::uuid;
  v_project_id := case
    when tg_table_name = 'ad_projects' then (to_jsonb(new)->>'id')::uuid
    when nullif(to_jsonb(new)->>'project_id', '') is not null then (to_jsonb(new)->>'project_id')::uuid
    else null
  end;
  v_entity_id := (to_jsonb(new)->>'id')::uuid;
  v_title := coalesce(to_jsonb(new)->>'title', to_jsonb(new)->>'name', tg_table_name);
  v_action := case when tg_op = 'INSERT' then 'created' else 'updated' end;
  v_status := coalesce(to_jsonb(new)->>'decision_status', to_jsonb(new)->>'outcome_status', to_jsonb(new)->>'status');

  if tg_table_name = 'demand_intelligence_runs' and v_status in ('completed', 'failed') then
    v_action := v_status;
    v_notify := true;
    v_url := '/demand-discovery';
  elsif tg_table_name = 'ai_agent_results' and tg_op = 'INSERT' then
    v_action := 'generated';
    v_notify := true;
    v_url := '/improvements/' || new.id::text;
  elsif tg_table_name = 'codex_task_prompts' and v_status in ('SUCCEEDED', 'FAILED', 'PR_CREATED', 'OUTCOME_CREATED') then
    v_action := lower(v_status);
    v_notify := true;
    v_url := '/codex-tasks/' || v_entity_id::text;
  elsif tg_table_name = 'github_pull_requests' and v_status in ('OPEN', 'MERGED', 'CLOSED', 'FAILED') then
    v_action := lower(v_status);
    v_notify := true;
    v_url := '/prs';
  elsif tg_table_name = 'improvement_outcomes' then
    v_action := lower(coalesce(v_status, 'updated'));
    v_notify := true;
    v_url := '/outcomes/' || v_entity_id::text;
  elsif tg_table_name = 'credit_transactions' then
    v_action := lower(coalesce(to_jsonb(new)->>'type', 'updated'));
    v_notify := true;
    v_url := '/settings';
  elsif tg_table_name = 'outcome_learning_data' then
    v_action := 'updated';
    v_notify := true;
    v_url := '/outcomes/' || (to_jsonb(new)->>'outcome_id');
  elsif tg_table_name = 'ad_projects' then
    v_action := lower(v_status);
    v_url := '/projects/' || v_entity_id::text;
  end if;

  insert into activity_events (
    user_id, project_id, category, action, entity_type, entity_id, title, summary, metadata
  ) values (
    v_user_id, v_project_id, tg_table_name, v_action, tg_table_name, v_entity_id,
    v_title, tg_table_name || ' ' || v_action, jsonb_build_object('operation', tg_op)
  );

  if v_notify then
    select coalesce((notification_preferences->>'enabled')::boolean, true)
    into v_notify
    from user_workspace_settings
    where user_id = v_user_id;
    v_notify := coalesce(v_notify, true);
  end if;

  if v_notify then
    insert into user_notifications (
      user_id, category, title, body, target_type, target_id, target_url
    ) values (
      v_user_id, tg_table_name, v_title, tg_table_name || ' ' || v_action,
      tg_table_name, v_entity_id, v_url
    );
  end if;
  return new;
end;
$$;

drop trigger if exists operational_event_projects on ad_projects;
create trigger operational_event_projects after insert or update of status on ad_projects
for each row execute function record_operational_event();
drop trigger if exists operational_event_discovery on demand_discovery_sessions;
create trigger operational_event_discovery after insert or update of status on demand_discovery_sessions
for each row execute function record_operational_event();
drop trigger if exists operational_event_demand_runs on demand_intelligence_runs;
create trigger operational_event_demand_runs after insert or update of status on demand_intelligence_runs
for each row execute function record_operational_event();
drop trigger if exists operational_event_improvements on ai_agent_results;
create trigger operational_event_improvements after insert or update of decision_status on ai_agent_results
for each row execute function record_operational_event();
drop trigger if exists operational_event_codex on codex_task_prompts;
create trigger operational_event_codex after insert or update of status on codex_task_prompts
for each row execute function record_operational_event();
drop trigger if exists operational_event_github on github_pull_requests;
create trigger operational_event_github after insert or update of status on github_pull_requests
for each row execute function record_operational_event();
drop trigger if exists operational_event_outcomes on improvement_outcomes;
create trigger operational_event_outcomes after insert or update of outcome_status on improvement_outcomes
for each row execute function record_operational_event();
drop trigger if exists operational_event_billing on credit_transactions;
create trigger operational_event_billing after insert on credit_transactions
for each row execute function record_operational_event();
drop trigger if exists operational_event_learning on outcome_learning_data;
create trigger operational_event_learning after insert or update on outcome_learning_data
for each row execute function record_operational_event();

create or replace function sync_background_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_job_status text;
  v_project_id uuid;
begin
  v_status := coalesce(to_jsonb(new)->>'status', '');
  v_project_id := nullif(to_jsonb(new)->>'project_id', '')::uuid;
  v_job_status := case
    when v_status in ('running', 'RUNNING') then 'RUNNING'
    when v_status in ('completed', 'SUCCEEDED', 'PR_CREATED', 'OUTCOME_CREATED') then 'SUCCEEDED'
    when v_status in ('failed', 'FAILED') then 'FAILED'
    when v_status in ('CANCELLED') then 'CANCELLED'
    else 'QUEUED'
  end;
  insert into background_jobs (
    user_id, project_id, job_type, target_type, target_id, status,
    attempt_count, error_code, error_message, started_at, finished_at
  ) values (
    new.user_id, v_project_id, tg_table_name, tg_table_name, new.id, v_job_status,
    case when v_job_status = 'RUNNING' then 1 else 0 end,
    to_jsonb(new)->>'error_code', to_jsonb(new)->>'error_message',
    case when v_job_status = 'RUNNING' then now() else null end,
    case when v_job_status in ('SUCCEEDED', 'FAILED', 'CANCELLED') then now() else null end
  )
  on conflict (user_id, job_type, target_id) where target_id is not null do update
  set status = excluded.status,
      project_id = excluded.project_id,
      error_code = excluded.error_code,
      error_message = excluded.error_message,
      started_at = coalesce(background_jobs.started_at, excluded.started_at),
      finished_at = excluded.finished_at;
  return new;
end;
$$;

drop trigger if exists sync_demand_background_job on demand_intelligence_runs;
create trigger sync_demand_background_job after insert or update of status on demand_intelligence_runs
for each row execute function sync_background_job();
drop trigger if exists sync_codex_background_job on codex_task_prompts;
create trigger sync_codex_background_job after insert or update of status on codex_task_prompts
for each row execute function sync_background_job();

create or replace function global_workspace_search(p_user_id uuid, p_query text, p_limit integer default 30)
returns table (
  result_type text, result_id uuid, project_id uuid, title text, subtitle text, target_url text, updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select * from (
    select 'project', p.id, p.id, p.name, coalesce(p.description, ''), '/projects/' || p.id::text, p.updated_at
    from ad_projects p where p.user_id = p_user_id and p.status <> 'DELETED'
      and to_tsvector('simple', coalesce(p.name, '') || ' ' || coalesce(p.description, '')) @@ websearch_to_tsquery('simple', p_query)
    union all
    select 'discovery', d.id, d.project_id, d.title, d.last_input, '/demand-discovery?session=' || d.id::text, d.updated_at
    from demand_discovery_sessions d where d.user_id = p_user_id and d.status <> 'deleted'
      and to_tsvector('simple', coalesce(d.title, '') || ' ' || coalesce(d.last_input, '')) @@ websearch_to_tsquery('simple', p_query)
    union all
    select 'research', r.id, r.project_id, coalesce(r.query, 'Research'), coalesce(r.summary->>'overview', ''), '/pairs/' || coalesce(r.ad_lp_pair_id::text, ''), r.created_at
    from demand_intelligence_runs r where r.user_id = p_user_id
      and to_tsvector('simple', coalesce(r.query, '') || ' ' || coalesce(r.problem_statement, '') || ' ' || coalesce(r.product_idea, '')) @@ websearch_to_tsquery('simple', p_query)
    union all
    select 'competitor', c.id, r.project_id, c.name, c.domain, '/pairs/' || coalesce(r.ad_lp_pair_id::text, ''), c.created_at
    from demand_competitors c join demand_intelligence_runs r on r.id = c.run_id
    where c.user_id = p_user_id and to_tsvector('simple', coalesce(c.name, '') || ' ' || coalesce(c.domain, '') || ' ' || coalesce(c.category, '')) @@ websearch_to_tsquery('simple', p_query)
    union all
    select 'improvement', i.id, i.project_id, coalesce(i.task, 'Improvement'), coalesce(i.input_summary, ''), '/improvements/' || i.id::text, i.created_at
    from ai_agent_results i where i.user_id = p_user_id
      and to_tsvector('simple', coalesce(i.task, '') || ' ' || coalesce(i.input_summary, '')) @@ websearch_to_tsquery('simple', p_query)
    union all
    select 'codex', c.id, c.project_id, c.title, coalesce(c.summary, ''), '/codex-tasks/' || c.id::text, c.updated_at
    from codex_task_prompts c where c.user_id = p_user_id
      and to_tsvector('simple', coalesce(c.title, '') || ' ' || coalesce(c.summary, '') || ' ' || coalesce(c.implementation_goal, '')) @@ websearch_to_tsquery('simple', p_query)
    union all
    select 'outcome', o.id, o.project_id, o.title, coalesce(o.summary, ''), '/outcomes/' || o.id::text, o.updated_at
    from improvement_outcomes o where o.user_id = p_user_id
      and to_tsvector('simple', coalesce(o.title, '') || ' ' || coalesce(o.summary, '') || ' ' || coalesce(o.description, '')) @@ websearch_to_tsquery('simple', p_query)
    union all
    select 'learning', l.id, l.project_id, l.improvement_type, coalesce(l.market_type, ''), '/outcomes/' || l.outcome_id::text, l.updated_at
    from outcome_learning_data l where l.user_id = p_user_id
      and (l.improvement_type ilike '%' || p_query || '%' or coalesce(l.market_type, '') ilike '%' || p_query || '%' or coalesce(l.project_type, '') ilike '%' || p_query || '%')
  ) results order by updated_at desc limit greatest(1, least(p_limit, 100));
$$;

create or replace function get_operations_dashboard(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'active_projects', (select count(*) from ad_projects where user_id = p_user_id and status = 'ACTIVE'),
    'latest_discovery', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select id, title, status, updated_at from demand_discovery_sessions where user_id = p_user_id and status <> 'deleted' order by updated_at desc limit 5) x),
    'latest_research', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select id, query, status, created_at from demand_intelligence_runs where user_id = p_user_id order by created_at desc limit 5) x),
    'pending_improvements', (select count(*) from ai_agent_results where user_id = p_user_id and decision_status in ('GENERATED', 'APPROVED', 'APPLY_READY')),
    'codex_tasks', (select count(*) from codex_task_prompts where user_id = p_user_id and status in ('CREATED', 'QUEUED', 'RUNNING', 'FAILED')),
    'open_prs', (select count(*) from github_pull_requests where user_id = p_user_id and status = 'OPEN'),
    'pending_outcomes', (select count(*) from improvement_outcomes where user_id = p_user_id and outcome_status in ('DRAFT', 'PENDING_MEASUREMENT', 'MEASURING')),
    'unread_notifications', (select count(*) from user_notifications where user_id = p_user_id and read_at is null),
    'failed_jobs', (select count(*) from background_jobs where user_id = p_user_id and status = 'FAILED'),
    'recent_activity', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select * from activity_events where user_id = p_user_id order by created_at desc limit 10) x)
  );
$$;

revoke execute on function global_workspace_search(uuid, text, integer) from anon, authenticated;
revoke execute on function get_operations_dashboard(uuid) from anon, authenticated;
grant execute on function global_workspace_search(uuid, text, integer) to service_role;
grant execute on function get_operations_dashboard(uuid) to service_role;

do $$
declare
  v_table text;
begin
  foreach v_table in array array['user_notifications', 'background_jobs', 'activity_events'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;
