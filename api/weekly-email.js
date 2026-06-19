// Weekly performance report — Vercel Cron (vercel.json: "0 20 * * 6", Saturday 20:00 UTC).
// For every approved user, summarises this week's (Mon–Sat) trades and emails a
// premium recap via Resend. Uses the Supabase service role to bypass RLS.
//   Env: RESEND_API_KEY, SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
//   Optional: WEEKLY_FROM_EMAIL, CRON_SECRET

import { weeklyHtml, weeklyMessage } from './_lib/email-templates.js'

const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const sb = (path) => fetch(`${SUPA_URL}/rest/v1/${path}`, {
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
}).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${path}: ${r.status}`))))

function mondayUTC() {
  const now = new Date()
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7))
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}
const fmtDay = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

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
    const monday = mondayUTC()
    const since = monday.toISOString().slice(0, 10)
    const sat = new Date(monday); sat.setUTCDate(monday.getUTCDate() + 5)
    const range = `${fmtDay(monday)} — ${fmtDay(sat)}`

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
      if (!email) { skipped++; continue }
      const name = p.first_name || p.username || ''
      const ts = byUser.get(p.id) || []
      const count = ts.length
      const net = ts.reduce((a, t) => a + (Number(t.pnl) || 0), 0)
      const wins = ts.filter((t) => (Number(t.pnl) || 0) > 0).length
      const losses = ts.filter((t) => (Number(t.pnl) || 0) < 0).length
      const be = ts.filter((t) => (Number(t.pnl) || 0) === 0).length
      const rrs = ts.map((t) => Number(t.rr)).filter((v) => Number.isFinite(v) && v > 0)
      const avgRR = rrs.length ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0
      let best = null, worst = null
      for (const t of ts) {
        const v = Number(t.pnl) || 0
        if (best === null || v > best.pnl) best = { pnl: v, symbol: t.symbol || '' }
        if (worst === null || v < worst.pnl) worst = { pnl: v, symbol: t.symbol || '' }
      }
      const symCount = {}; for (const t of ts) { if (t.symbol) symCount[t.symbol] = (symCount[t.symbol] || 0) + 1 }
      const mostTraded = Object.entries(symCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

      const message = weeklyMessage(count, net)

      const s = { count, net, winRate: count ? Math.round((wins / count) * 100) : 0, avgRR, best: count ? best : null, worst: count ? worst : null, wins, losses, be, mostTraded, message }
      const subject = `Your week in review${name ? `, ${name}` : ''} — ${range}`

      // Per-user try/catch — one failure never stops the rest.
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ from, to: email, subject, html: weeklyHtml(s, range) }),
        })
        if (r.ok) { sent++ } else { failed++; console.error('weekly-email send failed:', email, r.status, await r.text().catch(() => '')) }
      } catch (e) {
        failed++; console.error('weekly-email error:', email, e.message)
      }
    }

    console.log(`weekly-email ${range}: sent ${sent}, failed ${failed}, skipped ${skipped}`)
    return res.status(200).json({ range, sent, failed, skipped })
  } catch (e) {
    console.error('weekly-email fatal:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
