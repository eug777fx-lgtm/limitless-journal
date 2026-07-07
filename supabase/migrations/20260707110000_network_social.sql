-- ═══════════════════════════════════════════════════════════════════════════
--  NETWORK 2.0 — profiles, follows, trade feed, leaderboard, challenges,
--  session RSVPs, hall-of-fame nominations, chat upgrades.
-- ═══════════════════════════════════════════════════════════════════════════

-- Admin emails used inside policies (keep in sync with App.jsx)
-- eug777fx@gmail.com (super) · pirchmark@gmail.com · clozoya333@gmail.com

-- ── 2.1 trader profiles ─────────────────────────────────────────────────────
create table if not exists network_profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  bio           text,
  trading_style text,
  twitter       text,
  instagram     text,
  is_public     boolean not null default true,
  stats_visible boolean not null default false,  -- default OFF (privacy first)
  show_pnl      boolean not null default false,  -- $ amounts hidden by default
  badges        jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table network_profiles enable row level security;

drop policy if exists "network_profiles_select_all" on network_profiles;
create policy "network_profiles_select_all" on network_profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "network_profiles_upsert_own" on network_profiles;
create policy "network_profiles_upsert_own" on network_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "network_profiles_update_own" on network_profiles;
create policy "network_profiles_update_own" on network_profiles
  for update using (auth.uid() = user_id);

