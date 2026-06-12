alter table ai_agent_results
  add column if not exists provider_type text not null default 'MOCK'
    check (provider_type in ('REAL', 'MOCK')),
  add column if not exists failure_reason text null,
  add column if not exists source_provider text not null default 'unknown';

update ai_agent_results
set source_provider = provider
where source_provider = 'unknown';

-- Existing result rows do not contain trustworthy provenance. They are
-- conservatively treated as MOCK, so previously calculated scorecards cannot
-- remain as learning inputs.
delete from ai_agent_scorecards;

delete from demand_outcome_learning_links as links
using improvement_outcomes as outcomes, ai_agent_results as results
where links.outcome_id = outcomes.id
  and outcomes.source_ai_result_id = results.id
  and results.provider_type = 'MOCK';

alter table analysis_runs
  add column if not exists provider_type text not null default 'MOCK'
    check (provider_type in ('REAL', 'MOCK')),
  add column if not exists failure_reason text null,
  add column if not exists source_provider text not null default 'unknown';

alter table demand_intelligence_signals
  add column if not exists data_source_type text not null default 'SYNTHETIC'
    check (data_source_type in ('REAL', 'SYNTHETIC'));

update demand_intelligence_signals
set data_source_type = case
  when connector_key in ('google_custom_search', 'firecrawl_search', 'firecrawl', 'x', 'web_page') then 'REAL'
  else 'SYNTHETIC'
end;

alter table demand_intelligence_embeddings
  add column if not exists data_source_type text not null default 'SYNTHETIC'
    check (data_source_type in ('REAL', 'SYNTHETIC'));

alter table demand_intelligence_clusters
  add column if not exists data_source_type text not null default 'SYNTHETIC'
    check (data_source_type in ('REAL', 'SYNTHETIC'));

alter table demand_signal_snapshots
  add column if not exists data_source_type text not null default 'SYNTHETIC'
    check (data_source_type in ('REAL', 'SYNTHETIC'));

alter table demand_search_signals
  add column if not exists data_source_type text not null default 'SYNTHETIC'
    check (data_source_type in ('REAL', 'SYNTHETIC'));

alter table demand_market_size_estimates
  add column if not exists data_source_type text not null default 'SYNTHETIC'
    check (data_source_type in ('REAL', 'SYNTHETIC'));

create table if not exists stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  error_message text null,
  processed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists stripe_webhook_events_updated_at on stripe_webhook_events;
create trigger stripe_webhook_events_updated_at
before update on stripe_webhook_events
for each row execute function set_updated_at();

alter table stripe_webhook_events enable row level security;

create table if not exists contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  topic text not null,
  message text not null,
  locale text not null default 'en',
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'spam')),
  ip_hash text null,
  user_agent text null,
  created_at timestamptz not null default now()
);

create index if not exists contact_inquiries_email_created_idx
  on contact_inquiries(email, created_at desc);
create index if not exists contact_inquiries_ip_created_idx
  on contact_inquiries(ip_hash, created_at desc);

alter table contact_inquiries enable row level security;

create or replace function refund_purchased_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_stripe_event_id text
)
returns user_credit_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance user_credit_balances;
  v_removed integer;
begin
  if p_amount <= 0 then
    raise exception 'Refund amount must be positive.';
  end if;

  if p_stripe_event_id is not null and exists (
    select 1 from credit_transactions where stripe_event_id = p_stripe_event_id
  ) then
    select * into v_balance from ensure_credit_balance(p_user_id);
    return v_balance;
  end if;

  select * into v_balance from ensure_credit_balance(p_user_id);
  select * into v_balance
  from user_credit_balances
  where user_id = p_user_id
  for update;

  v_removed := least(v_balance.purchased_credits, p_amount);

  update user_credit_balances
  set purchased_credits = purchased_credits - v_removed
  where user_id = p_user_id
  returning * into v_balance;

  insert into credit_transactions (user_id, type, amount, reason, stripe_event_id, metadata)
  values (
    p_user_id,
    'refund',
    -v_removed,
    p_reason,
    p_stripe_event_id,
    jsonb_build_object('requested_refund_credits', p_amount, 'removed_credits', v_removed)
  );

  return v_balance;
end;
$$;

revoke execute on function refund_purchased_credits(uuid, integer, text, text) from anon, authenticated;
grant execute on function refund_purchased_credits(uuid, integer, text, text) to service_role;
