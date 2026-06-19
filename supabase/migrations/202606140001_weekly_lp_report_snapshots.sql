create table if not exists lp_report_snapshots (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references demand_intelligence_runs(id) on delete cascade,
  query text not null,
  recommendation text not null check (recommendation in ('BUILD', 'PIVOT', 'WAIT')),
  confidence text not null check (confidence in ('High', 'Medium', 'Low')),
  opportunity text not null check (opportunity in ('High', 'Medium', 'Low')),
  reasons jsonb not null default '[]'::jsonb,
  next_action text not null,
  demand_score numeric not null check (demand_score between 0 and 100),
  evidence_count integer not null default 0,
  competitor_candidate_count integer not null default 0,
  cluster_count integer not null default 0,
  real_source_count integer not null default 0,
  source_counts jsonb not null default '{}'::jsonb,
  source_statuses jsonb not null default '[]'::jsonb,
  collected_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(run_id)
);

create index if not exists lp_report_snapshots_collected_idx
  on lp_report_snapshots(collected_at desc);

alter table lp_report_snapshots enable row level security;

-- The public LP reads this table through a server-side route using service_role.
-- No anon or authenticated policy is intentionally created.
