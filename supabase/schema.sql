-- Eugene & Caiying Wedding Prediction Game schema
-- Run this in Supabase SQL editor.

-- ============================================================================
-- CLEANUP: Drop existing objects for fresh rebuild
-- ============================================================================

-- Drop functions first (in reverse dependency order)
drop function if exists public.get_table_leaderboard() cascade;
drop function if exists public.get_leaderboard_snapshot() cascade;
drop function if exists public.resolve_market_and_payout(uuid, text[]) cascade;
drop function if exists public.resolve_market_and_payout(uuid, text) cascade;
drop function if exists public.execute_sell(uuid, uuid, text, numeric) cascade;
drop function if exists public.execute_buy(uuid, uuid, text, numeric) cascade;
drop function if exists public.initialize_market_pools() cascade;

-- Drop tables (in reverse dependency order with CASCADE to drop indexes and policies)
drop table if exists public.transactions cascade;
drop table if exists public.market_resolution_notifications cascade;
drop table if exists public.how_to_play_faqs cascade;
drop table if exists public.user_holdings cascade;
drop table if exists public.market_pools cascade;
drop table if exists public.markets cascade;
drop table if exists public.users cascade;

-- ============================================================================
-- CREATE EXTENSION
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- TABLES
-- ============================================================================

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null check (char_length(trim(username)) between 2 and 32),
  balance numeric(18,6) not null default 1000,
  table_number int,
  created_at timestamptz not null default now()
);

create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  type text not null check (type in ('binary', 'multi', 'scalar')),
  outcomes jsonb not null,
  resolved boolean not null default false,
  winning_outcome_ids text[] default null,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(outcomes) = 'array')
);

create table if not exists public.market_pools (
  market_id uuid not null references public.markets(id) on delete cascade,
  outcome_id text not null,
  shares_outstanding numeric(18,6) not null default 100,
  liquidity_parameter numeric(18,6) not null default 1000,
  primary key (market_id, outcome_id),
  check (shares_outstanding > 0),
  check (liquidity_parameter > 0)
);

create table if not exists public.user_holdings (
  user_id uuid not null references public.users(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  outcome_id text not null,
  shares numeric(18,6) not null,
  primary key (user_id, market_id, outcome_id),
  check (shares >= 0)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  outcome_id text not null,
  type text not null check (type in ('buy', 'sell')),
  amount_ecy numeric(18,6) not null check (amount_ecy > 0),
  shares numeric(18,6) not null check (shares > 0),
  price numeric(18,6) not null check (price > 0),
  timestamp timestamptz not null default now()
);

create table if not exists public.market_resolution_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  kind text not null check (kind in ('win', 'loss')),
  market_question text not null,
  winning_outcome text not null,
  realized_pnl numeric(18,6) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, market_id)
);

