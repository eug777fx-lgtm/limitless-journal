-- ═══════════════════════════════════════════════════════════════════════════
--  TRADESYNC / COPIER — Supabase migration
--  Tables: copier_accounts · copier_trades · copier_settings
--  RLS: every user sees only their own rows (TradeSync is currently
--  eug777fx-only in the UI, but policies are written per-user so the module
--  can be opened up later without a schema change).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── copier_accounts ─────────────────────────────────────────────────────────
create table if not exists copier_accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  broker          text,
  platform        text,
  account_size    numeric,          -- starting balance
  current_balance numeric,
  status          text not null default 'Active',
  is_master       boolean not null default false,
  -- legacy / extended fields carried over from the localStorage era
  -- (accountType, instrument, currentEquity, dailyDDLimit, maxDDLimit,
  --  profitTarget, notes, ruleset preset id, …)
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists copier_accounts_user_idx on copier_accounts(user_id);

alter table copier_accounts enable row level security;

drop policy if exists "copier_accounts_select_own" on copier_accounts;
create policy "copier_accounts_select_own" on copier_accounts
  for select using (auth.uid() = user_id);

drop policy if exists "copier_accounts_insert_own" on copier_accounts;
create policy "copier_accounts_insert_own" on copier_accounts
  for insert with check (auth.uid() = user_id);

drop policy if exists "copier_accounts_update_own" on copier_accounts;
create policy "copier_accounts_update_own" on copier_accounts
  for update using (auth.uid() = user_id);

drop policy if exists "copier_accounts_delete_own" on copier_accounts;
create policy "copier_accounts_delete_own" on copier_accounts
  for delete using (auth.uid() = user_id);

-- ── copier_trades ───────────────────────────────────────────────────────────
create table if not exists copier_trades (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references copier_accounts(id) on delete cascade,
  symbol      text,
  direction   text check (direction in ('Long','Short')),
  entry       numeric,
  exit        numeric,
  size        numeric,             -- contracts
  pnl         numeric,
  r_multiple  numeric,
  copied_from uuid,                -- master copier_trades.id this was replicated from
  status      text not null default 'simulated'
              check (status in ('simulated','open','closed','blocked')),
  -- violation payload when Risk Guardian blocks/flags a simulated fill:
  -- { "rule": "daily_loss", "limit": 1000, "value": 1240, "excess": 240 }
  meta        jsonb not null default '{}'::jsonb,
  opened_at   timestamptz not null default now(),
  closed_at   timestamptz
);

create index if not exists copier_trades_account_idx on copier_trades(account_id);
create index if not exists copier_trades_copied_from_idx on copier_trades(copied_from);

alter table copier_trades enable row level security;

-- ownership flows through the parent account
drop policy if exists "copier_trades_select_own" on copier_trades;
create policy "copier_trades_select_own" on copier_trades
  for select using (
    exists (select 1 from copier_accounts a where a.id = account_id and a.user_id = auth.uid())
  );

drop policy if exists "copier_trades_insert_own" on copier_trades;
create policy "copier_trades_insert_own" on copier_trades
  for insert with check (
    exists (select 1 from copier_accounts a where a.id = account_id and a.user_id = auth.uid())
  );

drop policy if exists "copier_trades_update_own" on copier_trades;
create policy "copier_trades_update_own" on copier_trades
  for update using (
    exists (select 1 from copier_accounts a where a.id = account_id and a.user_id = auth.uid())
  );

drop policy if exists "copier_trades_delete_own" on copier_trades;
create policy "copier_trades_delete_own" on copier_trades
  for delete using (
    exists (select 1 from copier_accounts a where a.id = account_id and a.user_id = auth.uid())
  );

-- ── copier_settings ─────────────────────────────────────────────────────────
-- One row per user. Also carries:
--   size_mapping  : per-follower link config
--                   [{ followerId, mode: 'fixed'|'proportional'|'risk',
--                      fixedContracts, riskPct, maxSize, symbolsAllowed[],
--                      hours: {start:'09:30', end:'16:00'}, newsBlackout: bool }]
--   module_state  : migrated localStorage blobs for the non-copier tabs
--                   { overview, risk, scaling, mission, payouts }
create table if not exists copier_settings (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references auth.users(id) on delete cascade,
  risk_mode          text not null default 'fixed'
                     check (risk_mode in ('fixed','proportional','risk')),
  size_mapping       jsonb not null default '[]'::jsonb,
  max_daily_loss     numeric,
  max_trades_per_day integer,
  symbols_allowed    text[] not null default '{}',
  module_state       jsonb not null default '{}'::jsonb,
  updated_at         timestamptz not null default now()
);

alter table copier_settings enable row level security;

drop policy if exists "copier_settings_select_own" on copier_settings;
create policy "copier_settings_select_own" on copier_settings
  for select using (auth.uid() = user_id);

drop policy if exists "copier_settings_insert_own" on copier_settings;
create policy "copier_settings_insert_own" on copier_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "copier_settings_update_own" on copier_settings;
create policy "copier_settings_update_own" on copier_settings
  for update using (auth.uid() = user_id);

drop policy if exists "copier_settings_delete_own" on copier_settings;
create policy "copier_settings_delete_own" on copier_settings
  for delete using (auth.uid() = user_id);
