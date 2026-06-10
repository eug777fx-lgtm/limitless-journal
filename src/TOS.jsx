// ═══════════════════════════════════════════════════════════════════════════
//  TRADING OPERATING SYSTEM  (TOS) — Command Center
//  Private, eug777fx@gmail.com only. 3 views: COMMAND · ANALYTICS · REVIEW.
//  Black / white / gold. Minimal text, maximum controls. Backed by tos_trades.
//  Mounted from App.jsx when page === 'tos'.
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { supabase } from './lib/supabase'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts'
import {
  Brain, LayoutGrid, BarChart3, ClipboardCheck, Settings, Plus, Trash2,
  ChevronDown, CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown, Minus,
  Target, Crosshair, Zap, Award, Activity, Layers, Clock, Calendar, Flame, Gauge,
  Wallet, ShieldCheck, Trophy, RotateCcw,
} from 'lucide-react'

// ─── Palette ────────────────────────────────────────────────────────────────
const GOLD = '#eab308', GOLD_DIM = 'rgba(234,179,8,0.14)', GOLD_LINE = 'rgba(234,179,8,0.45)'
const GREEN = '#22c55e', RED = '#ef4444', AMBER = '#f59e0b', ORANGE = '#f97316', BLUE = '#60a5fa'
const BG = '#000', PANEL = '#0a0a0a', SUNK = '#070707', LINE = '#1a1a1a', TXT = '#fff', MUTE = '#666'

