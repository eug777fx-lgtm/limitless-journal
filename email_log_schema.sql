-- Email delivery + engagement log for the admin email command center.
-- Run once in Supabase → SQL editor. Safe to re-run (idempotent).
--
-- Rows are INSERTED server-side by api/_lib/log-email.js and UPDATED by
-- api/resend-webhook.js (open/click/bounce tracking) using the SERVICE ROLE key,
-- which bypasses RLS — so no insert/update policy is needed. The admin "Emails"
-- section READS this table from the browser via the user's session, so we add a
-- SELECT policy limited to the super-admin.

create table if not exists public.email_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid,
  recipient_email text,
  email_type      text,          -- 'approved' | 'weekly' | 'daily_journaled' | 'daily_not_journaled' | ...
  status          text,          -- 'sent' | 'failed' | 'skipped'
  error           text,
  sent_by         text,          -- admin email, or 'system' for cron / auto-on-approve
  resend_id       text,
  -- engagement tracking (updated by the Resend webhook) --
  delivered_at    timestamptz,
  opened_at       timestamptz,
  open_count      int not null default 0,
  clicked_at      timestamptz,
  click_count     int not null default 0,
  created_at      timestamptz not null default now()
);

-- Add the tracking columns to an existing table (no-op if already present).
alter table public.email_log add column if not exists delivered_at timestamptz;
alter table public.email_log add column if not exists opened_at    timestamptz;
alter table public.email_log add column if not exists open_count   int not null default 0;
alter table public.email_log add column if not exists clicked_at   timestamptz;
alter table public.email_log add column if not exists click_count  int not null default 0;

create index if not exists email_log_created_at_idx on public.email_log (created_at desc);
create index if not exists email_log_user_id_idx    on public.email_log (user_id);
create index if not exists email_log_resend_id_idx  on public.email_log (resend_id);

alter table public.email_log enable row level security;

-- Super-admin can read the whole log from the admin panel.
drop policy if exists "super admin reads email_log" on public.email_log;
create policy "super admin reads email_log"
  on public.email_log for select
  using ( (auth.jwt() ->> 'email') = 'eug777fx@gmail.com' );
