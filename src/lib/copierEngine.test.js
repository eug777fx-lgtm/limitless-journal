// Unit tests for the pure copier engine.
// Run with:  node --test src/lib/copierEngine.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeSymbol, pointValue, computeFollowerSize, checkFilters,
  projectPnl, simulateCopy, evaluateRules, resolveRules,
  checkFillViolations, riskOfRuin, payoutStatus,
} from './copierEngine.js'

// ── symbol handling ──────────────────────────────────────────────────────────
test('normalizeSymbol extracts the root symbol', () => {
  assert.equal(normalizeSymbol('NQ (E-mini NASDAQ)'), 'NQ')
  assert.equal(normalizeSymbol('mnq'), 'MNQ')
  assert.equal(normalizeSymbol(''), '')
  assert.equal(pointValue('MNQ (Micro NASDAQ)'), 2)
  assert.equal(pointValue('ES'), 50)
})

// ── size mapping: fixed ─────────────────────────────────────────────────────
test('fixed mode returns the configured contracts, clamped by maxSize', () => {
  assert.equal(computeFollowerSize({ mode: 'fixed', fixedContracts: 3 }), 3)
  assert.equal(computeFollowerSize({ mode: 'fixed', fixedContracts: 7, maxSize: 5 }), 5)
  assert.equal(computeFollowerSize({ mode: 'fixed', fixedContracts: -2 }), 0)
})

// ── size mapping: proportional ──────────────────────────────────────────────
test('proportional mode scales by balance ratio', () => {
  // follower has 2x the master balance → 2x the contracts
  assert.equal(computeFollowerSize({
    mode: 'proportional', masterSize: 2, masterBalance: 50000, followerBalance: 100000,
  }), 4)
  // half the balance → half the contracts (rounded)
  assert.equal(computeFollowerSize({
    mode: 'proportional', masterSize: 3, masterBalance: 100000, followerBalance: 50000,
  }), 2) // 1.5 rounds to 2
  // zero master balance → 0 (no divide-by-zero)
  assert.equal(computeFollowerSize({
    mode: 'proportional', masterSize: 3, masterBalance: 0, followerBalance: 50000,
  }), 0)
})

// ── size mapping: risk % ────────────────────────────────────────────────────
test('risk mode sizes off stop distance and point value', () => {
  // 1% of 50k = $500 risk. Stop 10 pts on NQ ($20/pt) = $200/contract → 2 contracts
  assert.equal(computeFollowerSize({
    mode: 'risk', followerBalance: 50000, riskPct: 1, stopPoints: 10, pointVal: 20,
  }), 2)
  // no stop distance → cannot size → 0
  assert.equal(computeFollowerSize({
    mode: 'risk', followerBalance: 50000, riskPct: 1, stopPoints: 0, pointVal: 20,
  }), 0)
  // clamped by maxSize
  assert.equal(computeFollowerSize({
    mode: 'risk', followerBalance: 500000, riskPct: 2, stopPoints: 5, pointVal: 2, maxSize: 20,
  }), 20)
})

// ── filters ─────────────────────────────────────────────────────────────────
test('symbol allowlist blocks non-listed symbols', () => {
  const link = { symbolsAllowed: ['NQ', 'MNQ'] }
  assert.equal(checkFilters({ symbol: 'NQ (E-mini NASDAQ)' }, link).allowed, true)
  assert.equal(checkFilters({ symbol: 'GC' }, link).allowed, false)
  // empty allowlist = everything allowed
  assert.equal(checkFilters({ symbol: 'GC' }, { symbolsAllowed: [] }).allowed, true)
})

test('trading-hours window gates fills (incl. overnight windows)', () => {
  const at = (h, m) => new Date(2026, 6, 7, h, m)
  const day = { hours: { start: '09:30', end: '16:00' } }
  assert.equal(checkFilters({ symbol: 'NQ' }, day, { now: at(10, 0) }).allowed, true)
  assert.equal(checkFilters({ symbol: 'NQ' }, day, { now: at(8, 0) }).allowed, false)
  const overnight = { hours: { start: '18:00', end: '09:00' } }
  assert.equal(checkFilters({ symbol: 'NQ' }, overnight, { now: at(23, 0) }).allowed, true)
  assert.equal(checkFilters({ symbol: 'NQ' }, overnight, { now: at(12, 0) }).allowed, false)
})

test('news blackout blocks inside windows', () => {
  const link = { newsBlackout: true }
  const now = new Date('2026-07-07T14:30:00Z')
  const windows = [{ start: '2026-07-07T14:25:00Z', end: '2026-07-07T14:35:00Z' }]
  assert.equal(checkFilters({ symbol: 'NQ' }, link, { now, newsWindows: windows }).allowed, false)
  assert.equal(checkFilters({ symbol: 'NQ' }, link, { now: new Date('2026-07-07T15:00:00Z'), newsWindows: windows }).allowed, true)
})

