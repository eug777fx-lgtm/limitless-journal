// LIMITLESS v3 data engine. Maps rows from public.trades into the shape the
// glass screens use, and computes every stat from the trader's real history.

export const SESSIONS = ['New York', 'London', 'Asian', 'Overlap']
export const STATES = ['Focused', 'Patient', 'Confident', 'Disciplined', 'Anxious', 'Tired', 'FOMO', 'Revenge']
export const STATES_GOOD = new Set(['Focused', 'Patient', 'Confident', 'Disciplined', 'Calm', 'Neutral'])
export const RATINGS = ['A+ Setup', 'A Setup', 'B Setup', 'C Setup']
export const TAGS = ['ICT Setup', 'Liquidity Sweep', 'FVG', 'OTE', 'Rejection Block', 'News Trade', 'Revenge Trade']
export const QUICK_SYMBOLS = ['NQ', 'MNQ', 'ES', 'MES', 'YM', 'GC', 'CL', 'EUR/USD', 'GBP/USD', 'XAU/USD', 'BTC/USD']
const RATING_SET = new Set(['A+ Setup', 'A Setup', 'B Setup', 'C Setup'])

export function parseShots(raw) {
  if (!raw) return []
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return p.filter((u) => typeof u === 'string' && u.startsWith('http'))
    if (typeof p === 'string' && p.startsWith('http')) return [p]
    return []
  } catch {
    return typeof raw === 'string' && raw.startsWith('http') ? [raw] : []
  }
}

const n = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v))

// public.trades row -> screen trade
export function toView(t) {
  const pnl = n(t.pnl) || 0
  const rr = n(t.rr)
  const tags = Array.isArray(t.tags) ? t.tags : []
  const setup = tags.find((g) => !RATING_SET.has(g) && g !== 'Revenge Trade') || 'Untagged'
  return {
    id: t.id,
    raw: t,
    date: t.trade_date || (t.created_at || '').slice(0, 10),
    symbol: t.symbol || '—',
    side: t.direction || '—',
    pnl,
    r: rr === null ? null : pnl < 0 ? -Math.abs(rr) : Math.abs(rr),
    rr,
    session: t.session || null,
    state: t.emotional_state || null,
    rating: t.trade_rating || null,
    setup,
    tags,
    plan: t.followed_plan || null, // YES | PARTIALLY | NO
    reason: t.entry_reason || '',
    right: t.did_correctly || '',
    wrong: t.did_wrong || '',
    note: t.notes || '',
    entry: n(t.entry),
    exit: n(t.exit),
    shots: parseShots(t.chart_url),
    created: t.created_at || '',
  }
}

// ── Dates (local) ──
const pad = (x) => String(x).padStart(2, '0')
export const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayISO = () => isoLocal(new Date())
export const monthKey = (iso) => iso.slice(0, 7)
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const parse = (iso) => new Date(iso + 'T12:00:00')
export const dayLabel = (iso, long = false) => {
  if (!iso) return ''
  const d = parse(iso)
  const base = `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`
  return long ? `${DOW[d.getDay()]}, ${base}` : base
}
export const monthLabel = (ym, long = true) => {
  const [y, m] = ym.split('-').map(Number)
  return long ? `${MONTH_LONG[m - 1]} ${y}` : MONTH_NAMES[m - 1]
}
export const shiftMonth = (ym, k) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + k, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

// ── Stats ──
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0)

