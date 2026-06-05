create table if not exists demand_discovery_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  last_input text not null default '',
  last_assistant_response text not null default '',
  messages jsonb not null default '[]'::jsonb,
  insight jsonb,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demand_discovery_sessions_user_updated_idx
  on demand_discovery_sessions(user_id, updated_at desc);

alter table demand_discovery_sessions enable row level security;

drop policy if exists "Users read own demand discovery sessions" on demand_discovery_sessions;
create policy "Users read own demand discovery sessions" on demand_discovery_sessions
for select using (auth.uid() = user_id);

drop policy if exists "Users create own demand discovery sessions" on demand_discovery_sessions;
create policy "Users create own demand discovery sessions" on demand_discovery_sessions
for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own demand discovery sessions" on demand_discovery_sessions;
create policy "Users update own demand discovery sessions" on demand_discovery_sessions
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete own demand discovery sessions" on demand_discovery_sessions;
create policy "Users delete own demand discovery sessions" on demand_discovery_sessions
for delete using (auth.uid() = user_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists demand_discovery_sessions_updated_at on demand_discovery_sessions;
create trigger demand_discovery_sessions_updated_at
before update on demand_discovery_sessions
for each row execute function set_updated_at();
