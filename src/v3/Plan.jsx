// Trading plan, new look (owner preview). Same storage as the classic Plan page, so
// nothing is lost when switching views: checklist_items, checklist_<date>, trading_rules.
import React from 'react'
import { Check, Plus, Pencil, Trash2, ArrowUp, ArrowDown, Sparkles, RotateCcw, ShieldCheck, ShieldAlert } from 'lucide-react'
import { useStore } from './store.jsx'
import AppShell from './Shell.jsx'
import { PnL } from './ui.jsx'
import { isoLocal } from './data.js'

const IK = 'checklist_items', RK = 'trading_rules', MAX = 12
const CK = () => `checklist_${new Date().toISOString().slice(0, 10)}`
const DEFAULT_ITEMS = [
  { id: 'bias', label: 'Bias confirmed' }, { id: 'liquidity', label: 'Liquidity identified' }, { id: 'entryModel', label: 'Entry model valid' },
  { id: 'risk', label: 'Risk acceptable' }, { id: 'news', label: 'News/events checked' }, { id: 'emotional', label: 'Emotional state good' },
]
const DEFAULT_RULES = { sessionTime: '', setupModel: '', entryConfirmations: '', riskPerTrade: '', rulesBefore: '', maxTrades: '', dailyLoss: '' }
const load = (k, d) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : d } catch { return d } }
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } return v }
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : 'id_' + Date.now() + Math.random().toString(36).slice(2))

function Ring({ done, total }) {
  const p = total ? done / total : 0, R = 46, C = 2 * Math.PI * R
  return (
    <svg className={'pl-ring' + (p === 1 ? ' full' : '')} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r={R} className="trk" />
      <circle cx="60" cy="60" r={R} className="val" strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
      {Array.from({ length: total }, (_, i) => {
        const a = (i / total) * Math.PI * 2 - Math.PI / 2
        return <circle key={i} cx={60 + Math.cos(a) * 58} cy={60 + Math.sin(a) * 58} r="1.6" className={i < done ? 'tick on' : 'tick'} />
      })}
    </svg>
  )
}

