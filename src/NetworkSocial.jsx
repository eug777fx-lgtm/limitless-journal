// ═══════════════════════════════════════════════════════════════════════════
//  NETWORK 2.0 — social layer: trader profiles + follows, trade feed,
//  leaderboard 2.0, challenges 2.0. Purple accent (#7c3aed) — Network only.
//  Everything here is available to all APPROVED users; admin-only controls
//  are gated inline. Backed by supabase/migrations/20260707110000_network_social.sql
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import {
  Heart, MessageCircle, Share2, X, Send, UserPlus, UserCheck, Settings2,
  Trophy, Crown, TrendingUp, TrendingDown, Minus, Target, Plus, Trash2,
  ArrowUp, Sparkles, BadgeCheck, Camera, Eye, EyeOff, ChevronDown, Medal,
} from 'lucide-react'
import { supabase } from './lib/supabase'

export const ACCENT = '#7c3aed'
const GREEN = '#aaffa0'
const RED = '#ff8080'
const GOLD = '#FFD700'
const SILVER = '#C0C0C0'
const BRONZE = '#CD7F32'

const glass = { background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '14px', backdropFilter: 'var(--card-blur, none)', WebkitBackdropFilter: 'var(--card-blur, none)' }
const inp = { width: '100%', background: 'var(--inp-bg, #141414)', border: '1px solid var(--inp-border, #1f1f1f)', borderRadius: '9px', color: 'var(--text-hi)', fontSize: '13px', padding: '10px 12px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: '10px', color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }
const pillBtn = (active) => ({ background: active ? ACCENT : 'transparent', border: `1px solid ${active ? ACCENT : 'var(--card-border)'}`, color: active ? '#fff' : 'var(--text-md)', fontSize: '12px', fontWeight: active ? 700 : 500, padding: '7px 15px', borderRadius: '99px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', whiteSpace: 'nowrap' })
const purpleBtn = { background: ACCENT, color: '#fff', border: 'none', borderRadius: '99px', padding: '9px 18px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px' }
const ghostBtn = { background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-md)', borderRadius: '99px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px' }

const relTime = (date) => {
  if (!date) return ''
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export function SocialAvatar({ name, url, size = 36 }) {
  const initials = (name || 'U').split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase()
  if (url) return <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${ACCENT}44`, flexShrink: 0 }} />
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `${ACCENT}18`, border: `1px solid ${ACCENT}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.34, fontWeight: 700, color: '#c4b5fd', flexShrink: 0 }}>{initials}</div>
  )
}

