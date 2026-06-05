// ═══════════════════════════════════════════════════════════════════════════
//  TRADING OPERATING SYSTEM  (TOS)
//  Private command center for eug777fx@gmail.com
//  6 pages: Daily Plan · Trade Log · Risk Engine · Performance · Funded · Review
//  Self-contained module — mounted from App.jsx when page === 'tos'.
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useRef } from 'react'
import toast from 'react-hot-toast'
import { supabase } from './lib/supabase'
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  BarChart, Bar, Cell, PieChart, Pie,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine,
} from 'recharts'
import {
  Brain, ClipboardList, BookOpen, Shield, BarChart2, Wallet,
  RefreshCw, Plus, Trash2, Check, X, AlertTriangle, TrendingUp, TrendingDown,
  Target, Activity, ChevronLeft, ChevronRight, ChevronDown, DollarSign, Loader2,
  ThumbsUp, ThumbsDown, Gauge, Scale, ShieldCheck, Crosshair, Trophy,
  CheckCircle, XCircle, Zap, Award, Calendar, Clock, Flame,
  Sparkles, Hourglass, Layers, Gem, Rocket, Eye,
} from 'lucide-react'

// ─── Palette ──────────────────────────────────────────────────────────────
const GOLD       = '#eab308'
const GOLD_SOFT  = 'rgba(234,179,8,0.15)'
const GOLD_LINE  = 'rgba(234,179,8,0.35)'
const GREEN      = '#7ee787'
const RED        = '#ff6b6b'
const YELLOW     = '#ffd166'
const ORANGE     = '#ff9f43'
const BLUE       = '#6ab7ff'
const BG         = '#080808'
const CARD_BG    = '#0d0d0d'
const CARD_BORD  = '#1f1f1f'

// ─── Shared style tokens (fixed dark/gold — independent of app theme) ───────
const card = { background: CARD_BG, border: `1px solid ${CARD_BORD}`, borderRadius: '16px', padding: '22px' }
const lbl  = { fontSize: '10px', color: '#6a6a6a', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: '6px' }
const inp  = { width: '100%', background: BG, border: `1px solid ${CARD_BORD}`, borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color .15s' }
const ta   = { ...inp, minHeight: '70px', resize: 'vertical', lineHeight: 1.6 }
const goldBtn = { background: GOLD, color: '#000', border: 'none', borderRadius: '10px', padding: '11px 20px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', fontFamily: 'inherit', transition: 'opacity .15s, transform .15s' }
const ghostBtn = { background: 'transparent', color: '#888', border: `1px solid ${CARD_BORD}`, borderRadius: '10px', padding: '11px 20px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'inherit' }

// ─── localStorage helpers ───────────────────────────────────────────────────
const lsGet = (k, fb) => { try { const s = localStorage.getItem(k); return s == null ? fb : JSON.parse(s) } catch { return fb } }
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage full / unavailable */ } }
// Local calendar date (NOT toISOString — that returns the UTC day, which rolls
// over mid-evening for NY-session traders and would silently reset the daily
// loss-count rule enforcement while it is still the same trading day).
const localKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayKey = () => localKey(new Date())
const makeId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`

// ─── number formatting ──────────────────────────────────────────────────────
const usd   = (n) => { const v = Number(n) || 0; return (v < 0 ? '-$' : '$') + Math.round(Math.abs(v)).toLocaleString() }
const usdK  = (n) => { const v = Number(n) || 0; const a = Math.abs(v); const s = v < 0 ? '-$' : '$'; return a >= 1000 ? `${s}${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : `${s}${Math.round(a)}` }
const pct   = (n) => `${Math.round(Number(n) || 0)}%`
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// ─── Risk settings (shared between Risk Engine + Performance) ───────────────
// Futures contracts the Risk Engine sizes for. `micro` points to the smaller
// sibling the engine auto-switches to when raw size < 1 (NQ→MNQ, ES→MES, ×10).
const RISK_INSTRUMENTS = {
  NQ:  { label: 'NQ',  name: 'E-mini NASDAQ', pointValue: 20, micro: 'MNQ' },
  MNQ: { label: 'MNQ', name: 'Micro NASDAQ',  pointValue: 2,  micro: null },
  ES:  { label: 'ES',  name: 'E-mini S&P',    pointValue: 50, micro: 'MES' },
  MES: { label: 'MES', name: 'Micro S&P',     pointValue: 5,  micro: null },
}
const RISK_KEY = 'tos_risk_settings'
const defaultRisk = { accountSize: '10000', riskPct: '1', stopLoss: '20', instrument: 'NQ' }
const getRisk = () => ({ ...defaultRisk, ...lsGet(RISK_KEY, {}) })
const getOneR = () => {
  const r = getRisk()
  const v = (parseFloat(r.accountSize) || 0) * (parseFloat(r.riskPct) || 0) / 100
  return v > 0 ? v : 100
}

// ─── Trade derived metrics ──────────────────────────────────────────────────
const followedRules = (t) => {
  let pts = 0
  if (t.liquidity_swept) pts++
  if (t.rejection_block || t.wick_ce) pts++
  if (t.ote_present) pts++
  if (t.key_open) pts++
  return pts >= 3
}
const computeProcessScore = (t) => (followedRules(t) ? 1 : -1)
const tradeR = (t) => {
  if (t.result === 'Win')  return (Number(t.rr) > 0 ? Number(t.rr) : 1)
  if (t.result === 'Loss') return -1
  return 0
}
const isThisWeek = (dateStr) => {
  if (!dateStr) return false
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); monday.setHours(0, 0, 0, 0)
  return d >= monday
}
const isThisMonth = (dateStr) => {
  if (!dateStr) return false
  const d = new Date(dateStr + 'T00:00:00'); const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}
// Analytics helpers (Edge / Streak / Psych / Goals)
const confluenceCount = (t) => (t.liquidity_swept ? 1 : 0) + ((t.rejection_block || t.wick_ce) ? 1 : 0) + (t.ote_present ? 1 : 0) + (t.key_open ? 1 : 0)
const winRateOf = (arr) => {
  const d = arr.filter(t => t.result === 'Win' || t.result === 'Loss')
  const w = d.filter(t => t.result === 'Win').length
  return { wr: d.length ? (w / d.length) * 100 : 0, n: d.length }
}
const tradeHour = (t) => { if (!t.created_at) return null; const h = new Date(t.created_at).getHours(); return Number.isNaN(h) ? null : h }
const weekdayOf = (dateStr) => dateStr ? new Date(dateStr + 'T00:00:00').getDay() : null // 0=Sun..6=Sat
// chronological (oldest→newest) decided trades
const chronoDecided = (trades) => [...trades]
  .filter(t => t.result === 'Win' || t.result === 'Loss')
  .sort((a, b) => a.trade_date === b.trade_date
    ? new Date(a.created_at || 0) - new Date(b.created_at || 0)
    : (a.trade_date || '').localeCompare(b.trade_date || ''))

// ─── Option constants ───────────────────────────────────────────────────────
const SESSIONS         = ['London', 'NY', 'Asian']
const HTF_POI          = ['H4 Rejection Block', 'H4 FVG', 'H1 Rejection Block', 'H1 FVG']
const KEY_OPENS        = ['18:00 Open', 'Midnight Open', '8:30 Open', '9:30 Open', '10:00 Open', '13:00 Open']
const OTE_LEVELS       = ['0.62', '0.705', '0.79']
const ENTRY_TRIGGERS   = ['Rejection Block', 'Wick CE']
const LOSS_REASONS     = ['Bias Error', 'Entry Error', 'Risk Error', 'Psychology Error', 'Market Conditions']
const NO_REASONS       = ['Wrong Bias', 'No Liquidity Sweep', 'No Rejection Block', 'No OTE', 'No Key Open', 'Chased Entry', 'Ignored Risk Rules', 'Emotional Trade', 'Revenge Trade']
const FUNDED_STATUS    = ['Challenge', 'Funded']

const INSTRUMENTS = {
  Futures: ['NQ', 'ES', 'YM', 'RTY', 'CL', 'GC', 'SI', 'ZB', 'ZN', 'MNQ', 'MES', 'MYM'],
  Forex:   ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'USD/CAD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'XAU/USD', 'XAG/USD'],
  Crypto:  ['BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'XRP/USD', 'DOGE/USD', 'AVAX/USD', 'LINK/USD'],
}

// ════════════════════════════════════════════════════════════════════════════
//  SHARED UI PRIMITIVES
// ════════════════════════════════════════════════════════════════════════════
function Chip({ label, on, onClick, color = GOLD }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '9px', padding: '10px 13px', borderRadius: '9px',
      border: `1px solid ${on ? GOLD_LINE : CARD_BORD}`,
      background: on ? GOLD_SOFT : 'transparent',
      color: on ? color : '#888', fontSize: '12.5px', fontWeight: on ? 600 : 500,
      cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', textAlign: 'left', width: '100%', minHeight: 0,
    }}>
      <span style={{
        width: '16px', height: '16px', borderRadius: '5px', flexShrink: 0,
        border: `1.5px solid ${on ? color : '#333'}`, background: on ? color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {on && <Check size={10} strokeWidth={3.5} color="#000" />}
      </span>
      {label}
    </button>
  )
}

function Seg({ options, value, onChange, activeColor = GOLD }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {options.map(o => {
        const opt = typeof o === 'string' ? { label: o, value: o } : o
        const active = value === opt.value
        return (
          <button key={String(opt.value)} type="button" onClick={() => onChange(active ? null : opt.value)} style={{
            flex: '1 1 0', minWidth: '64px', padding: '10px 12px', borderRadius: '9px',
            border: `1px solid ${active ? activeColor : CARD_BORD}`,
            background: active ? `${activeColor}1f` : 'transparent',
            color: active ? activeColor : '#777', fontSize: '12.5px', fontWeight: active ? 700 : 500,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', whiteSpace: 'nowrap',
          }}>{opt.label}</button>
        )
      })}
    </div>
  )
}

function YesNo({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      {[{ l: 'Yes', v: true, c: GREEN }, { l: 'No', v: false, c: '#888' }].map(o => {
        const active = value === o.v
        return (
          <button key={o.l} type="button" onClick={() => onChange(active ? null : o.v)} style={{
            flex: 1, padding: '8px', borderRadius: '8px',
            border: `1px solid ${active ? o.c : CARD_BORD}`,
            background: active ? `${o.c}1a` : 'transparent',
            color: active ? o.c : '#666', fontSize: '12px', fontWeight: active ? 700 : 500,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', minHeight: 0,
          }}>{o.l}</button>
        )
      })}
    </div>
  )
}

function StatCard({ label, value, sub, color = '#fff', Icon }) {
  return (
    <div style={{ ...card, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={lbl}>{label}</div>
        {Icon && <Icon size={14} color={color === '#fff' ? '#555' : color} />}
      </div>
      <div style={{ fontSize: '26px', fontWeight: 800, color, letterSpacing: '-1px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>{sub}</div>}
    </div>
  )
}

function ProgressBar({ value, max, dangerHigh = true, label, valueText }) {
  const ratio = max > 0 ? clamp(value / max, 0, 1) : 0
  // dangerHigh: filling the bar is BAD (drawdown). else filling is GOOD (profit target).
  let color = GREEN
  if (dangerHigh) { color = ratio >= 0.8 ? RED : ratio >= 0.5 ? YELLOW : GREEN }
  else            { color = ratio >= 0.66 ? GREEN : ratio >= 0.33 ? YELLOW : '#888' }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '11px', color, fontWeight: 700 }}>{valueText}</span>
      </div>
      <div style={{ height: '8px', borderRadius: '6px', background: '#161616', overflow: 'hidden' }}>
        <div style={{ width: `${ratio * 100}%`, height: '100%', background: color, borderRadius: '6px', transition: 'width .4s ease, background .3s' }} />
      </div>
    </div>
  )
}

const chartTooltip = { background: '#0d0d0d', border: `1px solid ${CARD_BORD}`, borderRadius: '8px', fontSize: '12px' }
const axTick = { fill: '#666', fontSize: 10 }
const noAxis = { axisLine: false, tickLine: false }

function EmptyState({ Icon = BarChart2, title, sub }) {
  const Glyph = Icon
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '46px 24px', gap: '10px', textAlign: 'center' }}>
      <Glyph size={34} color="#333" />
      <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{title}</div>
      {sub && <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.6, maxWidth: '300px' }}>{sub}</div>}
    </div>
  )
}

