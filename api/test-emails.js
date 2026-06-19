// Manual preview endpoint — sends one of every email template to the admin inbox
// so they can be eyeballed in a real client. Trigger by hitting the URL (GET) or
// POSTing to it. Uses fake "Eugene" data; every subject is prefixed with [TEST].
//   GET/POST /api/test-emails  →  { sent, emails: [{ type, status }] }
//   Env: RESEND_API_KEY (required)

import {
  journaledHtml, notJournaledHtml, weeklyHtml, weeklyMessage, signupNotificationHtml,
} from './_lib/email-templates.js'

const TO = 'eug777fx@gmail.com'

// Current Mon–Sat range, same logic as api/weekly-email.js.
function weekRange() {
  const now = new Date()
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7))
  monday.setUTCHours(0, 0, 0, 0)
  const sat = new Date(monday); sat.setUTCDate(monday.getUTCDate() + 5)
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${fmt(monday)} — ${fmt(sat)}`
}

export default async function handler(req, res) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' })
  const from = 'LIMITLESS <noreply@limitless-journal.com>'

  const name = 'Eugene'
  const range = weekRange()
  const when = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }) + ' ET'

  // Fake stat shapes matching what the production handlers build.
  const dailyJournaled = { count: 3, pnl: 350, winRate: 67, best: 280 }
  const weeklyProfitable = {
    count: 8, net: 1240, winRate: 62, avgRR: 2.1,
    best: { pnl: 560, symbol: 'NQ' }, worst: { pnl: -180, symbol: 'ES' },
    wins: 5, losses: 3, be: 0, mostTraded: 'NQ', message: weeklyMessage(8, 1240),
  }
  const weeklyLosing = {
    count: 5, net: -380, winRate: 40, avgRR: 0.9,
    best: { pnl: 140, symbol: 'ES' }, worst: { pnl: -260, symbol: 'NQ' },
    wins: 2, losses: 3, be: 0, mostTraded: 'ES', message: weeklyMessage(5, -380),
  }

  const emails = [
    {
      type: 'signup_notification',
      subject: '[TEST] 🔔 New LIMITLESS Signup — Approval Needed',
      html: signupNotificationHtml({ name, email: TO, phone: '+1 (555) 012-3456', marketFocus: 'Futures (NQ / ES)', when }),
    },
    {
      type: 'daily_journaled',
      subject: `[TEST] You showed up today, ${name} ✓`,
      html: journaledHtml(name, dailyJournaled),
    },
    {
      type: 'daily_not_journaled',
      subject: `[TEST] Don't let today's trades slip away, ${name}`,
      html: notJournaledHtml(name),
    },
    {
      type: 'weekly_profitable',
      subject: `[TEST] Your week in review, ${name} — ${range}`,
      html: weeklyHtml(weeklyProfitable, range),
    },
    {
      type: 'weekly_losing',
      subject: `[TEST] Your week in review, ${name} — ${range}`,
      html: weeklyHtml(weeklyLosing, range),
    },
  ]

  let sent = 0
  const results = []
  for (const e of emails) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ from, to: TO, subject: e.subject, html: e.html }),
      })
      if (r.ok) { sent++; results.push({ type: e.type, status: 'sent' }) }
      else { results.push({ type: e.type, status: 'failed', error: await r.text().catch(() => '') }) }
    } catch (err) {
      results.push({ type: e.type, status: 'failed', error: err.message })
    }
  }

  return res.status(200).json({ sent, emails: results })
}