export function computeStats(trades, now = new Date()) {
  const today = isoLocal(now)
  const thisMonth = today.slice(0, 7)
  const wins = trades.filter((t) => t.pnl > 0)
  const losses = trades.filter((t) => t.pnl < 0)
  const byDay = {}
  trades.forEach((t) => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl })
  const days = Object.keys(byDay).sort()

  const month = trades.filter((t) => t.date.slice(0, 7) === thisMonth)
  const monthNet = sum(month, (t) => t.pnl)
  const monthDays = days.filter((d) => d.slice(0, 7) === thisMonth)

  // equity across the whole history, one point per trading day
  let run = 0, peak = 0, maxDD = 0
  const equityAll = [{ date: days[0] ? days[0] : today, value: 0, start: true }]
  days.forEach((d) => {
    run += byDay[d]; peak = Math.max(peak, run); maxDD = Math.max(maxDD, peak - run)
    equityAll.push({ date: d, value: run, day: byDay[d] })
  })

  const withR = trades.filter((t) => t.r !== null)
  const group = (keyFn, keys) => {
    const m = {}
    trades.forEach((t) => {
      const k = keyFn(t)
      if (k === null || k === undefined) return
      if (!m[k]) m[k] = { key: k, n: 0, wins: 0, net: 0, r: 0, nr: 0 }
      m[k].n++; m[k].net += t.pnl; if (t.pnl > 0) m[k].wins++
      if (t.r !== null) { m[k].r += t.r; m[k].nr++ }
    })
    const list = (keys || Object.keys(m)).map((k) => m[k] || { key: k, n: 0, wins: 0, net: 0, r: 0, nr: 0 })
    return list.map((g) => ({ ...g, win: g.n ? g.wins / g.n : 0, avgR: g.nr ? g.r / g.nr : null, exp: g.n ? g.net / g.n : 0 }))
  }

  const planned = trades.filter((t) => t.plan)
  const planYes = planned.filter((t) => t.plan === 'YES').length
  const planPart = planned.filter((t) => t.plan === 'PARTIALLY').length
  const planNo = planned.filter((t) => t.plan === 'NO').length
  const offPlanNet = sum(trades.filter((t) => t.plan === 'NO' || t.plan === 'PARTIALLY'), (t) => t.pnl)

  const share = (f) => (trades.length ? trades.filter(f).length / trades.length : 0)
  const review = {
    reason: share((t) => t.reason.trim().length > 0),
    rightWrong: share((t) => t.right.trim().length > 0 || t.wrong.trim().length > 0),
    emotion: share((t) => !!t.state),
    shots: share((t) => t.shots.length > 0),
  }

  // R distribution, only trades with an R logged
  const bins = [
    { label: '≤ −1R', test: (r) => r <= -1, loss: true },
    { label: '−1R to 0', test: (r) => r > -1 && r < 0, loss: true },
    { label: '0 to 1R', test: (r) => r >= 0 && r < 1 },
    { label: '1R to 2R', test: (r) => r >= 1 && r < 2 },
    { label: '2R to 3R', test: (r) => r >= 2 && r < 3 },
    { label: '> 3R', test: (r) => r >= 3 },
  ].map((b) => ({ ...b, n: withR.filter((t) => b.test(t.r)).length }))

  // weekday x session
  const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const heat = wd.map((d) => ({ day: d, cells: SESSIONS.map(() => 0), counts: SESSIONS.map(() => 0) }))
  trades.forEach((t) => {
    const dow = parse(t.date).getDay()
    const si = SESSIONS.indexOf(t.session)
    if (dow >= 1 && dow <= 5 && si >= 0) { heat[dow - 1].cells[si] += t.pnl; heat[dow - 1].counts[si]++ }
  })

  const byMonth = {}
  trades.forEach((t) => { const k = t.date.slice(0, 7); byMonth[k] = (byMonth[k] || 0) + t.pnl })

  const grossWin = sum(wins, (t) => t.pnl)
  const grossLoss = -sum(losses, (t) => t.pnl)
  const net = grossWin - grossLoss
  return {
    n: trades.length, wins: wins.length, losses: losses.length,
    net, grossWin, grossLoss,
    winRate: trades.length ? wins.length / trades.length : 0,
    pf: grossLoss ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    avgR: withR.length ? sum(withR, (t) => t.r) / withR.length : null,
    nR: withR.length,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    expectancy: trades.length ? net / trades.length : 0,
    byDay, days, equityAll, maxDD, byMonth,
    today, thisMonth, todayNet: byDay[today] || 0, todayTrades: trades.filter((t) => t.date === today),
    month, monthNet, monthDays,
    monthGreen: monthDays.filter((d) => byDay[d] > 0).length,
    monthRed: monthDays.filter((d) => byDay[d] < 0).length,
    setups: group((t) => t.setup).sort((a, b) => b.net - a.net),
    grades: group((t) => t.rating, RATINGS).filter((g) => g.n),
    symbols: group((t) => t.symbol).sort((a, b) => b.net - a.net),
    sessions: group((t) => t.session, SESSIONS),
    states: group((t) => t.state).filter((s) => s.n).sort((a, b) => b.net - a.net),
    plan: { answered: planned.length, yes: planYes, partly: planPart, no: planNo, offPlanNet, score: planned.length ? Math.round((planYes / planned.length) * 100) : null },
    review, bins, heat, sessionsList: SESSIONS,
  }
}

