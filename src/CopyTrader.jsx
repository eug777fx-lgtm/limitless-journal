// ═══════════════════════════════════════════════════════════════════════════
//  COPY TRADER  —  Private prop-firm command center for eug777fx@gmail.com
//  7 tabs: Accounts · Overview · Risk · Payouts · Scaling · Mission · Copier
//  Self-contained module — mounted from App.jsx when page === 'copy'.
//  All data stored in localStorage (no Supabase tables required).
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import {
  Copy, Wallet, LayoutGrid, Shield, Banknote, TrendingUp, TrendingDown,
  Target, Plus, Pencil, Trash2, X, AlertTriangle,
  Lock, Activity, Zap, Server, Link2, GitBranch, Layers, Award, Calendar,
  Clock, CheckCircle, ChevronDown, Save, Gauge, Building2, Wifi,
  RefreshCw, Crosshair, Flag, Trophy, Rocket, CircleDot, ArrowUpRight,
  Percent, Coins, Signal, Radio, Network,
} from 'lucide-react'

// ─── Palette (fixed dark/blue — independent of app theme) ───────────────────
const BLUE       = '#3b82f6'
const BLUE_SOFT  = 'rgba(59,130,246,0.15)'
const BLUE_LINE  = 'rgba(59,130,246,0.40)'
const BLUE_DIM   = 'rgba(59,130,246,0.20)'
const BG         = '#080808'
const CARD_BG    = '#0a0f1a'
const CARD_BG2   = '#0c1322'
const CARD_BORD  = 'rgba(59,130,246,0.20)'
const GREEN      = '#34d399'
const RED        = '#f87171'
const YELLOW     = '#fbbf24'
const PURPLE     = '#a78bfa'
const TEXT_HI    = '#ffffff'
const TEXT_MD    = '#94a3b8'
const TEXT_LO    = '#64748b'