// ─── Symbol search (same instrument list / behaviour as main journal) ───────
function SymbolSearch({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const q = search.toLowerCase()
  const filtered = Object.entries(INSTRUMENTS)
    .map(([cat, syms]) => ({ cat, syms: syms.filter(s => s.toLowerCase().includes(q)) }))
    .filter(g => g.syms.length > 0)
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(v => !v)} style={{ ...inp, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
        <span style={{ color: value ? '#fff' : '#555' }}>{value || 'Select instrument…'}</span>
        <ChevronDown size={14} color="#555" />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100, background: '#0d0d0d', border: `1px solid ${CARD_BORD}`, borderRadius: '8px', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', maxHeight: '260px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #181818' }}>
            <input autoFocus placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} onClick={e => e.stopPropagation()} style={{ ...inp, padding: '7px 10px', fontSize: '12px' }} />
          </div>
          <div style={{ overflowY: 'auto' }}>
            {filtered.map(({ cat, syms }) => (
              <div key={cat}>
                <div style={{ padding: '6px 12px 4px', fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, position: 'sticky', top: 0, background: '#0d0d0d' }}>{cat}</div>
                {syms.map(s => (
                  <div key={s} onMouseDown={() => { onChange(s); setOpen(false); setSearch('') }}
                    style={{ padding: '8px 14px', fontSize: '13px', color: value === s ? GOLD : '#aaa', background: value === s ? GOLD_SOFT : 'transparent', cursor: 'pointer', fontWeight: value === s ? 600 : 400 }}>{s}</div>
                ))}
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: '20px', fontSize: '12px', color: '#444', textAlign: 'center' }}>No matches</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  PAGE 1 — DAILY TRADING PLAN
// ════════════════════════════════════════════════════════════════════════════
// Draw options for the merged Liquidity & Delivery section
const DRAW_OPTIONS = ['PDH', 'PDL', 'Data High', 'Data Low', 'Equal Highs', 'Equal Lows', 'Midnight Open', 'London High', 'London Low', 'Session High', 'Session Low', 'NWOG', 'Gap Fill']
const RB_CHECKS = ['Liquidity sweep occurred', 'Strong rejection exists', 'Opposing candle confirms', 'NOT just a wick']

function DrawSelect({ value, onChange }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...inp, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', paddingRight: '32px', color: value ? '#fff' : '#555' }}>
        <option value="">Select…</option>
        {DRAW_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} color="#555" style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  )
}

const blankPlan = () => ({
  bias: '', biasReason: '',
  primaryDraw: '', secondaryDraw: '', againstFirst: null, moAddressed: null,
  londonHigh: null, londonLow: null, sessionHigh: null, sessionLow: null,
  poi: [], poiText: '',
  keyOpens: [],
  ote: [],
  entryTrigger: '', rbChecks: [false, false, false, false], wickCe: false,
  finalGate: '',
})

// Weighted /50 score from all sections. Bias and Entry are required (red-marked).
// Maxes sum to exactly 50: Bias 10 · Draw 8 · Liquidity 8 · Location 8 · Entry 10 · Gate 6.
function computeQuality(p) {
  const bias = p.bias ? 10 : 0
  // Draw — primary 5 + secondary 3
  const draw = (p.primaryDraw ? 5 : 0) + (p.secondaryDraw ? 3 : 0)
  // Liquidity — session levels answered (×4) + MO answered (2) + against-first answered (2)
  const sessAns = ['londonHigh', 'londonLow', 'sessionHigh', 'sessionLow'].filter(k => p[k] !== null).length
  const liquidity = Math.round((sessAns / 4) * 4) + (p.moAddressed !== null ? 2 : 0) + (p.againstFirst !== null ? 2 : 0)
  // Location — POI (1→4, 2+→6) + OTE (any→2)
  const pc = p.poi.length
  const location = (pc >= 2 ? 6 : pc === 1 ? 4 : 0) + (p.ote.length > 0 ? 2 : 0)
  // Entry — REQUIRED: trigger 4 + validation 6
  let entry = 0
  if (p.entryTrigger === 'Rejection Block') entry = 4 + Math.round((p.rbChecks.filter(Boolean).length / 4) * 6)
  else if (p.entryTrigger === 'Wick CE') entry = 4 + (p.wickCe ? 6 : 0)
  // Timing & Gate — key opens (max 3) + final gate (≥15 → 3, >0 → 1)
  const gateLen = p.finalGate.trim().length
  const gate = Math.min(3, p.keyOpens.length) + (gateLen >= 15 ? 3 : gateLen > 0 ? 1 : 0)
  const parts = {
    bias: clamp(bias, 0, 10), draw: clamp(draw, 0, 8), liquidity: clamp(liquidity, 0, 8),
    location: clamp(location, 0, 8), entry: clamp(entry, 0, 10), gate: clamp(gate, 0, 6),
  }
  return { parts, total: Math.min(50, parts.bias + parts.draw + parts.liquidity + parts.location + parts.entry + parts.gate) }
}

// Always merge with blankPlan() so older saved plans gain the new merged fields.
const loadPlan = (dt) => ({ ...blankPlan(), ...lsGet(`tos_plan_${dt}`, {}) })

function DailyPlan({ pro = false }) {
  const [date, setDate] = useState(todayKey())
  const [plan, setPlan] = useState(() => loadPlan(todayKey()))
  const [shake, setShake] = useState(false)

  // Reload the plan when the selected date changes (adjust-state-during-render
  // pattern — avoids a setState-in-effect cascade).
  const [loadedDate, setLoadedDate] = useState(date)
  if (loadedDate !== date) { setLoadedDate(date); setPlan(loadPlan(date)) }

  // persist on every change
  useEffect(() => { lsSet(`tos_plan_${date}`, plan) }, [plan, date])

  const toggle = (key, val) => setPlan(p => {
    const arr = p[key]
    return { ...p, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }
  })
  const set = (key, val) => setPlan(p => ({ ...p, [key]: val }))
  const toggleRb = (i) => setPlan(p => ({ ...p, rbChecks: p.rbChecks.map((v, idx) => idx === i ? !v : v) }))

  const { parts, total } = computeQuality(plan)
  const scoreColor = total >= 35 ? GREEN : total >= 20 ? YELLOW : RED
  const shiftDate = (days) => {
    const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + days); setDate(localKey(d))
  }
  const isToday = date === todayKey()

  const chipGroup = (key, options) => (
    <div className="tos-chipgrid">
      {options.map(o => <Chip key={o} label={o} on={plan[key].includes(o)} onClick={() => toggle(key, o)} />)}
    </div>
  )
  const sec = (title, hint) => (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: GOLD }} />
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{title}</div>
      </div>
      {hint && <div style={{ fontSize: '11px', color: '#666', marginTop: '4px', marginLeft: '13px' }}>{hint}</div>}
    </div>
  )
  const note = (Glyph, color, text) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '12px', fontSize: '12px', color, lineHeight: 1.4 }}>
      <Glyph size={14} style={{ flexShrink: 0 }} /> {text}
    </div>
  )

  // Section-7 entry validation state
  const rbComplete = plan.rbChecks.every(Boolean)
  const finalLen = plan.finalGate.trim().length
  const finalValid = finalLen >= 15
  const untouchedSession = DELIV_SESSION.some(s => plan[s.k] === false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Date controls */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => shiftDate(-1)} style={iconBtn}><ChevronLeft size={16} /></button>
          <input type="date" className="tos-date" value={date} max={todayKey()} onChange={e => setDate(e.target.value || todayKey())}
            style={{ ...inp, width: 'auto', padding: '8px 12px', colorScheme: 'dark', cursor: 'pointer' }} />
          <button onClick={() => shiftDate(1)} disabled={isToday} style={{ ...iconBtn, opacity: isToday ? 0.35 : 1, cursor: isToday ? 'not-allowed' : 'pointer' }}><ChevronRight size={16} /></button>
          {!isToday && <button onClick={() => setDate(todayKey())} style={{ ...ghostBtn, padding: '7px 14px', fontSize: '12px' }}>Today</button>}
        </div>
        <div style={{ fontSize: '12px', color: GOLD, fontWeight: 600 }}>
          {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* 1 — DAILY BIAS */}
      <div style={card}>
        {sec('1 · Daily Bias')}
        <div style={{ marginBottom: '12px' }}>
          <Seg options={[{ label: 'PxH', value: 'PxH' }, { label: 'PxL', value: 'PxL' }]} value={plan.bias} onChange={v => set('bias', v)} />
        </div>
        <div style={lbl}>Why is this my bias?</div>
        <textarea value={plan.biasReason} onChange={e => set('biasReason', e.target.value)} style={ta} placeholder="HTF context, draw on liquidity, narrative…" />
      </div>

      {/* 2 — LIQUIDITY & DELIVERY */}
      <div style={card}>
        {sec('2 · Liquidity & Delivery')}
        <div className="tos-grid-2">
          <div><div style={lbl}>Primary Draw — targeted FIRST</div><DrawSelect value={plan.primaryDraw} onChange={v => set('primaryDraw', v)} /></div>
          <div><div style={lbl}>Secondary Draw — comes after</div><DrawSelect value={plan.secondaryDraw} onChange={v => set('secondaryDraw', v)} /></div>
        </div>
        <div className="tos-grid-2" style={{ marginTop: '14px' }}>
          <div><div style={lbl}>Trading against the first objective?</div><YesNo value={plan.againstFirst} onChange={v => set('againstFirst', v)} /></div>
          <div><div style={lbl}>Has Midnight Open been addressed?</div><YesNo value={plan.moAddressed} onChange={v => set('moAddressed', v)} /></div>
        </div>
        {plan.againstFirst === true && note(AlertTriangle, D_AMBER, 'Consider waiting for the first objective to be met before entering.')}
        {plan.moAddressed === false && note(AlertTriangle, GOLD, 'Midnight Open unaddressed — consider whether it is the first draw.')}
      </div>

      {/* 3 — SESSION LIQUIDITY */}
      <div style={card}>
        {sec('3 · Session Liquidity')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {DELIV_SESSION.map(s => (
            <div key={s.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: '#ddd', fontWeight: 600 }}>{s.l} taken?</span>
              <div style={{ width: '150px' }}><YesNo value={plan[s.k]} onChange={v => set(s.k, v)} /></div>
            </div>
          ))}
        </div>
        {untouchedSession && note(Eye, D_AMBER, 'Untouched levels exist — factor into bias.')}
      </div>

      {/* 4 — HTF POI */}
      <div style={card}>
        {sec('4 · HTF Point of Interest')}
        {chipGroup('poi', HTF_POI)}
        <div style={{ ...lbl, marginTop: '14px' }}>Main area of interest</div>
        <textarea value={plan.poiText} onChange={e => set('poiText', e.target.value)} style={ta} placeholder="Where do I expect the reaction?" />
      </div>

      {/* 5 — KEY OPENS */}
      <div style={card}>
        {sec('5 · Key Opens')}
        {chipGroup('keyOpens', KEY_OPENS)}
      </div>

      {/* 6 — OTE */}
      <div style={card}>
        {sec('6 · OTE')}
        <div className="tos-chipgrid">
          {OTE_LEVELS.map(o => <Chip key={o} label={o} on={plan.ote.includes(o)} onClick={() => toggle('ote', o)} />)}
        </div>
      </div>

      {/* 7 — ENTRY TRIGGER + VALIDATION */}
      <div style={card}>
        {sec('7 · Entry Trigger', 'Select one')}
        <Seg options={ENTRY_TRIGGERS} value={plan.entryTrigger} onChange={v => set('entryTrigger', v || '')} />
        {plan.entryTrigger === 'Rejection Block' && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ ...lbl, marginBottom: '8px' }}>Rejection Block validation</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {RB_CHECKS.map((c, i) => <DCheck key={i} label={c} on={plan.rbChecks[i]} onClick={() => toggleRb(i)} />)}
            </div>
            {!rbComplete && note(XCircle, D_RED, 'Rejection block criteria incomplete.')}
          </div>
        )}
        {plan.entryTrigger === 'Wick CE' && (
          <div style={{ marginTop: '14px' }}>
            <DCheck label="Midpoint / CE identified" on={plan.wickCe} onClick={() => set('wickCe', !plan.wickCe)} />
          </div>
        )}
      </div>

      {/* 8 — FINAL GATE */}
      <div style={{ ...card, border: `1px solid ${GOLD_LINE}`, background: 'linear-gradient(135deg, rgba(234,179,8,0.05), #0d0d0d)' }}>
        {sec('8 · Final Gate')}
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '12px', lineHeight: 1.35 }}>What must price do FIRST before reaching your target?</div>
        <input
          value={plan.finalGate}
          onChange={e => set('finalGate', e.target.value)}
          onBlur={() => { if (finalLen > 0 && !finalValid) { setShake(true); setTimeout(() => setShake(false), 450) } }}
          className={shake ? 'tos-shake' : ''}
          style={{ ...inp, borderColor: finalValid ? D_GREEN + '88' : (finalLen > 0 ? 'rgba(239,68,68,0.5)' : CARD_BORD) }}
          placeholder="e.g. Sweep equal lows at 21,180 before reaching my long target at 21,450"
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '7px' }}>
          <span style={{ fontSize: '11px', color: !finalValid && finalLen > 0 ? D_RED : '#666' }}>
            {finalValid ? 'Specific enough.' : 'Required — be specific (min 15 chars).'}
          </span>
          <span style={{ fontSize: '11px', color: finalValid ? D_GREEN : '#666', fontWeight: 600 }}>{finalLen}/15</span>
        </div>
      </div>

      {/* 9 — Trade Quality Score */}
      <div style={{ ...card, marginTop: '14px', border: `1px solid ${GOLD_LINE}`, background: 'linear-gradient(180deg, rgba(234,179,8,0.05), #0d0d0d)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Gauge size={18} color={GOLD} />
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', letterSpacing: '0.02em', textTransform: 'uppercase' }}>Trade Quality Score</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '40px', fontWeight: 900, color: scoreColor, letterSpacing: '-2px', lineHeight: 1 }}>{total}</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#555' }}>/50</span>
          </div>
        </div>
        {/* big bar */}
        <div style={{ height: '12px', borderRadius: '8px', background: '#161616', overflow: 'hidden', marginBottom: '18px' }}>
          <div style={{ width: `${(total / 50) * 100}%`, height: '100%', background: scoreColor, borderRadius: '8px', transition: 'width .4s ease, background .3s' }} />
        </div>
        <div className="tos-grid-3">
          {[
            { k: 'bias',      l: 'Bias',          max: 10, req: true },
            { k: 'draw',      l: 'Draw',          max: 8 },
            { k: 'liquidity', l: 'Liquidity',     max: 8 },
            { k: 'location',  l: 'Location',      max: 8 },
            { k: 'entry',     l: 'Entry',         max: 10, req: true },
            { k: 'gate',      l: 'Timing & Gate', max: 6 },
          ].map(({ k, l, max, req }) => {
            const v = parts[k]
            const ratio = max > 0 ? v / max : 0
            const c = ratio >= 0.7 ? GREEN : ratio >= 0.4 ? YELLOW : RED
            return (
              <div key={k} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: '10px', background: BG, border: `1px solid ${req && v === 0 ? 'rgba(255,107,107,0.4)' : CARD_BORD}` }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: c, lineHeight: 1 }}>{v}<span style={{ fontSize: '11px', color: '#555' }}>/{max}</span></div>
                <div style={{ ...lbl, marginBottom: 0, marginTop: '7px' }}>{l}{req && <span style={{ color: RED, marginLeft: '3px' }}>*</span>}</div>
              </div>
            )
          })}
        </div>
        {(() => {
          const missing = [!plan.bias && 'Bias', !plan.entryTrigger && 'Entry Trigger'].filter(Boolean)
          const v = missing.length
            ? { Icon: AlertTriangle, color: ORANGE, text: `Missing required: ${missing.join(' + ')}` }
            : total >= 35 ? { Icon: CheckCircle, color: GREEN, text: 'A+ setup — conditions aligned' }
            : total >= 20 ? { Icon: AlertTriangle, color: YELLOW, text: 'Mediocre — wait for more confluence' }
            : { Icon: XCircle, color: RED, text: 'Low quality — likely no-trade' }
          return (
            <div style={{ marginTop: '14px', fontSize: '11px', color: '#888', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', flexWrap: 'wrap' }}>
              <v.Icon size={13} color={v.color} />
              <span style={{ color: v.color, fontWeight: 600 }}>{v.text}</span>
              <span style={{ color: '#444' }}>· * required</span>
            </div>
          )
        })()}
      </div>

      {pro && (() => {
        const probability = (!plan.bias || !plan.entryTrigger) ? Math.round((total / 50) * 40) : Math.round(40 + (total / 50) * 50)
        const probColor = probability >= 65 ? GREEN : probability >= 40 ? YELLOW : RED
        const prevDate = (() => { const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() - 1); return localKey(d) })()
        const prevRaw = lsGet(`tos_plan_${prevDate}`, null)
        const prev = prevRaw ? { ...blankPlan(), ...prevRaw } : null
        const prevScore = prev ? computeQuality(prev).total : 0
        return (
          <div style={{ ...card, marginTop: '14px' }}>
            <SectionTitle Icon={Gauge}>Setup Analysis (Pro)</SectionTitle>
            <div className="tos-grid-2">
              <div>
                <div style={lbl}>Confluence Strength</div>
                <div style={{ height: '14px', borderRadius: '8px', background: '#161616', overflow: 'hidden', marginTop: '6px', marginBottom: '8px' }}>
                  <div style={{ width: `${(total / 50) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${ORANGE}, ${GOLD}, ${GREEN})`, borderRadius: '8px', transition: 'width .4s' }} />
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>{total}/50 confluence points</div>
                <div style={{ marginTop: '18px', display: 'flex', alignItems: 'baseline', gap: '9px' }}>
                  <span style={{ fontSize: '34px', fontWeight: 900, color: probColor, lineHeight: 1 }}>{probability}%</span>
                  <span style={{ ...lbl, marginBottom: 0 }}>Setup probability</span>
                </div>
                <div style={{ fontSize: '10px', color: '#555', marginTop: '5px' }}>Heuristic from the quality score — not a guarantee.</div>
              </div>
              <div>
                <div style={lbl}>Previous Day's Plan</div>
                {prev ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginTop: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#888' }}>{prevDate}</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {prev.bias ? <Tag color={GOLD}>{prev.bias}</Tag> : null}
                      {prev.primaryDraw ? <Tag color={BLUE}>{prev.primaryDraw}</Tag> : null}
                      {prev.entryTrigger ? <Tag>{prev.entryTrigger}</Tag> : null}
                      <Tag color={BLUE}>{prev.poi.length} POI</Tag>
                      <Tag color={prevScore >= 35 ? GREEN : prevScore >= 20 ? YELLOW : RED}>{prevScore}/50</Tag>
                    </div>
                    {prev.biasReason ? <div style={{ fontSize: '12px', color: '#999', lineHeight: 1.5 }}>{prev.biasReason}</div> : null}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: '#555', marginTop: '10px' }}>No plan saved for {prevDate}.</div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

const iconBtn = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '8px', background: BG, border: `1px solid ${CARD_BORD}`, color: '#aaa', cursor: 'pointer', flexShrink: 0 }

// ════════════════════════════════════════════════════════════════════════════
//  PAGE 2 — TRADE EXECUTION LOG
// ════════════════════════════════════════════════════════════════════════════
const blankTrade = () => ({
  date: todayKey(), session: '', instrument: '', direction: '', bias: '',
  entry: '', stop: '', target: '', result: '',
  liquidity_swept: null, rejection_block: null, wick_ce: null, ote_present: null, key_open: null,
  loss_reason: '', notes: '',
})

// Seed a new trade from today's saved plan so the bias carries over
// (Daily Plan → Trade Log data flow). Confluence Yes/No flags stay null —
// those record what actually happened on the trade, not the morning intention.
const initTradeForm = () => {
  const plan = lsGet(`tos_plan_${todayKey()}`, null)
  return { ...blankTrade(), bias: plan?.bias || '' }
}

function TradeLog({ session, trades, tableMissing, onAdded, onDeleted, pro = false }) {
  const [form, setForm] = useState(initTradeForm)
  const [saving, setSaving] = useState(false)
  const [dismissed, setDismissed] = useState({}) // in-memory only → reappears on reload

  const F = (k) => (v) => setForm(f => ({ ...f, [k]: v }))
  const FE = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // RR auto-calc
  const rr = useMemo(() => {
    const e = parseFloat(form.entry), s = parseFloat(form.stop), t = parseFloat(form.target)
    if (!isFinite(e) || !isFinite(s) || !isFinite(t)) return null
    const risk = Math.abs(e - s), reward = Math.abs(t - e)
    if (risk <= 0) return null
    return +(reward / risk).toFixed(2)
  }, [form.entry, form.stop, form.target])

  // today's trades for rule enforcement
  const todays = trades.filter(t => t.trade_date === todayKey())
  const lossesToday = todays.filter(t => t.result === 'Loss').length
  const winsToday   = todays.filter(t => t.result === 'Win').length
  // earlier-day trades (incl. anything back-dated) so they're visible & deletable here
  const recent = trades.filter(t => t.trade_date !== todayKey()).slice(0, 15)

  const banners = []
  if (lossesToday >= 2) banners.push({ id: 'stop', type: 'red', Icon: XCircle, text: 'STOP TRADING FOR TODAY — two losses, rules enforced' })
  else if (lossesToday === 1) banners.push({ id: 'half', type: 'red', Icon: AlertTriangle, text: 'HALF RISK REQUIRED — reduce position size by 50%' })
  if (winsToday >= 1 && lossesToday === 0) banners.push({ id: 'win', type: 'green', Icon: CheckCircle, text: 'FIRST TRADE WON — consider calling it a day' })

  // Low-quality plan nudge — connects the morning Daily Plan score to the log.
  // Only fires when a plan was actually started today (not a blank/auto-saved one).
  const planRaw = lsGet(`tos_plan_${todayKey()}`, null)
  const planStarted = planRaw && (planRaw.bias || planRaw.biasReason || planRaw.entryTrigger ||
    planRaw.primaryDraw || planRaw.finalGate || planRaw.poi?.length ||
    planRaw.keyOpens?.length || planRaw.ote?.length)
  if (planStarted) {
    const planTotal = computeQuality({ ...blankPlan(), ...planRaw }).total
    if (planTotal < 20) banners.push({ id: 'plan', type: 'red', Icon: AlertTriangle, text: `PLAN QUALITY ${planTotal}/50 — no-trade conditions, confluence is thin` })
  }

  const save = async () => {
    if (!form.instrument) return toast.error('Pick an instrument')
    if (!form.result)     return toast.error('Select a result (Win / Loss / BE)')
    if (form.result === 'Loss' && !form.loss_reason) return toast.error('A losing trade needs a loss reason')
    if (tableMissing)     return toast.error('tos_trades table missing — run the SQL (see Performance tab)')

    setSaving(true)
    const row = {
      user_id: session.user.id,
      trade_date: form.date || todayKey(),
      session: form.session || null,
      instrument: form.instrument,
      direction: form.direction || null,
      bias: form.bias || null,
      entry: parseFloat(form.entry) || null,
      stop_loss: parseFloat(form.stop) || null,
      target: parseFloat(form.target) || null,
      rr: rr,
      result: form.result,
      liquidity_swept: !!form.liquidity_swept,
      rejection_block: !!form.rejection_block,
      wick_ce: !!form.wick_ce,
      ote_present: !!form.ote_present,
      key_open: !!form.key_open,
      loss_reason: form.result === 'Loss' ? form.loss_reason : null,
      notes: form.notes || null,
    }
    row.process_score = computeProcessScore(row)
    const { data, error } = await supabase.from('tos_trades').insert(row).select().single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    onAdded(data)
    setForm(initTradeForm())
    toast.success(form.date === todayKey() ? 'Trade logged' : `Trade filed under ${form.date}`)
  }

  const del = async (id) => {
    const { error } = await supabase.from('tos_trades').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    onDeleted(id)
  }

  const visibleBanners = banners.filter(b => !dismissed[b.id])

  return (
    <div>
      {/* RULE ENFORCEMENT BANNERS */}
      {visibleBanners.map(b => (
        <div key={b.id} style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', marginBottom: '12px',
          borderRadius: '12px', fontWeight: 800, fontSize: '14px', letterSpacing: '0.01em',
          background: b.type === 'red' ? 'rgba(255,107,107,0.12)' : 'rgba(126,231,135,0.12)',
          border: `1px solid ${b.type === 'red' ? 'rgba(255,107,107,0.45)' : 'rgba(126,231,135,0.45)'}`,
          color: b.type === 'red' ? RED : GREEN,
          animation: 'tosBannerPulse 2.4s ease-in-out infinite',
        }}>
          <b.Icon size={20} />
          <span style={{ flex: 1 }}>{b.text}</span>
          <button onClick={() => setDismissed(d => ({ ...d, [b.id]: true }))} style={{ background: 'transparent', border: 'none', color: 'inherit', opacity: 0.6, cursor: 'pointer', display: 'flex', minHeight: 0 }}><X size={18} /></button>
        </div>
      ))}

      <div className="tos-grid-log">
        {/* ── FORM ── */}
        <div style={card}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <Plus size={16} color={GOLD} /> Log a Trade
          </div>

          <div className="tos-grid-3" style={{ marginBottom: '14px' }}>
            <div><div style={lbl}>Date</div><input type="date" className="tos-date" value={form.date} max={todayKey()} onChange={FE('date')} style={{ ...inp, colorScheme: 'dark' }} /></div>
            <div><div style={lbl}>Session</div><Seg options={SESSIONS} value={form.session} onChange={F('session')} /></div>
            <div><div style={lbl}>Instrument</div><SymbolSearch value={form.instrument} onChange={F('instrument')} /></div>
          </div>

          <div className="tos-grid-2" style={{ marginBottom: '14px' }}>
            <div><div style={lbl}>Direction</div><Seg options={[{ label: 'Long', value: 'Long' }, { label: 'Short', value: 'Short' }]} value={form.direction} onChange={F('direction')} activeColor={form.direction === 'Short' ? RED : GREEN} /></div>
            <div><div style={lbl}>Bias</div><Seg options={['PxH', 'PxL']} value={form.bias} onChange={F('bias')} /></div>
          </div>

          <div className="tos-grid-3" style={{ marginBottom: '8px' }}>
            <div><div style={lbl}>Entry</div><input value={form.entry} onChange={FE('entry')} inputMode="decimal" style={inp} placeholder="0.00" /></div>
            <div><div style={lbl}>Stop</div><input value={form.stop} onChange={FE('stop')} inputMode="decimal" style={inp} placeholder="0.00" /></div>
            <div><div style={lbl}>Target</div><input value={form.target} onChange={FE('target')} inputMode="decimal" style={inp} placeholder="0.00" /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px', fontSize: '12px' }}>
            <span style={{ color: '#666' }}>Risk : Reward</span>
            <span style={{ fontWeight: 800, color: rr ? GOLD : '#444', fontSize: '15px' }}>{rr ? `1 : ${rr}` : '—'}</span>
          </div>

          <div style={{ height: '1px', background: CARD_BORD, margin: '4px 0 16px' }} />

          <div><div style={lbl}>Result</div>
            <Seg options={[{ label: 'Win', value: 'Win' }, { label: 'Loss', value: 'Loss' }, { label: 'BE', value: 'BE' }]}
              value={form.result}
              onChange={F('result')}
              activeColor={form.result === 'Loss' ? RED : form.result === 'BE' ? '#999' : GREEN} />
          </div>

          {/* Loss analysis (required for losses) */}
          {form.result === 'Loss' && (
            <div style={{ marginTop: '14px', padding: '14px', borderRadius: '10px', background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.3)' }}>
              <div style={{ ...lbl, color: RED, marginBottom: '10px' }}>Loss Reason — required</div>
              <div className="tos-chipgrid">
                {LOSS_REASONS.map(r => (
                  <button key={r} type="button" onClick={() => F('loss_reason')(form.loss_reason === r ? '' : r)} style={{
                    padding: '9px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                    border: `1px solid ${form.loss_reason === r ? RED : CARD_BORD}`,
                    background: form.loss_reason === r ? 'rgba(255,107,107,0.15)' : 'transparent',
                    color: form.loss_reason === r ? RED : '#888', fontWeight: form.loss_reason === r ? 700 : 500, minHeight: 0,
                  }}>{r}</button>
                ))}
              </div>
            </div>
          )}

          {/* Confluence yes/no */}
          <div className="tos-grid-2" style={{ marginTop: '16px', gap: '12px' }}>
            {[
              { k: 'liquidity_swept', l: 'Liquidity swept?' },
              { k: 'rejection_block', l: 'Rejection Block?' },
              { k: 'wick_ce', l: 'Wick CE?' },
              { k: 'ote_present', l: 'OTE present?' },
              { k: 'key_open', l: 'Key Open involved?' },
            ].map(({ k, l }) => (
              <div key={k}><div style={lbl}>{l}</div><YesNo value={form[k]} onChange={F(k)} /></div>
            ))}
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={lbl}>Notes</div>
            <textarea value={form.notes} onChange={FE('notes')} style={ta} placeholder="Execution notes, screenshots reference, context…" />
          </div>

          <button onClick={save} disabled={saving} style={{ ...goldBtn, width: '100%', marginTop: '18px', opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {saving ? <><Loader2 size={15} className="tos-spin" /> Saving…</> : <>Log Trade</>}
          </button>
        </div>

        {/* ── TRADE LISTS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Today's Trades</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{todays.length} logged</div>
            </div>
            {todays.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: '#555', fontSize: '13px' }}>No trades logged today.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {todays.map(t => <TradeRow key={t.id} t={t} onDelete={del} pro={pro} />)}
              </div>
            )}
          </div>

          {recent.length > 0 && (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recent Trades</div>
                <div style={{ fontSize: '12px', color: '#666' }}>last {recent.length}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recent.map(t => <TradeRow key={t.id} t={t} onDelete={del} showDate pro={pro} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Tag({ children, color = '#888' }) {
  return <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: `${color}14`, color, border: `1px solid ${color}28` }}>{children}</span>
}

function TradeRow({ t, onDelete, showDate = false, pro = false }) {
  const c = t.result === 'Win' ? GREEN : t.result === 'Loss' ? RED : '#999'
  const cc = confluenceCount(t)
  const entryTime = t.created_at ? new Date(t.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'
  return (
    <div style={{ padding: '12px 14px', borderRadius: '10px', background: BG, border: `1px solid ${CARD_BORD}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, color: '#fff', fontSize: '14px' }}>{t.instrument}</span>
          <span style={{ fontSize: '11px', color: t.direction === 'Short' ? RED : GREEN }}>{t.direction || '—'}</span>
          <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700, background: `${c}1f`, color: c, border: `1px solid ${c}40` }}>{t.result}</span>
          {showDate && <span style={{ fontSize: '11px', color: '#666' }}>{t.trade_date}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span style={{ fontSize: '12px', color: GOLD, fontWeight: 700 }}>{t.rr ? `${t.rr}R` : '—'}</span>
          <button onClick={() => onDelete(t.id)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', display: 'flex', minHeight: 0, padding: 0 }} title="Delete"><Trash2 size={14} /></button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '9px' }}>
        {t.session && <Tag>{t.session}</Tag>}
        {t.liquidity_swept && <Tag>Liq swept</Tag>}
        {t.rejection_block && <Tag>RB</Tag>}
        {t.wick_ce && <Tag>Wick CE</Tag>}
        {t.ote_present && <Tag>OTE</Tag>}
        {t.key_open && <Tag>Key Open</Tag>}
        {t.loss_reason && <Tag color={RED}>{t.loss_reason}</Tag>}
        <Tag color={followedRules(t) ? GREEN : ORANGE}>{followedRules(t) ? <><Check size={9} strokeWidth={3} style={{ verticalAlign: '-1px' }} /> Rules</> : <><X size={9} strokeWidth={3} style={{ verticalAlign: '-1px' }} /> Rules</>}</Tag>
      </div>
      {t.notes && <div style={{ fontSize: '12px', color: '#888', marginTop: '8px', lineHeight: 1.5 }}>{t.notes}</div>}
      {pro && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '10px', paddingTop: '9px', borderTop: '1px solid #161616' }}>
          {[
            { Icon: Layers, l: 'Confluence', v: `${cc}/4`, c: cc >= 3 ? GREEN : cc === 2 ? YELLOW : RED },
            { Icon: Gauge, l: 'Setup', v: `${Math.round(cc / 4 * 100)}`, c: GOLD },
            { Icon: Clock, l: 'Entry', v: entryTime, c: '#aaa' },
            { Icon: ShieldCheck, l: 'Process', v: `${(t.process_score || 0) > 0 ? '+' : ''}${t.process_score || 0}`, c: (t.process_score || 0) > 0 ? GREEN : RED },
          ].map(m => (
            <div key={m.l} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <m.Icon size={12} color="#555" />
              <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.l}</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: m.c }}>{m.v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  PAGE 3 — RISK MANAGEMENT ENGINE
// ════════════════════════════════════════════════════════════════════════════
function RiskEngine({ lossTakenToday, trades = [], pro = false }) {
  const [r, setR] = useState(() => getRisk())
  const [halfManual, setHalfManual] = useState(false)
  useEffect(() => { lsSet(RISK_KEY, r) }, [r])

  const halfActive = halfManual || lossTakenToday
  const set = (k) => (e) => setR(prev => ({ ...prev, [k]: e.target.value }))

  const inst  = RISK_INSTRUMENTS[r.instrument] || RISK_INSTRUMENTS.NQ
  const acc   = parseFloat(r.accountSize) || 0
  const pctV  = parseFloat(r.riskPct) || 0
  const stop  = parseFloat(r.stopLoss) || 0
  const effPct = halfActive ? pctV / 2 : pctV
  const dollarRisk = acc * effPct / 100
  const perContractRisk = stop * inst.pointValue
  const rawContracts = perContractRisk > 0 ? dollarRisk / perContractRisk : 0

  // Contract recommendation with automatic micro-switch.
  //  ≥1 whole contract → round down, trade the selected instrument.
  //  <1 contract       → switch to the micro sibling (×10 size: NQ→MNQ, ES→MES).
  let rec = null
  if (perContractRisk > 0 && dollarRisk > 0) {
    if (rawContracts >= 1) {
      rec = { instrument: inst.label, pointValue: inst.pointValue, contracts: Math.floor(rawContracts), micro: false }
    } else if (inst.micro) {
      const micro = RISK_INSTRUMENTS[inst.micro]
      const microRaw = dollarRisk / (stop * micro.pointValue) // == rawContracts × (inst.pointValue / micro.pointValue)
      rec = { instrument: micro.label, pointValue: micro.pointValue, contracts: Math.floor(microRaw), micro: true, from: inst.label }
    } else {
      // already the micro — nothing smaller to switch to
      rec = { instrument: inst.label, pointValue: inst.pointValue, contracts: Math.floor(rawContracts), micro: false }
    }
  }
  const tooSmall = rec && rec.contracts < 1
  const actualRisk = rec && !tooSmall ? rec.contracts * stop * rec.pointValue : 0

  // Pro analytics — Kelly, break-even WR, account heat, daily-stop math
  const decided = trades.filter(t => t.result === 'Win' || t.result === 'Loss')
  const W = decided.length ? decided.filter(t => t.result === 'Win').length / decided.length : 0
  const winRRs = trades.filter(t => t.result === 'Win').map(t => (Number(t.rr) > 0 ? Number(t.rr) : 1))
  const avgWinR = winRRs.length ? winRRs.reduce((a, b) => a + b, 0) / winRRs.length : 0
  const kellyPct = avgWinR > 0 ? Math.max(0, (W - (1 - W) / avgWinR) * 100) : 0
  const beWR = avgWinR > 0 ? 100 / (1 + avgWinR) : 0
  const maxLossesToDaily = effPct > 0 ? Math.floor(6 / effPct) : 0 // to a -6% day

  // Recommendation banner appearance
  let recView
  if (!rec) {
    recView = { color: '#777', bg: BG, border: CARD_BORD, Icon: Hourglass, main: 'Enter account size, risk % and stop', sub: '' }
  } else if (tooSmall) {
    recView = { color: ORANGE, bg: 'rgba(255,159,67,0.10)', border: `${ORANGE}55`, Icon: AlertTriangle, main: `Below 1 ${rec.instrument} contract`, sub: 'Reduce the stop or increase risk % to size up' }
  } else if (rec.micro) {
    recView = { color: GOLD, bg: GOLD_SOFT, border: GOLD_LINE, Icon: Zap, main: `Trade ${rec.contracts} ${rec.instrument}`, sub: `${rawContracts.toFixed(2)} ${rec.from} (under 1) → auto-switched to micro ${rec.instrument}` }
  } else {
    recView = { color: GREEN, bg: 'rgba(126,231,135,0.10)', border: 'rgba(126,231,135,0.4)', Icon: CheckCircle, main: `Trade ${rec.contracts} ${rec.instrument} contract${rec.contracts !== 1 ? 's' : ''}`, sub: `${rawContracts.toFixed(2)} raw → rounded down` }
  }

  const specRows = [
    { l: 'Dollar Risk', v: dollarRisk > 0 ? usd(dollarRisk) : '—', c: GOLD },
    { l: 'Instrument', v: `${inst.label} @ $${inst.pointValue}/pt` },
    { l: 'Stop Loss', v: stop > 0 ? `${stop} pts` : '—' },
    { l: 'Per-Contract Risk', v: perContractRisk > 0 ? usd(perContractRisk) : '—' },
    { l: 'Raw Size', v: perContractRisk > 0 ? `${rawContracts.toFixed(2)} ${inst.label} contracts` : '—' },
  ]

  const rrRows = [3, 5, 10, 20]

  return (
    <div style={{ position: 'relative', borderRadius: '18px', padding: halfActive ? '2px' : 0, transition: 'all .3s' }}>
      <div style={{
        border: halfActive ? `2px solid ${ORANGE}` : '2px solid transparent', borderRadius: '18px',
        background: halfActive ? 'rgba(255,159,67,0.04)' : 'transparent', padding: halfActive ? '14px' : 0, transition: 'all .3s',
      }}>
        {halfActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', marginBottom: '14px', borderRadius: '10px', background: 'rgba(255,159,67,0.12)', border: `1px solid ${ORANGE}55`, color: ORANGE, fontWeight: 700, fontSize: '13px' }}>
            <AlertTriangle size={18} /> HALF RISK MODE ACTIVE — all sizing uses 50% of normal risk
            {lossTakenToday && <span style={{ fontSize: '11px', fontWeight: 500, opacity: 0.8 }}>(auto — loss taken today)</span>}
          </div>
        )}

        <div className="tos-grid-risk">
          {/* Inputs */}
          <div style={card}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '18px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={16} color={GOLD} /> Inputs
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><div style={lbl}>Account Size ($)</div><input value={r.accountSize} onChange={set('accountSize')} type="number" step="100" min="0" inputMode="decimal" style={inp} placeholder="10000" /></div>
              <div><div style={lbl}>Risk % per trade</div><input value={r.riskPct} onChange={set('riskPct')} type="number" step="0.1" min="0.1" inputMode="decimal" style={inp} placeholder="1" /></div>
              <div><div style={lbl}>Stop Loss (points)</div><input value={r.stopLoss} onChange={set('stopLoss')} type="number" step="0.25" min="0" inputMode="decimal" style={inp} placeholder="20" /></div>

              <div>
                <div style={lbl}>Instrument</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {Object.entries(RISK_INSTRUMENTS).map(([key, info]) => {
                    const active = r.instrument === key
                    return (
                      <button key={key} type="button" onClick={() => setR(prev => ({ ...prev, instrument: key }))} style={{
                        padding: '10px 12px', borderRadius: '9px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', minHeight: 0,
                        border: `1px solid ${active ? GOLD_LINE : CARD_BORD}`,
                        background: active ? GOLD_SOFT : 'transparent',
                      }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: active ? GOLD : '#ccc' }}>{info.label}</div>
                        <div style={{ fontSize: '10px', color: active ? GOLD : '#666', marginTop: '2px' }}>{info.name} · ${info.pointValue}/pt</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', background: BG, border: `1px solid ${halfActive ? ORANGE + '55' : CARD_BORD}` }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Half Risk Mode</div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>Auto-on after a loss today</div>
                </div>
                <button onClick={() => setHalfManual(v => !v)} disabled={lossTakenToday}
                  style={{ width: '46px', height: '26px', borderRadius: '99px', border: 'none', cursor: lossTakenToday ? 'not-allowed' : 'pointer', background: halfActive ? ORANGE : '#2a2a2a', position: 'relative', transition: 'background .2s', flexShrink: 0, padding: 0, minHeight: 0, opacity: lossTakenToday ? 0.7 : 1 }}>
                  <span style={{ position: 'absolute', top: '3px', left: halfActive ? '23px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
                </button>
              </div>
            </div>
          </div>

          {/* Outputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Position sizing */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ ...lbl, marginBottom: 0 }}>Position Sizing</div>
                {halfActive && <span style={{ fontSize: '10px', color: ORANGE, fontWeight: 700, letterSpacing: '0.08em' }}>HALF RISK</span>}
              </div>
              <div>
                {specRows.map((row, i) => (
                  <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid #161616' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>{row.l}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: row.c || '#fff' }}>{row.v}</span>
                  </div>
                ))}
              </div>
              {/* Recommendation */}
              <div style={{ marginTop: '14px', padding: '16px', borderRadius: '12px', background: recView.bg, border: `1px solid ${recView.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 900, color: recView.color, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><recView.Icon size={20} /> {recView.main}</div>
                {recView.sub && <div style={{ fontSize: '12px', color: '#999', marginTop: '6px', lineHeight: 1.5 }}>{recView.sub}</div>}
              </div>
            </div>

            {/* Expected gains */}
            <div style={card}>
              <div style={{ ...lbl, marginBottom: '6px' }}>Expected Gains</div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '12px' }}>
                Based on {rec && !tooSmall ? `${rec.contracts} ${rec.instrument}` : '—'}{actualRisk > 0 ? ` · actual risk ${usd(actualRisk)}` : ''}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...lbl, textAlign: 'left', padding: '0 0 12px' }}>Risk : Reward</th>
                    <th style={{ ...lbl, textAlign: 'right', padding: '0 0 12px' }}>Expected Gain</th>
                  </tr>
                </thead>
                <tbody>
                  {rrRows.map(rrV => (
                    <tr key={rrV}>
                      <td style={{ padding: '12px 0', borderTop: '1px solid #161616', fontSize: '13px', color: '#ddd', fontWeight: 600 }}>1 : {rrV}</td>
                      <td style={{ padding: '12px 0', borderTop: '1px solid #161616', fontSize: '15px', color: actualRisk > 0 ? GREEN : '#444', fontWeight: 800, textAlign: 'right' }}>{actualRisk > 0 ? usd(actualRisk * rrV) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '14px', fontSize: '11px', color: '#555', lineHeight: 1.6 }}>
                Gains reflect the rounded position ({rec && !tooSmall ? `${rec.contracts} × ${stop || '—'} pts × $${rec.pointValue}/pt` : 'no valid size yet'}), not the raw target risk.
              </div>
            </div>

            {/* Advanced (Pro) */}
            {pro && (
              <div style={card}>
                <SectionTitle Icon={Sparkles}>Advanced (Pro)</SectionTitle>
                {[
                  { l: 'Kelly optimal risk', v: decided.length ? `${kellyPct.toFixed(1)}%` : '—', sub: decided.length ? `half-Kelly ${(kellyPct / 2).toFixed(1)}% (safer)` : 'log trades', c: kellyPct > 0 ? GOLD : RED },
                  { l: 'Break-even win rate', v: avgWinR > 0 ? `${beWR.toFixed(0)}%` : '—', sub: avgWinR > 0 ? `at ${avgWinR.toFixed(2)}R avg winner` : 'no winners yet', c: W * 100 >= beWR ? GREEN : ORANGE },
                  { l: 'Account heat', v: `${effPct.toFixed(1)}%`, sub: `2 open ${(effPct * 2).toFixed(1)}% · 3 open ${(effPct * 3).toFixed(1)}%`, c: effPct * 3 > 6 ? ORANGE : GREEN },
                  { l: 'Full-risk losses to -6% day', v: maxLossesToDaily || '—', sub: 'enforce a 2-loss daily stop', c: BLUE },
                ].map((row, i) => (
                  <div key={row.l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid #161616', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12.5px', color: '#ccc', fontWeight: 600 }}>{row.l}</div>
                      <div style={{ fontSize: '10.5px', color: '#666', marginTop: '2px' }}>{row.sub}</div>
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: row.c, flexShrink: 0 }}>{row.v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  PAGE 4 — PERFORMANCE DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
function Performance({ trades, tableMissing, pro = false }) {
  const oneR = getOneR()
  const accountSize = parseFloat(getRisk().accountSize) || 10000

  const stats = useMemo(() => {
    const n = trades.length
    const wins = trades.filter(t => t.result === 'Win')
    const losses = trades.filter(t => t.result === 'Loss')
    const bes = trades.filter(t => t.result === 'BE')
    const rrVals = trades.filter(t => Number(t.rr) > 0).map(t => Number(t.rr))
    const winRRs = wins.map(t => (Number(t.rr) > 0 ? Number(t.rr) : 1))
    const avgWinR = winRRs.length ? winRRs.reduce((a, b) => a + b, 0) / winRRs.length : 0
    const totalR = trades.reduce((s, t) => s + tradeR(t), 0)
    const weekR = trades.filter(t => isThisWeek(t.trade_date)).reduce((s, t) => s + tradeR(t), 0)
    const monthR = trades.filter(t => isThisMonth(t.trade_date)).reduce((s, t) => s + tradeR(t), 0)
    return {
      n,
      winRate: n ? (wins.length / n) * 100 : 0,
      lossRate: n ? (losses.length / n) * 100 : 0,
      beRate: n ? (bes.length / n) * 100 : 0,
      avgRR: rrVals.length ? rrVals.reduce((a, b) => a + b, 0) / rrVals.length : 0,
      avgWinR, avgWin$: avgWinR * oneR, avgLoss$: oneR,
      totalR, weekR, monthR,
      wins: wins.length, losses: losses.length, bes: bes.length,
    }
  }, [trades, oneR])

  // process score periods
  const procDaily = trades.filter(t => t.trade_date === todayKey()).reduce((s, t) => s + (t.process_score || 0), 0)
  const procWeek  = trades.filter(t => isThisWeek(t.trade_date)).reduce((s, t) => s + (t.process_score || 0), 0)
  const procMonth = trades.filter(t => isThisMonth(t.trade_date)).reduce((s, t) => s + (t.process_score || 0), 0)

  // process score vs profitability (per day)
  const byDay = useMemo(() => {
    const m = {}
    for (const t of trades) {
      if (!t.trade_date) continue
      if (!m[t.trade_date]) m[t.trade_date] = { date: t.trade_date, process: 0, r: 0 }
      m[t.trade_date].process += (t.process_score || 0)
      m[t.trade_date].r += tradeR(t)
    }
    return Object.values(m).sort((a, b) => a.date.localeCompare(b.date)).slice(-14)
      .map(d => ({ ...d, label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), r: +d.r.toFixed(2) }))
  }, [trades])

  // loss analysis
  const lossByReason = useMemo(() => {
    const m = {}
    for (const t of trades.filter(t => t.result === 'Loss')) {
      const k = t.loss_reason || 'Unspecified'
      m[k] = (m[k] || 0) + 1
    }
    const total = Object.values(m).reduce((a, b) => a + b, 0)
    const palette = { 'Bias Error': BLUE, 'Entry Error': GOLD, 'Risk Error': ORANGE, 'Psychology Error': RED, 'Market Conditions': '#a78bfa', 'Unspecified': '#666' }
    return {
      total,
      data: Object.entries(m).map(([name, value]) => ({ name, value, pct: total ? Math.round(value / total * 100) : 0, color: palette[name] || '#888' })).sort((a, b) => b.value - a.value),
    }
  }, [trades])
  const biggestLoss = lossByReason.data[0]

  // projection
  const proj = useMemo(() => {
    const rSeq = trades.map(tradeR)
    const E = rSeq.length ? rSeq.reduce((a, b) => a + b, 0) / rSeq.length : 0
    const mean = rSeq.length ? rSeq.reduce((a, b) => a + b, 0) / rSeq.length : 0
    const variance = rSeq.length ? rSeq.reduce((a, b) => a + (b - mean) ** 2, 0) / rSeq.length : 0
    const sd = Math.sqrt(variance)
    const pts = []
    for (let n = 0; n <= 100; n += 5) {
      const meanR = E * n
      const band = sd * Math.sqrt(n)
      const lower$ = Math.max(0, accountSize + (meanR - band) * oneR)
      const upper$ = Math.max(0, accountSize + (meanR + band) * oneR) // clamp so a fully-negative band can't invert the stacked area
      pts.push({ n, mean: Math.max(0, Math.round(accountSize + meanR * oneR)), base: Math.round(lower$), band: Math.max(0, Math.round(upper$ - lower$)), meanR: +meanR.toFixed(1) })
    }
    const at = (n) => ({ r: +(E * n).toFixed(1), acct: Math.round(accountSize + E * n * oneR) })
    return { E: +E.toFixed(3), data: pts, t20: at(20), t50: at(50), t100: at(100) }
  }, [trades, oneR, accountSize])

  if (tableMissing) return <SqlNotice />
  if (stats.n === 0) return <EmptyState Icon={BarChart2} title="No trades yet" sub="Log trades in the Trade Log tab to unlock performance analytics, process tracking, and projections." />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Core stats */}
      <div className="tos-grid-3">
        <StatCard label="Win Rate" value={pct(stats.winRate)} color={GREEN} Icon={TrendingUp} sub={`${stats.wins}W · ${stats.losses}L · ${stats.bes}BE`} />
        <StatCard label="Loss Rate" value={pct(stats.lossRate)} color={RED} Icon={Activity} />
        <StatCard label="BE Rate" value={pct(stats.beRate)} color="#999" Icon={Scale} />
      </div>
      <div className="tos-grid-3">
        <StatCard label="Average RR" value={stats.avgRR ? `${stats.avgRR.toFixed(2)}R` : '—'} color={GOLD} Icon={Target} />
        <StatCard label="Average Win" value={usd(stats.avgWin$)} color={GREEN} sub={`${stats.avgWinR.toFixed(2)}R · 1R = ${usd(oneR)}`} />
        <StatCard label="Average Loss" value={usd(-stats.avgLoss$)} color={RED} sub="≈ 1R (planned risk)" />
      </div>
      <div className="tos-grid-3">
        <StatCard label="Total R" value={`${stats.totalR >= 0 ? '+' : ''}${stats.totalR.toFixed(1)}R`} color={stats.totalR >= 0 ? GREEN : RED} Icon={DollarSign} sub={usd(stats.totalR * oneR)} />
        <StatCard label="Monthly R" value={`${stats.monthR >= 0 ? '+' : ''}${stats.monthR.toFixed(1)}R`} color={stats.monthR >= 0 ? GREEN : RED} sub={usd(stats.monthR * oneR)} />
        <StatCard label="Weekly R" value={`${stats.weekR >= 0 ? '+' : ''}${stats.weekR.toFixed(1)}R`} color={stats.weekR >= 0 ? GREEN : RED} sub={usd(stats.weekR * oneR)} />
      </div>

      {/* Process score tracker */}
      <div style={card}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} color={GOLD} /> Process Score Tracker
        </div>
        <div className="tos-grid-3" style={{ marginBottom: '20px' }}>
          {[{ l: 'Daily', v: procDaily }, { l: 'Weekly', v: procWeek }, { l: 'Monthly', v: procMonth }].map(({ l, v }) => {
            const c = v > 0 ? GREEN : v < 0 ? RED : '#999'
            return (
              <div key={l} style={{ textAlign: 'center', padding: '18px', borderRadius: '12px', background: BG, border: `1px solid ${CARD_BORD}` }}>
                <div style={{ fontSize: '40px', fontWeight: 900, color: c, lineHeight: 1, letterSpacing: '-2px' }}>{v > 0 ? '+' : ''}{v}</div>
                <div style={{ ...lbl, marginTop: '8px', marginBottom: 0 }}>{l} Process</div>
              </div>
            )
          })}
        </div>
        <div style={{ ...lbl, marginBottom: '10px' }}>Process Score vs Profitability (last 14 trading days)</div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={byDay} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="#161616" vertical={false} />
            <XAxis dataKey="label" tick={axTick} {...noAxis} />
            <YAxis yAxisId="L" tick={axTick} {...noAxis} />
            <YAxis yAxisId="R" orientation="right" tick={axTick} {...noAxis} tickFormatter={v => `${v}R`} />
            <Tooltip contentStyle={chartTooltip} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <ReferenceLine yAxisId="L" y={0} stroke="#333" />
            <Bar yAxisId="L" dataKey="process" name="Process" radius={[3, 3, 0, 0]} maxBarSize={26}>
              {byDay.map((d, i) => <Cell key={i} fill={d.process >= 0 ? GOLD : ORANGE} fillOpacity={0.85} />)}
            </Bar>
            <Line yAxisId="R" type="monotone" dataKey="r" name="R" stroke={GREEN} strokeWidth={2} dot={{ r: 2, fill: GREEN }} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '8px', textAlign: 'center' }}>Gold bars = rule discipline · green line = R captured. Discipline should lead profitability.</div>
      </div>

      {/* Loss analysis */}
      <div className="tos-grid-2">
        <div style={card}>
          <div style={{ ...lbl, marginBottom: '14px' }}>Loss Analysis</div>
          {lossByReason.total === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#555', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}><CheckCircle size={22} color={GREEN} />No losses recorded</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={lossByReason.data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="none">
                    {lossByReason.data.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltip} formatter={(v, n) => [`${v} (${Math.round(v / lossByReason.total * 100)}%)`, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '10px' }}>
                {lossByReason.data.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: d.color, flexShrink: 0 }} />
                    <span style={{ color: '#aaa', flex: 1 }}>{d.name}</span>
                    <span style={{ color: '#fff', fontWeight: 700 }}>{d.value}</span>
                    <span style={{ color: '#666', width: '36px', textAlign: 'right' }}>{d.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div style={{ ...card, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ ...lbl, marginBottom: '14px' }}>Largest Source of Losses</div>
          {biggestLoss ? (
            <>
              <div style={{ fontSize: '30px', fontWeight: 900, color: biggestLoss.color, letterSpacing: '-1px', lineHeight: 1.1 }}>{biggestLoss.name}</div>
              <div style={{ fontSize: '16px', color: '#888', marginTop: '8px' }}>{biggestLoss.pct}% of all losses ({biggestLoss.value} trade{biggestLoss.value !== 1 ? 's' : ''})</div>
              <div style={{ marginTop: '20px', padding: '14px', borderRadius: '10px', background: BG, border: `1px solid ${CARD_BORD}`, fontSize: '12px', color: '#999', lineHeight: 1.6 }}>
                {biggestLoss.name === 'Psychology Error' && 'Discipline, not analysis, is the leak. Tighten the rule-enforcement system.'}
                {biggestLoss.name === 'Entry Error' && 'Refine your entry model — wait for the confirmed trigger before committing.'}
                {biggestLoss.name === 'Bias Error' && 'Your directional read is the leak. Revisit HTF narrative & liquidity.'}
                {biggestLoss.name === 'Risk Error' && 'Sizing / stop placement is costing you. Trust the Risk Engine outputs.'}
                {biggestLoss.name === 'Market Conditions' && 'Some of this is unavoidable variance — focus on A+ days only.'}
                {biggestLoss.name === 'Unspecified' && 'Tag your losses with a reason to find the pattern.'}
              </div>
            </>
          ) : <div style={{ color: '#555', fontSize: '13px' }}>No losses yet.</div>}
        </div>
      </div>

      {/* Future projection */}
      <div style={card}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={16} color={GOLD} /> Future Projection Engine
        </div>
        <div style={{ fontSize: '12px', color: '#777', marginBottom: '16px' }}>
          Expectancy per trade: <b style={{ color: proj.E >= 0 ? GREEN : RED }}>{proj.E >= 0 ? '+' : ''}{proj.E}R</b> · 1R = {usd(oneR)} · start {usd(accountSize)}
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={proj.data} margin={{ top: 6, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid stroke="#161616" vertical={false} />
            <XAxis dataKey="n" tick={axTick} {...noAxis} tickFormatter={v => `${v}`} />
            <YAxis tick={axTick} {...noAxis} tickFormatter={usdK} width={48} domain={[0, 'auto']} />
            <Tooltip contentStyle={chartTooltip} formatter={(val, name) => name === 'mean' ? [usd(val), 'Expected'] : null} labelFormatter={l => `After ${l} trades`} />
            <ReferenceLine y={accountSize} stroke="#444" strokeDasharray="4 4" />
            <Area dataKey="base" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />
            <Area dataKey="band" stackId="band" stroke="none" fill={GOLD} fillOpacity={0.12} name="confidence" isAnimationActive={false} />
            <Line type="monotone" dataKey="mean" stroke={GOLD} strokeWidth={2.5} dot={false} name="mean" />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="tos-grid-3" style={{ marginTop: '16px' }}>
          {[{ l: 'Next 20', d: proj.t20 }, { l: 'Next 50', d: proj.t50 }, { l: 'Next 100', d: proj.t100 }].map(({ l, d }) => (
            <div key={l} style={{ padding: '14px', borderRadius: '12px', background: BG, border: `1px solid ${CARD_BORD}` }}>
              <div style={lbl}>{l} Trades</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: d.r >= 0 ? GREEN : RED, marginTop: '4px' }}>{d.r >= 0 ? '+' : ''}{d.r}R</div>
              <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>→ {usd(d.acct)} account</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '14px', fontSize: '11px', color: '#777', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <AlertTriangle size={12} color="#777" /> Statistical expectancy only — not a prediction. Past performance ≠ future results.
        </div>
      </div>

      {/* ── Advanced analytics (both modes) ── */}
      <GoalSystem trades={trades} oneR={oneR} />
      <EdgeTracker trades={trades} />
      <StreakAnalytics trades={trades} />
      <PsychPatterns trades={trades} oneR={oneR} />

      {/* ── Pro-only charts ── */}
      {pro && <ProCharts trades={trades} oneR={oneR} />}
    </div>
  )
}

// ─── Goal system (inside Performance, both modes) ───────────────────────────
const GOALS_KEY = 'tos_goals'
const defaultGoals = { targetR: '15', targetWinRate: '60', targetTrades: '40', maxLosses: '15' }
function GoalSystem({ trades, oneR }) {
  const [g, setG] = useState(() => ({ ...defaultGoals, ...lsGet(GOALS_KEY, {}) }))
  useEffect(() => { lsSet(GOALS_KEY, g) }, [g])
  const set = (k) => (e) => setG(prev => ({ ...prev, [k]: e.target.value }))

  const month = trades.filter(t => isThisMonth(t.trade_date))
  const monthR = month.reduce((s, t) => s + tradeR(t), 0)
  const wr = winRateOf(month)
  const monthLosses = month.filter(t => t.result === 'Loss').length
  const tR = parseFloat(g.targetR) || 0
  const tWR = parseFloat(g.targetWinRate) || 0
  const tTrades = parseFloat(g.targetTrades) || 0
  const tMaxL = parseFloat(g.maxLosses) || 0

  const now = new Date()
  const weeks = {}
  for (const t of month) {
    if (!t.trade_date) continue
    const wi = Math.floor((new Date(t.trade_date + 'T00:00:00').getDate() - 1) / 7)
    weeks[wi] = (weeks[wi] || 0) + tradeR(t)
  }
  const curWeekIdx = Math.floor((now.getDate() - 1) / 7)
  const maxWeek = Math.max(curWeekIdx, ...Object.keys(weeks).map(Number))
  const weekRows = Array.from({ length: Math.max(4, maxWeek + 1) }, (_, i) => ({ i, r: weeks[i] || 0, current: i === curWeekIdx, started: i <= curWeekIdx }))

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const projR = now.getDate() > 0 ? monthR / now.getDate() * daysInMonth : monthR

  return (
    <div style={card}>
      <SectionTitle Icon={Target}>Monthly Goals</SectionTitle>
      <div className="tos-grid-4" style={{ marginBottom: '18px' }}>
        <div><div style={lbl}>Target R</div><input value={g.targetR} onChange={set('targetR')} type="number" step="1" inputMode="decimal" style={inp} /></div>
        <div><div style={lbl}>Target Win Rate %</div><input value={g.targetWinRate} onChange={set('targetWinRate')} type="number" step="1" inputMode="decimal" style={inp} /></div>
        <div><div style={lbl}>Target Trades</div><input value={g.targetTrades} onChange={set('targetTrades')} type="number" step="1" inputMode="decimal" style={inp} /></div>
        <div><div style={lbl}>Max Losses Allowed</div><input value={g.maxLosses} onChange={set('maxLosses')} type="number" step="1" inputMode="decimal" style={inp} /></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <ProgressBar label="R Progress" value={Math.max(0, monthR)} max={tR} dangerHigh={false} valueText={`${monthR.toFixed(1)}R / ${tR}R target (${tR > 0 ? Math.round(monthR / tR * 100) : 0}%)`} />
        <ProgressBar label="Win Rate" value={wr.wr} max={tWR} dangerHigh={false} valueText={`${Math.round(wr.wr)}% / ${tWR}% target`} />
        <ProgressBar label="Trades Taken" value={month.length} max={tTrades} dangerHigh={false} valueText={`${month.length} / ${tTrades}`} />
        <ProgressBar label="Losses (cap)" value={monthLosses} max={tMaxL} dangerHigh valueText={`${monthLosses} / ${tMaxL} max`} />
      </div>

      <div style={{ marginTop: '20px' }}>
        <div style={{ ...lbl, marginBottom: '10px' }}>Weekly Breakdown</div>
        <div className="tos-grid-4">
          {weekRows.map(w => (
            <div key={w.i} style={{ padding: '12px', borderRadius: '10px', background: BG, border: `1px solid ${w.current ? GOLD_LINE : CARD_BORD}` }}>
              <div style={{ ...lbl, marginBottom: '4px' }}>Week {w.i + 1}{w.current ? ' (now)' : ''}</div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: !w.started ? '#444' : w.r >= 0 ? GREEN : RED }}>
                {!w.started ? '—' : `${w.r >= 0 ? '+' : ''}${w.r.toFixed(1)}R`}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '16px', padding: '14px 16px', borderRadius: '10px', background: BG, border: `1px solid ${CARD_BORD}`, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <Rocket size={16} color={GOLD} />
        <span style={{ fontSize: '13px', color: '#ccc' }}>End-of-month projection at current pace:</span>
        <span style={{ fontSize: '15px', fontWeight: 800, color: projR >= 0 ? GREEN : RED }}>{projR >= 0 ? '+' : ''}{projR.toFixed(1)}R</span>
        <span style={{ fontSize: '12px', color: '#666' }}>({usd(projR * oneR)}) · {projR >= tR ? 'on track for target' : 'behind target'}</span>
      </div>
    </div>
  )
}

// ─── Edge tracker — which confluences actually matter ───────────────────────
function EdgeTracker({ trades }) {
  return (
    <div style={card}>
      <SectionTitle Icon={Crosshair}>Edge Tracker</SectionTitle>
      <div style={{ fontSize: '12px', color: '#777', marginBottom: '6px' }}>Win rate by condition — find which confluences pay in YOUR data.</div>
      <SplitBar label="Confluences present" a={winRateOf(trades.filter(t => confluenceCount(t) === 4))} b={winRateOf(trades.filter(t => confluenceCount(t) < 4))} aLabel="All 4" bLabel="Partial" />
      <SplitBar label="Bias" a={winRateOf(trades.filter(t => t.bias === 'PxH'))} b={winRateOf(trades.filter(t => t.bias === 'PxL'))} aLabel="PxH" bLabel="PxL" />
      <SplitBar label="Entry trigger" a={winRateOf(trades.filter(t => t.rejection_block))} b={winRateOf(trades.filter(t => t.wick_ce))} aLabel="Rej. Block" bLabel="Wick CE" />
      <SplitBar label="OTE" a={winRateOf(trades.filter(t => t.ote_present))} b={winRateOf(trades.filter(t => !t.ote_present))} aLabel="Present" bLabel="Absent" />
      <SplitBar label="Key Open" a={winRateOf(trades.filter(t => t.key_open))} b={winRateOf(trades.filter(t => !t.key_open))} aLabel="Present" bLabel="Absent" />
      <SplitBar label="Session" a={winRateOf(trades.filter(t => t.session === 'London'))} b={winRateOf(trades.filter(t => t.session === 'NY'))} aLabel="London" bLabel="NY" />
    </div>
  )
}

// ─── Streak analytics ───────────────────────────────────────────────────────
function StreakAnalytics({ trades }) {
  const seq = chronoDecided(trades)
  let curWin = 0, curLoss = 0
  for (let i = seq.length - 1; i >= 0; i--) {
    if (seq[i].result === 'Win') { if (curLoss > 0) break; curWin++ }
    else { if (curWin > 0) break; curLoss++ }
  }
  let longWin = 0, longLoss = 0, rw = 0, rl = 0
  for (const t of seq) {
    if (t.result === 'Win') { rw++; rl = 0; longWin = Math.max(longWin, rw) }
    else { rl++; rw = 0; longLoss = Math.max(longLoss, rl) }
  }
  let after2 = 0, after2win = 0
  for (let i = 2; i < seq.length; i++) {
    if (seq[i - 1].result === 'Loss' && seq[i - 2].result === 'Loss') { after2++; if (seq[i].result === 'Win') after2win++ }
  }
  const after2wr = after2 ? Math.round(after2win / after2 * 100) : null

  return (
    <div style={card}>
      <SectionTitle Icon={Flame}>Streak Analytics</SectionTitle>
      <div className="tos-grid-4">
        <StatCard label="Current Win Streak" value={curWin} color={curWin > 0 ? GREEN : '#888'} Icon={TrendingUp} />
        <StatCard label="Current Loss Streak" value={curLoss} color={curLoss > 0 ? RED : '#888'} Icon={TrendingDown} />
        <StatCard label="Longest Win Streak" value={longWin} color={GREEN} Icon={Flame} />
        <StatCard label="Max Consecutive Losses" value={longLoss} color={RED} Icon={AlertTriangle} />
      </div>
      <div style={{ marginTop: '14px', padding: '13px 16px', borderRadius: '10px', background: BG, border: `1px solid ${CARD_BORD}`, fontSize: '13px', color: '#ccc', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Activity size={16} color={GOLD} />
        {after2wr != null
          ? <span>After 2 losses you win <b style={{ color: after2wr >= 50 ? GREEN : RED }}>{after2wr}%</b> of the next trade <span style={{ color: '#666' }}>(n={after2})</span>.</span>
          : <span style={{ color: '#888' }}>Not enough back-to-back losses yet to measure bounce-back rate.</span>}
      </div>
    </div>
  )
}

// ─── Psychological patterns ─────────────────────────────────────────────────
function PsychPatterns({ trades, oneR }) {
  const seq = chronoDecided(trades)
  const firstByDay = {}
  for (const t of seq) { if (!firstByDay[t.trade_date]) firstByDay[t.trade_date] = t }
  const wrFirst = winRateOf(Object.values(firstByDay))
  const afterLoss = []
  for (let i = 1; i < seq.length; i++) { if (seq[i - 1].result === 'Loss') afterLoss.push(seq[i]) }
  const wrAfterLoss = winRateOf(afterLoss)
  const mon = winRateOf(trades.filter(t => weekdayOf(t.trade_date) === 1))
  const fri = winRateOf(trades.filter(t => weekdayOf(t.trade_date) === 5))

  const hourMap = {}
  for (const t of trades) { const h = tradeHour(t); if (h == null) continue; if (!hourMap[h]) hourMap[h] = { r: 0, n: 0 }; hourMap[h].r += tradeR(t); hourMap[h].n++ }
  const hours = Object.entries(hourMap).map(([h, d]) => ({ h: +h, ...d })).filter(d => d.n >= 2).sort((a, b) => b.r - a.r)
  const best = hours[0]
  const hourLabel = (h) => `${String(h).padStart(2, '0')}:00`

  const cell = (label, d) => (
    <div style={{ padding: '14px 12px', borderRadius: '11px', background: BG, border: `1px solid ${CARD_BORD}`, textAlign: 'center' }}>
      <div style={{ fontSize: '22px', fontWeight: 800, color: d.n ? (d.wr >= 50 ? GREEN : d.wr > 0 ? YELLOW : RED) : '#444' }}>{d.n ? `${Math.round(d.wr)}%` : '—'}</div>
      <div style={{ ...lbl, marginTop: '6px', marginBottom: 0 }}>{label}</div>
      <div style={{ fontSize: '10px', color: '#555', marginTop: '3px' }}>{d.n} trades</div>
    </div>
  )

  return (
    <div style={card}>
      <SectionTitle Icon={Brain}>Psychological Patterns</SectionTitle>
      <div className="tos-grid-4">
        {cell('First Trade of Day', wrFirst)}
        {cell('After a Loss', wrAfterLoss)}
        {cell('Monday', mon)}
        {cell('Friday', fri)}
      </div>
      <div style={{ marginTop: '14px', padding: '13px 16px', borderRadius: '10px', background: BG, border: `1px solid ${CARD_BORD}`, fontSize: '13px', color: '#ccc', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <Clock size={16} color={GOLD} />
        {best
          ? <span>Best performing hour: <b style={{ color: GOLD }}>{hourLabel(best.h)}</b> — <b style={{ color: best.r >= 0 ? GREEN : RED }}>{best.r >= 0 ? '+' : ''}{best.r.toFixed(1)}R</b> ({usd(best.r * oneR)}) over {best.n} trades.</span>
          : <span style={{ color: '#888' }}>Log more trades to surface your best hour of day (by entry-log time).</span>}
      </div>
    </div>
  )
}

// ─── Pro-only charts ────────────────────────────────────────────────────────
function ProCharts({ trades, oneR }) {
  const seq = chronoDecided(trades)
  // rolling win rate
  const roll = []
  for (let i = 0; i < seq.length; i++) {
    const p = { i: i + 1 }
    for (const w of [10, 20, 50]) {
      if (i >= w - 1) { const s = seq.slice(i - w + 1, i + 1); p['w' + w] = Math.round(s.filter(t => t.result === 'Win').length / w * 100) }
    }
    roll.push(p)
  }
  // R distribution
  const bins = [
    { label: '≤ -1R', test: r => r <= -1, color: RED },
    { label: 'BE', test: r => r > -1 && r < 0.001 && r > -0.001, color: '#888' },
    { label: '0–1R', test: r => r > 0 && r < 1, color: '#9acd6b' },
    { label: '1–2R', test: r => r >= 1 && r < 2, color: GREEN },
    { label: '2–3R', test: r => r >= 2 && r < 3, color: '#5bd1a0' },
    { label: '3–5R', test: r => r >= 3 && r < 5, color: BLUE },
    { label: '5R+', test: r => r >= 5, color: GOLD },
  ]
  const rVals = trades.map(tradeR)
  const hist = bins.map(b => ({ label: b.label, count: rVals.filter(b.test).length, color: b.color }))
  // sessions
  const sess = ['London', 'NY', 'Asian'].map(s => {
    const arr = trades.filter(t => t.session === s)
    const w = winRateOf(arr)
    const r = arr.reduce((a, t) => a + tradeR(t), 0)
    return { name: s, wr: Math.round(w.wr), r: +r.toFixed(1), n: w.n }
  }).filter(d => d.n > 0)
  // time-of-day net R
  const hourMap = {}
  for (const t of trades) { const h = tradeHour(t); if (h == null) continue; if (!hourMap[h]) hourMap[h] = { r: 0, n: 0 }; hourMap[h].r += tradeR(t); hourMap[h].n++ }
  const hourCells = Object.entries(hourMap).map(([h, d]) => ({ h: +h, ...d })).sort((a, b) => a.h - b.h)
  const maxAbsR = hourCells.reduce((m, c) => Math.max(m, Math.abs(c.r)), 1)

  return (
    <>
      <div style={card}>
        <SectionTitle Icon={Activity}>Rolling Win Rate (Pro)</SectionTitle>
        {seq.length < 10 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#555', fontSize: '13px' }}>Need 10+ decided trades to plot rolling win rate.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={roll} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid stroke="#161616" vertical={false} />
              <XAxis dataKey="i" tick={axTick} {...noAxis} />
              <YAxis tick={axTick} {...noAxis} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={chartTooltip} labelFormatter={l => `Trade #${l}`} formatter={(v, n) => [`${v}%`, n.replace('w', 'last ')]} />
              <ReferenceLine y={50} stroke="#333" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="w10" stroke={BLUE} strokeWidth={1.6} dot={false} connectNulls name="w10" />
              <Line type="monotone" dataKey="w20" stroke={GOLD} strokeWidth={1.6} dot={false} connectNulls name="w20" />
              <Line type="monotone" dataKey="w50" stroke={GREEN} strokeWidth={2.2} dot={false} connectNulls name="w50" />
              <Legend wrapperStyle={{ fontSize: '11px' }} formatter={v => v.replace('w', 'last ')} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="tos-grid-2">
        <div style={card}>
          <SectionTitle Icon={BarChart2}>R Distribution</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hist} margin={{ top: 6, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="#161616" vertical={false} />
              <XAxis dataKey="label" tick={{ ...axTick, fontSize: 9 }} {...noAxis} interval={0} />
              <YAxis tick={axTick} {...noAxis} allowDecimals={false} />
              <Tooltip contentStyle={chartTooltip} cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={v => [v, 'trades']} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={34}>
                {hist.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={card}>
          <SectionTitle Icon={Clock}>Best / Worst Sessions</SectionTitle>
          {sess.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#555', fontSize: '13px' }}>No session data yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
              {sess.map(s => (
                <div key={s.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
                    <span style={{ color: '#ccc', fontWeight: 600 }}>{s.name} <span style={{ color: '#666' }}>({s.n})</span></span>
                    <span style={{ color: s.r >= 0 ? GREEN : RED, fontWeight: 700 }}>{s.wr}% WR · {s.r >= 0 ? '+' : ''}{s.r}R</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '5px', background: '#161616', overflow: 'hidden' }}>
                    <div style={{ width: `${s.wr}%`, height: '100%', background: s.r >= 0 ? GREEN : RED, borderRadius: '5px' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={card}>
        <SectionTitle Icon={Clock}>Time-of-Day Performance</SectionTitle>
        {hourCells.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#555', fontSize: '13px' }}>No timed trades yet (uses entry-log time).</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {hourCells.map(c => {
                const intensity = Math.min(1, Math.abs(c.r) / maxAbsR)
                const base = c.r >= 0 ? '126,231,135' : '255,107,107'
                return (
                  <div key={c.h} style={{ width: '58px', padding: '10px 4px', borderRadius: '8px', textAlign: 'center', background: `rgba(${base},${0.12 + intensity * 0.55})`, border: `1px solid rgba(${base},0.3)` }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{String(c.h).padStart(2, '0')}h</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: c.r >= 0 ? GREEN : RED }}>{c.r >= 0 ? '+' : ''}{c.r.toFixed(1)}R</div>
                    <div style={{ fontSize: '9px', color: '#888' }}>{c.n}t</div>
                  </div>
                )
              })}
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '10px' }}>Net R by hour of entry-log time ({usd(oneR)} = 1R). Greener = stronger.</div>
          </>
        )}
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  PAGE 5 — FUNDED ACCOUNT DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
const FUNDED_KEY = 'tos_funded_accounts'
const blankAccount = () => ({
  id: makeId(), name: '', status: 'Challenge',
  startingBalance: '', currentBalance: '',
  dailyLimit: '', maxLimit: '', profitTarget: '', todayPnl: '', payoutDate: '',
})

function Funded({ pro = false, trades = [] }) {
  const [accounts, setAccounts] = useState(() => lsGet(FUNDED_KEY, []))
  const [activeId, setActiveId] = useState(() => { const a = lsGet(FUNDED_KEY, []); return a[0]?.id || null })
  const [editing, setEditing] = useState(null) // account object being edited (or new)

  useEffect(() => { lsSet(FUNDED_KEY, accounts) }, [accounts])

  const active = accounts.find(a => a.id === activeId) || accounts[0] || null

  const openNew = () => setEditing(blankAccount())
  const saveEdit = () => {
    if (!editing.name.trim()) { toast.error('Account name required'); return }
    setAccounts(prev => {
      const exists = prev.some(a => a.id === editing.id)
      return exists ? prev.map(a => a.id === editing.id ? editing : a) : [...prev, editing]
    })
    setActiveId(editing.id)
    setEditing(null)
  }
  const remove = (id) => {
    setAccounts(prev => prev.filter(a => a.id !== id))
    if (activeId === id) setActiveId(accounts.find(a => a.id !== id)?.id || null)
  }

  return (
    <div>
      {/* Account selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {accounts.map(a => (
          <button key={a.id} onClick={() => setActiveId(a.id)} style={{
            padding: '9px 16px', borderRadius: '99px', fontSize: '12.5px', fontWeight: active?.id === a.id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${active?.id === a.id ? GOLD_LINE : CARD_BORD}`,
            background: active?.id === a.id ? GOLD_SOFT : 'transparent',
            color: active?.id === a.id ? GOLD : '#888', transition: 'all .15s', minHeight: 0,
          }}>{a.name || 'Untitled'}</button>
        ))}
        <button onClick={openNew} style={{ ...goldBtn, padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '6px', minHeight: 0 }}><Plus size={15} /> Add Account</button>
      </div>

      {accounts.length === 0 && !editing && (
        <EmptyState Icon={Wallet} title="No funded accounts" sub="Track your prop-firm challenges & funded accounts — drawdown buffers, profit targets, and payout countdowns." />
      )}

      {/* Editor */}
      {editing && (
        <div style={{ ...card, marginBottom: '16px', border: `1px solid ${GOLD_LINE}` }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>{accounts.some(a => a.id === editing.id) ? 'Edit Account' : 'New Account'}</div>
          <div className="tos-grid-3" style={{ gap: '12px' }}>
            <div><div style={lbl}>Account Name</div><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={inp} placeholder="Apex $50K Challenge" /></div>
            <div><div style={lbl}>Status</div><Seg options={FUNDED_STATUS} value={editing.status} onChange={v => setEditing({ ...editing, status: v || 'Challenge' })} /></div>
            <div><div style={lbl}>Days Until Payout</div><input type="date" className="tos-date" value={editing.payoutDate} onChange={e => setEditing({ ...editing, payoutDate: e.target.value })} style={{ ...inp, colorScheme: 'dark' }} /></div>
            <div><div style={lbl}>Starting Balance ($)</div><input value={editing.startingBalance} onChange={e => setEditing({ ...editing, startingBalance: e.target.value })} inputMode="decimal" style={inp} placeholder="50000" /></div>
            <div><div style={lbl}>Current Balance ($)</div><input value={editing.currentBalance} onChange={e => setEditing({ ...editing, currentBalance: e.target.value })} inputMode="decimal" style={inp} placeholder="50000" /></div>
            <div><div style={lbl}>Profit Target ($)</div><input value={editing.profitTarget} onChange={e => setEditing({ ...editing, profitTarget: e.target.value })} inputMode="decimal" style={inp} placeholder="3000" /></div>
            <div><div style={lbl}>Max Drawdown ($)</div><input value={editing.maxLimit} onChange={e => setEditing({ ...editing, maxLimit: e.target.value })} inputMode="decimal" style={inp} placeholder="2500" /></div>
            <div><div style={lbl}>Daily Drawdown ($)</div><input value={editing.dailyLimit} onChange={e => setEditing({ ...editing, dailyLimit: e.target.value })} inputMode="decimal" style={inp} placeholder="1250" /></div>
            <div><div style={lbl}>Today's P&L ($)</div><input value={editing.todayPnl} onChange={e => setEditing({ ...editing, todayPnl: e.target.value })} inputMode="decimal" style={inp} placeholder="0" /></div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
            <button onClick={saveEdit} style={{ ...goldBtn, flex: 1 }}>Save Account</button>
            <button onClick={() => setEditing(null)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {/* Active account dashboard */}
      {active && !editing && <FundedCard account={active} onEdit={() => setEditing({ ...active })} onDelete={() => remove(active.id)} trades={trades} pro={pro} />}
    </div>
  )
}

function FundedCard({ account: a, onEdit, onDelete, trades = [], pro = false }) {
  const start = parseFloat(a.startingBalance) || 0
  const cur   = parseFloat(a.currentBalance) || 0
  const maxLimit = parseFloat(a.maxLimit) || 0
  const dailyLimit = parseFloat(a.dailyLimit) || 0
  const profitTarget = parseFloat(a.profitTarget) || 0
  const todayPnl = parseFloat(a.todayPnl) || 0

  const pnl = cur - start
  const drawdownPct = start > 0 ? clamp((start - cur) / start * 100, 0, 100) : 0
  const usedMaxDD = Math.max(0, start - cur)
  const maxDDRemaining = maxLimit - usedMaxDD
  const usedDaily = Math.max(0, -todayPnl)
  const dailyRemaining = dailyLimit - usedDaily
  const profitMade = Math.max(0, pnl)
  const profitRemaining = Math.max(0, profitTarget - pnl)

  const daysToPayout = a.payoutDate ? Math.ceil((new Date(a.payoutDate + 'T00:00:00') - new Date(todayKey() + 'T00:00:00')) / 86400000) : null

  const statusColor = a.status === 'Funded' ? GREEN : GOLD

  // Pro: equity & drawdown curve from logged TOS trades
  const oneR = getOneR()
  const dayMap = {}
  for (const t of trades) { if (!t.trade_date) continue; dayMap[t.trade_date] = (dayMap[t.trade_date] || 0) + tradeR(t) * oneR }
  const days = Object.entries(dayMap).map(([date, v]) => ({ date, v })).sort((x, y) => x.date.localeCompare(y.date))
  const curve = days.reduce((acc, d) => {
    const prev = acc[acc.length - 1]
    const eqRaw = (prev ? prev.eqRaw : 0) + d.v
    const peakRaw = Math.max(prev ? prev.peakRaw : 0, eqRaw)
    return [...acc, { date: d.date, label: d.date.slice(5), pnl: Math.round(d.v), eqRaw, peakRaw, equity: Math.round(eqRaw), dd: Math.round(eqRaw - peakRaw) }]
  }, [])
  const recentDays = days.slice(-10)
  const avgDaily = recentDays.length ? recentDays.reduce((s, d) => s + d.v, 0) / recentDays.length : 0
  const projDays = avgDaily > 0 && profitRemaining > 0 ? Math.ceil(profitRemaining / avgDaily) : null

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '-0.4px' }}>{a.name}</h3>
            <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '10px', fontWeight: 700, background: `${statusColor}1f`, color: statusColor, border: `1px solid ${statusColor}40`, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{a.status}</span>
          </div>
          <div style={{ fontSize: '13px', color: '#777', marginTop: '6px' }}>
            Balance <b style={{ color: '#fff' }}>{usd(cur)}</b> · P&L <b style={{ color: pnl >= 0 ? GREEN : RED }}>{pnl >= 0 ? '+' : ''}{usd(pnl)}</b>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onEdit} style={{ ...ghostBtn, padding: '8px 14px', fontSize: '12px' }}>Edit</button>
          <button onClick={onDelete} style={{ ...ghostBtn, padding: '8px 12px', color: RED, borderColor: 'rgba(255,107,107,0.3)' }}><Trash2 size={14} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '22px' }}>
        <StatCard label="Current Drawdown" value={pct(drawdownPct)} color={drawdownPct >= 4 ? RED : drawdownPct >= 2 ? YELLOW : GREEN} />
        <StatCard label="Daily DD Remaining" value={dailyLimit > 0 ? usd(dailyRemaining) : '—'} color={dailyLimit > 0 && dailyRemaining <= dailyLimit * 0.2 ? RED : GREEN} sub={dailyLimit > 0 ? `of ${usd(dailyLimit)}` : 'set a limit'} />
        <StatCard label="Max DD Remaining" value={maxLimit > 0 ? usd(maxDDRemaining) : '—'} color={maxLimit > 0 && maxDDRemaining <= maxLimit * 0.2 ? RED : GREEN} sub={maxLimit > 0 ? `of ${usd(maxLimit)}` : 'set a limit'} />
        <StatCard label="Profit Remaining" value={profitRemaining <= 0 ? 'Reached' : usd(profitRemaining)} color={profitRemaining <= 0 ? GREEN : GOLD} />
        <StatCard label="Days to Payout" value={daysToPayout == null ? '—' : daysToPayout < 0 ? 'Passed' : daysToPayout} color={BLUE} sub={a.payoutDate || 'set a date'} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {maxLimit > 0 && <ProgressBar label="Max Drawdown Used" value={usedMaxDD} max={maxLimit} dangerHigh valueText={`${usd(usedMaxDD)} / ${usd(maxLimit)}`} />}
        {dailyLimit > 0 && <ProgressBar label="Daily Drawdown Used" value={usedDaily} max={dailyLimit} dangerHigh valueText={`${usd(usedDaily)} / ${usd(dailyLimit)}`} />}
        {profitTarget > 0 && <ProgressBar label="Profit Target Progress" value={profitMade} max={profitTarget} dangerHigh={false} valueText={`${usd(profitMade)} / ${usd(profitTarget)}`} />}
      </div>

      {(usedMaxDD >= maxLimit * 0.8 && maxLimit > 0) && (
        <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,107,107,0.1)', border: `1px solid ${RED}44`, color: RED, fontWeight: 700, fontSize: '13px' }}>
          <AlertTriangle size={17} /> Near max drawdown breach — protect the account.
        </div>
      )}

      {pro && (
        <div style={{ marginTop: '22px', paddingTop: '20px', borderTop: `1px solid ${CARD_BORD}` }}>
          <SectionTitle Icon={BarChart2}>Pro Analytics <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: '#666', fontSize: '11px' }}>· from your logged TOS trades</span></SectionTitle>
          {days.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#555', fontSize: '13px' }}>Log trades to see your equity & drawdown curve.</div>
          ) : (
            <>
              <div className="tos-grid-3" style={{ marginBottom: '16px' }}>
                <StatCard label="Projected Days to Target" value={projDays == null ? '—' : projDays} color={BLUE} sub={avgDaily > 0 ? `target ÷ logged pace (${usd(avgDaily)}/day)` : 'need positive pace'} Icon={Hourglass} />
                <StatCard label="Avg Daily (last 10)" value={usd(avgDaily)} color={avgDaily >= 0 ? GREEN : RED} Icon={Calendar} />
                <StatCard label="Max Equity Drawdown" value={usd(Math.min(0, ...curve.map(c => c.dd), 0))} color={RED} Icon={TrendingDown} />
              </div>
              <div className="tos-grid-2">
                <div>
                  <div style={{ ...lbl, marginBottom: '10px' }}>Daily P&L</div>
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={curve} margin={{ top: 4, right: 6, bottom: 0, left: -10 }}>
                      <CartesianGrid stroke="#161616" vertical={false} />
                      <XAxis dataKey="label" tick={{ ...axTick, fontSize: 9 }} {...noAxis} />
                      <YAxis tick={axTick} {...noAxis} tickFormatter={usdK} />
                      <Tooltip contentStyle={chartTooltip} formatter={v => [usd(v), 'P&L']} />
                      <ReferenceLine y={0} stroke="#333" />
                      <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={26}>
                        {curve.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? GREEN : RED} fillOpacity={0.85} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div style={{ ...lbl, marginBottom: '10px' }}>Drawdown Curve</div>
                  <ResponsiveContainer width="100%" height={170}>
                    <ComposedChart data={curve} margin={{ top: 4, right: 6, bottom: 0, left: -10 }}>
                      <CartesianGrid stroke="#161616" vertical={false} />
                      <XAxis dataKey="label" tick={{ ...axTick, fontSize: 9 }} {...noAxis} />
                      <YAxis tick={axTick} {...noAxis} tickFormatter={usdK} />
                      <Tooltip contentStyle={chartTooltip} formatter={v => [usd(v), 'Drawdown']} />
                      <ReferenceLine y={0} stroke="#333" />
                      <Area type="monotone" dataKey="dd" stroke={RED} strokeWidth={1.5} fill={RED} fillOpacity={0.14} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  PAGE 6 — TRADE REVIEW
// ════════════════════════════════════════════════════════════════════════════
function Review({ trades, tableMissing, onUpdated, pro = false }) {
  const [saving, setSaving] = useState(null)

  const setAgain = async (t, val) => {
    setSaving(t.id)
    const patch = { would_take_again: val, no_reason: val ? null : (t.no_reason || null) }
    const { error } = await supabase.from('tos_trades').update(patch).eq('id', t.id)
    setSaving(null)
    if (error) { toast.error(error.message); return }
    onUpdated({ ...t, ...patch })
  }
  const setReason = async (t, reason) => {
    const next = t.no_reason === reason ? null : reason
    const { error } = await supabase.from('tos_trades').update({ no_reason: next, would_take_again: false }).eq('id', t.id)
    if (error) { toast.error(error.message); return }
    onUpdated({ ...t, no_reason: next, would_take_again: false })
  }

  const stats = useMemo(() => {
    const reviewed = trades.filter(t => t.would_take_again != null)
    const noTrades = trades.filter(t => t.would_take_again === false)
    const reasonCount = {}
    for (const t of noTrades) if (t.no_reason) reasonCount[t.no_reason] = (reasonCount[t.no_reason] || 0) + 1
    const topReason = Object.entries(reasonCount).sort((a, b) => b[1] - a[1])[0]
    // chased entry on losing trades
    const losing = trades.filter(t => t.result === 'Loss')
    const chasedLosing = losing.filter(t => t.no_reason === 'Chased Entry').length
    return {
      reviewedCount: reviewed.length,
      notAgainPct: reviewed.length ? Math.round(noTrades.length / reviewed.length * 100) : 0,
      noCount: noTrades.length,
      topReason: topReason ? { name: topReason[0], n: topReason[1] } : null,
      chasedLosingPct: losing.length ? Math.round(chasedLosing / losing.length * 100) : 0,
      losingN: losing.length,
    }
  }, [trades])

  // Pro: pattern recognition over "would take again" data
  const patterns = useMemo(() => {
    const out = []
    const regret = (arr) => { const r = arr.filter(t => t.would_take_again != null); const no = r.filter(t => t.would_take_again === false).length; return { pct: r.length ? Math.round(no / r.length * 100) : 0, n: r.length } }
    for (const s of ['London', 'NY', 'Asian']) {
      const d = regret(trades.filter(t => t.session === s && t.result === 'Loss'))
      if (d.n >= 2 && d.pct >= 50) out.push({ text: `You avoid taking trades again after ${s} losses`, detail: `${d.pct}% of reviewed ${s} losses flagged "wouldn't take again" (n=${d.n})`, color: RED, score: d.pct })
    }
    const ls = regret(trades.filter(t => t.liquidity_swept === false))
    if (ls.n >= 2 && ls.pct >= 50) out.push({ text: 'You regret trading without a liquidity sweep', detail: `${ls.pct}% of no-sweep trades you wouldn't repeat (n=${ls.n})`, color: ORANGE, score: ls.pct })
    const ote = regret(trades.filter(t => t.ote_present === false))
    if (ote.n >= 2 && ote.pct >= 50) out.push({ text: 'You regret entries taken without OTE', detail: `${ote.pct}% of non-OTE trades flagged (n=${ote.n})`, color: ORANGE, score: ote.pct })
    for (const dir of ['Long', 'Short']) {
      const dd = regret(trades.filter(t => t.direction === dir && t.result === 'Loss'))
      if (dd.n >= 3 && dd.pct >= 60) out.push({ text: `You second-guess ${dir} trades`, detail: `${dd.pct}% of ${dir} losses you wouldn't repeat (n=${dd.n})`, color: BLUE, score: dd.pct })
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 4)
  }, [trades])

  if (tableMissing) return <SqlNotice />
  if (trades.length === 0) return <EmptyState Icon={RefreshCw} title="Nothing to review" sub="Once you log trades, review each one here and be honest: would you take it again?" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Stats */}
      <div className="tos-grid-3">
        <StatCard label="Would NOT Take Again" value={pct(stats.notAgainPct)} color={stats.notAgainPct >= 40 ? RED : stats.notAgainPct >= 20 ? YELLOW : GREEN} Icon={ThumbsDown} sub={`${stats.noCount} of ${stats.reviewedCount} reviewed`} />
        <StatCard label="Most Common 'No' Reason" value={stats.topReason ? stats.topReason.name : '—'} color={GOLD} sub={stats.topReason ? `${stats.topReason.n} time${stats.topReason.n !== 1 ? 's' : ''}` : 'review trades to populate'} />
        <StatCard label="Chased Entry (losers)" value={pct(stats.chasedLosingPct)} color={ORANGE} Icon={Crosshair} sub={`of ${stats.losingN} losing trade${stats.losingN !== 1 ? 's' : ''}`} />
      </div>

      {stats.chasedLosingPct > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderRadius: '12px', background: 'rgba(255,159,67,0.1)', border: `1px solid ${ORANGE}44`, color: ORANGE, fontWeight: 700, fontSize: '13.5px' }}>
          <AlertTriangle size={18} /> You chased entry on {stats.chasedLosingPct}% of losing trades.
        </div>
      )}

      {pro && (
        <div style={card}>
          <SectionTitle Icon={Brain}>Pattern Recognition (Pro)</SectionTitle>
          {patterns.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.6 }}>No strong patterns yet — mark more trades "would take again / not" to surface behavioural tendencies.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {patterns.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', padding: '13px 15px', borderRadius: '11px', background: BG, border: `1px solid ${p.color}33` }}>
                  <Activity size={16} color={p.color} style={{ marginTop: '1px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#eee' }}>{p.text}</div>
                    <div style={{ fontSize: '11.5px', color: '#777', marginTop: '3px' }}>{p.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trade list */}
      {trades.map(t => {
        const c = t.result === 'Win' ? GREEN : t.result === 'Loss' ? RED : '#999'
        const reviewed = t.would_take_again != null
        return (
          <div key={t.id} style={{ ...card, border: `1px solid ${reviewed ? (t.would_take_again ? 'rgba(126,231,135,0.25)' : 'rgba(255,107,107,0.25)') : CARD_BORD}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              {/* details */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, color: '#fff', fontSize: '16px' }}>{t.instrument}</span>
                  <span style={{ fontSize: '12px', color: t.direction === 'Short' ? RED : GREEN }}>{t.direction || '—'}</span>
                  <span style={{ padding: '2px 9px', borderRadius: '99px', fontSize: '10px', fontWeight: 700, background: `${c}1f`, color: c, border: `1px solid ${c}40` }}>{t.result}</span>
                  <span style={{ fontSize: '12px', color: GOLD, fontWeight: 700 }}>{t.rr ? `${t.rr}R` : ''}</span>
                  <span style={{ fontSize: '12px', color: '#666' }}>{t.trade_date}{t.session ? ` · ${t.session}` : ''}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {t.bias && <Tag>{t.bias}</Tag>}
                  {t.liquidity_swept && <Tag>Liq swept</Tag>}
                  {t.rejection_block && <Tag>RB</Tag>}
                  {t.wick_ce && <Tag>Wick CE</Tag>}
                  {t.ote_present && <Tag>OTE</Tag>}
                  {t.key_open && <Tag>Key Open</Tag>}
                  {t.loss_reason && <Tag color={RED}>{t.loss_reason}</Tag>}
                </div>
                {t.notes && <div style={{ fontSize: '12.5px', color: '#888', marginTop: '10px', lineHeight: 1.55 }}>{t.notes}</div>}
              </div>

              {/* would take again */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ ...lbl, textAlign: 'right' }}>Take this again?</div>
                <div style={{ display: 'flex', gap: '7px' }}>
                  <button onClick={() => setAgain(t, true)} disabled={saving === t.id} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '9px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '13px', minHeight: 0,
                    border: `1px solid ${t.would_take_again === true ? GREEN : CARD_BORD}`,
                    background: t.would_take_again === true ? 'rgba(126,231,135,0.15)' : 'transparent',
                    color: t.would_take_again === true ? GREEN : '#888',
                  }}><ThumbsUp size={15} /> Yes</button>
                  <button onClick={() => setAgain(t, false)} disabled={saving === t.id} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '9px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '13px', minHeight: 0,
                    border: `1px solid ${t.would_take_again === false ? RED : CARD_BORD}`,
                    background: t.would_take_again === false ? 'rgba(255,107,107,0.15)' : 'transparent',
                    color: t.would_take_again === false ? RED : '#888',
                  }}><ThumbsDown size={15} /> No</button>
                </div>
              </div>
            </div>

            {/* reason selector when NO */}
            {t.would_take_again === false && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${CARD_BORD}` }}>
                <div style={{ ...lbl, color: RED, marginBottom: '10px' }}>Why wouldn't you take it again?</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {NO_REASONS.map(reason => {
                    const on = t.no_reason === reason
                    return (
                      <button key={reason} onClick={() => setReason(t, reason)} style={{
                        padding: '8px 13px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', minHeight: 0,
                        border: `1px solid ${on ? RED : CARD_BORD}`,
                        background: on ? 'rgba(255,107,107,0.15)' : 'transparent',
                        color: on ? RED : '#888', fontWeight: on ? 700 : 500,
                      }}>{reason}</button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  CHALLENGE PASS SYSTEM
// ════════════════════════════════════════════════════════════════════════════
// Rule sets are auto-calculated estimates expressed as % of account size.
// profit = per-phase profit target %, daily = max daily loss %, total = max
// total/trailing drawdown %, minDays = minimum trading days. Verify with firm.
const CHALLENGE_FIRMS = {
  Apex:    { label: 'Apex',              profit: { P1: 6,  P2: 6 }, daily: 0, total: 5,  minDays: 7, trailing: true, note: 'Trailing threshold · no daily limit' },
  FTMO:    { label: 'FTMO',              profit: { P1: 10, P2: 5 }, daily: 5, total: 10, minDays: 4, note: 'Two-phase evaluation' },
  TFT:     { label: 'The Funded Trader', profit: { P1: 10, P2: 5 }, daily: 5, total: 10, minDays: 5, note: 'Two-phase evaluation' },
  MFF:     { label: 'MyForexFunds',      profit: { P1: 8,  P2: 5 }, daily: 5, total: 12, minDays: 5, note: 'Estimate — verify program' },
  TopStep: { label: 'TopStep',           profit: { P1: 6,  P2: 6 }, daily: 2, total: 4,  minDays: 5, trailing: true, note: 'Trailing max loss · daily limit' },
  Other:   { label: 'Other',             profit: { P1: 8,  P2: 5 }, daily: 5, total: 10, minDays: 5, note: 'Generic defaults — verify' },
}
const ACCOUNT_SIZES = [10000, 25000, 50000, 100000, 200000]
const CH_KEY = 'tos_challenge'
const blankChallenge = () => ({ firm: 'Apex', accountSize: 50000, phase: 'P1', startDate: todayKey(), currentPnl: '', riskPct: '1', celebrated: [], peakPnl: 0 })

function Challenge({ trades, pro = false }) {
  const [ch, setCh] = useState(() => ({ ...blankChallenge(), ...lsGet(CH_KEY, {}) }))
  const [confettiRun, setConfettiRun] = useState(false)
  useEffect(() => { lsSet(CH_KEY, ch) }, [ch])
  const setC = (k, v) => setCh(c => ({ ...c, [k]: v }))

  const f = CHALLENGE_FIRMS[ch.firm] || CHALLENGE_FIRMS.Other
  const accountSize = Number(ch.accountSize) || 0
  const phaseProfitPct = ch.phase === 'Funded' ? 0 : (f.profit[ch.phase] ?? f.profit.P1)
  const profitTarget = accountSize * phaseProfitPct / 100
  const dailyDD = accountSize * f.daily / 100
  const totalDD = accountSize * f.total / 100
  const minDays = f.minDays

  const pnl = parseFloat(ch.currentPnl) || 0
  // Funded phase has no profit target → never "passes" / celebrates.
  const profitProgress = (phaseProfitPct > 0 && profitTarget > 0) ? clamp(pnl / profitTarget, 0, 1) : 0
  const profitPct = Math.round(profitProgress * 100)

  // days traded (distinct dates) since start
  const sinceStart = (t) => !ch.startDate || (t.trade_date && t.trade_date >= ch.startDate)
  const chTrades = trades.filter(sinceStart)
  const tradedDays = new Set(chTrades.map(t => t.trade_date)).size
  const start = ch.startDate ? new Date(ch.startDate + 'T00:00:00') : null
  // weekday count (Mon–Fri) between start and today — "trading day consistency"
  // should not be diluted by weekends.
  const weekdaysElapsed = (() => {
    if (!start) return Math.max(1, tradedDays)
    let n = 0
    const end = new Date(todayKey() + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) { const wd = d.getDay(); if (wd >= 1 && wd <= 5) n++ }
    return Math.max(1, n)
  })()

  // P&L derived from logged TOS trades (since start) — used for pace & consistency
  // so those agree with the Daily P&L chart even when Current P&L is left blank.
  const oneR = getOneR()
  const dayPnl = {}
  for (const t of chTrades) { dayPnl[t.trade_date] = (dayPnl[t.trade_date] || 0) + tradeR(t) * oneR }
  const loggedPnl = Object.values(dayPnl).reduce((s, v) => s + v, 0)
  const pacePnl = ch.currentPnl !== '' && !Number.isNaN(parseFloat(ch.currentPnl)) ? pnl : loggedPnl

  // pace
  const neededPerDay = minDays > 0 ? profitTarget / minDays : profitTarget
  const currentPerDay = tradedDays > 0 ? pacePnl / tradedDays : 0
  const onPace = currentPerDay >= neededPerDay

  // sizing recommendations (uses risk-engine stop + challenge risk %)
  const stop = parseFloat(getRisk().stopLoss) || 20
  const riskPctNum = parseFloat(ch.riskPct) || 1
  const dollarRisk = accountSize * riskPctNum / 100
  const sizeText = (dr) => {
    const nq = stop > 0 ? dr / (stop * 20) : 0
    const mnq = stop > 0 ? dr / (stop * 2) : 0
    if (nq >= 1) return `${Math.floor(nq)} NQ or ${Math.floor(mnq)} MNQ`
    return `${nq.toFixed(2)} NQ → ${Math.floor(mnq)} MNQ`
  }

  // daily-limit calculator
  const tradesBeforeLimit = dailyDD > 0 && dollarRisk > 0 ? Math.floor(dailyDD / dollarRisk) : null

  // consistency — per-day $ from logged R × 1R (dayPnl computed above)
  const dayVals = Object.entries(dayPnl).map(([date, v]) => ({ date, v })).sort((a, b) => a.date.localeCompare(b.date))
  const profitDays = dayVals.filter(d => d.v > 0)
  const totalProfit = profitDays.reduce((s, d) => s + d.v, 0)
  const largestDay = dayVals.reduce((mx, d) => Math.max(mx, d.v), 0)
  const largestPct = totalProfit > 0 ? Math.round(largestDay / totalProfit * 100) : 0
  const dayConsistency = Math.min(100, Math.round(tradedDays / weekdaysElapsed * 100))
  // Trailing-DD firms (Apex/TopStep) erode the buffer from the equity peak, not
  // just from negative P&L. Use a high-water mark for those.
  const totalDDUsed = f.trailing ? Math.max(0, (Number(ch.peakPnl) || 0) - pnl) : Math.max(0, -pnl)

  // track equity high-water mark for trailing-DD firms
  useEffect(() => {
    if (pnl > (Number(ch.peakPnl) || 0)) setCh(c => ({ ...c, peakPnl: pnl }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pnl])

  // milestone confetti — `celebrated` tracks the CURRENT hit set (pruned on the
  // way down) so a brand-new challenge climbing back through 25/50/75/100% fires
  // again, while a single forward run never double-celebrates.
  const MILES = [25, 50, 75, 100]
  const hitMs = MILES.filter(m => profitPct >= m)
  const hitKey = hitMs.join(',')
  useEffect(() => {
    const prev = ch.celebrated || []
    const fresh = hitMs.some(m => !prev.includes(m))
    const changed = hitMs.length !== prev.length || hitMs.some(m => !prev.includes(m))
    if (changed) setCh(c => ({ ...c, celebrated: hitMs }))
    if (!fresh) return
    setConfettiRun(true)
    const t = setTimeout(() => setConfettiRun(false), 4200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hitKey])

  const firmBtn = (key) => {
    const info = CHALLENGE_FIRMS[key]
    const on = ch.firm === key
    return (
      <button key={key} type="button" onClick={() => setC('firm', key)} style={{
        padding: '10px 12px', borderRadius: '9px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: on ? 700 : 500, minHeight: 0, transition: 'all .15s',
        border: `1px solid ${on ? GOLD_LINE : CARD_BORD}`, background: on ? GOLD_SOFT : 'transparent', color: on ? GOLD : '#999',
      }}>{info.label}</button>
    )
  }

  const passed = profitPct >= 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Confetti run={confettiRun} />

      {/* Setup */}
      <div style={card}>
        <SectionTitle Icon={Trophy}>Challenge Tracker</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={lbl}>Prop Firm</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
              {Object.keys(CHALLENGE_FIRMS).map(firmBtn)}
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>{f.note}</div>
          </div>
          <div className="tos-grid-2">
            <div>
              <div style={lbl}>Account Size</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(74px, 1fr))', gap: '8px' }}>
                {ACCOUNT_SIZES.map(sz => {
                  const on = Number(ch.accountSize) === sz
                  return (
                    <button key={sz} type="button" onClick={() => setC('accountSize', sz)} style={{
                      padding: '10px 6px', borderRadius: '9px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: on ? 700 : 500, minHeight: 0, transition: 'all .15s',
                      border: `1px solid ${on ? GOLD_LINE : CARD_BORD}`, background: on ? GOLD_SOFT : 'transparent', color: on ? GOLD : '#999',
                    }}>${sz / 1000}K</button>
                  )
                })}
              </div>
            </div>
            <div>
              <div style={lbl}>Phase</div>
              <Seg options={[{ label: 'Phase 1', value: 'P1' }, { label: 'Phase 2', value: 'P2' }, { label: 'Funded', value: 'Funded' }]} value={ch.phase} onChange={v => setC('phase', v || 'P1')} />
            </div>
          </div>
          <div className="tos-grid-3">
            <div><div style={lbl}>Start Date</div><input type="date" className="tos-date" max={todayKey()} value={ch.startDate} onChange={e => setC('startDate', e.target.value)} style={{ ...inp, colorScheme: 'dark' }} /></div>
            <div><div style={lbl}>Current P&L ($)</div><input value={ch.currentPnl} onChange={e => setC('currentPnl', e.target.value)} type="number" step="50" inputMode="decimal" style={inp} placeholder="0" /></div>
            <div><div style={lbl}>Risk % per trade</div><input value={ch.riskPct} onChange={e => setC('riskPct', e.target.value)} type="number" step="0.1" min="0.1" inputMode="decimal" style={inp} placeholder="1" /></div>
          </div>
        </div>
      </div>

      {passed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 22px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(126,231,135,0.18), rgba(234,179,8,0.12))', border: `1px solid ${GREEN}66`, color: GREEN, fontWeight: 900, fontSize: '18px' }}>
          <Award size={24} /> CHALLENGE PASSED — profit target reached. Lock it in.
        </div>
      )}

      {/* Auto-calculated rules */}
      <div>
        <SectionTitle Icon={Shield}>Auto-Calculated Rules — {f.label} ${accountSize / 1000}K · {ch.phase === 'Funded' ? 'Funded' : ch.phase === 'P2' ? 'Phase 2' : 'Phase 1'}</SectionTitle>
        <div className="tos-grid-4">
          <StatCard label="Profit Target" value={phaseProfitPct > 0 ? usd(profitTarget) : 'Maintain'} color={GOLD} sub={phaseProfitPct > 0 ? `${phaseProfitPct}% of account` : 'no target — funded'} Icon={Target} />
          <StatCard label="Max Daily Drawdown" value={f.daily > 0 ? usd(dailyDD) : 'None'} color={f.daily > 0 ? ORANGE : '#888'} sub={f.daily > 0 ? `${f.daily}% of account` : 'trailing only'} Icon={TrendingDown} />
          <StatCard label="Max Total Drawdown" value={usd(totalDD)} color={RED} sub={`${f.total}% of account`} Icon={AlertTriangle} />
          <StatCard label="Min Trading Days" value={minDays} color={BLUE} sub={`${tradedDays} done`} Icon={Calendar} />
        </div>
      </div>

      {/* Progress tracking */}
      <div style={card}>
        <SectionTitle Icon={Activity}>Progress Tracking</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {phaseProfitPct > 0 && <ProgressBar label="Profit Target" value={Math.max(0, pnl)} max={profitTarget} dangerHigh={false} valueText={`${usd(pnl)} / ${usd(profitTarget)} (${profitPct}%)`} />}
          <ProgressBar label="Min Trading Days" value={tradedDays} max={minDays} dangerHigh={false} valueText={`${tradedDays} / ${minDays} days`} />
          {totalDD > 0 && <ProgressBar label="Total Drawdown Used" value={totalDDUsed} max={totalDD} dangerHigh valueText={`${usd(totalDDUsed)} / ${usd(totalDD)}`} />}
        </div>
        {phaseProfitPct > 0 && (
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: onPace ? GREEN : ORANGE, fontWeight: 600 }}>
            {onPace ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            Pace: need {usd(neededPerDay)}/day · current {usd(currentPerDay)}/day — {onPace ? 'on track' : 'slightly behind'}
          </div>
        )}
      </div>

      {/* Milestones */}
      {phaseProfitPct > 0 && (
      <div style={card}>
        <SectionTitle Icon={Award}>Milestones</SectionTitle>
        <div className="tos-grid-4">
          {MILES.map(m => {
            const hit = profitPct >= m
            const c = m === 100 ? GREEN : GOLD
            return (
              <div key={m} style={{ padding: '16px 12px', borderRadius: '12px', textAlign: 'center', background: hit ? `${c}14` : BG, border: `1px solid ${hit ? c + '55' : CARD_BORD}`, transition: 'all .3s' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                  {hit ? <CheckCircle size={22} color={c} /> : <Target size={22} color="#444" />}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: hit ? c : '#555' }}>{m}%</div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '3px' }}>{m === 100 ? 'PASSED' : usd(profitTarget * m / 100)}</div>
              </div>
            )
          })}
        </div>
      </div>
      )}

      {/* Smart sizing + daily limit */}
      <div className="tos-grid-2">
        <div style={card}>
          <SectionTitle Icon={Zap}>Smart Sizing</SectionTitle>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '12px', lineHeight: 1.6 }}>
            With ${accountSize / 1000}K {f.label} at {riskPctNum}% risk ({usd(dollarRisk)}), {stop}pt stop:
          </div>
          {[
            { l: 'Normal days', v: sizeText(dollarRisk), c: GREEN, Icon: CheckCircle },
            { l: 'After 1 loss (half risk)', v: sizeText(dollarRisk / 2), c: ORANGE, Icon: AlertTriangle },
          ].map(row => (
            <div key={row.l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderTop: `1px solid #161616`, gap: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#aaa' }}><row.Icon size={14} color={row.c} /> {row.l}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: row.c, textAlign: 'right' }}>{row.v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderTop: `1px solid #161616` }}>
            <span style={{ fontSize: '12px', color: '#aaa' }}>Daily target pace</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: GOLD }}>{usd(neededPerDay)}/day</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderTop: `1px solid #161616` }}>
            <span style={{ fontSize: '12px', color: '#aaa' }}>Current pace</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: onPace ? GREEN : ORANGE }}>{usd(currentPerDay)}/day</span>
          </div>
        </div>

        <div style={card}>
          <SectionTitle Icon={Crosshair}>Daily Limit Calculator</SectionTitle>
          {f.daily > 0 ? (
            <>
              <div style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.7 }}>
                Daily drawdown limit: <b style={{ color: ORANGE }}>{usd(dailyDD)}</b>.<br />
                At {riskPctNum}% risk ({usd(dollarRisk)}/trade) that's <b style={{ color: '#fff' }}>{tradesBeforeLimit}</b> full-risk losses before you hit the limit.
              </div>
              <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '10px', background: BG, border: `1px solid ${GOLD_LINE}`, color: GOLD, fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} /> Recommended: max 2 trades per day
              </div>
            </>
          ) : (
            <div style={{ fontSize: '13px', color: '#999', lineHeight: 1.7 }}>
              {f.label} uses a <b style={{ color: '#ccc' }}>trailing</b> drawdown with no fixed daily limit. Protect the <b style={{ color: RED }}>{usd(totalDD)}</b> total buffer — recommended max 2 trades per day.
            </div>
          )}
        </div>
      </div>

      {/* Consistency */}
      <div style={card}>
        <SectionTitle Icon={Gem}>Consistency Score</SectionTitle>
        <div className="tos-grid-3" style={{ marginBottom: '14px' }}>
          <StatCard label="Trading Day Consistency" value={`${dayConsistency}%`} color={dayConsistency >= 50 ? GREEN : YELLOW} sub={`${tradedDays} of ${weekdaysElapsed} weekdays`} Icon={Calendar} />
          <StatCard label="Largest Single Day" value={totalProfit > 0 ? usd(largestDay) : '—'} color={largestPct > 40 ? RED : GREEN} sub={totalProfit > 0 ? `${largestPct}% of profit` : 'no profit data'} Icon={Flame} />
          <StatCard label="Active Days" value={tradedDays} color={BLUE} sub="logged in tos_trades" Icon={Activity} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '12px 14px', borderRadius: '10px', background: largestPct > 40 ? 'rgba(255,107,107,0.08)' : BG, border: `1px solid ${largestPct > 40 ? RED + '44' : CARD_BORD}`, fontSize: '12.5px', color: largestPct > 40 ? RED : '#999', lineHeight: 1.5 }}>
          {largestPct > 40 ? <AlertTriangle size={15} /> : <CheckCircle size={15} color={GREEN} />}
          {totalProfit > 0
            ? `Your largest single day is ${largestPct}% of total profit — firms flag above 40%.`
            : 'Log winning days in the Trade Log to measure P&L consistency.'}
        </div>
      </div>

      {pro && (
        <div style={card}>
          <SectionTitle Icon={BarChart2}>Daily P&L Since Start (Pro)</SectionTitle>
          {dayVals.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#555', fontSize: '13px' }}>No trades logged since the start date.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dayVals.map(d => ({ ...d, label: d.date.slice(5) }))} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid stroke="#161616" vertical={false} />
                <XAxis dataKey="label" tick={axTick} {...noAxis} />
                <YAxis tick={axTick} {...noAxis} tickFormatter={usdK} />
                <Tooltip contentStyle={chartTooltip} formatter={(v) => [usd(v), 'P&L']} />
                <ReferenceLine y={0} stroke="#333" />
                <Bar dataKey="v" radius={[3, 3, 0, 0]} maxBarSize={30}>
                  {dayVals.map((d, i) => <Cell key={i} fill={d.v >= 0 ? GREEN : RED} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      <div style={{ fontSize: '11px', color: '#555', textAlign: 'center', lineHeight: 1.6 }}>
        Rule sets are auto-calculated estimates (% of account). Always verify the exact numbers with your prop firm's program.
      </div>
    </div>
  )
}

// ─── Shared delivery helpers (Delivery Sequence merged into the Daily Plan) ──
const D_GREEN = '#22c55e'
const D_RED   = '#ef4444'
const D_AMBER = '#f59e0b'
const DELIV_SESSION = [
  { k: 'londonHigh', l: 'London High' },
  { k: 'londonLow', l: 'London Low' },
  { k: 'sessionHigh', l: 'Session High' },
  { k: 'sessionLow', l: 'Session Low' },
]
// Reusable checkbox row (Daily Plan entry-trigger validation)
function DCheck({ label, on, onClick, color = GOLD }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '9px', width: '100%', textAlign: 'left', minHeight: 0,
      border: `1px solid ${on ? color + '88' : CARD_BORD}`, background: on ? `${color}14` : 'transparent', color: on ? '#fff' : '#999', fontSize: '12.5px', fontWeight: on ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
    }}>
      <span style={{ width: '17px', height: '17px', borderRadius: '5px', flexShrink: 0, border: `1.5px solid ${on ? color : '#333'}`, background: on ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {on && <Check size={11} strokeWidth={3.5} color="#000" />}
      </span>
      {label}
    </button>
  )
}

// ─── SQL setup notice (shown when tos_trades table is absent) ───────────────
const TOS_SQL = `CREATE TABLE tos_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  trade_date date DEFAULT CURRENT_DATE,
  session text, instrument text, direction text, bias text,
  entry numeric, stop_loss numeric, target numeric, rr numeric,
  result text,
  liquidity_swept boolean, rejection_block boolean, wick_ce boolean,
  ote_present boolean, key_open boolean,
  loss_reason text, notes text,
  would_take_again boolean, no_reason text,
  process_score int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE tos_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own TOS trades" ON tos_trades
  FOR ALL USING (auth.uid() = user_id);`

function SqlNotice() {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard?.writeText(TOS_SQL).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }) }
  return (
    <div style={{ ...card, border: `1px solid ${GOLD_LINE}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <AlertTriangle size={20} color={GOLD} />
        <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>One-time setup needed</div>
      </div>
      <div style={{ fontSize: '13px', color: '#999', lineHeight: 1.7, marginBottom: '14px' }}>
        The <code style={{ color: GOLD }}>tos_trades</code> table doesn't exist in Supabase yet. Run this SQL in your Supabase project (SQL Editor) once, then reload. The Daily Plan, Risk Engine and Funded pages work without it (they use local storage).
      </div>
      <pre style={{ background: BG, border: `1px solid ${CARD_BORD}`, borderRadius: '10px', padding: '16px', fontSize: '11.5px', color: '#bbb', overflowX: 'auto', lineHeight: 1.6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{TOS_SQL}</pre>
      <button onClick={copy} style={{ ...goldBtn, marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{copied ? <><Check size={14} strokeWidth={3} /> Copied</> : 'Copy SQL'}</button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  TOS SHELL — sub-navigation + shared data
// ════════════════════════════════════════════════════════════════════════════
const UI_KEY = 'tos_ui_mode'
const TABS = [
  { id: 'plan',        label: 'Daily Plan',  Icon: ClipboardList },
  { id: 'log',         label: 'Trade Log',   Icon: BookOpen },
  { id: 'risk',        label: 'Risk Engine', Icon: Shield },
  { id: 'performance', label: 'Performance', Icon: BarChart2 },
  { id: 'funded',      label: 'Funded',      Icon: Wallet },
  { id: 'challenge',   label: 'Challenge',   Icon: Trophy },
  { id: 'review',      label: 'Review',      Icon: RefreshCw },
]

const TOS_CSS = `
@keyframes tosEnter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes tosBannerPulse { 0%,100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 20px 1px currentColor; } }
@keyframes tosSpin { to { transform: rotate(360deg); } }
@keyframes tosConfetti { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
@keyframes tosMeter { from { width: 0; } }
@keyframes tosShake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-7px); } 40%,80% { transform: translateX(7px); } }
.tos-shake { animation: tosShake 0.4s ease; }
.tos-spin { animation: tosSpin .9s linear infinite; }
.tos-tabs::-webkit-scrollbar { height: 0; display: none; }
.tos-chipgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
.tos-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.tos-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.tos-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.tos-grid-plan { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
.tos-grid-log { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 14px; align-items: start; }
.tos-grid-risk { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 14px; align-items: start; }
.tos-date::-webkit-calendar-picker-indicator { filter: invert(0.6) sepia(1) saturate(6) hue-rotate(2deg); cursor: pointer; }
@media (max-width: 900px) {
  .tos-grid-plan, .tos-grid-log, .tos-grid-risk { grid-template-columns: 1fr !important; }
}
@media (max-width: 768px) {
  .tos-grid-3, .tos-grid-4 { grid-template-columns: 1fr 1fr !important; }
  .tos-chipgrid { grid-template-columns: 1fr 1fr !important; }
}
@media (max-width: 480px) {
  .tos-grid-2, .tos-grid-3 { grid-template-columns: 1fr !important; }
  .tos-chipgrid { grid-template-columns: 1fr !important; }
}
`

// Lightweight CSS confetti burst — fired on challenge milestones.
function Confetti({ run }) {
  if (!run) return null
  const colors = [GOLD, GREEN, BLUE, '#ff6eb4', '#a78bfa', ORANGE]
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998, overflow: 'hidden' }}>
      {Array.from({ length: 40 }).map((_, i) => {
        const left = (i * 2.5 + (i % 3) * 7) % 100
        const delay = (i % 10) * 0.09
        const dur = 2.4 + (i % 5) * 0.35
        const size = 7 + (i % 4) * 2
        return <span key={i} style={{ position: 'absolute', top: '-24px', left: `${left}%`, width: `${size}px`, height: `${size}px`, background: colors[i % colors.length], borderRadius: i % 2 ? '50%' : '2px', animation: `tosConfetti ${dur}s ${delay}s ease-in forwards` }} />
      })}
    </div>
  )
}

// Section header used across the new analytics blocks.
function SectionTitle({ Icon, children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        {Icon && <Icon size={16} color={GOLD} />}
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{children}</div>
      </div>
      {action}
    </div>
  )
}

// Win-rate split bar used by the Edge Tracker.
function SplitBar({ label, a, b, aLabel = 'A', bLabel = 'B' }) {
  // a / b = { wr, n } objects
  const row = (lab, d, color) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
      <span style={{ fontSize: '11px', color: '#888', width: '92px', flexShrink: 0 }}>{lab}</span>
      <div style={{ flex: 1, height: '8px', borderRadius: '5px', background: '#161616', overflow: 'hidden' }}>
        <div style={{ width: `${d.n ? d.wr : 0}%`, height: '100%', background: color, borderRadius: '5px', transition: 'width .4s' }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 700, color: d.n ? color : '#444', width: '64px', textAlign: 'right', flexShrink: 0 }}>{d.n ? `${Math.round(d.wr)}%` : '—'}<span style={{ color: '#555', fontWeight: 400 }}> ({d.n})</span></span>
    </div>
  )
  return (
    <div style={{ padding: '12px 0', borderTop: `1px solid #161616` }}>
      <div style={{ fontSize: '12px', color: '#ccc', fontWeight: 600, marginBottom: '9px' }}>{label}</div>
      {row(aLabel, a, GREEN)}
      {row(bLabel, b, BLUE)}
    </div>
  )
}

export function TOSPage({ session }) {
  const [tab, setTab] = useState('plan')
  const [uiMode, setUiMode] = useState(() => (lsGet(UI_KEY, 'standard') === 'pro' ? 'pro' : 'standard'))
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const pro = uiMode === 'pro'
  const setMode = (m) => { setUiMode(m); lsSet(UI_KEY, m) }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('tos_trades').select('*')
        .eq('user_id', session.user.id)
        .order('trade_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (error) {
        // table missing / not yet created
        if (/relation|does not exist|schema cache|find the table/i.test(error.message || '')) setTableMissing(true)
        setTrades([])
      } else {
        setTrades(data || [])
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [session.user.id])

  // today's first-trade-loss → drives Risk Engine half-mode
  const todays = trades.filter(t => t.trade_date === todayKey())
  // A loss booked today (any order) — drives BOTH the Trade Log "HALF RISK"
  // banner (lossesToday >= 1) and the Risk Engine auto half-mode, so the two
  // surfaces of the same hard rule always agree.
  const lossTakenToday = todays.some(t => t.result === 'Loss')

  const onAdded   = (t) => setTrades(prev => [t, ...prev])
  const onDeleted = (id) => setTrades(prev => prev.filter(t => t.id !== id))
  const onUpdated = (u) => setTrades(prev => prev.map(t => t.id === u.id ? u : t))

  return (
    <div className="page-wrap" style={{ animation: 'tosEnter 0.25s ease-out both', paddingBottom: '60px' }}>
      <style dangerouslySetInnerHTML={{ __html: TOS_CSS }} />

      {/* Header */}
      <div style={{
        position: 'relative', overflow: 'hidden', marginBottom: '20px',
        background: 'linear-gradient(135deg, rgba(234,179,8,0.10) 0%, rgba(13,13,13,0.92) 55%, rgba(8,8,8,0.96) 100%), #0d0d0d',
        border: `1px solid ${GOLD}26`, borderRadius: '18px', padding: '28px 30px',
        boxShadow: `0 0 0 1px ${GOLD}11 inset`,
      }}>
        <div style={{ position: 'absolute', top: '-45%', right: '-8%', width: '300px', height: '300px', borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}44 0%, transparent 65%)`, filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '8px' }}>
              <Brain size={20} color={GOLD} />
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: GOLD, textTransform: 'uppercase' }}>Private System</div>
            </div>
            <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-1.5px', color: '#fff', lineHeight: 1, marginBottom: '8px' }}>Trading OS</h1>
            <div style={{ fontSize: '13.5px', color: '#999' }}>Plan → execute → enforce → measure → improve. Your edge, operationalised.</div>
          </div>
          {/* UI version switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px', borderRadius: '11px', background: 'rgba(0,0,0,0.35)', border: `1px solid ${CARD_BORD}`, flexShrink: 0 }}>
            {[{ id: 'standard', label: 'Standard', Icon: Layers }, { id: 'pro', label: 'Pro', Icon: Gem }].map(m => {
              const on = uiMode === m.id
              return (
                <button key={m.id} onClick={() => setMode(m.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', minHeight: 0,
                  border: 'none', background: on ? GOLD : 'transparent', color: on ? '#000' : '#999', fontSize: '12.5px', fontWeight: on ? 800 : 600, transition: 'all .15s',
                }}>
                  <m.Icon size={14} /> {m.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Sub-nav pills */}
      <div className="tos-tabs" style={{ display: 'flex', gap: '7px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '4px' }}>
        {TABS.map(t => {
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '99px', whiteSpace: 'nowrap',
              border: `1px solid ${active ? GOLD_LINE : CARD_BORD}`,
              background: active ? GOLD_SOFT : 'transparent',
              color: active ? GOLD : '#888', fontSize: '13px', fontWeight: active ? 700 : 500,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', flexShrink: 0, minHeight: 0,
            }}>
              <t.Icon size={15} color={active ? GOLD : '#666'} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Pages */}
      {loading && tab !== 'plan' && tab !== 'risk' && tab !== 'funded' ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#555', gap: '10px' }}>
          <Loader2 size={18} className="tos-spin" /> Loading…
        </div>
      ) : (
        <>
          {tab === 'plan'        && <DailyPlan pro={pro} />}
          {tab === 'log'         && <TradeLog session={session} trades={trades} tableMissing={tableMissing} onAdded={onAdded} onDeleted={onDeleted} pro={pro} />}
          {tab === 'risk'        && <RiskEngine lossTakenToday={lossTakenToday} trades={trades} pro={pro} />}
          {tab === 'performance' && <Performance trades={trades} tableMissing={tableMissing} pro={pro} />}
          {tab === 'funded'      && <Funded pro={pro} trades={trades} />}
          {tab === 'challenge'   && <Challenge session={session} trades={trades} tableMissing={tableMissing} pro={pro} />}
          {tab === 'review'      && <Review trades={trades} tableMissing={tableMissing} onUpdated={onUpdated} pro={pro} />}
        </>
      )}
    </div>
  )
}

export default TOSPage
