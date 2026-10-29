// Tests for the Stripe helpers and the billing endpoint, with Stripe and
// Supabase replaced by an in-memory fake. Run with:
//   node --test api/_lib/billing.test.js
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'

process.env.SUPABASE_URL = 'https://supa.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
process.env.STRIPE_SECRET_KEY = 'sk_test_x'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123'
process.env.STRIPE_PRICE_LITE = 'price_lite'

const { formEncode, verifyStripeSignature, periodEnd } = await import('./stripe.js')
const { default: handler } = await import('../billing.js')

// ── fake backend ──
let db, stripeSubs, calls, customers
beforeEach(() => {
  db = { subscriptions: [], profiles: [{ id: 'u1', status: 'pending' }, { id: 'u2', status: 'banned' }] }
  stripeSubs = {}
  customers = 0
  calls = []
})

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url)
  const method = init.method || 'GET'
  calls.push({ method, url: u.pathname + u.search, body: init.body, headers: init.headers })
  if (u.host === 'supa.test') {
    if (u.pathname === '/auth/v1/user') {
      const tok = (init.headers.Authorization || '').replace('Bearer ', '')
      return tok === 'good' ? json(200, { id: 'u1', email: 'a@b.c' }) : json(401, {})
    }
    const table = u.pathname.replace('/rest/v1/', '')
    const q = u.searchParams
    const eq = (k) => q.get(k)?.replace(/^eq\./, '')
    if (table === 'subscriptions') {
      if (method === 'GET') {
        let rows = db.subscriptions
        if (q.get('user_id')) rows = rows.filter((r) => r.user_id === eq('user_id'))
        if (q.get('stripe_customer_id')) rows = rows.filter((r) => r.stripe_customer_id === eq('stripe_customer_id'))
        return json(200, rows)
      }
      if (method === 'POST') {
        const row = JSON.parse(init.body)
        const i = db.subscriptions.findIndex((r) => r.user_id === row.user_id)
        if (i >= 0) db.subscriptions[i] = { ...db.subscriptions[i], ...row }
        else db.subscriptions.push({ status: 'incomplete', ...row })
        return json(201, [db.subscriptions.find((r) => r.user_id === row.user_id)])
      }
      if (method === 'PATCH') {
        const row = db.subscriptions.find((r) => r.user_id === eq('user_id'))
        Object.assign(row, JSON.parse(init.body))
        return json(200, [row])
      }
    }
    if (table === 'profiles' && method === 'PATCH') {
      const p = db.profiles.find((r) => r.id === eq('id'))
      if (p && [null, undefined, 'pending', 'waitlist'].includes(p.status)) Object.assign(p, JSON.parse(init.body))
      return new Response(null, { status: 204 })
    }
    return json(404, {})
  }
  if (u.host === 'api.stripe.com') {
    assert.equal(init.headers.Authorization, 'Bearer sk_test_x')
    assert.ok(init.headers['Stripe-Version'])
    const path = u.pathname.replace('/v1/', '')
    if (path === 'customers' && method === 'POST') { customers += 1; return json(200, { id: `cus_${customers}` }) }
    if (path === 'checkout/sessions') return json(200, { id: 'cs_1', url: 'https://checkout.stripe.com/c/cs_1' })
    if (path === 'billing_portal/sessions') return json(200, { url: 'https://billing.stripe.com/p/1' })
    if (path.startsWith('subscriptions/')) {
      const s = stripeSubs[path.split('/')[1]]
      return s ? json(200, s) : json(404, { error: { message: 'No such subscription' } })
    }
    if (path === 'subscriptions') return json(200, { data: Object.values(stripeSubs) })
    if (path.startsWith('customers/')) return json(200, { id: path.split('/')[1], metadata: {} })
  }
  throw new Error('unexpected fetch ' + url)
}

function fakeReq({ action, body = '', headers = {} }) {
  const chunks = body ? [Buffer.from(body)] : []
  return {
    method: 'POST', query: { action }, url: `/api/billing?action=${action}`, headers,
    async *[Symbol.asyncIterator]() { for (const c of chunks) yield c },
  }
}
function fakeRes() {
  const r = { statusCode: 0, body: null }
  r.status = (c) => { r.statusCode = c; return r }
  r.json = (b) => { r.body = b; return r }
  return r
}
const sign = (payload, t = Math.floor(Date.now() / 1000), secret = 'whsec_test123') =>
  `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')}`

