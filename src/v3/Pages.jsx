import React from 'react'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { useStore } from './store.jsx'
import { PnL, Seg } from './ui.jsx'
import { dayLabel, monthLabel, shiftMonth, isoLocal } from './data.js'
import AppShell, { Empty } from './Shell.jsx'
import { MonthCalendar, TradeRow } from './Dashboard.jsx'

export function Calendar() {
  const { stats, trades } = useStore()
  const [ym, setYm] = React.useState(stats.thisMonth)
  const [day, setDay] = React.useState(stats.today)
  const list = trades.filter((t) => t.date === day)
  const net = list.reduce((s, t) => s + t.pnl, 0)
  const mDays = stats.days.filter((d) => d.startsWith(ym))
  const mNet = mDays.reduce((s, d) => s + stats.byDay[d], 0)
  const green = mDays.filter((d) => stats.byDay[d] > 0).length
  const red = mDays.filter((d) => stats.byDay[d] < 0).length
  return (
    <AppShell route="calendar" word="CALENDAR" title="Calendar">
      <div className="wrap col" style={{ gap: 18, paddingBottom: 60 }}>
        <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <section className="glass panel" style={{ flex: '999 1 560px', padding: 26 }} aria-label={monthLabel(ym)}>
            <div className="panel-head">
              <button type="button" className="icon-btn well" aria-label="Previous month" onClick={() => setYm(shiftMonth(ym, -1))}><ChevronLeft size={16} /></button>
              <h2 style={{ fontSize: 22, textAlign: 'center' }}>{monthLabel(ym)}</h2>
              <button type="button" className="icon-btn well" aria-label="Next month" onClick={() => setYm(shiftMonth(ym, 1))}><ChevronRight size={16} /></button>
            </div>
            <span className="faint" style={{ fontSize: 12.5, textAlign: 'center', marginTop: -6 }}>{mDays.length ? <>{green} green · {red} red · <PnL v={mNet} /> net</> : 'No trades this month'}</span>
            <MonthCalendar stats={stats} ym={ym} selected={day} onSelect={setDay} />
            {ym !== stats.thisMonth && <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'center' }} onClick={() => { setYm(stats.thisMonth); setDay(stats.today) }}>Back to {monthLabel(stats.thisMonth, false)}</button>}
          </section>
          <aside className="glass panel" style={{ flex: '1 1 340px', maxWidth: 440, gap: 6 }} aria-label="Day detail">
            <div className="col" style={{ gap: 2, marginBottom: 8 }}>
              <span className="eyebrow">{dayLabel(day, true)}</span>
              <span className="big num" style={{ fontSize: 40 }}><PnL v={net} /></span>
              <span className="faint" style={{ fontSize: 12.5 }}>{list.length ? `${list.length} ${list.length === 1 ? 'trade' : 'trades'} · ${list.filter((t) => t.pnl > 0).length} wins` : 'No trades this day'}</span>
            </div>
            {list.map((t) => <TradeRow key={t.id} t={t} onClick={() => { sessionStorage.setItem('ltj_v3_sel', t.id); location.hash = 'journal' }} />)}
          </aside>
        </div>
      </div>
    </AppShell>
  )
}

// Economic calendar from the same /api/news feed the classic app uses
const monday = (d) => { const x = new Date(d); const k = x.getDay(); x.setDate(x.getDate() + (k === 0 ? -6 : 1 - k)); x.setHours(0, 0, 0, 0); return x }
const impactLevel = (i) => ({ high: 3, medium: 2, low: 1 }[(i || '').toLowerCase()] || 0)

