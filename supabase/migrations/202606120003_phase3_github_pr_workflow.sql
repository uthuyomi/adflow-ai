create table if not exists github_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  github_user_id text not null,
  github_login text not null,
  encrypted_access_token text not null,
  scopes text[] not null default '{}'::text[],
  status text not null default 'active' check (status in ('active', 'invalid', 'revoked')),
  last_verified_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, github_user_id)
);

create table if not exists github_oauth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state text not null unique,
  return_path text not null default '/settings',
  status text not null default 'pending' check (status in ('pending', 'completed', 'denied', 'failed', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists github_repository_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references github_connections(id) on delete cascade,
  repository_full_name text not null,
  github_repository_id text not null,
  default_branch text not null,
  permission text not null,
  status text not null default 'active' check (status in ('active', 'missing', 'permission_denied')),
  selected_at timestamptz not null default now(),
  last_verified_at timestamptz null,
  last_error text null,
  unique(user_id, repository_full_name)
);

create table if not exists github_pull_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  improvement_id uuid not null references ai_agent_results(id) on delete cascade,
  connection_id uuid not null references github_connections(id) on delete restrict,
  repository_selection_id uuid not null references github_repository_selections(id) on delete restrict,
  repository text not null,
  base_branch text not null,
  branch_name text not null,
  github_branch_id text null,
  diff_payload jsonb not null default '{}'::jsonb,
  commit_sha text null,
  commit_message text null,
  pr_number integer null,
  pr_url text null,
  pr_title text not null,
  pr_body text not null,
  status text not null default 'CREATING' check (status in ('CREATING', 'OPEN', 'MERGED', 'CLOSED', 'FAILED')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz null,
  error_message text null,
  unique(user_id, improvement_id, repository)
);

create table if not exists github_pr_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  github_pull_request_id uuid not null references github_pull_requests(id) on delete cascade,
  improvement_id uuid not null references ai_agent_results(id) on delete cascade,
  repository text not null,
  branch text null,
  commit_sha text null,
  pr_number integer null,
  pr_url text null,
  created_by uuid not null references auth.users(id) on delete restrict,
  status text not null,
  event_type text not null,
  error_message text null,
  created_at timestamptz not null default now()
);

create index if not exists github_pull_requests_user_status_idx on github_pull_requests(user_id, status, created_at desc);
create index if not exists github_pr_events_request_idx on github_pr_events(user_id, github_pull_request_id, created_at asc);

alter table github_connections enable row level security;
alter table github_oauth_sessions enable row level security;
alter table github_repository_selections enable row level security;
alter table github_pull_requests enable row level security;
alter table github_pr_events enable row level security;

create policy "Users read own github connections" on github_connections for select using (auth.uid() = user_id);
create policy "Users read own github oauth sessions" on github_oauth_sessions for select using (auth.uid() = user_id);
create policy "Users manage own github selections" on github_repository_selections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users read own github pull requests" on github_pull_requests for select using (auth.uid() = user_id);
create policy "Users read own github pr events" on github_pr_events for select using (auth.uid() = user_id);

create trigger github_connections_updated_at before update on github_connections for each row execute function set_adflow_updated_at();
create trigger github_pull_requests_updated_at before update on github_pull_requests for each row execute function set_adflow_updated_at();
