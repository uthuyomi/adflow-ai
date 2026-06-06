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

  if p_stripe_event_id is not null and exists (
    select 1 from credit_transactions where stripe_event_id = p_stripe_event_id
  ) then
    select * into v_balance from ensure_credit_balance(p_user_id);
    return v_balance;
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

revoke execute on function grant_monthly_credits(uuid, integer, text, text) from anon, authenticated;
grant execute on function grant_monthly_credits(uuid, integer, text, text) to service_role;
