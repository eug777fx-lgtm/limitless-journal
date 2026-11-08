-- Only the owner is an admin (Nov 2026). Co-admins removed.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.email() = 'eug777fx@gmail.com', false);
$$;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins can view all trades" on public.trades;
create policy "Admins can view all trades" on public.trades
  for select using (public.is_admin());
