create table if not exists x_ads_oauth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state text not null unique,
  oauth_token_hash text null unique,
  encrypted_request_token_secret text null,
  label text not null default 'X Ads',
  return_path text not null default '/ad-optimization',
  status text not null default 'pending' check (status in ('pending', 'completed', 'denied', 'failed', 'expired')),
  expires_at timestamptz not null,
  completed_at timestamptz null,
  error_code text null,
  created_at timestamptz not null default now()
);

create index if not exists x_ads_oauth_sessions_user_created_idx
  on x_ads_oauth_sessions(user_id, created_at desc);

create index if not exists x_ads_oauth_sessions_status_expiry_idx
  on x_ads_oauth_sessions(status, expires_at);

alter table x_ads_oauth_sessions enable row level security;

drop policy if exists "Users read own x ads oauth sessions" on x_ads_oauth_sessions;
create policy "Users read own x ads oauth sessions" on x_ads_oauth_sessions
for select using (auth.uid() = user_id);

