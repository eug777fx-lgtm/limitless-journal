import React from 'react'
import { CreditCard, RefreshCw, Download, Upload, LogOut, ClipboardList, Users, Newspaper, CalendarDays, Check, Lock, Send, Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import { useStore } from './store.jsx'
import { Seg, Modal, PnL } from './ui.jsx'
import { supabase } from '../lib/supabase'
import { money } from './data.js'
import { PLANS, startCheckout, openBillingPortal, syncSubscription, hasPaidAccess, fmtDate } from '../lib/billing'
import AppShell from './Shell.jsx'
import { ImportModal, exportCSV } from './Journal.jsx'

export function Billing() {
  const { subscription, setSubscription, isAdmin, paywallOn, notify } = useStore()
  const [busy, setBusy] = React.useState('')
  const [err, setErr] = React.useState('')
  const paid = hasPaidAccess(subscription)
  const run = async (key, fn) => {
    setErr(''); setBusy(key)
    try { await fn() } catch (e) { setErr(e.message) }
    setBusy('')
  }
  const refresh = () => run('sync', async () => { const s = await syncSubscription(); setSubscription && setSubscription(s); notify(hasPaidAccess(s) ? 'Subscription is active' : 'No active subscription found') })
  const ends = subscription?.current_period_end ? fmtDate(subscription.current_period_end) : ''
  const lite = PLANS.lite
  return (
    <AppShell route="billing" word="BILLING" title="Subscription">
      <div className="wrap col" style={{ gap: 18, paddingBottom: 60, maxWidth: 1000 }}>
        <section className="glass panel" style={{ padding: 28 }} aria-label="Current plan">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <div className="col" style={{ gap: 4 }}>
              <span className="eyebrow">Current plan</span>
              <span className="row display" style={{ gap: 10, alignItems: 'baseline' }}>
                <span style={{ fontSize: 34, fontWeight: 700 }}>{paid ? (PLANS[subscription.plan] || lite).name : isAdmin ? 'Admin' : paywallOn ? 'No plan' : 'Free beta'}</span>
                {paid && <span className="muted" style={{ fontSize: 15 }}>$15 / month</span>}
              </span>
            </div>
            <span className={paid && !subscription.cancel_at_period_end ? 'tag tag-solid' : 'tag tag-soft'}>{paid ? (subscription.cancel_at_period_end ? 'Cancels soon' : subscription.status === 'past_due' ? 'Payment due' : 'Active') : isAdmin ? 'Full access' : paywallOn ? 'Inactive' : 'Free for now'}</span>
          </div>
          <div className="well row" style={{ gap: 10, borderRadius: 18, padding: '14px 16px', fontSize: 13.5 }}>
            <CalendarDays size={16} style={{ flexShrink: 0 }} />
            {paid
              ? subscription.cancel_at_period_end ? `Access continues until ${ends}, then your plan ends. Your trades stay saved.` : ends ? `Renews on ${ends} for $15.00.` : 'Your plan is active.'
              : isAdmin ? 'You have admin access, so no subscription is needed.' : paywallOn ? 'Subscribe to keep full access to your journal.' : 'LIMITLESS is free for you right now. Subscribe to lock in Lite before the paywall goes live.'}
          </div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {paid
              ? <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => run('portal', openBillingPortal)}><CreditCard size={15} /> {busy === 'portal' ? 'Opening…' : 'Manage billing'}</button>
              : <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => run('lite', () => startCheckout('lite'))}><Lock size={15} /> {busy === 'lite' ? 'Opening checkout…' : 'Subscribe for $15'}</button>}
            <button type="button" className="btn btn-ghost" disabled={!!busy} onClick={refresh}><RefreshCw size={14} /> Refresh status</button>
          </div>
          {err && <p role="alert" style={{ color: 'var(--neg)', fontSize: 13 }}>{err}</p>}
          <span className="faint" style={{ fontSize: 12.5 }}>Update your card, download invoices or cancel in the secure Stripe billing portal.</span>
        </section>

        <div className="grid g2">
          <section className="glass panel" aria-label="Lite plan">
            <div className="panel-head"><h2>Lite</h2><span className="display" style={{ fontSize: 20, fontWeight: 600 }}>$15 <span className="faint" style={{ fontSize: 13, fontWeight: 400 }}>/ month</span></span></div>
            <span className="muted" style={{ fontSize: 13.5 }}>{lite.tagline}</span>
            <div className="col" style={{ gap: 10 }}>
              {lite.features.map((f) => <span key={f} className="row" style={{ gap: 10, fontSize: 13.5 }}><span className="check" style={{ width: 22, height: 22 }}><Check size={12} strokeWidth={3} /></span>{f}</span>)}
            </div>
          </section>
          <section className="glass panel" aria-label="Pro plan" style={{ position: 'relative', overflow: 'hidden' }}>
            <div className="panel-head"><h2>Pro</h2><span className="tag tag-soft"><Lock size={11} /> Coming soon</span></div>
            <span className="muted" style={{ fontSize: 13.5 }}>{PLANS.pro.tagline}</span>
            <div className="col" style={{ gap: 10, filter: 'blur(5px)', opacity: 0.6, userSelect: 'none' }} aria-hidden="true">
              {PLANS.pro.features.map((f) => <span key={f} className="row" style={{ gap: 10, fontSize: 13.5 }}><span className="check off" style={{ width: 22, height: 22 }}><Check size={12} strokeWidth={3} /></span>{f}</span>)}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}

