-- ═══════════════════════════════════════════════════════════════════════════
--  READ ONLY. Paste into the Supabase SQL editor and run.
--  Tells you exactly which parts of the three migrations are live.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Tables
select 'TABLE' as kind, t.name as object,
       case when to_regclass('public.' || t.name) is null then '❌ MISSING' else '✅ ok' end as state
from (values
  ('copier_accounts'),('copier_trades'),('copier_settings'),
  ('network_profiles'),('network_follows'),('network_posts'),
  ('network_post_likes'),('network_post_comments'),
  ('network_challenges_v2'),('network_challenge_progress'),
  ('session_rsvps'),('hof_nominations'),
  ('network_messages'),('hall_of_fame'),('profiles'),('trades')
) as t(name)

union all

-- 2. Functions
select 'FUNCTION', f.name,
       case when to_regprocedure('public.' || f.sig) is null then '❌ MISSING' else '✅ ok' end
from (values
  ('network_leaderboard','network_leaderboard(text)'),
  ('network_trader_stats','network_trader_stats(uuid)'),
  ('is_admin','is_admin()'),
  ('network_toggle_reaction','network_toggle_reaction(uuid,text)'),
  ('network_bump_likes','network_bump_likes()'),
  ('network_bump_comments','network_bump_comments()')
) as f(name, sig)

union all

-- 3. Columns added by the migrations
select 'COLUMN', c.tbl || '.' || c.col,
       case when exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name=c.tbl and column_name=c.col
       ) then '✅ ok' else '❌ MISSING' end
from (values
  ('profiles','show_on_leaderboard'),
  ('network_messages','reply_to'),
  ('network_messages','reactions')
) as c(tbl, col)

union all

-- 4. The dangerous policy must be GONE
select 'POLICY', 'network_messages_react (must be gone)',
       case when exists (
         select 1 from pg_policies
         where schemaname='public' and tablename='network_messages'
           and policyname='network_messages_react'
       ) then '🚨 STILL PRESENT — any user can edit any message'
       else '✅ removed' end

union all

select 'POLICY', 'network_messages_update_own',
       case when exists (
         select 1 from pg_policies
         where schemaname='public' and tablename='network_messages'
           and policyname='network_messages_update_own'
       ) then '✅ ok' else '❌ MISSING' end

union all

-- 5. RLS actually enabled on every new table
select 'RLS', c.relname,
       case when c.relrowsecurity then '✅ enabled' else '🚨 DISABLED' end
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'copier_accounts','copier_trades','copier_settings',
    'network_profiles','network_follows','network_posts',
    'network_post_likes','network_post_comments',
    'network_challenges_v2','network_challenge_progress',
    'session_rsvps','hof_nominations'
  )

union all

-- 6. Realtime publication on the feed
select 'REALTIME', 'network_posts',
       case when exists (
         select 1 from pg_publication_tables
         where pubname='supabase_realtime' and tablename='network_posts'
       ) then '✅ ok' else '❌ not published' end

order by 1, 2;

-- 7. Any SECURITY DEFINER function still missing a pinned search_path
select p.proname as unpinned_security_definer_function
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
  and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path%';
