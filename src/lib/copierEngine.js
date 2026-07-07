// ═══════════════════════════════════════════════════════════════════════════
//  copierEngine — pure simulation/copy math for TradeSync.
//  No React, no Supabase, no side effects → unit-testable with plain node.
//
//  Concepts:
//   · A LINK maps a master account to one follower with sizing + filters:
//     { followerId, mode: 'fixed'|'proportional'|'risk',
//       fixedContracts, riskPct, maxSize, symbolsAllowed: [],
//       hours: { start: 'HH:MM', end: 'HH:MM' } | null,
//       newsBlackout: boolean }
//   · simulateCopy() answers: "the master logged this trade — what would each
//     follower have executed?" and returns per-follower fills or blocks.
//   · Rule presets + evaluateRules() power the Risk Guardian tab.
// ═══════════════════════════════════════════════════════════════════════════

// $ per full point per contract for common futures symbols
export const POINT_VALUES = {
  NQ: 20, MNQ: 2, ES: 50, MES: 5, YM: 5, MYM: 0.5,
  RTY: 50, M2K: 5, CL: 1000, GC: 100, SI: 5000,
}

const num = (v, fb = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fb }

// 'NQ (E-mini NASDAQ)' → 'NQ' · 'mnq' → 'MNQ'
export function normalizeSymbol(sym) {
  if (!sym) return ''
  const m = String(sym).trim().toUpperCase().match(/^[A-Z0-9]+/)
  return m ? m[0] : ''
}

export function pointValue(sym, fallback = 20) {
  return POINT_VALUES[normalizeSymbol(sym)] ?? fallback
}

// ── size mapping ─────────────────────────────────────────────────────────────
// Returns an integer contract count ≥ 0 (already clamped by link.maxSize).
export function computeFollowerSize({
  mode = 'fixed',
  masterSize = 1,
  masterBalance = 0,
  followerBalance = 0,
  fixedContracts = 1,
  riskPct = 1,
  stopPoints = 0,
  pointVal = 20,
  maxSize = Infinity,
}) {
  let size = 0
  if (mode === 'fixed') {
    size = Math.floor(num(fixedContracts))
  } else if (mode === 'proportional') {
    const mb = num(masterBalance)
    size = mb > 0 ? Math.round(num(masterSize) * num(followerBalance) / mb) : 0
  } else if (mode === 'risk') {
    const riskDollars = num(followerBalance) * num(riskPct) / 100
    const perContractRisk = num(stopPoints) * num(pointVal)
    size = perContractRisk > 0 ? Math.floor(riskDollars / perContractRisk) : 0
  }
  const cap = num(maxSize, Infinity)
  if (Number.isFinite(cap) && cap >= 0) size = Math.min(size, Math.floor(cap))
  return Math.max(0, size)
}

// ── per-follower filters ─────────────────────────────────────────────────────
// opts: { now?: Date, newsWindows?: [{start: ISO, end: ISO}] }
export function checkFilters(order, link, opts = {}) {
  const sym = normalizeSymbol(order.symbol)

  const allow = link.symbolsAllowed
  if (Array.isArray(allow) && allow.length > 0) {
    const ok = allow.map(normalizeSymbol).includes(sym)
    if (!ok) return { allowed: false, reason: `symbol ${sym || '?'} not in allowlist` }
  }

  if (link.hours && link.hours.start && link.hours.end) {
    const now = opts.now instanceof Date ? opts.now : new Date()
    const mins = now.getHours() * 60 + now.getMinutes()
    const [sh, sm] = String(link.hours.start).split(':').map(Number)
    const [eh, em] = String(link.hours.end).split(':').map(Number)
    const start = sh * 60 + (sm || 0), end = eh * 60 + (em || 0)
    const inWindow = start <= end
      ? (mins >= start && mins <= end)
      : (mins >= start || mins <= end) // overnight window (e.g. 18:00 → 09:00)
    if (!inWindow) return { allowed: false, reason: `outside trading hours ${link.hours.start}–${link.hours.end}` }
  }

  if (link.newsBlackout && Array.isArray(opts.newsWindows)) {
    const now = (opts.now instanceof Date ? opts.now : new Date()).getTime()
    const hit = opts.newsWindows.find(w => {
      const s = new Date(w.start).getTime(), e = new Date(w.end).getTime()
      return Number.isFinite(s) && Number.isFinite(e) && now >= s && now <= e
    })
    if (hit) return { allowed: false, reason: 'news blackout window' }
  }

  return { allowed: true, reason: null }
}