// ─── Shared style tokens ────────────────────────────────────────────────────
const card    = { background: CARD_BG, border: `1px solid ${CARD_BORD}`, borderRadius: '16px', padding: '22px' }
const lbl     = { fontSize: '10px', color: TEXT_LO, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: '6px' }
const inp     = { width: '100%', background: '#070b14', border: `1px solid ${CARD_BORD}`, borderRadius: '9px', padding: '10px 12px', color: TEXT_HI, fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color .15s' }
const ta      = { ...inp, minHeight: '90px', resize: 'vertical', lineHeight: 1.6 }
const blueBtn = { background: BLUE, color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 18px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '7px', transition: 'opacity .15s, transform .15s' }
const ghostBtn= { background: 'transparent', color: TEXT_MD, border: `1px solid ${CARD_BORD}`, borderRadius: '10px', padding: '11px 18px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '7px' }
const gradText= { background: `linear-gradient(90deg, #93c5fd 0%, ${BLUE} 60%, #2563eb 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }

// ─── localStorage helpers ───────────────────────────────────────────────────
const ACCOUNTS_KEY = 'copy_trader_accounts'
const PAYOUTS_KEY  = 'copy_trader_payouts'
const OVERVIEW_KEY = 'copy_trader_overview'
const RISK_KEY     = 'copy_trader_risk'
const SCALING_KEY  = 'copy_trader_scaling'
const MISSION_KEY  = 'copy_trader_mission'

const lsGet = (k, fb) => { try { const s = localStorage.getItem(k); return s == null ? fb : JSON.parse(s) } catch { return fb } }
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* unavailable */ } }
const makeId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// ─── number / formatting ────────────────────────────────────────────────────
const num   = (v) => { const n = Number(v); return isFinite(n) ? n : 0 }
const usd   = (n) => { const v = num(n); return (v < 0 ? '-$' : '$') + Math.round(Math.abs(v)).toLocaleString() }
const usdK  = (n) => { const v = num(n); const a = Math.abs(v); const s = v < 0 ? '-$' : '$'; return a >= 1000 ? `${s}${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : `${s}${Math.round(a)}` }
const pct1  = (n) => `${(num(n)).toFixed(num(n) % 1 === 0 ? 0 : 1)}%`
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const ddColor = (p) => p >= 75 ? RED : p >= 50 ? YELLOW : GREEN
const fmtDate = (s) => { if (!s) return '—'; const d = new Date(s + (s.length === 10 ? 'T00:00:00' : '')); if (isNaN(d)) return s; return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)
const monthKey = (s) => { const d = new Date(s + (s && s.length === 10 ? 'T00:00:00' : '')); return isNaN(d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const thisMonthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

// ─── per-account computations ───────────────────────────────────────────────
function computeAccount(a) {
  const start = num(a.startingBalance)
  const bal   = num(a.currentBalance)
  const eq    = num(a.currentEquity)
  const pnl   = eq - start
  const profit = pnl > 0 ? pnl : 0
  const loss   = pnl < 0 ? -pnl : 0
  const dailyDDAmt = start * num(a.dailyDDLimit) / 100
  const maxDDAmt   = start * num(a.maxDDLimit)   / 100
  const targetAmt  = start * num(a.profitTarget) / 100
  const dailyUsed     = Math.max(0, bal - eq)            // floating loss vs balance
  const dailyRemaining= dailyDDAmt - dailyUsed
  const dailyUsedPct  = dailyDDAmt > 0 ? clamp(dailyUsed / dailyDDAmt * 100, 0, 999) : 0
  const maxUsed       = Math.max(0, start - eq)          // drawdown from start
  const maxRemaining  = maxDDAmt - maxUsed
  const maxUsedPct    = maxDDAmt > 0 ? clamp(maxUsed / maxDDAmt * 100, 0, 999) : 0
  const gainPct       = start > 0 ? pnl / start * 100 : 0
  const targetProgressPct = num(a.profitTarget) > 0 ? clamp(gainPct / num(a.profitTarget) * 100, 0, 100) : 0
  return { start, bal, eq, pnl, profit, loss, dailyDDAmt, maxDDAmt, targetAmt,
           dailyUsed, dailyRemaining, dailyUsedPct, maxUsed, maxRemaining, maxUsedPct,
           gainPct, targetProgressPct }
}

// ════════════════════════════════════════════════════════════════════════════
//  Small reusable UI primitives
// ════════════════════════════════════════════════════════════════════════════
function Field({ label, children }) {
  return (
    <div>
      <div style={lbl}>{label}</div>
      {children}
    </div>
  )
}

function TextInput(props) {
  return <input {...props} style={{ ...inp, ...(props.style || {}) }}
    onFocus={e => { e.target.style.borderColor = BLUE_LINE; props.onFocus && props.onFocus(e) }}
    onBlur={e => { e.target.style.borderColor = CARD_BORD; props.onBlur && props.onBlur(e) }} />
}

function Select({ value, onChange, options, style }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={onChange} style={{ ...inp, appearance: 'none', WebkitAppearance: 'none', paddingRight: '34px', cursor: 'pointer', ...style }}>
        {options.map(o => <option key={o} value={o} style={{ background: '#0a0f1a' }}>{o}</option>)}
      </select>
      <ChevronDown size={15} color={TEXT_LO} style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  )
}

function Badge({ children, color = BLUE, soft = true }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: '99px',
      background: soft ? `${color}22` : color, color: soft ? color : '#fff',
      border: `1px solid ${color}55`, whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

function StatCard({ label, value, sub, color = TEXT_HI, Icon }) {
  return (
    <div style={{ ...card, padding: '18px 20px', background: CARD_BG2 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={lbl}>{label}</div>
        {Icon && <Icon size={16} color={BLUE} style={{ opacity: 0.8 }} />}
      </div>
      <div style={{ fontSize: '26px', fontWeight: 800, color, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '11.5px', color: TEXT_MD, marginTop: '7px' }}>{sub}</div>}
    </div>
  )
}

function ProgressBar({ pct, color = BLUE, height = 9, track = 'rgba(255,255,255,0.06)' }) {
  return (
    <div style={{ width: '100%', height, background: track, borderRadius: '99px', overflow: 'hidden' }}>
      <div style={{ width: `${clamp(pct, 0, 100)}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width .5s ease', boxShadow: `0 0 10px ${color}66` }} />
    </div>
  )
}

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div onMouseDown={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(2,6,15,0.78)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto',
    }}>
      <div onMouseDown={e => e.stopPropagation()} className="ct-modal" style={{
        width: '100%', maxWidth: wide ? '720px' : '520px', background: '#0a0f1a',
        border: `1px solid ${BLUE_LINE}`, borderRadius: '18px', padding: '24px',
        boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px ${BLUE}11 inset`,
        animation: 'ctPop .22s ease-out both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: TEXT_HI, letterSpacing: '-0.3px' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: TEXT_LO, cursor: 'pointer', padding: '4px', display: 'flex' }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function SectionTitle({ Icon, children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        {Icon && <Icon size={17} color={BLUE} />}
        <h2 style={{ fontSize: '15px', fontWeight: 800, color: TEXT_HI, letterSpacing: '-0.2px' }}>{children}</h2>
      </div>
      {right}
    </div>
  )
}

function EmptyState({ Icon, title, sub }) {
  return (
    <div style={{ ...card, textAlign: 'center', padding: '46px 24px', borderStyle: 'dashed' }}>
      {Icon && <Icon size={30} color={TEXT_LO} style={{ marginBottom: '12px' }} />}
      <div style={{ fontSize: '15px', fontWeight: 700, color: TEXT_MD, marginBottom: '5px' }}>{title}</div>
      {sub && <div style={{ fontSize: '12.5px', color: TEXT_LO }}>{sub}</div>}
    </div>
  )
}

// chart tooltip
const chartTip = (formatter) => ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={{ background: '#0a0f1a', border: `1px solid ${BLUE_LINE}`, borderRadius: '10px', padding: '9px 12px', fontSize: '12px' }}>
      <div style={{ color: TEXT_MD, marginBottom: '3px', fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color || BLUE, fontWeight: 700 }}>{formatter ? formatter(p.value, p) : p.value}</div>)}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 1 — ACCOUNTS
// ════════════════════════════════════════════════════════════════════════════
const blankAccount = () => ({
  id: makeId(), name: '', broker: '', platform: 'MT5', accountType: 'Evaluation',
  startingBalance: '', currentBalance: '', currentEquity: '',
  dailyDDLimit: '5', maxDDLimit: '10', profitTarget: '8', status: 'Active', notes: '',
})

function AccountForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(() => ({ ...blankAccount(), ...initial }))
  const set = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }))
  const submit = () => {
    if (!f.name.trim()) { toast.error('Account name required'); return }
    onSave({ ...f, name: f.name.trim() })
    onClose()
  }
  return (
    <Modal title={initial ? 'Edit Account' : 'Add Account'} onClose={onClose} wide>
      <div className="ct-form-grid">
        <Field label="Account Name"><TextInput value={f.name} onChange={set('name')} placeholder="e.g. FTMO 100K #1" /></Field>
        <Field label="Broker"><TextInput value={f.broker} onChange={set('broker')} placeholder="e.g. FTMO" /></Field>
        <Field label="Platform"><Select value={f.platform} onChange={set('platform')} options={['MT5', 'MT4', 'cTrader', 'Other']} /></Field>
        <Field label="Account Type"><Select value={f.accountType} onChange={set('accountType')} options={['Evaluation', 'Funded', 'Personal']} /></Field>
        <Field label="Starting Balance ($)"><TextInput type="number" value={f.startingBalance} onChange={set('startingBalance')} placeholder="100000" /></Field>
        <Field label="Current Balance ($)"><TextInput type="number" value={f.currentBalance} onChange={set('currentBalance')} placeholder="100000" /></Field>
        <Field label="Current Equity ($)"><TextInput type="number" value={f.currentEquity} onChange={set('currentEquity')} placeholder="100000" /></Field>
        <Field label="Daily Drawdown Limit %"><TextInput type="number" value={f.dailyDDLimit} onChange={set('dailyDDLimit')} placeholder="5" /></Field>
        <Field label="Max Drawdown Limit %"><TextInput type="number" value={f.maxDDLimit} onChange={set('maxDDLimit')} placeholder="10" /></Field>
        <Field label="Profit Target %"><TextInput type="number" value={f.profitTarget} onChange={set('profitTarget')} placeholder="8" /></Field>
        <Field label="Status"><Select value={f.status} onChange={set('status')} options={['Active', 'Inactive']} /></Field>
      </div>
      <div style={{ marginTop: '14px' }}>
        <Field label="Notes"><textarea value={f.notes} onChange={set('notes')} style={ta} placeholder="Rules, broker quirks, reset dates…" /></Field>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button onClick={onClose} style={ghostBtn}>Cancel</button>
        <button onClick={submit} style={blueBtn}><Save size={15} /> Save Account</button>
      </div>
    </Modal>
  )
}

function MiniStat({ label, value, color = TEXT_HI }) {
  return (
    <div style={{ background: '#070b14', border: `1px solid rgba(59,130,246,0.10)`, borderRadius: '11px', padding: '11px 13px' }}>
      <div style={{ fontSize: '9.5px', color: TEXT_LO, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '5px' }}>{label}</div>
      <div style={{ fontSize: '17px', fontWeight: 800, color, letterSpacing: '-0.4px' }}>{value}</div>
    </div>
  )
}

function AccountCard({ a, onEdit, onDelete }) {
  const c = computeAccount(a)
  const active = a.status === 'Active'
  const typeColor = a.accountType === 'Funded' ? GREEN : a.accountType === 'Evaluation' ? BLUE : PURPLE
  return (
    <div style={{ ...card, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: active ? GREEN : RED, boxShadow: `0 0 8px ${active ? GREEN : RED}`, flexShrink: 0 }} />
          <span style={{ fontSize: '16px', fontWeight: 800, color: TEXT_HI, letterSpacing: '-0.3px' }}>{a.name}</span>
          <Badge color={BLUE}>{a.platform}</Badge>
          <Badge color={typeColor}>{a.accountType}</Badge>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={onEdit} title="Edit" style={{ ...ghostBtn, padding: '7px' }}><Pencil size={14} /></button>
          <button onClick={onDelete} title="Delete" style={{ ...ghostBtn, padding: '7px', borderColor: 'rgba(248,113,113,0.3)', color: RED }}><Trash2 size={14} /></button>
        </div>
      </div>
      {a.broker && <div style={{ fontSize: '11.5px', color: TEXT_LO, marginTop: '-8px' }}>{a.broker}</div>}

      {/* stats grid 2x3 */}
      <div className="ct-acct-stats">
        <MiniStat label="Balance" value={usd(c.bal)} />
        <MiniStat label="Equity" value={usd(c.eq)} />
        <MiniStat label="Current Profit" value={usd(c.profit)} color={c.profit > 0 ? GREEN : TEXT_MD} />
        <MiniStat label="Current Loss" value={usd(c.loss)} color={c.loss > 0 ? RED : TEXT_MD} />
        <MiniStat label="Daily DD Remaining" value={usd(c.dailyRemaining)} color={ddColor(c.dailyUsedPct)} />
        <MiniStat label="Max DD Remaining" value={usd(c.maxRemaining)} color={ddColor(c.maxUsedPct)} />
      </div>

      {/* progress bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11.5px' }}>
            <span style={{ color: TEXT_MD, fontWeight: 600 }}>Profit Target</span>
            <span style={{ color: BLUE, fontWeight: 700 }}>{pct1(c.gainPct)} of {pct1(num(a.profitTarget))} target</span>
          </div>
          <ProgressBar pct={c.targetProgressPct} color={BLUE} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11.5px' }}>
            <span style={{ color: TEXT_MD, fontWeight: 600 }}>Daily Drawdown</span>
            <span style={{ color: ddColor(c.dailyUsedPct), fontWeight: 700 }}>{pct1(c.dailyUsedPct)} used</span>
          </div>
          <ProgressBar pct={c.dailyUsedPct} color={ddColor(c.dailyUsedPct)} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11.5px' }}>
            <span style={{ color: TEXT_MD, fontWeight: 600 }}>Max Drawdown</span>
            <span style={{ color: ddColor(c.maxUsedPct), fontWeight: 700 }}>{pct1(c.maxUsedPct)} used</span>
          </div>
          <ProgressBar pct={c.maxUsedPct} color={ddColor(c.maxUsedPct)} />
        </div>
      </div>
      {a.notes && <div style={{ fontSize: '12px', color: TEXT_LO, lineHeight: 1.55, borderTop: `1px solid ${CARD_BORD}`, paddingTop: '12px' }}>{a.notes}</div>}
    </div>
  )
}

function AccountsTab({ accounts, setAccounts }) {
  const [modal, setModal] = useState(null) // null | 'new' | account
  const save = (acct) => {
    setAccounts(prev => {
      const exists = prev.some(p => p.id === acct.id)
      return exists ? prev.map(p => p.id === acct.id ? acct : p) : [acct, ...prev]
    })
    toast.success('Account saved')
  }
  const del = (id) => {
    if (!window.confirm('Delete this account?')) return
    setAccounts(prev => prev.filter(p => p.id !== id))
    toast.success('Account deleted')
  }
  return (
    <div>
      <SectionTitle Icon={Wallet} right={<button onClick={() => setModal('new')} style={blueBtn}><Plus size={15} /> Add Account</button>}>
        Trading Accounts
      </SectionTitle>
      {accounts.length === 0 ? (
        <EmptyState Icon={Wallet} title="No accounts yet" sub="Add your first evaluation, funded or personal account to start tracking." />
      ) : (
        <div className="ct-acct-grid">
          {accounts.map(a => (
            <AccountCard key={a.id} a={a} onEdit={() => setModal(a)} onDelete={() => del(a.id)} />
          ))}
        </div>
      )}
      {modal && <AccountForm initial={modal === 'new' ? null : modal} onSave={save} onClose={() => setModal(null)} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 2 — OVERVIEW
// ════════════════════════════════════════════════════════════════════════════
function OverviewTab({ accounts, overview, setOverview }) {
  const [missionDraft, setMissionDraft] = useState(overview.mission || '')

  const totals = useMemo(() => {
    let cap = 0, funded = 0, evalCap = 0, personalCap = 0, profit = 0
    const breakdown = { Funded: 0, Evaluation: 0, Personal: 0 }
    accounts.forEach(a => {
      const c = computeAccount(a)
      cap += c.bal
      profit += c.pnl
      if (a.accountType === 'Funded') { funded += c.bal; breakdown.Funded += c.bal }
      else if (a.accountType === 'Evaluation') { evalCap += c.bal; breakdown.Evaluation += c.bal }
      else { personalCap += c.bal; breakdown.Personal += c.bal }
    })
    return { cap, funded, evalCap, personalCap, profit, breakdown }
  }, [accounts])

  const donutData = [
    { name: 'Funded', value: totals.breakdown.Funded, color: GREEN },
    { name: 'Evaluation', value: totals.breakdown.Evaluation, color: BLUE },
    { name: 'Personal', value: totals.breakdown.Personal, color: PURPLE },
  ].filter(d => d.value > 0)

  const setOv = (k) => (e) => setOverview(p => ({ ...p, [k]: e.target.value }))
  const saveMission = () => { setOverview(p => ({ ...p, mission: missionDraft })); toast.success('Mission saved') }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Mission statement */}
      <div style={{ ...card, background: `linear-gradient(135deg, ${BLUE_SOFT} 0%, ${CARD_BG} 60%)`, border: `1px solid ${BLUE_LINE}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Crosshair size={16} color={BLUE} />
          <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.18em', color: BLUE, textTransform: 'uppercase' }}>Current Mission</div>
        </div>
        <textarea value={missionDraft} onChange={e => setMissionDraft(e.target.value)} style={{ ...ta, minHeight: '64px', fontSize: '15px', fontWeight: 600, color: TEXT_HI }} placeholder="State your current objective…" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button onClick={saveMission} style={blueBtn}><Save size={15} /> Save</button>
        </div>
      </div>

      {/* 4 big stats */}
      <div className="ct-grid-4">
        <StatCard label="Total Accounts" value={accounts.length} Icon={Layers} />
        <StatCard label="Total Capital" value={usdK(totals.cap)} sub="All accounts" color={BLUE} Icon={Coins} />
        <StatCard label="Funded Capital" value={usdK(totals.funded)} sub="Funded only" color={GREEN} Icon={Building2} />
        <StatCard label="Evaluation Capital" value={usdK(totals.evalCap)} sub="In challenge" color={PURPLE} Icon={Target} />
      </div>

      {/* second row */}
      <div className="ct-grid-4">
        <StatCard label="Total Current Profit" value={usd(totals.profit)} color={totals.profit >= 0 ? GREEN : RED} Icon={TrendingUp} />
        <div style={{ ...card, padding: '18px 20px', background: CARD_BG2 }}>
          <div style={lbl}>Total Open Risk %</div>
          <TextInput type="number" value={overview.openRisk} onChange={setOv('openRisk')} placeholder="0" style={{ marginTop: '4px', fontSize: '22px', fontWeight: 800, padding: '6px 10px' }} />
        </div>
        <div style={{ ...card, padding: '18px 20px', background: CARD_BG2 }}>
          <div style={lbl}>Monthly Profit ($)</div>
          <TextInput type="number" value={overview.monthlyProfit} onChange={setOv('monthlyProfit')} placeholder="0" style={{ marginTop: '4px', fontSize: '22px', fontWeight: 800, padding: '6px 10px' }} />
        </div>
        <div style={{ ...card, padding: '18px 20px', background: CARD_BG2 }}>
          <div style={lbl}>Expected Monthly Payout ($)</div>
          <TextInput type="number" value={overview.expectedPayout} onChange={setOv('expectedPayout')} placeholder="0" style={{ marginTop: '4px', fontSize: '22px', fontWeight: 800, padding: '6px 10px' }} />
        </div>
      </div>

      {/* breakdown + list */}
      <div className="ct-grid-2">
        <div style={card}>
          <SectionTitle Icon={LayoutGrid}>Capital Breakdown</SectionTitle>
          {donutData.length === 0 ? (
            <EmptyState Icon={LayoutGrid} title="No capital to chart" sub="Add accounts with balances." />
          ) : (
            <>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3} stroke="none">
                      {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={chartTip(v => usd(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', flexWrap: 'wrap', marginTop: '6px' }}>
                {donutData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: TEXT_MD }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: d.color }} />
                    {d.name} · <span style={{ color: TEXT_HI, fontWeight: 700 }}>{usdK(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={card}>
          <SectionTitle Icon={Wallet}>Accounts Summary</SectionTitle>
          {accounts.length === 0 ? (
            <EmptyState Icon={Wallet} title="No accounts" sub="Add accounts in the Accounts tab." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '270px', overflowY: 'auto' }}>
              {accounts.map(a => {
                const c = computeAccount(a)
                const tc = a.accountType === 'Funded' ? GREEN : a.accountType === 'Evaluation' ? BLUE : PURPLE
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: '#070b14', border: '1px solid rgba(59,130,246,0.10)', borderRadius: '11px', padding: '11px 13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: a.status === 'Active' ? GREEN : RED, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: TEXT_HI, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                        <div style={{ fontSize: '10.5px', color: tc }}>{a.accountType} · {a.platform}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: TEXT_HI }}>{usdK(c.bal)}</div>
                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: c.pnl >= 0 ? GREEN : RED }}>{c.pnl >= 0 ? '+' : ''}{usdK(c.pnl)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 3 — RISK CONTROL CENTER
// ════════════════════════════════════════════════════════════════════════════
function Warning({ level, text }) {
  const color = level === 'red' ? RED : YELLOW
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      background: `${color}18`, border: `1px solid ${color}66`, borderRadius: '12px',
      padding: '12px 16px', animation: level === 'red' ? 'ctPulse 1.4s ease-in-out infinite' : 'none', color,
    }}>
      <AlertTriangle size={18} />
      <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.02em' }}>{text}</span>
    </div>
  )
}

function RiskTab({ accounts, risk, setRisk }) {
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setRisk(p => ({ ...p, [k]: v }))
  }
  const dailyUsedRatio = num(risk.maxDailyRisk) > 0 ? num(risk.todayDDUsed) / num(risk.maxDailyRisk) * 100 : 0

  // risk distribution: per-account daily risk budget (max $ at risk today)
  const distData = accounts.map(a => {
    const c = computeAccount(a)
    return { name: a.name.length > 12 ? a.name.slice(0, 11) + '…' : a.name, budget: Math.round(c.dailyDDAmt), used: Math.round(c.dailyUsed) }
  })

  const warnings = []
  if (dailyUsedRatio > 75) warnings.push({ level: 'red', text: 'CRITICAL — CLOSE TO DAILY LIMIT' })
  else if (dailyUsedRatio > 50) warnings.push({ level: 'amber', text: 'APPROACHING DAILY LIMIT' })
  // max DD across accounts
  const worstMax = accounts.reduce((m, a) => Math.max(m, computeAccount(a).maxUsedPct), 0)
  if (worstMax > 70) warnings.push({ level: 'red', text: 'MAX DRAWDOWN WARNING' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {warnings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {warnings.map((w, i) => <Warning key={i} level={w.level} text={w.text} />)}
        </div>
      )}

      <div className="ct-grid-2">
        {/* Global settings */}
        <div style={card}>
          <SectionTitle Icon={Shield}>Global Risk Settings</SectionTitle>
          <div className="ct-form-grid">
            <Field label="Max Risk Per Trade %"><TextInput type="number" value={risk.maxRiskPerTrade} onChange={set('maxRiskPerTrade')} placeholder="1" /></Field>
            <Field label="Max Daily Risk %"><TextInput type="number" value={risk.maxDailyRisk} onChange={set('maxDailyRisk')} placeholder="3" /></Field>
            <Field label="Max Concurrent Positions"><TextInput type="number" value={risk.maxConcurrent} onChange={set('maxConcurrent')} placeholder="3" /></Field>
            <Field label="Emergency Stop Drawdown %"><TextInput type="number" value={risk.emergencyStopDD} onChange={set('emergencyStopDD')} placeholder="8" /></Field>
          </div>
        </div>

        {/* Live risk */}
        <div style={card}>
          <SectionTitle Icon={Activity}>Live Risk Display</SectionTitle>
          <div className="ct-form-grid">
            <Field label="Open Positions"><TextInput type="number" value={risk.openPositions} onChange={set('openPositions')} placeholder="0" /></Field>
            <Field label="Risk Exposure %"><TextInput type="number" value={risk.riskExposure} onChange={set('riskExposure')} placeholder="0" /></Field>
            <Field label="Today's Drawdown Used %"><TextInput type="number" value={risk.todayDDUsed} onChange={set('todayDDUsed')} placeholder="0" /></Field>
          </div>
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11.5px' }}>
              <span style={{ color: TEXT_MD, fontWeight: 600 }}>Daily Limit Consumed</span>
              <span style={{ color: ddColor(dailyUsedRatio), fontWeight: 700 }}>{pct1(dailyUsedRatio)}</span>
            </div>
            <ProgressBar pct={dailyUsedRatio} color={ddColor(dailyUsedRatio)} height={11} />
            <div style={{ fontSize: '11px', color: TEXT_LO, marginTop: '6px' }}>
              {num(risk.todayDDUsed)}% of {num(risk.maxDailyRisk) || '—'}% daily risk budget
            </div>
          </div>
          {/* positions check */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', padding: '11px 13px', background: '#070b14', borderRadius: '11px', border: '1px solid rgba(59,130,246,0.10)' }}>
            <span style={{ fontSize: '12.5px', color: TEXT_MD }}>Concurrent positions</span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: num(risk.openPositions) > num(risk.maxConcurrent) ? RED : GREEN }}>
              {num(risk.openPositions)} / {num(risk.maxConcurrent) || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* correlated positions */}
      <div style={card}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '11px', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!risk.correlated} onChange={set('correlated')} style={{ width: '18px', height: '18px', accentColor: BLUE, cursor: 'pointer' }} />
          <span style={{ fontSize: '13.5px', fontWeight: 700, color: TEXT_HI }}>Are you holding correlated positions?</span>
        </label>
        {risk.correlated && (
          <div style={{ marginTop: '12px' }}>
            <Warning level="amber" text="Correlated positions increase true risk exposure" />
          </div>
        )}
      </div>

      {/* risk distribution */}
      <div style={card}>
        <SectionTitle Icon={Gauge}>Risk Distribution Across Accounts</SectionTitle>
        {distData.length === 0 ? (
          <EmptyState Icon={Gauge} title="No accounts to chart" sub="Add accounts to see daily risk budgets." />
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={distData} margin={{ top: 8, right: 8, left: -8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: TEXT_LO, fontSize: 11 }} axisLine={{ stroke: CARD_BORD }} tickLine={false} />
                <YAxis tick={{ fill: TEXT_LO, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => usdK(v)} />
                <Tooltip content={chartTip((v, p) => `${p.name === 'budget' ? 'Daily budget' : 'Used'}: ${usd(v)}`)} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
                <Bar dataKey="budget" name="budget" fill={BLUE_DIM} radius={[6, 6, 0, 0]} />
                <Bar dataKey="used" name="used" fill={BLUE} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div style={{ fontSize: '11px', color: TEXT_LO, marginTop: '6px' }}>Faint bar = daily drawdown budget · solid bar = floating loss in use.</div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 4 — PAYOUT CENTER
// ════════════════════════════════════════════════════════════════════════════
const blankPayout = () => ({ id: makeId(), account: '', amount: '', date: todayKey(), status: 'Requested', notes: '' })
const payoutColor = (s) => s === 'Received' ? GREEN : s === 'Pending' ? YELLOW : BLUE

function PayoutForm({ accounts, onSave, onClose }) {
  const [f, setF] = useState(() => ({ ...blankPayout(), account: accounts[0]?.name || '' }))
  const set = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }))
  const submit = () => {
    if (!f.amount) { toast.error('Amount required'); return }
    onSave({ ...f, amount: num(f.amount) })
    onClose()
  }
  const acctNames = accounts.map(a => a.name)
  return (
    <Modal title="Log Payout" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Field label="Account">
          {acctNames.length > 0
            ? <Select value={f.account} onChange={set('account')} options={acctNames} />
            : <TextInput value={f.account} onChange={set('account')} placeholder="Account name" />}
        </Field>
        <Field label="Payout Amount ($)"><TextInput type="number" value={f.amount} onChange={set('amount')} placeholder="0" /></Field>
        <Field label="Payout Date"><TextInput type="date" value={f.date} onChange={set('date')} className="ct-date" /></Field>
        <Field label="Status"><Select value={f.status} onChange={set('status')} options={['Requested', 'Pending', 'Received']} /></Field>
        <Field label="Notes"><textarea value={f.notes} onChange={set('notes')} style={ta} placeholder="Method, processing time…" /></Field>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button onClick={onClose} style={ghostBtn}>Cancel</button>
        <button onClick={submit} style={blueBtn}><Save size={15} /> Log Payout</button>
      </div>
    </Modal>
  )
}

function PayoutsTab({ accounts, payouts, setPayouts, overview, setOverview }) {
  const [modal, setModal] = useState(false)
  const save = (p) => { setPayouts(prev => [p, ...prev]); toast.success('Payout logged') }
  const del = (id) => { setPayouts(prev => prev.filter(p => p.id !== id)); toast.success('Removed') }

  const sorted = useMemo(() => [...payouts].sort((a, b) => new Date(b.date) - new Date(a.date)), [payouts])
  const received = sorted.filter(p => p.status === 'Received')
  const totalWithdrawn = received.reduce((s, p) => s + num(p.amount), 0)
  const thisMonth = received.filter(p => monthKey(p.date) === thisMonthKey()).reduce((s, p) => s + num(p.amount), 0)
  const last = received[0]

  // monthly average across distinct months with received payouts
  const monthsSet = new Set(received.map(p => monthKey(p.date)).filter(Boolean))
  const monthlyAvg = monthsSet.size > 0 ? totalWithdrawn / monthsSet.size : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SectionTitle Icon={Banknote} right={<button onClick={() => setModal(true)} style={blueBtn}><Plus size={15} /> Log Payout</button>}>
        Payout Center
      </SectionTitle>

      {/* stats */}
      <div className="ct-grid-4">
        <StatCard label="Total Withdrawn" value={usdK(totalWithdrawn)} sub="Lifetime (received)" color={BLUE} Icon={Banknote} />
        <StatCard label="This Month" value={usd(thisMonth)} sub="Received this month" color={GREEN} Icon={Calendar} />
        <StatCard label="Last Payout" value={last ? usd(last.amount) : '—'} sub={last ? fmtDate(last.date) : 'None yet'} Icon={Clock} />
        <div style={{ ...card, padding: '18px 20px', background: CARD_BG2 }}>
          <div style={lbl}>Next Expected</div>
          <TextInput type="number" value={overview.nextPayoutAmt || ''} onChange={e => setOverview(p => ({ ...p, nextPayoutAmt: e.target.value }))} placeholder="Amount $" style={{ fontSize: '16px', fontWeight: 800, padding: '6px 10px', marginBottom: '7px' }} />
          <TextInput type="date" value={overview.nextPayoutDate || ''} onChange={e => setOverview(p => ({ ...p, nextPayoutDate: e.target.value }))} className="ct-date" style={{ fontSize: '12px', padding: '6px 10px' }} />
        </div>
      </div>

      {/* history */}
      <div style={card}>
        <SectionTitle Icon={Layers}>Payout History</SectionTitle>
        {sorted.length === 0 ? (
          <EmptyState Icon={Banknote} title="No payouts logged" sub="Log your first withdrawal to track your income." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: TEXT_LO }}>
                  {['Date', 'Account', 'Amount', 'Status', 'Notes', ''].map((h, i) => (
                    <th key={i} style={{ padding: '8px 10px', fontWeight: 600, fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${CARD_BORD}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
                    <td style={{ padding: '10px', color: TEXT_MD, whiteSpace: 'nowrap' }}>{fmtDate(p.date)}</td>
                    <td style={{ padding: '10px', color: TEXT_HI, fontWeight: 600 }}>{p.account || '—'}</td>
                    <td style={{ padding: '10px', color: TEXT_HI, fontWeight: 800 }}>{usd(p.amount)}</td>
                    <td style={{ padding: '10px' }}><Badge color={payoutColor(p.status)}>{p.status}</Badge></td>
                    <td style={{ padding: '10px', color: TEXT_LO, maxWidth: '220px' }}>{p.notes || '—'}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button onClick={() => del(p.id)} style={{ background: 'transparent', border: 'none', color: TEXT_LO, cursor: 'pointer', padding: '4px' }}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* projections */}
      <div style={card}>
        <SectionTitle Icon={TrendingUp}>Payout Projections</SectionTitle>
        <div className="ct-grid-3">
          <MiniStat label="Monthly Average" value={usd(monthlyAvg)} color={BLUE} />
          <MiniStat label="Quarterly Projection" value={usd(monthlyAvg * 3)} color={GREEN} />
          <MiniStat label="Annual Projection" value={usd(monthlyAvg * 12)} color={GREEN} />
        </div>
        <div style={{ marginTop: '16px', padding: '14px 18px', background: `linear-gradient(90deg, ${BLUE_SOFT}, transparent)`, border: `1px solid ${BLUE_LINE}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Rocket size={18} color={BLUE} />
          <span style={{ fontSize: '13.5px', color: TEXT_HI, fontWeight: 600 }}>
            At current pace you will withdraw <span style={{ ...gradText, fontWeight: 900 }}>{usd(monthlyAvg * 12)}</span> this year.
          </span>
        </div>
      </div>

      {modal && <PayoutForm accounts={accounts} onSave={save} onClose={() => setModal(false)} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 5 — SCALING CENTER
// ════════════════════════════════════════════════════════════════════════════
const MILESTONES = [25000, 50000, 100000, 200000, 500000, 1000000]

function ScalingTab({ accounts, scaling, setScaling }) {
  const fundedAccts = accounts.filter(a => a.accountType === 'Funded')
  const evalAccts   = accounts.filter(a => a.accountType === 'Evaluation')
  const activeEvals = evalAccts.filter(a => a.status === 'Active')
  const totalFunded = fundedAccts.reduce((s, a) => s + computeAccount(a).bal, 0)
  const totalAttempted = fundedAccts.length + evalAccts.length
  const passRate = totalAttempted > 0 ? fundedAccts.length / totalAttempted * 100 : 0

  // milestones
  const reachedIdx = MILESTONES.reduce((acc, m, i) => totalFunded >= m ? i : acc, -1)
  const currentIdx = Math.min(reachedIdx + 1, MILESTONES.length - 1)

  // growth tracker entries
  const entries = (scaling.entries || []).slice().sort((a, b) => (a.month > b.month ? 1 : -1))
  const [newMonth, setNewMonth] = useState(thisMonthKey())
  const [newCap, setNewCap] = useState('')
  const addEntry = () => {
    if (!newMonth || !newCap) { toast.error('Month + capital required'); return }
    setScaling(p => {
      const others = (p.entries || []).filter(e => e.month !== newMonth)
      return { ...p, entries: [...others, { id: makeId(), month: newMonth, capital: num(newCap) }] }
    })
    setNewCap('')
    toast.success('Entry added')
  }
  const delEntry = (id) => setScaling(p => ({ ...p, entries: (p.entries || []).filter(e => e.id !== id) }))

  const chartData = entries.map(e => ({ month: e.month.slice(2), capital: e.capital }))
  const momGrowth = entries.length >= 2
    ? (() => { const a = entries[entries.length - 2].capital, b = entries[entries.length - 1].capital; return a > 0 ? (b - a) / a * 100 : 0 })()
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* funding status */}
      <div className="ct-grid-4">
        <StatCard label="Total Funded Capital" value={usdK(totalFunded)} color={GREEN} Icon={Building2} />
        <StatCard label="Funded Accounts" value={fundedAccts.length} Icon={CheckCircle} />
        <StatCard label="Active Evaluations" value={activeEvals.length} color={BLUE} Icon={Target} />
        <StatCard label="Pass Rate" value={pct1(passRate)} sub={`${fundedAccts.length}/${totalAttempted} attempted`} color={PURPLE} Icon={Award} />
      </div>

      {/* roadmap */}
      <div style={card}>
        <SectionTitle Icon={Rocket}>Scaling Roadmap</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
          {MILESTONES.map((m, i) => {
            const reached = totalFunded >= m
            const isCurrent = i === currentIdx && !reached
            const prev = i === 0 ? 0 : MILESTONES[i - 1]
            const segPct = isCurrent ? clamp((totalFunded - prev) / (m - prev) * 100, 0, 100) : reached ? 100 : 0
            return (
              <div key={m} style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', borderRadius: '13px',
                background: isCurrent ? BLUE_SOFT : '#070b14',
                border: `1px solid ${isCurrent ? BLUE_LINE : reached ? 'rgba(52,211,153,0.3)' : 'rgba(59,130,246,0.10)'}`,
              }}>
                <div style={{ flexShrink: 0 }}>
                  {reached
                    ? <CheckCircle size={22} color={GREEN} />
                    : isCurrent
                      ? <CircleDot size={22} color={BLUE} />
                      : <Lock size={20} color={TEXT_LO} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isCurrent ? '7px' : 0 }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: reached ? GREEN : isCurrent ? BLUE : TEXT_MD }}>{usdK(m)} funded</span>
                    {isCurrent && <span style={{ fontSize: '11.5px', color: BLUE, fontWeight: 700 }}>{usdK(totalFunded)} / {usdK(m)}</span>}
                    {reached && <Badge color={GREEN}>Reached</Badge>}
                  </div>
                  {isCurrent && <ProgressBar pct={segPct} color={BLUE} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* growth tracker */}
      <div style={card}>
        <SectionTitle Icon={TrendingUp} right={
          momGrowth !== 0 ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 800, color: momGrowth >= 0 ? GREEN : RED }}>
              {momGrowth >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />} {pct1(momGrowth)} MoM
            </span>
          ) : null
        }>Capital Growth Tracker</SectionTitle>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px' }}>
          <div style={{ flex: '1 1 140px' }}>
            <div style={lbl}>Month</div>
            <TextInput type="month" value={newMonth} onChange={e => setNewMonth(e.target.value)} className="ct-date" />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <div style={lbl}>Capital ($)</div>
            <TextInput type="number" value={newCap} onChange={e => setNewCap(e.target.value)} placeholder="0" />
          </div>
          <button onClick={addEntry} style={blueBtn}><Plus size={15} /> Add</button>
        </div>

        {chartData.length === 0 ? (
          <EmptyState Icon={TrendingUp} title="No capital history" sub="Add monthly capital entries to plot your growth." />
        ) : (
          <>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 8 }}>
                  <defs>
                    <linearGradient id="ctGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={BLUE} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={BLUE} stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: TEXT_LO, fontSize: 11 }} axisLine={{ stroke: CARD_BORD }} tickLine={false} />
                  <YAxis tick={{ fill: TEXT_LO, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => usdK(v)} />
                  <Tooltip content={chartTip(v => usd(v))} cursor={{ stroke: BLUE_LINE }} />
                  <Line type="monotone" dataKey="capital" stroke="url(#ctGrowth)" strokeWidth={3} dot={{ r: 4, fill: BLUE, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {entries.map(e => (
                <span key={e.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#070b14', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '99px', padding: '5px 10px', fontSize: '11.5px', color: TEXT_MD }}>
                  {e.month} · <span style={{ color: TEXT_HI, fontWeight: 700 }}>{usdK(e.capital)}</span>
                  <button onClick={() => delEntry(e.id)} style={{ background: 'transparent', border: 'none', color: TEXT_LO, cursor: 'pointer', display: 'flex', padding: 0 }}><X size={12} /></button>
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* evaluation pipeline */}
      <div style={card}>
        <SectionTitle Icon={Target}>Evaluation Pipeline</SectionTitle>
        {evalAccts.length === 0 ? (
          <EmptyState Icon={Target} title="No evaluations in progress" sub="Evaluation accounts appear here automatically." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            {evalAccts.map(a => {
              const c = computeAccount(a)
              // pass outlook heuristic: progress + remaining max-DD buffer
              const passProb = clamp(c.targetProgressPct * 0.6 + (100 - c.maxUsedPct) * 0.4, 0, 99)
              const pc = passProb >= 66 ? GREEN : passProb >= 40 ? YELLOW : RED
              return (
                <div key={a.id} style={{ background: '#070b14', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '13px', padding: '15px 17px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: TEXT_HI }}>{a.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: pc }}>
                      <Gauge size={14} /> {Math.round(passProb)}% pass outlook
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11.5px' }}>
                    <span style={{ color: TEXT_MD }}>Progress to {pct1(num(a.profitTarget))} target</span>
                    <span style={{ color: BLUE, fontWeight: 700 }}>{pct1(c.targetProgressPct)}</span>
                  </div>
                  <ProgressBar pct={c.targetProgressPct} color={BLUE} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '9px', fontSize: '11px', color: TEXT_LO }}>
                    <span>Gain: <span style={{ color: c.pnl >= 0 ? GREEN : RED, fontWeight: 700 }}>{usd(c.pnl)}</span></span>
                    <span>Max DD used: <span style={{ color: ddColor(c.maxUsedPct), fontWeight: 700 }}>{pct1(c.maxUsedPct)}</span></span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 6 — MISSION BOARD
// ════════════════════════════════════════════════════════════════════════════
const MISSION_OPTIONS = [
  'Pass Evaluation', 'Protect Funded Account', 'Reach First Payout',
  'Reach $5,000 Total Payout', 'Reach $10,000 Total Payout', 'Reach $50,000 Total Payout',
  'Scale to $500,000 Funding', 'Scale to $1,000,000 Funding', 'Custom',
]

function MissionTab({ mission, setMission }) {
  const set = (k) => (e) => setMission(p => ({ ...p, [k]: e.target.value }))
  const displayMission = mission.primary === 'Custom' ? (mission.custom || 'Custom mission') : mission.primary
  const daysLeft = mission.targetDate ? daysBetween(new Date(), mission.targetDate) : null

  const completeMission = () => {
    if (!displayMission) return
    setMission(p => ({
      ...p,
      history: [{ id: makeId(), title: displayMission, date: todayKey() }, ...(p.history || [])],
      progress: '0',
    }))
    toast.success('Mission logged to Hall of Wins')
  }
  const delHistory = (id) => setMission(p => ({ ...p, history: (p.history || []).filter(h => h.id !== id) }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* primary mission display */}
      <div style={{ ...card, background: `linear-gradient(135deg, ${BLUE_SOFT} 0%, ${CARD_BG} 55%)`, border: `1px solid ${BLUE_LINE}`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-40%', right: '-6%', width: '260px', height: '260px', borderRadius: '50%', background: `radial-gradient(circle, ${BLUE}33 0%, transparent 65%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Flag size={16} color={BLUE} />
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.18em', color: BLUE, textTransform: 'uppercase' }}>Current Primary Mission</div>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: '18px', ...gradText }}>{displayMission}</h1>

          <div className="ct-grid-2" style={{ gap: '14px' }}>
            <Field label="Select Mission">
              <Select value={mission.primary} onChange={set('primary')} options={MISSION_OPTIONS} />
            </Field>
            {mission.primary === 'Custom' && (
              <Field label="Custom Mission"><TextInput value={mission.custom} onChange={set('custom')} placeholder="Define your mission…" /></Field>
            )}
          </div>

          <div style={{ marginTop: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', fontSize: '12px' }}>
              <span style={{ color: TEXT_MD, fontWeight: 600 }}>Progress to Mission</span>
              <span style={{ color: BLUE, fontWeight: 800 }}>{pct1(num(mission.progress))}</span>
            </div>
            <ProgressBar pct={num(mission.progress)} color={BLUE} height={13} />
            <div style={{ marginTop: '12px', maxWidth: '260px' }}>
              <div style={lbl}>Set Progress %</div>
              <TextInput type="number" value={mission.progress} onChange={set('progress')} placeholder="0" />
            </div>
          </div>
        </div>
      </div>

      {/* timeline */}
      <div style={card}>
        <SectionTitle Icon={Calendar}>Mission Timeline</SectionTitle>
        <div className="ct-grid-3">
          <Field label="Start Date"><TextInput type="date" value={mission.startDate} onChange={set('startDate')} className="ct-date" /></Field>
          <Field label="Target Completion"><TextInput type="date" value={mission.targetDate} onChange={set('targetDate')} className="ct-date" /></Field>
          <div>
            <div style={lbl}>Days Remaining</div>
            <div style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'default' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: daysLeft == null ? TEXT_LO : daysLeft < 0 ? RED : daysLeft <= 7 ? YELLOW : GREEN }}>
                {daysLeft == null ? '—' : daysLeft < 0 ? `${Math.abs(daysLeft)} over` : daysLeft}
              </span>
              <Clock size={16} color={TEXT_LO} />
            </div>
          </div>
        </div>
        <div style={{ marginTop: '12px', fontSize: '12px', color: TEXT_LO }}>
          Status: <span style={{ color: num(mission.progress) >= 100 ? GREEN : BLUE, fontWeight: 700 }}>
            {num(mission.progress) >= 100 ? 'Complete' : num(mission.progress) > 0 ? 'In progress' : 'Not started'}
          </span>
        </div>
        <div style={{ marginTop: '14px' }}>
          <button onClick={completeMission} style={{ ...blueBtn, background: GREEN }}><Trophy size={15} /> Mark Complete & Log Win</button>
        </div>
      </div>

      {/* affirmations / rules */}
      <div style={card}>
        <SectionTitle Icon={Zap}>Affirmations & Trading Rules</SectionTitle>
        <textarea value={mission.affirmations} onChange={set('affirmations')} style={{ ...ta, minHeight: '130px' }} placeholder="Your personal trading rules, mindset notes and affirmations…" />
        <div style={{ fontSize: '11px', color: TEXT_LO, marginTop: '8px' }}>Auto-saved.</div>
      </div>

      {/* milestone history */}
      <div style={card}>
        <SectionTitle Icon={Award}>Hall of Wins</SectionTitle>
        {(!mission.history || mission.history.length === 0) ? (
          <EmptyState Icon={Trophy} title="No wins logged yet" sub="Completed missions appear here as trophies." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {mission.history.map(h => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'linear-gradient(90deg, rgba(52,211,153,0.08), transparent)', border: '1px solid rgba(52,211,153,0.22)', borderRadius: '12px', padding: '13px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <Trophy size={18} color={GREEN} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: TEXT_HI }}>{h.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11.5px', color: TEXT_MD }}>{fmtDate(h.date)}</span>
                  <button onClick={() => delHistory(h.id)} style={{ background: 'transparent', border: 'none', color: TEXT_LO, cursor: 'pointer', display: 'flex', padding: '2px' }}><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 7 — COPIER (FUTURE)
// ════════════════════════════════════════════════════════════════════════════
function ComingBadge() {
  return <span style={{ fontSize: '9.5px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: BLUE, background: BLUE_SOFT, border: `1px solid ${BLUE_LINE}`, padding: '3px 9px', borderRadius: '99px' }}>Coming Soon</span>
}

function CopierTab() {
  const COPY_FEATURES = [
    { Icon: ArrowUpRight, label: 'Trade Open Replication' },
    { Icon: TrendingDown, label: 'Trade Close Replication' },
    { Icon: GitBranch, label: 'Partial Close' },
    { Icon: Shield, label: 'Break Even Management' },
    { Icon: Activity, label: 'Trailing Stop Sync' },
    { Icon: Gauge, label: 'Risk Scaling' },
    { Icon: Percent, label: 'Lot Multipliers' },
    { Icon: Layers, label: 'Account Grouping' },
    { Icon: Network, label: 'One-to-Many Replication' },
  ]
  const SYNC = [
    { Icon: RefreshCw, label: 'Synchronization Status', value: 'Waiting for connection' },
    { Icon: Copy, label: 'Trade Replication Status', value: 'Waiting for connection' },
    { Icon: Signal, label: 'Latency', value: '— ms' },
    { Icon: Wifi, label: 'Connection Health', value: '—' },
    { Icon: Zap, label: 'Execution Health', value: '—' },
    { Icon: Shield, label: 'Risk Sync', value: '—' },
  ]
  const disabledBtn = { ...ghostBtn, opacity: 0.45, cursor: 'not-allowed', borderStyle: 'dashed' }
  const disabledInp = { ...inp, opacity: 0.5, cursor: 'not-allowed', background: '#06090f' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* hero */}
      <div style={{ ...card, textAlign: 'center', padding: '34px 24px', background: `radial-gradient(circle at 50% 0%, ${BLUE_SOFT}, ${CARD_BG} 70%)`, border: `1px solid ${BLUE_LINE}`, position: 'relative', overflow: 'hidden' }}>
        <div className="ct-glow" style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 40%, ${BLUE}22 0%, transparent 60%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '18px', background: BLUE_SOFT, border: `1px solid ${BLUE_LINE}`, marginBottom: '14px', boxShadow: `0 0 30px ${BLUE}44` }}>
            <Copy size={28} color={BLUE} />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.8px', marginBottom: '8px', ...gradText }}>Trade Copier Engine</h1>
          <p style={{ fontSize: '13.5px', color: TEXT_MD, maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
            Real-time MT5 trade replication across master &amp; slave accounts. The architecture is wired — the live connection is on the way.
          </p>
          <div style={{ marginTop: '14px' }}><ComingBadge /></div>
        </div>
      </div>

      {/* master + slaves */}
      <div className="ct-grid-2">
        <div style={card}>
          <SectionTitle Icon={Server} right={<ComingBadge />}>Master Account</SectionTitle>
          <div style={{ background: '#070b14', border: '1px dashed rgba(59,130,246,0.25)', borderRadius: '13px', padding: '20px', textAlign: 'center' }}>
            <Radio size={26} color={TEXT_LO} style={{ marginBottom: '10px' }} />
            <div style={{ fontSize: '13px', color: TEXT_MD, marginBottom: '14px' }}>No master account connected</div>
            <button disabled style={disabledBtn}><Link2 size={14} /> Connect Master Account</button>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid rgba(59,130,246,0.10)' }}>
              {['Account', 'Balance', 'Status', 'Health'].map(x => (
                <div key={x} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '9.5px', color: TEXT_LO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{x}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: TEXT_LO }}>—</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={card}>
          <SectionTitle Icon={Network} right={<button disabled style={{ ...disabledBtn, padding: '7px 12px' }}><Plus size={13} /> Add Slave</button>}>Slave Accounts</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#070b14', border: '1px dashed rgba(59,130,246,0.16)', borderRadius: '11px', padding: '12px 14px', opacity: 0.7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '7px', background: BLUE_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: BLUE }}>{i}</span>
                  <span style={{ fontSize: '12.5px', color: TEXT_LO }}>Slave account slot {i}</span>
                </div>
                <Lock size={14} color={TEXT_LO} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* sync status */}
      <div style={card}>
        <SectionTitle Icon={Activity}>Sync Status</SectionTitle>
        <div className="ct-grid-3">
          {SYNC.map(s => (
            <div key={s.label} style={{ background: '#070b14', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '13px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <s.Icon size={15} color={TEXT_LO} />
                <span style={{ fontSize: '11px', color: TEXT_LO, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: TEXT_MD }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* copy engine features */}
      <div style={card}>
        <SectionTitle Icon={Zap}>Copy Engine Features</SectionTitle>
        <div className="ct-feat-grid">
          {COPY_FEATURES.map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '11px', background: '#070b14', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ flexShrink: 0, width: '34px', height: '34px', borderRadius: '9px', background: BLUE_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <f.Icon size={16} color={BLUE} />
              </div>
              <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: TEXT_MD }}>{f.label}</span>
              <Lock size={14} color={TEXT_LO} />
            </div>
          ))}
        </div>
      </div>

      {/* MT5 integration */}
      <div style={card}>
        <SectionTitle Icon={Server} right={<ComingBadge />}>MT5 API Integration</SectionTitle>
        <div className="ct-grid-3">
          <Field label="Server"><input disabled placeholder="broker-server" style={disabledInp} /></Field>
          <Field label="Login"><input disabled placeholder="account login" style={disabledInp} /></Field>
          <Field label="Password"><input disabled type="password" placeholder="••••••••" style={disabledInp} /></Field>
        </div>
        <div style={{ marginTop: '14px' }}>
          <button disabled style={disabledBtn}><Wifi size={14} /> Connect</button>
        </div>
        <div style={{ marginTop: '18px', padding: '13px 16px', background: BLUE_SOFT, border: `1px solid ${BLUE_DIM}`, borderRadius: '12px', fontSize: '12.5px', color: TEXT_MD, lineHeight: 1.6, display: 'flex', gap: '10px' }}>
          <Activity size={16} color={BLUE} style={{ flexShrink: 0, marginTop: '1px' }} />
          This module will connect to MT5 via API for real-time trade copying and account management.
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  ROOT — CopyTraderPage
// ════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'accounts', label: 'Accounts', Icon: Wallet },
  { id: 'overview', label: 'Overview', Icon: LayoutGrid },
  { id: 'risk',     label: 'Risk',     Icon: Shield },
  { id: 'payouts',  label: 'Payouts',  Icon: Banknote },
  { id: 'scaling',  label: 'Scaling',  Icon: TrendingUp },
  { id: 'mission',  label: 'Mission',  Icon: Target },
  { id: 'copier',   label: 'Copier',   Icon: Copy },
]

const defaultOverview = { mission: '', openRisk: '', monthlyProfit: '', expectedPayout: '', nextPayoutAmt: '', nextPayoutDate: '' }
const defaultRisk = { maxRiskPerTrade: '1', maxDailyRisk: '3', maxConcurrent: '3', emergencyStopDD: '8', openPositions: '0', riskExposure: '0', todayDDUsed: '0', correlated: false }
const defaultScaling = { entries: [] }
const defaultMission = { primary: 'Pass Evaluation', custom: '', progress: '0', startDate: '', targetDate: '', affirmations: '', history: [] }

export function CopyTraderPage() {
  const [tab, setTab] = useState('accounts')
  const [accounts, setAccounts] = useState(() => lsGet(ACCOUNTS_KEY, []))
  const [payouts, setPayouts]   = useState(() => lsGet(PAYOUTS_KEY, []))
  const [overview, setOverview] = useState(() => ({ ...defaultOverview, ...lsGet(OVERVIEW_KEY, {}) }))
  const [risk, setRisk]         = useState(() => ({ ...defaultRisk, ...lsGet(RISK_KEY, {}) }))
  const [scaling, setScaling]   = useState(() => ({ ...defaultScaling, ...lsGet(SCALING_KEY, {}) }))
  const [mission, setMission]   = useState(() => ({ ...defaultMission, ...lsGet(MISSION_KEY, {}) }))

  useEffect(() => { lsSet(ACCOUNTS_KEY, accounts) }, [accounts])
  useEffect(() => { lsSet(PAYOUTS_KEY, payouts) }, [payouts])
  useEffect(() => { lsSet(OVERVIEW_KEY, overview) }, [overview])
  useEffect(() => { lsSet(RISK_KEY, risk) }, [risk])
  useEffect(() => { lsSet(SCALING_KEY, scaling) }, [scaling])
  useEffect(() => { lsSet(MISSION_KEY, mission) }, [mission])

  return (
    <div className="page-wrap" style={{ animation: 'ctEnter 0.25s ease-out both', paddingBottom: '60px' }}>
      <style dangerouslySetInnerHTML={{ __html: CT_CSS }} />

      {/* Header */}
      <div style={{
        position: 'relative', overflow: 'hidden', marginBottom: '20px',
        background: `linear-gradient(135deg, ${BLUE_SOFT} 0%, ${CARD_BG} 55%, ${BG} 100%)`,
        border: `1px solid ${BLUE_LINE}`, borderRadius: '18px', padding: '28px 30px',
        boxShadow: `0 0 0 1px ${BLUE}11 inset`,
      }}>
        <div style={{ position: 'absolute', top: '-45%', right: '-8%', width: '300px', height: '300px', borderRadius: '50%', background: `radial-gradient(circle, ${BLUE}44 0%, transparent 65%)`, filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '8px' }}>
            <Copy size={20} color={BLUE} />
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: BLUE, textTransform: 'uppercase' }}>Private Module</div>
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1, marginBottom: '8px', ...gradText }}>Copy Trader</h1>
          <div style={{ fontSize: '13.5px', color: TEXT_MD }}>Multi-account prop-firm command center · accounts, risk, payouts &amp; scaling in one cockpit.</div>
        </div>
      </div>

      {/* Sub-nav pills */}
      <div className="ct-tabs" style={{ display: 'flex', gap: '7px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '4px' }}>
        {TABS.map(t => {
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '99px', whiteSpace: 'nowrap',
              border: `1px solid ${active ? BLUE_LINE : CARD_BORD}`,
              background: active ? BLUE_SOFT : 'transparent',
              color: active ? BLUE : TEXT_MD, fontSize: '13px', fontWeight: active ? 700 : 500,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', flexShrink: 0, minHeight: 0,
            }}>
              <t.Icon size={15} color={active ? BLUE : TEXT_LO} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Pages */}
      <div key={tab} style={{ animation: 'ctEnter 0.22s ease-out both' }}>
        {tab === 'accounts' && <AccountsTab accounts={accounts} setAccounts={setAccounts} />}
        {tab === 'overview' && <OverviewTab accounts={accounts} overview={overview} setOverview={setOverview} />}
        {tab === 'risk'     && <RiskTab accounts={accounts} risk={risk} setRisk={setRisk} />}
        {tab === 'payouts'  && <PayoutsTab accounts={accounts} payouts={payouts} setPayouts={setPayouts} overview={overview} setOverview={setOverview} />}
        {tab === 'scaling'  && <ScalingTab accounts={accounts} scaling={scaling} setScaling={setScaling} />}
        {tab === 'mission'  && <MissionTab mission={mission} setMission={setMission} />}
        {tab === 'copier'   && <CopierTab />}
      </div>
    </div>
  )
}

// ─── scoped CSS ─────────────────────────────────────────────────────────────
const CT_CSS = `
@keyframes ctEnter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ctPop { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes ctPulse { 0%,100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 18px 1px rgba(248,113,113,0.5); } }
@keyframes ctGlow { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
.ct-tabs::-webkit-scrollbar { height: 0; display: none; }
.ct-glow { animation: ctGlow 3s ease-in-out infinite; }
.ct-acct-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; }
.ct-acct-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
.ct-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.ct-feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 11px; }
.ct-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
.ct-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.ct-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.ct-date::-webkit-calendar-picker-indicator { filter: invert(0.5) sepia(1) saturate(8) hue-rotate(190deg); cursor: pointer; }
@media (max-width: 1024px) {
  .ct-feat-grid { grid-template-columns: 1fr 1fr; }
  .ct-grid-4 { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 860px) {
  .ct-grid-2 { grid-template-columns: 1fr; }
  .ct-grid-3 { grid-template-columns: 1fr 1fr; }
  .ct-acct-grid { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .ct-form-grid { grid-template-columns: 1fr; }
  .ct-feat-grid, .ct-grid-3, .ct-grid-4 { grid-template-columns: 1fr; }
  .ct-acct-stats { grid-template-columns: 1fr 1fr; }
}
`

export default CopyTraderPage