const sub = (id, status, extra = {}) => ({
  id, status, customer: 'cus_1', cancel_at_period_end: false, current_period_end: 1800000000,
  metadata: { user_id: 'u1' }, items: { data: [{ price: { id: 'price_lite' } }] }, ...extra,
})

// ── helpers ──
test('formEncode handles nested objects and arrays', () => {
  const s = formEncode({ mode: 'subscription', line_items: [{ price: 'p', quantity: 1 }], metadata: { user_id: 'u' }, skip: undefined }).toString()
  assert.equal(decodeURIComponent(s), 'mode=subscription&line_items[0][price]=p&line_items[0][quantity]=1&metadata[user_id]=u')
})

test('signature: valid, tampered, stale, wrong secret, multiple v1', () => {
  const p = '{"a":1}'
  const now = 1_800_000_000
  assert.equal(verifyStripeSignature(p, sign(p, now), 'whsec_test123', 300, now), true)
  assert.equal(verifyStripeSignature('{"a":2}', sign(p, now), 'whsec_test123', 300, now), false)
  assert.equal(verifyStripeSignature(p, sign(p, now - 301), 'whsec_test123', 300, now), false)
  assert.equal(verifyStripeSignature(p, sign(p, now, 'whsec_other'), 'whsec_test123', 300, now), false)
  assert.equal(verifyStripeSignature(p, `t=${now},v1=deadbeef,${sign(p, now).split(',')[1]}`, 'whsec_test123', 300, now), true)
  assert.equal(verifyStripeSignature(p, '', 'whsec_test123'), false)
})

test('periodEnd reads the subscription or its first item', () => {
  assert.equal(periodEnd({ current_period_end: 1800000000 }), new Date(1800000000 * 1000).toISOString())
  assert.equal(periodEnd({ items: { data: [{ current_period_end: 1800000000 }] } }), new Date(1800000000 * 1000).toISOString())
  assert.equal(periodEnd({}), null)
})

// ── endpoint ──
test('checkout requires login', async () => {
  const res = fakeRes()
  await handler(fakeReq({ action: 'checkout', body: '{}' }), res)
  assert.equal(res.statusCode, 401)
})

test('checkout creates a customer once and returns a Checkout URL', async () => {
  const res = fakeRes()
  await handler(fakeReq({ action: 'checkout', body: '{"plan":"lite"}', headers: { authorization: 'Bearer good', origin: 'https://evil.example' } }), res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.url, 'https://checkout.stripe.com/c/cs_1')
  assert.equal(db.subscriptions[0].stripe_customer_id, 'cus_1')
  const cs = calls.find((c) => c.url === '/v1/checkout/sessions')
  const params = new URLSearchParams(cs.body)
  assert.equal(params.get('line_items[0][price]'), 'price_lite')
  assert.equal(params.get('subscription_data[metadata][user_id]'), 'u1')
  assert.equal(params.get('client_reference_id'), 'u1')
  assert.ok(params.get('success_url').startsWith('https://app.limitless-journal.com/'), 'unknown origin falls back to the app URL')
  // second click reuses the customer
  await handler(fakeReq({ action: 'checkout', body: '{}', headers: { authorization: 'Bearer good' } }), fakeRes())
  assert.equal(customers, 1)
})

test('checkout refuses Pro while it is coming soon', async () => {
  const res = fakeRes()
  await handler(fakeReq({ action: 'checkout', body: '{"plan":"pro"}', headers: { authorization: 'Bearer good' } }), res)
  assert.equal(res.statusCode, 400)
})

test('webhook rejects a bad signature and changes nothing', async () => {
  const body = JSON.stringify({ type: 'customer.subscription.updated', data: { object: { id: 'sub_1' } } })
  const res = fakeRes()
  await handler(fakeReq({ action: 'webhook', body, headers: { 'stripe-signature': 't=1,v1=bad' } }), res)
  assert.equal(res.statusCode, 400)
  assert.equal(db.subscriptions.length, 0)
})

