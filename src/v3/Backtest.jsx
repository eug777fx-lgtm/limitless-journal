// Asia Model backtest lab. Admin only (route gated in index.jsx, rows gated by RLS).
// Calculator for the night's levels, a session log, and the stats that decide if the model has an edge.
import React from 'react'
import { Calculator, Plus, Trash2, Pencil, Image as ImageIcon, X, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useStore } from './store.jsx'
import { Seg, Modal, CloseBtn } from './ui.jsx'
import { todayISO, dayLabel, fmtR, pct } from './data.js'
import AppShell, { Empty } from './Shell.jsx'
import { MODEL_VERSION, MIN_RR, STOP_BUFFER, RANGE_MIN, RANGE_MAX, narrativeFrom, levels, rr, resultR, backtestStats } from './backtestMath.js'

const TABLE = 'backtest_sessions'
const RESEARCH_DOC = 'https://claude.ai/artifact/M6EtzovPapXfBQF6LFjJmn'
const OUTCOMES = [['win', 'Win'], ['loss', 'Loss'], ['breakeven', 'BE'], ['no_fill', 'No fill'], ['no_trade', 'No trade']]
const GRADES = [['a_plus', 'A+'], ['valid', 'Valid'], ['invalid', 'Invalid'], ['no_trade', 'No trade']]
const ENTRIES = [['limit', 'Limit 0.705'], ['ifvg', '1m IFVG'], ['discretionary', 'Discretionary']]
const YESNO = [[true, 'Yes'], [false, 'No']]
const label = (list, v) => (list.find((x) => x[0] === v) || [null, '—'])[1]
const num = (s) => { const v = Number(String(s ?? '').replace(/[,\s]/g, '')); return s === '' || s === null || s === undefined || Number.isNaN(v) ? null : v }
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`
const str = (v) => (v === null || v === undefined ? '' : String(v))
const missingTable = (e) => e && (e.code === '42P01' || e.code === 'PGRST205' || /backtest_sessions/.test(e.message || ''))

const blank = (seed = {}) => ({
  session_date: todayISO(), mode: 'backtest', range_high: '', range_low: '', close_price: '', narrative: '', direction: '',
  liquidity_ok: null, fvg_at_ote: null, smt: null, entry_type: 'limit', grade: '', entry: '', stop: '', target: '',
  outcome: '', result_override: '', mfe_r: '', followed_rules: null, discretion_note: '', notes: '', ...seed,
})
const fromRow = (r) => blank({
  session_date: r.session_date, mode: r.mode, narrative: r.narrative || '', direction: r.direction || '',
  range_high: str(r.range_high), range_low: str(r.range_low), close_price: str(r.close_price),
  liquidity_ok: r.liquidity_ok, fvg_at_ote: r.fvg_at_ote, smt: r.smt, entry_type: r.entry_type || 'limit', grade: r.grade || '',
  entry: str(r.entry), stop: str(r.stop), target: str(r.target), outcome: r.outcome || '', mfe_r: str(r.mfe_r),
  followed_rules: r.followed_rules, discretion_note: r.discretion_note || '', notes: r.notes || '',
})

function Chips({ options, value, onChange, label: lab }) {
  return (
    <div className="col" style={{ gap: 8 }}>
      <span className="faint" style={{ fontSize: 12.5 }}>{lab}</span>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {options.map(([v, l]) => (
          <button key={String(v)} type="button" className="chip" aria-pressed={value === v}
            onClick={() => onChange(value === v ? (typeof v === 'boolean' ? null : '') : v)}>{l}</button>
        ))}
      </div>
    </div>
  )
}

function Tile({ k, v, sub }) {
  return (
    <div className="glass col" style={{ padding: '18px 20px', gap: 4 }}>
      <span className="eyebrow">{k}</span>
      <span className="big num" style={{ fontSize: 22, fontWeight: 600 }}>{v}</span>
      {sub && <span className="faint" style={{ fontSize: 12 }}>{sub}</span>}
    </div>
  )
}

// Cumulative R line. One series, a zero line, the last value labelled.
function RCurve({ points }) {
  if (points.length < 2) return <span className="muted" style={{ fontSize: 13 }}>The curve appears after two filled trades.</span>
  const W = 1000, H = 220, pad = 24
  const vals = points.map((p) => p.value)
  const max = Math.max(0, ...vals), min = Math.min(0, ...vals)
  const span = max - min || 1
  const x = (i) => pad + (i / (points.length - 1)) * (W - pad * 2)
  const y = (v) => pad + (1 - (v - min) / span) * (H - pad * 2)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }} role="img"
      aria-label={`Cumulative result ${fmtR(last.value, 1)} over ${points.length} trades`}>
      <line x1={pad} x2={W - pad} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,.18)" />
      <path d={d} fill="none" stroke="#FFF" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(last.value)} r="6" fill="#000" stroke="#FFF" strokeWidth="3" />
      <text x={x(points.length - 1) - 10} y={y(last.value) - 14} textAnchor="end" fill="#FFF" style={{ font: '600 15px Inter, sans-serif' }}>{fmtR(last.value, 1)}</text>
    </svg>
  )
}

function SplitTable({ title, rows }) {
  const shown = rows.filter((r) => r.fills)
  return (
    <section className="glass panel" style={{ gap: 8 }}>
      <h2 style={{ fontSize: 17, fontWeight: 600 }}>{title}</h2>
      {!shown.length && <span className="muted" style={{ fontSize: 13 }}>No filled trades yet.</span>}
      {shown.map((r) => (
        <div key={r.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) repeat(3, minmax(0,1fr))', gap: 10, padding: '8px 2px', borderTop: '1px solid var(--line)', fontSize: 13.5 }}>
          <span>{r.label}<span className="faint num" style={{ fontSize: 11.5 }}> · {r.fills}</span></span>
          <span className="num">{r.winRate === null ? '—' : pct(r.winRate)}</span>
          <span className="num">{fmtR(r.expectancy)}</span>
          <span className="num">{fmtR(r.totalR, 1)}</span>
        </div>
      ))}
      {shown.length > 0 && <span className="faint" style={{ fontSize: 11.5 }}>Trades · win rate · avg R per trade · total R</span>}
    </section>
  )
}

function CalcPanel({ onLog }) {
  const [c, setC] = React.useState({ high: '', low: '', close: '', target: '' })
  const set = (k) => (e) => setC((s) => ({ ...s, [k]: e.target.value }))
  const nar = narrativeFrom(c.high, c.low, c.close)
  const dir = nar.narrative === 'bearish' ? 'short' : nar.narrative === 'bullish' ? 'long' : null
  const lv = dir ? levels(c.high, c.low, dir) : null
  const R = lv ? rr(lv.entry, lv.stop, c.target, dir) : null
  const checks = [
    [`Range ${RANGE_MIN} to ${RANGE_MAX} points`, lv ? lv.rangeOk : null],
    ['Narrative is bullish or bearish', nar.narrative ? nar.narrative !== 'none' : null],
    [`Target gives ${MIN_RR}R or more`, R === null ? null : R >= MIN_RR],
  ]
  const ready = checks.every(([, ok]) => ok === true)
  return (
    <section className="glass panel" aria-label="Level calculator" style={{ gap: 14, padding: 24 }}>
      <div className="row" style={{ gap: 10 }}>
        <Calculator size={18} />
        <div className="col" style={{ gap: 2 }}>
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Tonight's levels</h2>
          <span className="muted" style={{ fontSize: 12.5 }}>NY session high and low from 9:30 to 4:00, plus the 4:00 PM close</span>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        <label className="field"><span>NY high</span><input className="input num" inputMode="decimal" value={c.high} onChange={set('high')} placeholder="28861" /></label>
        <label className="field"><span>NY low</span><input className="input num" inputMode="decimal" value={c.low} onChange={set('low')} placeholder="28614" /></label>
        <label className="field"><span>4 PM close</span><input className="input num" inputMode="decimal" value={c.close} onChange={set('close')} placeholder="28640" /></label>
        <label className="field"><span>Target</span><input className="input num" inputMode="decimal" value={c.target} onChange={set('target')} placeholder="FVG or swing" /></label>
      </div>
      {nar.narrative && (
        <div className="col" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className={nar.narrative === 'none' ? 'tag tag-soft' : 'tag tag-solid'}>
              {nar.narrative === 'none' ? 'No narrative · no trade' : nar.narrative === 'bearish' ? 'Bearish · shorts only' : 'Bullish · longs only'}
            </span>
            <span className="faint num" style={{ fontSize: 12 }}>close at {nar.position} of range</span>
          </div>
          {lv && (
            <div className="grid g4 m2" style={{ gap: 8 }}>
              {[['0.5', lv.eq], ['Entry 0.705', lv.entry], ['0.79', lv.deep], [`Stop (+${STOP_BUFFER})`, lv.stop]].map(([k, v]) => (
                <div key={k} className="well col" style={{ padding: '10px 12px', borderRadius: 14, gap: 2 }}>
                  <span className="faint" style={{ fontSize: 11.5 }}>{k}</span>
                  <span className="num" style={{ fontWeight: 600 }}>{v.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="col" style={{ gap: 6 }}>
            {checks.map(([t, ok]) => (
              <span key={t} className="row" style={{ gap: 8, fontSize: 13 }}>
                <span className={ok ? 'check' : 'check off'} style={{ width: 18, height: 18, fontSize: 10 }}>{ok ? '✓' : ''}</span>
                <span className={ok === false ? 'neg' : ''}>{t}{t.startsWith('Target') && R !== null ? ` (now ${R}R)` : ''}</span>
              </span>
            ))}
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary btn-sm"
              onClick={() => onLog(blank({
                range_high: c.high, range_low: c.low, close_price: c.close, narrative: nar.narrative, direction: dir || '',
                entry: lv ? str(lv.entry) : '', stop: lv ? str(lv.stop) : '', target: c.target,
                grade: ready ? '' : 'no_trade', outcome: ready ? '' : 'no_trade',
              }))}>
              <Plus size={14} /> {ready ? 'Log this session' : 'Log as no trade'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function SessionForm({ draft, onClose, onSaved }) {
  const { notify, uploadImages, user } = useStore()
  // Mounted fresh for every open (keyed by the parent), so state starts from the draft.
  const editing = !!draft.id
  const [f, setF] = React.useState(() => (editing ? fromRow(draft) : blank(draft)))
  const [keep, setKeep] = React.useState(() => (editing ? draft.shots || [] : []))
  const [files, setFiles] = React.useState([])
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState('')
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v && v.target ? v.target.value : v }))
  const fillLevels = () => {
    const nar = narrativeFrom(f.range_high, f.range_low, f.close_price)
    const dir = f.direction || (nar.narrative === 'bearish' ? 'short' : nar.narrative === 'bullish' ? 'long' : '')
    const lv = dir ? levels(f.range_high, f.range_low, dir) : null
    setF((s) => ({ ...s, narrative: nar.narrative || s.narrative, direction: dir, entry: lv ? str(lv.entry) : s.entry, stop: lv ? str(lv.stop) : s.stop }))
  }
  const planned = rr(f.entry, f.stop, f.target, f.direction)
  const autoR = resultR(f.outcome, planned)
  const finalR = num(f.result_override) !== null ? num(f.result_override) : autoR
  const traded = ['win', 'loss', 'breakeven'].includes(f.outcome)

  const save = async () => {
    if (!f.session_date) return setErr('Pick the session date.')
    if (!f.outcome) return setErr('Pick the outcome, including "No trade" or "No fill".')
    if (traded && (!f.direction || finalR === null)) return setErr('A filled trade needs a direction, and either entry, stop and target, or a result in R.')
    setErr(''); setBusy(true)
    let urls = [...keep]
    if (files.length) {
      try { urls = urls.concat(await uploadImages(files.map((x) => x.file), user.id)) }
      catch (e) { notify(`Screenshot upload failed: ${e.message}. The session saves without it.`, 'err') }
    }
    const row = {
      session_date: f.session_date, model_version: MODEL_VERSION, instrument: 'NQ', mode: f.mode,
      range_high: num(f.range_high), range_low: num(f.range_low), close_price: num(f.close_price),
      narrative: f.narrative || null, liquidity_ok: f.liquidity_ok, fvg_at_ote: f.fvg_at_ote, smt: f.smt,
      direction: f.direction || null, entry_type: f.entry_type || 'limit', grade: f.grade || null,
      entry: num(f.entry), stop: num(f.stop), target: num(f.target),
      outcome: f.outcome, result_r: traded ? finalR : null, mfe_r: traded ? num(f.mfe_r) : null,
      followed_rules: f.followed_rules, discretion_note: f.discretion_note.trim() || null, notes: f.notes.trim() || null, shots: urls,
    }
    const q = editing ? supabase.from(TABLE).update(row).eq('id', draft.id) : supabase.from(TABLE).insert(row)
    const { data, error } = await q.select().single()
    setBusy(false)
    if (error) return setErr(error.message)
    files.forEach((x) => URL.revokeObjectURL(x.url))
    notify(editing ? 'Session updated' : 'Session logged')
    onSaved(data, editing)
  }

  const thumb = { width: 88, height: 60, objectFit: 'cover', borderRadius: 10 }
  const xBtn = { position: 'absolute', top: -8, right: -8, width: 24, height: 24, minHeight: 24 }

  return (
    <Modal open onClose={onClose} label={editing ? 'Edit session' : 'Log session'}>
      <div className="col" style={{ gap: 18 }}>
        <div className="row" style={{ gap: 12 }}>
          <div className="col" style={{ flex: 1, gap: 2 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600 }}>{editing ? 'Edit session' : 'Log Asia session'}</h2>
            <span className="muted" style={{ fontSize: 13 }}>Log every night, including no trade and no fill. Skipped nights bias the stats.</span>
          </div>
          <CloseBtn onClick={onClose} />
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, alignItems: 'end' }}>
          <label className="field"><span>Session date</span><input className="input num" type="date" value={f.session_date} onChange={set('session_date')} /></label>
          <div className="col" style={{ gap: 8 }}>
            <span className="faint" style={{ fontSize: 12.5 }}>Mode</span>
            <Seg options={[{ value: 'backtest', label: 'Replay' }, { value: 'forward', label: 'Sim' }, { value: 'live', label: 'Live' }]} value={f.mode} onChange={set('mode')} label="Mode" className="seg-full" style={{ display: 'flex' }} />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, alignItems: 'end' }}>
          <label className="field"><span>NY high</span><input className="input num" inputMode="decimal" value={f.range_high} onChange={set('range_high')} /></label>
          <label className="field"><span>NY low</span><input className="input num" inputMode="decimal" value={f.range_low} onChange={set('range_low')} /></label>
          <label className="field"><span>4 PM close</span><input className="input num" inputMode="decimal" value={f.close_price} onChange={set('close_price')} /></label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={fillLevels} style={{ minHeight: 44 }}><Calculator size={14} /> Fill levels</button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <Chips label="Narrative" options={[['bullish', 'Bullish'], ['bearish', 'Bearish'], ['none', 'None']]} value={f.narrative} onChange={set('narrative')} />
          <Chips label="Direction" options={[['long', 'Long'], ['short', 'Short']]} value={f.direction} onChange={set('direction')} />
          <Chips label="Untouched liquidity in that direction" options={YESNO} value={f.liquidity_ok} onChange={set('liquidity_ok')} />
          <Chips label="5m or 15m FVG at 0.705 to 0.79" options={YESNO} value={f.fvg_at_ote} onChange={set('fvg_at_ote')} />
          <Chips label="ES SMT" options={YESNO} value={f.smt} onChange={set('smt')} />
          <Chips label="Entry type" options={ENTRIES} value={f.entry_type} onChange={set('entry_type')} />
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
          <label className="field"><span>Entry</span><input className="input num" inputMode="decimal" value={f.entry} onChange={set('entry')} /></label>
          <label className="field"><span>Stop</span><input className="input num" inputMode="decimal" value={f.stop} onChange={set('stop')} /></label>
          <label className="field"><span>Target</span><input className="input num" inputMode="decimal" value={f.target} onChange={set('target')} /></label>
          <div className="col" style={{ gap: 8 }}>
            <span className="faint" style={{ fontSize: 12.5 }}>Planned R:R</span>
            <span className={'num display ' + (planned !== null && planned < MIN_RR ? 'neg' : '')} style={{ fontSize: 20, fontWeight: 600, minHeight: 44, display: 'flex', alignItems: 'center' }}>{planned === null ? '—' : planned + 'R'}</span>
          </div>
        </div>

        <Chips label="Grade (decide before you look at the result)" options={GRADES} value={f.grade} onChange={set('grade')} />
        <Chips label="Outcome" options={OUTCOMES} value={f.outcome} onChange={set('outcome')} />

        {traded && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <label className="field"><span>Result R {autoR !== null ? `(auto ${fmtR(autoR)})` : ''}</span><input className="input num" inputMode="decimal" placeholder="only if you exited early" value={f.result_override} onChange={set('result_override')} /></label>
            <label className="field"><span>Max move in your favor (R)</span><input className="input num" inputMode="decimal" placeholder="e.g. 5.2" value={f.mfe_r} onChange={set('mfe_r')} /></label>
          </div>
        )}

        <Chips label="Followed every rule?" options={YESNO} value={f.followed_rules} onChange={set('followed_rules')} />
        <label className="field"><span>Discretion: why this read, in one sentence (written before the result)</span><input className="input" value={f.discretion_note} onChange={set('discretion_note')} /></label>
        <label className="field"><span>Notes</span><textarea className="input" rows={3} value={f.notes} onChange={set('notes')} style={{ resize: 'vertical', paddingTop: 12 }} /></label>

        <div className="col" style={{ gap: 8 }}>
          <span className="faint" style={{ fontSize: 12.5 }}>Screenshots: before the order, then after (up to 4)</span>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {keep.map((u) => (
              <span key={u} style={{ position: 'relative' }}>
                <img src={u} alt="" style={thumb} />
                <button type="button" className="icon-btn" aria-label="Remove screenshot" onClick={() => setKeep((k) => k.filter((x) => x !== u))} style={xBtn}><X size={12} /></button>
              </span>
            ))}
            {files.map((x) => (
              <span key={x.url} style={{ position: 'relative' }}>
                <img src={x.url} alt="" style={thumb} />
                <button type="button" className="icon-btn" aria-label="Remove screenshot" onClick={() => setFiles((cur) => cur.filter((y) => y.url !== x.url))} style={xBtn}><X size={12} /></button>
              </span>
            ))}
            {keep.length + files.length < 4 && (
              <label className="chip row" style={{ gap: 6, cursor: 'pointer' }}><ImageIcon size={14} /> Add
                <input type="file" accept="image/*" multiple hidden onChange={(e) => {
                  const imgs = Array.from(e.target.files || []).filter((x) => x.type.startsWith('image/')).slice(0, 4 - keep.length - files.length)
                  setFiles((cur) => [...cur, ...imgs.map((file) => ({ file, url: URL.createObjectURL(file) }))])
                  e.target.value = ''
                }} />
              </label>
            )}
          </div>
        </div>

        {err && <span className="neg" style={{ fontSize: 13 }}>{err}</span>}
        <div className="row" style={{ gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Log session'}</button>
        </div>
      </div>
    </Modal>
  )
}

const MODEL_RULES = [
  ['Range', 'NY session high and low, 9:30 AM to 4:00 PM. Extend it if price leaves it before 8:00 PM.'],
  ['Narrative', '4:00 PM close below 0.4 of the range: shorts only. Above 0.6: longs only. In between: no trade.'],
  ['Liquidity', 'An untouched NY, London or previous day level, or an unfilled 15m FVG, must sit in the narrative direction.'],
  ['Entry', 'Limit at 0.705. A+ when a 5m FVG (8+ points) or 15m FVG (12+ points) overlaps 0.705 to 0.79.'],
  ['Stop', `0.79 + ${STOP_BUFFER} points.`],
  ['Target', `First unfilled 15m FVG or internal swing body giving ${MIN_RR}R or more. Otherwise no trade.`],
  ['Timing', 'Place the order 7:30 to 7:50 PM or after 8:10 PM New York time. Never 7:50 to 8:10. Cancel at 10:00 PM.'],
  ['Risk', '$200 per trade on a 50K eval, $300 after +$1,000. One trade a night. A loss ends the night.'],
  ['No trade', `Range under ${RANGE_MIN} or over ${RANGE_MAX} points, price already through 0.79, Sunday reopen, US holiday, red folder news 8 to 10 PM.`],
]

const byDateDesc = (a, b) => (b.session_date + (b.created_at || '')).localeCompare(a.session_date + (a.created_at || ''))

export default function Backtest() {
  const { notify } = useStore()
  const [rows, setRows] = React.useState([])
  const [state, setState] = React.useState('loading') // loading | ready | missing | error
  const [errMsg, setErrMsg] = React.useState('')
  const [tab, setTab] = React.useState('Log')
  const [draft, setDraftState] = React.useState(null)
  const [opens, setOpens] = React.useState(0)
  const setDraft = React.useCallback((d) => { if (d) setOpens((k) => k + 1); setDraftState(d) }, [])
  const [confirmId, setConfirmId] = React.useState(null)

  React.useEffect(() => {
    let live = true
    supabase.from(TABLE).select('*').order('session_date', { ascending: false }).then(({ data, error }) => {
      if (!live) return
      if (error) { setState(missingTable(error) ? 'missing' : 'error'); setErrMsg(error.message); return }
      setRows((data || []).sort(byDateDesc)); setState('ready')
    })
    return () => { live = false }
  }, [])

  const stats = React.useMemo(() => backtestStats(rows), [rows])
  const onSaved = (row, wasEdit) => {
    setRows((cur) => (wasEdit ? cur.map((r) => (r.id === row.id ? row : r)) : [row, ...cur]).sort(byDateDesc))
    setDraft(null)
  }
  const remove = async (id) => {
    if (confirmId !== id) { setConfirmId(id); setTimeout(() => setConfirmId((c) => (c === id ? null : c)), 4000); return }
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) return notify(error.message, 'err')
    setRows((cur) => cur.filter((r) => r.id !== id)); setConfirmId(null); notify('Session deleted')
  }

  return (
    <AppShell route="backtest" word="ASIA" title="Asia backtest">
      <div className="wrap col" style={{ gap: 18, paddingBottom: 60 }}>
        {state === 'loading' && <span className="muted">Loading sessions…</span>}
        {state === 'missing' && <Empty title="One setup step left." body="The backtest table isn't in the database yet. Run supabase/migrations/20261030120000_backtest_sessions.sql in the Supabase SQL editor, then reload this page." />}
        {state === 'error' && <Empty title="Couldn't load sessions." body={errMsg} />}
        {state === 'ready' && (
          <>
            <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
              <span className="muted" style={{ flex: 1, minWidth: 220, fontSize: 13 }}>Asia Model {MODEL_VERSION.replace('asia-', '')} · limit at 0.705 of the NY range, with the narrative. Admins only.</span>
              <Seg options={['Log', 'Stats', 'Model']} value={tab} onChange={setTab} label="Section" />
              <button type="button" className="btn btn-primary" onClick={() => setDraft(blank())}><Plus size={15} /> Log session</button>
            </div>

            <div className="grid g4 m2">
              <Tile k="Sessions" v={stats.sessions} sub={`${stats.fills} filled · ${stats.noTrade} no trade · ${stats.noFill} no fill`} />
              <Tile k="Win rate" v={stats.winRate === null ? '—' : pct(stats.winRate)} sub={`${plural(stats.wins, 'win')} · ${plural(stats.losses, 'loss').replace('losss', 'losses')}`} />
              <Tile k="Expectancy" v={fmtR(stats.expectancy)} sub="per filled trade" />
              <Tile k="Total" v={fmtR(stats.totalR, 1)} sub={`worst run: ${plural(stats.maxLossStreak, 'loss').replace('losss', 'losses')}`} />
            </div>
            {stats.fills < 30 && <span className="faint" style={{ fontSize: 12.5 }}>{stats.fills} of 30 filled trades. Treat these numbers as a guess until 30.</span>}

            {tab === 'Log' && (
              <>
                <CalcPanel onLog={setDraft} />
                {!rows.length && <Empty title="No sessions yet." body="Replay a past Asia session, fill the levels above, and log it. Log nights with no trade too." />}
                {rows.length > 0 && (
                  <section className="glass panel" aria-label="Sessions" style={{ gap: 0, padding: '10px 18px' }}>
                    {rows.map((r) => (
                      <div key={r.id} className="row" style={{ gap: 12, minHeight: 60, borderTop: '1px solid var(--line)', flexWrap: 'wrap', padding: '8px 0' }}>
                        <span className="col" style={{ flex: 1, minWidth: 140 }}>
                          <span style={{ fontWeight: 600 }}>{dayLabel(r.session_date, true)}</span>
                          <span className="faint" style={{ fontSize: 12 }}>{[r.narrative, r.direction, r.fvg_at_ote ? 'FVG' : null, r.mode !== 'backtest' ? r.mode : null].filter(Boolean).join(' · ') || '—'}</span>
                        </span>
                        {r.grade && !(r.grade === 'no_trade' && r.outcome === 'no_trade') && <span className={r.grade === 'a_plus' ? 'tag tag-solid' : 'tag tag-soft'}>{label(GRADES, r.grade)}</span>}
                        <span className="tag tag-soft">{label(OUTCOMES, r.outcome)}</span>
                        <span className={'num ' + (r.result_r > 0 ? 'pos' : r.result_r < 0 ? 'neg' : 'faint')} style={{ width: 64, textAlign: 'right', fontWeight: 600 }}>{r.result_r === null ? '—' : fmtR(Number(r.result_r), 1)}</span>
                        <button type="button" className="icon-btn well" aria-label="Edit session" onClick={() => setDraft(r)}><Pencil size={14} /></button>
                        <button type="button" className={confirmId === r.id ? 'btn btn-sm' : 'icon-btn well'} aria-label="Delete session" onClick={() => remove(r.id)}
                          style={confirmId === r.id ? { background: 'rgba(255,169,161,.2)', color: 'var(--neg)' } : undefined}>
                          {confirmId === r.id ? 'Tap again to delete' : <Trash2 size={14} />}
                        </button>
                      </div>
                    ))}
                  </section>
                )}
              </>
            )}

            {tab === 'Stats' && (
              <>
                <section className="glass panel" style={{ padding: 24, gap: 10 }}>
                  <h2 style={{ fontSize: 19, fontWeight: 600 }}>Cumulative R</h2>
                  <RCurve points={stats.curve} />
                </section>
                <div className="grid g4 m2">
                  <Tile k="Profit factor" v={stats.profitFactor === null ? '—' : stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)} />
                  <Tile k="Avg win / loss" v={`${fmtR(stats.avgWin, 1)} / ${fmtR(stats.avgLoss, 1)}`} />
                  <Tile k="Max drawdown" v={stats.maxDD ? '−' + stats.maxDD.toFixed(1) + 'R' : '0R'} sub="peak to trough" />
                  <Tile k="Rules followed" v={stats.ruleRate === null ? '—' : pct(stats.ruleRate)} sub="goal 90% or more" />
                  <Tile k="Reached 4R" v={stats.reached4R === null ? '—' : pct(stats.reached4R)} sub={`of ${stats.mfeSample} fills with max move logged`} />
                  <Tile k="Best run" v={plural(stats.maxWinStreak, 'win')} />
                </div>
                <div className="grid g2">
                  <SplitTable title="FVG at OTE vs none" rows={stats.byFvg} />
                  <SplitTable title="Entry type" rows={stats.byEntry} />
                  <SplitTable title="Grade" rows={stats.byGrade} />
                  <SplitTable title="Long vs short" rows={stats.bySide} />
                </div>
              </>
            )}

            {tab === 'Model' && (
              <section className="glass panel" style={{ padding: 24, gap: 4 }}>
                <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <h2 style={{ fontSize: 19, fontWeight: 600, flex: 1 }}>Rules, {MODEL_VERSION}</h2>
                  <a className="btn btn-ghost btn-sm" href={RESEARCH_DOC} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Research doc</a>
                </div>
                {MODEL_RULES.map(([k, v]) => (
                  <div key={k} style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr)', gap: 12, padding: '10px 0', borderTop: '1px solid var(--line)', fontSize: 13.5, lineHeight: 1.55 }}>
                    <span className="faint">{k}</span><span>{v}</span>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
      {draft && <SessionForm key={opens} draft={draft} onClose={() => setDraft(null)} onSaved={onSaved} />}
    </AppShell>
  )
}
