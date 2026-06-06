create table if not exists ad_ab_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references ad_projects(id) on delete cascade,
  name text not null,
  hypothesis text,
  primary_metric text not null default 'ctr' check (primary_metric in ('ctr', 'cvr', 'cpc')),
  status text not null default 'draft' check (status in ('draft', 'running', 'completed', 'archived')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ad_ab_test_variants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id uuid not null references ad_ab_tests(id) on delete cascade,
  twitter_ad_id uuid not null references twitter_ads(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  unique (test_id, twitter_ad_id),
  unique (test_id, label)
);

create index if not exists ad_ab_tests_user_project_idx
  on ad_ab_tests(user_id, project_id, created_at desc);

create index if not exists ad_ab_test_variants_test_idx
  on ad_ab_test_variants(test_id, created_at asc);

alter table ad_ab_tests enable row level security;
alter table ad_ab_test_variants enable row level security;

drop policy if exists "Users read own ad ab tests" on ad_ab_tests;
create policy "Users read own ad ab tests" on ad_ab_tests
for select using (auth.uid() = user_id);

drop policy if exists "Users create own ad ab tests" on ad_ab_tests;
create policy "Users create own ad ab tests" on ad_ab_tests
for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own ad ab tests" on ad_ab_tests;
create policy "Users update own ad ab tests" on ad_ab_tests
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete own ad ab tests" on ad_ab_tests;
create policy "Users delete own ad ab tests" on ad_ab_tests
for delete using (auth.uid() = user_id);

drop policy if exists "Users read own ad ab test variants" on ad_ab_test_variants;
create policy "Users read own ad ab test variants" on ad_ab_test_variants
for select using (auth.uid() = user_id);

drop policy if exists "Users create own ad ab test variants" on ad_ab_test_variants;
create policy "Users create own ad ab test variants" on ad_ab_test_variants
for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own ad ab test variants" on ad_ab_test_variants;
create policy "Users update own ad ab test variants" on ad_ab_test_variants
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete own ad ab test variants" on ad_ab_test_variants;
create policy "Users delete own ad ab test variants" on ad_ab_test_variants
for delete using (auth.uid() = user_id);

drop trigger if exists ad_ab_tests_updated_at on ad_ab_tests;
create trigger ad_ab_tests_updated_at
before update on ad_ab_tests
for each row execute function set_adflow_updated_at();
