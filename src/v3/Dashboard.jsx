import React from 'react'
import { ArrowRight, Plus, Target } from 'lucide-react'
import { useStore } from './store.jsx'
import { Seg, CountUp, Ring, Bar, PnL } from './ui.jsx'
import { EquityChart, dayTick, PillBars } from './charts.jsx'
import { money, pct, fmtR, dayLabel, monthLabel, isoLocal, compact } from './data.js'
import AppShell, { Empty } from './Shell.jsx'

export function TradeRow({ t, onClick, active }) {
  const meta = [dayLabel(t.date), t.session, t.state, t.plan === 'YES' ? 'plan kept' : t.plan === 'NO' ? 'off plan' : t.plan === 'PARTIALLY' ? 'partly on plan' : null].filter(Boolean).join(' · ')
  return (
    <button type="button" onClick={onClick} className="list-row" style={active ? { background: 'rgba(255,255,255,0.12)', borderRadius: 20, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3)' } : null}>
      <span className="sym ink"><b style={{ fontSize: t.symbol.length > 4 ? 9.5 : 12 }}>{t.symbol.replace('/USD', '')}</b><small>{(t.side || '').toUpperCase()}</small></span>
      <span className="col" style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <span className="display" style={{ fontSize: 14.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.setup !== 'Untagged' ? t.setup : t.rating || t.symbol}</span>
        <span className="faint num" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta}</span>
      </span>
      <span className="col" style={{ alignItems: 'flex-end', gap: 3 }}>
        <PnL v={t.pnl} className="display" />
        {t.r !== null && <span className="faint num" style={{ fontSize: 12 }}>{fmtR(t.r, 1)}</span>}
      </span>
    </button>
  )
}

function useNarrow() {
  const q = '(max-width: 760px)'
  const [n, setN] = React.useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  React.useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setN(m.matches)
    m.addEventListener ? m.addEventListener('change', on) : m.addListener(on)
    return () => (m.removeEventListener ? m.removeEventListener('change', on) : m.removeListener(on))
  }, [])
  return n
}

