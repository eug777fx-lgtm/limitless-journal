// Sends the "you're in" welcome email when an admin approves a user.
// Called from App.jsx the moment a user is approved. Takes only a userId and
// resolves the recipient + name server-side via the Supabase service role, so
// the endpoint can never be used to email an arbitrary address.
//   Env: RESEND_API_KEY, SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
//   Optional: APPROVAL_FROM_EMAIL

import { approvedEmail } from './_lib/email-templates.js'
import { logEmail } from './_lib/log-email.js'

const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const sb = (path) => fetch(`${SUPA_URL}/rest/v1/${path}`, {
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
}).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${path}: ${r.status}`))))

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !SUPA_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing RESEND_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' })
  }
  const from = process.env.APPROVAL_FROM_EMAIL || 'LIMITLESS <noreply@limitless-journal.com>'

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body) } catch { return {} } })() : (req.body || {})
  const userId = body.userId
  if (!userId) return res.status(400).json({ error: 'userId required' })

  try {
    const [profiles, usersView] = await Promise.all([
      sb(`profiles?id=eq.${userId}&select=first_name,username`),
      sb(`admin_users_view?id=eq.${userId}&select=email`).catch(() => []),
    ])
    const profile = profiles && profiles[0]
    const email = usersView && usersView[0] && usersView[0].email
    if (!profile || !email) return res.status(404).json({ error: 'User or email not found' })

    const { subject, html } = approvedEmail({ first_name: profile.first_name || profile.username || '' })
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to: email, subject, html }),
    })
    if (!r.ok) {
      const reason = await r.text().catch(() => 'send failed')
      await logEmail({ userId, recipientEmail: email, emailType: 'approved', status: 'failed', error: reason, sentBy: 'system' })
      return res.status(502).json({ error: reason })
    }
    const resendId = (await r.json().catch(() => ({}))).id || null
    await logEmail({ userId, recipientEmail: email, emailType: 'approved', status: 'sent', resendId, sentBy: 'system' })
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('send-approval error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
