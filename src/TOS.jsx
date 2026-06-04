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
  RefreshCw, Plus, Trash2, Check, X, AlertTriangle, TrendingUp,
  Target, Activity, ChevronLeft, ChevronRight, DollarSign, Loader2,
  ThumbsUp, ThumbsDown, Gauge, Scale, ShieldCheck, Crosshair, Trophy,
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
const RISK_KEY = 'tos_risk_settings'
const defaultRisk = { accountSize: '10000', riskPct: '1', stopLoss: '20', valuePerPoint: '20' }
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

// ─── Option constants ───────────────────────────────────────────────────────
const SESSIONS         = ['London', 'NY', 'Asian']
const LIQ_TARGETS      = ['PDH', 'PDL', 'Data High', 'Data Low', 'Equal Highs', 'Equal Lows']
const HTF_POI          = ['H4 Rejection Block', 'H1 Rejection Block', 'H1 Order Block', 'H1 FVG']
const KEY_OPENS        = ['18:00 Open', 'Midnight Open', '8:30 Open', '9:30 Open', '10:00 Open', '13:00 Open']
const LIQ_CHECKLIST    = ['Liquidity Swept', 'Equal Highs Taken', 'Equal Lows Taken', 'PDH Taken', 'PDL Taken']
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
        <span style={{ color: '#555', fontSize: '10px' }}>▾</span>
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
const blankPlan = () => ({
  bias: '', biasReason: '',
  targets: [], deliveringText: '',
  poi: [], poiText: '',
  keyOpens: [], liqChecklist: [],
  ote: [], entryTrigger: '',
})

// Weighted scoring — a strong setup can score high WITHOUT every box ticked.
// Only Bias and Entry Trigger are required (0 or 10 each); the rest reward more
// confluence. Key Opens + OTE are optional bonuses, so the raw max (58) is
// capped at 50.
function computeQuality(p) {
  // Bias — REQUIRED (PxH or PxL): 0 or 10
  const bias = p.bias ? 10 : 0
  // Liquidity Targets — more checked = better: 1→5, 2→8, 3+→10
  const tc = p.targets.length
  const targets = tc >= 3 ? 10 : tc === 2 ? 8 : tc === 1 ? 5 : 0
  // HTF POI — at least one is good: 1→6, 2+→10
  const pc = p.poi.length
  const poi = pc >= 2 ? 10 : pc === 1 ? 6 : 0
  // Key Opens — optional bonus: +2 each, max 10
  const keyOpens = Math.min(10, p.keyOpens.length * 2)
  // OTE — optional bonus: any checked → +8
  const ote = p.ote.length > 0 ? 8 : 0
  // Entry Trigger — REQUIRED (select one): 0 or 10
  const entry = p.entryTrigger ? 10 : 0
  const parts = { bias, targets, poi, keyOpens, ote, entry }
  return { parts, total: Math.min(50, bias + targets + poi + keyOpens + ote + entry) }
}

