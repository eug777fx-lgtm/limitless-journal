// Weekly performance window + per-user stat builder — the single source of truth
// for the weekly report. Extracted verbatim from api/weekly-email.js so the cron
// AND api/admin-broadcast.js compute identical stats. (Window is the current
// week, Mon–Sat in UTC, matching the original cron.)

function mondayUTC() {
  const now = new Date()
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7))
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}
const fmtDay = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

// { since: 'YYYY-MM-DD' (Monday), range: 'Jun 16 — Jun 21' (Mon–Sat) }
export function weeklyWindow() {
  const monday = mondayUTC()
  const since = monday.toISOString().slice(0, 10)
  const sat = new Date(monday); sat.setUTCDate(monday.getUTCDate() + 5)
  return { since, range: `${fmtDay(monday)} — ${fmtDay(sat)}` }
}

// `ts` = array of this week's trades for ONE user ({ pnl, rr, symbol }).
// Returns the stats object consumed by weeklyProfitableEmail / weeklyLosingEmail.
export function buildWeeklyStats(ts, range) {
  const count = ts.length
  const net = ts.reduce((a, t) => a + (Number(t.pnl) || 0), 0)
  const wins = ts.filter((t) => (Number(t.pnl) || 0) > 0).length
  const losses = ts.filter((t) => (Number(t.pnl) || 0) < 0).length
  const rrs = ts.map((t) => Number(t.rr)).filter((v) => Number.isFinite(v) && v > 0)
  const avgRR = rrs.length ? rrs.reduce((a, b) => a + b, 0) / rrs.length : 0
  let best = null
  for (const t of ts) {
    const v = Number(t.pnl) || 0
    if (best === null || v > best.pnl) best = { pnl: v, symbol: t.symbol || '' }
  }
  const symCount = {}; for (const t of ts) { if (t.symbol) symCount[t.symbol] = (symCount[t.symbol] || 0) + 1 }
  const mostTraded = Object.entries(symCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  return {
    pnl: net, winRate: count ? Math.round((wins / count) * 100) : 0, trades: count, avgRR,
    bestTrade: count ? best.pnl : null, wins, losses, mostTraded, dateRange: range,
  }
}