const GOAL_HISTORY = 'goal_history'
const readGoals = () => { try { return JSON.parse(localStorage.getItem(GOAL_HISTORY) || '{}') } catch { return {} } }

function DangerModal({ cfg, busy, onClose }) {
  const [text, setText] = React.useState('')
  if (!cfg) return null
  const ok = text.trim().toUpperCase() === cfg.word
  return (
    <Modal open label={cfg.title} onClose={() => { if (!busy) onClose() }} maxWidth={460}>
      <div className="col" style={{ gap: 14 }}>
        <span className="row" style={{ gap: 12 }}>
          <span className="well" style={{ width: 42, height: 42, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neg)', flexShrink: 0 }}><AlertTriangle size={18} /></span>
          <span className="display" style={{ fontSize: 19, fontWeight: 600 }}>{cfg.title}</span>
        </span>
        <span className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>{cfg.msg}</span>
        <label className="field"><span>Type {cfg.word} to confirm</span><input className="input" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={cfg.word} /></label>
        <div className="row" style={{ gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!ok || busy} onClick={cfg.run} style={{ background: ok ? 'var(--neg)' : undefined, color: ok ? '#000' : undefined }}>{busy ? 'Working…' : cfg.label}</button>
        </div>
      </div>
    </Modal>
  )
}

export function Account() {
  const { user, profile, settings, setSetting, notify, saveProfile, trades, setTrades, setProfile, logout } = useStore()
  const init = () => ({ first_name: profile?.first_name || '', last_name: profile?.last_name || '', username: profile?.username || '', phone: profile?.phone || '', market_focus: profile?.market_focus || '' })
  const [p, setP] = React.useState(init)
  const [goal, setGoal] = React.useState(profile?.monthly_goal ? String(profile.monthly_goal) : '')
  const [busy, setBusy] = React.useState('')
  const [imp, setImp] = React.useState(false)
  const [ticket, setTicket] = React.useState({ subject: '', message: '' })
  const [danger, setDanger] = React.useState(null)
  const [goals, setGoals] = React.useState(readGoals)
  const row = { display: 'flex', alignItems: 'center', gap: '12px 16px', minHeight: 64, paddingBlock: 14, borderTop: '1px solid var(--line)', flexWrap: 'wrap' }
  const save = async (key, patch, msg) => {
    setBusy(key)
    try { await saveProfile(patch); notify(msg) } catch (e) { notify(e.message, 'err') }
    setBusy('')
  }
  const saveGoal = async () => {
    const v = Number(goal.replace(/[$,]/g, '')) || 0
    await save('goal', { monthly_goal: v }, v ? 'Goal saved' : 'Goal cleared')
    const d = new Date()
    const h = { ...readGoals(), [`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`]: v }
    try { localStorage.setItem(GOAL_HISTORY, JSON.stringify(h)) } catch { /* private mode */ }
    setGoals(h)
  }
  const past = React.useMemo(() => {
    const now = new Date()
    return [1, 2, 3].map((k) => {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const achieved = Math.round(trades.filter((t) => t.date.startsWith(key)).reduce((a, t) => a + t.pnl, 0))
      const target = Number(goals[key]) || 0
      return { key, achieved, target, pct: target > 0 ? Math.round((achieved / target) * 100) : 0, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
    })
  }, [trades, goals])
  const sendTicket = async () => {
    if (!ticket.subject.trim() || !ticket.message.trim()) return
    setBusy('ticket')
    const { error } = await supabase.from('support_tickets').insert({ user_id: user.id, email: user.email, subject: ticket.subject.trim(), message: ticket.message.trim(), status: 'open' })
    setBusy('')
    if (error) return notify(error.message, 'err')
    setTicket({ subject: '', message: '' })
    notify('Message sent. We will reply by email.')
  }
  const wipeTrades = async () => {
    const { error } = await supabase.from('trades').delete().eq('user_id', user.id)
    if (error) throw new Error(error.message)
    setTrades([])
  }
  const runDanger = (kind) => async () => {
    setBusy('danger')
    try {
      await wipeTrades()
      if (kind === 'reset') {
        try { await supabase.from('profiles').update({ monthly_goal: 0 }).eq('id', user.id) } catch { /* ignore */ }
        try { Object.keys(localStorage).forEach((k) => { if (k.startsWith('sb-') || k.includes('supabase') || k.includes('auth-token')) return; localStorage.removeItem(k) }) } catch { /* ignore */ }
        setProfile && setProfile((x) => ({ ...x, monthly_goal: 0 }))
        setGoal('')
        notify('Account reset. Everything is back to zero.')
        location.hash = 'dashboard'
      } else {
        try { localStorage.removeItem(GOAL_HISTORY) } catch { /* ignore */ }
        notify('All trades cleared. Starting fresh.')
      }
      setGoals({})
      setDanger(null)
    } catch (e) { notify(e.message || 'Could not finish that', 'err') }
    setBusy('')
  }
  const dangerCfg = danger === 'clear'
    ? { word: 'DELETE', title: 'Clear all trades', label: 'Clear all trades', run: runDanger('clear'), msg: 'This permanently deletes every trade in your journal. It cannot be undone.' }
    : danger === 'reset'
      ? { word: 'RESET', title: 'Reset account', label: 'Reset account', run: runDanger('reset'), msg: 'This deletes every trade, resets your goal and clears the data saved in this browser. Your login and subscription stay.' }
      : null
  const links = [
    [ClipboardList, 'Trading plan', 'Rules, setup model and the AI checklist', '#plan'],
    [Newspaper, 'News calendar', 'This week and next, in your time zone', '#news'],
    [Users, 'Network', 'Feed, leaderboard, challenges and chat', '#network'],
    [CreditCard, 'Subscription', 'Your plan and billing', '#billing'],
  ]
  return (
    <AppShell route="account" word="ACCOUNT" title="Account">
      <div className="wrap col" style={{ gap: 18, paddingBottom: 60, maxWidth: 960 }}>
        <section className="glass panel" aria-label="Shortcuts" style={{ gap: 4 }}>
          {links.map(([I, t, s, href]) => (
            <a key={href} href={href} className="list-row" style={{ textDecoration: 'none' }}>
              <span className="ink" style={{ width: 42, height: 42, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><I size={17} /></span>
              <span className="col" style={{ flex: 1, minWidth: 0 }}><span className="display" style={{ fontSize: 14.5, fontWeight: 500 }}>{t}</span><span className="faint" style={{ fontSize: 12 }}>{s}</span></span>
            </a>
          ))}
        </section>

        <section className="glass panel" aria-label="Profile">
          <div className="panel-head"><h2>Profile</h2></div>
          <div className="grid g3">
            <label className="field"><span>First name</span><input className="input" value={p.first_name} onChange={(e) => setP({ ...p, first_name: e.target.value })} /></label>
            <label className="field"><span>Last name</span><input className="input" value={p.last_name} onChange={(e) => setP({ ...p, last_name: e.target.value })} /></label>
            <label className="field"><span>Username</span><input className="input" value={p.username} onChange={(e) => setP({ ...p, username: e.target.value })} /></label>
            <label className="field"><span>Phone</span><input className="input" type="tel" inputMode="tel" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></label>
            <label className="field"><span>Market focus</span><input className="input" placeholder="Futures, forex, crypto" value={p.market_focus} onChange={(e) => setP({ ...p, market_focus: e.target.value })} /></label>
            <label className="field"><span>Email</span><input className="input" value={user.email} readOnly style={{ opacity: 0.6 }} /></label>
          </div>
          <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={busy === 'profile'} onClick={() => save('profile', Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.trim() || null])), 'Profile saved')}>Save profile</button>
        </section>

        <section className="glass panel" aria-label="Monthly goal">
          <div className="panel-head"><h2>Monthly goal</h2><span className="faint" style={{ fontSize: 12.5 }}>Shown on your dashboard</span></div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <label className="field" style={{ flex: '0 1 220px' }}><span>Goal in dollars</span><input className="input num" inputMode="decimal" placeholder="3000" value={goal} onChange={(e) => setGoal(e.target.value)} /></label>
            <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-end' }} disabled={busy === 'goal'} onClick={saveGoal}>Save goal</button>
          </div>
          <div className="grid g3" style={{ marginTop: 6 }}>
            {past.map((m) => (
              <div key={m.key} className="well col" style={{ borderRadius: 18, padding: '14px 16px', gap: 6 }}>
                <span className="faint" style={{ fontSize: 12 }}>{m.label}</span>
                <span className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <PnL v={m.achieved} className="display" />
                  <span className="faint num" style={{ fontSize: 12 }}>{m.target ? `${m.pct}% of ${money(m.target, false)}` : 'No goal set'}</span>
                </span>
                <div className="bar well" style={{ height: 6 }}><i style={{ width: `${Math.max(0, Math.min(100, m.pct))}%`, background: '#FFF' }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass panel" aria-label="Display" style={{ gap: 0 }}>
          <div className="panel-head" style={{ marginBottom: 10 }}><h2>Display</h2></div>
          <div style={row}>
            <div className="col" style={{ flex: '1 1 200px' }}><span style={{ fontWeight: 500 }}>Glass</span><span className="faint" style={{ fontSize: 12.5 }}>From clear to tinted</span></div>
            <div className="row" style={{ gap: 12, flex: '1 1 260px' }}>
              <span className="faint" style={{ fontSize: 12 }}>Clear</span>
              <input aria-label="Glass tint" type="range" className="range" min="0" max="1" step="0.05" value={settings.glass} onChange={(e) => setSetting('glass', Number(e.target.value))} />
              <span className="faint" style={{ fontSize: 12 }}>Tinted</span>
            </div>
          </div>
          <div style={row}>
            <div className="col" style={{ flex: '1 1 200px' }}><span style={{ fontWeight: 500 }}>Profit and loss colors</span><span className="faint" style={{ fontSize: 12.5 }}>Soft green and red, or all white</span></div>
            <Seg options={[{ value: 'soft', label: 'Soft color' }, { value: 'mono', label: 'Mono' }]} value={settings.pnl} onChange={(v) => setSetting('pnl', v)} label="P&L colors" />
          </div>
          <div style={row}>
            <div className="col" style={{ flex: '1 1 200px' }}><span style={{ fontWeight: 500 }}>Motion</span><span className="faint" style={{ fontSize: 12.5 }}>Animations and transitions</span></div>
            <button type="button" role="switch" aria-checked={settings.motion} aria-label="Motion" className="toggle" onClick={() => setSetting('motion', !settings.motion)}><span /></button>
          </div>
        </section>

        <section className="glass panel" aria-label="Your data">
          <div className="panel-head"><h2>Your data</h2><span className="faint" style={{ fontSize: 12.5 }}>{trades.length} trades</span></div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost" disabled={!trades.length} onClick={() => exportCSV(trades)}><Download size={15} /> Export trades as CSV</button>
            <button type="button" className="btn btn-ghost" onClick={() => setImp(true)}><Upload size={15} /> Import a CSV</button>
          </div>
        </section>

        <section className="glass panel" aria-label="Support">
          <div className="panel-head"><h2>Support</h2><span className="faint" style={{ fontSize: 12.5 }}>We reply to {user.email}</span></div>
          <label className="field"><span>Subject</span><input className="input" value={ticket.subject} onChange={(e) => setTicket({ ...ticket, subject: e.target.value })} placeholder="What do you need help with?" /></label>
          <label className="field"><span>Message</span><textarea className="input" rows={4} value={ticket.message} onChange={(e) => setTicket({ ...ticket, message: e.target.value })} placeholder="Tell us what happened" /></label>
          <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={busy === 'ticket' || !ticket.subject.trim() || !ticket.message.trim()} onClick={sendTicket}><Send size={14} /> {busy === 'ticket' ? 'Sending…' : 'Send message'}</button>
        </section>

        <section className="glass panel" aria-label="Danger zone" style={{ gap: 0 }}>
          <div className="panel-head" style={{ marginBottom: 10 }}><h2>Danger zone</h2></div>
          <div style={row}>
            <div className="col" style={{ flex: '1 1 220px' }}><span style={{ fontWeight: 500 }}>Clear all trades</span><span className="faint" style={{ fontSize: 12.5 }}>Delete every trade and start fresh</span></div>
            <button type="button" className="btn btn-ghost" style={{ color: 'var(--neg)' }} disabled={!trades.length} onClick={() => setDanger('clear')}><Trash2 size={14} /> Clear trades</button>
          </div>
          <div style={row}>
            <div className="col" style={{ flex: '1 1 220px' }}><span style={{ fontWeight: 500 }}>Reset account</span><span className="faint" style={{ fontSize: 12.5 }}>Trades, goal and saved preferences back to zero</span></div>
            <button type="button" className="btn btn-ghost" style={{ color: 'var(--neg)' }} onClick={() => setDanger('reset')}><RotateCcw size={14} /> Reset account</button>
          </div>
        </section>

        <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn btn-dark" onClick={logout}><LogOut size={15} /> Log out</button>
          <span className="faint" style={{ fontSize: 12, marginLeft: 'auto' }}>LIMITLESS Trading Journal</span>
        </div>
      </div>
      <ImportModal open={imp} onClose={() => setImp(false)} />
      <DangerModal key={danger || 'none'} cfg={dangerCfg} busy={busy === 'danger'} onClose={() => setDanger(null)} />
    </AppShell>
  )
}
