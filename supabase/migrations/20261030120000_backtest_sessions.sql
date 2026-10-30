-- Asia Model backtest log (admin only).
-- New table, nothing existing is changed. Rows are visible and writable only by
-- their owner, and only while that owner is an admin (public.is_admin()).

create table if not exists public.backtest_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  session_date    date not null,
  model_version   text not null default 'asia-v0.1',
  instrument      text not null default 'NQ',
  mode            text not null default 'backtest' check (mode in ('backtest', 'forward', 'live')),

  -- Prep
  range_high      numeric,
  range_low       numeric,
  close_price     numeric,                -- 4:00 PM NY close, drives the narrative
  narrative       text check (narrative in ('bullish', 'bearish', 'none')),
  liquidity_ok    boolean,
  fvg_at_ote      boolean,
  smt             boolean,

  -- The trade
  direction       text check (direction in ('long', 'short')),
  entry_type      text not null default 'limit' check (entry_type in ('limit', 'ifvg', 'discretionary')),
  grade           text check (grade in ('a_plus', 'valid', 'invalid', 'no_trade')),
  entry           numeric,
  stop            numeric,
  target          numeric,

  -- Result
  outcome         text not null check (outcome in ('win', 'loss', 'breakeven', 'no_fill', 'no_trade')),
  result_r        numeric,               -- realised R (win = +R, loss = -1)
  mfe_r           numeric,               -- max favourable move in R, to test fixed targets later
  followed_rules  boolean,
  discretion_note text,
  notes           text,
  shots           text[] not null default '{}'
);

create index if not exists backtest_sessions_user_date on public.backtest_sessions (user_id, session_date desc);

alter table public.backtest_sessions enable row level security;

drop policy if exists backtest_sessions_admin_owner on public.backtest_sessions;
create policy backtest_sessions_admin_owner on public.backtest_sessions
  for all to authenticated
  using (user_id = auth.uid() and public.is_admin())
  with check (user_id = auth.uid() and public.is_admin());

create or replace function public.backtest_sessions_touch() returns trigger
language plpgsql set search_path = public as $$ begin new.updated_at := now(); return new; end $$;

drop trigger if exists backtest_sessions_touch on public.backtest_sessions;
create trigger backtest_sessions_touch before update on public.backtest_sessions
  for each row execute function public.backtest_sessions_touch();
