// Network, new look (owner preview). An X-style feed on the same tables as the classic
// Network: network_posts, likes, comments, follows, profiles and the weekly leaderboard.
import React from 'react'
import { Heart, MessageCircle, Home, Users, Trophy, UserRound, Search, Trash2, Megaphone, ArrowUp, X, LineChart, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useStore } from './store.jsx'
import AppShell from './Shell.jsx'
import { Modal, PnL } from './ui.jsx'
import { TradeArt } from './art.jsx'
import { dayLabel, money } from './data.js'

const PAGE = 15
const ago = (d) => {
  const s = Math.max(1, (Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return Math.floor(s) + 's'
  if (s < 3600) return Math.floor(s / 60) + 'm'
  if (s < 86400) return Math.floor(s / 3600) + 'h'
  if (s < 86400 * 7) return Math.floor(s / 86400) + 'd'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
const handle = (np, p) => '@' + String(np?.username || p?.username || np?.display_name || 'trader').toLowerCase().replace(/[^a-z0-9_]/g, '')

function Avatar({ name, url, size = 40 }) {
  const ini = (name || 'T').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return url ? <img className="nx-av" src={url} alt="" style={{ width: size, height: size }} /> : <span className="nx-av" style={{ width: size, height: size, fontSize: size * 0.36 }}>{ini}</span>
}

function snapFrom(t, showPnl) {
  return {
    symbol: t.symbol, direction: t.side, rr: t.rr ?? null,
    result: t.pnl > 0 ? 'win' : t.pnl < 0 ? 'loss' : 'flat', pnl: showPnl ? Math.round(t.pnl) : null,
    trade_date: t.date, chart_url: (t.shots || []).find((u) => /^https?:/.test(u)) || null, session: t.session || null,
  }
}

function TradeShare({ snap }) {
  if (!snap) return null
  const fake = { id: (snap.symbol || '') + snap.trade_date + snap.rr, symbol: snap.symbol, side: snap.direction, pnl: snap.result === 'win' ? 1 : snap.result === 'loss' ? -1 : 0, r: snap.rr, rr: snap.rr, entry: null, exit: null, date: snap.trade_date }
  return (
    <div className="nx-trade">
      <div className="nx-trade-img">{snap.chart_url ? <img src={snap.chart_url} alt="" loading="lazy" /> : <TradeArt t={fake} labels={false} />}</div>
      <div className="nx-trade-meta">
        <b>{snap.symbol}</b><span>{snap.direction}</span>
        {snap.rr != null && <span>{snap.result === 'loss' ? '−' : '+'}{Math.abs(snap.rr)}R</span>}
        <span className={'nx-res ' + snap.result}>{snap.result === 'win' ? 'Win' : snap.result === 'loss' ? 'Loss' : 'Flat'}</span>
        {snap.pnl != null && <PnL v={snap.pnl} />}
        {snap.trade_date && <small>{dayLabel(snap.trade_date)}</small>}
      </div>
    </div>
  )
}

function Comments({ post, me, myName, onCount }) {
  const [rows, setRows] = React.useState(null)
  const [text, setText] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => {
    supabase.from('network_post_comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true }).limit(100).then(({ data }) => setRows(data || []))
  }, [post.id])
  const send = async () => {
    const t = text.trim(); if (!t || !me) return
    setBusy(true)
    const { data, error } = await supabase.from('network_post_comments').insert({ post_id: post.id, user_id: me, username: myName, content: t }).select().single()
    if (!error && data) { setRows((r) => [...(r || []), data]); setText(''); onCount(1) }
    setBusy(false)
  }
  return (
    <div className="nx-comments">
      {rows === null ? <span className="nx-dim">Loading…</span> : rows.map((c) => (
        <div key={c.id} className="nx-c"><b>{c.username || 'trader'}</b> <span className="nx-dim">· {ago(c.created_at)}</span><p>{c.content}</p></div>
      ))}
      <div className="nx-reply">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send() }} placeholder="Post your reply" maxLength={500} />
        <button type="button" disabled={busy || !text.trim()} onClick={send} aria-label="Reply"><Send size={14} /></button>
      </div>
    </div>
  )
}

function Post({ p, np, liked, onLike, onDelete, canDelete, onProfile, me, myName }) {
  const [open, setOpen] = React.useState(false)
  const [cc, setCc] = React.useState(p.comments_count || 0)
  const name = np?.display_name || p.username || 'Trader'
  return (
    <article className="nx-post">
      <button type="button" className="nx-avbtn" onClick={() => onProfile(p.user_id)} aria-label={`Open ${name}`}><Avatar name={name} url={np?.avatar_url} /></button>
      <div className="nx-body">
        <header>
          <button type="button" onClick={() => onProfile(p.user_id)}><b>{name}</b></button>
          <span className="nx-dim">{handle(np, p)} · {ago(p.created_at)}</span>
          {canDelete && <button type="button" className="nx-del" aria-label="Delete post" onClick={() => onDelete(p.id)}><Trash2 size={14} /></button>}
        </header>
        {p.type === 'trade_share' && !p.content && <p className="nx-dim nx-small">shared a trade</p>}
        {p.content && <p className="nx-text">{p.content}</p>}
        {p.type === 'trade_share' && <TradeShare snap={p.trade_snapshot} />}
        {p.image_url && <img className="nx-img" src={p.image_url} alt="" loading="lazy" />}
        <footer>
          <button type="button" className={open ? 'on' : ''} onClick={() => setOpen((o) => !o)}><MessageCircle size={16} /> {cc || ''}</button>
          <button type="button" className={liked ? 'on liked' : ''} onClick={() => onLike(p)}><Heart size={16} fill={liked ? 'currentColor' : 'none'} /> {p.likes_count || ''}</button>
        </footer>
        {open && <Comments post={p} me={me} myName={myName} onCount={(n) => setCc((x) => x + n)} />}
      </div>
    </article>
  )
}

function Leaderboard({ onProfile, compact = false }) {
  const [period, setPeriod] = React.useState('week')
  const [rows, setRows] = React.useState(null)
  React.useEffect(() => {
    let alive = true; setRows(null)
    supabase.rpc('network_leaderboard', { period }).then(({ data }) => { if (alive) setRows(data || []) }, () => alive && setRows([]))
    return () => { alive = false }
  }, [period])
  const list = (rows || []).slice(0, compact ? 5 : 30)
  return (
    <div className={'nx-lb' + (compact ? ' compact' : '')}>
      {!compact && (
        <div className="nx-seg">{[['week', 'This week'], ['month', 'This month'], ['all', 'All time']].map(([k, l]) => <button key={k} type="button" className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>{l}</button>)}</div>
      )}
      {rows === null && <span className="nx-dim" style={{ padding: 16 }}>Loading…</span>}
      {rows && !rows.length && <span className="nx-dim" style={{ padding: 16 }}>No ranked traders yet.</span>}
      {list.map((r, i) => (
        <button key={r.user_id} type="button" className="nx-lbrow" onClick={() => onProfile(r.user_id)}>
          <span className="nx-rank">{i + 1}</span>
          <Avatar name={r.display_name || r.username} url={r.avatar_url} size={compact ? 32 : 38} />
          <span className="nx-who"><b>{r.display_name || r.username || 'Trader'}</b><small>{r.win_rate != null ? Math.round(r.win_rate) + '% win rate' : ''}</small></span>
          <span className="nx-r">{(r.r_gained >= 0 ? '+' : '−') + Math.abs(Number(r.r_gained || 0)).toFixed(1)}R</span>
        </button>
      ))}
    </div>
  )
}

function Profile({ uid, me, back, onLoaded }) {
  const [np, setNp] = React.useState(null)
  const [followers, setFollowers] = React.useState(0)
  const [following, setFollowing] = React.useState(false)
  React.useEffect(() => {
    let alive = true
    Promise.all([
      supabase.from('network_profiles').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('network_follows').select('*', { count: 'exact', head: true }).eq('following_id', uid),
      me ? supabase.from('network_follows').select('follower_id').eq('following_id', uid).eq('follower_id', me).maybeSingle() : Promise.resolve({ data: null }),
    ]).then(([a, b, c]) => { if (!alive) return; setNp(a.data || {}); setFollowers(b.count || 0); setFollowing(!!c.data); onLoaded && onLoaded(a.data) })
    return () => { alive = false }
  }, [uid, me]) // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = async () => {
    if (!me || me === uid) return
    if (following) { await supabase.from('network_follows').delete().eq('follower_id', me).eq('following_id', uid); setFollowers((n) => n - 1) }
    else { await supabase.from('network_follows').insert({ follower_id: me, following_id: uid }); setFollowers((n) => n + 1) }
    setFollowing(!following)
  }
  const name = np?.display_name || 'Trader'
  return (
    <div className="nx-profile">
      <button type="button" className="nx-back" onClick={back}><X size={15} /> Close profile</button>
      <div className="nx-cover" />
      <div className="nx-pro-row">
        <Avatar name={name} url={np?.avatar_url} size={78} />
        {me && me !== uid && <button type="button" className={'nx-follow' + (following ? ' on' : '')} onClick={toggle}>{following ? 'Following' : 'Follow'}</button>}
      </div>
      <h2>{name}</h2>
      <span className="nx-dim">{handle(np)}</span>
      {np?.bio && <p className="nx-text">{np.bio}</p>}
      <span className="nx-dim nx-small"><b>{followers}</b> followers</span>
    </div>
  )
}