function SocialModal({ children, onClose, maxWidth = '540px' }) {
  return createPortal(
    <div onMouseDown={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px', overflowY: 'auto' }}>
      <div onMouseDown={e => e.stopPropagation()} style={{ width: '100%', maxWidth, maxHeight: '90vh', overflowY: 'auto', background: '#0d0d0d', border: `1px solid ${ACCENT}35`, borderRadius: '16px', padding: '26px', boxShadow: `0 32px 100px rgba(0,0,0,0.9), 0 0 0 1px ${ACCENT}18 inset`, animation: 'modalIn 0.2s ease both' }}>
        {children}
      </div>
    </div>,
    document.body
  )
}

// ─── profile data helpers ────────────────────────────────────────────────────
export async function fetchNetworkProfiles(userIds) {
  if (!userIds?.length) return new Map()
  const { data } = await supabase.from('network_profiles').select('*').in('user_id', userIds)
  return new Map((data || []).map(p => [p.user_id, p]))
}

async function ensureMyProfile(session, profile) {
  const uid = session?.user?.id
  if (!uid) return null
  const { data } = await supabase.from('network_profiles').select('*').eq('user_id', uid).maybeSingle()
  if (data) return data
  const seed = {
    user_id: uid,
    display_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.username || session.user.email.split('@')[0],
  }
  const { data: created } = await supabase.from('network_profiles').insert(seed).select().maybeSingle()
  return created || seed
}

// ═══════════════════════════════════════════════════════════════════════════
//  2.1 — PROFILE EDIT (privacy toggles) + PUBLIC PROFILE + FOLLOWS
// ═══════════════════════════════════════════════════════════════════════════
function Toggle({ on, onChange, label, sub }) {
  return (
    <button onClick={() => onChange(!on)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', background: '#111', border: `1px solid ${on ? `${ACCENT}55` : '#1c1c1c'}`, borderRadius: '11px', padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
      <div>
        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-hi)' }}>{label}</div>
        {sub && <div style={{ fontSize: '10.5px', color: '#666', marginTop: '2px' }}>{sub}</div>}
      </div>
      <div style={{ width: '36px', height: '20px', borderRadius: '99px', background: on ? ACCENT : '#222', position: 'relative', transition: 'background .15s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: '2px', left: on ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
      </div>
    </button>
  )
}

export function ProfileEditModal({ session, profile, myNetProfile, onSaved, onClose }) {
  const [f, setF] = useState(() => ({
    display_name: myNetProfile?.display_name || '',
    bio: myNetProfile?.bio || '',
    trading_style: myNetProfile?.trading_style || '',
    twitter: myNetProfile?.twitter || '',
    instagram: myNetProfile?.instagram || '',
    is_public: myNetProfile?.is_public ?? true,
    stats_visible: myNetProfile?.stats_visible ?? false,
    show_pnl: myNetProfile?.show_pnl ?? false,
    avatar_url: myNetProfile?.avatar_url || '',
  }))
  const [showOnLb, setShowOnLb] = useState(profile?.show_on_leaderboard ?? false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const set = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }))

  const onAvatar = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `avatars/${session.user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('chart-images').upload(path, file)
      if (error) throw error
      const { data: pub } = supabase.storage.from('chart-images').getPublicUrl(path)
      setF(p => ({ ...p, avatar_url: pub.publicUrl }))
    } catch (err) { toast.error(`Upload failed — ${err.message}`) }
    finally { setUploading(false) }
  }

  const save = async () => {
    setSaving(true)
    try {
      const { data, error } = await supabase.from('network_profiles')
        .upsert({ user_id: session.user.id, ...f, updated_at: new Date().toISOString() })
        .select().maybeSingle()
      if (error) throw error
      await supabase.from('profiles').update({ show_on_leaderboard: showOnLb }).eq('id', session.user.id)
      toast.success('Profile saved')
      onSaved?.(data, showOnLb)
      onClose()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <SocialModal onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>Edit Trader Profile</div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '4px' }}><X size={18} /></button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
        <SocialAvatar name={f.display_name} url={f.avatar_url} size={64} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} style={ghostBtn}>
          <Camera size={13} /> {uploading ? 'Uploading…' : 'Change avatar'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onAvatar} style={{ display: 'none' }} />
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <div><div style={lbl}>Display Name</div><input value={f.display_name} onChange={set('display_name')} style={inp} placeholder="How traders see you" /></div>
        <div><div style={lbl}>Bio</div><textarea value={f.bio} onChange={set('bio')} style={{ ...inp, minHeight: '70px', resize: 'vertical' }} placeholder="Your edge, your market, your story…" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div><div style={lbl}>Trading Style</div><input value={f.trading_style} onChange={set('trading_style')} style={inp} placeholder="ICT · NQ scalper" /></div>
          <div><div style={lbl}>X / Twitter</div><input value={f.twitter} onChange={set('twitter')} style={inp} placeholder="handle" /></div>
        </div>
        <div><div style={lbl}>Instagram</div><input value={f.instagram} onChange={set('instagram')} style={inp} placeholder="handle" /></div>
      </div>

      <div style={{ ...lbl, margin: '18px 0 8px' }}>Privacy</div>
      <div style={{ display: 'grid', gap: '8px' }}>
        <Toggle on={f.is_public} onChange={v => setF(p => ({ ...p, is_public: v }))} label="Public profile" sub="Other members can open your profile" />
        <Toggle on={f.stats_visible} onChange={v => setF(p => ({ ...p, stats_visible: v }))} label="Show my stats" sub="Win rate, avg R and equity curve (R-multiples only)" />
        <Toggle on={f.show_pnl} onChange={v => setF(p => ({ ...p, show_pnl: v }))} label="Show $ amounts" sub="Off = only R-multiples are ever shown (default)" />
        <Toggle on={showOnLb} onChange={setShowOnLb} label="Appear on leaderboard" sub="Opt in to the weekly / monthly rankings" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
        <button onClick={onClose} style={ghostBtn}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ ...purpleBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save Profile'}</button>
      </div>
    </SocialModal>
  )
}

function Sparkline({ points, width = 220, height = 48 }) {
  if (!points || points.length < 2) return <div style={{ fontSize: '11px', color: '#555' }}>Not enough data for a curve yet</div>
  const vals = points.map(Number)
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const step = width / (vals.length - 1)
  const d = vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(height - ((v - min) / range) * height).toFixed(1)}`).join(' ')
  const up = vals[vals.length - 1] >= vals[0]
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke={up ? GREEN : RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function BadgeRow({ badges, size = 'md' }) {
  const list = Array.isArray(badges) ? badges : []
  if (list.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {list.map((b, i) => (
        <span key={i} title={b.name || ''} style={{ fontSize: size === 'md' ? '11px' : '10px', fontWeight: 700, color: '#c4b5fd', background: `${ACCENT}15`, border: `1px solid ${ACCENT}35`, padding: size === 'md' ? '4px 10px' : '2px 8px', borderRadius: '99px', whiteSpace: 'nowrap' }}>
          {b.emoji || '🏅'} {b.name || 'Badge'}
        </span>
      ))}
    </div>
  )
}

export function TraderProfileModal({ userId, session, onClose }) {
  const myId = session?.user?.id
  const [np, setNp] = useState(null)
  const [stats, setStats] = useState(null)
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const [pRes, sRes, fRes, meRes] = await Promise.all([
          supabase.from('network_profiles').select('*').eq('user_id', userId).maybeSingle(),
          supabase.rpc('network_trader_stats', { target: userId }),
          supabase.from('network_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
          myId ? supabase.from('network_follows').select('follower_id').eq('following_id', userId).eq('follower_id', myId).maybeSingle() : Promise.resolve({ data: null }),
        ])
        if (!alive) return
        setNp(pRes.data)
        setStats(sRes.data || { visible: false })
        setFollowers(fRes.count || 0)
        setFollowing(!!meRes.data)
      } catch { /* profile may not exist yet */ }
      finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [userId, myId])

  const toggleFollow = async () => {
    if (!myId || myId === userId) return
    setBusy(true)
    try {
      if (following) {
        await supabase.from('network_follows').delete().eq('follower_id', myId).eq('following_id', userId)
        setFollowing(false); setFollowers(n => Math.max(0, n - 1))
      } else {
        await supabase.from('network_follows').insert({ follower_id: myId, following_id: userId })
        setFollowing(true); setFollowers(n => n + 1)
      }
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  const name = np?.display_name || 'Trader'
  const hidden = np && np.is_public === false && userId !== myId

  return (
    <SocialModal onClose={onClose} maxWidth="480px">
      <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '14px', background: 'transparent', border: 'none', color: '#555', cursor: 'pointer' }}><X size={18} /></button>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', fontSize: '13px', color: 'var(--text-lo)' }}>Loading profile…</div>
      ) : hidden ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <EyeOff size={28} color="#444" style={{ marginBottom: '10px' }} />
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-hi)' }}>This profile is private</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
            <SocialAvatar name={name} url={np?.avatar_url} size={68} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#fff', letterSpacing: '-0.4px' }}>{name}</div>
              {np?.trading_style && <div style={{ fontSize: '11.5px', color: '#c4b5fd', marginTop: '2px' }}>{np.trading_style}</div>}
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>{followers} follower{followers === 1 ? '' : 's'}</div>
            </div>
            {myId && myId !== userId && (
              <button onClick={toggleFollow} disabled={busy} style={following ? ghostBtn : purpleBtn}>
                {following ? <><UserCheck size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
              </button>
            )}
          </div>

          {np?.bio && <div style={{ fontSize: '13px', color: 'var(--text-md)', lineHeight: 1.6, marginBottom: '14px' }}>{np.bio}</div>}
          <div style={{ marginBottom: '14px' }}><BadgeRow badges={np?.badges} /></div>

          {(np?.twitter || np?.instagram) && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {np.twitter && <a href={`https://x.com/${np.twitter}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#7cc9ff', textDecoration: 'none', border: '1px solid #1f2f3f', borderRadius: '99px', padding: '4px 12px' }}>𝕏 @{np.twitter}</a>}
              {np.instagram && <a href={`https://instagram.com/${np.instagram}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#ff9ecf', textDecoration: 'none', border: '1px solid #3f1f2f', borderRadius: '99px', padding: '4px 12px' }}>IG @{np.instagram}</a>}
            </div>
          )}

          {stats?.visible ? (
            <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '13px', padding: '16px' }}>
              <div style={{ ...lbl, marginBottom: '10px' }}>Live Stats — from their journal</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                {[
                  { l: 'Trades', v: stats.total_trades ?? 0 },
                  { l: 'Win Rate', v: `${stats.win_rate ?? 0}%`, c: (stats.win_rate || 0) >= 50 ? GREEN : undefined },
                  { l: 'Avg R', v: `${stats.avg_r ?? 0}R`, c: (stats.avg_r || 0) > 0 ? GREEN : RED },
                ].map(s => (
                  <div key={s.l} style={{ background: '#101010', border: '1px solid #1c1c1c', borderRadius: '9px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{s.l}</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: s.c || 'var(--text-hi)' }}>{s.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ ...lbl, marginBottom: '6px' }}>Equity curve (R)</div>
              <Sparkline points={(stats.curve || []).slice().reverse()} width={380} height={54} />
              {stats.total_pnl != null && (
                <div style={{ fontSize: '12px', color: 'var(--text-md)', marginTop: '10px' }}>
                  Total PnL: <span style={{ fontWeight: 800, color: stats.total_pnl >= 0 ? GREEN : RED }}>{stats.total_pnl >= 0 ? '+' : '−'}${Math.abs(stats.total_pnl).toLocaleString()}</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '13px', padding: '18px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
              <Eye size={16} color="#444" style={{ marginBottom: '6px' }} /><br />
              This trader keeps their stats private
            </div>
          )}
        </>
      )}
    </SocialModal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  2.2 — TRADE FEED
// ═══════════════════════════════════════════════════════════════════════════
// Build a privacy-safe snapshot for a trade_share post.
export function buildTradeSnapshot(trade, showPnl) {
  let chart = null
  try {
    const parsed = JSON.parse(trade.chart_url || 'null')
    if (Array.isArray(parsed)) chart = parsed.find(u => typeof u === 'string' && u.startsWith('http')) || null
    else if (typeof parsed === 'string' && parsed.startsWith('http')) chart = parsed
  } catch { if (typeof trade.chart_url === 'string' && trade.chart_url.startsWith('http')) chart = trade.chart_url }
  return {
    symbol: trade.symbol || null,
    direction: trade.direction || null,
    rr: trade.rr ?? null,
    result: (Number(trade.pnl) || 0) > 0 ? 'win' : (Number(trade.pnl) || 0) < 0 ? 'loss' : 'flat',
    pnl: showPnl ? Math.round(Number(trade.pnl) || 0) : null,   // $ only when allowed
    trade_date: trade.trade_date || null,
    chart_url: chart,
    session: trade.session || null,
  }
}

// Exported action — used by the Trade Log "Share to Network" button.
export async function shareTradeToNetwork({ trade, session, profile, content = '' }) {
  const uid = session?.user?.id
  if (!uid) throw new Error('Not signed in')
  const { data: np } = await supabase.from('network_profiles').select('show_pnl').eq('user_id', uid).maybeSingle()
  const snapshot = buildTradeSnapshot(trade, !!np?.show_pnl)
  const username = profile?.username || session.user.email.split('@')[0]
  const { error } = await supabase.from('network_posts').insert({
    user_id: uid, username, type: 'trade_share', trade_id: trade.id,
    trade_snapshot: snapshot, content: content || null,
  })
  if (error) throw error
}

function TradeCard({ snap }) {
  if (!snap) return null
  const isWin = snap.result === 'win'
  const dirColor = snap.direction === 'Short' ? RED : GREEN
  return (
    <div style={{ border: `1px solid ${isWin ? 'rgba(170,255,160,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '13px', overflow: 'hidden', marginTop: '10px', background: '#0a0a0a' }}>
      {snap.chart_url && (
        <div style={{ aspectRatio: '16/8', background: '#000', overflow: 'hidden' }}>
          <img src={snap.chart_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.parentElement.style.display = 'none' }} />
        </div>
      )}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {snap.symbol && <span style={{ background: '#161616', color: '#eee', fontSize: '12px', fontWeight: 800, padding: '4px 11px', borderRadius: '7px', letterSpacing: '0.04em' }}>{snap.symbol}</span>}
          {snap.direction && <span style={{ background: `${dirColor}12`, border: `1px solid ${dirColor}30`, color: dirColor, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px' }}>{snap.direction}</span>}
          {snap.session && <span style={{ fontSize: '10.5px', color: '#666' }}>{snap.session}</span>}
        </div>
        <div style={{ textAlign: 'right' }}>
          {snap.rr != null && (
            <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.8px', color: Number(snap.rr) >= 0 ? GREEN : RED, lineHeight: 1 }}>
              {Number(snap.rr) >= 0 ? '+' : ''}{snap.rr}R
            </div>
          )}
          {snap.pnl != null && (
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: snap.pnl >= 0 ? GREEN : RED, marginTop: '3px' }}>
              {snap.pnl >= 0 ? '+' : '−'}${Math.abs(snap.pnl).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PostComments({ post, session, profile }) {
  const [comments, setComments] = useState(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('network_post_comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true }).limit(100)
      .then(({ data }) => setComments(data || []))
  }, [post.id])

  const add = async () => {
    const text = draft.trim()
    if (!text) return
    setBusy(true)
    try {
      const username = profile?.username || session.user.email.split('@')[0]
      const { data, error } = await supabase.from('network_post_comments')
        .insert({ post_id: post.id, user_id: session.user.id, username, content: text }).select().single()
      if (error) throw error
      setComments(prev => [...(prev || []), data])
      setDraft('')
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ marginTop: '12px', borderTop: '1px solid #161616', paddingTop: '12px' }}>
      {comments == null ? (
        <div style={{ fontSize: '11px', color: '#555' }}>Loading comments…</div>
      ) : comments.map(c => (
        <div key={c.id} style={{ display: 'flex', gap: '9px', marginBottom: '10px' }}>
          <SocialAvatar name={c.username} size={26} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-hi)', marginRight: '7px' }}>{c.username}</span>
            <span style={{ fontSize: '10px', color: '#555' }}>{relTime(c.created_at)}</span>
            <div style={{ fontSize: '12.5px', color: 'var(--text-md)', lineHeight: 1.5, wordBreak: 'break-word' }}>{c.content}</div>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} placeholder="Add a comment…" style={{ ...inp, padding: '8px 12px', fontSize: '12px' }} />
        <button onClick={add} disabled={busy || !draft.trim()} style={{ ...purpleBtn, padding: '8px 12px', opacity: busy || !draft.trim() ? 0.5 : 1 }}><Send size={13} /></button>
      </div>
    </div>
  )
}

const PAGE_SIZE = 15

export function NetworkFeed({ session, profile, isAdmin, onOpenProfile }) {
  const myId = session?.user?.id
  const [filter, setFilter] = useState('all')            // all | following | top
  const [posts, setPosts] = useState([])
  const [likedByMe, setLikedByMe] = useState(new Set())
  const [profilesMap, setProfilesMap] = useState(new Map())
  const [followingIds, setFollowingIds] = useState(new Set())
  const [openComments, setOpenComments] = useState(new Set())
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [freshCount, setFreshCount] = useState(0)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const sentinelRef = useRef(null)
  const loadingRef = useRef(false)

  const enrich = useCallback(async (rows) => {
    const ids = [...new Set(rows.map(p => p.user_id))]
    const map = await fetchNetworkProfiles(ids)
    setProfilesMap(prev => { const m = new Map(prev); map.forEach((v, k) => m.set(k, v)); return m })
    if (myId && rows.length) {
      const { data } = await supabase.from('network_post_likes').select('post_id').eq('user_id', myId).in('post_id', rows.map(p => p.id))
      setLikedByMe(prev => { const s = new Set(prev); (data || []).forEach(l => s.add(l.post_id)); return s })
    }
  }, [myId])

  const fetchPage = useCallback(async (reset = false) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    try {
      let q = supabase.from('network_posts').select('*')
      if (filter === 'following' && followingIds.size > 0) q = q.in('user_id', [...followingIds])
      if (filter === 'following' && followingIds.size === 0) { setPosts([]); setHasMore(false); return }
      if (filter === 'top') {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
        q = q.gte('created_at', weekAgo).order('likes_count', { ascending: false }).order('created_at', { ascending: false })
      } else {
        q = q.order('created_at', { ascending: false })
      }
      const from = reset ? 0 : posts.length
      const { data, error } = await q.range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      const rows = data || []
      setPosts(prev => reset ? rows : [...prev, ...rows.filter(r => !prev.find(p => p.id === r.id))])
      setHasMore(rows.length === PAGE_SIZE)
      await enrich(rows)
    } catch (e) { console.error('[feed]', e) }
    finally { setLoading(false); loadingRef.current = false }
  }, [filter, followingIds, posts.length, enrich])

  // following list
  useEffect(() => {
    if (!myId) return
    supabase.from('network_follows').select('following_id').eq('follower_id', myId)
      .then(({ data }) => setFollowingIds(new Set((data || []).map(f => f.following_id))))
  }, [myId])

  // initial + filter change
  useEffect(() => { setPosts([]); setHasMore(true); fetchPage(true) }, [filter, followingIds.size]) // eslint-disable-line react-hooks/exhaustive-deps

  // realtime: new-post indicator
  useEffect(() => {
    const sub = supabase.channel(`feed-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'network_posts' }, payload => {
        if (payload.new.user_id === myId) return
        setFreshCount(n => n + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [myId])

  // infinite scroll
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingRef.current) fetchPage(false)
    }, { rootMargin: '400px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [fetchPage, hasMore])

  const toggleLike = async (post) => {
    if (!myId) return
    const liked = likedByMe.has(post.id)
    setLikedByMe(prev => { const s = new Set(prev); liked ? s.delete(post.id) : s.add(post.id); return s })
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes_count: Math.max(0, p.likes_count + (liked ? -1 : 1)) } : p))
    try {
      if (liked) await supabase.from('network_post_likes').delete().eq('post_id', post.id).eq('user_id', myId)
      else await supabase.from('network_post_likes').insert({ post_id: post.id, user_id: myId })
    } catch { /* optimistic; trigger keeps server truth */ }
  }

  const deletePost = async (id) => {
    if (!confirm('Delete this post?')) return
    try {
      const { error } = await supabase.from('network_posts').delete().eq('id', id)
      if (error) throw error
      setPosts(prev => prev.filter(p => p.id !== id))
    } catch (e) { toast.error(e.message) }
  }

  const publish = async () => {
    const text = draft.trim()
    if (!text) return
    setPosting(true)
    try {
      const username = profile?.username || session.user.email.split('@')[0]
      const { data, error } = await supabase.from('network_posts')
        .insert({ user_id: myId, username, type: 'text', content: text }).select().single()
      if (error) throw error
      setPosts(prev => [data, ...prev])
      setDraft('')
    } catch (e) { toast.error(e.message) }
    finally { setPosting(false) }
  }

  const refresh = () => { setFreshCount(0); setPosts([]); setHasMore(true); fetchPage(true) }

  return (
    <div>
      {/* filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {[['all', 'All'], ['following', 'Following'], ['top', 'Top this week']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={pillBtn(filter === id)}>{label}</button>
        ))}
      </div>

      {/* composer */}
      <div style={{ ...glass, padding: '14px 16px', marginBottom: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <SocialAvatar name={profile?.username || 'me'} url={profilesMap.get(myId)?.avatar_url} size={34} />
        <div style={{ flex: 1 }}>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Share an idea with the network… (share trades from your Trade Log)" rows={2}
            style={{ ...inp, resize: 'vertical', minHeight: '44px' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button onClick={publish} disabled={posting || !draft.trim()} style={{ ...purpleBtn, opacity: posting || !draft.trim() ? 0.5 : 1 }}>
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>

      {/* new posts indicator */}
      {freshCount > 0 && (
        <button onClick={refresh} style={{ ...purpleBtn, width: '100%', justifyContent: 'center', marginBottom: '12px', animation: 'modalIn .2s ease both' }}>
          <ArrowUp size={13} /> {freshCount} new post{freshCount > 1 ? 's' : ''} — tap to refresh
        </button>
      )}

      {/* posts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {posts.length === 0 && !loading && (
          <div style={{ ...glass, padding: '40px', textAlign: 'center', fontSize: '13px', color: 'var(--text-lo)' }}>
            {filter === 'following' ? 'Follow traders to build your feed.' : 'No posts yet — be the first to share a trade.'}
          </div>
        )}
        {posts.map(p => {
          const np = profilesMap.get(p.user_id)
          const name = np?.display_name || p.username || 'trader'
          const liked = likedByMe.has(p.id)
          const showComments = openComments.has(p.id)
          return (
            <div key={p.id} style={{ ...glass, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={() => onOpenProfile?.(p.user_id)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                  <SocialAvatar name={name} url={np?.avatar_url} size={38} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button onClick={() => onOpenProfile?.(p.user_id)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: 800, color: 'var(--text-hi)' }}>{name}</button>
                  <div style={{ fontSize: '10.5px', color: '#666' }}>
                    {relTime(p.created_at)} ago{p.type === 'trade_share' && <span style={{ color: '#c4b5fd' }}> · shared a trade</span>}
                  </div>
                </div>
                {(p.user_id === myId || isAdmin) && (
                  <button onClick={() => deletePost(p.id)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', padding: '4px' }} title="Delete"><Trash2 size={14} /></button>
                )}
              </div>

              {p.content && <div style={{ fontSize: '13.5px', color: 'var(--text-md)', lineHeight: 1.6, marginTop: '10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{p.content}</div>}
              {p.type === 'trade_share' && <TradeCard snap={p.trade_snapshot} />}
              {p.image_url && <img src={p.image_url} alt="" loading="lazy" style={{ maxWidth: '100%', borderRadius: '10px', marginTop: '10px', border: '1px solid #1a1a1a' }} />}

              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <button onClick={() => toggleLike(p)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: liked ? '#f472b6' : '#666', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700, padding: '4px' }}>
                  <Heart size={15} fill={liked ? '#f472b6' : 'none'} /> {p.likes_count || 0}
                </button>
                <button onClick={() => setOpenComments(prev => { const s = new Set(prev); s.has(p.id) ? s.delete(p.id) : s.add(p.id); return s })}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: showComments ? '#c4b5fd' : '#666', fontFamily: 'inherit', fontSize: '12px', fontWeight: 700, padding: '4px' }}>
                  <MessageCircle size={15} /> {p.comments_count || 0}
                </button>
              </div>

              {showComments && <PostComments post={p} session={session} profile={profile} />}
            </div>
          )
        })}
      </div>

      <div ref={sentinelRef} style={{ height: '1px' }} />
      {loading && <div style={{ textAlign: 'center', padding: '18px', fontSize: '12px', color: '#555' }}>Loading…</div>}
      {!hasMore && posts.length > 0 && <div style={{ textAlign: 'center', padding: '18px', fontSize: '11px', color: '#444' }}>— end of feed —</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  2.3 — LEADERBOARD 2.0
// ═══════════════════════════════════════════════════════════════════════════
const rankKey = (period) => {
  const d = new Date()
  if (period === 'week') { const onejan = new Date(d.getFullYear(), 0, 1); const wk = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7); return `lb_prev_${period}_${d.getFullYear()}w${wk}` }
  if (period === 'month') return `lb_prev_${period}_${d.toISOString().slice(0, 7)}`
  return `lb_prev_${period}`
}

export function Leaderboard2({ session, onOpenProfile }) {
  const myId = session?.user?.id
  const [period, setPeriod] = useState('week')
  const [rows, setRows] = useState(null)
  const [prevRanks, setPrevRanks] = useState({})

  useEffect(() => {
    let alive = true
    setRows(null)
    ;(async () => {
      try {
        const { data, error } = await supabase.rpc('network_leaderboard', { period })
        if (error) throw error
        if (!alive) return
        const list = data || []
        setRows(list)
        // movement arrows: compare with the snapshot from the previous period
        try {
          const key = rankKey(period)
          const prevKeyStored = localStorage.getItem(`${key}_prev`)
          setPrevRanks(prevKeyStored ? JSON.parse(prevKeyStored) : {})
          // store the current snapshot for NEXT period under a rolling scheme
          const current = {}
          list.forEach((r, i) => { current[r.user_id] = i + 1 })
          const lastKey = localStorage.getItem(`lb_lastkey_${period}`)
          if (lastKey && lastKey !== key) {
            // period rolled over → last snapshot becomes "previous"
            localStorage.setItem(`${key}_prev`, localStorage.getItem(`${lastKey}_cur`) || '{}')
            setPrevRanks(JSON.parse(localStorage.getItem(`${key}_prev`) || '{}'))
          }
          localStorage.setItem(`${key}_cur`, JSON.stringify(current))
          localStorage.setItem(`lb_lastkey_${period}`, key)
        } catch { /* movement is best-effort */ }
      } catch (e) { console.error('[leaderboard]', e); if (alive) setRows([]) }
    })()
    return () => { alive = false }
  }, [period])

  const myIdx = (rows || []).findIndex(r => r.user_id === myId)
  const podium = (rows || []).slice(0, 3)
  const rest = (rows || []).slice(3, 20)

  const Movement = ({ userId, rank }) => {
    const prev = prevRanks[userId]
    if (!prev || prev === rank) return <Minus size={11} color="#444" />
    const up = prev > rank
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: 800, color: up ? GREEN : RED }}>
        {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{Math.abs(prev - rank)}
      </span>
    )
  }

  const podiumMeta = [
    { place: 2, color: SILVER, h: 84 },
    { place: 1, color: GOLD, h: 106 },
    { place: 3, color: BRONZE, h: 70 },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[['week', 'This Week'], ['month', 'This Month'], ['all', 'All Time']].map(([id, label]) => (
          <button key={id} onClick={() => setPeriod(id)} style={pillBtn(period === id)}>{label}</button>
        ))}
      </div>

      {rows == null ? (
        <div style={{ ...glass, padding: '40px', textAlign: 'center', fontSize: '13px', color: 'var(--text-lo)' }}>Loading rankings…</div>
      ) : rows.length === 0 ? (
        <div style={{ ...glass, padding: '40px', textAlign: 'center' }}>
          <Trophy size={26} color="#333" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-hi)', marginBottom: '4px' }}>No qualifiers yet</div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-lo)' }}>10+ trades this period + leaderboard opt-in required.</div>
        </div>
      ) : (
        <>
          {/* podium */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '10px', marginBottom: '18px' }}>
            {podiumMeta.map(({ place, color, h }) => {
              const r = podium[place - 1]
              if (!r) return <div key={place} style={{ width: '110px' }} />
              return (
                <button key={place} onClick={() => onOpenProfile?.(r.user_id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', width: '110px', padding: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                    {place === 1 && <Crown size={20} color={GOLD} style={{ marginBottom: '4px', filter: `drop-shadow(0 0 6px ${GOLD}88)` }} />}
                    <SocialAvatar name={r.display_name} url={r.avatar_url} size={place === 1 ? 52 : 42} />
                    <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-hi)', marginTop: '6px', maxWidth: '104px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.display_name || r.username}</div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: Number(r.r_gained) >= 0 ? GREEN : RED }}>{Number(r.r_gained) >= 0 ? '+' : ''}{r.r_gained}R</div>
                  </div>
                  <div style={{ height: `${h}px`, borderRadius: '10px 10px 0 0', background: `linear-gradient(180deg, ${color}30, ${color}08)`, border: `1px solid ${color}45`, borderBottom: 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '8px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 900, color }}>{place}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ranked list */}
          <div style={{ ...glass, overflow: 'hidden' }}>
            {rest.map((r, i) => {
              const rank = i + 4
              return (
                <button key={r.user_id} onClick={() => onOpenProfile?.(r.user_id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '11px 16px', background: r.user_id === myId ? `${ACCENT}0d` : 'transparent', border: 'none', borderBottom: '1px solid var(--card-border)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                  <span style={{ width: '26px', fontSize: '12px', fontWeight: 800, color: '#666' }}>#{rank}</span>
                  <Movement userId={r.user_id} rank={rank} />
                  <SocialAvatar name={r.display_name} url={r.avatar_url} size={30} />
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: 700, color: 'var(--text-hi)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.display_name || r.username}</span>
                  <span style={{ fontSize: '11px', color: '#666' }}>{r.win_rate}% wr</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: Number(r.r_gained) >= 0 ? GREEN : RED, minWidth: '54px', textAlign: 'right' }}>{Number(r.r_gained) >= 0 ? '+' : ''}{r.r_gained}R</span>
                </button>
              )
            })}
            {rest.length === 0 && <div style={{ padding: '18px', fontSize: '12px', color: '#555', textAlign: 'center' }}>Top 3 hold the board — for now.</div>}
          </div>

          {/* my rank — always pinned */}
          <div style={{ ...glass, marginTop: '12px', padding: '13px 16px', border: `1px solid ${ACCENT}40`, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Medal size={16} color="#c4b5fd" />
            {myIdx >= 0 ? (
              <>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-hi)' }}>Your rank: #{myIdx + 1}</span>
                <span style={{ fontSize: '12px', color: '#888' }}>{rows[myIdx].r_gained >= 0 ? '+' : ''}{rows[myIdx].r_gained}R · {rows[myIdx].win_rate}% win rate</span>
              </>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-md)' }}>
                Not ranked this period — you need 10+ trades and <b style={{ color: '#c4b5fd' }}>leaderboard opt-in</b> (profile settings).
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  2.4 — CHALLENGES 2.0 (auto-tracked from real data)
// ═══════════════════════════════════════════════════════════════════════════
const CH_TYPES = {
  consistency: { label: 'Consistency', hint: 'Journal trades on N distinct days', unit: 'days', color: '#7cc9ff' },
  performance: { label: 'Performance', hint: 'Finish the window positive in R', unit: 'R', color: GREEN },
  discipline: { label: 'Discipline', hint: 'No plan violations (followed plan = YES)', unit: 'clean days', color: '#ffd966' },
}

function computeChallengeProgress(ch, myTrades) {
  const since = ch.starts_at ? new Date(ch.starts_at + 'T00:00:00') : new Date(Date.now() - ch.duration_days * 86400000)
  const until = new Date(since.getTime() + (ch.duration_days || 7) * 86400000)
  const inWindow = (myTrades || []).filter(t => {
    const d = new Date((t.trade_date || '') + 'T00:00:00')
    return !isNaN(d) && d >= since && d <= until
  })
  if (ch.type === 'consistency') {
    return new Set(inWindow.map(t => t.trade_date)).size
  }
  if (ch.type === 'performance') {
    return Math.round(inWindow.reduce((s, t) => s + (Number(t.rr) || 0), 0) * 100) / 100
  }
  if (ch.type === 'discipline') {
    const byDay = new Map()
    inWindow.forEach(t => {
      const clean = (t.followed_plan || '').toUpperCase() === 'YES'
      byDay.set(t.trade_date, (byDay.get(t.trade_date) ?? true) && clean)
    })
    return [...byDay.values()].filter(Boolean).length
  }
  return 0
}

export function Challenges2({ session, isAdmin }) {
  const myId = session?.user?.id
  const [challenges, setChallenges] = useState(null)
  const [progressMap, setProgressMap] = useState(new Map())   // challenge_id -> my row
  const [counts, setCounts] = useState(new Map())             // challenge_id -> participants
  const [myTrades, setMyTrades] = useState([])
  const [creator, setCreator] = useState(false)
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    try {
      const [chRes, prRes, trRes] = await Promise.all([
        supabase.from('network_challenges_v2').select('*').eq('active', true).order('created_at', { ascending: false }),
        myId ? supabase.from('network_challenge_progress').select('*') : Promise.resolve({ data: [] }),
        myId ? supabase.from('trades').select('trade_date, rr, followed_plan, pnl').eq('user_id', myId).gte('trade_date', new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)) : Promise.resolve({ data: [] }),
      ])
      const chs = chRes.data || []
      setChallenges(chs)
      setMyTrades(trRes.data || [])
      const mine = new Map(); const cnt = new Map()
      ;(prRes.data || []).forEach(r => {
        cnt.set(r.challenge_id, (cnt.get(r.challenge_id) || 0) + 1)
        if (r.user_id === myId) mine.set(r.challenge_id, r)
      })
      setProgressMap(mine); setCounts(cnt)
    } catch (e) { console.error('[challenges]', e); setChallenges([]) }
  }, [myId])

  useEffect(() => { load() }, [load])

  // auto-progress sync: recompute from trades, push updates + completions
  useEffect(() => {
    if (!challenges || !myId) return
    challenges.forEach(async (ch) => {
      const row = progressMap.get(ch.id)
      if (!row || row.completed_at) return
      const value = computeChallengeProgress(ch, myTrades)
      const done = value >= Number(ch.target)
      if (value !== Number(row.progress) || done) {
        const patch = { progress: value, ...(done ? { completed_at: new Date().toISOString() } : {}) }
        await supabase.from('network_challenge_progress').update(patch).eq('challenge_id', ch.id).eq('user_id', myId)
        setProgressMap(prev => { const m = new Map(prev); m.set(ch.id, { ...row, ...patch }); return m })
        if (done) {
          toast.success(`Challenge complete — ${ch.reward_badge}!`)
          // award the badge on the profile
          try {
            const { data: np } = await supabase.from('network_profiles').select('badges').eq('user_id', myId).maybeSingle()
            const badges = Array.isArray(np?.badges) ? np.badges : []
            const [emoji, ...nameParts] = (ch.reward_badge || '🏅 Badge').split(' ')
            if (!badges.find(b => b.name === nameParts.join(' '))) {
              badges.push({ emoji, name: nameParts.join(' ') || 'Badge', challenge_id: ch.id, at: new Date().toISOString() })
              await supabase.from('network_profiles').upsert({ user_id: myId, badges })
            }
          } catch { /* badge award best-effort */ }
        }
      }
    })
  }, [challenges, myTrades, progressMap, myId])

  const join = async (ch) => {
    setBusy(ch.id)
    try {
      const { error } = await supabase.from('network_challenge_progress').insert({ challenge_id: ch.id, user_id: myId, progress: 0 })
      if (error) throw error
      setProgressMap(prev => { const m = new Map(prev); m.set(ch.id, { challenge_id: ch.id, user_id: myId, progress: 0 }); return m })
      setCounts(prev => { const m = new Map(prev); m.set(ch.id, (m.get(ch.id) || 0) + 1); return m })
      toast.success(`Joined "${ch.title}" — progress tracks automatically`)
    } catch (e) { toast.error(e.message) }
    finally { setBusy(null) }
  }

  const removeChallenge = async (id) => {
    if (!confirm('Deactivate this challenge?')) return
    await supabase.from('network_challenges_v2').update({ active: false }).eq('id', id)
    setChallenges(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <button onClick={() => setCreator(true)} style={purpleBtn}><Plus size={13} /> New Challenge</button>
        </div>
      )}
      {challenges == null ? (
        <div style={{ ...glass, padding: '36px', textAlign: 'center', fontSize: '13px', color: 'var(--text-lo)' }}>Loading challenges…</div>
      ) : challenges.length === 0 ? (
        <div style={{ ...glass, padding: '36px', textAlign: 'center' }}>
          <Target size={26} color="#333" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-hi)' }}>No active challenges</div>
          {isAdmin && <div style={{ fontSize: '11.5px', color: 'var(--text-lo)', marginTop: '4px' }}>Create the first one — progress tracks itself from real trades.</div>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }} className="chart-grid">
          {challenges.map(ch => {
            const meta = CH_TYPES[ch.type] || CH_TYPES.consistency
            const row = progressMap.get(ch.id)
            const joined = !!row
            const value = joined ? Number(row.progress) : 0
            const pct = Math.min(100, Math.max(0, Number(ch.target) > 0 ? value / Number(ch.target) * 100 : 0))
            const done = !!row?.completed_at
            return (
              <div key={ch.id} style={{ ...glass, padding: '18px', border: done ? '1px solid rgba(170,255,160,0.35)' : glass.border }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: meta.color, background: `${meta.color}12`, border: `1px solid ${meta.color}30`, padding: '3px 9px', borderRadius: '99px' }}>{meta.label}</span>
                  {isAdmin && <button onClick={() => removeChallenge(ch.id)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', padding: '2px' }}><Trash2 size={13} /></button>}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-hi)', marginBottom: '4px' }}>{ch.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-md)', lineHeight: 1.5, marginBottom: '12px' }}>{ch.description || meta.hint}</div>

                {joined ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px' }}>
                      <span style={{ color: '#888' }}>{done ? 'Completed 🎉' : 'Auto-tracked progress'}</span>
                      <span style={{ fontWeight: 800, color: done ? GREEN : '#c4b5fd' }}>{value} / {ch.target} {meta.unit}</span>
                    </div>
                    <div style={{ height: '7px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden', marginBottom: '12px' }}>
                      <div style={{ width: `${done ? 100 : pct}%`, height: '100%', borderRadius: '99px', background: done ? GREEN : ACCENT, transition: 'width .5s ease' }} />
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '12px' }}>{ch.duration_days} days · target {ch.target} {meta.unit}</div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: '#aaa', background: '#141414', border: '1px solid #222', padding: '3px 9px', borderRadius: '99px' }}>{ch.reward_badge}</span>
                    <span style={{ fontSize: '10.5px', color: '#555' }}>{counts.get(ch.id) || 0} joined</span>
                  </div>
                  {!joined && (
                    <button onClick={() => join(ch)} disabled={busy === ch.id} style={{ ...purpleBtn, padding: '6px 14px', fontSize: '11px', opacity: busy === ch.id ? 0.5 : 1 }}>Join</button>
                  )}
                  {done && <BadgeCheck size={17} color={GREEN} />}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {creator && <ChallengeCreator onClose={() => setCreator(false)} onCreated={() => { setCreator(false); load() }} session={session} />}
    </div>
  )
}

function ChallengeCreator({ session, onClose, onCreated }) {
  const [f, setF] = useState({ title: '', description: '', type: 'consistency', duration_days: '7', target: '5', reward_emoji: '🏅', reward_name: 'Badge' })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }))
  const save = async () => {
    if (!f.title.trim()) { toast.error('Title required'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('network_challenges_v2').insert({
        title: f.title.trim(), description: f.description.trim() || null, type: f.type,
        duration_days: Number(f.duration_days) || 7, target: Number(f.target) || 1,
        reward_badge: `${f.reward_emoji} ${f.reward_name}`.trim(), created_by: session.user.id,
      })
      if (error) throw error
      toast.success('Challenge live')
      onCreated()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }
  return (
    <SocialModal onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '18px' }}>
        <Sparkles size={17} color={ACCENT} />
        <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>Create Challenge</div>
      </div>
      <div style={{ display: 'grid', gap: '12px' }}>
        <div><div style={lbl}>Title</div><input value={f.title} onChange={set('title')} style={inp} placeholder="e.g. 5-Day Journal Streak" /></div>
        <div><div style={lbl}>Description</div><textarea value={f.description} onChange={set('description')} style={{ ...inp, minHeight: '60px', resize: 'vertical' }} placeholder="What does it take to complete?" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div>
            <div style={lbl}>Type</div>
            <div style={{ position: 'relative' }}>
              <select value={f.type} onChange={set('type')} style={{ ...inp, appearance: 'none', paddingRight: '30px', cursor: 'pointer' }}>
                {Object.entries(CH_TYPES).map(([id, m]) => <option key={id} value={id} style={{ background: '#0d0d0d' }}>{m.label}</option>)}
              </select>
              <ChevronDown size={14} color="#555" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>
          <div><div style={lbl}>Duration (days)</div><input type="number" value={f.duration_days} onChange={set('duration_days')} style={inp} /></div>
          <div><div style={lbl}>Target ({CH_TYPES[f.type].unit})</div><input type="number" value={f.target} onChange={set('target')} style={inp} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '10px' }}>
          <div><div style={lbl}>Emoji</div><input value={f.reward_emoji} onChange={set('reward_emoji')} style={{ ...inp, textAlign: 'center' }} /></div>
          <div><div style={lbl}>Badge Name</div><input value={f.reward_name} onChange={set('reward_name')} style={inp} placeholder="Discipline Badge" /></div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
        <button onClick={onClose} style={ghostBtn}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ ...purpleBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Creating…' : 'Launch Challenge'}</button>
      </div>
    </SocialModal>
  )
}

