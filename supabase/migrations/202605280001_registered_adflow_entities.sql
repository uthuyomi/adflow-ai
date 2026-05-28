create table if not exists ad_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists twitter_ads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references ad_projects(id) on delete cascade,
  name text not null,
  campaign_name text,
  ad_group_name text,
  headline text,
  body text,
  cta text,
  destination_url text not null,
  image_url text,
  video_url text,
  impressions integer default 0,
  clicks integer default 0,
  conversions integer default 0,
  spend numeric default 0,
  ctr numeric default 0,
  cpc numeric default 0,
  cvr numeric default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists landing_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references ad_projects(id) on delete cascade,
  name text not null,
  url text not null,
  hero_title text,
  hero_subtitle text,
  primary_cta text,
  secondary_cta text,
  offer_text text,
  target_audience text,
  bounce_rate numeric,
  session_duration numeric,
  scroll_depth numeric,
  page_speed numeric,
  fcp numeric,
  lcp numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ad_lp_pairs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references ad_projects(id) on delete cascade,
  twitter_ad_id uuid not null references twitter_ads(id) on delete cascade,
  landing_page_id uuid not null references landing_pages(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  last_analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, twitter_ad_id, landing_page_id)
);

create table if not exists change_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references ad_projects(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  summary text,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists analysis_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references ad_projects(id) on delete cascade,
  ad_lp_pair_id uuid not null references ad_lp_pairs(id) on delete cascade,
  score numeric,
  ctr_trend numeric,
  hero_similarity numeric,
  cta_strength numeric,
  bounce_rate numeric,
  risk_level text,
  ad_improvements jsonb,
  lp_improvements jsonb,
  diff_plan jsonb,
  review_result jsonb,
  history_insights jsonb,
  created_at timestamptz not null default now()
);

create or replace function set_adflow_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_ad_projects_updated_at on ad_projects;
create trigger set_ad_projects_updated_at
before update on ad_projects
for each row execute function set_adflow_updated_at();

drop trigger if exists set_twitter_ads_updated_at on twitter_ads;
create trigger set_twitter_ads_updated_at
before update on twitter_ads
for each row execute function set_adflow_updated_at();

drop trigger if exists set_landing_pages_updated_at on landing_pages;
create trigger set_landing_pages_updated_at
before update on landing_pages
for each row execute function set_adflow_updated_at();

drop trigger if exists set_ad_lp_pairs_updated_at on ad_lp_pairs;
create trigger set_ad_lp_pairs_updated_at
before update on ad_lp_pairs
for each row execute function set_adflow_updated_at();

alter table ad_projects enable row level security;
alter table twitter_ads enable row level security;
alter table landing_pages enable row level security;
alter table ad_lp_pairs enable row level security;
alter table change_history enable row level security;
alter table analysis_runs enable row level security;

create policy "Users can select own ad projects" on ad_projects for select using (auth.uid() = user_id);
create policy "Users can insert own ad projects" on ad_projects for insert with check (auth.uid() = user_id);
create policy "Users can update own ad projects" on ad_projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own ad projects" on ad_projects for delete using (auth.uid() = user_id);

create policy "Users can select own twitter ads" on twitter_ads for select using (auth.uid() = user_id);
create policy "Users can insert own twitter ads" on twitter_ads for insert with check (auth.uid() = user_id);
create policy "Users can update own twitter ads" on twitter_ads for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own twitter ads" on twitter_ads for delete using (auth.uid() = user_id);

create policy "Users can select own landing pages" on landing_pages for select using (auth.uid() = user_id);
create policy "Users can insert own landing pages" on landing_pages for insert with check (auth.uid() = user_id);
create policy "Users can update own landing pages" on landing_pages for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own landing pages" on landing_pages for delete using (auth.uid() = user_id);

create policy "Users can select own ad lp pairs" on ad_lp_pairs for select using (auth.uid() = user_id);
create policy "Users can insert own ad lp pairs" on ad_lp_pairs for insert with check (auth.uid() = user_id);
create policy "Users can update own ad lp pairs" on ad_lp_pairs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own ad lp pairs" on ad_lp_pairs for delete using (auth.uid() = user_id);

create policy "Users can select own change history" on change_history for select using (auth.uid() = user_id);
create policy "Users can insert own change history" on change_history for insert with check (auth.uid() = user_id);
create policy "Users can update own change history" on change_history for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own change history" on change_history for delete using (auth.uid() = user_id);

create policy "Users can select own analysis runs" on analysis_runs for select using (auth.uid() = user_id);
create policy "Users can insert own analysis runs" on analysis_runs for insert with check (auth.uid() = user_id);
create policy "Users can update own analysis runs" on analysis_runs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own analysis runs" on analysis_runs for delete using (auth.uid() = user_id);
