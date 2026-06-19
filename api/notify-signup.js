// Notifies the admin when a new user signs up (approval needed).
// Sends via Resend to a fixed admin inbox. Public endpoint (called from the
// signup flow), so it only ever emails the hardcoded admin — never the caller.
//   Env: RESEND_API_KEY (required), SIGNUP_FROM_EMAIL (optional override).

import { signupNotificationHtml } from './_lib/email-templates.js'

const ADMIN_TO = 'eug777fx@gmail.com'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' })
  const from = process.env.SIGNUP_FROM_EMAIL || 'LIMITLESS <noreply@limitless-journal.com>'

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body) } catch { return {} } })() : (req.body || {})
  const { name, email, phone, marketFocus } = body
  const when = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }) + ' ET'

  const html = signupNotificationHtml({ name, email, phone, marketFocus, when })

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to: ADMIN_TO, subject: '🔔 New LIMITLESS Signup — Approval Needed', html }),
    })
    if (!r.ok) return res.status(502).json({ error: await r.text() })
    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
