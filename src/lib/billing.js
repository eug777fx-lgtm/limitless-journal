// Client side of billing. State lives in public.subscriptions (one row per
// user, written only by api/billing.js). The browser reads its own row and
// asks the server for Checkout / portal links.
import { supabase } from './supabase'

// Same list as api/_lib/stripe.js: past_due keeps access while Stripe retries the card.
export const ACCESS_STATUSES = ['active', 'trialing', 'past_due']
export const hasPaidAccess = (sub) => !!sub && ACCESS_STATUSES.includes(sub.status)

export const PLANS = {
  lite: {
    id: 'lite',
    name: 'Lite',
    price: 15,
    interval: 'month',
    tagline: 'The full journal. Everything you need to find your edge.',
    features: [
      'Unlimited trade logging with chart screenshots',
      'Performance analytics, equity curve and P&L calendar',
      'Psychology and emotion tracking',
      'Setups, sessions and rule breakdowns',
      'Trading plan with AI checklist',
      'Economic news calendar',
      'CSV import and export',
      'Daily and weekly review emails',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    comingSoon: true,
    tagline: 'Built for funded traders running real size.',
    // Shown blurred until Pro launches.
    features: [
      'Everything in Lite',
      'Prop firm rule engines and drawdown gauges',
      'Payout tracker and scaling planner',
      'Multi account command center',
      'Advanced analytics',
      'Priority support',
    ],
  },
}

export async function fetchSubscription(userId) {
  try {
    const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle()
    if (error) return null
    return data || null
  } catch {
    return null
  }
}

async function call(action, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const r = await fetch(`/api/billing?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
    body: JSON.stringify(body || {}),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Something went wrong. Please try again.')
  return j
}

export async function startCheckout(plan = 'lite') {
  const { url } = await call('checkout', { plan })
  if (!url) throw new Error('Could not open checkout.')
  window.location.assign(url)
}

export async function openBillingPortal() {
  const { url } = await call('portal')
  if (!url) throw new Error('Could not open billing.')
  window.location.assign(url)
}

export async function syncSubscription() {
  const { subscription } = await call('sync')
  return subscription || null
}

export const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
