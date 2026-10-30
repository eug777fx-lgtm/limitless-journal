// Asia Model v0.1 math: levels, narrative, R and backtest stats.
// Pure functions, no React, so they can be tested on their own.

export const MODEL_VERSION = 'asia-v0.1'
export const STOP_BUFFER = 3 // points beyond 0.79
export const MIN_RR = 3
export const RANGE_MIN = 100
export const RANGE_MAX = 600

const n = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v))
const r2 = (v) => Math.round(v * 100) / 100

// Where the 4:00 PM close sits in the NY range: <0.4 bearish, >0.6 bullish, else none.
export function narrativeFrom(high, low, close) {
  const H = n(high), L = n(low), C = n(close)
  if (H === null || L === null || C === null || H <= L) return { narrative: null, position: null }
  const position = (C - L) / (H - L)
  const narrative = position < 0.4 ? 'bearish' : position > 0.6 ? 'bullish' : 'none'
  return { narrative, position: r2(position) }
}

// Fib levels for the trade direction. Short: measured up from the low (entry in premium).
// Long: measured down from the high (entry in discount).
export function levels(high, low, direction) {
  const H = n(high), L = n(low)
  if (H === null || L === null || H <= L || (direction !== 'long' && direction !== 'short')) return null
  const size = H - L
  const at = (f) => (direction === 'short' ? L + f * size : H - f * size)
  const sign = direction === 'short' ? 1 : -1
  return {
    size: r2(size),
    eq: r2(at(0.5)),
    entry: r2(at(0.705)),
    deep: r2(at(0.79)),
    stop: r2(at(0.79) + sign * STOP_BUFFER),
    rangeOk: size >= RANGE_MIN && size <= RANGE_MAX,
  }
}

// Reward:risk from prices. Positive only when the target is on the right side.
export function rr(entry, stop, target, direction) {
  const E = n(entry), S = n(stop), T = n(target)
  if (E === null || S === null || T === null) return null
  const risk = direction === 'short' ? S - E : E - S
  const reward = direction === 'short' ? E - T : T - E
  if (risk <= 0 || reward <= 0) return null
  return r2(reward / risk)
}

// Realised R for an outcome. A win is worth the planned R:R; a loss is -1.
export function resultR(outcome, plannedRR) {
  if (outcome === 'win') return plannedRR === null || plannedRR === undefined ? null : r2(plannedRR)
  if (outcome === 'loss') return -1
  if (outcome === 'breakeven') return 0
  return null // no_fill, no_trade
}

const FILLED = new Set(['win', 'loss', 'breakeven'])

function summarize(rows) {
  const fills = rows.filter((x) => FILLED.has(x.outcome) && x.result_r !== null && x.result_r !== undefined)
  const R = fills.map((x) => Number(x.result_r))
  const wins = R.filter((v) => v > 0), losses = R.filter((v) => v < 0)
  const gross = (a) => a.reduce((s, v) => s + v, 0)
  const total = gross(R)
  const decided = wins.length + losses.length
  return {
    fills: fills.length,
    wins: wins.length,
    losses: losses.length,
    winRate: decided ? wins.length / decided : null,
    avgWin: wins.length ? gross(wins) / wins.length : null,
    avgLoss: losses.length ? gross(losses) / losses.length : null,
    expectancy: fills.length ? total / fills.length : null,
    profitFactor: losses.length ? gross(wins) / Math.abs(gross(losses)) : wins.length ? Infinity : null,
    totalR: total,
  }
}

// rows: backtest_sessions rows in any order.
export function backtestStats(rows) {
  const sorted = [...(rows || [])].sort((a, b) => (a.session_date + (a.created_at || '')).localeCompare(b.session_date + (b.created_at || '')))
  const base = summarize(sorted)

  // Streaks and drawdown, in session order, over filled trades only
  let run = 0, maxLossStreak = 0, maxWinStreak = 0, win = 0, cum = 0, peak = 0, maxDD = 0
  const curve = []
  for (const x of sorted) {
    if (!FILLED.has(x.outcome) || x.result_r === null || x.result_r === undefined) continue
    const v = Number(x.result_r)
    if (v < 0) { run += 1; win = 0 } else if (v > 0) { win += 1; run = 0 }
    maxLossStreak = Math.max(maxLossStreak, run)
    maxWinStreak = Math.max(maxWinStreak, win)
    cum += v
    peak = Math.max(peak, cum)
    maxDD = Math.max(maxDD, peak - cum)
    curve.push({ date: x.session_date, value: r2(cum) })
  }

  const fills = sorted.filter((x) => FILLED.has(x.outcome))
  const withMfe = fills.filter((x) => x.mfe_r !== null && x.mfe_r !== undefined)
  const ruled = sorted.filter((x) => x.followed_rules === true || x.followed_rules === false)
  const split = (key, labels) => Object.entries(labels).map(([val, label]) => ({ label, ...summarize(sorted.filter((x) => String(x[key]) === val)) }))

  return {
    sessions: sorted.length,
    noTrade: sorted.filter((x) => x.outcome === 'no_trade').length,
    noFill: sorted.filter((x) => x.outcome === 'no_fill').length,
    ...base,
    maxLossStreak, maxWinStreak,
    maxDD: r2(maxDD),
    curve,
    reached4R: withMfe.length ? withMfe.filter((x) => Number(x.mfe_r) >= 4).length / withMfe.length : null,
    mfeSample: withMfe.length,
    ruleRate: ruled.length ? ruled.filter((x) => x.followed_rules).length / ruled.length : null,
    byFvg: split('fvg_at_ote', { true: 'FVG at OTE', false: 'No FVG' }),
    byEntry: split('entry_type', { limit: 'Limit 0.705', ifvg: '1m IFVG', discretionary: 'Discretionary' }),
    byGrade: split('grade', { a_plus: 'A+', valid: 'Valid', invalid: 'Invalid' }),
    bySide: split('direction', { long: 'Long', short: 'Short' }),
  }
}
