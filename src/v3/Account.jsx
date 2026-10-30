import React from 'react'
import { CreditCard, RefreshCw, Download, Upload, LogOut, History, ClipboardList, Users, SlidersHorizontal, Newspaper, CalendarDays, Check, Lock } from 'lucide-react'
import { useStore } from './store.jsx'
import { Seg } from './ui.jsx'
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

export function Account() {
  const { user, profile, settings, setSetting, notify, saveProfile, trades, logout, onClassic } = useStore()
  const [p, setP] = React.useState({ first_name: profile?.first_name || '', last_name: profile?.last_name || '', username: profile?.username || '' })
  const [goal, setGoal] = React.useState(profile?.monthly_goal ? String(profile.monthly_goal) : '')
  const [busy, setBusy] = React.useState('')
  const [imp, setImp] = React.useState(false)
  const row = { display: 'flex', alignItems: 'center', gap: '12px 16px', minHeight: 64, paddingBlock: 14, borderTop: '1px solid var(--line)', flexWrap: 'wrap' }
  const save = async (key, patch, msg) => {
    setBusy(key)
    try { await saveProfile(patch); notify(msg) } catch (e) { notify(e.message, 'err') }
    setBusy('')
  }
  const links = [
    [ClipboardList, 'Trading plan', 'Rules, setup model and the AI checklist', '#plan'],
    [Newspaper, 'News calendar', 'This week and next, in your time zone', '#news'],
    [Users, 'Network', 'Feed, leaderboard, challenges and chat', '#network'],
    [SlidersHorizontal, 'More settings', 'Theme, email and the rest of your settings', '#settings'],
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
          <div className="panel-head"><h2>Profile</h2><span className="faint" style={{ fontSize: 12.5 }}>{user.email}</span></div>
          <div className="grid g3">
            <label className="field"><span>First name</span><input className="input" value={p.first_name} onChange={(e) => setP({ ...p, first_name: e.target.value })} /></label>
            <label className="field"><span>Last name</span><input className="input" value={p.last_name} onChange={(e) => setP({ ...p, last_name: e.target.value })} /></label>
            <label className="field"><span>Username</span><input className="input" value={p.username} onChange={(e) => setP({ ...p, username: e.target.value })} /></label>
          </div>
          <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={busy === 'profile'} onClick={() => save('profile', { first_name: p.first_name.trim(), last_name: p.last_name.trim(), username: p.username.trim() }, 'Profile saved')}>Save profile</button>
        </section>

        <section className="glass panel" aria-label="Monthly goal">
          <div className="panel-head"><h2>Monthly goal</h2><span className="faint" style={{ fontSize: 12.5 }}>Shown on your dashboard</span></div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <label className="field" style={{ flex: '0 1 220px' }}><span>Goal in dollars</span><input className="input num" inputMode="decimal" placeholder="3000" value={goal} onChange={(e) => setGoal(e.target.value)} /></label>
            <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-end' }} disabled={busy === 'goal'} onClick={() => save('goal', { monthly_goal: Number(goal.replace(/[$,]/g, '')) || 0 }, Number(goal) ? 'Goal saved' : 'Goal cleared')}>Save goal</button>
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

        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" onClick={() => onClassic()}><History size={15} /> Switch to classic view</button>
          <button type="button" className="btn btn-dark" onClick={logout}><LogOut size={15} /> Log out</button>
        </div>
      </div>
      <ImportModal open={imp} onClose={() => setImp(false)} />
    </AppShell>
  )
}