export default function Plan() {
  const { trades, featureFlags = {} } = useStore()
  const [items, setItems] = React.useState(() => { const v = load(IK, null); return Array.isArray(v) && v.every((x) => x && x.id) ? v : DEFAULT_ITEMS })
  const [checks, setChecks] = React.useState(() => load(CK(), {}))
  const [rules, setRules] = React.useState(() => ({ ...DEFAULT_RULES, ...load(RK, {}) }))
  const [edit, setEdit] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [ai, setAi] = React.useState({ busy: false, msg: null })
  const [clearedAt, setClearedAt] = React.useState(() => load(CK() + '_at', null))

  const done = items.filter((it) => checks[it.id]).length
  const all = items.length > 0 && done === items.length
  React.useEffect(() => {
    if (all && !clearedAt) { const t = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); setClearedAt(save(CK() + '_at', t)) }
    if (!all && clearedAt) { setClearedAt(null); try { localStorage.removeItem(CK() + '_at') } catch { /* ignore */ } }
  }, [all, clearedAt])

  const setItemsP = (next) => setItems(save(IK, next))
  const toggle = (id) => { if (!edit) setChecks((c) => save(CK(), { ...c, [id]: !c[id] })) }
  const move = (i, d) => { const n = [...items]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setItemsP(n) }
  const rename = (id, label) => setItemsP(items.map((it) => (it.id === id ? { ...it, label } : it)))
  const remove = (id) => { setItemsP(items.filter((it) => it.id !== id)); setChecks((c) => { const n = { ...c }; delete n[id]; return save(CK(), n) }) }
  const add = () => { if (items.length < MAX) setItemsP([...items, { id: newId(), label: 'New item' }]) }
  const reset = () => setChecks(save(CK(), {}))
  const saveRules = () => { save(RK, rules); setSaved(true); setTimeout(() => setSaved(false), 1800) }
  const generate = async () => {
    const txt = [['Session time', rules.sessionTime], ['Setup / model', rules.setupModel], ['Entry confirmations', rules.entryConfirmations], ['Risk per trade', rules.riskPerTrade], ['Rules before entering', rules.rulesBefore]]
      .filter(([, v]) => v && v.trim()).map(([k, v]) => `${k}: ${v}`).join('\n\n')
    if (!txt) { setAi({ busy: false, msg: { err: true, text: 'Write at least one rule first' } }); return }
    setAi({ busy: true, msg: null })
    try {
      const res = await fetch('/api/generate-checklist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rules: txt }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      const list = (data.items || []).map((label) => ({ id: newId(), label }))
      if (!list.length) throw new Error('No items returned')
      setItemsP(list); reset()
      setAi({ busy: false, msg: { text: 'Checklist rebuilt from your rules' } })
    } catch (e) { setAi({ busy: false, msg: { err: true, text: e.message || 'Could not build it' } }) }
  }

  // guardrails for today
  const today = isoLocal(new Date())
  const tt = trades.filter((t) => t.date === today)
  const net = tt.reduce((s, t) => s + t.pnl, 0)
  const maxT = parseInt(rules.maxTrades, 10) || 0
  const lossL = Math.abs(parseFloat(String(rules.dailyLoss).replace(/[^0-9.]/g, ''))) || 0
  const overT = maxT && tt.length >= maxT, overL = lossL && net <= -lossL
  // discipline: by day, was every trade on plan
  const days = React.useMemo(() => {
    const m = new Map()
    trades.forEach((t) => { if (!m.has(t.date)) m.set(t.date, []); m.get(t.date).push(t) })
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 24).map(([d, ts]) => ({ d, ok: ts.every((t) => t.plan === 'YES'), any: ts.some((t) => t.plan) }))
  }, [trades])
  let streak = 0; for (const d of days) { if (d.ok) streak++; else break }
  const last30 = trades.slice(0, 30).filter((t) => t.plan)
  const kept = last30.length ? Math.round((last30.filter((t) => t.plan === 'YES').length / last30.length) * 100) : null

  const field = (k, label, ph, area) => (
    <label className="pl-field">
      <span className="sk-mono">{label}</span>
      {area
        ? <textarea className="input" rows={3} value={rules[k]} placeholder={ph} onChange={(e) => setRules((r) => ({ ...r, [k]: e.target.value }))} />
        : <input className="input" value={rules[k]} placeholder={ph} onChange={(e) => setRules((r) => ({ ...r, [k]: e.target.value }))} />}
    </label>
  )

  return (
    <AppShell route="plan" word="PLAN" title="Trading plan">
      <div className="wrap col" style={{ gap: 16, paddingBottom: 60 }}>
        <div className="pl-top">
          <section className={'glass pl-check' + (all ? ' cleared' : '')} aria-label="Pre-trade checklist">
            <div className="pl-hero">
              <div className="pl-ringwrap">
                <Ring done={done} total={items.length} />
                <div className="pl-count"><b>{done}</b><span>/{items.length}</span></div>
              </div>
              <div className="col" style={{ gap: 4, minWidth: 0 }}>
                <span className="sk-mono">Pre-trade checklist · resets daily</span>
                <h2>{all ? 'Cleared to trade.' : done ? `${items.length - done} to go.` : 'Run your checklist.'}</h2>
                <span className="muted" style={{ fontSize: 13 }}>{all ? `Every box ticked at ${clearedAt || 'now'}. Trade your plan.` : 'No box, no trade. Tick each one before you click buy or sell.'}</span>
              </div>
              <div className="pl-acts">
                <button type="button" className="sk-ibtn" aria-label="Reset today" title="Reset today" onClick={reset}><RotateCcw size={15} /></button>
                <button type="button" className={'sk-ibtn' + (edit ? ' on' : '')} aria-label="Edit list" aria-pressed={edit} title="Edit list" onClick={() => setEdit((e) => !e)}><Pencil size={15} /></button>
              </div>
            </div>
            <ol className="pl-items">
              {items.map((it, i) => {
                const on = !!checks[it.id]
                return (
                  <li key={it.id} className={on ? 'on' : ''} style={{ '--i': i }}>
                    {edit ? (
                      <div className="pl-edit">
                        <input className="input" value={it.label} onChange={(e) => rename(it.id, e.target.value)} aria-label={`Item ${i + 1}`} />
                        <button type="button" className="sk-ibtn" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={14} /></button>
                        <button type="button" className="sk-ibtn" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === items.length - 1}><ArrowDown size={14} /></button>
                        <button type="button" className="sk-ibtn" aria-label="Delete" onClick={() => remove(it.id)}><Trash2 size={14} /></button>
                      </div>
                    ) : (
                      <button type="button" className="pl-item" aria-pressed={on} onClick={() => toggle(it.id)}>
                        <span className="pl-n">{String(i + 1).padStart(2, '0')}</span>
                        <span className="pl-label">{it.label}</span>
                        <span className="pl-box">{on && <Check size={14} strokeWidth={3} />}</span>
                      </button>
                    )}
                  </li>
                )
              })}
            </ol>
            {edit && items.length < MAX && <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={add}><Plus size={14} /> Add item</button>}
          </section>

          <div className="col" style={{ gap: 16, minWidth: 0 }}>
            <section className={'glass pl-guard' + (overT || overL ? ' stop' : '')} aria-label="Today's guardrails">
              <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                <span className="sk-mono">Today's guardrails</span>
                {overT || overL ? <span className="pl-flag stop"><ShieldAlert size={13} /> Stop for today</span> : <span className="pl-flag"><ShieldCheck size={13} /> Inside your rules</span>}
              </div>
              <div className="pl-gauges">
                <div>
                  <span className="pl-k">Trades</span>
                  <b>{tt.length}<small>{maxT ? ` / ${maxT}` : ''}</small></b>
                  <div className="pl-bar"><i style={{ width: maxT ? `${Math.min(100, (tt.length / maxT) * 100)}%` : '0%' }} className={overT ? 'neg' : ''} /></div>
                </div>
                <div>
                  <span className="pl-k">P&amp;L today</span>
                  <b><PnL v={net} /></b>
                  <div className="pl-bar"><i style={{ width: lossL && net < 0 ? `${Math.min(100, (-net / lossL) * 100)}%` : '0%' }} className="neg" /></div>
                </div>
              </div>
              {!maxT && !lossL && <span className="faint" style={{ fontSize: 12 }}>Set a max trades and a daily loss limit below to switch these on.</span>}
            </section>

            <section className="glass pl-disc" aria-label="Discipline">
              <span className="sk-mono">Discipline</span>
              <div className="row" style={{ gap: 22, alignItems: 'flex-end' }}>
                <div className="col"><b className="pl-big">{kept === null ? '—' : kept + '%'}</b><span className="faint" style={{ fontSize: 12 }}>plan kept, last 30 trades</span></div>
                <div className="col"><b className="pl-big">{streak}</b><span className="faint" style={{ fontSize: 12 }}>day streak on plan</span></div>
              </div>
              <div className="pl-days" aria-label="Last trading days, newest on the right">
                {[...days].reverse().map((d) => <i key={d.d} title={d.d} className={d.ok ? 'ok' : d.any ? 'off' : ''} />)}
              </div>
            </section>
          </div>
        </div>

        <section className="glass pl-rules" aria-label="My rules">
          <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div className="col" style={{ gap: 2 }}><span className="sk-mono">My rules</span><h2>The plan you trade.</h2></div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {featureFlags.aiChecklist !== false && <button type="button" className="btn btn-ghost btn-sm" disabled={ai.busy} onClick={generate}><Sparkles size={14} /> {ai.busy ? 'Building…' : 'Build checklist from rules'}</button>}
              <button type="button" className="btn btn-primary btn-sm" onClick={saveRules}>{saved ? <><Check size={14} /> Saved</> : 'Save rules'}</button>
            </div>
          </div>
          {ai.msg && <span style={{ fontSize: 12.5, color: ai.msg.err ? 'var(--neg)' : 'var(--pos)' }}>{ai.msg.text}</span>}
          <div className="pl-grid">
            {field('sessionTime', 'Session time', 'e.g. 9:30 to 11:30 AM New York')}
            {field('riskPerTrade', 'Risk per trade', 'e.g. 1% of account')}
            {field('maxTrades', 'Max trades per day', 'e.g. 2')}
            {field('dailyLoss', 'Daily loss limit ($)', 'e.g. 500')}
            {field('setupModel', 'Setup / model', 'Your main setup in a few lines', true)}
            {field('entryConfirmations', 'Entry confirmations', 'What must line up before you enter', true)}
            <div style={{ gridColumn: '1 / -1' }}>{field('rulesBefore', 'Non-negotiables', 'The rules you never break', true)}</div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