// Month grid: Mon to Fri plus a week total. Weekends appear only when that month has weekend trades.
export function MonthCalendar({ stats, ym, compact: smallProp = false, selected, onSelect }) {
  const narrow = useNarrow()
  const small = smallProp || narrow
  const tall = !smallProp && narrow
  const [y, m] = ym.split('-').map(Number)

  const last = new Date(y, m, 0).getDate()
  const today = stats.today
  const weekendTrades = Object.keys(stats.byDay).some((d) => d.startsWith(ym) && [0, 6].includes(new Date(d + 'T12:00:00').getDay()))
  const cols = weekendTrades ? [1, 2, 3, 4, 5, 6, 0] : [1, 2, 3, 4, 5]
  const names = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' }
  // build weeks starting Monday
  const weeks = []
  let wk = {}
  for (let d = 1; d <= last; d++) {
    const date = new Date(y, m - 1, d)
    const dow = date.getDay()
    if (dow === 1 && Object.keys(wk).length) { weeks.push(wk); wk = {} }
    wk[dow] = isoLocal(date)
  }
  if (Object.keys(wk).length) weeks.push(wk)
  const vals = Object.entries(stats.byDay).filter(([d]) => d.startsWith(ym)).map(([, v]) => Math.abs(v))
  const maxAbs = Math.max(1, ...vals)
  const h = tall ? 60 : small ? 52 : 86
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols.length + 1}, minmax(0, 1fr))`, gap: small ? 6 : 8 }}>
      {cols.map((c) => <span key={c} style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--fg3)', textAlign: 'center' }}>{names[c]}</span>)}
      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--fg3)', textAlign: 'center' }}>Week</span>
      {weeks.map((w, wi) => {
        const tot = Object.values(w).reduce((s, d) => s + (stats.byDay[d] || 0), 0)
        const any = Object.values(w).some((d) => stats.byDay[d] !== undefined)
        return (
          <React.Fragment key={wi}>
            {cols.map((c) => {
              const iso = w[c]
              if (!iso) return <span key={c} />
              const v = stats.byDay[iso]
              const day = Number(iso.slice(8))
              const future = iso > today
              const isToday = iso === today
              const isSel = selected === iso
              const a = v ? Math.min(Math.abs(v) / maxAbs, 1) : 0
              const hi = isToday || isSel
              const bg = hi ? '#FFFFFF' : future ? 'rgba(255,255,255,0.02)' : v > 0 ? `rgba(166,242,190,${(0.08 + a * 0.16).toFixed(2)})` : v < 0 ? `rgba(255,169,161,${(0.06 + a * 0.12).toFixed(2)})` : 'rgba(255,255,255,0.035)'
              return (
                <button key={c} type="button" disabled={!onSelect} onClick={() => onSelect && onSelect(iso)}
                  aria-label={`${dayLabel(iso, true)}: ${v === undefined ? 'no trades' : money(v)}`}
                  style={{ height: h, borderRadius: small ? 14 : 20, border: 'none', background: bg, color: hi ? '#000' : '#FFF', boxShadow: hi ? '0 0 24px rgba(255,255,255,.4)' : 'inset 0 1px 0 rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column', alignItems: small ? 'center' : 'flex-start', justifyContent: small ? 'center' : 'space-between', padding: small ? 0 : '10px 12px', gap: 1, cursor: onSelect ? 'pointer' : 'default', opacity: future ? 0.45 : 1, minWidth: 0 }}>
                  <span className="num" style={{ fontSize: small ? 10.5 : 12, opacity: 0.6 }}>{day}</span>
                  <span className={`num display ${hi ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : 'faint'}`} style={{ fontSize: small ? 11 : 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{v === undefined ? '' : small ? compact(v) : money(Math.round(v))}</span>
                </button>
              )
            })}
            <span style={{ height: h, borderRadius: small ? 14 : 20, background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, minWidth: 0 }}>
              {any ? <span className={`num display ${tot > 0 ? 'pos' : tot < 0 ? 'neg' : 'faint'}`} style={{ fontSize: small ? 11 : 14, fontWeight: 600 }}>{small ? compact(tot) : money(Math.round(tot))}</span> : <span className="faint" style={{ fontSize: 11 }}>—</span>}
            </span>
          </React.Fragment>
        )
      })}
    </div>
  )
}

function rangeSeries(stats, range) {
  const now = new Date()
  if (range === 'Year') {
    const out = [{ label: '', value: 0 }]
    let run = 0
    for (let k = 11; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const v = stats.byMonth[key] || 0
      run += v
      out.push({ label: monthLabel(key, false), value: run, sub: v })
    }
    return out
  }
  const from = range === 'Week' ? isoLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)) : stats.thisMonth + '-01'
  const days = stats.days.filter((d) => d >= from)
  let run = 0
  const pts = [{ date: from, value: 0, label: dayLabel(from) }]
  days.forEach((d) => { run += stats.byDay[d]; pts.push({ date: d, value: run, sub: stats.byDay[d] }) })
  if (pts.length === 1) pts.push({ date: stats.today, value: 0 })
  return pts
}

export default function Dashboard() {
  const { stats, trades, user, profile, openLog } = useStore()
  const [range, setRange] = React.useState('Month')
  const series = React.useMemo(() => rangeSeries(stats, range), [stats, range])
  const headline = series[series.length - 1].value
  const goal = Number(profile?.monthly_goal) || 0
  const toGoal = Math.max(0, goal - stats.monthNet)
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const monthName = monthLabel(stats.thisMonth, false)

  if (!trades.length) {
    return (
      <AppShell route="dashboard" word="LIMITLESS" title="Dashboard">
        <div className="wrap col" style={{ gap: 18, paddingBottom: 60 }}>
          <div className="display col">
            <span style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, lineHeight: 1.15 }}>{user.name}</span>
            <span style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 300, lineHeight: 1.15, color: 'rgba(255,255,255,.86)' }}>{greet}.</span>
          </div>
          <Empty title="Log your first trade." body="Every number on this dashboard comes from your own trades. Log one and it starts filling in." action={<button type="button" className="btn btn-primary" onClick={openLog}><Plus size={15} /> Log trade</button>} />
        </div>
      </AppShell>
    )
  }

  const r = stats.review
  const plan = stats.plan
  return (
    <AppShell route="dashboard" word="LIMITLESS" title="Dashboard">
      <div className="wrap col" style={{ gap: 18, paddingBottom: 60 }}>
        <div className="row" style={{ justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="display stagger col">
            <span style={{ '--i': 0, fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, lineHeight: 1.15 }}>{user.name}</span>
            <span style={{ '--i': 1, fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 300, lineHeight: 1.15, color: 'rgba(255,255,255,.86)' }}>{greet}.</span>
          </div>
          <div className="glass row" style={{ gap: 12, minHeight: 58, padding: '0 18px 0 8px', borderRadius: 99 }}>
            <span className="logo-dot ink display" style={{ width: 42, height: 42, fontSize: 11, fontWeight: 700 }}>{stats.todayTrades.length}</span>
            <span className="col">
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Today</span>
              <span className="faint num" style={{ fontSize: 12 }}>{stats.todayTrades.length ? <><PnL v={stats.todayNet} /> · {stats.todayTrades.length} {stats.todayTrades.length === 1 ? 'trade' : 'trades'}</> : 'No trades yet'}</span>
            </span>
          </div>
        </div>

        <section className="ink" aria-label="Net P&L" style={{ borderRadius: 38, padding: 'clamp(20px, 3vw, 30px) clamp(18px, 3vw, 30px) 110px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(80% 70% at 75% 10%, rgba(255,255,255,0.08), transparent 70%)', pointerEvents: 'none' }} />
          <div className="row" style={{ position: 'relative', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}>
            <div className="col" style={{ gap: 6 }}>
              <span className="eyebrow">Net P&amp;L · {range === 'Year' ? 'last 12 months' : range === 'Week' ? 'last 7 days' : monthLabel(stats.thisMonth)}</span>
              <span className="big num" style={{ fontSize: 'clamp(42px, 6vw, 62px)' }}><CountUp value={headline} format={(v) => (v < 0 ? '−$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US')} /></span>
              <span className="muted num" style={{ fontSize: 13.5 }}>{range === 'Month' ? `${stats.month.length} trades this month` : `${stats.n} trades logged`} · <PnL v={stats.todayNet} /> today</span>
            </div>
            <Seg options={['Week', 'Month', 'Year']} value={range} onChange={setRange} label="Range" />
          </div>
          <div style={{ position: 'relative', marginTop: 10 }}>
            <EquityChart series={series} target={range === 'Month' && goal > 0 ? goal : null} labelFor={range === 'Year' ? (p) => p.label : dayTick} />
          </div>
        </section>

        <div className="grid g4 m2" style={{ margin: '-100px clamp(0px, 2vw, 22px) 0', position: 'relative' }}>
          <div className="glass span2 row" style={{ padding: '22px 24px', gap: 18 }}>
            {goal > 0 ? (
              <>
                <div className="col display" style={{ flex: 1, gap: 4 }}>
                  <span className="eyebrow">{monthName} goal</span>
                  <span style={{ fontSize: 26, fontWeight: 500 }}>{toGoal > 0 ? `${money(toGoal, false)} to go` : 'Goal reached'}</span>
                  <span className="faint num" style={{ fontSize: 12.5, fontFamily: 'var(--body)' }}>{money(stats.monthNet)} of {money(goal, false)} · {stats.monthDays.length} trading days</span>
                </div>
                <Ring pct={stats.monthNet / goal} size={104} label={Math.max(0, Math.round((stats.monthNet / goal) * 100)) + '%'} sub="of goal" />
              </>
            ) : (
              <>
                <div className="col display" style={{ flex: 1, gap: 4 }}>
                  <span className="eyebrow">{monthName}</span>
                  <span style={{ fontSize: 26, fontWeight: 500 }}><PnL v={stats.monthNet} /></span>
                  <span className="faint" style={{ fontSize: 12.5 }}>{stats.monthGreen} green · {stats.monthRed} red days</span>
                </div>
                <a href="#account" className="btn btn-ghost btn-sm"><Target size={14} /> Set a monthly goal</a>
              </>
            )}
          </div>
          <div className="glass col lift" style={{ padding: '22px 24px', gap: 6 }}>
            <span className="eyebrow">Win rate</span>
            <span className="big num" style={{ fontSize: 34, fontWeight: 600 }}><CountUp value={stats.winRate * 100} format={(v) => v.toFixed(1) + '%'} /></span>
            <span className="faint num" style={{ fontSize: 12.5 }}>{stats.wins} wins · {stats.losses} losses</span>
          </div>
          <div className="glass col lift" style={{ padding: '22px 24px', gap: 6 }}>
            <span className="eyebrow">Profit factor</span>
            <span className="big num" style={{ fontSize: 34, fontWeight: 600 }}>{Number.isFinite(stats.pf) ? <CountUp value={stats.pf} format={(v) => v.toFixed(2)} /> : '∞'}</span>
            <span className="faint num" style={{ fontSize: 12.5 }}>{stats.avgR !== null ? `Avg ${fmtR(stats.avgR)} per trade` : `Avg ${money(Math.round(stats.expectancy))} per trade`}</span>
          </div>
        </div>

        <div className="grid g3">
          <section className="glass panel" aria-label="Review habit">
            <div className="panel-head"><h2>Review habit</h2><span className="faint" style={{ fontSize: 12 }}>All trades</span></div>
            {[
              { l: 'Entry reason written', p: r.reason },
              { l: 'Right and wrong filled in', p: r.rightWrong },
              { l: 'Emotion tagged', p: r.emotion },
              { l: 'Chart screenshot', p: r.shots },
            ].map((x, i) => (
              <div key={x.l} className="col" style={{ gap: 8 }}>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 13.5 }}><span>{x.l}</span><span className="num" style={{ fontWeight: 600 }}>{pct(x.p)}</span></div>
                <Bar pct={x.p} fill={x.p >= 0.7 ? '#fff' : 'rgba(255,255,255,0.55)'} delay={0.3 + i * 0.1} />
              </div>
            ))}
          </section>

          <section className="glass panel" aria-label="Plan followed">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="col" style={{ gap: 2 }}>
                <span className="eyebrow">Followed your plan</span>
                <span className="big num" style={{ fontSize: 32, fontWeight: 600 }}>{plan.score === null ? '—' : <><CountUp value={plan.score} /> <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--fg3)' }}>%</span></>}</span>
              </div>
              <span className="faint" style={{ fontSize: 12, maxWidth: 140, textAlign: 'right' }}>{plan.answered ? `${plan.answered} trades rated` : 'Answer "Did I follow my plan?" when you log'}</span>
            </div>
            <PillBars height={118} items={[
              { label: 'Yes', value: String(plan.yes), pct: plan.answered ? plan.yes / plan.answered : 0, fill: '#FFF', peak: plan.answered > 0 && plan.yes >= plan.no && plan.yes >= plan.partly },
              { label: 'Partly', value: String(plan.partly), pct: plan.answered ? plan.partly / plan.answered : 0, fill: 'rgba(255,255,255,0.6)' },
              { label: 'No', value: String(plan.no), pct: plan.answered ? plan.no / plan.answered : 0, fill: 'rgba(255,169,161,0.85)' },
            ]} />
            {plan.answered > 0 && plan.offPlanNet < 0 && <span className="faint" style={{ fontSize: 12 }}>Off plan trades: <PnL v={plan.offPlanNet} /></span>}
          </section>

          <section className="glass panel" aria-label="By session">
            <div className="panel-head"><h2>By session</h2><span className="faint" style={{ fontSize: 12 }}>Net · win rate</span></div>
            {stats.sessions.map((s) => (
              <div key={s.key} className="well row" style={{ gap: 12, padding: '11px 14px', borderRadius: 18 }}>
                <span className="ink display" style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{s.key === 'New York' ? 'NY' : s.key === 'London' ? 'LDN' : s.key === 'Asian' ? 'AS' : 'OVL'}</span>
                <span className="col" style={{ flex: 1 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{s.key}</span>
                  <span className="faint num" style={{ fontSize: 12 }}>{s.n} trades{s.n ? ` · ${Math.round(s.win * 100)}% win` : ''}</span>
                </span>
                <PnL v={s.net} className="display" />
              </div>
            ))}
          </section>
        </div>

        <div className="grid g4">
          <section className="glass panel span2" aria-label={monthLabel(stats.thisMonth)}>
            <div className="panel-head"><h2>{monthLabel(stats.thisMonth)}</h2><span className="faint" style={{ fontSize: 12 }}>{stats.monthGreen} green · {stats.monthRed} red</span><a href="#calendar" className="btn btn-ghost btn-sm">Open</a></div>
            <MonthCalendar stats={stats} ym={stats.thisMonth} compact />
          </section>
          <section className="glass panel span2" aria-label="Recent trades" style={{ gap: 4 }}>
            <div className="panel-head" style={{ marginBottom: 8 }}><h2>Recent trades</h2><a href="#journal" className="btn btn-ghost btn-sm">See all <ArrowRight size={13} /></a></div>
            {trades.slice(0, 5).map((t) => <TradeRow key={t.id} t={t} onClick={() => { sessionStorage.setItem('ltj_v3_sel', t.id); location.hash = 'journal' }} />)}
          </section>
        </div>
      </div>
    </AppShell>
  )
}
