// Weekly performance report — Vercel Cron (vercel.json: "0 20 * * 6", Saturday 20:00 UTC).
// For every approved user, summarises this week's (Mon–Sat) trades and emails a
// premium recap via Resend. Uses the Supabase service role to bypass RLS.
// Window + per-user stats come from the shared api/_lib/weekly-stats.js helper
// (same source of truth as the admin broadcast). Every send is logged.
//   Env: RESEND_API_KEY, SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
//   Optional: WEEKLY_FROM_EMAIL, CRON_SECRET

import { weeklyProfitableEmail, weeklyLosingEmail } from './_lib/email-templates.js'
import { weeklyWindow, buildWeeklyStats } from './_lib/weekly-stats.js'
import { logEmail } from './_lib/log-email.js'

const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const sb = (path) => fetch(`${SUPA_URL}/rest/v1/${path}`, {
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
}).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${path}: ${r.status}`))))

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !SUPA_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing RESEND_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' })
  }
  const from = process.env.WEEKLY_FROM_EMAIL || 'LIMITLESS <noreply@limitless-journal.com>'

  try {
    const { since, range } = weeklyWindow()

    const [profiles, trades] = await Promise.all([
      sb(`profiles?status=eq.approved&select=id,username,first_name`),
      sb(`trades?trade_date=gte.${since}&select=user_id,pnl,rr,symbol`),
    ])
    const usersView = await sb(`admin_users_view?select=id,email`).catch(() => [])
    const emailById = new Map((usersView || []).map((u) => [u.id, u.email]))

    const byUser = new Map()
    for (const t of trades) {
      if (!byUser.has(t.user_id)) byUser.set(t.user_id, [])
      byUser.get(t.user_id).push(t)
    }

    let sent = 0, failed = 0, skipped = 0
    for (const p of profiles) {
      const email = emailById.get(p.id)
      if (!email) { skipped++; await logEmail({ userId: p.id, emailType: 'weekly', status: 'skipped', error: 'no email', sentBy: 'system' }); continue }
      const user = { first_name: p.first_name || p.username || '' }
      const ts = byUser.get(p.id) || []
      const stats = buildWeeklyStats(ts, range)
      // Profitable vs losing chosen on net P&L.
      const { subject, html } = stats.pnl > 0 ? weeklyProfitableEmail(user, stats) : weeklyLosingEmail(user, stats)

      // Per-user try/catch — one failure never stops the rest.
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ from, to: email, subject, html }),
        })
        if (r.ok) {
          sent++
          const resendId = (await r.json().catch(() => ({}))).id || null
          await logEmail({ userId: p.id, recipientEmail: email, emailType: 'weekly', status: 'sent', resendId, sentBy: 'system' })
        } else {
          failed++
          const reason = await r.text().catch(() => `HTTP ${r.status}`)
          console.error('weekly-email send failed:', email, r.status, reason)
          await logEmail({ userId: p.id, recipientEmail: email, emailType: 'weekly', status: 'failed', error: reason, sentBy: 'system' })
        }
      } catch (e) {
        failed++; console.error('weekly-email error:', email, e.message)
        await logEmail({ userId: p.id, recipientEmail: email, emailType: 'weekly', status: 'failed', error: e.message, sentBy: 'system' })
      }
    }

    console.log(`weekly-email ${range}: sent ${sent}, failed ${failed}, skipped ${skipped}`)
    return res.status(200).json({ range, sent, failed, skipped })
  } catch (e) {
    console.error('weekly-email fatal:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
