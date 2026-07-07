// ═══════════════════════════════════════════════════════════════════════════
//  copierStore — Supabase persistence layer for TradeSync (CopyTrader.jsx)
//
//  Strategy:
//   · localStorage stays as the instant-boot cache + offline fallback.
//   · On first load with a signed-in user we hydrate from Supabase.
//   · If Supabase has no data yet but localStorage does → one-time import
//     (localStorage blobs are pushed up, ids remapped to real uuids).
//   · Every state change is mirrored to localStorage immediately and pushed
//     to Supabase debounced. If the push fails (offline) the local copy is
//     the source of truth until the next successful sync.
// ═══════════════════════════════════════════════════════════════════════════
import { supabase } from './supabase'

// localStorage keys (must match the legacy keys used by CopyTrader.jsx)
export const LS_KEYS = {
  accounts: 'copy_trader_accounts',
  payouts:  'copy_trader_payouts',
  overview: 'copy_trader_overview',
  risk:     'copy_trader_risk',
  scaling:  'copy_trader_scaling',
  mission:  'copy_trader_mission',
  links:    'copy_trader_links',
  trades:   'copy_trader_sim_trades',
  migrated: 'copy_trader_supabase_migrated',
}

export const lsGet = (k, fb) => { try { const s = localStorage.getItem(k); return s == null ? fb : JSON.parse(s) } catch { return fb } }
export const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* unavailable */ } }

const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

// ── shape mapping: UI account ⇄ copier_accounts row ─────────────────────────
export function accountToRow(a, userId) {
  return {
    id: isUuid(a.id) ? a.id : uuid(),
    user_id: userId,
    name: a.name || 'Account',
    broker: a.broker || null,
    platform: a.platform || null,
    account_size: a.startingBalance === '' ? null : Number(a.startingBalance),
    current_balance: a.currentBalance === '' ? null : Number(a.currentBalance),
    status: a.status || 'Active',
    is_master: !!a.isMaster,
    meta: {
      accountType: a.accountType ?? null,
      instrument: a.instrument ?? null,
      currentEquity: a.currentEquity ?? '',
      dailyDDLimit: a.dailyDDLimit ?? '',
      maxDDLimit: a.maxDDLimit ?? '',
      profitTarget: a.profitTarget ?? '',
      notes: a.notes ?? '',
      ruleset: a.ruleset ?? null,          // prop-firm rule preset id (Risk Guardian)
      customRules: a.customRules ?? null,  // overrides when ruleset === 'custom'
      payout: a.payout ?? null,            // { lastPayoutDate, minDays, split, threshold }
    },
  }
}

export function rowToAccount(r) {
  const m = r.meta || {}
  return {
    id: r.id,
    name: r.name || '',
    broker: r.broker || '',
    platform: r.platform || '',
    startingBalance: r.account_size == null ? '' : String(r.account_size),
    currentBalance: r.current_balance == null ? '' : String(r.current_balance),
    status: r.status || 'Active',
    isMaster: !!r.is_master,
    accountType: m.accountType || 'Evaluation (Phase 1)',
    instrument: m.instrument || '',
    currentEquity: m.currentEquity ?? '',
    dailyDDLimit: m.dailyDDLimit ?? '5',
    maxDDLimit: m.maxDDLimit ?? '10',
    profitTarget: m.profitTarget ?? '8',
    notes: m.notes ?? '',
    ruleset: m.ruleset ?? null,
    customRules: m.customRules ?? null,
    payout: m.payout ?? null,
  }
}

export function tradeToRow(t) {
  return {
    id: isUuid(t.id) ? t.id : uuid(),
    account_id: t.accountId,
    symbol: t.symbol || null,
    direction: t.direction === 'Short' ? 'Short' : 'Long',
    entry: t.entry ?? null,
    exit: t.exit ?? null,
    size: t.size ?? null,
    pnl: t.pnl ?? null,
    r_multiple: t.rMultiple ?? null,
    copied_from: isUuid(t.copiedFrom) ? t.copiedFrom : null,
    status: t.status || 'simulated',
    meta: t.violation ? { violation: t.violation } : {},
    opened_at: t.openedAt || new Date().toISOString(),
    closed_at: t.closedAt || null,
  }
}