// ── projected PnL ───────────────────────────────────────────────────────────
test('projectPnl handles direction and size', () => {
  assert.equal(projectPnl({ direction: 'Long', entry: 100, exit: 110, size: 2, pointVal: 20 }), 400)
  assert.equal(projectPnl({ direction: 'Short', entry: 100, exit: 110, size: 2, pointVal: 20 }), -400)
  assert.equal(projectPnl({ direction: 'Long', entry: 100, exit: null }), null)
})

// ── simulateCopy end-to-end ─────────────────────────────────────────────────
test('simulateCopy produces per-follower fills and blocks', () => {
  const master = { id: 'm', balance: 50000 }
  const followers = [
    { id: 'f1', balance: 100000 },
    { id: 'f2', balance: 50000 },
  ]
  const links = [
    { followerId: 'f1', mode: 'proportional' },
    { followerId: 'f2', mode: 'fixed', fixedContracts: 1, symbolsAllowed: ['GC'] },
  ]
  const trade = { id: 't1', symbol: 'NQ', direction: 'Long', entry: 20000, exit: 20010, size: 2, rMultiple: 2 }
  const res = simulateCopy(trade, master, followers, links)
  assert.equal(res.length, 2)
  const f1 = res.find(r => r.accountId === 'f1')
  assert.equal(f1.status, 'simulated')
  assert.equal(f1.size, 4)                        // 2 × (100k/50k)
  assert.equal(f1.projectedPnl, 10 * 4 * 20)      // 10 pts × 4 × $20
  assert.equal(f1.copiedFrom, 't1')
  const f2 = res.find(r => r.accountId === 'f2')
  assert.equal(f2.status, 'blocked')              // NQ not in GC allowlist
  assert.match(f2.reason, /allowlist/)
})

// ── risk guardian ───────────────────────────────────────────────────────────
test('evaluateRules flags breaches with excess amounts', () => {
  const rules = resolveRules('topstep') // 4% trailing, 2% daily, 50% consistency, 5 max
  const account = { startingBalance: 50000, currentEquity: 47500 } // 2.5k DD vs 2k limit
  const res = evaluateRules(account, rules, { dayPnl: -1500, bestDayProfit: 900, totalProfit: 1000, contractsOpen: 6 })
  const dd = res.find(r => r.rule === 'trailing_dd')
  assert.equal(dd.ok, false)
  assert.equal(dd.excess, 500)
  const dl = res.find(r => r.rule === 'daily_loss')
  assert.equal(dl.ok, false)                      // 1500 used vs 1000 limit
  assert.equal(dl.excess, 500)
  const cons = res.find(r => r.rule === 'consistency')
  assert.equal(cons.ok, false)                    // 90% > 50%
  const mc = res.find(r => r.rule === 'max_contracts')
  assert.equal(mc.ok, false)                      // 6 > 5
})

test('checkFillViolations projects a fill against the budgets', () => {
  const rules = resolveRules('topstep')
  const account = { startingBalance: 50000, currentEquity: 50000 }
  // Day is at -800; a fill losing another 400 pushes past the $1000 daily limit
  const violations = checkFillViolations(account, rules, { dayPnl: -800, bestDayProfit: 0, totalProfit: 0 }, { size: 2, projectedPnl: -400 })
  assert.ok(violations.some(v => v.rule === 'daily_loss' && v.excess === 200))
})

// ── risk of ruin ────────────────────────────────────────────────────────────
test('riskOfRuin behaves at the boundaries and monotonically', () => {
  // negative edge → certain ruin
  assert.equal(riskOfRuin({ winRate: 30, avgWinR: 1, avgLossR: 1 }), 1)
  // positive edge → ruin < 1, and shrinks with smaller risk per trade
  const big = riskOfRuin({ winRate: 55, avgWinR: 1.5, avgLossR: 1, riskPerTradePct: 2, ruinDDPct: 10 })
  const small = riskOfRuin({ winRate: 55, avgWinR: 1.5, avgLossR: 1, riskPerTradePct: 0.5, ruinDDPct: 10 })
  assert.ok(big > 0 && big < 1)
  assert.ok(small < big)
  // better win rate → lower ruin
  const better = riskOfRuin({ winRate: 65, avgWinR: 1.5, avgLossR: 1, riskPerTradePct: 2, ruinDDPct: 10 })
  assert.ok(better < big)
})

// ── payout status ───────────────────────────────────────────────────────────
test('payoutStatus computes eligibility and trader cut', () => {
  const ok = payoutStatus({ daysTraded: 10, minDays: 8, profit: 3000, threshold: 2000, split: 90, consistencyOk: true })
  assert.equal(ok.daysLeft, 0)
  assert.equal(ok.safe, true)
  assert.equal(ok.traderCut, 2700)
  const notYet = payoutStatus({ daysTraded: 5, minDays: 8, profit: 3000, threshold: 2000 })
  assert.equal(notYet.daysLeft, 3)
  assert.equal(notYet.safe, false)
})
