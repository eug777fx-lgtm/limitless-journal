-- Email delivery log for the admin email command center.
-- Run once in Supabase → SQL editor.
--
-- Rows are INSERTED server-side by api/_lib/log-email.js using the SERVICE ROLE
-- key (which bypasses RLS), so no insert policy is needed. The admin "Emails →
-- Log" tab READS this table from the browser via the user's session, so we add a
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
  created_at      timestamptz not null default now()
);

create index if not exists email_log_created_at_idx on public.email_log (created_at desc);
create index if not exists email_log_user_id_idx    on public.email_log (user_id);

alter table public.email_log enable row level security;

-- Super-admin can read the whole log from the admin panel.
drop policy if exists "super admin reads email_log" on public.email_log;
create policy "super admin reads email_log"
  on public.email_log for select
  using ( (auth.jwt() ->> 'email') = 'eug777fx@gmail.com' );
