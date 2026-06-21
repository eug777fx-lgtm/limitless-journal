// Resend webhook — open / click / delivery / bounce / complaint tracking.
// Public endpoint, but Svix-signature verified with RESEND_WEBHOOK_SECRET.
// Matches each event to its email_log row by resend_id (event.data.email_id) and
// updates tracking columns. No match → ignored (never inserts). Always 200 fast.
//   Env: RESEND_WEBHOOK_SECRET (set in Vercel), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import crypto from 'crypto'

// Need the RAW body to verify the Svix signature, so disable Vercel body parsing.
export const config = { api: { bodyParser: false } }

const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const sb = (path, opts = {}) => fetch(`${SUPA_URL}/rest/v1/${path}`, {
  ...opts,
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
})

async function readRaw(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks).toString('utf8')
}

// Resend uses Svix-style signing: HMAC-SHA256 over `${id}.${ts}.${payload}` with
// the base64 secret (after the `whsec_` prefix), base64-compared to the header sigs.
function verifySvix(secret, headers, payload) {
  try {
    const id = headers['svix-id'], ts = headers['svix-timestamp'], sig = headers['svix-signature']
    if (!id || !ts || !sig) return false
    const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
    const expected = crypto.createHmac('sha256', key).update(`${id}.${ts}.${payload}`).digest('base64')
    return sig.split(' ').map((p) => p.split(',')[1]).filter(Boolean)
      .some((p) => p.length === expected.length && crypto.timingSafeEqual(Buffer.from(p), Buffer.from(expected)))
  } catch { return false }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  let raw = ''
  try { raw = await readRaw(req) } catch { raw = '' }
  // Fallback if the runtime already buffered the body (keeps signature verifiable
  // when it handed us a string/Buffer; objects can't be re-serialised faithfully).
  if (!raw && req.body != null) raw = typeof req.body === 'string' ? req.body : (Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body))

  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    // During setup the secret may not be added yet — warn but still 200 so Resend
    // doesn't disable the endpoint. (Events are processed best-effort meanwhile.)
    console.warn('resend-webhook: RESEND_WEBHOOK_SECRET not set — processing UNVERIFIED. Add it in Vercel env.')
  } else if (!verifySvix(secret, req.headers, raw)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  let event
  try { event = JSON.parse(raw) } catch { return res.status(200).json({ ok: true, note: 'unparseable' }) }

  const type = event?.type
  const resendId = event?.data?.email_id
  if (!type || !resendId || !SUPA_URL || !SERVICE_KEY) return res.status(200).json({ ok: true })

  try {
    const r = await sb(`email_log?resend_id=eq.${encodeURIComponent(resendId)}&select=id,opened_at,open_count,clicked_at,click_count&limit=1`)
    const rows = r.ok ? await r.json() : []
    const row = rows && rows[0]
    if (!row) return res.status(200).json({ ok: true, note: 'no match' }) // ignore gracefully — never insert

    const now = new Date().toISOString()
    let patch = null
    if (type === 'email.delivered')        patch = { delivered_at: now }
    else if (type === 'email.opened')      patch = { opened_at: row.opened_at || now, open_count: (row.open_count || 0) + 1 }
    else if (type === 'email.clicked')     patch = { clicked_at: row.clicked_at || now, click_count: (row.click_count || 0) + 1 }
    else if (type === 'email.bounced')     patch = { status: 'failed', error: 'bounced' }
    else if (type === 'email.complained')  patch = { status: 'failed', error: 'spam complaint' }

    if (patch) {
      await sb(`email_log?id=eq.${row.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) })
    }
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('resend-webhook error:', e.message)
    return res.status(200).json({ ok: true }) // always 200
  }
}
