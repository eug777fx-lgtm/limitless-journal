-- Billing: one row per user, written only by the server (api/billing.js, using
-- the service role). Traders can read their own row; admins can read all.
-- Idempotent: safe to run more than once.

create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  plan                   text not null default 'lite',        -- lite | pro
  status                 text not null default 'incomplete',  -- Stripe status: active, trialing, past_due, canceled, unpaid, incomplete, ...
  price_id               text,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_status_idx on public.subscriptions (status);

-- From Oct 30 2026 Supabase no longer auto-grants API access to new tables in
-- public, so grant it explicitly. RLS below still limits who sees which rows.
grant select on public.subscriptions to authenticated;
grant select, insert, update, delete on public.subscriptions to service_role;
revoke all on public.subscriptions from anon;

alter table public.subscriptions enable row level security;

-- Read your own row. No insert/update/delete policies on purpose: only the
-- service role (which bypasses RLS) can change billing state.
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select using ((select auth.uid()) = user_id);

-- Admins read everything (for the admin panel). Uses is_admin() when the
-- security hardening migration has been run, otherwise the admin email list.
drop policy if exists subscriptions_select_admin on public.subscriptions;
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'is_admin') then
    execute 'create policy subscriptions_select_admin on public.subscriptions for select using (public.is_admin())';
  else
    execute $p$create policy subscriptions_select_admin on public.subscriptions for select
      using ((select auth.jwt() ->> 'email') in ('eug777fx@gmail.com', 'pirchmark@gmail.com', 'clozoya333@gmail.com'))$p$;
  end if;
end $$;

-- Does this user currently have paid access? (active, trialing, or past_due
-- while Stripe retries the card.) Handy for future RLS checks and reporting.
create or replace function public.has_active_subscription(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid and s.status in ('active', 'trialing', 'past_due')
  );
$$;
grant execute on function public.has_active_subscription(uuid) to authenticated;

-- The paywall switch lives in app_settings.feature_flags.paywall (Admin ->
-- Feature Flags). It stays OFF until you turn it on, so running this
-- migration locks nobody out.
