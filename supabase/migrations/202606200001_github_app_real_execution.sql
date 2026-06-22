alter table github_connections
  alter column github_user_id drop not null,
  alter column github_login drop not null,
  alter column encrypted_access_token drop not null,
  add column if not exists auth_type text not null default 'LEGACY_TOKEN'
    check (auth_type in ('GITHUB_APP', 'LEGACY_TOKEN')),
  add column if not exists installation_id bigint null,
  add column if not exists account_id text null,
  add column if not exists account_login text null,
  add column if not exists account_type text null,
  add column if not exists repository_selection_mode text null,
  add column if not exists installed_at timestamptz null,
  add column if not exists suspended_at timestamptz null;

create unique index if not exists github_connections_installation_idx
  on github_connections(installation_id)
  where installation_id is not null;

create table if not exists github_app_install_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state text not null unique,
  return_path text not null default '/settings',
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table github_app_install_sessions enable row level security;
create policy "Users read own github app install sessions"
on github_app_install_sessions for select using (auth.uid() = user_id);

alter table codex_task_executions
  add column if not exists repository_selection_id uuid null references github_repository_selections(id) on delete set null,
  add column if not exists repository text null,
  add column if not exists base_branch text null,
  add column if not exists workspace_strategy text null
    check (workspace_strategy in ('ISOLATED_CLONE'));