export function insights(s) {
  const out = []
  const top = s.setups.find((g) => g.key !== 'Untagged' && g.n >= 2)
  if (top && top.net > 0) out.push({ kind: 'Your edge', strong: true, title: `${top.key} is your best setup.`, body: `${top.n} trades, ${Math.round(top.win * 100)}% win${top.avgR !== null ? `, ${fmtR(top.avgR)} on average` : ''}. It made ${money(top.net)} in total.` })
  const worstState = [...s.states].sort((a, b) => a.net - b.net)[0]
  if (worstState && worstState.net < 0) out.push({ kind: 'Your leak', title: `${worstState.key} trades cost you ${money(-worstState.net, false)}.`, body: `${worstState.n} trades at ${Math.round(worstState.win * 100)}% win. Tag your state on every trade to keep this honest.` })
  if (s.plan.answered >= 3 && s.plan.offPlanNet < 0) out.push({ kind: 'Plan check', title: `Trading off plan cost ${money(-s.plan.offPlanNet, false)}.`, body: `You followed your plan on ${s.plan.yes} of ${s.plan.answered} trades you rated. The rest are where the money leaked.` })
  const bestSession = [...s.sessions].filter((x) => x.n >= 2).sort((a, b) => b.net - a.net)[0]
  if (out.length < 3 && bestSession && bestSession.net > 0) out.push({ kind: 'Best window', title: `${bestSession.key} is your best session.`, body: `${bestSession.n} trades, ${Math.round(bestSession.win * 100)}% win, ${money(bestSession.net)} net.` })
  if (out.length < 3 && s.review.reason < 0.6 && s.n >= 5) out.push({ kind: 'Habit', title: 'Write the reason on every trade.', body: `Only ${Math.round(s.review.reason * 100)}% of your trades have an entry reason. Without it, the review is guesswork.` })
  return out.slice(0, 3)
}

// ── Formatting ──
export const money = (v, signed = true, cents = false) => {
  const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })
  if (!signed) return '$' + abs
  return (v > 0 ? '+$' : v < 0 ? '−$' : '$') + abs
}
export const compact = (v) => {
  const a = Math.abs(v)
  const s = a >= 1000 ? `${(a / 1000).toFixed(a >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : `${Math.round(a)}`
  return (v > 0 ? '+' : v < 0 ? '−' : '') + s
}
export const fmtR = (r, d = 2) => (r === null || r === undefined ? '—' : (r >= 0 ? '+' : '−') + Math.abs(r).toFixed(d) + 'R')
export const pct = (x, d = 0) => (x * 100).toFixed(d) + '%'

// ── CSV ──
const CSV_COLS = ['trade_date', 'symbol', 'direction', 'pnl', 'rr', 'session', 'emotional_state', 'trade_rating', 'followed_plan', 'entry', 'exit', 'tags', 'entry_reason', 'did_correctly', 'did_wrong', 'notes']
const esc = (v) => {
  if (v === null || v === undefined) return ''
  const s = Array.isArray(v) ? v.join('|') : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export function tradesToCSV(rows) {
  return [CSV_COLS.join(','), ...rows.map((t) => CSV_COLS.map((c) => esc(t[c])).join(','))].join('\n')
}
// RFC 4180-ish parser (quotes, commas and newlines inside quotes)
export function parseCSV(text) {
  const rows = []
  let row = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  const clean = rows.filter((r) => r.some((x) => x.trim() !== ''))
  if (!clean.length) return []
  const head = clean[0].map((h) => h.trim().toLowerCase())
  const pick = (r, ...names) => { for (const nm of names) { const i = head.indexOf(nm); if (i >= 0 && r[i] !== undefined && r[i].trim() !== '') return r[i].trim() } return '' }
  return clean.slice(1).map((r) => {
    const num = (v) => (v === '' || Number.isNaN(Number(v.replace(/[$,]/g, ''))) ? null : Number(v.replace(/[$,]/g, '')))
    const date = pick(r, 'trade_date', 'date')
    const d = date ? new Date(date) : null
    return {
      trade_date: d && !Number.isNaN(d.getTime()) ? (/^\d{4}-\d{2}-\d{2}$/.test(date) ? date : isoLocal(d)) : null,
      symbol: pick(r, 'symbol', 'instrument', 'ticker'),
      direction: (() => { const s = pick(r, 'direction', 'side').toLowerCase(); return s.startsWith('l') || s === 'buy' ? 'Long' : s.startsWith('s') || s === 'sell' ? 'Short' : null })(),
      pnl: num(pick(r, 'pnl', 'p&l', 'profit', 'net pnl', 'realized pnl')),
      rr: num(pick(r, 'rr', 'r', 'r:r', 'r multiple')),
      session: pick(r, 'session') || null,
      emotional_state: pick(r, 'emotional_state', 'emotion', 'state') || null,
      trade_rating: pick(r, 'trade_rating', 'rating', 'grade') || null,
      followed_plan: (() => { const s = pick(r, 'followed_plan', 'plan').toUpperCase(); return ['YES', 'NO', 'PARTIALLY'].includes(s) ? s : null })(),
      entry: num(pick(r, 'entry', 'entry price')),
      exit: num(pick(r, 'exit', 'exit price')),
      tags: (() => { const s = pick(r, 'tags'); return s ? s.split(/[|;]/).map((x) => x.trim()).filter(Boolean) : null })(),
      entry_reason: pick(r, 'entry_reason', 'reason') || null,
      did_correctly: pick(r, 'did_correctly') || null,
      did_wrong: pick(r, 'did_wrong') || null,
      notes: pick(r, 'notes', 'note', 'comment') || null,
    }
  }).filter((t) => t.symbol)
}
