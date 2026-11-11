// Asia Model, phone first: this week's plan and tonight's checklist.
// Checks live on this device (localStorage), one list per night, one plan per week.
import React from 'react'
import { Check, CalendarCheck, Plus, Target } from 'lucide-react'
import { todayISO, isoLocal } from './data.js'
import { MODEL_VERSION, MIN_RR, STOP_BUFFER, RANGE_MIN, RANGE_MAX } from './backtestMath.js'

export const TONIGHT = [
  ['range', 'Mark the NY range', '9:30 AM to 4:00 PM high and low. Extend it if price leaves it before 8:00 PM.'],
  ['size', `Range is ${RANGE_MIN} to ${RANGE_MAX} points`, 'Outside that: no trade tonight. Log it anyway.'],
  ['narrative', 'Read the 4:00 PM close', 'Below 0.4 of the range: shorts only. Above 0.6: longs only. In between: no trade.'],
  ['liquidity', 'Liquidity left in that direction', 'An untouched NY, London or previous day level, or an unfilled 15m FVG.'],
  ['news', 'No red folder news 8 to 10 PM', 'Not a US holiday, not the Sunday reopen.'],
  ['order', 'Order set: 0.705 entry', `Stop at 0.79 + ${STOP_BUFFER} points. Target gives ${MIN_RR}R or more, or skip.`],
  ['timing', 'Placed in the right window', '7:30 to 7:50 PM or after 8:10 PM New York time. Never 7:50 to 8:10. Cancel at 10:00 PM.'],
  ['one', 'One trade, then done', 'A loss ends the night. No revenge, no second setup.'],
  ['log', 'Log the session', 'Win, loss, no fill or no trade. Every night counts.'],
]

const KEY_NIGHT = (d) => `ltj_asia_check_${d}`
const KEY_WEEK = (m) => `ltj_asia_week_${m}`
const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? fb } catch { return fb } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } }

export function weekOf(iso) {
  const d = new Date(iso + 'T12:00:00')
  const mon = new Date(d)
  // Weekends plan the coming week; weekdays show the current one.
  if (d.getDay() === 6) mon.setDate(d.getDate() + 2)
  else if (d.getDay() === 0) mon.setDate(d.getDate() + 1)
  else mon.setDate(d.getDate() - (d.getDay() - 1))
  return Array.from({ length: 5 }, (_, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return isoLocal(x) })
}
const short = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
const md = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function AsiaTonight({ rows, onLog }) {
  const today = todayISO()
  const days = weekOf(today)
  const [done, setDone] = React.useState(() => read(KEY_NIGHT(today), {}))
  const [week, setWeek] = React.useState(() => read(KEY_WEEK(days[0]), { focus: `Asia Model ${MODEL_VERSION.replace('asia-', '')}: limit at 0.705 with the narrative`, goal: 5 }))
  React.useEffect(() => write(KEY_NIGHT(today), done), [done, today])
  React.useEffect(() => write(KEY_WEEK(days[0]), week), [week, days])

  const logged = new Set((rows || []).map((r) => r.session_date))
  const weekCount = days.filter((d) => logged.has(d)).length
  const n = TONIGHT.filter(([k]) => done[k]).length
  const all = n === TONIGHT.length
  const toggle = (k) => setDone((s) => ({ ...s, [k]: !s[k] }))

  return (
    <>
      <section className="glass panel" aria-label="This week" style={{ padding: 22, gap: 14 }}>
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <span className="ink" style={{ width: 40, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Target size={17} /></span>
          <span className="col" style={{ flex: 1, minWidth: 0 }}>
            <span className="eyebrow">{days.includes(today) ? 'This week' : 'Next week'} · {md(days[0])} to {md(days[4])}</span>
            <span className="display" style={{ fontSize: 17, fontWeight: 600 }}>Testing</span>
          </span>
          <span className="num display" style={{ fontSize: 20, fontWeight: 600 }}>{weekCount}/{week.goal}</span>
        </div>
        <textarea className="input" rows={2} aria-label="Strategy this week" value={week.focus} onChange={(e) => setWeek({ ...week, focus: e.target.value })} style={{ fontSize: 14.5 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
          {days.map((d) => {
            const has = logged.has(d), isToday = d === today
            return (
              <div key={d} className="col" style={{ alignItems: 'center', gap: 6, padding: '10px 0', borderRadius: 16, background: isToday ? 'color-mix(in srgb, var(--fg) 8%, transparent)' : 'transparent', boxShadow: isToday ? 'inset 0 0 0 1px color-mix(in srgb, var(--fg) 16%, transparent)' : 'none' }}>
                <span className="faint" style={{ fontSize: 11.5 }}>{short(d)}</span>
                <span className={has ? 'check' : 'check off'} style={{ width: 26, height: 26, opacity: has || isToday ? 1 : 0.45 }}>{has && <Check size={13} strokeWidth={3} />}</span>
              </div>
            )
          })}
        </div>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <span className="faint" style={{ fontSize: 12.5, flex: 1 }}>Goal: sessions logged this week</span>
          {[3, 4, 5].map((g) => <button key={g} type="button" className="chip" aria-pressed={week.goal === g} onClick={() => setWeek({ ...week, goal: g })} style={{ minHeight: 34, padding: '0 14px' }}>{g}</button>)}
        </div>
      </section>

      <section className="glass panel" aria-label="Tonight" style={{ padding: '18px 18px 10px', gap: 0 }}>
        <div className="row" style={{ gap: 10, alignItems: 'center', padding: '4px 4px 12px' }}>
          <CalendarCheck size={17} />
          <span className="display" style={{ fontSize: 17, fontWeight: 600, flex: 1 }}>Tonight's checklist</span>
          <span className="faint num" style={{ fontSize: 13 }}>{n} of {TONIGHT.length}</span>
        </div>
        <div className="bar well" style={{ height: 6, margin: '0 4px 8px' }}><i style={{ width: `${(n / TONIGHT.length) * 100}%`, animation: 'none', transition: 'width .5s var(--ease)' }} /></div>
        {TONIGHT.map(([k, t, s]) => (
          <button key={k} type="button" className="list-row" aria-pressed={!!done[k]} onClick={() => toggle(k)} style={{ minHeight: 68, cursor: 'pointer', color: 'inherit', font: 'inherit' }}>
            <span className={done[k] ? 'check' : 'check off'} style={{ width: 28, height: 28 }}>{done[k] && <Check size={14} strokeWidth={3} />}</span>
            <span className="col" style={{ flex: 1, minWidth: 0, opacity: done[k] ? 0.55 : 1, transition: 'opacity .3s' }}>
              <span style={{ fontWeight: 600, fontSize: 14.5, textDecoration: done[k] ? 'line-through' : 'none' }}>{t}</span>
              <span className="faint" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{s}</span>
            </span>
          </button>
        ))}
        <div className="row" style={{ gap: 10, padding: '14px 4px 10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="muted" style={{ flex: 1, minWidth: 180, fontSize: 13 }}>{all ? 'All checked. Trust the plan.' : logged.has(today) ? 'Tonight is logged.' : 'Work down the list before you place the order.'}</span>
          {n > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDone({})}>Reset</button>}
          <button type="button" className="btn btn-primary" onClick={onLog}><Plus size={15} /> Log tonight</button>
        </div>
      </section>
    </>
  )
}
