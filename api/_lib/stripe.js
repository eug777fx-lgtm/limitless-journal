// Stripe over plain fetch: no SDK dependency, nothing to npm install.
// Every call is pinned to one API version so the object shapes we read never
// shift under us when the account's default version changes.
//   Env: STRIPE_SECRET_KEY

import crypto from 'crypto'

// 2025-12-15.clover: last version of the Clover release (additive over
// 2025-09-30.clover). Basil changes are handled below (period end on items,
// invoice.parent.subscription_details). Flexible billing mode is the default.
export const STRIPE_API_VERSION = '2025-12-15.clover'

// Stripe takes form-encoded bodies with bracketed keys:
//   { line_items: [{ price: 'p', quantity: 1 }] } -> line_items[0][price]=p&line_items[0][quantity]=1
export function formEncode(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue
    const key = prefix ? `${prefix}[${k}]` : k
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === 'object') formEncode(item, `${key}[${i}]`, out)
        else out.append(`${key}[${i}]`, String(item))
      })
    } else if (typeof v === 'object') {
      formEncode(v, key, out)
    } else {
      out.append(key, String(v))
    }
  }
  return out
}

export async function stripe(path, { method = 'GET', params, idempotencyKey } = {}) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  let url = `https://api.stripe.com/v1/${path}`
  const init = {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Stripe-Version': STRIPE_API_VERSION },
  }
  if (idempotencyKey) init.headers['Idempotency-Key'] = idempotencyKey
  if (params && method === 'GET') {
    url += `?${formEncode(params).toString()}`
  } else if (params) {
    init.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    init.body = formEncode(params).toString()
  }
  const r = await fetch(url, init)
  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    const msg = data?.error?.message || `Stripe ${method} ${path} failed (${r.status})`
    const err = new Error(msg)
    err.status = r.status
    throw err
  }
  return data
}

// Stripe-Signature: t=<unix>,v1=<hex>[,v1=<hex>...]
// Expected v1 = HMAC-SHA256(secret, `${t}.${rawBody}`) as hex. The whole whsec_
// string is the key. Rejects anything older than `toleranceSec`.
export function verifyStripeSignature(rawBody, header, secret, toleranceSec = 300, nowSec = Math.floor(Date.now() / 1000)) {
  if (!rawBody || !header || !secret) return false
  try {
    const parts = String(header).split(',').map((p) => p.trim().split('='))
    const t = parts.find(([k]) => k === 't')?.[1]
    const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v).filter(Boolean)
    if (!t || !sigs.length) return false
    if (Math.abs(nowSec - Number(t)) > toleranceSec) return false
    const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`, 'utf8').digest('hex')
    const exp = Buffer.from(expected, 'utf8')
    return sigs.some((s) => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s, 'utf8'), exp))
  } catch {
    return false
  }
}

// Which of our plans a Stripe price belongs to.
export function planForPrice(priceId) {
  if (priceId && process.env.STRIPE_PRICE_PRO && priceId === process.env.STRIPE_PRICE_PRO) return 'pro'
  return 'lite'
}

// Period end moved from the subscription onto its items in newer API versions;
// read whichever is present so a version bump can't silently null it out.
export function periodEnd(sub) {
  const ts = sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end
  return ts ? new Date(ts * 1000).toISOString() : null
}

// Statuses that keep the journal unlocked. past_due = Stripe is still retrying
// the card, so the trader keeps access during the dunning window.
export const ACCESS_STATUSES = ['active', 'trialing', 'past_due']