// ── projected PnL for a fill ────────────────────────────────────────────────
export function projectPnl({ direction = 'Long', entry, exit, size = 1, pointVal = 20 }) {
  if (entry == null || exit == null) return null
  const dir = direction === 'Short' ? -1 : 1
  return (num(exit) - num(entry)) * dir * num(size) * num(pointVal)
}

// ── the copier core ─────────────────────────────────────────────────────────
// masterTrade: { symbol, direction, entry, exit, size, stopPoints?, rMultiple? }
// master:     { id, balance }   followers: [{ id, balance }]
// links:      [{ followerId, ...sizing/filters }]
// Returns [{ accountId, status: 'simulated'|'blocked', size, entry, exit,
//            projectedPnl, rMultiple, reason, copiedFrom }]
export function simulateCopy(masterTrade, master, followers, links, opts = {}) {
  const pv = opts.pointVal ?? pointValue(masterTrade.symbol)
  const results = []
  for (const link of links || []) {
    const follower = (followers || []).find(f => f.id === link.followerId)
    if (!follower) continue

    const gate = checkFilters(masterTrade, link, opts)
    if (!gate.allowed) {
      results.push({
        accountId: follower.id, status: 'blocked', size: 0,
        entry: masterTrade.entry ?? null, exit: masterTrade.exit ?? null,
        projectedPnl: 0, rMultiple: null, reason: gate.reason,
        copiedFrom: masterTrade.id ?? null,
      })
      continue
    }

    const size = computeFollowerSize({
      mode: link.mode,
      masterSize: masterTrade.size ?? 1,
      masterBalance: master?.balance ?? 0,
      followerBalance: follower.balance ?? 0,
      fixedContracts: link.fixedContracts,
      riskPct: link.riskPct,
      stopPoints: masterTrade.stopPoints ?? 0,
      pointVal: pv,
      maxSize: link.maxSize ?? Infinity,
    })

    if (size <= 0) {
      results.push({
        accountId: follower.id, status: 'blocked', size: 0,
        entry: masterTrade.entry ?? null, exit: masterTrade.exit ?? null,
        projectedPnl: 0, rMultiple: null, reason: 'computed size is 0 contracts',
        copiedFrom: masterTrade.id ?? null,
      })
      continue
    }

    results.push({
      accountId: follower.id, status: 'simulated', size,
      entry: masterTrade.entry ?? null, exit: masterTrade.exit ?? null,
      projectedPnl: projectPnl({ direction: masterTrade.direction, entry: masterTrade.entry, exit: masterTrade.exit, size, pointVal: pv }),
      rMultiple: masterTrade.rMultiple ?? null,
      reason: null,
      copiedFrom: masterTrade.id ?? null,
    })
  }
  return results
}

// ═════════════════════════════════════════════════════════════════════════════
//  RISK GUARDIAN — prop-firm rule presets + evaluation
// ═════════════════════════════════════════════════════════════════════════════
// All limits are percentages of starting balance unless stated otherwise.
export const RULE_PRESETS = {
  apex: {
    id: 'apex', label: 'Apex Trader Funding',
    trailingDD: 6,          // % trailing drawdown (intraday trailing on eval)
    dailyLoss: null,        // Apex has no daily loss limit
    consistency: 30,        // best day ≤ 30% of total profit at payout
    maxContracts: 10,       // varies by account size — sensible default
  },
  topstep: {
    id: 'topstep', label: 'TopStep',
    trailingDD: 4,          // (e.g. $2k on 50k)
    dailyLoss: 2,           // (e.g. $1k on 50k)
    consistency: 50,        // best day ≤ 50% of total profit
    maxContracts: 5,
  },
  ftmo: {
    id: 'ftmo', label: 'FTMO',
    trailingDD: 10,         // max overall loss (static, not trailing)
    dailyLoss: 5,
    consistency: null,      // no consistency rule
    maxContracts: null,
  },
  custom: { id: 'custom', label: 'Custom', trailingDD: null, dailyLoss: null, consistency: null, maxContracts: null },
}

export function resolveRules(presetId, custom = {}) {
  const base = RULE_PRESETS[presetId] || RULE_PRESETS.custom
  return { ...base, ...(presetId === 'custom' ? custom : {}), id: base.id }
}