export function News() {
  const [week, setWeek] = React.useState(0)
  const [filter, setFilter] = React.useState('All')
  const [cur, setCur] = React.useState('All')
  const [state, setState] = React.useState({ loading: true, events: [], note: '' })
  const mon = React.useMemo(() => { const m = monday(new Date()); m.setDate(m.getDate() + week * 7); return m }, [week])
  const load = React.useCallback(async (force) => {
    const key = `news_cache_${isoLocal(mon)}`
    if (!force) {
      try { const c = JSON.parse(localStorage.getItem(key) || 'null'); if (c && Date.now() - c.ts < 3600e3 && c.data.length) { setState({ loading: false, events: c.data, note: '' }); return } } catch { /* no cache */ }
    }
    setState((s) => ({ ...s, loading: true }))
    try {
      const r = await fetch(`/api/news?week=${isoLocal(mon)}`)
      const j = await r.json()
      if (j && j.unavailable) { setState({ loading: false, events: [], note: "Next week's events haven't been published yet." }); return }
      const data = Array.isArray(j) ? j : []
      try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })) } catch { /* full */ }
      setState({ loading: false, events: data, note: data.length ? '' : 'No events for this week.' })
    } catch { setState({ loading: false, events: [], note: 'The news feed is not reachable right now.' }) }
  }, [mon])
  React.useEffect(() => { load(false) }, [load])

  const currencies = ['All', ...Array.from(new Set(state.events.map((e) => e.country).filter(Boolean))).sort()]
  const today = isoLocal(new Date())
  const evs = state.events
    .filter((e) => (filter === 'All' ? true : filter === 'High' ? impactLevel(e.impact) === 3 : impactLevel(e.impact) >= 2))
    .filter((e) => cur === 'All' || e.country === cur)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  const days = []
  evs.forEach((e) => {
    const d = new Date(e.date)
    const key = Number.isNaN(d.getTime()) ? 'unknown' : isoLocal(d)
    let g = days.find((x) => x.key === key)
    if (!g) { g = { key, items: [] }; days.push(g) }
    g.items.push(e)
  })
  const time = (iso) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime()) || (d.getHours() === 0 && d.getMinutes() === 0)) return 'All day'
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  const end = new Date(mon); end.setDate(end.getDate() + 4)

  return (
    <AppShell route="news" word="NEWS" title="News">
      <div className="wrap col" style={{ gap: 16, paddingBottom: 60, maxWidth: 960 }}>
        <div className="glass col" style={{ padding: '18px 22px', gap: 14 }}>
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <div className="col" style={{ flex: 1, minWidth: 180 }}>
              <h1 style={{ fontSize: 24, fontWeight: 600 }}>{week === 0 ? 'This week' : 'Next week'}</h1>
              <span className="faint" style={{ fontSize: 12.5 }}>{dayLabel(isoLocal(mon))} to {dayLabel(isoLocal(end))} · times in your local time</span>
            </div>
            <Seg options={[{ value: 0, label: 'This week' }, { value: 1, label: 'Next week' }]} value={week} onChange={setWeek} label="Week" />
          </div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <Seg options={['All', 'Medium +', 'High']} value={filter} onChange={setFilter} label="Impact" />
            <select className="input" aria-label="Currency" value={cur} onChange={(e) => setCur(e.target.value)} style={{ width: 'auto', height: 48, flex: '0 1 180px' }}>
              {currencies.map((c) => <option key={c} value={c} style={{ background: '#111' }}>{c === 'All' ? 'All currencies' : c}</option>)}
            </select>
            <button type="button" className="icon-btn well" aria-label="Refresh" onClick={() => load(true)}><RefreshCw size={15} /></button>
          </div>
        </div>
        {state.loading && <div className="glass panel"><span className="muted">Loading the calendar…</span></div>}
        {!state.loading && !days.length && <Empty title={state.note || 'No events match.'} body={state.note ? '' : 'Try another impact or currency filter.'} />}
        {days.map((d, di) => (
          <section key={d.key} className="glass panel" style={{ gap: 4, animation: `rise .6s var(--ease) ${di * 0.05}s both` }} aria-label={d.key}>
            <div className="row" style={{ gap: 8, marginBottom: 6 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>{d.key === 'unknown' ? 'Date to be announced' : dayLabel(d.key, true)}</h2>
              {d.key === today && <span className="tag tag-solid">Today</span>}
            </div>
            {d.items.map((e, i) => {
              const lvl = impactLevel(e.impact)
              return (
                <div key={i} className="row" style={{ gap: 14, minHeight: 58, borderTop: '1px solid var(--line)', padding: '8px 0' }}>
                  <span className="num" style={{ width: 70, flexShrink: 0, fontWeight: 600, fontSize: 13 }}>{time(e.date)}</span>
                  <span className="col" style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{e.title}</span>
                    <span className="row faint" style={{ gap: 10, fontSize: 11.5, flexWrap: 'wrap' }}>
                      <span className="well display" style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 99, color: '#fff' }}>{e.country || '—'}</span>
                      {e.forecast ? <span>Fcst <b style={{ color: 'var(--fg2)', fontWeight: 600 }}>{e.forecast}</b></span> : null}
                      {e.previous ? <span>Prev <b style={{ color: 'var(--fg2)', fontWeight: 600 }}>{e.previous}</b></span> : null}
                    </span>
                  </span>
                  <span className="row" style={{ gap: 4, flexShrink: 0 }} aria-label={`Impact ${lvl} of 3`}>{[1, 2, 3].map((k) => <span key={k} style={{ width: 8, height: 8, borderRadius: '50%', background: k <= lvl ? (lvl === 3 ? '#FFA9A1' : '#FFF') : 'rgba(255,255,255,.15)' }} />)}</span>
                </div>
              )
            })}
          </section>
        ))}
      </div>
    </AppShell>
  )
}