create table if not exists public.how_to_play_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text,
  status text not null default 'open' check (status in ('open', 'answered')),
  asked_by_user_id uuid references public.users(id) on delete set null,
  asked_by_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  answered_at timestamptz
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index if not exists idx_markets_resolved_created on public.markets (resolved, created_at desc);
create index if not exists idx_market_pools_market on public.market_pools (market_id);
create index if not exists idx_market_pools_market_outcome on public.market_pools (market_id, outcome_id);
create index if not exists idx_user_holdings_user on public.user_holdings (user_id);
create index if not exists idx_user_holdings_market_outcome on public.user_holdings (market_id, outcome_id);
create index if not exists idx_transactions_user_time on public.transactions (user_id, timestamp desc);
create index if not exists idx_transactions_market_time on public.transactions (market_id, timestamp desc);
create index if not exists idx_resolution_notifications_user_time on public.market_resolution_notifications (user_id, created_at desc);
create index if not exists idx_how_to_play_faqs_status_time on public.how_to_play_faqs (status, updated_at desc);
create index if not exists idx_how_to_play_faqs_created_time on public.how_to_play_faqs (created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.users enable row level security;
alter table public.markets enable row level security;
alter table public.market_pools enable row level security;
alter table public.user_holdings enable row level security;
alter table public.transactions enable row level security;
alter table public.market_resolution_notifications enable row level security;
alter table public.how_to_play_faqs enable row level security;

-- Read access for realtime/public market pages.
drop policy if exists "public read users" on public.users;
create policy "public read users"
  on public.users
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public read markets" on public.markets;
create policy "public read markets"
  on public.markets
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public read market_pools" on public.market_pools;
create policy "public read market_pools"
  on public.market_pools
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public read user_holdings" on public.user_holdings;
create policy "public read user_holdings"
  on public.user_holdings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public read transactions" on public.transactions;
create policy "public read transactions"
  on public.transactions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public read resolution notifications" on public.market_resolution_notifications;
create policy "public read resolution notifications"
  on public.market_resolution_notifications
  for select
  to anon, authenticated
  using (true);

drop policy if exists "public read answered faqs" on public.how_to_play_faqs;
create policy "public read answered faqs"
  on public.how_to_play_faqs
  for select
  to anon, authenticated
  using (status = 'answered');

-- Writes are service-role only (used by server actions).
drop policy if exists "service role write users" on public.users;
create policy "service role write users"
  on public.users
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service role write markets" on public.markets;
create policy "service role write markets"
  on public.markets
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service role write market_pools" on public.market_pools;
create policy "service role write market_pools"
  on public.market_pools
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service role write user_holdings" on public.user_holdings;
create policy "service role write user_holdings"
  on public.user_holdings
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service role write transactions" on public.transactions;
create policy "service role write transactions"
  on public.transactions
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service role write resolution notifications" on public.market_resolution_notifications;
create policy "service role write resolution notifications"
  on public.market_resolution_notifications
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service role write how to play faqs" on public.how_to_play_faqs;
create policy "service role write how to play faqs"
  on public.how_to_play_faqs
  for all
  to service_role
  using (true)
  with check (true);

-- Seed core How to Play FAQs.
insert into public.how_to_play_faqs (question, answer, status)
values
  (
    'How do I start trading?',
    'Log in with a username and table number, then browse the active markets. Every user starts with 1,000 ECY Bucks that you can deploy across any market.',
    'answered'
  ),
  (
    'What does the market price mean?',
    'The displayed price is the market''s current view of probability. When more people buy one side, that side usually becomes more expensive.',
    'answered'
  ),
  (
    'Can I sell shares before a market resolves?',
    'Yes. You can sell at any time before resolution. Selling lets you reduce risk, take profit, or rebalance into another outcome.',
    'answered'
  ),
  (
    'What happens when a market resolves?',
    'The winning outcome is marked in the database, payouts are applied automatically, and the result modal appears for impacted users.',
    'answered'
  ),
  (
    'How is the leaderboard calculated?',
    'The leaderboard combines your cash balance with unrealized value from open positions to calculate total performance and ranking.',
    'answered'
  ),
  (
    'Will I see updates on mobile if I switch apps?',
    'Yes. The app resubscribes when you return to the foreground so resolution updates and FAQ changes can be refreshed if the browser was throttled.',
    'answered'
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Helper to initialize pool rows from markets.outcomes.
create or replace function public.initialize_market_pools()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  market_row record;
  outcome_item jsonb;
begin
  for market_row in
    select id, outcomes from public.markets
  loop
    for outcome_item in
      select * from jsonb_array_elements(market_row.outcomes)
    loop
      insert into public.market_pools (market_id, outcome_id)
      values (market_row.id, outcome_item->>'id')
      on conflict do nothing;
    end loop;
  end loop;
end;
$$;

-- Compute buy/sell costs under a liquidity-augmented CPMM-style curve:
-- p_i = (s_i + L) / (sum(s) + N*L)
-- buy_cost(d) = integral_{0..d} p_i(delta) ddelta
--            = d + (A - D0) * ln((D0 + d)/D0)
-- where A = s_i + L, D0 = sum(s) + N*L.

create or replace function public.execute_buy(
  p_user_id uuid,
  p_market_id uuid,
  p_outcome_id text,
  p_amount_ecy numeric
)
returns table(shares_bought numeric, avg_price numeric, new_balance numeric, new_probability numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
  v_market_resolved boolean;
  v_outcome_shares numeric;
  v_liquidity numeric;
  v_total_shares numeric;
  v_outcome_count int;
  v_a numeric;
  v_d0 numeric;
  lo numeric := 0;
  hi numeric := 0;
  mid numeric;
  cost_mid numeric;
  i int := 0;
  v_delta numeric;
  v_new_prob numeric;
begin
  if p_amount_ecy is null or p_amount_ecy <= 0 then
    raise exception 'Trade amount must be positive';
  end if;

  select resolved into v_market_resolved
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Market not found';
  end if;

  if v_market_resolved then
    raise exception 'Market is already resolved';
  end if;

  perform 1 from public.market_pools where market_id = p_market_id for update;

  select shares_outstanding, liquidity_parameter
    into v_outcome_shares, v_liquidity
  from public.market_pools
  where market_id = p_market_id and outcome_id = p_outcome_id
  for update;

  if not found then
    raise exception 'Outcome not found';
  end if;

  select coalesce(sum(shares_outstanding), 0), count(*)
    into v_total_shares, v_outcome_count
  from public.market_pools
  where market_id = p_market_id;

  select balance into v_balance
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'User not found';
  end if;

  if v_balance < p_amount_ecy then
    raise exception 'Insufficient ECY balance';
  end if;

  v_a := v_outcome_shares + v_liquidity;
  v_d0 := v_total_shares + (v_outcome_count * v_liquidity);

  hi := greatest(1, p_amount_ecy * 2);
  while (hi + (v_a - v_d0) * ln((v_d0 + hi) / v_d0)) < p_amount_ecy loop
    hi := hi * 2;
    if hi > 100000000 then
      raise exception 'Trade too large for current market liquidity';
    end if;
  end loop;

  while i < 60 loop
    mid := (lo + hi) / 2;
    cost_mid := mid + (v_a - v_d0) * ln((v_d0 + mid) / v_d0);

    if cost_mid > p_amount_ecy then
      hi := mid;
    else
      lo := mid;
    end if;

    i := i + 1;
  end loop;

  v_delta := round(lo, 6);

  if v_delta <= 0 then
    raise exception 'Amount too small to buy any shares';
  end if;

  update public.users
  set balance = balance - p_amount_ecy
  where id = p_user_id;

  update public.market_pools
  set shares_outstanding = shares_outstanding + v_delta
  where market_id = p_market_id and outcome_id = p_outcome_id;

  insert into public.user_holdings (user_id, market_id, outcome_id, shares)
  values (p_user_id, p_market_id, p_outcome_id, v_delta)
  on conflict (user_id, market_id, outcome_id)
  do update set shares = public.user_holdings.shares + excluded.shares;

  insert into public.transactions (
    user_id, market_id, outcome_id, type, amount_ecy, shares, price
  ) values (
    p_user_id,
    p_market_id,
    p_outcome_id,
    'buy',
    p_amount_ecy,
    v_delta,
    round(p_amount_ecy / v_delta, 6)
  );

  select (shares_outstanding + liquidity_parameter)
      / nullif((select sum(shares_outstanding) from public.market_pools where market_id = p_market_id)
      + (v_outcome_count * liquidity_parameter), 0)
    into v_new_prob
  from public.market_pools
  where market_id = p_market_id and outcome_id = p_outcome_id;

  return query
  select
    v_delta,
    round(p_amount_ecy / v_delta, 6),
    (select balance from public.users where id = p_user_id),
    coalesce(v_new_prob, 0);
end;
$$;

create or replace function public.execute_sell(
  p_user_id uuid,
  p_market_id uuid,
  p_outcome_id text,
  p_amount_ecy numeric
)
returns table(shares_sold numeric, avg_price numeric, new_balance numeric, new_probability numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market_resolved boolean;
  v_holding_shares numeric;
  v_outcome_shares numeric;
  v_liquidity numeric;
  v_total_shares numeric;
  v_outcome_count int;
  v_a numeric;
  v_d0 numeric;
  lo numeric := 0;
  hi numeric;
  mid numeric;
  proceeds_mid numeric;
  max_proceeds numeric;
  i int := 0;
  v_delta numeric;
  v_new_prob numeric;
begin
  if p_amount_ecy is null or p_amount_ecy <= 0 then
    raise exception 'Trade amount must be positive';
  end if;

  select resolved into v_market_resolved
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Market not found';
  end if;

  if v_market_resolved then
    raise exception 'Market is already resolved';
  end if;

  perform 1 from public.market_pools where market_id = p_market_id for update;

  select shares_outstanding, liquidity_parameter
    into v_outcome_shares, v_liquidity
  from public.market_pools
  where market_id = p_market_id and outcome_id = p_outcome_id
  for update;

  if not found then
    raise exception 'Outcome not found';
  end if;

  select shares
    into v_holding_shares
  from public.user_holdings
  where user_id = p_user_id and market_id = p_market_id and outcome_id = p_outcome_id
  for update;

  if not found or v_holding_shares <= 0 then
    raise exception 'No shares available to sell';
  end if;

  select coalesce(sum(shares_outstanding), 0), count(*)
    into v_total_shares, v_outcome_count
  from public.market_pools
  where market_id = p_market_id;

  v_a := v_outcome_shares + v_liquidity;
  v_d0 := v_total_shares + (v_outcome_count * v_liquidity);

  hi := v_holding_shares;
  max_proceeds := hi + (v_a - v_d0) * ln(v_d0 / (v_d0 - hi));

  if p_amount_ecy > max_proceeds then
    raise exception 'Requested ECY exceeds max sell proceeds';
  end if;

  while i < 60 loop
    mid := (lo + hi) / 2;
    proceeds_mid := mid + (v_a - v_d0) * ln(v_d0 / (v_d0 - mid));

    if proceeds_mid > p_amount_ecy then
      hi := mid;
    else
      lo := mid;
    end if;

    i := i + 1;
  end loop;

  v_delta := round(lo, 6);

  if v_delta <= 0 then
    raise exception 'Amount too small to sell any shares';
  end if;

  update public.users
  set balance = balance + p_amount_ecy
  where id = p_user_id;

  update public.market_pools
  set shares_outstanding = shares_outstanding - v_delta
  where market_id = p_market_id and outcome_id = p_outcome_id;

  update public.user_holdings
  set shares = shares - v_delta
  where user_id = p_user_id and market_id = p_market_id and outcome_id = p_outcome_id;

  delete from public.user_holdings
  where user_id = p_user_id and market_id = p_market_id and outcome_id = p_outcome_id and shares <= 0.000001;

  insert into public.transactions (
    user_id, market_id, outcome_id, type, amount_ecy, shares, price
  ) values (
    p_user_id,
    p_market_id,
    p_outcome_id,
    'sell',
    p_amount_ecy,
    v_delta,
    round(p_amount_ecy / v_delta, 6)
  );

  select (shares_outstanding + liquidity_parameter)
      / nullif((select sum(shares_outstanding) from public.market_pools where market_id = p_market_id)
      + (v_outcome_count * liquidity_parameter), 0)
    into v_new_prob
  from public.market_pools
  where market_id = p_market_id and outcome_id = p_outcome_id;

  return query
  select
    v_delta,
    round(p_amount_ecy / v_delta, 6),
    (select balance from public.users where id = p_user_id),
    coalesce(v_new_prob, 0);
end;
$$;

create or replace function public.resolve_market_and_payout(
  p_market_id uuid,
  p_winning_outcome_ids text[]
)
returns table(updated_users int, total_payout numeric, winner_user_ids uuid[])
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resolved boolean;
  v_updated int;
  v_payout numeric;
  v_winners uuid[];
begin
  if p_winning_outcome_ids is null or array_length(p_winning_outcome_ids, 1) = 0 then
    raise exception 'At least one winning outcome must be specified';
  end if;

  select resolved into v_resolved
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Market not found';
  end if;

  if v_resolved then
    raise exception 'Market already resolved';
  end if;

  update public.markets
  set resolved = true,
      winning_outcome_ids = p_winning_outcome_ids
  where id = p_market_id;

  with winnings as (
    select user_id, coalesce(sum(shares), 0) as payout
    from public.user_holdings
    where market_id = p_market_id and outcome_id = any(p_winning_outcome_ids)
    group by user_id
  ),
  applied as (
    update public.users u
    set balance = u.balance + w.payout
    from winnings w
    where u.id = w.user_id
    returning u.id, w.payout
  )
  select count(*), coalesce(sum(payout), 0), array_agg(id)
  into v_updated, v_payout, v_winners
  from applied;

  delete from public.user_holdings
  where market_id = p_market_id;

  return query select coalesce(v_updated, 0), coalesce(v_payout, 0), coalesce(v_winners, '{}'::uuid[]);
end;
$$;

create or replace function public.get_leaderboard_snapshot()
returns table(
  user_id uuid,
  username text,
  balance numeric,
  unrealized_value numeric,
  total_pnl numeric,
  pnl_percentage numeric,
  trade_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with active_holdings as (
    select
      uh.user_id,
      sum(uh.shares * coalesce(mp.current_probability, 0)) as unrealized_value
    from public.user_holdings uh
    join lateral (
      select
        mp.market_id,
        mp.outcome_id,
        (mp.shares_outstanding + mp.liquidity_parameter)
          / nullif(
            sum(mp.shares_outstanding) over (partition by mp.market_id)
            + (count(*) over (partition by mp.market_id) * mp.liquidity_parameter),
            0
          ) as current_probability
      from public.market_pools mp
      where mp.market_id = uh.market_id
    ) mp on mp.outcome_id = uh.outcome_id
    join public.markets m on m.id = uh.market_id and m.resolved = false
    group by uh.user_id
  ),
  trade_counts as (
    select
      user_id,
      count(*) as tx_count
    from public.transactions
    group by user_id
  )
  select
    u.id as user_id,
    u.username,
    u.balance,
    coalesce(ah.unrealized_value, 0) as unrealized_value,
    (u.balance + coalesce(ah.unrealized_value, 0) - 1000) as total_pnl,
    round(((u.balance + coalesce(ah.unrealized_value, 0) - 1000) / 1000) * 100, 2) as pnl_percentage,
    coalesce(tc.tx_count, 0) as trade_count
  from public.users u
  left join active_holdings ah on ah.user_id = u.id
  left join trade_counts tc on tc.user_id = u.id
  order by total_pnl desc, u.username asc;
$$;

create or replace function public.get_table_leaderboard()
returns table(
  table_number int,
  user_count int,
  total_users_pnl numeric,
  avg_pnl numeric,
  avg_pnl_percentage numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with active_holdings as (
    select
      uh.user_id,
      sum(uh.shares * coalesce(mp.current_probability, 0)) as unrealized_value
    from public.user_holdings uh
    join lateral (
      select
        mp.market_id,
        mp.outcome_id,
        (mp.shares_outstanding + mp.liquidity_parameter)
          / nullif(
            sum(mp.shares_outstanding) over (partition by mp.market_id)
            + (count(*) over (partition by mp.market_id) * mp.liquidity_parameter),
            0
          ) as current_probability
      from public.market_pools mp
      where mp.market_id = uh.market_id
    ) mp on mp.outcome_id = uh.outcome_id
    join public.markets m on m.id = uh.market_id and m.resolved = false
    group by uh.user_id
  ),
  user_pnl as (
    select
      u.table_number,
      u.id as user_id,
      (u.balance + coalesce(ah.unrealized_value, 0) - 1000) as pnl
    from public.users u
    left join active_holdings ah on ah.user_id = u.id
    where u.table_number is not null
  )
  select
    up.table_number,
    count(*)::int as user_count,
    round(sum(up.pnl), 2) as total_users_pnl,
    round(avg(up.pnl), 2) as avg_pnl,
    round((avg(up.pnl) / 1000) * 100, 2) as avg_pnl_percentage
  from user_pnl up
  group by up.table_number
  order by total_users_pnl desc;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

grant execute on function public.execute_buy(uuid, uuid, text, numeric) to service_role;
grant execute on function public.execute_sell(uuid, uuid, text, numeric) to service_role;
grant execute on function public.resolve_market_and_payout(uuid, text[]) to service_role;
grant execute on function public.initialize_market_pools() to service_role;
grant execute on function public.get_leaderboard_snapshot() to anon, authenticated;
grant execute on function public.get_table_leaderboard() to anon, authenticated;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Seed data
insert into public.markets (question, type, outcomes)
values
(
  'How many guests are here for the wedding?',
  'scalar',
  '[
    {"id":"guests_181_190","label":"181-190"},
    {"id":"guests_191_200","label":"191-200"},
    {"id":"guests_201_210","label":"201-210"},
    {"id":"guests_211_220","label":"211-220"}
  ]'::jsonb
),
(
  'What is the game that we will be playing during the wedding?',
  'multi',
  '[
    {"id":"the_shoe_game","label":"The Shoe Game"},
    {"id":"kahoot","label":"Kahoot"},
    {"id":"bingo","label":"Bingo"},
    {"id":"treasure_hunt","label":"Treasure Hunt"}
  ]'::jsonb
),
(
  'What will the second march-in song be?',
  'multi',
  '[
    {"id":"song_perfect","label":"Perfect - Ed Sheeran"},
    {"id":"song_thousand_years","label":"A Thousand Years - Christina Perri"},
    {"id":"song_canon_d","label":"Canon in D"},
    {"id":"song_marry_you","label":"Marry You - Bruno Mars"}
  ]'::jsonb
),
(
  'Will Caiying cry during her speech?',
  'binary',
  '[
    {"id":"yes","label":"Yes"},
    {"id":"no","label":"No"}
  ]'::jsonb
),
(
  'What will Eugene say during his speech?',
  'multi',
  '[
    {"id":"stay_humble","label":"Stay humble"},
    {"id":"be_kind","label":"Be kind"},
    {"id":"work_hard","label":"Work hard"},
    {"id":"enjoy_time","label":"Enjoy the moment"}
  ]'::jsonb
)
on conflict do nothing;

select public.initialize_market_pools();