export function rowToTrade(r) {
  return {
    id: r.id,
    accountId: r.account_id,
    symbol: r.symbol || '',
    direction: r.direction || 'Long',
    entry: r.entry == null ? null : Number(r.entry),
    exit: r.exit == null ? null : Number(r.exit),
    size: r.size == null ? null : Number(r.size),
    pnl: r.pnl == null ? null : Number(r.pnl),
    rMultiple: r.r_multiple == null ? null : Number(r.r_multiple),
    copiedFrom: r.copied_from || null,
    status: r.status || 'simulated',
    violation: r.meta?.violation || null,
    openedAt: r.opened_at,
    closedAt: r.closed_at,
  }
}

// ── load everything for a user ──────────────────────────────────────────────
// Returns { accounts, trades, links, moduleState, source }
export async function loadCopierData(userId) {
  const local = {
    accounts: lsGet(LS_KEYS.accounts, []),
    payouts:  lsGet(LS_KEYS.payouts, []),
    overview: lsGet(LS_KEYS.overview, {}),
    risk:     lsGet(LS_KEYS.risk, {}),
    scaling:  lsGet(LS_KEYS.scaling, {}),
    mission:  lsGet(LS_KEYS.mission, {}),
    links:    lsGet(LS_KEYS.links, []),
    trades:   lsGet(LS_KEYS.trades, []),
  }
  if (!userId) return { ...fromLocal(local), source: 'local' }

  try {
    const [acctRes, setRes] = await Promise.all([
      supabase.from('copier_accounts').select('*').order('created_at', { ascending: true }),
      supabase.from('copier_settings').select('*').eq('user_id', userId).maybeSingle(),
    ])
    if (acctRes.error) throw acctRes.error
    if (setRes.error) throw setRes.error

    const hasRemote = (acctRes.data || []).length > 0 || !!setRes.data
    const migrated = lsGet(LS_KEYS.migrated, false)

    if (!hasRemote && !migrated && (local.accounts.length > 0 || Object.keys(local.overview).length > 0)) {
      // ── one-time localStorage → Supabase import ──
      const imported = await importLocalToSupabase(userId, local)
      lsSet(LS_KEYS.migrated, true)
      return { ...imported, source: 'supabase' }
    }

    const accounts = (acctRes.data || []).map(rowToAccount)
    let trades = []
    if (accounts.length > 0) {
      const tRes = await supabase.from('copier_trades').select('*')
        .in('account_id', accounts.map(a => a.id))
        .order('opened_at', { ascending: false }).limit(500)
      if (!tRes.error) trades = (tRes.data || []).map(rowToTrade)
    }
    const st = setRes.data
    const moduleState = {
      overview: st?.module_state?.overview || local.overview,
      risk:     st?.module_state?.risk     || local.risk,
      scaling:  st?.module_state?.scaling  || local.scaling,
      mission:  st?.module_state?.mission  || local.mission,
      payouts:  st?.module_state?.payouts  || local.payouts,
    }
    const links = Array.isArray(st?.size_mapping) ? st.size_mapping : local.links
    lsSet(LS_KEYS.migrated, true)
    return { accounts, trades, links, moduleState, source: 'supabase' }
  } catch (e) {
    console.warn('[copierStore] falling back to localStorage —', e?.message)
    return { ...fromLocal(local), source: 'local' }
  }
}

function fromLocal(local) {
  return {
    accounts: local.accounts,
    trades: local.trades,
    links: local.links,
    moduleState: {
      overview: local.overview, risk: local.risk, scaling: local.scaling,
      mission: local.mission, payouts: local.payouts,
    },
  }
}

