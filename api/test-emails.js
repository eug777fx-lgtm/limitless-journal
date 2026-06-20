// Manual preview endpoint — sends one of every email template to the admin inbox
// so they can be eyeballed in a real client. Trigger by hitting the URL (GET) or
// POSTing to it. Uses fake "Eugene" data; every subject is prefixed with [TEST].
//   GET/POST /api/test-emails  →  { sent, emails: [{ type, status }] }
//   Env: RESEND_API_KEY (required)

import {
  signupNotification, approvedEmail,
  dailyJournaledEmail, dailyNoJournalEmail,
  weeklyProfitableEmail, weeklyLosingEmail,
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

  const user = { first_name: 'Eugene', last_name: 'F', email: TO, phone: '+1 (555) 012-3456', market_focus: 'Futures (NQ / ES)' }
  const range = weekRange()

  // Fake stat shapes matching what the production handlers build.
  const dailyStats = { trades: 3, pnl: 350, winRate: 67, bestTrade: 280 }
  const weeklyProfit = { pnl: 1240, winRate: 62, trades: 8, avgRR: 2.1, bestTrade: 560, wins: 5, losses: 3, mostTraded: 'NQ', dateRange: range }
  const weeklyLoss = { pnl: -380, winRate: 40, trades: 5, avgRR: 0.9, bestTrade: 140, wins: 2, losses: 3, mostTraded: 'ES', dateRange: range }

  const emails = [
    { type: 'signup_notification', ...signupNotification(user) },
    { type: 'approved', ...approvedEmail(user) },
    { type: 'daily_journaled', ...dailyJournaledEmail(user, dailyStats) },
    { type: 'daily_not_journaled', ...dailyNoJournalEmail(user) },
    { type: 'weekly_profitable', ...weeklyProfitableEmail(user, weeklyProfit) },
    { type: 'weekly_losing', ...weeklyLosingEmail(user, weeklyLoss) },
  ]

  let sent = 0
  const results = []
  for (const e of emails) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ from, to: TO, subject: `[TEST] ${e.subject}`, html: e.html }),
      })
      if (r.ok) { sent++; results.push({ type: e.type, status: 'sent' }) }
      else { results.push({ type: e.type, status: 'failed', error: await r.text().catch(() => '') }) }
    } catch (err) {
      results.push({ type: e.type, status: 'failed', error: err.message })
    }
  }

  return res.status(200).json({ sent, emails: results })
}
