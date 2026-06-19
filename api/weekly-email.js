// Weekly performance email — runs via Vercel Cron (see vercel.json: Sun 20:00 UTC).
// Reads every approved user + their trades for the current week and emails each a
// personalized recap via Resend. Uses the Supabase service role to bypass RLS.
//   Env: RESEND_API_KEY, SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
//   Optional: WEEKLY_FROM_EMAIL, CRON_SECRET (if set, request must send it)

const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const usd = (n) => { const v = Math.round(Number(n) || 0); return `${v >= 0 ? '+' : '−'}$${Math.abs(v).toLocaleString()}` }
const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))

const sb = (path) => fetch(`${SUPA_URL}/rest/v1/${path}`, {
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
}).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${path}: ${r.status}`))))

function weekStartISO() {
  const now = new Date()
  const day = now.getUTCDay() // 0 Sun
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7))
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

function statCard(label, value, color) {
  return `<td style="padding:14px;background:#0d0d0d;border:1px solid #1f1f1f;border-radius:12px;text-align:center">
    <div style="font-size:10px;letter-spacing:0.1em;color:#666;text-transform:uppercase">${label}</div>
    <div style="font-size:20px;font-weight:800;color:${color || '#fff'};margin-top:6px">${value}</div></td>`
}

function emailHtml(name, s) {
  const pnlColor = s.pnl >= 0 ? '#aaffa0' : '#ff8080'
  return `<!doctype html><html><body style="margin:0;background:#080808;font-family:-apple-system,Segoe UI,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px">
      <div style="font-size:11px;letter-spacing:0.2em;color:#aaffa0;text-transform:uppercase;font-weight:700">LIMITLESS</div>
      <h1 style="color:#fff;font-size:24px;margin:10px 0 4px">Your Week in Review</h1>
      <p style="color:#888;font-size:13px;margin:0 0 22px">${esc(name) ? `Hey ${esc(name)} — ` : ''}here's how your trading week went.</p>
      <table style="width:100%;border-collapse:separate;border-spacing:8px"><tr>
        ${statCard('Net P&L', usd(s.pnl), pnlColor)}
        ${statCard('Win Rate', `${s.winRate}%`)}
        ${statCard('Trades', String(s.count))}
      </tr></table>
      <table style="width:100%;border-collapse:collapse;margin-top:14px;background:#0d0d0d;border:1px solid #1f1f1f;border-radius:12px">
        <tr><td style="padding:10px 16px;color:#888;font-size:13px">Best trade</td><td style="padding:10px 16px;color:#aaffa0;font-size:13px;font-weight:700;text-align:right">${s.best != null ? usd(s.best) : '—'}</td></tr>
        <tr><td style="padding:10px 16px;color:#888;font-size:13px;border-top:1px solid #161616">Worst trade</td><td style="padding:10px 16px;color:#ff8080;font-size:13px;font-weight:700;text-align:right;border-top:1px solid #161616">${s.worst != null ? usd(s.worst) : '—'}</td></tr>
      </table>
      <a href="https://app.limitless-journal.com" style="display:inline-block;margin-top:22px;background:#fff;color:#000;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px">Open LIMITLESS →</a>
      <p style="color:#444;font-size:11px;margin-top:26px">${s.count === 0 ? 'No trades logged this week — a fresh start awaits.' : 'Review your trades, fix the leaks, stay consistent.'}</p>
    </div>
  </body></html>`
}

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !SUPA_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing RESEND_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' })
  }
  const from = process.env.WEEKLY_FROM_EMAIL || 'LIMITLESS <noreply@limitless-journal.com>'
  const dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  try {
    const since = weekStartISO()
    const [profiles, trades] = await Promise.all([
      sb(`profiles?status=eq.approved&select=id,username,first_name`),
      sb(`trades?trade_date=gte.${since}&select=user_id,pnl`),
    ])
    // emails come from the auth.users mirror exposed by admin_users_view (has email)
    const usersView = await sb(`admin_users_view?select=id,email`).catch(() => [])
    const emailById = new Map((usersView || []).map((u) => [u.id, u.email]))

    const byUser = new Map()
    for (const t of trades) {
      if (!byUser.has(t.user_id)) byUser.set(t.user_id, [])
      byUser.get(t.user_id).push(Number(t.pnl) || 0)
    }

    const jobs = []
    for (const p of profiles) {
      const email = emailById.get(p.id)
      if (!email) continue
      const pnls = byUser.get(p.id) || []
      const wins = pnls.filter((v) => v > 0).length
      const s = {
        count: pnls.length,
        pnl: pnls.reduce((a, b) => a + b, 0),
        winRate: pnls.length ? Math.round((wins / pnls.length) * 100) : 0,
        best: pnls.length ? Math.max(...pnls) : null,
        worst: pnls.length ? Math.min(...pnls) : null,
      }
      const name = p.first_name || p.username || ''
      jobs.push(fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ from, to: email, subject: `Your LIMITLESS Week in Review — ${dateLabel}`, html: emailHtml(name, s) }),
      }))
    }

    const results = await Promise.allSettled(jobs)
    const sent = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length
    return res.status(200).json({ sent, total: jobs.length })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
