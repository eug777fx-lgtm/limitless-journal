// Paywall + Subscription page. Pure UI: all money moves through Stripe
// Checkout and the Stripe customer portal (see src/lib/billing.js, api/billing.js).
import { useState } from 'react'
import {
  Check, Lock, Loader2, ShieldCheck, LogOut, CreditCard, RefreshCw,
  AlertTriangle, ArrowRight, CalendarClock, Receipt, BadgeCheck,
} from 'lucide-react'
import { PLANS, startCheckout, openBillingPortal, syncSubscription, hasPaidAccess, fmtDate } from './lib/billing'

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

const BILLING_CSS = `
@keyframes lxSpin { to { transform: rotate(360deg) } }
@keyframes lxRise { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
.lx-plans { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; width: 100%; }
.lx-card { position: relative; border-radius: 22px; padding: 30px; text-align: left; overflow: hidden; display: flex; flex-direction: column;
  background: linear-gradient(180deg, rgba(20,20,22,0.86) 0%, rgba(10,10,11,0.86) 100%);
  border: 1px solid rgba(255,255,255,0.07); backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);
  animation: lxRise 0.45s cubic-bezier(0.22,1,0.36,1) both; }
.lx-card.lx-featured { border-color: rgba(255,255,255,0.18);
  box-shadow: 0 0 0 1px rgba(255,255,255,0.04) inset, 0 30px 80px -30px rgba(170,255,160,0.18); }
.lx-card.lx-featured::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); }
.lx-cta { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; cursor: pointer;
  border-radius: 12px; padding: 14px 18px; font-family: inherit; font-size: 14px; font-weight: 600; letter-spacing: 0.01em;
  background: #ffffff; color: #0A0A0B; transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease; }
.lx-cta:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 30px rgba(255,255,255,0.12); }
.lx-cta:disabled { opacity: 0.6; cursor: default; }
.lx-card > .lx-cta { margin-top: auto; }
.lx-ghost { background: transparent; border: 1px solid #2a2a2a; color: #8a8a92; border-radius: 10px; padding: 10px 18px;
  font-family: inherit; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; transition: all 0.15s; }
.lx-ghost:hover:not(:disabled) { border-color: #3a3a3a; color: #fff; background: rgba(255,255,255,0.03); }
.lx-blur { filter: blur(7px); opacity: 0.55; user-select: none; pointer-events: none; }
.lx-feat { display: flex; gap: 10px; align-items: flex-start; font-size: 13.5px; color: #c9c9cf; line-height: 1.45; }
.lx-trust { display: flex; flex-wrap: wrap; gap: 8px 20px; justify-content: center; font-size: 12px; color: #6e6e76; }
.lx-trust span { display: inline-flex; align-items: center; gap: 6px; }
@media (max-width: 720px) {
  .lx-plans { grid-template-columns: 1fr; gap: 12px; }
  .lx-card { padding: 22px; border-radius: 18px; }
  .lx-h1 { font-size: 29px !important; letter-spacing: -0.8px !important; }
  .lx-h1 br { display: none; }
  .lx-sub { font-size: 14px !important; }
  .lx-shell { padding: 40px 16px 32px !important; }
}
`

const Spinner = ({ size = 15 }) => <Loader2 size={size} style={{ animation: 'lxSpin 0.9s linear infinite' }} />