// account: { startingBalance, currentEquity } (numbers)
// stats:   { dayPnl, bestDayProfit, totalProfit, contractsOpen, tradesToday }
// Returns array of { rule, label, ok, value, limit, pct, excess }
export function evaluateRules(account, rules, stats = {}) {
  const start = num(account.startingBalance)
  const eq = num(account.currentEquity, start)
  const out = []

  if (rules.trailingDD != null && start > 0) {
    const limit = start * num(rules.trailingDD) / 100
    const used = Math.max(0, start - eq) // simplified: drawdown vs starting balance
    out.push({
      rule: 'trailing_dd', label: 'Trailing drawdown', ok: used <= limit,
      value: used, limit, pct: limit > 0 ? Math.min(999, used / limit * 100) : 0,
      excess: Math.max(0, used - limit),
    })
  }

  if (rules.dailyLoss != null && start > 0) {
    const limit = start * num(rules.dailyLoss) / 100
    const used = Math.max(0, -num(stats.dayPnl))
    out.push({
      rule: 'daily_loss', label: 'Daily loss limit', ok: used <= limit,
      value: used, limit, pct: limit > 0 ? Math.min(999, used / limit * 100) : 0,
      excess: Math.max(0, used - limit),
    })
  }

  if (rules.consistency != null) {
    const total = num(stats.totalProfit)
    const best = num(stats.bestDayProfit)
    const share = total > 0 ? best / total * 100 : 0
    out.push({
      rule: 'consistency', label: 'Consistency rule', ok: share <= num(rules.consistency),
      value: share, limit: num(rules.consistency),
      pct: rules.consistency > 0 ? Math.min(999, share / rules.consistency * 100) : 0,
      excess: Math.max(0, share - num(rules.consistency)),
    })
  }

  if (rules.maxContracts != null) {
    const open = num(stats.contractsOpen)
    out.push({
      rule: 'max_contracts', label: 'Max contracts', ok: open <= num(rules.maxContracts),
      value: open, limit: num(rules.maxContracts),
      pct: rules.maxContracts > 0 ? Math.min(999, open / rules.maxContracts * 100) : 0,
      excess: Math.max(0, open - num(rules.maxContracts)),
    })
  }

  return out
}

// Which rules WOULD a simulated fill breach? (used for the violation log)
// fill: { size, projectedPnl } — negative projectedPnl consumes loss budgets.
export function checkFillViolations(account, rules, stats, fill) {
  const loss = Math.max(0, -num(fill.projectedPnl))
  const projected = {
    ...stats,
    dayPnl: num(stats.dayPnl) - loss,
    contractsOpen: num(fill.size),
  }
  return evaluateRules(account, rules, projected).filter(r => !r.ok)
}

// ── Risk of Ruin ────────────────────────────────────────────────────────────
// Diffusion approximation: RoR ≈ exp(−2 · E · U / σ²)
//   E  = expectancy per trade in R  (p·b − q)
//   σ² = variance per trade in R    (p·b² + q − E²)
//   U  = ruin distance in R units   (ruinDD% ÷ riskPerTrade%)
// winRate in [0,100], avgWinR = average winner in R, avgLossR = average loser in R (positive).
export function riskOfRuin({ winRate, avgWinR, avgLossR = 1, riskPerTradePct = 1, ruinDDPct = 10 }) {
  const p = Math.min(Math.max(num(winRate) / 100, 0), 1)
  const q = 1 - p
  const b = num(avgLossR) > 0 ? num(avgWinR) / num(avgLossR) : num(avgWinR)
  if (!Number.isFinite(b) || b <= 0) return p >= 1 ? 0 : 1
  const E = p * b - q
  if (E <= 0) return 1
  const variance = p * b * b + q - E * E
  if (variance <= 0) return 0
  const U = num(riskPerTradePct) > 0 ? num(ruinDDPct) / num(riskPerTradePct) : Infinity
  if (!Number.isFinite(U)) return 0
  const ror = Math.exp(-2 * E * U / variance)
  return Math.min(1, Math.max(0, ror))
}

// ── payout math (Payouts tab) ───────────────────────────────────────────────
// cfg: { minDays, split (0-100 kept by trader), threshold, eligibleDate }
export function payoutStatus({ daysTraded = 0, minDays = 8, profit = 0, threshold = 0, split = 90, consistencyOk = true }) {
  const daysLeft = Math.max(0, num(minDays) - num(daysTraded))
  const overThreshold = num(profit) >= num(threshold)
  const safe = daysLeft === 0 && overThreshold && consistencyOk && num(profit) > 0
  const traderCut = Math.max(0, num(profit)) * num(split) / 100
  return { daysLeft, overThreshold, safe, traderCut }
}

// ── scaling / projection math (Scaling + Mission tabs) ─────────────────────
export function projectMonthlyIncome({ avgR, tradesPerMonth, riskPerTradeDollars, split = 90 }) {
  const gross = num(avgR) * num(tradesPerMonth) * num(riskPerTradeDollars)
  return gross * num(split) / 100
}
