// Admin, rebuilt in the black and white look. Same data and actions as the classic panel
// (users, waitlist, tickets, emails, invites, feature flags, announcement, health) plus a Live
// view of who is on the website and in the journal right now. Admins only.
import React from 'react'
import { toast } from 'react-hot-toast'
import { Radio, BarChart2, Users, Crown, MessageSquare, Mail, Activity, RefreshCw, Search, X, Download, Plus, Copy, Eye, Ban, Check, ChevronDown, Smartphone, Monitor, Globe, CreditCard, Target, Sparkles, CalendarDays, BookOpen, Megaphone, Send, MousePointerClick, Link2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { hasPaidAccess } from '../lib/billing'
import { useLiveState, liveHash } from '../lib/live.jsx'
import { useStore } from './store.jsx'
import { Modal } from './ui.jsx'
import AppShell from './Shell.jsx'

// ── small helpers ──
const nameOf = (u) => (u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email || 'User' : 'Unknown')
const initials = (u) => String(u?.first_name || u?.username || u?.email || 'U').slice(0, 2).toUpperCase()
const fmtDate = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return '—' } }
const ago = (d) => {
  if (!d) return '—'
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000)
  if (s < 45) return 'just now'
  if (s < 3600) return Math.round(s / 60) + 'm ago'
  if (s < 86400) return Math.round(s / 3600) + 'h ago'
  if (s < 86400 * 30) return Math.round(s / 86400) + 'd ago'
  return fmtDate(d)
}
const since = (ms) => {
  if (!ms) return ''
  const s = Math.max(0, (Date.now() - ms) / 1000)
  if (s < 60) return Math.round(s) + 's'
  if (s < 3600) return Math.round(s / 60) + 'm'
  return Math.floor(s / 3600) + 'h ' + Math.round((s % 3600) / 60) + 'm'
}
const usd = (v) => (v >= 0 ? '+' : '−') + '$' + Math.abs(Math.round(v)).toLocaleString()
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
const isToday = (ts) => !!ts && new Date(ts) >= startOfToday()
const makeInviteCode = () => {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let c = ''
  const r = new Uint32Array(8)
  try { crypto.getRandomValues(r) } catch { for (let i = 0; i < 8; i++) r[i] = Math.floor(Math.random() * 1e9) }
  for (let i = 0; i < 8; i++) c += a[r[i] % a.length]
  return c
}
const place = (z) => (z ? String(z).split('/').pop().replace(/_/g, ' ') : '')
const SITE_PAGES = { home: 'Home', pricing: 'Pricing', checkout: 'Checkout', blog: 'Blog', terms: 'Terms', privacy: 'Privacy', refunds: 'Refunds', notfound: 'Missing page' }
const APP_PAGES = { dashboard: 'Dashboard', journal: 'Journal', analytics: 'Analytics', calendar: 'Calendar', plan: 'Plan', network: 'Network', account: 'Account', billing: 'Billing', admin: 'Admin', news: 'News', backtest: 'Backtest', copy: 'TradeSync', pay: 'Pay screen', signup: 'Create account', login: 'Sign in', waiting: 'Waiting screen', banned: 'Banned screen', start: 'Opening' }
const pageLabel = (k, p) => {
  if (k === 'site') return String(p || '').startsWith('blog:') ? 'Blog: ' + String(p).slice(5).replace(/-/g, ' ') : SITE_PAGES[p] || p || 'Home'
  return APP_PAGES[p] || p || 'App'
}

function Stat({ n, l, sub, live }) {
  return (
    <div className={'glass adm-stat' + (live ? ' live' : '')}>
      <span className="adm-n">{n}</span>
      <span className="adm-l">{live && <i className="adm-dot" />}{l}</span>
      {sub && <span className="adm-sub">{sub}</span>}
    </div>
  )
}