// ─── Plan cards (shared by the paywall and the Subscription page) ───
export function PlanCards({ onChoose, busy, currentPlan }) {
  const lite = PLANS.lite
  const pro = PLANS.pro
  const isCurrent = currentPlan === 'lite'
  return (
    <div className="lx-plans">
      {/* Lite */}
      <div className="lx-card lx-featured">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#fff' }}>{lite.name}</div>
          <span style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aaffa0', background: 'rgba(170,255,160,0.08)', border: '1px solid rgba(170,255,160,0.22)', borderRadius: '99px', padding: '4px 10px' }}>
            {isCurrent ? 'Your plan' : 'Available now'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
          <span style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-2px', color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>${lite.price}</span>
          <span style={{ fontSize: '14px', color: '#77777f' }}>/ {lite.interval}</span>
        </div>
        <div style={{ fontSize: '13px', color: '#8a8a92', lineHeight: 1.6, marginBottom: '22px' }}>{lite.tagline}</div>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '20px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginBottom: '26px' }}>
          {lite.features.map((f) => (
            <div key={f} className="lx-feat">
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(170,255,160,0.10)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                <Check size={11} color="#aaffa0" strokeWidth={3} />
              </span>
              {f}
            </div>
          ))}
        </div>
        {onChoose && (
          <button className="lx-cta" disabled={!!busy || isCurrent} onClick={() => onChoose('lite')}>
            {busy === 'lite' ? <><Spinner /> Opening secure checkout</> : isCurrent ? <><BadgeCheck size={16} /> Current plan</> : <>Get Lite <ArrowRight size={16} /></>}
          </button>
        )}
      </div>

      {/* Pro: visible, but blurred and not purchasable until it launches */}
      <div className="lx-card" style={{ animationDelay: '0.06s' }} aria-label="Pro plan, coming soon">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#fff' }}>{pro.name}</div>
          <span style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c9c9cf', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '99px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Lock size={10} /> Coming soon
          </span>
        </div>
        <div aria-hidden="true" className="lx-blur">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-2px', color: '#fff', lineHeight: 1 }}>$00</span>
            <span style={{ fontSize: '14px', color: '#77777f' }}>/ month</span>
          </div>
          <div style={{ fontSize: '13px', color: '#8a8a92', lineHeight: 1.6, marginBottom: '22px' }}>{pro.tagline}</div>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '20px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginBottom: '26px' }}>
            {pro.features.map((f) => (
              <div key={f} className="lx-feat"><Check size={14} color="#888" style={{ flexShrink: 0, marginTop: '2px' }} />{f}</div>
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: '84px', bottom: '84px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', textAlign: 'center', padding: '0 24px', pointerEvents: 'none' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={18} color="#fff" />
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>More tools for funded traders</div>
          <div style={{ fontSize: '12.5px', color: '#8a8a92', lineHeight: 1.6, maxWidth: '260px' }}>Pro is in the works. Lite members hear about it first.</div>
        </div>
        {onChoose && (
          <button className="lx-cta" disabled style={{ background: 'rgba(255,255,255,0.06)', color: '#77777f', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Lock size={14} /> Coming soon
          </button>
        )}
      </div>
    </div>
  )
}

// What to tell someone whose subscription exists but no longer grants access.
function lapsedNotice(sub) {
  if (!sub) return null
  if (['canceled', 'unpaid', 'incomplete_expired'].includes(sub.status)) {
    return { tone: 'warn', text: 'Your subscription has ended. Resubscribe to unlock your journal again. Nothing was deleted.' }
  }
  if (sub.status === 'incomplete' && sub.stripe_subscription_id) {
    return { tone: 'warn', text: 'Your last payment did not go through. Try again below.' }
  }
  if (sub.status === 'paused') return { tone: 'warn', text: 'Your subscription is paused.' }
  return null
}

// ─── Paywall (replaces the app for anyone without access while the paywall is on) ───
export function PaywallScreen({ subscription, tradeCount = 0, onLogout, onSynced, background, css }) {
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const notice = lapsedNotice(subscription)

  const choose = async (plan) => {
    setErr(''); setBusy(plan)
    try { await startCheckout(plan) } catch (e) { setErr(e.message); setBusy(null) }
  }
  const refresh = async () => {
    setErr(''); setBusy('sync')
    try {
      const s = await syncSubscription()
      onSynced?.(s)
      if (!hasPaidAccess(s)) setErr('No active subscription found yet. If you just paid, give it a few seconds and try again.')
    } catch (e) { setErr(e.message) }
    finally { setBusy(null) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', overflowX: 'hidden', background: '#080808', fontFamily: FONT, WebkitOverflowScrolling: 'touch' }}>
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <style dangerouslySetInnerHTML={{ __html: BILLING_CSS }} />
      {background}
      <div className="lx-shell" style={{ position: 'relative', zIndex: 2, maxWidth: '880px', margin: '0 auto', padding: '56px 24px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="/logo2.png" alt="LIMITLESS" style={{ height: '40px', display: 'block', marginBottom: '12px' }} />
        <div style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.24em', color: '#fff', lineHeight: 1 }}>LIMITLESS</div>
        <div style={{ fontSize: '8.5px', color: '#46464D', letterSpacing: '0.3em', marginTop: '6px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '40px' }}>Trading Journal</div>

        <div style={{ textAlign: 'center', maxWidth: '560px', marginBottom: '30px', animation: 'lxRise 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
          <h1 className="lx-h1" style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-1.2px', color: '#fff', lineHeight: 1.08, margin: '0 0 14px' }}>
            Turn your trades into data.<br /> Your data into profit.
          </h1>
          <div className="lx-sub" style={{ fontSize: '15px', color: '#8a8a92', lineHeight: 1.65 }}>
            Unlock the full LIMITLESS journal for $15 a month. Cancel anytime.
          </div>
          {tradeCount > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '18px', fontSize: '12.5px', color: '#c9c9cf', background: 'rgba(170,255,160,0.06)', border: '1px solid rgba(170,255,160,0.18)', borderRadius: '99px', padding: '7px 14px' }}>
              <ShieldCheck size={14} color="#aaffa0" />
              Your {tradeCount} {tradeCount === 1 ? 'trade is' : 'trades are'} saved and waiting
            </div>
          )}
        </div>

        {notice && (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,193,7,0.06)', border: '1px solid rgba(255,193,7,0.25)', color: '#ffd666', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', marginBottom: '16px' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {notice.text}
          </div>
        )}

        <PlanCards onChoose={choose} busy={busy} />

        {err && (
          <div role="alert" style={{ width: '100%', marginTop: '14px', background: 'rgba(255,128,128,0.06)', border: '1px solid rgba(255,128,128,0.25)', color: '#ff9b9b', borderRadius: '12px', padding: '11px 16px', fontSize: '13px', textAlign: 'center' }}>{err}</div>
        )}

        <div className="lx-trust" style={{ marginTop: '26px' }}>
          <span><Lock size={13} /> Secure checkout by Stripe</span>
          <span><RefreshCw size={13} /> Cancel anytime</span>
          <span><Receipt size={13} /> Promo codes accepted at checkout</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '28px' }}>
          <button className="lx-ghost" onClick={refresh} disabled={!!busy}>
            {busy === 'sync' ? <Spinner size={13} /> : <RefreshCw size={13} />} Already subscribed? Refresh
          </button>
          <button className="lx-ghost" onClick={onLogout} disabled={!!busy}><LogOut size={13} /> Log out</button>
        </div>
      </div>
    </div>
  )
}

// ─── Subscription page inside the app ───
const STATUS_LABEL = {
  active:   { text: 'Active',        color: '#aaffa0', bg: 'rgba(170,255,160,0.08)', border: 'rgba(170,255,160,0.25)' },
  trialing: { text: 'Trial',         color: '#aaffa0', bg: 'rgba(170,255,160,0.08)', border: 'rgba(170,255,160,0.25)' },
  past_due: { text: 'Payment issue', color: '#ffd666', bg: 'rgba(255,193,7,0.08)',   border: 'rgba(255,193,7,0.3)'   },
}

export function SubscriptionPage({ subscription, onSynced, isAdmin = false, paywallOn = false }) {
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const paid = hasPaidAccess(subscription)
  const plan = paid ? (PLANS[subscription.plan] || PLANS.lite) : null
  const label = paid ? (subscription.cancel_at_period_end
    ? { text: 'Cancels soon', color: '#ffd666', bg: 'rgba(255,193,7,0.08)', border: 'rgba(255,193,7,0.3)' }
    : STATUS_LABEL[subscription.status]) : null

  const run = async (key, fn) => {
    setErr(''); setBusy(key)
    try { await fn() } catch (e) { setErr(e.message); setBusy(null) }
  }
  const choose = (p) => run(p, () => startCheckout(p))
  const portal = () => run('portal', openBillingPortal)
  const refresh = () => run('sync', async () => { const s = await syncSubscription(); onSynced?.(s); setBusy(null) })

  const card = { background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '18px', padding: '24px', backdropFilter: 'var(--card-blur)', WebkitBackdropFilter: 'var(--card-blur)', boxShadow: 'var(--card-shadow)' }

  return (
    <div className="page-wrap" style={{ animation: 'pageEnter 0.2s ease-out both', fontFamily: FONT }}>
      <style dangerouslySetInnerHTML={{ __html: BILLING_CSS }} />
      <div style={{ marginBottom: '26px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', color: 'var(--text-hi)' }}>Subscription</h1>
        <div style={{ fontSize: '13px', color: 'var(--text-lo)', marginTop: '6px' }}>Your plan, billing and invoices.</div>
      </div>

      {paid ? (
        <div style={{ ...card, maxWidth: '720px', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-lo)', marginBottom: '8px' }}>Current plan</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-hi)', letterSpacing: '-0.5px' }}>{plan.name}</span>
                {plan.price && <span style={{ fontSize: '14px', color: 'var(--text-md)' }}>${plan.price} / {plan.interval}</span>}
              </div>
            </div>
            {label && (
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: label.color, background: label.bg, border: `1px solid ${label.border}`, borderRadius: '99px', padding: '5px 12px' }}>{label.text}</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', fontSize: '13px', color: 'var(--text-md)' }}>
            <CalendarClock size={16} style={{ flexShrink: 0 }} />
            {subscription.status === 'past_due'
              ? 'Your last payment failed. Update your card to keep access.'
              : subscription.cancel_at_period_end
                ? `Access continues until ${fmtDate(subscription.current_period_end)}, then your plan ends. Your trades stay saved.`
                : subscription.current_period_end ? `Renews on ${fmtDate(subscription.current_period_end)}.` : 'Renews monthly.'}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
            <button className="lx-cta" style={{ width: 'auto', padding: '12px 20px' }} onClick={portal} disabled={!!busy}>
              {busy === 'portal' ? <Spinner /> : <CreditCard size={16} />} Manage billing
            </button>
            <button className="lx-ghost" onClick={refresh} disabled={!!busy}>
              {busy === 'sync' ? <Spinner size={13} /> : <RefreshCw size={13} />} Refresh status
            </button>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-lo)', marginTop: '14px', lineHeight: 1.6 }}>
            Update your card, download invoices or cancel in the secure Stripe billing portal.
          </div>
        </div>
      ) : (
        <div style={{ ...card, maxWidth: '880px', marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px' }}>
          <ShieldCheck size={18} color="#aaffa0" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '13px', color: 'var(--text-md)', lineHeight: 1.6 }}>
            {isAdmin
              ? 'You have admin access, so no subscription is needed. Plans below are what traders see.'
              : paywallOn
                ? 'Subscribe to keep full access to your journal.'
                : 'LIMITLESS is free for you right now. Subscribe to lock in Lite before the paywall goes live.'}
          </div>
        </div>
      )}

      <div style={{ maxWidth: '880px' }}>
        <PlanCards onChoose={paid ? null : choose} busy={busy} currentPlan={paid ? subscription.plan : null} />
      </div>

      {err && <div role="alert" style={{ maxWidth: '880px', marginTop: '14px', background: 'rgba(255,128,128,0.06)', border: '1px solid rgba(255,128,128,0.25)', color: '#ff9b9b', borderRadius: '12px', padding: '11px 16px', fontSize: '13px' }}>{err}</div>}

      <div className="lx-trust" style={{ marginTop: '22px', maxWidth: '880px', justifyContent: 'flex-start' }}>
        <span><Lock size={13} /> Secure checkout by Stripe</span>
        <span><RefreshCw size={13} /> Cancel anytime, keep your trade history</span>
      </div>
    </div>
  )
}