export default function Network() {
  const { session, profile, trades, isSuperAdmin, isAdmin, notify } = useStore()
  const me = session?.user?.id
  const myName = profile?.username || (session?.user?.email || '').split('@')[0]
  const [view, setView] = React.useState('feed') // feed | leaderboard
  const [filter, setFilter] = React.useState('all') // all | following | top
  const [who, setWho] = React.useState(null) // profile user id
  const [posts, setPosts] = React.useState([])
  const [profiles, setProfiles] = React.useState(new Map())
  const [liked, setLiked] = React.useState(new Set())
  const [followIds, setFollowIds] = React.useState(null)
  const [more, setMore] = React.useState(true)
  const [loading, setLoading] = React.useState(false)
  const [fresh, setFresh] = React.useState(0)
  const [draft, setDraft] = React.useState('')
  const [posting, setPosting] = React.useState(false)
  const [pick, setPick] = React.useState(false)
  const [q, setQ] = React.useState('')
  const [ann, setAnn] = React.useState([])
  const [members, setMembers] = React.useState(null)
  const [myNp, setMyNp] = React.useState(null)
  const busy = React.useRef(false)
  const sentinel = React.useRef(null)
  const composer = React.useRef(null)

  const enrich = React.useCallback(async (rows) => {
    const ids = [...new Set(rows.map((p) => p.user_id))].filter((id) => !profiles.has(id))
    if (ids.length) {
      const { data } = await supabase.from('network_profiles').select('*').in('user_id', ids)
      setProfiles((m) => { const n = new Map(m); (data || []).forEach((p) => n.set(p.user_id, p)); return n })
    }
    if (me && rows.length) {
      const { data } = await supabase.from('network_post_likes').select('post_id').eq('user_id', me).in('post_id', rows.map((p) => p.id))
      setLiked((s) => { const n = new Set(s); (data || []).forEach((l) => n.add(l.post_id)); return n })
    }
  }, [me, profiles])

  const load = React.useCallback(async (reset) => {
    if (busy.current) return
    busy.current = true; setLoading(true)
    try {
      let query = supabase.from('network_posts').select('*')
      if (who) query = query.eq('user_id', who)
      else if (filter === 'following') {
        if (!followIds || !followIds.size) { setPosts([]); setMore(false); return }
        query = query.in('user_id', [...followIds])
      }
      if (!who && filter === 'top') query = query.gte('created_at', new Date(Date.now() - 7 * 864e5).toISOString()).order('likes_count', { ascending: false })
      query = query.order('created_at', { ascending: false })
      const from = reset ? 0 : posts.length
      const { data, error } = await query.range(from, from + PAGE - 1)
      if (error) throw error
      const rows = data || []
      setPosts((cur) => (reset ? rows : [...cur, ...rows.filter((r) => !cur.some((c) => c.id === r.id))]))
      setMore(rows.length === PAGE)
      enrich(rows)
    } catch (e) { notify(e.message || 'Could not load the feed', 'err') }
    finally { busy.current = false; setLoading(false) }
  }, [filter, followIds, posts.length, who, enrich, notify])

  React.useEffect(() => {
    if (!me) return
    supabase.from('network_follows').select('following_id').eq('follower_id', me).then(({ data }) => setFollowIds(new Set((data || []).map((f) => f.following_id))))
    supabase.from('network_profiles').select('*').eq('user_id', me).maybeSingle().then(({ data }) => setMyNp(data))
    supabase.from('network_messages').select('*').eq('channel', 'announcements').order('created_at', { ascending: false }).limit(3).then(({ data }) => setAnn(data || []))
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'approved').then(({ count }) => setMembers(count || 0))
  }, [me])
  React.useEffect(() => { if (view !== 'feed') return; setPosts([]); setMore(true); busy.current = false; load(true) }, [filter, who, view, followIds && followIds.size]) // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    const ch = supabase.channel('nx-' + Date.now()).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'network_posts' }, (pl) => { if (pl.new.user_id !== me) setFresh((n) => n + 1) }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [me])
  React.useEffect(() => {
    const el = sentinel.current; if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && more && !busy.current) load(false) }, { rootMargin: '500px' })
    io.observe(el); return () => io.disconnect()
  }, [load, more])

  const like = async (p) => {
    if (!me) return
    const on = liked.has(p.id)
    setLiked((s) => { const n = new Set(s); on ? n.delete(p.id) : n.add(p.id); return n })
    setPosts((cur) => cur.map((x) => (x.id === p.id ? { ...x, likes_count: Math.max(0, (x.likes_count || 0) + (on ? -1 : 1)) } : x)))
    if (on) await supabase.from('network_post_likes').delete().eq('post_id', p.id).eq('user_id', me)
    else await supabase.from('network_post_likes').insert({ post_id: p.id, user_id: me })
  }
  const remove = async (id) => {
    if (!window.confirm('Delete this post?')) return
    const { error } = await supabase.from('network_posts').delete().eq('id', id)
    if (error) return notify(error.message, 'err')
    setPosts((cur) => cur.filter((p) => p.id !== id))
  }
  const publish = async (trade) => {
    const text = draft.trim()
    if (!text && !trade) return
    setPosting(true)
    const row = trade
      ? { user_id: me, username: myName, type: 'trade_share', trade_id: trade.id, trade_snapshot: snapFrom(trade, !!myNp?.show_pnl), content: text || null }
      : { user_id: me, username: myName, type: 'text', content: text }
    const { data, error } = await supabase.from('network_posts').insert(row).select().single()
    setPosting(false)
    if (error) return notify(error.message, 'err')
    setPosts((cur) => [data, ...cur]); setDraft(''); setPick(false)
    if (myNp) setProfiles((m) => new Map(m).set(me, myNp))
    notify(trade ? 'Trade shared to the Network' : 'Posted')
  }
  const goFeed = (f) => { setWho(null); setView('feed'); setFilter(f) }
  const openProfile = (uid) => { setView('feed'); setWho(uid); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const shown = q ? posts.filter((p) => `${p.content || ''} ${p.username || ''} ${profiles.get(p.user_id)?.display_name || ''} ${p.trade_snapshot?.symbol || ''}`.toLowerCase().includes(q.toLowerCase())) : posts
  const realTrades = trades.filter((t) => !String(t.id).startsWith('sample-')).slice(0, 12)
  const nav = [['all', 'For you', Home], ['following', 'Following', Users], ['top', 'Top this week', ArrowUp]]

  return (
    <AppShell route="network" word="NETWORK" title="Network">
      <div className="wrap nx">
        <aside className="nx-left">
          {nav.map(([k, l, I]) => <button key={k} type="button" className={view === 'feed' && !who && filter === k ? 'on' : ''} onClick={() => goFeed(k)}><I size={20} /><span>{l}</span></button>)}
          <button type="button" className={view === 'leaderboard' ? 'on' : ''} onClick={() => { setWho(null); setView('leaderboard') }}><Trophy size={20} /><span>Leaderboard</span></button>
          {me && <button type="button" className={who === me ? 'on' : ''} onClick={() => openProfile(me)}><UserRound size={20} /><span>Profile</span></button>}
          <button type="button" className="nx-postbtn" onClick={() => { goFeed('all'); setTimeout(() => composer.current && composer.current.focus(), 50) }}>Post</button>
        </aside>

        <section className="nx-main">
          <div className="nx-tabs">
            {view === 'leaderboard' ? <b className="nx-tabtitle">Leaderboard</b> : who ? <b className="nx-tabtitle">Profile</b> : (
              [['all', 'For you'], ['following', 'Following'], ['top', 'Top']].map(([k, l]) => <button key={k} type="button" className={filter === k ? 'on' : ''} onClick={() => goFeed(k)}>{l}</button>)
            )}
            <button type="button" className={'nx-mlb' + (view === 'leaderboard' ? ' on' : '')} onClick={() => { setWho(null); setView(view === 'leaderboard' ? 'feed' : 'leaderboard') }} aria-label="Leaderboard"><Trophy size={16} /></button>
          </div>

          {view === 'leaderboard' ? <Leaderboard onProfile={openProfile} /> : (
            <>
              {who && <Profile uid={who} me={me} back={() => setWho(null)} />}
              {!who && (
                <div className="nx-compose">
                  <Avatar name={myNp?.display_name || myName} url={myNp?.avatar_url} />
                  <div className="nx-body">
                    <textarea ref={composer} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What's your read on the market?" rows={draft.split('\n').length > 2 ? 4 : 2} maxLength={1000} />
                    <div className="nx-compose-row">
                      <button type="button" className="nx-icon" onClick={() => setPick(true)} disabled={!realTrades.length} title={realTrades.length ? 'Share a trade' : 'Log a trade first'}><LineChart size={17} /> <span>Share a trade</span></button>
                      <span className="nx-count">{draft.length > 800 ? 1000 - draft.length : ''}</span>
                      <button type="button" className="nx-send" disabled={posting || !draft.trim()} onClick={() => publish(null)}>{posting ? 'Posting…' : 'Post'}</button>
                    </div>
                  </div>
                </div>
              )}
              {fresh > 0 && !who && <button type="button" className="nx-fresh" onClick={() => { setFresh(0); setPosts([]); setMore(true); load(true) }}><ArrowUp size={14} /> Show {fresh} new {fresh === 1 ? 'post' : 'posts'}</button>}
              {!who && ann.length > 0 && (
                <div className="nx-ann nx-ann-m"><Megaphone size={15} /><div><b>Announcement</b><p>{ann[0].message}</p></div></div>
              )}
              {shown.map((p) => (
                <Post key={p.id} p={p} np={profiles.get(p.user_id)} liked={liked.has(p.id)} onLike={like} onDelete={remove} canDelete={p.user_id === me || isSuperAdmin || isAdmin} onProfile={openProfile} me={me} myName={myName} />
              ))}
              {!loading && !shown.length && (
                <div className="nx-empty">
                  <b>{who ? 'No posts yet.' : filter === 'following' ? 'Follow traders to fill this tab.' : q ? 'Nothing matches that search.' : 'No posts yet.'}</b>
                  <span className="nx-dim">{filter === 'following' && !who ? 'Tap a name in the feed or the leaderboard, then Follow.' : 'Share a trade or a thought to get it started.'}</span>
                </div>
              )}
              <div ref={sentinel} style={{ height: 1 }} />
              {loading && <div className="nx-dim nx-load">Loading…</div>}
            </>
          )}
        </section>

        <aside className="nx-right">
          <label className="nx-search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the feed" /></label>
          {ann.length > 0 && (
            <div className="nx-box">
              <h3>Announcements</h3>
              {ann.map((a) => <div key={a.id} className="nx-ann"><Megaphone size={14} /><div><p>{a.message}</p><small className="nx-dim">{ago(a.created_at)} ago</small></div></div>)}
            </div>
          )}
          <div className="nx-box">
            <h3>Top traders this week</h3>
            <Leaderboard onProfile={openProfile} compact />
            <button type="button" className="nx-more" onClick={() => { setWho(null); setView('leaderboard') }}>Show more</button>
          </div>
          {members != null && <p className="nx-dim nx-small" style={{ padding: '0 6px' }}>{members} traders in the LIMITLESS Network</p>}
        </aside>
      </div>

      <Modal open={pick} onClose={() => setPick(false)} label="Share a trade" maxWidth={560}>
        <div className="lt">
          <header className="lt-head"><div className="col" style={{ gap: 4 }}><span className="sk-mono">Share to the Network</span><h2>Pick a trade</h2></div></header>
          <textarea className="input" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a thought (optional)" />
          <div className="nx-picklist">
            {realTrades.map((t) => (
              <button key={t.id} type="button" disabled={posting} onClick={() => publish(t)}>
                <span className="nx-pickart"><TradeArt t={t} labels={false} /></span>
                <span className="nx-who"><b>{t.symbol} {t.side}</b><small>{dayLabel(t.date)}{t.r != null ? ` · ${t.r > 0 ? '+' : '−'}${Math.abs(t.r)}R` : ''}</small></span>
                <span>{myNp?.show_pnl ? money(Math.round(t.pnl)) : t.pnl > 0 ? 'Win' : t.pnl < 0 ? 'Loss' : 'Flat'}</span>
              </button>
            ))}
          </div>
          <span className="nx-dim nx-small">{myNp?.show_pnl ? 'Your $ result is shown.' : 'Only the R and win or loss are shown, not your $.'}</span>
        </div>
      </Modal>
    </AppShell>
  )
}