// ─── Style tokens ─────────────────────────────────────────────────────────────
const panel = { background: PANEL, border: `1px solid ${LINE}`, borderRadius: '14px', padding: '16px' }
const selStyle = { width: '100%', background: SUNK, border: `1px solid ${LINE}`, borderRadius: '9px', padding: '10px 30px 10px 12px', color: '#fff', fontSize: '12.5px', outline: 'none', appearance: 'none', WebkitAppearance: 'none', fontFamily: 'inherit', cursor: 'pointer', boxSizing: 'border-box' }
const inpStyle = { width: '100%', background: SUNK, border: `1px solid ${LINE}`, borderRadius: '9px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
const ghostBtn = { background: 'transparent', color: '#888', border: `1px solid ${LINE}`, borderRadius: '9px', padding: '10px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '12.5px', fontFamily: 'inherit' }
const goldBtn = { background: GOLD, color: '#000', border: 'none', borderRadius: '10px', padding: '12px 18px', cursor: 'pointer', fontWeight: 800, fontSize: '13px', fontFamily: 'inherit' }

// ─── localStorage helpers ─────────────────────────────────────────────────────
const lsGet = (k, fb) => { try { const s = localStorage.getItem(k); return s == null ? fb : JSON.parse(s) } catch { return fb } }
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }

// ─── number / date helpers ────────────────────────────────────────────────────
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const usd = (n) => { const v = Math.round(num(n)); return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString() }
const pct = (n) => `${Math.round(num(n))}%`
const rSign = (x) => `${x >= 0 ? '+' : ''}${(Math.round(x * 10) / 10).toFixed(1)}R`
const localKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayKey = () => localKey(new Date())
const isThisWeek = (s) => { if (!s) return false; const d = new Date(s + 'T00:00:00'); const n = new Date(); const m = new Date(n); m.setDate(n.getDate() - ((n.getDay() + 6) % 7)); m.setHours(0, 0, 0, 0); return d >= m }
const isThisMonth = (s) => { if (!s) return false; const d = new Date(s + 'T00:00:00'); const n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() }
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const weekdayOf = (s) => (s ? new Date(s + 'T00:00:00').getDay() : null)

// ─── Trade derived metrics ────────────────────────────────────────────────────
const tradeR = (t) => { if (t.result === 'Win') return num(t.rr) > 0 ? num(t.rr) : 1; if (t.result === 'Loss') return -1; return 0 }
const isDecided = (t) => t.result === 'Win' || t.result === 'Loss'
const chrono = (trades) => [...trades].sort((a, b) => (a.trade_date === b.trade_date ? new Date(a.created_at || 0) - new Date(b.created_at || 0) : (a.trade_date || '').localeCompare(b.trade_date || '')))
const isReviewed = (t) => typeof t.rule_followed === 'boolean' || typeof t.bias_correct === 'boolean'

// ─── Option constants ─────────────────────────────────────────────────────────
const BIAS_DRIVERS = ['Daily PxH', 'Daily PxL', 'MMXM', 'NWOG', 'CISD', 'Other']
const DRAWS = ['Data High', 'Data Low', 'Session High', 'Session Low', 'Equal Highs', 'Equal Lows', 'NWOG', 'Gap Fill']
const POIS = ['Rejection Block', 'Order Block', 'Breaker', 'FVG', 'IFVG', 'NWOG', 'Key Open']
const TIMEFRAMES = ['Daily', '4H', '1H', '15M']
const KEY_LEVELS = ['18:00', 'Midnight', '8:30', '9:30', '10:00', '13:00']
const OTE_ZONES = ['Premium', 'Discount', 'Equilibrium']
const TRIGGERS = ['Rejection Block', 'Wick CE', 'CISD', 'IFVG 50%', 'Breaker Retest']
const SESSIONS = ['London', 'NY', 'Asian']
const INSTRUMENTS = ['NQ', 'ES', 'YM', 'RTY', 'CL', 'GC', 'MNQ', 'MES', 'BTC/USD', 'EUR/USD', 'GBP/USD', 'XAU/USD']

// ─── Settings ─────────────────────────────────────────────────────────────────
const SETTINGS_KEY = 'tos_settings'
const defaultSettings = { accountSize: '50000', riskPct: '1', dailyDdPct: '3', maxDdPct: '6', profitPct: '8' }
const getSettings = () => ({ ...defaultSettings, ...lsGet(SETTINGS_KEY, {}) })

// ─── Command draft (live setup state, persisted + captured on log) ─────────────
const CMD_KEY = 'tos_command_draft'
const blankCommand = () => ({
  bias: '', biasDrivers: [], primaryDraw: '', secondaryDraw: '', againstPrimary: null,
  poi: [], poiTimeframe: '', keyLevels: [], ote: '', fibConfluence: null,
  entryTrigger: '', liquiditySweep: null,
  clearTarget: null, clearPath: null, aPlus: null, takeTrade: null,
})
const loadCommand = () => ({ ...blankCommand(), ...lsGet(CMD_KEY, {}) })

// Missed A+ log (discipline) — valid A+ setups deliberately passed
const MISSED_KEY = 'tos_missed'
const getMissed = () => lsGet(MISSED_KEY, [])

// ─── Setup grade engine (weights hidden from UI — only grade + confidence) ─────
function computeGrade(c) {
  if (!c.bias || !c.primaryDraw || !c.entryTrigger) return { grade: 'INVALID', score: 0 }
  let s = 0
  s += 15                                       // bias alignment
  if (c.biasDrivers.length) s += 5
  s += 15                                       // liquidity draw (primary present)
  if (c.secondaryDraw) s += 5
  if (c.poi.length) s += 15                     // HTF POI
  if (c.poiTimeframe) s += 5
  if (c.keyLevels.length) s += 10               // key-open confluence
  if (c.liquiditySweep === true) s += 20        // sweep — heavily weighted
  s += 10                                       // entry trigger present
  if (c.againstPrimary === true) s -= 12        // trading against primary objective
  if (c.fibConfluence === true) s += 2
  s = clamp(s, 0, 100)
  const grade = s >= 90 ? 'A+' : s >= 75 ? 'A' : s >= 55 ? 'B' : s >= 35 ? 'C' : 'INVALID'
  return { grade, score: s }
}
const GRADE_COLOR = { 'A+': GOLD, A: GREEN, B: AMBER, C: ORANGE, INVALID: RED }
const verdictOf = (c) => {
  const ex = [c.clearTarget, c.clearPath, c.aPlus, c.takeTrade]
  if (ex.some(v => v === false)) return 'no'
  if (ex.every(v => v === true)) return 'valid'
  return 'incomplete'
}

// ─── Core metrics from tos_trades + settings ──────────────────────────────────
function computeCore(trades, settings) {
  const accountSize = num(settings.accountSize) || 50000
  const riskPct = num(settings.riskPct) || 1
  const oneR = (accountSize * riskPct) / 100 || 100
  const decided = trades.filter(isDecided)
  const totalR = trades.reduce((s, t) => s + tradeR(t), 0)
  const equity = accountSize + totalR * oneR
  const wins = decided.filter(t => t.result === 'Win').length
  const winRate = decided.length ? (wins / decided.length) * 100 : 0
  const rrVals = trades.filter(t => num(t.rr) > 0).map(t => num(t.rr))
  const avgRR = mean(rrVals)
  const weekR = trades.filter(t => isThisWeek(t.trade_date)).reduce((s, t) => s + tradeR(t), 0)
  const monthR = trades.filter(t => isThisMonth(t.trade_date)).reduce((s, t) => s + tradeR(t), 0)
  const E = decided.length ? totalR / decided.length : 0

  const dates = trades.map(t => t.trade_date).filter(Boolean).sort()
  const weeksElapsed = dates.length ? Math.max(1, (Date.now() - new Date(dates[0] + 'T00:00:00').getTime()) / (7 * 864e5)) : 1
  const perWeek = decided.length / weeksElapsed
  const expMonthlyRR = E * perWeek * 4.333
  const expMonthlyProfit = expMonthlyRR * oneR

  const todayR = trades.filter(t => t.trade_date === todayKey()).reduce((s, t) => s + tradeR(t), 0)
  const todayLoss = Math.max(0, -todayR * oneR)
  const dailyDD = (accountSize * (num(settings.dailyDdPct) || 3)) / 100
  const maxDD = (accountSize * (num(settings.maxDdPct) || 6)) / 100
  const ddUsed = Math.max(0, -(totalR * oneR))
  const health = clamp(100 - (maxDD > 0 ? (ddUsed / maxDD) * 100 : 0), 0, 100)

  const tradingScore = clamp(Math.round(winRate * 0.4 + clamp(avgRR / 3, 0, 1) * 30 + clamp((E + 0.3) / 1.3, 0, 1) * 30), 0, 100)

  const reviewed = trades.filter(isReviewed)
  const pctTrue = (k) => { const r = reviewed.filter(t => typeof t[k] === 'boolean'); return r.length ? (r.filter(t => t[k]).length / r.length) * 100 : null }
  const execParts = ['bias_correct', 'target_correct', 'poi_correct', 'trigger_correct', 'rule_followed'].map(pctTrue).filter(v => v != null)
  const execScore = execParts.length ? Math.round(mean(execParts)) : null

  return {
    accountSize, riskPct, oneR, equity, totalR, winRate, avgRR, weekR, monthR, E,
    perWeek, expMonthlyRR, expMonthlyProfit, todayLoss, dailyDD, maxDD, health,
    tradingScore, execScore, decided: decided.length, wins,
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  UI PRIMITIVES
// ════════════════════════════════════════════════════════════════════════════
function Toggle({ label, active, onClick, activeColor = GOLD, activeText = '#000', Icon, size = 'md', flex = false }) {
  const lg = size === 'lg'
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
      padding: lg ? '13px 14px' : '9px 10px', borderRadius: '9px', cursor: 'pointer', fontFamily: 'inherit',
      fontSize: lg ? '13px' : '11.5px', fontWeight: active ? 800 : 600, lineHeight: 1.1,
      border: `1px solid ${active ? activeColor : LINE}`, background: active ? activeColor : '#0d0d0d',
      color: active ? activeText : '#888', transition: 'all .12s', minHeight: 0, flex: flex ? '1 1 0' : 'none', whiteSpace: 'nowrap',
    }}>{Icon && <Icon size={lg ? 15 : 13} />}{label}</button>
  )
}
function ToggleGrid({ options, value, onToggle, cols = 2 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '6px' }}>
      {options.map(o => <Toggle key={o} label={o} active={value.includes(o)} onClick={() => onToggle(o)} />)}
    </div>
  )
}
function SegRow({ options, value, onChange, colorFn }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {options.map(o => {
        const opt = typeof o === 'string' ? { v: o, l: o } : o
        const active = value === opt.v
        const ac = colorFn ? colorFn(opt.v) : GOLD
        return <Toggle key={opt.v} label={opt.l} Icon={opt.Icon} active={active} onClick={() => onChange(active ? '' : opt.v)} activeColor={ac} activeText={ac === GREEN || ac === RED || ac === ORANGE ? '#fff' : '#000'} flex />
      })}
    </div>
  )
}
function YN({ value, onChange, size = 'md' }) {
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      <Toggle label="Yes" active={value === true} onClick={() => onChange(value === true ? null : true)} activeColor={GREEN} activeText="#000" size={size} flex />
      <Toggle label="No" active={value === false} onClick={() => onChange(value === false ? null : false)} activeColor={RED} activeText="#fff" size={size} flex />
    </div>
  )
}
function Drop({ value, onChange, options, placeholder = 'Select' }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...selStyle, color: value ? '#fff' : '#555' }}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o} style={{ color: '#fff', background: '#0a0a0a' }}>{o}</option>)}
      </select>
      <ChevronDown size={14} color="#555" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  )
}
const Label = ({ children, color = MUTE }) => <div style={{ fontSize: '9.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color, fontWeight: 700, marginBottom: '8px' }}>{children}</div>
const Divider = () => <div style={{ height: '1px', background: LINE, margin: '14px 0' }} />
function PanelTitle({ Icon, children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {Icon && <Icon size={14} color={GOLD} />}
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{children}</span>
      </div>
      {right}
    </div>
  )
}
function Stat({ label, value, color = TXT }) {
  return (
    <div style={{ minWidth: '92px', padding: '9px 13px', borderRight: `1px solid ${LINE}`, flexShrink: 0 }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTE, marginBottom: '4px', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: 800, color, whiteSpace: 'nowrap', letterSpacing: '-0.3px' }}>{value}</div>
    </div>
  )
}
function MetricCard({ label, value, sub, color = '#fff', Icon }) {
  return (
    <div style={{ ...panel, padding: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '9.5px', letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTE, fontWeight: 700 }}>{label}</span>
        {Icon && <Icon size={13} color={color === '#fff' ? '#555' : color} />}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 800, color, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '10.5px', color: MUTE, marginTop: '5px' }}>{sub}</div>}
    </div>
  )
}
function Dot({ on }) {
  const c = on === true ? GREEN : on === false ? RED : '#2a2a2a'
  return <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0 }} />
}
const chartAxis = { fill: '#555', fontSize: 10 }
const noAxis = { axisLine: false, tickLine: false }
const tip = { background: '#0a0a0a', border: `1px solid ${LINE}`, borderRadius: '8px', fontSize: '12px' }

