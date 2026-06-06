alter table user_billing_profiles
drop constraint if exists user_billing_profiles_plan_check;

update user_billing_profiles
set plan = 'growth'
where plan = 'pro';

alter table user_billing_profiles
add constraint user_billing_profiles_plan_check
check (plan in ('free', 'starter', 'growth', 'business'));

alter table user_credit_balances
alter column monthly_credits set default 500;

update user_credit_balances as balances
set monthly_credits = 500
where monthly_credits = 100
  and not exists (
    select 1
    from user_billing_profiles as profiles
    where profiles.user_id = balances.user_id
      and profiles.plan in ('starter', 'growth', 'business')
      and profiles.subscription_status in ('active', 'trialing')
  );

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
  values (p_user_id, 500, 0, 0)
  on conflict (user_id) do nothing;

  select * into v_balance
  from user_credit_balances
  where user_id = p_user_id;

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
  values (p_user_id, 500, p_amount, 0)
  on conflict (user_id) do update
    set purchased_credits = user_credit_balances.purchased_credits + excluded.purchased_credits;

  insert into credit_transactions (user_id, type, amount, reason, stripe_event_id)
  values (p_user_id, 'purchase', p_amount, p_reason, p_stripe_event_id)
  on conflict (stripe_event_id) where stripe_event_id is not null do nothing;

  select * into v_balance from user_credit_balances where user_id = p_user_id;
  return v_balance;
end;
$$;
