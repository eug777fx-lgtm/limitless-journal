// Sends the "you're on the waitlist" email to a brand-new signup while the beta
// is closed. Public endpoint (called from the signup flow), so it only emails
// the address provided at signup — the same address that account was created
// with. Mirrors api/notify-signup.js.
//   Env: RESEND_API_KEY (required), WAITLIST_FROM_EMAIL (optional override).

import { waitlistEmail } from './_lib/email-templates.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' })
  const from = process.env.WAITLIST_FROM_EMAIL || process.env.SIGNUP_FROM_EMAIL || 'LIMITLESS <noreply@limitless-journal.com>'

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body) } catch { return {} } })() : (req.body || {})
  const email = String(body.email || '').trim()
  const firstName = body.firstName || ''
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' })
  }

  const { subject, html } = waitlistEmail({ first_name: firstName })

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to: email, subject, html }),
    })
    if (!r.ok) return res.status(502).json({ error: await r.text() })
    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