// "Share to Network" — drop-in button for the Trade Log / trade modal.
// Self-contained: resolves the current user + username on click.
export function ShareTradeButton({ trade, compact = false, style = {} }) {
  const [sharing, setSharing] = useState(false)
  const share = async (e) => {
    e?.stopPropagation?.()
    if (!trade?.id) return
    setSharing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const { data: prof } = await supabase.from('profiles').select('username, first_name, last_name').eq('id', user.id).maybeSingle()
      await shareTradeToNetwork({ trade, session: { user }, profile: prof })
      toast.success('Shared to the Network feed')
    } catch (err) { toast.error(`Share failed — ${err.message}`) }
    finally { setSharing(false) }
  }
  return (
    <button onClick={share} disabled={sharing} title="Share to Network" style={{
      background: `${ACCENT}12`, border: `1px solid ${ACCENT}40`, color: '#c4b5fd',
      borderRadius: '99px', padding: compact ? '6px 12px' : '9px 18px',
      fontSize: compact ? '11px' : '12px', fontWeight: 700, cursor: sharing ? 'wait' : 'pointer',
      fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px',
      opacity: sharing ? 0.6 : 1, ...style,
    }}>
      <Share2 size={compact ? 12 : 14} /> {sharing ? 'Sharing…' : 'Share to Network'}
    </button>
  )
}

// convenience hook for NetworkPage
export function useMyNetworkProfile(session, profile) {
  const [np, setNp] = useState(null)
  useEffect(() => {
    let alive = true
    if (session?.user?.id) ensureMyProfile(session, profile).then(p => { if (alive) setNp(p) })
    return () => { alive = false }
  }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return [np, setNp]
}
