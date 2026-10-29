// Billing: one function, four actions (Vercel Hobby allows 12 functions and the
// app already uses 11). Route with ?action=
//
//   POST ?action=checkout  auth  -> { url }  Stripe Checkout for the Lite plan
//   POST ?action=portal    auth  -> { url }  Stripe customer portal (cancel, card, invoices)
//   POST ?action=sync      auth  -> { subscription }  pull latest state from Stripe now
//   POST ?action=webhook   Stripe signature  -> 200
//
// The webhook is the source of truth: it re-reads the subscription from Stripe
// on every event (never trusts the event payload alone, so out of order
// deliveries can't roll state back) and upserts one row per user into
// public.subscriptions. `sync` does the same on demand so a trader returning
// from Checkout is unlocked without waiting for the webhook.
//
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_LITE,
//      SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
// Optional: STRIPE_PRICE_PRO, APP_URL, STRIPE_AUTOMATIC_TAX=true, STRIPE_PORTAL_CONFIG

import { stripe, verifyStripeSignature, planForPrice, periodEnd, ACCESS_STATUSES } from './_lib/stripe.js'

// Raw body is required for the webhook signature, so parse JSON ourselves.
export const config = { api: { bodyParser: false } }

const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const sb = async (path, opts = {}) => {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  if (!r.ok) throw new Error(`supabase ${opts.method || 'GET'} ${path.split('?')[0]}: ${r.status} ${await r.text().catch(() => '')}`)
  return r.status === 204 ? null : r.json().catch(() => null)
}

const getRow = async (userId) => (await sb(`subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`))?.[0] || null

const upsertRow = async (row) => (await sb('subscriptions?on_conflict=user_id', {
  method: 'POST',
  headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
  body: JSON.stringify({ ...row, updated_at: new Date().toISOString() }),
}))?.[0] || null

async function readRaw(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  let raw = Buffer.concat(chunks).toString('utf8')
  if (!raw && req.body != null) raw = typeof req.body === 'string' ? req.body : (Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body))
  return raw
}

async function getCaller(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  try {
    const r = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` } })
    const u = r.ok ? await r.json() : null
    return u?.id ? u : null
  } catch { return null }
}

// Where Stripe sends the trader back to. Only our own hosts, never an arbitrary origin.
const ALLOWED_ORIGINS = [
  /^https:\/\/(app\.)?limitless-journal\.com$/,
  /^https:\/\/limitless-journal[a-z0-9-]*\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
]
function baseUrl(req) {
  const o = req.headers.origin
  if (o && ALLOWED_ORIGINS.some((re) => re.test(o))) return o
  return process.env.APP_URL || 'https://app.limitless-journal.com'
}

// Pull a subscription from Stripe and write our row. Returns the row (or null
// when the subscription can't be tied to a user).
export async function syncSubscription(subOrId, fallbackUserId) {
  const sub = typeof subOrId === 'string' ? await stripe(`subscriptions/${subOrId}`) : subOrId
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id

  let userId = sub.metadata?.user_id || fallbackUserId || null
  if (!userId && customerId) {
    userId = (await sb(`subscriptions?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=user_id&limit=1`))?.[0]?.user_id || null
  }
  if (!userId && customerId) {
    const c = await stripe(`customers/${customerId}`).catch(() => null)
    userId = c?.metadata?.user_id || null
  }
  if (!userId) { console.warn('billing: subscription', sub.id, 'has no user'); return null }

  // A late event for an OLD subscription must not lock out a trader whose NEW
  // subscription is active.
  const existing = await getRow(userId)
  if (existing?.stripe_subscription_id && existing.stripe_subscription_id !== sub.id
      && ACCESS_STATUSES.includes(existing.status) && !ACCESS_STATUSES.includes(sub.status)) {
    return existing
  }

  const priceId = sub.items?.data?.[0]?.price?.id || null
  const row = await upsertRow({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status,
    price_id: priceId,
    plan: planForPrice(priceId),
    current_period_end: periodEnd(sub),
    cancel_at_period_end: !!sub.cancel_at_period_end,
  })

  // Paying gets you in: lift pending / waitlist profiles. Banned stays banned.
  if (ACCESS_STATUSES.includes(sub.status)) {
    await sb(`profiles?id=eq.${encodeURIComponent(userId)}&or=(status.is.null,status.eq.pending,status.eq.waitlist)`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'approved' }),
    }).catch((e) => console.warn('billing: approve failed', e.message))
  }
  return row
}

async function getOrCreateCustomer(user) {
  const row = await getRow(user.id)
  if (row?.stripe_customer_id) return { row, customerId: row.stripe_customer_id }
  const customer = await stripe('customers', {
    method: 'POST',
    params: { email: user.email, metadata: { user_id: user.id } },
    idempotencyKey: `customer-${user.id}`,
  })
  const saved = row
    ? (await sb(`subscriptions?user_id=eq.${encodeURIComponent(user.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() }) }))?.[0]
    : await upsertRow({ user_id: user.id, stripe_customer_id: customer.id, status: 'incomplete', plan: 'lite' })
  return { row: saved, customerId: customer.id }
}