async function importLocalToSupabase(userId, local) {
  // remap non-uuid account ids so FK references hold
  const idMap = new Map()
  const rows = local.accounts.map(a => {
    const row = accountToRow(a, userId)
    idMap.set(a.id, row.id)
    return row
  })
  if (rows.length > 0) {
    const { error } = await supabase.from('copier_accounts').upsert(rows)
    if (error) throw error
  }
  await saveSettings(userId, {
    links: (local.links || []).map(l => ({ ...l, followerId: idMap.get(l.followerId) || l.followerId })),
    moduleState: {
      overview: local.overview, risk: local.risk, scaling: local.scaling,
      mission: local.mission, payouts: local.payouts,
    },
  })
  const accounts = rows.map(rowToAccount)
  return {
    accounts,
    trades: [],
    links: (local.links || []).map(l => ({ ...l, followerId: idMap.get(l.followerId) || l.followerId })),
    moduleState: {
      overview: local.overview, risk: local.risk, scaling: local.scaling,
      mission: local.mission, payouts: local.payouts,
    },
  }
}

// ── writes (all safe to fire-and-forget; errors logged, local mirror kept) ──
export async function saveAccounts(userId, accounts, removedIds = []) {
  lsSet(LS_KEYS.accounts, accounts)
  if (!userId) return
  try {
    if (removedIds.length > 0) {
      await supabase.from('copier_accounts').delete().in('id', removedIds.filter(isUuid))
    }
    if (accounts.length > 0) {
      const { error } = await supabase.from('copier_accounts').upsert(accounts.map(a => accountToRow(a, userId)))
      if (error) throw error
    }
  } catch (e) { console.warn('[copierStore] saveAccounts', e?.message) }
}

export async function saveSettings(userId, { links, moduleState, riskMode, maxDailyLoss, maxTradesPerDay, symbolsAllowed }) {
  if (moduleState) {
    if (moduleState.overview) lsSet(LS_KEYS.overview, moduleState.overview)
    if (moduleState.risk)     lsSet(LS_KEYS.risk, moduleState.risk)
    if (moduleState.scaling)  lsSet(LS_KEYS.scaling, moduleState.scaling)
    if (moduleState.mission)  lsSet(LS_KEYS.mission, moduleState.mission)
    if (moduleState.payouts)  lsSet(LS_KEYS.payouts, moduleState.payouts)
  }
  if (links) lsSet(LS_KEYS.links, links)
  if (!userId) return
  try {
    const patch = { user_id: userId, updated_at: new Date().toISOString() }
    if (links !== undefined) patch.size_mapping = links
    if (moduleState !== undefined) patch.module_state = moduleState
    if (riskMode !== undefined) patch.risk_mode = riskMode
    if (maxDailyLoss !== undefined) patch.max_daily_loss = maxDailyLoss === '' ? null : Number(maxDailyLoss)
    if (maxTradesPerDay !== undefined) patch.max_trades_per_day = maxTradesPerDay === '' ? null : Number(maxTradesPerDay)
    if (symbolsAllowed !== undefined) patch.symbols_allowed = symbolsAllowed
    const { error } = await supabase.from('copier_settings').upsert(patch, { onConflict: 'user_id' })
    if (error) throw error
  } catch (e) { console.warn('[copierStore] saveSettings', e?.message) }
}

export async function insertTrades(userId, trades) {
  const existing = lsGet(LS_KEYS.trades, [])
  lsSet(LS_KEYS.trades, [...trades, ...existing].slice(0, 500))
  if (!userId || trades.length === 0) return trades
  try {
    const rows = trades.map(tradeToRow)
    const { data, error } = await supabase.from('copier_trades').insert(rows).select()
    if (error) throw error
    return (data || rows).map(rowToTrade)
  } catch (e) {
    console.warn('[copierStore] insertTrades', e?.message)
    return trades
  }
}

export async function deleteTrades(userId, ids) {
  lsSet(LS_KEYS.trades, lsGet(LS_KEYS.trades, []).filter(t => !ids.includes(t.id)))
  if (!userId) return
  try {
    await supabase.from('copier_trades').delete().in('id', ids.filter(isUuid))
  } catch (e) { console.warn('[copierStore] deleteTrades', e?.message) }
}

// small debounce helper for save-on-change effects
export function debounce(fn, ms = 600) {
  let t = null
  const wrapped = (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
  wrapped.flush = (...args) => { clearTimeout(t); fn(...args) }
  return wrapped
}
