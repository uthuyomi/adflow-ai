create table if not exists user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'en' check (locale in ('en', 'ja')),
  analysis_ai_mode text not null default 'openai_only' check (analysis_ai_mode in ('openai_only', 'multi_provider')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_preferences enable row level security;

drop policy if exists "Users read own preferences" on user_preferences;
create policy "Users read own preferences" on user_preferences
for select using (auth.uid() = user_id);

drop policy if exists "Users create own preferences" on user_preferences;
create policy "Users create own preferences" on user_preferences
for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own preferences" on user_preferences;
create policy "Users update own preferences" on user_preferences
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists user_preferences_updated_at on user_preferences;
create trigger user_preferences_updated_at
before update on user_preferences
for each row execute function set_adflow_updated_at();