async function checkout(req, res, user, body) {
  const plan = body.plan || 'lite'
  if (plan !== 'lite') return res.status(400).json({ error: 'Pro is not available yet.' })
  const price = process.env.STRIPE_PRICE_LITE
  if (!price) return res.status(503).json({ error: 'Billing is not set up yet. Please try again soon.' })

  const { row, customerId } = await getOrCreateCustomer(user)
  const base = baseUrl(req)

  // Already paying: send them to the portal instead of a second subscription.
  if (row?.stripe_subscription_id && ACCESS_STATUSES.includes(row.status)) {
    const portal = await stripe('billing_portal/sessions', { method: 'POST', params: { customer: customerId, return_url: `${base}/?billing=portal` } })
    return res.status(200).json({ url: portal.url, already: true })
  }

  const tax = process.env.STRIPE_AUTOMATIC_TAX === 'true'
  const session = await stripe('checkout/sessions', {
    method: 'POST',
    params: {
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan }, billing_mode: { type: 'flexible' } },
      success_url: `${base}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?billing=cancel`,
      ...(tax ? { automatic_tax: { enabled: true }, customer_update: { address: 'auto' } } : {}),
    },
    // A double click within the same minute returns the same session instead of two.
    idempotencyKey: `checkout-${user.id}-${plan}-${Math.floor(Date.now() / 60000)}`,
  })
  return res.status(200).json({ url: session.url })
}

async function portal(req, res, user) {
  const row = await getRow(user.id)
  if (!row?.stripe_customer_id) return res.status(400).json({ error: 'No billing account yet. Subscribe first.' })
  const configuration = process.env.STRIPE_PORTAL_CONFIG || undefined // default portal config when unset
  const s = await stripe('billing_portal/sessions', { method: 'POST', params: { customer: row.stripe_customer_id, return_url: `${baseUrl(req)}/?billing=portal`, configuration } })
  return res.status(200).json({ url: s.url })
}

async function sync(req, res, user) {
  const row = await getRow(user.id)
  if (!row?.stripe_customer_id) return res.status(200).json({ subscription: row })
  let subId = row.stripe_subscription_id
  if (!subId) {
    const list = await stripe('subscriptions', { params: { customer: row.stripe_customer_id, status: 'all', limit: 3 } })
    subId = list?.data?.[0]?.id
  }
  if (!subId) return res.status(200).json({ subscription: row })
  const updated = await syncSubscription(subId, user.id)
  return res.status(200).json({ subscription: updated || row })
}

async function webhook(req, res, raw) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('billing webhook: STRIPE_WEBHOOK_SECRET not set; refusing unverified event')
    return res.status(500).json({ error: 'Webhook secret not configured' })
  }
  if (!verifyStripeSignature(raw, req.headers['stripe-signature'], secret)) {
    return res.status(400).json({ error: 'Invalid signature' })
  }
  let event
  try { event = JSON.parse(raw) } catch { return res.status(400).json({ error: 'Bad payload' }) }

  const obj = event?.data?.object || {}
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        if (obj.mode === 'subscription' && obj.subscription) {
          await syncSubscription(typeof obj.subscription === 'string' ? obj.subscription : obj.subscription.id, obj.client_reference_id || obj.metadata?.user_id)
        }
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed':
        await syncSubscription(obj.id)
        break
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const subId = obj.subscription || obj.parent?.subscription_details?.subscription
        if (subId) await syncSubscription(typeof subId === 'string' ? subId : subId.id)
        break
      }
      default:
        break // acknowledged, nothing to do
    }
    return res.status(200).json({ received: true })
  } catch (e) {
    console.error('billing webhook error:', event.type, e.message)
    return res.status(500).json({ error: 'Processing failed' }) // Stripe retries
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!SUPA_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Server is missing Supabase configuration' })

  const action = req.query?.action || new URL(req.url, 'http://local').searchParams.get('action')
  let raw = ''
  try { raw = await readRaw(req) } catch { raw = '' }

  if (action === 'webhook') return webhook(req, res, raw)

  const user = await getCaller(req)
  if (!user) return res.status(401).json({ error: 'Please log in again.' })
  let body = {}
  try { body = raw ? JSON.parse(raw) : {} } catch { body = {} }

  try {
    if (action === 'checkout') return await checkout(req, res, user, body)
    if (action === 'portal')   return await portal(req, res, user)
    if (action === 'sync')     return await sync(req, res, user)
    return res.status(400).json({ error: 'Unknown action' })
  } catch (e) {
    console.error(`billing ${action} error:`, e.message)
    return res.status(e.status && e.status < 500 ? 400 : 500).json({ error: e.message || 'Billing error' })
  }
}