test('checkout.session.completed activates the user and approves a pending profile', async () => {
  stripeSubs.sub_1 = sub('sub_1', 'active')
  const body = JSON.stringify({ type: 'checkout.session.completed', data: { object: { mode: 'subscription', subscription: 'sub_1', client_reference_id: 'u1' } } })
  const res = fakeRes()
  await handler(fakeReq({ action: 'webhook', body, headers: { 'stripe-signature': sign(body) } }), res)
  assert.equal(res.statusCode, 200)
  const row = db.subscriptions[0]
  assert.equal(row.status, 'active')
  assert.equal(row.plan, 'lite')
  assert.equal(row.stripe_subscription_id, 'sub_1')
  assert.equal(row.current_period_end, new Date(1800000000 * 1000).toISOString())
  assert.equal(db.profiles[0].status, 'approved')
})

test('cancellation is read from Stripe, not trusted from the event', async () => {
  stripeSubs.sub_1 = sub('sub_1', 'active')
  db.subscriptions.push({ user_id: 'u1', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', status: 'active' })
  stripeSubs.sub_1 = sub('sub_1', 'canceled')
  const body = JSON.stringify({ type: 'customer.subscription.updated', data: { object: { id: 'sub_1', status: 'active' } } })
  await handler(fakeReq({ action: 'webhook', body, headers: { 'stripe-signature': sign(body) } }), fakeRes())
  assert.equal(db.subscriptions[0].status, 'canceled')
})

test('a late event for an old subscription cannot lock out a new active one', async () => {
  db.subscriptions.push({ user_id: 'u1', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_new', status: 'active' })
  stripeSubs.sub_old = sub('sub_old', 'canceled')
  const body = JSON.stringify({ type: 'customer.subscription.deleted', data: { object: { id: 'sub_old' } } })
  await handler(fakeReq({ action: 'webhook', body, headers: { 'stripe-signature': sign(body) } }), fakeRes())
  assert.equal(db.subscriptions[0].stripe_subscription_id, 'sub_new')
  assert.equal(db.subscriptions[0].status, 'active')
})

test('paying never un-bans a banned profile', async () => {
  stripeSubs.sub_2 = sub('sub_2', 'active', { metadata: { user_id: 'u2' } })
  const body = JSON.stringify({ type: 'customer.subscription.created', data: { object: { id: 'sub_2' } } })
  await handler(fakeReq({ action: 'webhook', body, headers: { 'stripe-signature': sign(body) } }), fakeRes())
  assert.equal(db.profiles[1].status, 'banned')
})

test('invoice events work with both old and new payload shapes', async () => {
  stripeSubs.sub_1 = sub('sub_1', 'past_due')
  const oldShape = JSON.stringify({ type: 'invoice.payment_failed', data: { object: { subscription: 'sub_1' } } })
  await handler(fakeReq({ action: 'webhook', body: oldShape, headers: { 'stripe-signature': sign(oldShape) } }), fakeRes())
  assert.equal(db.subscriptions[0].status, 'past_due')
  stripeSubs.sub_1 = sub('sub_1', 'active')
  const newShape = JSON.stringify({ type: 'invoice.paid', data: { object: { parent: { subscription_details: { subscription: 'sub_1' } } } } })
  await handler(fakeReq({ action: 'webhook', body: newShape, headers: { 'stripe-signature': sign(newShape) } }), fakeRes())
  assert.equal(db.subscriptions[0].status, 'active')
})

test('sync pulls the latest subscription for a returning trader', async () => {
  db.subscriptions.push({ user_id: 'u1', stripe_customer_id: 'cus_1', status: 'incomplete' })
  stripeSubs.sub_9 = sub('sub_9', 'active')
  const res = fakeRes()
  await handler(fakeReq({ action: 'sync', body: '{}', headers: { authorization: 'Bearer good' } }), res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.subscription.status, 'active')
})

test('portal needs a billing account, then returns the portal URL', async () => {
  const r1 = fakeRes()
  await handler(fakeReq({ action: 'portal', body: '{}', headers: { authorization: 'Bearer good' } }), r1)
  assert.equal(r1.statusCode, 400)
  db.subscriptions.push({ user_id: 'u1', stripe_customer_id: 'cus_1', status: 'active' })
  const r2 = fakeRes()
  await handler(fakeReq({ action: 'portal', body: '{}', headers: { authorization: 'Bearer good', origin: 'https://app.limitless-journal.com' } }), r2)
  assert.equal(r2.body.url, 'https://billing.stripe.com/p/1')
})
