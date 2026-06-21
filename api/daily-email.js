// Daily check-in email — Vercel Cron (vercel.json: "0 0 * * *", every midnight UTC).
// For every approved user, checks whether they logged any trades "today" and sends
// a tailored email via Resend. Uses the Supabase service role to bypass RLS so it
// can read all users + all trades.
//   Env: RESEND_API_KEY, SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
//   Optional: DAILY_FROM_EMAIL, DAILY_TZ (default America/New_York), CRON_SECRET
//
// "Today" is resolved in DAILY_TZ. At 00:00 UTC that's the evening before in NY, so
// the email reflects the NY trading day that just finished — not an empty new day.

import { dailyJournaledEmail, dailyNoJournalEmail } from './_lib/email-templates.js'
import { logEmail } from './_lib/log-email.js'

const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const sb = (path) => fetch(`${SUPA_URL}/rest/v1/${path}`, {
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
}).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${path}: ${r.status}`))))

const todayISO = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: process.env.DAILY_TZ || 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !SUPA_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing RESEND_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' })
  }
  const from = process.env.DAILY_FROM_EMAIL || 'LIMITLESS <noreply@limitless-journal.com>'

  try {
    const today = todayISO()
    const [profiles, trades] = await Promise.all([
      sb(`profiles?status=eq.approved&select=id,username,first_name`),
      sb(`trades?trade_date=eq.${today}&select=user_id,pnl`),
    ])
    // emails live in the auth.users mirror exposed by admin_users_view
    const usersView = await sb(`admin_users_view?select=id,email`).catch(() => [])
    const emailById = new Map((usersView || []).map((u) => [u.id, u.email]))

    const byUser = new Map()
    for (const t of trades) {
      if (!byUser.has(t.user_id)) byUser.set(t.user_id, [])
      byUser.get(t.user_id).push(Number(t.pnl) || 0)
    }

    let sent = 0, failed = 0, skipped = 0
    for (const p of profiles) {
      const email = emailById.get(p.id)
      const user = { first_name: p.first_name || p.username || '' }
      const pnls = byUser.get(p.id) || []
      const emailType = pnls.length > 0 ? 'daily_journaled' : 'daily_not_journaled'
      if (!email) { skipped++; await logEmail({ userId: p.id, emailType, status: 'skipped', error: 'no email', sentBy: 'system' }); continue }
      let subject, html
      if (pnls.length > 0) {
        const wins = pnls.filter((v) => v > 0).length
        const stats = { trades: pnls.length, pnl: pnls.reduce((a, b) => a + b, 0), winRate: Math.round((wins / pnls.length) * 100), bestTrade: Math.max(...pnls) }
        ;({ subject, html } = dailyJournaledEmail(user, stats))
      } else {
        ;({ subject, html } = dailyNoJournalEmail(user))
      }
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
          await logEmail({ userId: p.id, recipientEmail: email, emailType, status: 'sent', resendId, sentBy: 'system' })
        } else {
          failed++
          const reason = await r.text().catch(() => `HTTP ${r.status}`)
          console.error('daily-email send failed:', email, r.status, reason)
          await logEmail({ userId: p.id, recipientEmail: email, emailType, status: 'failed', error: reason, sentBy: 'system' })
        }
      } catch (e) {
        failed++; console.error('daily-email error:', email, e.message)
        await logEmail({ userId: p.id, recipientEmail: email, emailType, status: 'failed', error: e.message, sentBy: 'system' })
      }
    }

    console.log(`daily-email ${today}: sent ${sent}, failed ${failed}, skipped ${skipped}`)
    return res.status(200).json({ date: today, sent, failed, skipped })
  } catch (e) {
    console.error('daily-email fatal:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