function DailyPlan() {
  const [date, setDate] = useState(todayKey())
  const [plan, setPlan] = useState(() => lsGet(`tos_plan_${todayKey()}`, blankPlan()))

  // reload when date changes
  useEffect(() => { setPlan(lsGet(`tos_plan_${date}`, blankPlan())) }, [date])
  // persist on every change
  useEffect(() => { lsSet(`tos_plan_${date}`, plan) }, [plan, date])

  const toggle = (key, val) => setPlan(p => {
    const arr = p[key]
    return { ...p, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }
  })
  const set = (key, val) => setPlan(p => ({ ...p, [key]: val }))

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

  return (
    <div>
      {/* Date controls */}
      <div style={{ ...card, marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', padding: '16px 20px' }}>
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

      <div className="tos-grid-plan">
        {/* LEFT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Daily Bias */}
          <div style={card}>
            {sec('Daily Bias')}
            <div style={{ marginBottom: '12px' }}>
              <Seg options={[{ label: 'PxH', value: 'PxH' }, { label: 'PxL', value: 'PxL' }]} value={plan.bias} onChange={v => set('bias', v)} />
            </div>
            <div style={lbl}>Why is this my bias today?</div>
            <textarea value={plan.biasReason} onChange={e => set('biasReason', e.target.value)} style={ta} placeholder="Higher-timeframe context, draw on liquidity, narrative…" />
          </div>

          {/* Liquidity Targets */}
          <div style={card}>
            {sec('Liquidity Targets')}
            {chipGroup('targets', LIQ_TARGETS)}
            <div style={{ ...lbl, marginTop: '14px' }}>What is price delivering towards?</div>
            <textarea value={plan.deliveringText} onChange={e => set('deliveringText', e.target.value)} style={ta} placeholder="Primary draw on liquidity…" />
          </div>

          {/* HTF POI */}
          <div style={card}>
            {sec('HTF Point of Interest')}
            {chipGroup('poi', HTF_POI)}
            <div style={{ ...lbl, marginTop: '14px' }}>Main area of interest</div>
            <textarea value={plan.poiText} onChange={e => set('poiText', e.target.value)} style={ta} placeholder="Where do I expect the reaction?" />
          </div>
        </div>

        {/* RIGHT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Key Opens */}
          <div style={card}>{sec('Key Opens')}{chipGroup('keyOpens', KEY_OPENS)}</div>
          {/* Liquidity Checklist */}
          <div style={card}>{sec('Liquidity Checklist')}{chipGroup('liqChecklist', LIQ_CHECKLIST)}</div>
          {/* OTE + Entry Trigger */}
          <div style={card}>
            {sec('OTE')}
            <div className="tos-chipgrid">
              {OTE_LEVELS.map(o => <Chip key={o} label={o} on={plan.ote.includes(o)} onClick={() => toggle('ote', o)} />)}
            </div>
            <div style={{ marginTop: '18px' }}>{sec('Entry Trigger', 'Select one')}</div>
            <Seg options={ENTRY_TRIGGERS} value={plan.entryTrigger} onChange={v => set('entryTrigger', v || '')} />
          </div>
        </div>
      </div>

      {/* Trade Quality Score */}
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
            { k: 'bias',     l: 'Bias',              max: 10, req: true },
            { k: 'targets',  l: 'Liquidity Targets', max: 10 },
            { k: 'poi',      l: 'HTF POI',           max: 10 },
            { k: 'keyOpens', l: 'Key Opens',         max: 10 },
            { k: 'ote',      l: 'OTE',               max: 8 },
            { k: 'entry',    l: 'Entry Trigger',     max: 10, req: true },
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
        <div style={{ marginTop: '14px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
          {(!plan.bias || !plan.entryTrigger)
            ? `⚠️ Missing required: ${[!plan.bias && 'Bias', !plan.entryTrigger && 'Entry Trigger'].filter(Boolean).join(' + ')}`
            : total >= 35 ? '✅ A+ setup — conditions aligned' : total >= 20 ? '⚠️ Mediocre — wait for more confluence' : '🛑 Low quality — likely no-trade'}
          <span style={{ color: '#444' }}>{'  ·  '}* required</span>
        </div>
      </div>
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

function TradeLog({ session, trades, tableMissing, onAdded, onDeleted }) {
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
  if (lossesToday >= 2) banners.push({ id: 'stop', type: 'red', text: '🛑 STOP TRADING FOR TODAY — two losses, rules enforced' })
  else if (lossesToday === 1) banners.push({ id: 'half', type: 'red', text: '⚠️ HALF RISK REQUIRED — reduce position size by 50%' })
  if (winsToday >= 1 && lossesToday === 0) banners.push({ id: 'win', type: 'green', text: '✅ FIRST TRADE WON — consider calling it a day' })

  // Low-quality plan nudge — connects the morning Daily Plan score to the log.
  // Only fires when a plan was actually started today (not a blank/auto-saved one).
  const planRaw = lsGet(`tos_plan_${todayKey()}`, null)
  const planStarted = planRaw && (planRaw.bias || planRaw.biasReason || planRaw.entryTrigger ||
    planRaw.targets?.length || planRaw.poi?.length || planRaw.keyOpens?.length ||
    planRaw.liqChecklist?.length || planRaw.ote?.length)
  if (planStarted) {
    const planTotal = computeQuality({ ...blankPlan(), ...planRaw }).total
    if (planTotal < 20) banners.push({ id: 'plan', type: 'red', text: `🛑 PLAN QUALITY ${planTotal}/50 — no-trade conditions, confluence is thin` })
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
          {b.type === 'red' ? <AlertTriangle size={20} /> : <Trophy size={20} />}
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
                {todays.map(t => <TradeRow key={t.id} t={t} onDelete={del} />)}
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
                {recent.map(t => <TradeRow key={t.id} t={t} onDelete={del} showDate />)}
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

function TradeRow({ t, onDelete, showDate = false }) {
  const c = t.result === 'Win' ? GREEN : t.result === 'Loss' ? RED : '#999'
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
        <Tag color={followedRules(t) ? GREEN : ORANGE}>{followedRules(t) ? 'Rules ✓' : 'Rules ✗'}</Tag>
      </div>
      {t.notes && <div style={{ fontSize: '12px', color: '#888', marginTop: '8px', lineHeight: 1.5 }}>{t.notes}</div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  PAGE 3 — RISK MANAGEMENT ENGINE
// ════════════════════════════════════════════════════════════════════════════
function RiskEngine({ lossTakenToday }) {
  const [r, setR] = useState(() => getRisk())
  const [halfManual, setHalfManual] = useState(false)
  useEffect(() => { lsSet(RISK_KEY, r) }, [r])

  const halfActive = halfManual || lossTakenToday
  const set = (k) => (e) => setR(prev => ({ ...prev, [k]: e.target.value }))

  const acc   = parseFloat(r.accountSize) || 0
  const pctV  = parseFloat(r.riskPct) || 0
  const stop  = parseFloat(r.stopLoss) || 0
  const vpp   = parseFloat(r.valuePerPoint) || 0
  const effPct = halfActive ? pctV / 2 : pctV
  const dollarRisk = acc * effPct / 100
  const perContractRisk = stop * vpp
  const positionSize = perContractRisk > 0 ? dollarRisk / perContractRisk : 0
  const maxContracts = Math.floor(positionSize)

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
              <div><div style={lbl}>Account Size ($)</div><input value={r.accountSize} onChange={set('accountSize')} inputMode="decimal" style={inp} placeholder="10000" /></div>
              <div><div style={lbl}>Risk % per trade</div><input value={r.riskPct} onChange={set('riskPct')} type="number" step="0.1" min="0.1" inputMode="decimal" style={inp} placeholder="1" /></div>
              <div><div style={lbl}>Stop Loss (points / pips)</div><input value={r.stopLoss} onChange={set('stopLoss')} inputMode="decimal" style={inp} placeholder="20" /></div>
              <div><div style={lbl}>Value per point ($ / contract)</div><input value={r.valuePerPoint} onChange={set('valuePerPoint')} inputMode="decimal" style={inp} placeholder="20" /><div style={{ fontSize: '10px', color: '#555', marginTop: '5px' }}>NQ ≈ $20 · ES ≈ $50 · MNQ ≈ $2 · MES ≈ $5</div></div>

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
            <div className="tos-grid-3">
              <StatCard label="Dollar Risk" value={usd(dollarRisk)} color={GOLD} Icon={DollarSign} sub={halfActive ? 'half risk' : `${effPct}% of acct`} />
              <StatCard label="Position Size" value={positionSize ? positionSize.toFixed(2) : '—'} sub="raw" Icon={Scale} />
              <StatCard label="Max Contracts" value={perContractRisk > 0 ? maxContracts : '—'} color={GREEN} Icon={Crosshair} sub="rounded down" />
            </div>

            <div style={card}>
              <div style={{ ...lbl, marginBottom: '14px' }}>Expected Gains</div>
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
                      <td style={{ padding: '12px 0', borderTop: '1px solid #161616', fontSize: '15px', color: GREEN, fontWeight: 800, textAlign: 'right' }}>{usd(dollarRisk * rrV)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '14px', fontSize: '11px', color: '#555', lineHeight: 1.6 }}>
                Per-contract risk: {perContractRisk > 0 ? usd(perContractRisk) : '—'} ({stop || '—'} pts × {usd(vpp)}). Position size = dollar risk ÷ per-contract risk.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  PAGE 4 — PERFORMANCE DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
function Performance({ trades, tableMissing }) {
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
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#555', fontSize: '13px' }}>No losses recorded 🎯</div>
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
    </div>
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

function Funded() {
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
      {active && !editing && <FundedCard account={active} onEdit={() => setEditing({ ...active })} onDelete={() => remove(active.id)} />}
    </div>
  )
}

function FundedCard({ account: a, onEdit, onDelete }) {
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
        <StatCard label="Profit Remaining" value={profitRemaining <= 0 ? 'Hit ✓' : usd(profitRemaining)} color={profitRemaining <= 0 ? GREEN : GOLD} />
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
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  PAGE 6 — TRADE REVIEW
// ════════════════════════════════════════════════════════════════════════════
function Review({ trades, tableMissing, onUpdated }) {
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
      <button onClick={copy} style={{ ...goldBtn, marginTop: '14px' }}>{copied ? '✓ Copied' : 'Copy SQL'}</button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  TOS SHELL — sub-navigation + shared data
// ════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'plan',        label: 'Daily Plan',  Icon: ClipboardList },
  { id: 'log',         label: 'Trade Log',   Icon: BookOpen },
  { id: 'risk',        label: 'Risk Engine', Icon: Shield },
  { id: 'performance', label: 'Performance', Icon: BarChart2 },
  { id: 'funded',      label: 'Funded',      Icon: Wallet },
  { id: 'review',      label: 'Review',      Icon: RefreshCw },
]

const TOS_CSS = `
@keyframes tosEnter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes tosBannerPulse { 0%,100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 20px 1px currentColor; } }
@keyframes tosSpin { to { transform: rotate(360deg); } }
.tos-spin { animation: tosSpin .9s linear infinite; }
.tos-tabs::-webkit-scrollbar { height: 0; display: none; }
.tos-chipgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
.tos-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.tos-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.tos-grid-plan { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
.tos-grid-log { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 14px; align-items: start; }
.tos-grid-risk { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 14px; align-items: start; }
.tos-date::-webkit-calendar-picker-indicator { filter: invert(0.6) sepia(1) saturate(6) hue-rotate(2deg); cursor: pointer; }
@media (max-width: 900px) {
  .tos-grid-plan, .tos-grid-log, .tos-grid-risk { grid-template-columns: 1fr !important; }
}
@media (max-width: 768px) {
  .tos-grid-3 { grid-template-columns: 1fr 1fr !important; }
  .tos-chipgrid { grid-template-columns: 1fr 1fr !important; }
}
@media (max-width: 480px) {
  .tos-grid-2, .tos-grid-3 { grid-template-columns: 1fr !important; }
  .tos-chipgrid { grid-template-columns: 1fr !important; }
}
`

export function TOSPage({ session }) {
  const [tab, setTab] = useState('plan')
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)

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
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '8px' }}>
            <Brain size={20} color={GOLD} />
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: GOLD, textTransform: 'uppercase' }}>Private System</div>
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-1.5px', color: '#fff', lineHeight: 1, marginBottom: '8px' }}>Trading OS</h1>
          <div style={{ fontSize: '13.5px', color: '#999' }}>Plan → execute → enforce → measure → improve. Your edge, operationalised.</div>
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
          {tab === 'plan'        && <DailyPlan />}
          {tab === 'log'         && <TradeLog session={session} trades={trades} tableMissing={tableMissing} onAdded={onAdded} onDeleted={onDeleted} />}
          {tab === 'risk'        && <RiskEngine lossTakenToday={lossTakenToday} />}
          {tab === 'performance' && <Performance trades={trades} tableMissing={tableMissing} />}
          {tab === 'funded'      && <Funded />}
          {tab === 'review'      && <Review trades={trades} tableMissing={tableMissing} onUpdated={onUpdated} />}
        </>
      )}
    </div>
  )
}

export default TOSPage