-- ── follows ─────────────────────────────────────────────────────────────────
create table if not exists network_follows (
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists network_follows_following_idx on network_follows(following_id);

alter table network_follows enable row level security;

drop policy if exists "network_follows_select_all" on network_follows;
create policy "network_follows_select_all" on network_follows
  for select using (auth.role() = 'authenticated');

drop policy if exists "network_follows_insert_own" on network_follows;
create policy "network_follows_insert_own" on network_follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists "network_follows_delete_own" on network_follows;
create policy "network_follows_delete_own" on network_follows
  for delete using (auth.uid() = follower_id);

-- ── 2.2 trade feed ──────────────────────────────────────────────────────────
create table if not exists network_posts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  username       text,
  type           text not null default 'text' check (type in ('trade_share','idea','text')),
  trade_id       uuid,
  -- privacy-safe snapshot rendered to everyone (symbol, direction, rr,
  -- chart_url, trade_date; pnl only included when the sharer allows it)
  trade_snapshot jsonb,
  content        text,
  image_url      text,
  likes_count    integer not null default 0,
  comments_count integer not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists network_posts_created_idx on network_posts(created_at desc);
create index if not exists network_posts_user_idx on network_posts(user_id);

alter table network_posts enable row level security;

drop policy if exists "network_posts_select_all" on network_posts;
create policy "network_posts_select_all" on network_posts
  for select using (auth.role() = 'authenticated');

drop policy if exists "network_posts_insert_own" on network_posts;
create policy "network_posts_insert_own" on network_posts
  for insert with check (auth.uid() = user_id);

drop policy if exists "network_posts_delete_own_or_admin" on network_posts;
create policy "network_posts_delete_own_or_admin" on network_posts
  for delete using (
    auth.uid() = user_id
    or auth.email() in ('eug777fx@gmail.com','pirchmark@gmail.com','clozoya333@gmail.com')
  );

create table if not exists network_post_likes (
  post_id    uuid not null references network_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table network_post_likes enable row level security;

drop policy if exists "network_post_likes_select_all" on network_post_likes;
create policy "network_post_likes_select_all" on network_post_likes
  for select using (auth.role() = 'authenticated');

drop policy if exists "network_post_likes_insert_own" on network_post_likes;
create policy "network_post_likes_insert_own" on network_post_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "network_post_likes_delete_own" on network_post_likes;
create policy "network_post_likes_delete_own" on network_post_likes
  for delete using (auth.uid() = user_id);

create table if not exists network_post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references network_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  username   text,
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists network_post_comments_post_idx on network_post_comments(post_id);

alter table network_post_comments enable row level security;

drop policy if exists "network_post_comments_select_all" on network_post_comments;
create policy "network_post_comments_select_all" on network_post_comments
  for select using (auth.role() = 'authenticated');

drop policy if exists "network_post_comments_insert_own" on network_post_comments;
create policy "network_post_comments_insert_own" on network_post_comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "network_post_comments_delete_own_or_admin" on network_post_comments;
create policy "network_post_comments_delete_own_or_admin" on network_post_comments
  for delete using (
    auth.uid() = user_id
    or auth.email() in ('eug777fx@gmail.com','pirchmark@gmail.com','clozoya333@gmail.com')
  );

-- keep likes_count / comments_count in sync via triggers
create or replace function network_bump_likes() returns trigger
language plpgsql security definer as $$
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

drop trigger if exists network_post_likes_bump on network_post_likes;
create trigger network_post_likes_bump
  after insert or delete on network_post_likes
  for each row execute function network_bump_likes();

create or replace function network_bump_comments() returns trigger
language plpgsql security definer as $$
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

drop trigger if exists network_post_comments_bump on network_post_comments;
create trigger network_post_comments_bump
  after insert or delete on network_post_comments
  for each row execute function network_bump_comments();

-- realtime for the feed (new-post indicator)
do $$ begin
  alter publication supabase_realtime add table network_posts;
exception when duplicate_object then null; end $$;

-- ── 2.3 leaderboard ─────────────────────────────────────────────────────────
-- Opt-in flag lives on profiles (defensive add — may already exist)
alter table profiles add column if not exists show_on_leaderboard boolean not null default false;

-- Aggregated, privacy-safe leaderboard rows. SECURITY DEFINER so it can read
-- the trades table across users, but it ONLY returns aggregates and ONLY for
-- users who opted in via show_on_leaderboard.
create or replace function network_leaderboard(period text default 'week')
returns table (
  user_id uuid, display_name text, username text, avatar_url text,
  trades_count bigint, r_gained numeric, win_rate numeric
)
language sql security definer set search_path = public as $$
  with cutoff as (
    select case
      when period = 'week'  then date_trunc('week', now())::date
      when period = 'month' then date_trunc('month', now())::date
      else '1970-01-01'::date
    end as since
  )
  select
    t.user_id,
    coalesce(np.display_name, p.first_name || ' ' || coalesce(p.last_name,''), p.username) as display_name,
    p.username,
    np.avatar_url,
    count(*) as trades_count,
    round(sum(coalesce(t.rr, 0))::numeric, 2) as r_gained,
    round(100.0 * count(*) filter (where coalesce(t.pnl,0) > 0) / count(*), 1) as win_rate
  from trades t
  join profiles p on p.id = t.user_id
  left join network_profiles np on np.user_id = t.user_id
  cross join cutoff
  where p.show_on_leaderboard = true
    and p.status = 'approved'
    and t.trade_date >= cutoff.since
  group by t.user_id, p.username, p.first_name, p.last_name, np.display_name, np.avatar_url
  having count(*) >= 10
  order by r_gained desc
  limit 100;
$$;

grant execute on function network_leaderboard(text) to authenticated;

-- Privacy-safe public stats for one trader (profile page). Gated on the
-- trader's own stats_visible flag. Returns aggregates + an equity sparkline
-- in R multiples (never dollar amounts unless show_pnl).
create or replace function network_trader_stats(target uuid)
returns json
language plpgsql security definer set search_path = public as $$
declare
  allowed boolean;
  pnl_ok boolean;
  result json;
begin
  select np.stats_visible, np.show_pnl into allowed, pnl_ok
  from network_profiles np where np.user_id = target;
  if allowed is not true then
    return json_build_object('visible', false);
  end if;

  select json_build_object(
    'visible', true,
    'total_trades', count(*),
    'win_rate', round(100.0 * count(*) filter (where coalesce(pnl,0) > 0) / greatest(count(*),1), 1),
    'avg_r', round(avg(coalesce(rr,0))::numeric, 2),
    'total_r', round(sum(coalesce(rr,0))::numeric, 1),
    'total_pnl', case when pnl_ok then round(sum(coalesce(pnl,0))::numeric, 0) else null end,
    'curve', (
      select coalesce(json_agg(day_r order by d), '[]'::json) from (
        select trade_date as d, sum(sum(coalesce(rr,0))) over (order by trade_date) as day_r
        from trades where user_id = target group by trade_date order by trade_date desc limit 60
      ) sub
    )
  ) into result
  from trades where user_id = target;

  return coalesce(result, json_build_object('visible', true, 'total_trades', 0));
end $$;

grant execute on function network_trader_stats(uuid) to authenticated;

-- ── 2.4 challenges 2.0 ──────────────────────────────────────────────────────
create table if not exists network_challenges_v2 (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  type          text not null check (type in ('consistency','performance','discipline')),
  duration_days integer not null default 7,
  target        numeric not null default 1,   -- days to journal / R to gain / clean days
  reward_badge  text not null default '🏅 Badge',
  starts_at     date not null default current_date,
  active        boolean not null default true,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

alter table network_challenges_v2 enable row level security;

drop policy if exists "challenges_select_all" on network_challenges_v2;
create policy "challenges_select_all" on network_challenges_v2
  for select using (auth.role() = 'authenticated');

drop policy if exists "challenges_admin_write" on network_challenges_v2;
create policy "challenges_admin_write" on network_challenges_v2
  for all using (auth.email() = 'eug777fx@gmail.com')
  with check (auth.email() = 'eug777fx@gmail.com');

create table if not exists network_challenge_progress (
  challenge_id uuid not null references network_challenges_v2(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  progress     numeric not null default 0,
  completed_at timestamptz,
  joined_at    timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

alter table network_challenge_progress enable row level security;

drop policy if exists "challenge_progress_select_all" on network_challenge_progress;
create policy "challenge_progress_select_all" on network_challenge_progress
  for select using (auth.role() = 'authenticated');

drop policy if exists "challenge_progress_upsert_own" on network_challenge_progress;
create policy "challenge_progress_upsert_own" on network_challenge_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "challenge_progress_update_own" on network_challenge_progress;
create policy "challenge_progress_update_own" on network_challenge_progress
  for update using (auth.uid() = user_id);

drop policy if exists "challenge_progress_delete_own" on network_challenge_progress;
create policy "challenge_progress_delete_own" on network_challenge_progress
  for delete using (auth.uid() = user_id);

-- ── 2.5 session RSVPs ───────────────────────────────────────────────────────
create table if not exists session_rsvps (
  id          uuid primary key default gen_random_uuid(),
  session_key text not null,     -- id of the session entry (client-managed list)
  user_id     uuid not null references auth.users(id) on delete cascade,
  notify      boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (session_key, user_id)
);

alter table session_rsvps enable row level security;

drop policy if exists "session_rsvps_select_all" on session_rsvps;
create policy "session_rsvps_select_all" on session_rsvps
  for select using (auth.role() = 'authenticated');

drop policy if exists "session_rsvps_insert_own" on session_rsvps;
create policy "session_rsvps_insert_own" on session_rsvps
  for insert with check (auth.uid() = user_id);

drop policy if exists "session_rsvps_update_own" on session_rsvps;
create policy "session_rsvps_update_own" on session_rsvps
  for update using (auth.uid() = user_id);

drop policy if exists "session_rsvps_delete_own" on session_rsvps;
create policy "session_rsvps_delete_own" on session_rsvps
  for delete using (auth.uid() = user_id);

-- ── 2.5 hall-of-fame nominations ────────────────────────────────────────────
create table if not exists hof_nominations (
  id         uuid primary key default gen_random_uuid(),
  trade_id   uuid not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  note       text,
  status     text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table hof_nominations enable row level security;

drop policy if exists "hof_nominations_select_own_or_admin" on hof_nominations;
create policy "hof_nominations_select_own_or_admin" on hof_nominations
  for select using (
    auth.uid() = user_id
    or auth.email() in ('eug777fx@gmail.com','pirchmark@gmail.com','clozoya333@gmail.com')
  );

drop policy if exists "hof_nominations_insert_own" on hof_nominations;
create policy "hof_nominations_insert_own" on hof_nominations
  for insert with check (auth.uid() = user_id);

drop policy if exists "hof_nominations_admin_update" on hof_nominations;
create policy "hof_nominations_admin_update" on hof_nominations
  for update using (auth.email() in ('eug777fx@gmail.com','pirchmark@gmail.com','clozoya333@gmail.com'));

drop policy if exists "hof_nominations_delete_own_or_admin" on hof_nominations;
create policy "hof_nominations_delete_own_or_admin" on hof_nominations
  for delete using (
    auth.uid() = user_id
    or auth.email() in ('eug777fx@gmail.com','pirchmark@gmail.com','clozoya333@gmail.com')
  );

-- Admins need to read a nominated trade to render the approval card even when
-- the nominator is another user — already covered by "Admins can view all
-- trades". Approving inserts into hall_of_fame (existing table): allow admin
-- inserts if not already permitted.
-- (hall_of_fame policies assumed to exist; defensive add for admin insert)
do $$ begin
  create policy "hall_of_fame_admin_insert" on hall_of_fame
    for insert with check (auth.email() in ('eug777fx@gmail.com','pirchmark@gmail.com','clozoya333@gmail.com'));
exception when duplicate_object then null; end $$;

-- ── 2.5 chat upgrades: replies + reactions ──────────────────────────────────
alter table network_messages add column if not exists reply_to uuid;
alter table network_messages add column if not exists reactions jsonb not null default '{}'::jsonb;

-- users must be able to update reactions on any message (jsonb merge is done
-- client-side with optimistic locking; keep the surface minimal)
drop policy if exists "network_messages_react" on network_messages;
create policy "network_messages_react" on network_messages
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