// ════════════════════════════════════════════════════════════════════════════
//  VIEW 1 — COMMAND
// ════════════════════════════════════════════════════════════════════════════
function Command({ trades, settings, command, setCommand, onOpenSettings, missedThisMonth, onPass }) {
  const c = command
  const m = useMemo(() => computeCore(trades, settings), [trades, settings])
  const { grade, score } = computeGrade(c)
  const gradeColor = GRADE_COLOR[grade]
  const verdict = verdictOf(c)
  const confluence = c.poi.length + c.keyLevels.length + (c.poiTimeframe ? 1 : 0)

  const set = (k, v) => setCommand(p => ({ ...p, [k]: v }))
  const toggleArr = (k, v) => setCommand(p => ({ ...p, [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v] }))

  const topStats = [
    { label: 'Account', value: usd(m.equity) },
    { label: 'Drawdown', value: m.todayLoss > 0 ? '-' + usd(m.todayLoss) : '$0', color: m.todayLoss > 0 ? RED : TXT },
    { label: 'Risk', value: usd(m.oneR), color: GOLD },
    { label: 'Week RR', value: rSign(m.weekR), color: m.weekR >= 0 ? GREEN : RED },
    { label: 'Month RR', value: rSign(m.monthR), color: m.monthR >= 0 ? GREEN : RED },
    { label: 'Win Rate', value: pct(m.winRate), color: m.winRate >= 50 ? GREEN : TXT },
    { label: 'Avg RR', value: m.avgRR ? `${m.avgRR.toFixed(2)}R` : '—', color: GOLD },
    { label: 'Exp Mo. RR', value: rSign(m.expMonthlyRR), color: m.expMonthlyRR >= 0 ? GREEN : RED },
    { label: 'Payout Proj', value: usd(m.expMonthlyProfit), color: m.expMonthlyProfit >= 0 ? GREEN : RED },
    { label: 'Trading Score', value: `${m.tradingScore}`, color: m.tradingScore >= 70 ? GREEN : m.tradingScore >= 45 ? AMBER : RED },
    { label: 'Exec Score', value: m.execScore == null ? '—' : `${m.execScore}`, color: m.execScore == null ? MUTE : m.execScore >= 70 ? GREEN : m.execScore >= 45 ? AMBER : RED },
    { label: 'Health', value: pct(m.health), color: m.health >= 70 ? GREEN : m.health >= 40 ? AMBER : RED },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* TOP BAR — compact metrics, horizontal scroll on mobile */}
      <div className="tos-scroll" style={{ display: 'flex', overflowX: 'auto', background: PANEL, border: `1px solid ${LINE}`, borderRadius: '12px' }}>
        {topStats.map((s, i) => <Stat key={i} {...s} />)}
        <button onClick={onOpenSettings} title="Settings" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', background: 'transparent', border: 'none', color: MUTE, cursor: 'pointer', flexShrink: 0 }}><Settings size={16} /></button>
      </div>

      {/* THREE PANELS */}
      <div className="tos-cols">
        {/* LEFT — MARKET BIAS */}
        <div style={panel}>
          <PanelTitle Icon={TrendingUp} right={(
            <button onClick={() => setCommand(blankCommand())} title="Reset setup" style={{ background: 'transparent', border: 'none', color: MUTE, cursor: 'pointer', display: 'flex', padding: 0 }}><RotateCcw size={14} /></button>
          )}>Market Bias</PanelTitle>
          <Label>Daily Direction</Label>
          <SegRow
            options={[{ v: 'Bullish', l: 'Bullish', Icon: TrendingUp }, { v: 'Bearish', l: 'Bearish', Icon: TrendingDown }, { v: 'Neutral', l: 'Neutral', Icon: Minus }]}
            value={c.bias} onChange={v => set('bias', v)}
            colorFn={v => v === 'Bullish' ? GREEN : v === 'Bearish' ? RED : GOLD}
          />
          <div style={{ marginTop: '14px' }}><Label>Bias Drivers</Label><ToggleGrid options={BIAS_DRIVERS} value={c.biasDrivers} onToggle={v => toggleArr('biasDrivers', v)} cols={3} /></div>
          <Divider />
          <Label color={GOLD}>Liquidity Delivery</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div><Label>Primary Draw</Label><Drop value={c.primaryDraw} onChange={v => set('primaryDraw', v)} options={DRAWS} placeholder="Primary draw" /></div>
            <div><Label>Secondary Draw</Label><Drop value={c.secondaryDraw} onChange={v => set('secondaryDraw', v)} options={DRAWS} placeholder="Secondary draw" /></div>
            <div>
              <Label>Trading Against Primary?</Label>
              <YN value={c.againstPrimary} onChange={v => set('againstPrimary', v)} />
              {c.againstPrimary === true && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '8px', padding: '8px 11px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', border: `1px solid ${AMBER}55`, color: AMBER, fontSize: '11px', fontWeight: 700 }}>
                  <AlertTriangle size={13} /> AGAINST OBJECTIVE — LOWER PROBABILITY
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER — HTF POI */}
        <div style={panel}>
          <PanelTitle Icon={Layers}>Higher Timeframe POI</PanelTitle>
          <Label>Area of Interest</Label>
          <ToggleGrid options={POIS} value={c.poi} onToggle={v => toggleArr('poi', v)} cols={2} />
          <div style={{ marginTop: '14px' }}><Label>Timeframe</Label><SegRow options={TIMEFRAMES} value={c.poiTimeframe} onChange={v => set('poiTimeframe', v)} /></div>
          <Divider />
          <Label color={GOLD}>Key Levels</Label>
          <ToggleGrid options={KEY_LEVELS} value={c.keyLevels} onToggle={v => toggleArr('keyLevels', v)} cols={3} />
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '14px', borderRadius: '11px', background: SUNK, border: `1px solid ${confluence > 0 ? GOLD_LINE : LINE}` }}>
            <Activity size={20} color={confluence > 0 ? GOLD : MUTE} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '34px', fontWeight: 900, color: confluence > 0 ? GOLD : '#333', lineHeight: 1, letterSpacing: '-1px' }}>{confluence}</div>
              <div style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTE, marginTop: '3px' }}>Active Confluence</div>
            </div>
          </div>
        </div>

        {/* RIGHT — OTE + ENTRY */}
        <div style={panel}>
          <PanelTitle Icon={Crosshair}>OTE + Entry</PanelTitle>
          <Label>OTE Zone</Label>
          <SegRow options={OTE_ZONES} value={c.ote} onChange={v => set('ote', v)} colorFn={v => v === 'Discount' ? GREEN : v === 'Premium' ? RED : GOLD} />
          <div style={{ marginTop: '14px' }}><Label>Fib Confluence</Label><YN value={c.fibConfluence} onChange={v => set('fibConfluence', v)} /></div>
          <Divider />
          <Label color={GOLD}>Entry Trigger</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
            {TRIGGERS.map(t => <Toggle key={t} label={t} Icon={Crosshair} active={c.entryTrigger === t} onClick={() => set('entryTrigger', c.entryTrigger === t ? '' : t)} />)}
          </div>
          <div style={{ marginTop: '14px', padding: '13px', borderRadius: '11px', background: c.liquiditySweep === true ? 'rgba(34,197,94,0.08)' : c.liquiditySweep === false ? 'rgba(239,68,68,0.08)' : SUNK, border: `1px solid ${c.liquiditySweep === true ? GREEN + '66' : c.liquiditySweep === false ? RED + '66' : LINE}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '9px' }}>
              <Zap size={15} color={c.liquiditySweep === true ? GREEN : GOLD} />
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Liquidity Sweep?</span>
            </div>
            <YN value={c.liquiditySweep} onChange={v => set('liquiditySweep', v)} size="lg" />
          </div>
        </div>
      </div>

      {/* EXECUTION FILTER + GRADE */}
      <div style={panel}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={14} color={GOLD} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Execution Filter</span>
          </div>
          {/* SETUP GRADE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '120px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTE, fontWeight: 700 }}>Confidence</span>
                <span style={{ fontSize: '10px', fontWeight: 800, color: gradeColor }}>{score}%</span>
              </div>
              <div style={{ height: '7px', borderRadius: '5px', background: '#161616', overflow: 'hidden' }}>
                <div style={{ width: `${score}%`, height: '100%', background: gradeColor, borderRadius: '5px', transition: 'width .3s, background .3s' }} />
              </div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '64px', padding: '6px 12px', borderRadius: '11px', border: `1px solid ${gradeColor}66`, background: `${gradeColor}14` }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTE, fontWeight: 700, marginBottom: '2px' }}>Grade</div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: gradeColor, lineHeight: 1, letterSpacing: '-1px' }}>{grade}</div>
            </div>
          </div>
        </div>

        <div className="tos-exec">
          {[
            { k: 'clearTarget', l: 'Clear Target?' },
            { k: 'clearPath', l: 'Clear Delivery Path?' },
            { k: 'aPlus', l: 'A+ Setup?' },
            { k: 'takeTrade', l: 'Take Trade?' },
          ].map(f => (
            <div key={f.k}><Label>{f.l}</Label><YN value={c[f.k]} onChange={v => set(f.k, v)} size="lg" /></div>
          ))}
        </div>

        {/* VERDICT */}
        <div style={{
          marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          padding: '20px', borderRadius: '13px', textAlign: 'center',
          background: verdict === 'no' ? 'rgba(239,68,68,0.1)' : verdict === 'valid' ? 'rgba(34,197,94,0.1)' : SUNK,
          border: `1px solid ${verdict === 'no' ? RED + '66' : verdict === 'valid' ? GREEN + '66' : LINE}`,
        }}>
          {verdict === 'no' && <><XCircle size={30} color={RED} /><span style={{ fontSize: '24px', fontWeight: 900, color: RED, letterSpacing: '0.02em' }}>NO TRADE — WAIT</span></>}
          {verdict === 'valid' && <><CheckCircle size={30} color={GREEN} /><span style={{ fontSize: '24px', fontWeight: 900, color: GREEN, letterSpacing: '0.02em' }}>VALID SETUP</span></>}
          {verdict === 'incomplete' && <span style={{ fontSize: '15px', fontWeight: 700, color: MUTE, letterSpacing: '0.04em' }}>COMPLETE EXECUTION FILTER</span>}
        </div>
        {verdict === 'valid' && (grade === 'A+' || grade === 'A') && (
          <div style={{ marginTop: '10px', textAlign: 'center' }}>
            <button onClick={() => onPass(grade)} style={{ ...ghostBtn, fontSize: '11px', padding: '7px 14px' }}>Pass this A+ setup ({missedThisMonth} missed this month)</button>
          </div>
        )}
      </div>

      {/* DISCIPLINE STRIP */}
      <div className="tos-scroll" style={{ display: 'flex', alignItems: 'center', gap: '12px', overflowX: 'auto', padding: '10px 14px', background: PANEL, border: `1px solid ${LINE}`, borderRadius: '11px' }}>
        <Award size={13} color={GOLD} style={{ flexShrink: 0 }} />
        {['No Target = No Trade', 'No Draw = No Trade', 'No Sweep = Lower Probability', 'Wait For A+', 'Protect Capital'].map((s, i) => (
          <span key={i} style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a7a7a', whiteSpace: 'nowrap', paddingRight: '12px', borderRight: i < 4 ? `1px solid ${LINE}` : 'none' }}>{s}</span>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  VIEW 2 — ANALYTICS
// ════════════════════════════════════════════════════════════════════════════
function aggregate(trades, keyFn) {
  const m = {}
  for (const t of trades) {
    for (const k of keyFn(t)) {
      if (!k) continue
      if (!m[k]) m[k] = { key: k, r: 0, n: 0, w: 0, l: 0 }
      m[k].r += tradeR(t); m[k].n++
      if (t.result === 'Win') m[k].w++; else if (t.result === 'Loss') m[k].l++
    }
  }
  return Object.values(m)
}
const wrOf = (a) => (a.w + a.l ? (a.w / (a.w + a.l)) * 100 : 0)
const bestBy = (arr, sel) => arr.filter(a => a.n > 0).sort((x, y) => sel(y) - sel(x))[0]

function Analytics({ trades, settings, missedThisMonth }) {
  const m = useMemo(() => computeCore(trades, settings), [trades, settings])
  const oneR = m.oneR
  const decided = trades.filter(isDecided)

  const trig = aggregate(trades, t => [t.trigger_type])
  const poi = aggregate(trades, t => (t.poi || '').split(',').map(s => s.trim()))
  const ko = aggregate(trades, t => (t.key_open_level || '').split(',').map(s => s.trim()))
  const sess = aggregate(trades, t => [t.session])
  const byDay = aggregate(trades, t => [weekdayOf(t.trade_date) != null ? WD[weekdayOf(t.trade_date)] : null])

  const bestTrig = bestBy(trig, a => a.r)
  const bestPoi = bestBy(poi, a => a.r)
  const bestKo = bestBy(ko, a => a.r)
  const bestDay = bestBy(byDay, a => a.r)
  const bestSess = bestBy(sess, a => a.r)
  const bestRR = trades.reduce((mx, t) => (t.result === 'Win' && num(t.rr) > mx ? num(t.rr) : mx), 0)
  const ruleViol = trades.filter(t => t.rule_followed === false).length

  // streaks (current run from most recent decided trade)
  const seq = chrono(decided).map(t => t.result)
  let winStreak = 0, lossStreak = 0
  for (let i = seq.length - 1; i >= 0; i--) { if (seq[i] === 'Win') winStreak++; else break }
  for (let i = seq.length - 1; i >= 0; i--) { if (seq[i] === 'Loss') lossStreak++; else break }

  const edge = [
    { label: 'Best Trigger', value: bestTrig ? bestTrig.key : '—', sub: bestTrig ? rSign(bestTrig.r) : null, Icon: Crosshair, color: GOLD },
    { label: 'Best POI', value: bestPoi ? bestPoi.key : '—', sub: bestPoi ? rSign(bestPoi.r) : null, Icon: Layers, color: GOLD },
    { label: 'Best Key Open', value: bestKo ? bestKo.key : '—', sub: bestKo ? rSign(bestKo.r) : null, Icon: Clock, color: GOLD },
    { label: 'Best Day', value: bestDay ? bestDay.key : '—', sub: bestDay ? rSign(bestDay.r) : null, Icon: Calendar, color: GOLD },
    { label: 'Best Session', value: bestSess ? bestSess.key : '—', sub: bestSess ? `${Math.round(wrOf(bestSess))}% WR` : null, Icon: Activity, color: GOLD },
    { label: 'Best RR', value: bestRR ? `${bestRR.toFixed(1)}R` : '—', Icon: Target, color: GREEN },
    { label: 'Average RR', value: m.avgRR ? `${m.avgRR.toFixed(2)}R` : '—', Icon: Gauge, color: GOLD },
    { label: 'Win Streak', value: winStreak, Icon: Flame, color: GREEN },
    { label: 'Loss Streak', value: lossStreak, Icon: TrendingDown, color: RED },
    { label: 'Trades / Week', value: m.perWeek ? m.perWeek.toFixed(1) : '0', Icon: Activity, color: TXT },
    { label: 'Missed A+', value: missedThisMonth, Icon: AlertTriangle, color: missedThisMonth > 0 ? ORANGE : GREEN },
    { label: 'Rule Violations', value: ruleViol, Icon: XCircle, color: ruleViol > 0 ? RED : GREEN },
  ]

  // chart data
  const wrBar = (arr) => arr.filter(a => a.n > 0).map(a => ({ name: a.key, wr: Math.round(wrOf(a)), n: a.n })).sort((x, y) => y.wr - x.wr)
  const trigBar = wrBar(trig), sessBar = wrBar(sess)
  const dayHeat = WD.slice(1, 6).concat(['Sat', 'Sun']).map(d => { const a = byDay.find(x => x.key === d); return { day: d, wr: a ? Math.round(wrOf(a)) : null, n: a ? a.n : 0 } })

  const bins = [
    { label: '≤-1R', test: r => r <= -1 }, { label: '-1–0', test: r => r > -1 && r < 0 },
    { label: '0–1', test: r => r >= 0 && r < 1 }, { label: '1–2', test: r => r >= 1 && r < 2 },
    { label: '2–3', test: r => r >= 2 && r < 3 }, { label: '3R+', test: r => r >= 3 },
  ].map(b => ({ label: b.label, count: trades.filter(t => b.test(tradeR(t))).length }))

  const curve = chrono(trades).reduce((acc, t, idx) => [...acc, { i: idx + 1, eq: Math.round(acc[idx].eq + tradeR(t) * oneR) }], [{ i: 0, eq: m.accountSize }])

  // forecast — best / base / worst over next 40 trades
  const rs = decided.map(tradeR)
  const E = m.E
  const sd = rs.length ? Math.sqrt(mean(rs.map(r => (r - E) ** 2))) : 1
  const start = m.equity
  const fc = []
  for (let n = 0; n <= 40; n += 4) {
    fc.push({ n, base: Math.round(start + E * n * oneR), best: Math.round(start + (E + sd * 0.5) * n * oneR), worst: Math.round(start + (E - sd * 0.5) * n * oneR) })
  }
  const targetProfit = (m.accountSize * (num(settings.profitPct) || 8)) / 100
  const dailyExp = m.expMonthlyProfit / 22
  const daysTo = (amt) => (dailyExp > 0 ? Math.ceil(amt / dailyExp) : null)
  const dateIn = (days) => { if (days == null) return '—'; const d = new Date(); d.setDate(d.getDate() + days); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }

  if (trades.length === 0) {
    return <div style={{ ...panel, textAlign: 'center', padding: '60px 20px', color: MUTE }}><BarChart3 size={30} color="#333" /><div style={{ marginTop: '12px', fontSize: '14px', fontWeight: 700, color: '#fff' }}>No data yet</div><div style={{ fontSize: '12px', marginTop: '4px' }}>Log trades to unlock analytics.</div></div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* EDGE CARDS */}
      <div className="tos-edge">
        {edge.map((e, i) => <MetricCard key={i} label={e.label} value={e.value} sub={e.sub} color={e.color} Icon={e.Icon} />)}
      </div>

      {/* WIN RATE CHARTS */}
      <div className="tos-cols">
        <div style={panel}>
          <PanelTitle Icon={Crosshair}>Win Rate · Trigger</PanelTitle>
          {trigBar.length ? (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={trigBar} margin={{ top: 4, right: 6, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#141414" vertical={false} />
                <XAxis dataKey="name" tick={chartAxis} {...noAxis} interval={0} />
                <YAxis tick={chartAxis} {...noAxis} domain={[0, 100]} />
                <Tooltip contentStyle={tip} cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(v, n, p) => [`${v}% (${p.payload.n})`, 'Win rate']} />
                <Bar dataKey="wr" radius={[3, 3, 0, 0]} maxBarSize={34}>{trigBar.map((d, i) => <Cell key={i} fill={d.wr >= 50 ? GREEN : ORANGE} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </div>
        <div style={panel}>
          <PanelTitle Icon={Activity}>Win Rate · Session</PanelTitle>
          {sessBar.length ? (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={sessBar} margin={{ top: 4, right: 6, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#141414" vertical={false} />
                <XAxis dataKey="name" tick={chartAxis} {...noAxis} interval={0} />
                <YAxis tick={chartAxis} {...noAxis} domain={[0, 100]} />
                <Tooltip contentStyle={tip} cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(v, n, p) => [`${v}% (${p.payload.n})`, 'Win rate']} />
                <Bar dataKey="wr" radius={[3, 3, 0, 0]} maxBarSize={40}>{sessBar.map((d, i) => <Cell key={i} fill={d.wr >= 50 ? GREEN : ORANGE} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </div>
        <div style={panel}>
          <PanelTitle Icon={Calendar}>Win Rate · Day</PanelTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
            {dayHeat.map(d => {
              const has = d.wr != null
              const bg = !has ? '#0d0d0d' : `rgba(${d.wr >= 50 ? '34,197,94' : '249,115,22'}, ${0.15 + (d.wr / 100) * 0.6})`
              return (
                <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '34px', fontSize: '11px', color: MUTE, fontWeight: 600 }}>{d.day}</span>
                  <div style={{ flex: 1, height: '24px', borderRadius: '6px', background: bg, border: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 9px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: has ? '#fff' : '#333' }}>{has ? `${d.wr}%` : '—'}</span>
                    <span style={{ fontSize: '10px', color: MUTE }}>{d.n || ''}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* DISTRIBUTION + EQUITY */}
      <div className="tos-grid2">
        <div style={panel}>
          <PanelTitle Icon={BarChart3}>R Distribution</PanelTitle>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={bins} margin={{ top: 4, right: 6, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="#141414" vertical={false} />
              <XAxis dataKey="label" tick={chartAxis} {...noAxis} interval={0} />
              <YAxis tick={chartAxis} {...noAxis} allowDecimals={false} />
              <Tooltip contentStyle={tip} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={40}>{bins.map((b, i) => <Cell key={i} fill={i < 2 ? RED : GOLD} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={panel}>
          <PanelTitle Icon={TrendingUp}>Equity Curve</PanelTitle>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={curve} margin={{ top: 4, right: 6, bottom: 0, left: 4 }}>
              <defs><linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={0.35} /><stop offset="100%" stopColor={GOLD} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="#141414" vertical={false} />
              <XAxis dataKey="i" tick={chartAxis} {...noAxis} />
              <YAxis tick={chartAxis} {...noAxis} width={46} tickFormatter={v => `$${Math.round(v / 1000)}k`} domain={['auto', 'auto']} />
              <Tooltip contentStyle={tip} formatter={v => [usd(v), 'Equity']} labelFormatter={l => `Trade ${l}`} />
              <ReferenceLine y={m.accountSize} stroke="#333" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="eq" stroke={GOLD} strokeWidth={2} fill="url(#eqg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FORECAST */}
      <div style={panel}>
        <PanelTitle Icon={Gauge} right={<span style={{ fontSize: '9.5px', color: MUTE, letterSpacing: '0.06em' }}>STATISTICAL EXPECTANCY, NOT PREDICTION</span>}>Performance Forecast</PanelTitle>
        <div className="tos-edge" style={{ marginBottom: '14px' }}>
          <MetricCard label="Exp Monthly RR" value={rSign(m.expMonthlyRR)} color={m.expMonthlyRR >= 0 ? GREEN : RED} Icon={TrendingUp} />
          <MetricCard label="Exp Monthly Profit" value={usd(m.expMonthlyProfit)} color={m.expMonthlyProfit >= 0 ? GREEN : RED} Icon={Wallet} />
          <MetricCard label="Payout Date" value={dateIn(daysTo(targetProfit))} sub="at expected pace" color={GOLD} Icon={Calendar} />
          <MetricCard label="Challenge Pass" value={dateIn(daysTo(targetProfit))} sub={`${pct(num(settings.profitPct) || 8)} target`} color={GOLD} Icon={Trophy} />
        </div>
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={fc} margin={{ top: 6, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid stroke="#141414" vertical={false} />
            <XAxis dataKey="n" tick={chartAxis} {...noAxis} tickFormatter={v => `+${v}`} />
            <YAxis tick={chartAxis} {...noAxis} width={46} tickFormatter={v => `$${Math.round(v / 1000)}k`} domain={['auto', 'auto']} />
            <Tooltip contentStyle={tip} formatter={(v, n) => [usd(v), n]} labelFormatter={l => `After ${l} trades`} />
            <ReferenceLine y={m.equity} stroke="#333" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="best" name="Best" stroke={GREEN} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
            <Line type="monotone" dataKey="base" name="Base" stroke={GOLD} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="worst" name="Worst" stroke={RED} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px' }}>
          {[{ l: 'Best', c: GREEN }, { l: 'Base', c: GOLD }, { l: 'Worst', c: RED }].map(x => (
            <span key={x.l} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: MUTE }}><span style={{ width: '12px', height: '2px', background: x.c, display: 'inline-block' }} />{x.l} Case</span>
          ))}
        </div>
      </div>
    </div>
  )
}
function Empty() { return <div style={{ padding: '40px 10px', textAlign: 'center', color: '#333', fontSize: '12px' }}>No data</div> }

// ════════════════════════════════════════════════════════════════════════════
//  VIEW 3 — REVIEW
// ════════════════════════════════════════════════════════════════════════════
const REVIEW_FIELDS = [
  { k: 'bias_correct', l: 'Bias Correct?' },
  { k: 'target_correct', l: 'Target Correct?' },
  { k: 'poi_correct', l: 'POI Correct?' },
  { k: 'trigger_correct', l: 'Trigger Correct?' },
  { k: 'rule_followed', l: 'Rule Followed?' },
]
function Review({ trades, onReview, onDelete }) {
  const reviewed = trades.filter(isReviewed)
  const pctTrue = (k) => { const r = reviewed.filter(t => typeof t[k] === 'boolean'); return r.length ? Math.round((r.filter(t => t[k]).length / r.length) * 100) : null }
  const sorted = chrono(trades).reverse()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* STATS */}
      <div className="tos-edge">
        {REVIEW_FIELDS.map(f => { const v = pctTrue(f.k); return <MetricCard key={f.k} label={f.l.replace('?', '')} value={v == null ? '—' : `${v}%`} color={v == null ? MUTE : v >= 70 ? GREEN : v >= 50 ? AMBER : RED} Icon={CheckCircle} /> })}
      </div>

      {/* HISTORY */}
      <div style={panel}>
        <PanelTitle Icon={ClipboardCheck} right={<span style={{ fontSize: '11px', color: MUTE }}>{reviewed.length}/{trades.length} reviewed</span>}>Review History</PanelTitle>
        {sorted.length === 0 ? <Empty /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sorted.map(t => {
              const c = t.result === 'Win' ? GREEN : t.result === 'Loss' ? RED : MUTE
              const done = isReviewed(t)
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 13px', borderRadius: '10px', background: SUNK, border: `1px solid ${LINE}`, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', minWidth: '50px' }}>{t.instrument}</span>
                  <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700, background: `${c}1f`, color: c, border: `1px solid ${c}44` }}>{t.result}</span>
                  {t.setup_grade && <span style={{ fontSize: '11px', fontWeight: 800, color: GRADE_COLOR[t.setup_grade] || MUTE }}>{t.setup_grade}</span>}
                  <span style={{ fontSize: '11px', color: MUTE }}>{t.trade_date}</span>
                  <div style={{ flex: 1 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    {REVIEW_FIELDS.map(f => <Dot key={f.k} on={typeof t[f.k] === 'boolean' ? t[f.k] : null} />)}
                  </div>
                  <button onClick={() => onReview(t)} style={{ ...ghostBtn, padding: '6px 12px', fontSize: '11px', color: done ? MUTE : GOLD, borderColor: done ? LINE : GOLD_LINE }}>{done ? 'Edit' : 'Review'}</button>
                  <button onClick={() => onDelete(t.id)} title="Delete" style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', display: 'flex', padding: 0 }}><Trash2 size={14} /></button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Review modal (auto-prompt after log + manual edit) ───────────────────────
function ReviewModal({ trade, onClose, onSave }) {
  const [ans, setAns] = useState(() => {
    const init = {}
    REVIEW_FIELDS.forEach(f => { init[f.k] = typeof trade[f.k] === 'boolean' ? trade[f.k] : null })
    return init
  })
  const set = (k, v) => setAns(a => ({ ...a, [k]: a[k] === v ? null : v }))
  return (
    <Modal onClose={onClose} maxWidth="420px">
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '4px' }}>
        <ClipboardCheck size={17} color={GOLD} />
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>Trade Review</div>
      </div>
      <div style={{ fontSize: '11.5px', color: MUTE, marginBottom: '16px' }}>{trade.instrument} · {trade.result}{trade.setup_grade ? ` · ${trade.setup_grade}` : ''}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {REVIEW_FIELDS.map(f => (
          <div key={f.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#ddd' }}>{f.l}</span>
            <div style={{ width: '150px' }}><YN value={ans[f.k]} onChange={v => set(f.k, v)} /></div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button onClick={onClose} style={{ ...ghostBtn, flex: 1 }}>Skip</button>
        <button onClick={() => onSave(trade.id, ans)} style={{ ...goldBtn, flex: 1 }}>Save Review</button>
      </div>
    </Modal>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  MODALS
// ════════════════════════════════════════════════════════════════════════════
function Modal({ children, onClose, maxWidth = '460px' }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: '16px', padding: '20px', width: '100%', maxWidth, maxHeight: '90vh', overflowY: 'auto', animation: 'tosIn .2s ease both' }}>{children}</div>
    </div>
  )
}

function LogModal({ session, command, tableMissing, onClose, onLogged }) {
  const { grade } = computeGrade(command)
  const [f, setF] = useState({ instrument: '', direction: '', sess: '', entry: '', stop: '', target: '', result: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const rr = useMemo(() => {
    const e = num(f.entry), s = num(f.stop), t = num(f.target)
    const risk = Math.abs(e - s), reward = Math.abs(t - e)
    if (!f.entry || !f.stop || !f.target || risk <= 0) return null
    return +(reward / risk).toFixed(2)
  }, [f.entry, f.stop, f.target])

  const save = async () => {
    if (!f.instrument) return toast.error('Pick an instrument')
    if (!f.result) return toast.error('Select a result')
    if (tableMissing) return toast.error('tos_trades table missing — run the SQL')
    setSaving(true)
    const row = {
      user_id: session.user.id, trade_date: todayKey(),
      instrument: f.instrument, direction: f.direction || null, session: f.sess || null,
      entry: num(f.entry) || null, stop_loss: num(f.stop) || null, target: num(f.target) || null,
      rr, result: f.result,
      bias_direction: command.bias || null,
      setup_grade: grade,
      poi: command.poi.join(', ') || null,
      trigger_type: command.entryTrigger || null,
      key_open_level: command.keyLevels.join(', ') || null,
      liquidity_swept: command.liquiditySweep === true,
    }
    const { data, error } = await supabase.from('tos_trades').insert(row).select().single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Trade logged')
    onLogged(data)
  }

  const dirColor = f.direction === 'Short' ? RED : GREEN
  return (
    <Modal onClose={onClose} maxWidth="480px">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}><Plus size={17} color={GOLD} /><span style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>Log Trade</span></div>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: MUTE }}>Grade <b style={{ color: GRADE_COLOR[grade], fontSize: '14px' }}>{grade}</b></span>
      </div>
      <Label>Instrument</Label>
      <Drop value={f.instrument} onChange={v => set('instrument', v)} options={INSTRUMENTS} placeholder="Instrument" />
      <div style={{ marginTop: '12px' }}><Label>Direction</Label><SegRow options={['Long', 'Short']} value={f.direction} onChange={v => set('direction', v)} colorFn={v => v === 'Short' ? RED : GREEN} /></div>
      <div style={{ marginTop: '12px' }}><Label>Session</Label><SegRow options={SESSIONS} value={f.sess} onChange={v => set('sess', v)} /></div>
      <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        <div><Label>Entry</Label><input value={f.entry} onChange={e => set('entry', e.target.value)} inputMode="decimal" style={inpStyle} placeholder="0" /></div>
        <div><Label>Stop</Label><input value={f.stop} onChange={e => set('stop', e.target.value)} inputMode="decimal" style={inpStyle} placeholder="0" /></div>
        <div><Label>Target</Label><input value={f.target} onChange={e => set('target', e.target.value)} inputMode="decimal" style={inpStyle} placeholder="0" /></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '12px' }}>
        <span style={{ color: MUTE }}>RR</span><span style={{ fontWeight: 800, color: rr ? GOLD : '#444', fontSize: '15px' }}>{rr ? `1:${rr}` : '—'}</span>
      </div>
      <div style={{ marginTop: '12px' }}><Label>Result</Label><SegRow options={['Win', 'Loss', 'BE']} value={f.result} onChange={v => set('result', v)} colorFn={v => v === 'Win' ? GREEN : v === 'Loss' ? RED : MUTE} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', padding: '9px 12px', borderRadius: '9px', background: SUNK, border: `1px solid ${LINE}`, fontSize: '11px', color: MUTE }}>
        <Activity size={12} color={GOLD} /> Captures: {command.bias || 'no bias'} · {command.poi.length} POI · {command.entryTrigger || 'no trigger'} · <span style={{ color: dirColor }}>{f.direction || '—'}</span>
      </div>
      <button onClick={save} disabled={saving} style={{ ...goldBtn, width: '100%', marginTop: '16px', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Log Trade'}</button>
    </Modal>
  )
}

function SettingsModal({ settings, onClose, onSave }) {
  const [s, setS] = useState(settings)
  const set = (k, v) => setS(p => ({ ...p, [k]: v }))
  const fields = [
    { k: 'accountSize', l: 'Account Size ($)' }, { k: 'riskPct', l: 'Risk % / Trade' },
    { k: 'dailyDdPct', l: 'Daily Drawdown %' }, { k: 'maxDdPct', l: 'Max Drawdown %' },
    { k: 'profitPct', l: 'Profit Target %' },
  ]
  return (
    <Modal onClose={onClose} maxWidth="380px">
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '16px' }}><Settings size={17} color={GOLD} /><span style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>Settings</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {fields.map(f => (
          <div key={f.k}><Label>{f.l}</Label><input value={s[f.k]} onChange={e => set(f.k, e.target.value)} inputMode="decimal" style={inpStyle} /></div>
        ))}
      </div>
      <button onClick={() => onSave(s)} style={{ ...goldBtn, width: '100%', marginTop: '18px' }}>Save</button>
    </Modal>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  SQL NOTICE (table missing)
// ════════════════════════════════════════════════════════════════════════════
const SETUP_SQL = `ALTER TABLE tos_trades ADD COLUMN IF NOT EXISTS bias_direction text;
ALTER TABLE tos_trades ADD COLUMN IF NOT EXISTS setup_grade text;
ALTER TABLE tos_trades ADD COLUMN IF NOT EXISTS poi text;
ALTER TABLE tos_trades ADD COLUMN IF NOT EXISTS trigger_type text;
ALTER TABLE tos_trades ADD COLUMN IF NOT EXISTS key_open_level text;
ALTER TABLE tos_trades ADD COLUMN IF NOT EXISTS bias_correct boolean;
ALTER TABLE tos_trades ADD COLUMN IF NOT EXISTS target_correct boolean;
ALTER TABLE tos_trades ADD COLUMN IF NOT EXISTS poi_correct boolean;
ALTER TABLE tos_trades ADD COLUMN IF NOT EXISTS trigger_correct boolean;
ALTER TABLE tos_trades ADD COLUMN IF NOT EXISTS rule_followed boolean;`
function SqlNotice() {
  return (
    <div style={{ ...panel, borderColor: AMBER + '55' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px' }}><AlertTriangle size={16} color={AMBER} /><span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>tos_trades not found</span></div>
      <div style={{ fontSize: '12.5px', color: MUTE, marginBottom: '12px', lineHeight: 1.6 }}>Create the table, then run the column upgrade below in Supabase SQL editor.</div>
      <pre style={{ background: SUNK, border: `1px solid ${LINE}`, borderRadius: '10px', padding: '14px', fontSize: '11px', color: '#9a9a9a', overflowX: 'auto', lineHeight: 1.6 }}>{SETUP_SQL}</pre>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  SHELL
// ════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'command', label: 'Command', Icon: LayoutGrid },
  { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
  { id: 'review', label: 'Review', Icon: ClipboardCheck },
]
const TOS_CSS = `
@keyframes tosIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.tos-scroll::-webkit-scrollbar { height: 0; display: none; }
.tos-cols { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; align-items: start; }
.tos-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
.tos-exec { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.tos-edge { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
@media (max-width: 1100px) { .tos-edge { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 920px) { .tos-cols { grid-template-columns: 1fr; } .tos-grid2 { grid-template-columns: 1fr; } .tos-exec { grid-template-columns: 1fr 1fr; } }
@media (max-width: 620px) { .tos-edge { grid-template-columns: repeat(2, 1fr); } }
`

export function TOSPage({ session }) {
  const [tab, setTab] = useState('command')
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [settings, setSettings] = useState(getSettings)
  const [command, setCommandState] = useState(loadCommand)
  const [logOpen, setLogOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reviewTrade, setReviewTrade] = useState(null)
  const [missed, setMissed] = useState(getMissed)

  const setCommand = (updater) => setCommandState(prev => { const next = typeof updater === 'function' ? updater(prev) : updater; lsSet(CMD_KEY, next); return next })
  const saveSettings = (s) => { setSettings(s); lsSet(SETTINGS_KEY, s); setSettingsOpen(false); toast.success('Settings saved') }
  const missedThisMonth = missed.filter(x => isThisMonth(x.date)).length
  const onPass = (grade) => { const next = [{ date: todayKey(), grade }, ...missed]; setMissed(next); lsSet(MISSED_KEY, next); toast('A+ setup passed', { icon: '•' }) }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase.from('tos_trades').select('*').eq('user_id', session.user.id).order('trade_date', { ascending: true }).order('created_at', { ascending: true })
      if (cancelled) return
      if (error) { if (/relation|does not exist|schema cache|find the table/i.test(error.message || '')) setTableMissing(true); setTrades([]) }
      else setTrades(data || [])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [session.user.id])

  const onLogged = (t) => { setTrades(prev => [...prev, t]); setLogOpen(false); setReviewTrade(t) }
  const onDelete = async (id) => { const { error } = await supabase.from('tos_trades').delete().eq('id', id); if (error) return toast.error(error.message); setTrades(prev => prev.filter(t => t.id !== id)) }
  const onSaveReview = async (id, ans) => {
    const { data, error } = await supabase.from('tos_trades').update(ans).eq('id', id).select().single()
    if (error) return toast.error(error.message)
    setTrades(prev => prev.map(t => t.id === id ? data : t))
    setReviewTrade(null)
    toast.success('Review saved')
  }

  return (
    <div className="page-wrap" style={{ animation: 'tosIn .25s ease both', paddingBottom: '90px', color: TXT }}>
      <style dangerouslySetInnerHTML={{ __html: TOS_CSS }} />

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Brain size={20} color={GOLD} />
          <h1 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px', color: '#fff', margin: 0 }}>TRADING OS</h1>
        </div>
        <div style={{ display: 'flex', gap: '6px', background: PANEL, border: `1px solid ${LINE}`, borderRadius: '11px', padding: '4px' }}>
          {TABS.map(t => {
            const on = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                border: 'none', background: on ? GOLD : 'transparent', color: on ? '#000' : '#888', fontSize: '12.5px', fontWeight: on ? 800 : 600, transition: 'all .12s', minHeight: 0,
              }}><t.Icon size={14} />{t.label}</button>
            )
          })}
        </div>
      </div>

      {/* BODY */}
      {tableMissing ? <SqlNotice /> : loading ? (
        <div style={{ textAlign: 'center', padding: '70px', color: MUTE }}><Activity size={18} /> Loading…</div>
      ) : (
        <>
          {tab === 'command' && <Command trades={trades} settings={settings} command={command} setCommand={setCommand} onOpenSettings={() => setSettingsOpen(true)} missedThisMonth={missedThisMonth} onPass={onPass} />}
          {tab === 'analytics' && <Analytics trades={trades} settings={settings} missedThisMonth={missedThisMonth} />}
          {tab === 'review' && <Review trades={trades} onReview={setReviewTrade} onDelete={onDelete} />}
        </>
      )}

      {/* FLOATING LOG BUTTON */}
      {!tableMissing && (
        <button onClick={() => setLogOpen(true)} title="Log trade" style={{
          position: 'fixed', right: '22px', bottom: '22px', zIndex: 200,
          display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 20px', borderRadius: '99px',
          background: GOLD, color: '#000', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '14px',
          boxShadow: '0 8px 30px rgba(234,179,8,0.35)',
        }}><Plus size={18} /> Log</button>
      )}

      {logOpen && <LogModal session={session} command={command} tableMissing={tableMissing} onClose={() => setLogOpen(false)} onLogged={onLogged} />}
      {settingsOpen && <SettingsModal settings={settings} onClose={() => setSettingsOpen(false)} onSave={saveSettings} />}
      {reviewTrade && <ReviewModal trade={reviewTrade} onClose={() => setReviewTrade(null)} onSave={onSaveReview} />}
    </div>
  )
}

export default TOSPage
