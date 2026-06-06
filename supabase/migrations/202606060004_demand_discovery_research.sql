alter table demand_intelligence_runs
  alter column ad_lp_pair_id drop not null,
  add column if not exists mode text not null default 'pair_analysis',
  add column if not exists discovery_session_id uuid null references demand_discovery_sessions(id) on delete set null,
  add column if not exists scope_type text null,
  add column if not exists target_segment text null,
  add column if not exists problem_statement text null,
  add column if not exists product_idea text null,
  add column if not exists research_query text null,
  add column if not exists research_fingerprint text null;

alter table demand_intelligence_runs
  drop constraint if exists demand_intelligence_runs_mode_check;
alter table demand_intelligence_runs
  add constraint demand_intelligence_runs_mode_check
  check (mode in ('pair_analysis', 'discovery'));

alter table demand_intelligence_runs
  drop constraint if exists demand_intelligence_runs_mode_target_check;
alter table demand_intelligence_runs
  add constraint demand_intelligence_runs_mode_target_check
  check (
    (mode = 'pair_analysis' and ad_lp_pair_id is not null)
    or
    (mode = 'discovery' and discovery_session_id is not null)
  );

create index if not exists demand_intelligence_runs_discovery_created_idx
  on demand_intelligence_runs(discovery_session_id, created_at desc);

create index if not exists demand_intelligence_runs_research_fingerprint_idx
  on demand_intelligence_runs(user_id, research_fingerprint, created_at desc);

alter table demand_discovery_sessions
  add column if not exists latest_demand_run_id uuid null references demand_intelligence_runs(id) on delete set null,
  add column if not exists research_status text not null default 'conversation',
  add column if not exists research_context jsonb not null default '{}'::jsonb,
  add column if not exists research_brief jsonb not null default '{}'::jsonb,
  add column if not exists research_requested_at timestamptz null,
  add column if not exists research_completed_at timestamptz null;

alter table demand_discovery_sessions
  drop constraint if exists demand_discovery_sessions_research_status_check;
alter table demand_discovery_sessions
  add constraint demand_discovery_sessions_research_status_check
  check (
    research_status in (
      'conversation',
      'clarification_required',
      'research_recommended',
      'research_running',
      'research_completed',
      'research_failed'
    )
  );

create table if not exists demand_research_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  discovery_session_id uuid not null references demand_discovery_sessions(id) on delete cascade,
  demand_run_id uuid null references demand_intelligence_runs(id) on delete set null,
  research_fingerprint text not null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  error_message text null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index if not exists demand_research_requests_user_fingerprint_idx
  on demand_research_requests(user_id, research_fingerprint, created_at desc);

alter table demand_research_requests enable row level security;

drop policy if exists "Users manage own demand research requests" on demand_research_requests;
create policy "Users manage own demand research requests" on demand_research_requests
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table demand_intelligence_signals
  drop constraint if exists demand_intelligence_signals_source_type_check;
alter table demand_intelligence_signals
  add constraint demand_intelligence_signals_source_type_check
  check (
    source_type in (
      'x',
      'reddit',
      'yahoo_chiebukuro',
      'amazon_review',
      'rakuten_review',
      'kakaku_review',
      'youtube_comment',
      'google_search',
      'google_related_search',
      'google_suggest',
      'google_people_also_ask',
      'competitor_lp',
      'competitor_review',
      'comparison_article',
      'note',
      'qiita',
      'zenn',
      'bbs',
      'forum',
      'review_site',
      'app_store_review',
      'google_play_review',
      'synthetic'
    )
  );
