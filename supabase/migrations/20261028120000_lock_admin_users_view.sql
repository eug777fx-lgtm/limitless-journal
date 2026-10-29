-- ═══════════════════════════════════════════════════════════════════════════
--  FIX: Supabase security advisor "auth_users_exposed" (critical)
--
--  public.admin_users_view reads from auth.users and was reachable by anyone
--  holding the public anon key, so every user's email could be pulled from
--  the API. This keeps the same view name for the admin panel, but it now
--  returns rows ONLY to admins and to the server email functions (service
--  role). Everyone else gets an empty list.
--
--  How: the original view moves to a private schema the API cannot reach. A
--  security definer function reads it after checking is_admin(), and a thin
--  security_invoker view in public calls that function.
--  Safe to re-run. No app code change needed.
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- admin check (same as the security hardening migration)
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.email() in (
    'eug777fx@gmail.com',
    'pirchmark@gmail.com',
    'clozoya333@gmail.com'
  ), false);
$$;
grant execute on function public.is_admin() to authenticated;

-- 1. move the original view out of the API (first run only)
do $$
begin
  if exists (select 1 from pg_views where schemaname = 'public' and viewname = 'admin_users_view')
     and not exists (select 1 from pg_views where schemaname = 'private' and viewname = 'admin_users_view') then
    execute 'alter view public.admin_users_view set schema private';
  end if;
end $$;
revoke all on private.admin_users_view from public, anon, authenticated;

-- 2. admin-only reader
create or replace function public.admin_users_list()
returns setof private.admin_users_view
language sql stable security definer set search_path = '' as $$
  select * from private.admin_users_view
  where public.is_admin() or coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;
revoke all on function public.admin_users_list() from public, anon;
grant execute on function public.admin_users_list() to authenticated, service_role;

-- 3. same name the admin panel already queries
create or replace view public.admin_users_view with (security_invoker = true) as
  select * from public.admin_users_list();
revoke all on public.admin_users_view from public, anon;
grant select on public.admin_users_view to authenticated, service_role;

-- Check (should return 0 rows when run as anon, all users for an admin):
--   select count(*) from public.admin_users_view;
