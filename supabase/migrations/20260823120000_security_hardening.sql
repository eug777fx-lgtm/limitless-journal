-- ═══════════════════════════════════════════════════════════════════════════
--  SECURITY HARDENING — run AFTER the copier + network_social migrations.
--  Idempotent: safe to re-run.
--
--  Fixes:
--   1. network_messages_react let ANY authenticated user UPDATE ANY message
--      (message text, image, author included), not just the reactions column.
--      Replaced with own-row-only update + a SECURITY DEFINER reaction RPC
--      that also makes reaction toggling atomic (kills the last-write-wins
--      race the client-side jsonb merge had).
--   2. SECURITY DEFINER trigger functions had no pinned search_path.
--   3. Hardcoded admin email lists duplicated across 8 policies -> is_admin().
--   4. auth.uid() / auth.role() re-evaluated per row in RLS -> wrapped in
--      a scalar subselect so Postgres evaluates once (initplan).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. admin helper ─────────────────────────────────────────────────────────
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

-- ── 2. pin search_path on the counter triggers ──────────────────────────────
create or replace function public.network_bump_likes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update network_posts set likes_count = likes_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update network_posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end $$;

create or replace function public.network_bump_comments() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update network_posts set comments_count = comments_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update network_posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end $$;

-- ── 3. CLOSE THE CHAT UPDATE HOLE ───────────────────────────────────────────
drop policy if exists "network_messages_react" on network_messages;

drop policy if exists "network_messages_update_own" on network_messages;
create policy "network_messages_update_own" on network_messages
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Atomic, server-side reaction toggle. Only ever touches the reactions column.
create or replace function public.network_toggle_reaction(
  p_message_id uuid,
  p_emoji      text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid  text;
  cur  jsonb;
  arr  jsonb;
  nxt  jsonb;
begin
  uid := (select auth.uid())::text;
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- keep the payload small and non-abusable
  if p_emoji is null or char_length(p_emoji) = 0 or char_length(p_emoji) > 8 then
    raise exception 'invalid emoji' using errcode = '22023';
  end if;

  select coalesce(m.reactions, '{}'::jsonb) into cur
  from network_messages m where m.id = p_message_id
  for update;

  if cur is null then
    raise exception 'message not found' using errcode = 'P0002';
  end if;

  arr := coalesce(cur -> p_emoji, '[]'::jsonb);

  if arr @> to_jsonb(uid) then
    select coalesce(jsonb_agg(e), '[]'::jsonb) into arr
    from jsonb_array_elements(arr) e where e <> to_jsonb(uid);
  else
    if jsonb_typeof(cur) = 'object' and (select count(*) from jsonb_object_keys(cur)) >= 20
       and not cur ? p_emoji then
      raise exception 'too many distinct reactions on this message' using errcode = '22023';
    end if;
    arr := arr || to_jsonb(uid);
  end if;

  if jsonb_array_length(arr) = 0 then
    nxt := cur - p_emoji;
  else
    nxt := jsonb_set(cur, array[p_emoji], arr, true);
  end if;

  update network_messages set reactions = nxt where id = p_message_id;
  return nxt;
end $$;

grant execute on function public.network_toggle_reaction(uuid, text) to authenticated;

-- ── 4. rewrite admin-email policies to use is_admin() ───────────────────────
drop policy if exists "network_posts_delete_own_or_admin" on network_posts;
create policy "network_posts_delete_own_or_admin" on network_posts
  for delete using ((select auth.uid()) = user_id or is_admin());

drop policy if exists "network_post_comments_delete_own_or_admin" on network_post_comments;
create policy "network_post_comments_delete_own_or_admin" on network_post_comments
  for delete using ((select auth.uid()) = user_id or is_admin());

drop policy if exists "challenges_admin_write" on network_challenges_v2;
create policy "challenges_admin_write" on network_challenges_v2
  for all using (is_admin()) with check (is_admin());

drop policy if exists "hof_nominations_select_own_or_admin" on hof_nominations;
create policy "hof_nominations_select_own_or_admin" on hof_nominations
  for select using ((select auth.uid()) = user_id or is_admin());

drop policy if exists "hof_nominations_admin_update" on hof_nominations;
create policy "hof_nominations_admin_update" on hof_nominations
  for update using (is_admin());

drop policy if exists "hof_nominations_delete_own_or_admin" on hof_nominations;
create policy "hof_nominations_delete_own_or_admin" on hof_nominations
  for delete using ((select auth.uid()) = user_id or is_admin());

-- ── 5. let a user delete their own network profile ──────────────────────────
drop policy if exists "network_profiles_delete_own" on network_profiles;
create policy "network_profiles_delete_own" on network_profiles
  for delete using ((select auth.uid()) = user_id);
