create table if not exists user_billing_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'business')),
  subscription_status text not null default 'inactive',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists user_credit_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  monthly_credits integer not null default 100 check (monthly_credits >= 0),
  purchased_credits integer not null default 0 check (purchased_credits >= 0),
  lifetime_used_credits integer not null default 0 check (lifetime_used_credits >= 0),
  last_monthly_reset_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('grant_monthly', 'purchase', 'consume', 'refund', 'adjustment')),
  amount integer not null,
  reason text not null,
  stripe_event_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists credit_transactions_stripe_event_idx
  on credit_transactions(stripe_event_id)
  where stripe_event_id is not null;

create index if not exists user_billing_profiles_user_idx on user_billing_profiles(user_id);
create index if not exists user_billing_profiles_subscription_idx on user_billing_profiles(stripe_subscription_id);
create index if not exists user_credit_balances_user_idx on user_credit_balances(user_id);
create index if not exists credit_transactions_user_created_idx on credit_transactions(user_id, created_at desc);

alter table user_billing_profiles enable row level security;
alter table user_credit_balances enable row level security;
alter table credit_transactions enable row level security;

drop policy if exists "Users read own billing profile" on user_billing_profiles;
create policy "Users read own billing profile" on user_billing_profiles
for select using (auth.uid() = user_id);

drop policy if exists "Users read own credit balance" on user_credit_balances;
create policy "Users read own credit balance" on user_credit_balances
for select using (auth.uid() = user_id);

drop policy if exists "Users read own credit transactions" on credit_transactions;
create policy "Users read own credit transactions" on credit_transactions
for select using (auth.uid() = user_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_billing_profiles_updated_at on user_billing_profiles;
create trigger user_billing_profiles_updated_at
before update on user_billing_profiles
for each row execute function set_updated_at();

drop trigger if exists user_credit_balances_updated_at on user_credit_balances;
create trigger user_credit_balances_updated_at
before update on user_credit_balances
for each row execute function set_updated_at();

create or replace function ensure_credit_balance(p_user_id uuid)
returns user_credit_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance user_credit_balances;
begin
  insert into user_credit_balances (user_id, monthly_credits, purchased_credits, lifetime_used_credits)
  values (p_user_id, 100, 0, 0)
  on conflict (user_id) do nothing;

  select * into v_balance
  from user_credit_balances
  where user_id = p_user_id;

  return v_balance;
end;
$$;

create or replace function grant_monthly_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text default 'monthly_plan_grant',
  p_stripe_event_id text default null
)
returns user_credit_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance user_credit_balances;
begin
  if p_amount < 0 then
    raise exception 'Monthly credit grant must be non-negative.';
  end if;

  insert into user_credit_balances (user_id, monthly_credits, purchased_credits, lifetime_used_credits, last_monthly_reset_at)
  values (p_user_id, p_amount, 0, 0, now())
  on conflict (user_id) do update
    set monthly_credits = excluded.monthly_credits,
        last_monthly_reset_at = now();

  insert into credit_transactions (user_id, type, amount, reason, stripe_event_id)
  values (p_user_id, 'grant_monthly', p_amount, p_reason, p_stripe_event_id)
  on conflict (stripe_event_id) where stripe_event_id is not null do nothing;

  select * into v_balance from user_credit_balances where user_id = p_user_id;
  return v_balance;
end;
$$;

create or replace function add_purchased_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text default 'credit_pack_purchase',
  p_stripe_event_id text default null
)
returns user_credit_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance user_credit_balances;
begin
  if p_amount <= 0 then
    raise exception 'Purchased credits must be positive.';
  end if;

  if p_stripe_event_id is not null and exists (
    select 1 from credit_transactions where stripe_event_id = p_stripe_event_id
  ) then
    select * into v_balance from ensure_credit_balance(p_user_id);
    return v_balance;
  end if;

  insert into user_credit_balances (user_id, monthly_credits, purchased_credits, lifetime_used_credits)
  values (p_user_id, 100, p_amount, 0)
  on conflict (user_id) do update
    set purchased_credits = user_credit_balances.purchased_credits + excluded.purchased_credits;

  insert into credit_transactions (user_id, type, amount, reason, stripe_event_id)
  values (p_user_id, 'purchase', p_amount, p_reason, p_stripe_event_id)
  on conflict (stripe_event_id) where stripe_event_id is not null do nothing;

  select * into v_balance from user_credit_balances where user_id = p_user_id;
  return v_balance;
end;
$$;

create or replace function consume_user_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns user_credit_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance user_credit_balances;
  v_monthly_spend integer;
  v_purchased_spend integer;
begin
  if p_amount <= 0 then
    raise exception 'Credit consumption must be positive.';
  end if;

  select * into v_balance from ensure_credit_balance(p_user_id);

  select * into v_balance
  from user_credit_balances
  where user_id = p_user_id
  for update;

  if (v_balance.monthly_credits + v_balance.purchased_credits) < p_amount then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  v_monthly_spend := least(v_balance.monthly_credits, p_amount);
  v_purchased_spend := p_amount - v_monthly_spend;

  update user_credit_balances
  set monthly_credits = monthly_credits - v_monthly_spend,
      purchased_credits = purchased_credits - v_purchased_spend,
      lifetime_used_credits = lifetime_used_credits + p_amount
  where user_id = p_user_id
  returning * into v_balance;

  insert into credit_transactions (user_id, type, amount, reason, metadata)
  values (p_user_id, 'consume', -p_amount, p_reason, coalesce(p_metadata, '{}'::jsonb));

  return v_balance;
end;
$$;

revoke execute on function ensure_credit_balance(uuid) from anon, authenticated;
revoke execute on function grant_monthly_credits(uuid, integer, text, text) from anon, authenticated;
revoke execute on function add_purchased_credits(uuid, integer, text, text) from anon, authenticated;
revoke execute on function consume_user_credits(uuid, integer, text, jsonb) from anon, authenticated;

grant execute on function ensure_credit_balance(uuid) to service_role;
grant execute on function grant_monthly_credits(uuid, integer, text, text) to service_role;
grant execute on function add_purchased_credits(uuid, integer, text, text) to service_role;
grant execute on function consume_user_credits(uuid, integer, text, jsonb) to service_role;
