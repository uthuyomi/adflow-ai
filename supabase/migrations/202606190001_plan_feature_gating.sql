create or replace function effective_billing_plan(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when profile.plan in ('starter', 'growth', 'business')
      and profile.subscription_status in ('active', 'trialing')
      then profile.plan
    else 'free'
  end
  from (select 1) as seed
  left join lateral (
    select plan, subscription_status
    from user_billing_profiles
    where user_id = p_user_id
    limit 1
  ) as profile on true;
$$;

create or replace function saved_item_count(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from ad_projects
      where user_id = p_user_id and status in ('ACTIVE', 'PAUSED', 'ARCHIVED')) +
    (select count(*) from twitter_ads where user_id = p_user_id) +
    (select count(*) from landing_pages where user_id = p_user_id) +
    (select count(*) from ad_lp_pairs where user_id = p_user_id) +
    (select count(*) from demand_discovery_sessions
      where user_id = p_user_id and status in ('active', 'archived'));
$$;

create or replace function enforce_free_saved_item_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if tg_table_name = 'ad_projects'
      and not (old.status = 'DELETED' and new.status in ('ACTIVE', 'PAUSED', 'ARCHIVED')) then
      return new;
    elsif tg_table_name = 'demand_discovery_sessions'
      and not (old.status = 'deleted' and new.status in ('active', 'archived')) then
      return new;
    elsif tg_table_name not in ('ad_projects', 'demand_discovery_sessions') then
      return new;
    end if;
  end if;

  if effective_billing_plan(new.user_id) = 'free'
    and saved_item_count(new.user_id) >= 10 then
    raise exception using
      errcode = 'P0001',
      message = 'PLAN_LIMIT_REACHED',
      detail = 'Free plan supports up to 10 saved items.',
      hint = 'Upgrade to Starter or higher.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_free_saved_items_projects on ad_projects;
create trigger enforce_free_saved_items_projects
before insert or update on ad_projects
for each row execute function enforce_free_saved_item_limit();

drop trigger if exists enforce_free_saved_items_ads on twitter_ads;
create trigger enforce_free_saved_items_ads
before insert or update on twitter_ads
for each row execute function enforce_free_saved_item_limit();

drop trigger if exists enforce_free_saved_items_landing_pages on landing_pages;
create trigger enforce_free_saved_items_landing_pages
before insert or update on landing_pages
for each row execute function enforce_free_saved_item_limit();

drop trigger if exists enforce_free_saved_items_pairs on ad_lp_pairs;
create trigger enforce_free_saved_items_pairs
before insert or update on ad_lp_pairs
for each row execute function enforce_free_saved_item_limit();

drop trigger if exists enforce_free_saved_items_discovery on demand_discovery_sessions;
create trigger enforce_free_saved_items_discovery
before insert or update on demand_discovery_sessions
for each row execute function enforce_free_saved_item_limit();

create or replace function enforce_pair_analysis_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if effective_billing_plan(new.user_id) not in ('starter', 'growth', 'business') then
    raise exception using
      errcode = 'P0001',
      message = 'PLAN_UPGRADE_REQUIRED',
      detail = 'Starter plan or higher is required for pair analysis.',
      hint = 'Upgrade to Starter or higher.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_pair_analysis_plan on analysis_runs;
create trigger enforce_pair_analysis_plan
before insert on analysis_runs
for each row execute function enforce_pair_analysis_plan();

create or replace function enforce_experiment_creation_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if effective_billing_plan(new.user_id) not in ('growth', 'business') then
    raise exception using
      errcode = 'P0001',
      message = 'PLAN_UPGRADE_REQUIRED',
      detail = 'Growth plan or higher is required to create experiments.',
      hint = 'Upgrade to Growth or higher.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_experiment_creation_plan on ad_ab_tests;
create trigger enforce_experiment_creation_plan
before insert on ad_ab_tests
for each row execute function enforce_experiment_creation_plan();

revoke execute on function effective_billing_plan(uuid) from anon, authenticated;
revoke execute on function saved_item_count(uuid) from anon, authenticated;
grant execute on function effective_billing_plan(uuid) to service_role;
grant execute on function saved_item_count(uuid) to service_role;