function Bars({ data, height = 150 }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const w = 100 / data.length
  return (
    <div className="adm-bars" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {data.map((d, i) => {
          const h = (d.count / max) * 92
          return <rect key={i} x={i * w + w * 0.18} width={w * 0.64} y={100 - Math.max(h, d.count ? 2 : 0.6)} height={Math.max(h, d.count ? 2 : 0.6)} rx="0.6" className={d.count ? 'on' : ''}><title>{d.label}: {d.count}</title></rect>
        })}
      </svg>
      <div className="adm-bars-x">
        <span>{data[0]?.label}</span><span>{data[Math.floor(data.length / 2)]?.label}</span><span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}

function Avatar({ u, size = 34 }) {
  return <span className="adm-av" style={{ width: size, height: size, fontSize: size * 0.34 }}>{initials(u)}</span>
}

function Toggle({ on, onClick, label, desc, Icon, disabled }) {
  return (
    <button type="button" className="ns-toggle adm-toggle" onClick={onClick} disabled={disabled} aria-pressed={on}>
      {Icon && <span className="adm-ticon"><Icon size={16} /></span>}
      <span className="ns-tl"><b>{label}</b>{desc && <small>{desc}</small>}</span>
      <span className={'ns-sw' + (on ? ' on' : '')}><i /></span>
    </button>
  )
}

// ── data + actions (same queries as the classic admin) ──
function useAdminData() {
  const { session } = useStore()
  const [d, setD] = React.useState({ users: [], trades: [], invites: [], tickets: [], subs: [], beta: [], loaded: false, ok: null, checkedAt: null })
  const [announcement, setAnnouncement] = React.useState({ text: '', active: false })
  const [annDraft, setAnnDraft] = React.useState('')
  const [flags, setFlags] = React.useState({ monthlyGoalTracker: true, aiChecklist: true, newsCalendar: true, feedSection: true, paywall: false })
  const [error, setError] = React.useState('')

  const load = React.useCallback(async () => {
    setError('')
    try {
      const [usersRes, tradesRes, invitesRes, settingsRes, ticketsRes, subsRes, betaRes] = await Promise.all([
        supabase.from('admin_users_view').select('*').order('created_at', { ascending: false }),
        supabase.from('trades').select('id, user_id, pnl, symbol, trade_date, created_at'),
        supabase.from('invites').select('*').order('created_at', { ascending: false }),
        supabase.from('app_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('support_tickets').select('*').order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('user_id, status, plan, created_at, updated_at, current_period_end, cancel_at_period_end'),
        supabase.from('beta_access').select('user_id, granted_at'),
      ])
      if (usersRes.error) throw usersRes.error
      if (tradesRes.error) throw tradesRes.error
      setD((p) => ({
        ...p,
        users: usersRes.data || [],
        trades: tradesRes.data || [],
        invites: invitesRes.error ? p.invites : invitesRes.data || [],
        tickets: ticketsRes.error ? p.tickets : ticketsRes.data || [],
        subs: subsRes.error ? p.subs : subsRes.data || [],
        beta: betaRes.error ? p.beta : betaRes.data || [],
        loaded: true, ok: true, checkedAt: new Date(),
      }))
      if (!settingsRes.error && settingsRes.data) {
        const ann = { text: settingsRes.data.announcement_text || '', active: !!settingsRes.data.announcement_active }
        setAnnouncement(ann)
        setAnnDraft((prev) => prev || ann.text)
        if (settingsRes.data.feature_flags && typeof settingsRes.data.feature_flags === 'object') setFlags((prev) => ({ ...prev, ...settingsRes.data.feature_flags }))
      }
    } catch (e) {
      setD((p) => ({ ...p, loaded: true, ok: false, checkedAt: new Date() }))
      setError(e.message || 'Failed to load')
    }
  }, [])

  React.useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const setUsers = (fn) => setD((p) => ({ ...p, users: fn(p.users) }))
  const setInvites = (fn) => setD((p) => ({ ...p, invites: fn(p.invites) }))
  const setTickets = (fn) => setD((p) => ({ ...p, tickets: fn(p.tickets) }))

  // Fire and forget welcome email on approval
  const sendApprovalEmail = (id) => {
    fetch('/api/send-approval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id }) }).catch(() => {})
  }
  const updateStatus = async (id, status) => {
    const past = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : status === 'banned' ? 'banned' : 'updated'
    try {
      const { data, error } = await supabase.from('profiles').update({ status }).eq('id', id).select()
      if (error) throw error
      if (!data || data.length === 0) throw new Error('No rows updated. A database policy is blocking the change.')
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)))
      if (status === 'approved') sendApprovalEmail(id)
      toast.success(`User ${past}`)
    } catch (e) { toast.error(`Could not update: ${e.message}`); setError(e.message) }
  }
  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user from profiles? (Their login stays.)')) return
    try {
      const { data, error } = await supabase.from('profiles').delete().eq('id', id).select()
      if (error) throw error
      if (!data || data.length === 0) throw new Error('No rows deleted. A database policy is blocking the delete.')
      setUsers((prev) => prev.filter((u) => u.id !== id))
      toast.success('User deleted')
    } catch (e) { toast.error(`Could not delete: ${e.message}`); setError(e.message) }
  }
  const sendPasswordReset = async (email) => {
    if (!email) return
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://app.limitless-journal.com' })
      if (error) throw error
      toast.success(`Reset email sent to ${email}`)
    } catch (e) { toast.error(e.message); setError(e.message) }
  }
  const generateInvite = async () => {
    try {
      const { data, error } = await supabase.from('invites').insert({ code: makeInviteCode(), created_by: session.user.id }).select().single()
      if (error) throw error
      setInvites((prev) => [data, ...prev])
    } catch (e) { setError(e.message) }
  }
  const deleteInvite = async (code) => {
    try {
      const { error } = await supabase.from('invites').delete().eq('code', code)
      if (error) throw error
      setInvites((prev) => prev.filter((i) => i.code !== code))
    } catch (e) { setError(e.message) }
  }
  const copyInvite = async (code) => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/?invite=${code}`); toast.success('Invite link copied') } catch { /* clipboard blocked */ }
  }
  const saveAnnouncement = async (active) => {
    try {
      const next = { announcement_text: annDraft.trim(), announcement_active: active }
      const { error } = await supabase.from('app_settings').upsert({ id: 1, ...next }, { onConflict: 'id' })
      if (error) throw error
      setAnnouncement({ text: next.announcement_text, active })
      toast.success(active ? 'Banner is live' : 'Banner saved')
    } catch (e) { setError(e.message) }
  }
  const saveFlags = async (next) => {
    try {
      const { error } = await supabase.from('app_settings').upsert({ id: 1, feature_flags: next }, { onConflict: 'id' })
      if (error) throw error
      setFlags(next)
      toast.success('Saved')
    } catch (e) { setError(e.message) }
  }
  const toggleFlag = (key) => {
    if (key === 'paywall' && !flags.paywall && !window.confirm('Turn the paywall on? Every non-admin user will need an active $15/month subscription to get into LIMITLESS.')) return
    if (key === 'paywall' && flags.paywall && !window.confirm('Turn the paywall off? New sign ups will go back to waiting for your approval.')) return
    saveFlags({ ...flags, [key]: !flags[key] })
  }
  const saveNote = async (id, note) => {
    try {
      const { error } = await supabase.from('profiles').update({ notes: note || null }).eq('id', id)
      if (error) throw error
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, notes: note || null } : u)))
      return true
    } catch (e) { setError(e.message); return false }
  }
  const bulkApprove = async () => {
    const ids = d.users.filter((u) => { const s = u.status || 'pending'; return s === 'pending' || s === 'waitlist' }).map((u) => u.id)
    if (ids.length === 0) return
    if (!window.confirm(`Approve all ${ids.length} waiting ${ids.length === 1 ? 'user' : 'users'}? They'll get full access.`)) return
    try {
      const { error } = await supabase.from('profiles').update({ status: 'approved' }).in('id', ids)
      if (error) throw error
      setUsers((prev) => prev.map((u) => (ids.includes(u.id) ? { ...u, status: 'approved' } : u)))
      ids.forEach(sendApprovalEmail)
    } catch (e) { setError(e.message) }
  }
  const updateTicketStatus = async (id, status) => {
    try {
      const { error } = await supabase.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
    } catch (e) { setError(e.message) }
  }
  const replyTicket = async (ticket, reply) => {
    if (!reply || !reply.trim()) return false
    try {
      const res = await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: ticket.email, subject: `Re: ${ticket.subject}`, message: reply.trim() }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      await supabase.from('support_tickets').update({ admin_reply: reply.trim(), status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', ticket.id)
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, admin_reply: reply.trim(), status: 'in_progress' } : t)))
      toast.success('Reply sent')
      return true
    } catch (e) { toast.error(e.message); setError(e.message); return false }
  }
  const sendEmail = async (ids, subject, message) => {
    const recipients = d.users.filter((u) => ids.has(u.id) && u.email).map((u) => u.email)
    if (recipients.length === 0) throw new Error('No selected users have email addresses')
    const res = await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: recipients, subject: subject.trim(), message: message.trim() }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
    return data
  }
  const exportCSV = () => {
    const by = new Map()
    d.trades.forEach((t) => by.set(t.user_id, (by.get(t.user_id) || 0) + 1))
    const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
    const rows = d.users.map((u) => [[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '', u.email || '', u.status || 'pending', u.created_at || '', by.get(u.id) || 0])
    const csv = [['name', 'email', 'status', 'signup_date', 'trade_count'], ...rows].map((r) => r.map(esc).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url; a.download = `limitless-users-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  return { ...d, announcement, annDraft, setAnnDraft, flags, error, setError, load, updateStatus, deleteUser, sendPasswordReset, generateInvite, deleteInvite, copyInvite, saveAnnouncement, toggleFlag, saveNote, bulkApprove, updateTicketStatus, replyTicket, sendEmail, exportCSV }
}

// ── Live: who is on the website and in the journal right now ──
function LiveTab({ A, byHash }) {
  const [events, setEvents] = React.useState([])
  const seen = React.useRef(new Map())
  const mounted = React.useRef(0)
  React.useEffect(() => { mounted.current = Date.now() }, [])
  const liveRef = React.useRef({})
  const [, tick] = React.useState(0)
  React.useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 5000); return () => clearInterval(t) }, [])

  const who = React.useCallback((m) => {
    if (m.k === 'app' && m.u && byHash.current.get(m.u)) return nameOf(byHash.current.get(m.u))
    if (m.k === 'app' && (m.p === 'signup' || m.p === 'login')) return 'Someone'
    const bits = ['A visitor', place(m.z) && 'in ' + place(m.z)].filter(Boolean)
    return bits.join(' ')
  }, [byHash])

  const onEvent = React.useCallback((type, key, metas) => {
    const m = metas && metas[metas.length - 1]
    if (!m) return
    const initial = !mounted.current || Date.now() - mounted.current < 2500
    if (type === 'join') {
      const prev = seen.current.get(key)
      seen.current.set(key, m)
      if (initial || m.a) return
      const where = (m.k === 'site' ? 'the website: ' : 'the journal: ') + pageLabel(m.k, m.p)
      const text = prev
        ? prev.p === m.p ? null : `${who(m)} moved to ${pageLabel(m.k, m.p)}`
        : `${who(m)} opened ${where}${m.r ? ' (from ' + m.r + ')' : ''}`
      if (text) setEvents((e) => [{ id: key + Date.now(), ts: Date.now(), text, kind: 'live' }, ...e].slice(0, 60))
    } else {
      setTimeout(() => {
        if (liveRef.current[key]) return
        seen.current.delete(key)
        if (initial || m.a) return
        setEvents((e) => [{ id: key + 'x' + Date.now(), ts: Date.now(), text: `${who(m)} left ${m.k === 'site' ? 'the website' : 'the journal'}`, kind: 'live' }, ...e].slice(0, 60))
      }, 2000)
    }
  }, [who])

  const live = useLiveState(onEvent)
  React.useEffect(() => { liveRef.current = live }, [live])
  const all = Object.entries(live).map(([key, metas]) => ({ key, ...(metas[metas.length - 1] || {}) }))
  const people = all.filter((m) => !m.a)
  const site = people.filter((m) => m.k === 'site')
  const auth = people.filter((m) => m.k === 'app' && (m.p === 'signup' || m.p === 'login'))
  const pay = people.filter((m) => m.k === 'app' && m.p === 'pay')
  const app = people.filter((m) => m.k === 'app' && !['signup', 'login', 'pay'].includes(m.p))
  const me = all.filter((m) => m.a).length

  // the same trader in two tabs counts once
  const traders = (() => {
    const g = new Map()
    app.forEach((m) => { const k = m.u || m.key; const cur = g.get(k); if (!cur || (m.s || 0) < (cur.s || 0)) g.set(k, m) })
    return [...g.values()].sort((a, b) => (a.s || 0) - (b.s || 0))
  })()
  const sitePages = (() => {
    const c = new Map()
    site.forEach((m) => { const l = pageLabel('site', m.p); c.set(l, (c.get(l) || 0) + 1) })
    return [...c.entries()].sort((a, b) => b[1] - a[1])
  })()

  // today, from the data that already exists
  const signupsToday = A.users.filter((u) => isToday(u.created_at))
  const paidToday = A.subs.filter((s) => hasPaidAccess(s) && (isToday(s.created_at) || isToday(s.updated_at)))
  const checkoutToday = A.subs.filter((s) => s.status === 'incomplete' && isToday(s.created_at))
  const tradesToday = A.trades.filter((t) => isToday(t.created_at))
  const userById = new Map(A.users.map((u) => [u.id, u]))
  const dataFeed = [
    ...signupsToday.map((u) => ({ id: 's' + u.id, ts: new Date(u.created_at).getTime(), text: `${nameOf(u)} created an account`, kind: 'signup' })),
    ...paidToday.map((s) => ({ id: 'p' + s.user_id, ts: new Date(s.updated_at || s.created_at).getTime(), text: `${nameOf(userById.get(s.user_id))} paid for ${s.plan === 'pro' ? 'Pro' : 'Lite'}`, kind: 'paid' })),
    ...checkoutToday.map((s) => ({ id: 'c' + s.user_id, ts: new Date(s.created_at).getTime(), text: `${nameOf(userById.get(s.user_id))} started checkout`, kind: 'checkout' })),
    ...tradesToday.slice(0, 40).map((t) => ({ id: 't' + t.id, ts: new Date(t.created_at).getTime(), text: `${nameOf(userById.get(t.user_id))} logged a trade${t.symbol ? ' on ' + t.symbol : ''}`, kind: 'trade' })),
  ]
  const feed = [...events, ...dataFeed].sort((a, b) => b.ts - a.ts).slice(0, 50)

  const Row = ({ m, name, sub }) => (
    <div className="adm-live-row">
      <span className="adm-live-ic">{m.d === 'm' ? <Smartphone size={15} /> : <Monitor size={15} />}</span>
      <span className="adm-live-main"><b>{name}</b><small>{sub}</small></span>
      <span className="adm-live-time">{since(m.s)}</span>
    </div>
  )

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="adm-stats">
        <Stat live n={people.length} l="Live right now" sub={me ? 'Not counting you' : ''} />
        <Stat n={site.length} l="On the website" />
        <Stat n={traders.length} l="In the journal" />
        <Stat n={auth.length + pay.length} l="Signing up or paying" sub={`${auth.length} on sign up · ${pay.length} on the pay screen`} />
      </div>

      <div className="grid g2 adm-g2">
        <section className="glass panel" aria-label="Website">
          <div className="panel-head"><h2><Globe size={16} /> Website</h2><span className="faint">{site.length} live</span></div>
          {site.length === 0 ? <p className="faint adm-empty">Nobody on limitless-journal.com right now.</p> : (
            <>
              <div className="adm-pages">
                {sitePages.map(([l, n]) => (
                  <div key={l} className="adm-page"><span>{l}</span><i style={{ width: `${(n / site.length) * 100}%` }} /><b>{n}</b></div>
                ))}
              </div>
              <div className="adm-live-list">
                {site.sort((a, b) => (a.s || 0) - (b.s || 0)).map((m) => (
                  <Row key={m.key} m={m} name={pageLabel('site', m.p)} sub={[place(m.z), m.r ? 'from ' + m.r : 'direct'].filter(Boolean).join(' · ')} />
                ))}
              </div>
            </>
          )}
        </section>

        <section className="glass panel" aria-label="Journal">
          <div className="panel-head"><h2><Activity size={16} /> Journal</h2><span className="faint">{traders.length + auth.length + pay.length} live</span></div>
          {traders.length + auth.length + pay.length === 0 ? <p className="faint adm-empty">Nobody in the journal right now.</p> : (
            <div className="adm-live-list">
              {pay.map((m) => <Row key={m.key} m={m} name={who(m)} sub={'On the pay screen' + (place(m.z) ? ' · ' + place(m.z) : '')} />)}
              {auth.map((m) => <Row key={m.key} m={m} name={m.p === 'signup' ? 'Creating an account' : 'Signing in'} sub={place(m.z) || 'Sign in screen'} />)}
              {traders.map((m) => <Row key={m.key} m={m} name={who(m)} sub={pageLabel('app', m.p) + (place(m.z) ? ' · ' + place(m.z) : '')} />)}
            </div>
          )}
        </section>
      </div>

      <div className="adm-stats">
        <Stat n={signupsToday.length} l="Sign ups today" />
        <Stat n={paidToday.length} l="Payments today" />
        <Stat n={checkoutToday.length} l="Started checkout, not paid" />
        <Stat n={tradesToday.length} l="Trades logged today" />
      </div>

      <section className="glass panel" aria-label="Live feed">
        <div className="panel-head"><h2><Radio size={16} /> Live feed</h2><span className="faint">Since midnight · updates as it happens</span></div>
        {feed.length === 0 ? <p className="faint adm-empty">Nothing yet today. New visits, sign ups and payments show up here.</p> : (
          <div className="adm-feed">
            {feed.map((e) => (
              <div key={e.id} className={'adm-feed-row k-' + e.kind}>
                <i />
                <span>{e.text}</span>
                <small>{ago(e.ts)}</small>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

const FLAG_LIST = [
  { key: 'paywall', label: 'Paywall', desc: 'Everyone must subscribe ($15/mo Lite). Admins and founding beta exempt.', Icon: CreditCard },
  { key: 'monthlyGoalTracker', label: 'Monthly goal tracker', desc: 'Dashboard widget for income progress', Icon: Target },
  { key: 'aiChecklist', label: 'AI checklist', desc: 'Generate a checklist from the trading rules', Icon: Sparkles },
  { key: 'newsCalendar', label: 'News calendar', desc: 'Economic events page and menu entry', Icon: CalendarDays },
  { key: 'feedSection', label: 'Recent trades feed', desc: 'Recent trades on the dashboard', Icon: BookOpen },
]

function OverviewTab({ A, paying, go }) {
  const { users, trades, tickets, flags } = A
  const pending = users.filter((u) => u.status === 'pending').length
  const approved = users.filter((u) => u.status === 'approved').length
  const totalPnl = trades.reduce((s, t) => s + (Number(t.pnl) || 0), 0)
  const byUser = new Map()
  trades.forEach((t) => byUser.set(t.user_id, (byUser.get(t.user_id) || 0) + 1))
  let best = null
  for (const [uid, c] of byUser) if (!best || c > best.c) best = { uid, c }
  const userById = new Map(users.map((u) => [u.id, u]))
  const growth = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i)
    const next = new Date(d); next.setDate(d.getDate() + 1)
    growth.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: users.filter((u) => u.created_at && new Date(u.created_at) >= d && new Date(u.created_at) < next).length })
  }
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const activity = [
    ...users.map((u) => ({ ts: u.created_at, text: `New sign up: ${nameOf(u)}` })),
    ...trades.map((t) => ({ ts: t.created_at || t.trade_date, text: `Trade logged by ${nameOf(userById.get(t.user_id))}` })),
  ].filter((a) => a.ts).sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 12)

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="adm-stats">
        <Stat n={users.length.toLocaleString()} l="Total users" />
        <Stat n={paying.length} l="Paying" sub={`About $${(paying.length * 15).toLocaleString()} a month`} />
        <Stat n={A.beta.length} l="Founding beta" sub="Free for life" />
        <Stat n={pending} l={flags.paywall ? 'Signed up, not paid' : 'Waiting for approval'} />
        <Stat n={approved} l="Approved" />
        <Stat n={trades.length.toLocaleString()} l="Trades logged" />
      </div>

      <div className="adm-stats">
        <Stat n={usd(totalPnl)} l="Total P&L logged" />
        <Stat n={(users.length ? trades.length / users.length : 0).toFixed(1)} l="Trades per user" />
        <Stat n={best ? nameOf(userById.get(best.uid)) : '—'} l={best ? `Most active · ${best.c} trades` : 'Most active'} />
        <Stat n={users.filter((u) => u.created_at && new Date(u.created_at) >= weekAgo).length} l="Sign ups this week" />
      </div>

      <section className="glass panel" aria-label="Sign ups">
        <div className="panel-head"><h2>Sign ups, last 30 days</h2><span className="faint">{growth.reduce((s, g) => s + g.count, 0)} total</span></div>
        <Bars data={growth} />
      </section>

      <div className="grid g2 adm-g2">
        <section className="glass panel" aria-label="Recent sign ups">
          <div className="panel-head"><h2>Recent sign ups</h2><button type="button" className="btn btn-ghost btn-sm" onClick={() => go('users')}>All users</button></div>
          <div className="adm-mini">
            {users.slice(0, 6).map((u) => (
              <div key={u.id} className="adm-mini-row">
                <Avatar u={u} size={30} />
                <span className="adm-live-main"><b>{nameOf(u)}</b><small>{u.email || '—'}</small></span>
                <small className="faint">{ago(u.created_at)}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="glass panel" aria-label="Activity">
          <div className="panel-head"><h2>Activity</h2><span className="faint">Sign ups and trades</span></div>
          <div className="adm-feed">
            {activity.length === 0 ? <p className="faint adm-empty">No activity yet.</p> : activity.map((a, i) => (
              <div key={i} className="adm-feed-row"><i /><span>{a.text}</span><small>{ago(a.ts)}</small></div>
            ))}
          </div>
          <div className="adm-kv">
            <span>Open tickets</span><b>{tickets.filter((t) => t.status === 'open').length}</b>
            <span>Last sign up</span><b>{users[0] ? ago(users[0].created_at) : '—'}</b>
          </div>
        </section>
      </div>

      <section className="glass panel" aria-label="Feature flags">
        <div className="panel-head"><h2>Feature flags</h2><span className="faint">Applies to every trader</span></div>
        <div className="adm-flags">
          {FLAG_LIST.map((f) => <Toggle key={f.key} on={!!flags[f.key]} onClick={() => A.toggleFlag(f.key)} label={f.label} desc={f.desc} Icon={f.Icon} />)}
        </div>
      </section>

      <section className="glass panel" aria-label="Announcement banner">
        <div className="panel-head"><h2><Megaphone size={16} /> Announcement banner</h2>{A.announcement.active && <span className="tag tag-solid">Live</span>}</div>
        <Toggle on={A.announcement.active} onClick={() => A.saveAnnouncement(!A.announcement.active)} label={A.announcement.active ? 'Showing to every trader' : 'Hidden'} desc="Turn the banner on or off" />
        <label className="field"><span>Banner text</span><input className="input" value={A.annDraft} onChange={(e) => A.setAnnDraft(e.target.value)} placeholder="New: CSV import is here" /></label>
        <div className="well adm-preview">{A.annDraft.trim() || 'The banner preview shows here'}</div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-primary btn-sm" disabled={!A.annDraft.trim()} onClick={() => A.saveAnnouncement(A.announcement.active)}>Save text</button>
        </div>
      </section>
    </div>
  )
}

function statusTag(u, paywall) {
  const s = u.status || 'pending'
  const label = s === 'approved' ? 'Approved' : s === 'rejected' ? 'Rejected' : s === 'banned' ? 'Banned' : paywall ? 'Not paid yet' : s === 'waitlist' ? 'Waitlist' : 'Pending'
  return <span className={'tag ' + (s === 'approved' ? 'tag-solid' : 'tag-soft') + ' adm-st-' + s}>{label}</span>
}

function NoteBox({ u, A, placeholder = 'Private note about this trader' }) {
  const [edit, setEdit] = React.useState(false)
  const [draft, setDraft] = React.useState(u.notes || '')
  if (!edit) return <button type="button" className="adm-note" onClick={() => { setDraft(u.notes || ''); setEdit(true) }}>{u.notes ? u.notes : '+ Add a private note'}</button>
  return (
    <div className="col" style={{ gap: 8 }}>
      <textarea className="input adm-ta" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} rows={3} />
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={async () => { if (await A.saveNote(u.id, draft)) setEdit(false) }}>Save</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(false)}>Cancel</button>
      </div>
    </div>
  )
}

function UserDetail({ u, A, plan }) {
  const mine = A.trades.filter((t) => t.user_id === u.id)
  const wins = mine.filter((t) => (Number(t.pnl) || 0) > 0).length
  const pnl = mine.reduce((s, t) => s + (Number(t.pnl) || 0), 0)
  const last = mine.reduce((acc, t) => { const d = t.trade_date || t.created_at; return !acc || (d && new Date(d) > new Date(acc)) ? d : acc }, null)
  const sym = {}
  mine.forEach((t) => { if (t.symbol) sym[t.symbol] = (sym[t.symbol] || 0) + 1 })
  const top = Object.entries(sym).sort((a, b) => b[1] - a[1])[0]?.[0]
  const age = (() => { if (!u.created_at) return '—'; const d = Math.floor((Date.now() - new Date(u.created_at)) / 86400000); return d < 1 ? 'Today' : d < 30 ? d + 'd' : d < 365 ? Math.floor(d / 30) + 'mo' : (d / 365).toFixed(1) + 'y' })()
  return (
    <div className="adm-detail">
      <div className="adm-dgrid">
        {[['Trades', mine.length], ['Win rate', mine.length ? Math.round((wins / mine.length) * 100) + '%' : '—'], ['Total P&L', mine.length ? usd(pnl) : '—'], ['Last trade', last ? fmtDate(last) : 'Never'], ['Top symbol', top || '—'], ['Account age', age], ['Plan', plan], ['Signed up', fmtDate(u.created_at)]].map(([l, v]) => (
          <div key={l} className="well adm-dcell"><small>{l}</small><b>{v}</b></div>
        ))}
      </div>
      <div className="adm-kv">
        <span>Email</span><b>{u.email || '—'}</b>
        <span>Phone</span><b>{u.phone || '—'}</b>
        <span>Market focus</span><b>{u.market_focus || '—'}</b>
        <span>Monthly goal</span><b>{u.monthly_goal ? '$' + Number(u.monthly_goal).toLocaleString() : '—'}</b>
        <span>User ID</span><b className="adm-mono">{u.id}</b>
      </div>
      <NoteBox u={u} A={A} />
      <div className="row adm-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => A.sendPasswordReset(u.email)} disabled={!u.email}>Send password reset</button>
        {['approved', 'pending', 'rejected'].filter((s) => s !== (u.status || 'pending')).map((s) => (
          <button key={s} type="button" className="btn btn-ghost btn-sm" onClick={() => A.updateStatus(u.id, s)}>Set {s}</button>
        ))}
      </div>
    </div>
  )
}

function UsersTab({ A, planOf, onView, onEmailUser, isSuper }) {
  const { users, trades, flags } = A
  const [filter, setFilter] = React.useState('all')
  const [q, setQ] = React.useState('')
  const [open, setOpen] = React.useState(null)
  const [sel, setSel] = React.useState(new Set())
  const [mail, setMail] = React.useState(false)
  const counts = { all: users.length }
  users.forEach((u) => { const s = u.status || 'pending'; counts[s] = (counts[s] || 0) + 1 })
  const tc = new Map()
  trades.forEach((t) => tc.set(t.user_id, (tc.get(t.user_id) || 0) + 1))
  const term = q.trim().toLowerCase()
  const list = users.filter((u) => {
    if (filter === 'paid' ? planOf(u.id) !== 'Paid' : filter !== 'all' && (u.status || 'pending') !== filter) return false
    if (term && !`${u.first_name || ''} ${u.last_name || ''} ${u.username || ''} ${u.email || ''}`.toLowerCase().includes(term)) return false
    return true
  })
  const paidCount = users.filter((u) => planOf(u.id) === 'Paid').length
  const filters = [
    ['all', 'All', counts.all], ['paid', 'Paying', paidCount], ['pending', flags.paywall ? 'Not paid' : 'Pending', counts.pending || 0], ['approved', 'Approved', counts.approved || 0],
    ['waitlist', 'Waitlist', counts.waitlist || 0], ['rejected', 'Rejected', counts.rejected || 0], ['banned', 'Banned', counts.banned || 0],
  ]
  const toggle = (id) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allOn = list.length > 0 && list.every((u) => sel.has(u.id))

  return (
    <div className="col" style={{ gap: 16 }}>
      <section className="glass panel" aria-label="Invite links">
        <div className="panel-head"><h2><Link2 size={16} /> Invite links</h2><button type="button" className="btn btn-primary btn-sm" onClick={A.generateInvite}><Plus size={14} /> New invite link</button></div>
        <span className="faint" style={{ fontSize: 12.5 }}>{flags.paywall ? 'With the paywall on, an invite only skips approval. Traders still need to pay unless they are founding beta.' : 'People who sign up with an invite are approved straight away.'}</span>
        {A.invites.length === 0 ? <p className="faint adm-empty">No invite links yet.</p> : (
          <div className="adm-mini">
            {A.invites.slice(0, 8).map((inv) => {
              const usedBy = inv.used_by ? users.find((u) => u.id === inv.used_by) : null
              return (
                <div key={inv.code} className="adm-mini-row">
                  <code className="adm-code">{inv.code}</code>
                  <small className="faint" style={{ flex: 1, minWidth: 0 }}>{inv.used_at ? `Used by ${usedBy ? usedBy.email || nameOf(usedBy) : 'someone'} · ${ago(inv.used_at)}` : `Created ${ago(inv.created_at)}`}</small>
                  {!inv.used_at && <button type="button" className="sk-ibtn" aria-label="Copy invite link" onClick={() => A.copyInvite(inv.code)}><Copy size={14} /></button>}
                  <button type="button" className="sk-ibtn" aria-label="Delete invite" onClick={() => A.deleteInvite(inv.code)}><Trash2 size={14} /></button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="adm-chips" role="group" aria-label="Filter users">
        {filters.map(([id, l, n]) => (
          <button key={id} type="button" className={'adm-chip' + (filter === id ? ' on' : '')} onClick={() => setFilter(id)}>{l}<span>{n}</span></button>
        ))}
      </div>
      <div className="row adm-toolbar">
        <label className="adm-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" aria-label="Search users" />{q && <button type="button" onClick={() => setQ('')} aria-label="Clear search"><X size={14} /></button>}</label>
        {sel.size > 0 && <button type="button" className="btn btn-primary btn-sm" onClick={() => setMail(true)}><Mail size={14} /> Email {sel.size}</button>}
        <button type="button" className="btn btn-ghost btn-sm" onClick={A.exportCSV}><Download size={14} /> Export CSV</button>
      </div>

      <section className="glass panel adm-users" aria-label="Users">
        <div className="adm-urow adm-uhead">
          <input type="checkbox" checked={allOn} onChange={(e) => setSel(e.target.checked ? new Set(list.map((u) => u.id)) : new Set())} aria-label="Select all" />
          <span>Trader</span><span className="adm-hide">Signed up</span><span>Status</span><span className="adm-hide">Plan</span><span className="adm-hide">Trades</span><span />
        </div>
        {!A.loaded ? <p className="faint adm-empty">Loading…</p> : list.length === 0 ? <p className="faint adm-empty">{q ? 'No one matches that search.' : 'No users in this group.'}</p> : list.map((u) => {
          const isOpen = open === u.id
          const s = u.status || 'pending'
          return (
            <div key={u.id} className={'adm-user' + (isOpen ? ' open' : '')}>
              <div className="adm-urow" onClick={() => setOpen(isOpen ? null : u.id)}>
                <input type="checkbox" checked={sel.has(u.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggle(u.id)} aria-label={'Select ' + nameOf(u)} />
                <span className="adm-who">
                  <Avatar u={u} />
                  <span className="adm-live-main">
                    <b>{isSuper ? <button type="button" className="adm-link" onClick={(e) => { e.stopPropagation(); onEmailUser(u) }} title="Email history">{nameOf(u)}</button> : nameOf(u)}</b>
                    <small>{u.email || '—'}</small>
                  </span>
                </span>
                <span className="adm-hide faint">{fmtDate(u.created_at)}</span>
                <span>{statusTag(u, flags.paywall)}</span>
                <span className="adm-hide"><span className={'tag ' + (planOf(u.id) === 'Paid' ? 'tag-solid' : 'tag-soft')}>{planOf(u.id)}</span></span>
                <span className="adm-hide">{tc.get(u.id) || 0}</span>
                <span className="adm-uacts" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="sk-ibtn" title="View their journal (read only)" aria-label="View their journal" onClick={() => onView && onView(u)}><Eye size={14} /></button>
                  {s !== 'approved' && s !== 'banned' && !flags.paywall && <button type="button" className="btn btn-primary btn-sm" onClick={() => A.updateStatus(u.id, 'approved')}>Approve</button>}
                  {s !== 'rejected' && s !== 'banned' && <button type="button" className="btn btn-ghost btn-sm" onClick={() => A.updateStatus(u.id, 'rejected')}>Reject</button>}
                  {s === 'banned'
                    ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => A.updateStatus(u.id, 'approved')}>Unban</button>
                    : <button type="button" className="sk-ibtn" title="Ban" aria-label="Ban" onClick={() => { if (window.confirm('Ban this user? They will be locked out until unbanned.')) A.updateStatus(u.id, 'banned') }}><Ban size={14} /></button>}
                  <button type="button" className="sk-ibtn" title="Delete" aria-label="Delete" onClick={() => A.deleteUser(u.id)}><Trash2 size={14} /></button>
                  <ChevronDown size={16} className="adm-chev" />
                </span>
              </div>
              {isOpen && <UserDetail u={u} A={A} plan={planOf(u.id)} />}
            </div>
          )
        })}
      </section>

      <EmailModal open={mail} onClose={() => setMail(false)} ids={sel} A={A} onSent={() => setSel(new Set())} />
    </div>
  )
}

function EmailModal({ open, onClose, ids, A, onSent }) {
  const [subj, setSubj] = React.useState('')
  const [body, setBody] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [res, setRes] = React.useState(null)
  const send = async () => {
    setBusy(true); setRes(null)
    try {
      const data = await A.sendEmail(ids, subj, body)
      setRes({ ok: true, text: `Sent ${data.sent}/${data.total}${data.failed?.length ? ` · ${data.failed.length} failed` : ''}` })
      if (data.sent > 0 && (!data.failed || data.failed.length === 0)) setTimeout(() => { onClose(); setSubj(''); setBody(''); setRes(null); onSent && onSent() }, 1400)
    } catch (e) { setRes({ ok: false, text: e.message }) }
    setBusy(false)
  }
  return (
    <Modal open={open} onClose={() => !busy && onClose()} label="Email users" maxWidth={560}>
      <div className="col" style={{ gap: 14, padding: 4 }}>
        <div className="col" style={{ gap: 2 }}><span className="eyebrow">Email</span><h2 style={{ margin: 0, fontSize: 22 }}>{ids.size} {ids.size === 1 ? 'trader' : 'traders'}</h2><small className="faint">Sent with Resend from your domain</small></div>
        <label className="field"><span>Subject</span><input className="input" value={subj} onChange={(e) => setSubj(e.target.value)} placeholder="An update from LIMITLESS" /></label>
        <label className="field"><span>Message</span><textarea className="input adm-ta" rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Line breaks are kept." /></label>
        {res && <p role="status" className={res.ok ? 'muted' : ''} style={{ margin: 0, fontSize: 13 }}>{res.text}</p>}
        <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={send} disabled={busy || !subj.trim() || !body.trim()}><Send size={14} /> {busy ? 'Sending…' : 'Send'}</button>
        </div>
      </div>
    </Modal>
  )
}

function WaitlistTab({ A }) {
  const [sort, setSort] = React.useState('date')
  const all = A.users.filter((u) => { const s = u.status || ''; return s === 'waitlist' || s === 'pending' })
  const list = [...all].sort((a, b) => sort === 'name' ? (a.first_name || a.username || a.email || '').toLowerCase().localeCompare((b.first_name || b.username || b.email || '').toLowerCase()) : new Date(b.created_at || 0) - new Date(a.created_at || 0))
  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="row adm-toolbar">
        <b style={{ fontSize: 15 }}>{all.length} {all.length === 1 ? 'person' : 'people'} {A.flags.paywall ? 'signed up, not paid yet' : 'waiting'}</b>
        <select className="input adm-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort"><option value="date">Newest first</option><option value="name">By name</option></select>
        {!A.flags.paywall && <button type="button" className="btn btn-primary btn-sm" disabled={all.length === 0} onClick={A.bulkApprove}><Check size={14} /> Approve all</button>}
      </div>
      {A.flags.paywall && <div className="well adm-preview">The paywall is on, so nobody needs approving. These traders get in as soon as they pay.</div>}
      {list.length === 0 ? <section className="glass panel"><p className="faint adm-empty">Nobody waiting. All clear.</p></section> : list.map((u) => (
        <section key={u.id} className="glass panel adm-wait">
          <div className="adm-mini-row">
            <Avatar u={u} />
            <span className="adm-live-main"><b>{nameOf(u)}</b><small>{u.email || '—'} · signed up {ago(u.created_at)}</small></span>
            {!A.flags.paywall && <button type="button" className="btn btn-primary btn-sm" onClick={() => A.updateStatus(u.id, 'approved')}>Approve</button>}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => A.updateStatus(u.id, 'rejected')}>Reject</button>
          </div>
          <NoteBox u={u} A={A} />
        </section>
      ))}
    </div>
  )
}

function TicketsTab({ A }) {
  const [reply, setReply] = React.useState({})
  if (A.tickets.length === 0) return <section className="glass panel"><p className="faint adm-empty">No support tickets. New ones from traders show up here.</p></section>
  return (
    <div className="col" style={{ gap: 14 }}>
      {A.tickets.map((t) => {
        const label = t.status === 'resolved' ? 'Resolved' : t.status === 'in_progress' ? 'In progress' : 'Open'
        const draft = reply[t.id]
        return (
          <section key={t.id} className="glass panel adm-ticket">
            <div className="panel-head" style={{ alignItems: 'flex-start' }}>
              <div className="col" style={{ gap: 2, minWidth: 0 }}><h2 style={{ fontSize: 16 }}>{t.subject}</h2><small className="faint">{t.email} · {ago(t.created_at)}</small></div>
              <span className={'tag ' + (t.status === 'open' ? 'tag-solid' : 'tag-soft')}>{label}</span>
            </div>
            <p className="adm-msg">{t.message}</p>
            {t.admin_reply && <div className="well adm-preview"><small className="faint">Your reply</small><br />{t.admin_reply}</div>}
            {draft !== undefined && (
              <div className="col" style={{ gap: 8 }}>
                <textarea className="input adm-ta" rows={4} autoFocus value={draft} onChange={(e) => setReply((r) => ({ ...r, [t.id]: e.target.value }))} placeholder={`Reply to ${t.email}`} />
                <div className="row" style={{ gap: 8 }}>
                  <button type="button" className="btn btn-primary btn-sm" disabled={!draft.trim()} onClick={async () => { if (await A.replyTicket(t, draft)) setReply((r) => { const n = { ...r }; delete n[t.id]; return n }) }}><Send size={14} /> Send reply</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReply((r) => { const n = { ...r }; delete n[t.id]; return n })}>Cancel</button>
                </div>
              </div>
            )}
            <div className="row adm-actions">
              {draft === undefined && <button type="button" className="btn btn-primary btn-sm" onClick={() => setReply((r) => ({ ...r, [t.id]: '' }))}><Mail size={14} /> Reply</button>}
              {['open', 'in_progress', 'resolved'].filter((s) => s !== t.status).map((s) => (
                <button key={s} type="button" className="btn btn-ghost btn-sm" onClick={() => A.updateTicketStatus(t.id, s)}>Mark {s.replace('_', ' ')}</button>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function HealthTab({ A }) {
  const total = A.users.length + A.trades.length + A.invites.length + A.tickets.length
  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="adm-stats">
        <Stat live={A.ok === true} n={A.ok === null ? 'Checking' : A.ok ? 'Connected' : 'Error'} l="Database" sub={A.checkedAt ? 'Checked ' + ago(A.checkedAt) : ''} />
        <Stat n={total.toLocaleString()} l="Records" sub={`${A.users.length} users · ${A.trades.length} trades · ${A.invites.length} invites · ${A.tickets.length} tickets`} />
        <Stat n={A.trades.filter((t) => isToday(t.created_at || t.trade_date)).length} l="Trades today" sub="Since midnight" />
        <Stat n={A.tickets.filter((t) => t.status === 'open').length} l="Open tickets" sub={A.users[0] ? 'Last sign up ' + ago(A.users[0].created_at) : ''} />
      </div>
      <div className="well adm-preview">Database size, backups and request rates are in the Supabase dashboard under Project Settings, Usage.</div>
    </div>
  )
}

const TYPE_LABEL = { approved: 'Approved welcome', weekly: 'Weekly report', daily_journaled: 'Daily (logged)', daily_not_journaled: 'Daily (no log)', signup_notification: 'Sign up notice' }
const typeLabel = (t) => TYPE_LABEL[t] || t || '—'

function EmailsTab({ A, focus, clearFocus }) {
  const { session } = useStore()
  const [sub, setSub] = React.useState(focus ? 'peruser' : 'overview')
  const [log, setLog] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [type, setType] = React.useState('approved')
  const [sel, setSel] = React.useState(new Set())
  const [bq, setBq] = React.useState('')
  const [uq, setUq] = React.useState('')
  const [user, setUser] = React.useState(focus || null)
  const [over, setOver] = React.useState('all')
  const [lt, setLt] = React.useState('all')
  const [ls, setLs] = React.useState('all')
  const [lq, setLq] = React.useState('')
  React.useEffect(() => { if (focus) { setUser(focus); setSub('peruser'); clearFocus && clearFocus() } }, [focus, clearFocus])

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('email_log').select('*').order('created_at', { ascending: false }).limit(500)
      if (error) throw error
      setLog(data || [])
    } catch (e) { A.setError(e.message) }
    setLoading(false)
  }, [A])
  React.useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (t, userIds) => {
    if (!userIds || userIds.length === 0) { toast.error('No users selected'); return }
    setSending(true)
    try {
      const { data: s } = await supabase.auth.getSession()
      const token = s?.session?.access_token || session?.access_token
      const res = await fetch('/api/admin-broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ type: t, userIds }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      toast.success(`Sent ${data.sent} · Skipped ${data.skipped} · Failed ${data.failed}`)
      if (data.failures?.length) toast.error(`Failed: ${data.failures.slice(0, 4).map((f) => f.email).join(', ')}${data.failures.length > 4 ? '…' : ''}`)
      setSel(new Set())
      load()
    } catch (e) { toast.error(`Send failed: ${e.message}`) }
    setSending(false)
  }

  const approvedList = A.users.filter((u) => (u.status || 'pending') === 'approved')
  const tc = new Map(); A.trades.forEach((t) => tc.set(t.user_id, (tc.get(t.user_id) || 0) + 1))
  const userById = new Map(A.users.map((u) => [u.id, u]))
  const sent = log.filter((r) => r.status === 'sent').length
  const opened = log.filter((r) => r.opened_at).length
  const clicked = log.filter((r) => r.clicked_at).length
  const days = []
  for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: 0 }) }
  const dm = new Map(days.map((d) => [d.key, d]))
  log.filter((r) => r.status === 'sent' && (over === 'all' || r.email_type === over)).forEach((r) => { const d = dm.get((r.created_at || '').slice(0, 10)); if (d) d.count++ })
  const match = (u, q) => !q.trim() || `${nameOf(u)} ${u.email || ''}`.toLowerCase().includes(q.trim().toLowerCase())
  const bList = approvedList.filter((u) => match(u, bq))
  const uList = approvedList.filter((u) => match(u, uq))
  const logList = log.filter((r) => {
    if (lt !== 'all' && r.email_type !== lt) return false
    if (ls !== 'all' && r.status !== ls) return false
    if (lq.trim()) { const u = userById.get(r.user_id); if (!`${r.recipient_email || ''} ${u ? nameOf(u) : ''}`.toLowerCase().includes(lq.trim().toLowerCase())) return false }
    return true
  })

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="adm-chips">
        {[['overview', 'Overview'], ['broadcast', 'Send'], ['peruser', 'Per trader'], ['log', 'Log']].map(([id, l]) => <button key={id} type="button" className={'adm-chip' + (sub === id ? ' on' : '')} onClick={() => setSub(id)}>{l}</button>)}
      </div>

      {sub === 'overview' && (
        <>
          <div className="adm-stats">
            <Stat n={sent} l="Sent" />
            <Stat n={log.filter((r) => r.delivered_at).length} l="Delivered" />
            <Stat n={(sent ? Math.round((opened / sent) * 100) : 0) + '%'} l="Open rate" />
            <Stat n={(sent ? Math.round((clicked / sent) * 100) : 0) + '%'} l="Click rate" />
            <Stat n={log.filter((r) => r.status === 'failed').length} l="Failed or bounced" />
          </div>
          <section className="glass panel">
            <div className="panel-head"><h2>Emails sent, last 30 days</h2>
              <div className="adm-chips">{[['all', 'All'], ['approved', 'Welcome'], ['weekly', 'Weekly']].map(([id, l]) => <button key={id} type="button" className={'adm-chip sm' + (over === id ? ' on' : '')} onClick={() => setOver(id)}>{l}</button>)}</div>
            </div>
            <Bars data={days} />
          </section>
        </>
      )}

      {sub === 'broadcast' && (
        <section className="glass panel">
          <div className="panel-head"><h2>Send an email</h2><span className="faint">{sel.size} selected</span></div>
          <div className="adm-chips">{[['approved', 'Approved welcome'], ['weekly', 'Weekly report']].map(([id, l]) => <button key={id} type="button" className={'adm-chip' + (type === id ? ' on' : '')} onClick={() => setType(id)}>{l}</button>)}</div>
          <div className="row adm-toolbar">
            <label className="adm-search"><Search size={15} /><input value={bq} onChange={(e) => setBq(e.target.value)} placeholder="Search approved traders" aria-label="Search recipients" /></label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSel(new Set(bList.map((u) => u.id)))}>Select all</button>
            {sel.size > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSel(new Set())}>Clear</button>}
          </div>
          <div className="adm-scroll">
            {bList.length === 0 ? <p className="faint adm-empty">No matching traders.</p> : bList.map((u) => (
              <label key={u.id} className="adm-mini-row adm-pick">
                <input type="checkbox" checked={sel.has(u.id)} onChange={() => setSel((p) => { const n = new Set(p); n.has(u.id) ? n.delete(u.id) : n.add(u.id); return n })} />
                <span className="adm-live-main"><b>{nameOf(u)}</b><small>{u.email || '—'}</small></span>
                <small className="faint">{tc.get(u.id) || 0} trades</small>
              </label>
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-primary btn-sm" disabled={sending || sel.size === 0} onClick={() => { const ids = [...sel]; if (window.confirm(`Send ${typeLabel(type)} to ${ids.length} trader${ids.length === 1 ? '' : 's'}?`)) run(type, ids) }}><Send size={14} /> {sending ? 'Sending…' : `Send to ${sel.size}`}</button>
          </div>
        </section>
      )}

      {sub === 'peruser' && (
        <div className="grid g2 adm-g2">
          <section className="glass panel">
            <label className="adm-search"><Search size={15} /><input value={uq} onChange={(e) => setUq(e.target.value)} placeholder="Search traders" aria-label="Search traders" /></label>
            <div className="adm-scroll">
              {uList.map((u) => {
                const last = log.find((r) => r.user_id === u.id)
                return (
                  <button key={u.id} type="button" className={'adm-mini-row adm-pick' + (user && user.id === u.id ? ' on' : '')} onClick={() => setUser(u)}>
                    <span className="adm-live-main"><b>{nameOf(u)}</b><small>{u.email || '—'} · {tc.get(u.id) || 0} trades</small></span>
                    {last && <small className="faint">{typeLabel(last.email_type)}</small>}
                  </button>
                )
              })}
            </div>
          </section>
          <section className="glass panel">
            {!user ? <p className="faint adm-empty">Pick a trader to see their email history.</p> : (() => {
              const hist = log.filter((r) => r.user_id === user.id)
              return (
                <>
                  <div className="col" style={{ gap: 2 }}><h2 style={{ margin: 0, fontSize: 18 }}>{nameOf(user)}</h2><small className="faint">{user.email || 'No email on file'}</small></div>
                  <div className="row adm-actions">
                    <button type="button" className="btn btn-ghost btn-sm" disabled={sending || !user.email} onClick={() => { if (window.confirm(`Send Approved welcome to ${nameOf(user)}?`)) run('approved', [user.id]) }}>Approved welcome</button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={sending || !user.email} onClick={() => { if (window.confirm(`Send Weekly report to ${nameOf(user)}? (Skipped if no trades this week.)`)) run('weekly', [user.id]) }}>Weekly report</button>
                  </div>
                  {hist.length === 0 ? <p className="faint adm-empty">No emails sent to this trader yet.</p> : (
                    <div className="adm-feed">
                      {hist.map((r) => (
                        <div key={r.id} className="adm-feed-row"><i /><span>{typeLabel(r.email_type)} · {r.status}{r.opened_at ? ` · opened${r.open_count > 1 ? ' ×' + r.open_count : ''}` : ''}{r.clicked_at ? ` · clicked${r.click_count > 1 ? ' ×' + r.click_count : ''}` : ''}</span><small>{fmtDate(r.created_at)}</small></div>
                      ))}
                    </div>
                  )}
                </>
              )
            })()}
          </section>
        </div>
      )}

      {sub === 'log' && (
        <section className="glass panel">
          <div className="row adm-toolbar">
            <span className="faint">{log.filter((r) => r.status === 'sent').length} sent · {log.filter((r) => r.status === 'skipped').length} skipped · {log.filter((r) => r.status === 'failed').length} failed</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /> Refresh</button>
          </div>
          <div className="row adm-toolbar">
            <select className="input adm-select" value={lt} onChange={(e) => setLt(e.target.value)} aria-label="Type"><option value="all">All types</option><option value="approved">Approved</option><option value="weekly">Weekly</option><option value="daily_journaled">Daily (logged)</option><option value="daily_not_journaled">Daily (no log)</option></select>
            <select className="input adm-select" value={ls} onChange={(e) => setLs(e.target.value)} aria-label="Status"><option value="all">All status</option><option value="sent">Sent</option><option value="skipped">Skipped</option><option value="failed">Failed</option></select>
            <label className="adm-search"><Search size={15} /><input value={lq} onChange={(e) => setLq(e.target.value)} placeholder="Name or email" aria-label="Search log" /></label>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr>{['Recipient', 'Type', 'Status', 'Opened', 'Clicked', 'Sent by', 'Date'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7}>Loading…</td></tr> : logList.length === 0 ? <tr><td colSpan={7}>No log entries.</td></tr> : logList.slice(0, 300).map((r) => {
                  const u = userById.get(r.user_id)
                  return (
                    <tr key={r.id}>
                      <td><b>{u ? nameOf(u) : '—'}</b><br /><small className="faint">{r.recipient_email || '—'}</small></td>
                      <td>{typeLabel(r.email_type)}</td>
                      <td><span className={'tag ' + (r.status === 'sent' ? 'tag-solid' : 'tag-soft')}>{r.status}</span></td>
                      <td>{r.opened_at ? <><Eye size={12} /> {fmtDate(r.opened_at)}{r.open_count > 1 ? ' ×' + r.open_count : ''}</> : '—'}</td>
                      <td>{r.clicked_at ? <><MousePointerClick size={12} /> {fmtDate(r.clicked_at)}{r.click_count > 1 ? ' ×' + r.click_count : ''}</> : '—'}</td>
                      <td>{r.sent_by === 'system' ? 'System' : r.sent_by}</td>
                      <td>{fmtDate(r.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

// ── the page ──
export default function AdminV4() {
  const { isSuperAdmin, onViewUser, user } = useStore()
  const A = useAdminData()
  const [tab, setTab] = React.useState(() => { try { return sessionStorage.getItem('ltj_adm_tab') || 'live' } catch { return 'live' } })
  const [emailFocus, setEmailFocus] = React.useState(null)
  const go = (t) => { setTab(t); try { sessionStorage.setItem('ltj_adm_tab', t) } catch { /* private mode */ } }
  const byHash = React.useRef(new Map())
  React.useEffect(() => {
    let dead = false
    Promise.all(A.users.map(async (u) => [await liveHash(u.id), u])).then((pairs) => { if (!dead) byHash.current = new Map(pairs.filter(([h]) => h)) })
    return () => { dead = true }
  }, [A.users])

  const subBy = new Map(A.subs.map((s) => [s.user_id, s]))
  const betaSet = new Set(A.beta.map((b) => b.user_id))
  const planOf = (id) => (hasPaidAccess(subBy.get(id)) ? 'Paid' : betaSet.has(id) ? 'Founding beta' : 'No plan')
  const paying = A.subs.filter((s) => hasPaidAccess(s) && s.user_id !== user.id)
  const waiting = A.users.filter((u) => { const s = u.status || ''; return s === 'waitlist' || s === 'pending' }).length
  const openTickets = A.tickets.filter((t) => t.status === 'open').length

  const tabs = [
    ['live', 'Live', Radio], ['overview', 'Overview', BarChart2], ['users', 'Users', Users],
    ['waitlist', A.flags.paywall ? 'Not paid' : 'Waitlist', Crown, waiting], ['tickets', 'Tickets', MessageSquare, openTickets],
    ...(isSuperAdmin ? [['emails', 'Emails', Mail]] : []), ['health', 'Health', Activity],
  ]
  const cur = tabs.some(([id]) => id === tab) ? tab : 'live'

  return (
    <AppShell route="admin" word="ADMIN" title="Admin">
      <div className="wrap col adm" style={{ gap: 16, paddingBottom: 60 }}>
        <div className="row adm-top">
          <nav className="adm-tabs" aria-label="Admin sections">
            {tabs.map(([id, l, Icon, badge]) => (
              <button key={id} type="button" className={cur === id ? 'on' : ''} aria-current={cur === id ? 'page' : undefined} onClick={() => go(id)}>
                <Icon size={15} />{l}{badge > 0 && <span className="adm-badge">{badge}</span>}
              </button>
            ))}
          </nav>
          <button type="button" className="btn btn-ghost btn-sm" onClick={A.load}><RefreshCw size={14} /> Refresh</button>
        </div>
        {A.error && <div className="well adm-err" role="alert">{A.error}<button type="button" className="sk-ibtn" aria-label="Dismiss" onClick={() => A.setError('')}><X size={14} /></button></div>}

        {cur === 'live' && <LiveTab A={A} byHash={byHash} />}
        {cur === 'overview' && <OverviewTab A={A} paying={paying} go={go} />}
        {cur === 'users' && <UsersTab A={A} planOf={planOf} onView={onViewUser} isSuper={isSuperAdmin} onEmailUser={(u) => { setEmailFocus(u); go('emails') }} />}
        {cur === 'waitlist' && <WaitlistTab A={A} />}
        {cur === 'tickets' && <TicketsTab A={A} />}
        {cur === 'emails' && isSuperAdmin && <EmailsTab A={A} focus={emailFocus} clearFocus={() => setEmailFocus(null)} />}
        {cur === 'health' && <HealthTab A={A} />}
      </div>
    </AppShell>
  )
}
