-- 1. Profiles: anyone signed in could update ANY profile (policy "using true").
--    Now: your own row, or any row if you are an admin. Idempotent.
drop policy if exists "Users can update profiles" on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- 2. Beta access: the founding traders keep the journal free when the paywall
--    turns on. Only admins and the server can grant it; traders read their own row.
create table if not exists public.beta_access (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  note       text
);
grant select on public.beta_access to authenticated;
grant select, insert, update, delete on public.beta_access to service_role;
revoke all on public.beta_access from anon;
alter table public.beta_access enable row level security;
drop policy if exists beta_access_select on public.beta_access;
create policy beta_access_select on public.beta_access
  for select using ((select auth.uid()) = user_id or public.is_admin());
drop policy if exists beta_access_admin_write on public.beta_access;
create policy beta_access_admin_write on public.beta_access
  for all using (public.is_admin()) with check (public.is_admin());

-- Everyone approved today is a founding beta trader.
insert into public.beta_access (user_id, note)
select p.id, 'Founding beta, Nov 2026' from public.profiles p
join auth.users u on u.id = p.id
where p.status = 'approved'
on conflict (user_id) do nothing;

notify pgrst, 'reload schema';
select (select count(*) from public.beta_access) as beta_rows,
       (select count(*) from pg_policies where tablename = 'profiles' and cmd = 'UPDATE') as update_policies;
