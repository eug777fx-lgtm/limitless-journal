import React from 'react'
import { useStore } from './store.jsx'
import { Seg, PnL } from './ui.jsx'
import { PillBars } from './charts.jsx'
import { insights, money, fmtR, compact } from './data.js'
import AppShell, { Empty } from './Shell.jsx'

export default function Analytics() {
  const { stats, openLog } = useStore()
  const [view, setView] = React.useState(() => (stats.setups.some((g) => g.key !== 'Untagged') ? 'Setups' : stats.grades.length ? 'Grades' : 'Symbols'))
  if (stats.n < 3) {
    return (
      <AppShell route="analytics" word="EDGE" title="Analytics">
        <div className="wrap col" style={{ gap: 18, paddingBottom: 60 }}>
          <Empty title="Analytics need a few trades." body={`You have ${stats.n} logged. After three or more, this page shows your best setups, sessions and the states that cost you.`} action={<button type="button" className="btn btn-primary" onClick={openLog}>Log trade</button>} />
        </div>
      </AppShell>
    )
  }
  const ins = insights(stats)
  const groups = { Setups: stats.setups, Grades: stats.grades, Symbols: stats.symbols, Sessions: stats.sessions.filter((s) => s.n), States: stats.states }
  const rows = groups[view]
  const maxNet = Math.max(...rows.map((r) => Math.abs(r.net)), 1)
  const heatMax = Math.max(...stats.heat.flatMap((d) => d.cells.map(Math.abs)), 1)
  const emax = Math.max(...stats.states.map((s) => Math.abs(s.net)), 1)
  const bmax = Math.max(...stats.bins.map((b) => b.n), 1)
  const peakBin = stats.bins.reduce((best, b, i) => (!b.loss && (best < 0 || b.n > stats.bins[best].n) ? i : best), -1)
  const sessShort = { 'New York': 'NY', London: 'LDN', Asian: 'Asia', Overlap: 'Ovl' }

  return (
    <AppShell route="analytics" word="EDGE" title="Analytics">
      <div className="wrap col" style={{ gap: 18, paddingBottom: 60 }}>
        {ins.length > 0 && (
          <div className="grid g3 stagger">
            {ins.map((i, k) => (
              <div key={i.kind} className="glass panel lift" style={{ '--i': k, minHeight: 180, gap: 12 }}>
                <span className={i.strong ? 'tag tag-solid' : 'tag tag-soft'} style={{ alignSelf: 'flex-start' }}>{i.kind}</span>
                <span className="display" style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.3 }}>{i.title}</span>
                <span className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>{i.body}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid g4 m2">
          {[
            ['Net P&L', <PnL key="n" v={stats.net} />, `${stats.n} trades`],
            ['Expectancy', money(Math.round(stats.expectancy)), 'per trade'],
            ['Avg win / loss', `${money(Math.round(stats.avgWin), false)} / ${money(Math.round(stats.avgLoss), false)}`, `${stats.wins} wins · ${stats.losses} losses`],
            ['Max drawdown', money(Math.round(stats.maxDD), false), 'peak to trough'],
          ].map(([k, v, sub]) => (
            <div key={k} className="glass col" style={{ padding: '20px 22px', gap: 4 }}>
              <span className="eyebrow">{k}</span>
              <span className="big num" style={{ fontSize: 24, fontWeight: 600 }}>{v}</span>
              <span className="faint" style={{ fontSize: 12 }}>{sub}</span>
            </div>
          ))}
        </div>

        <section className="glass panel" aria-label="Playbook" style={{ gap: 6, padding: 26 }}>
          <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
            <div className="col" style={{ flex: 1, gap: 2 }}>
              <h2 style={{ fontSize: 22, fontWeight: 600 }}>Playbook</h2>
              <span className="muted" style={{ fontSize: 13 }}>Where your money actually comes from</span>
            </div>
            <Seg options={Object.keys(groups)} value={view} onChange={setView} label="Group by" style={{ maxWidth: '100%', overflowX: 'auto' }} />
          </div>
          {!rows.length && <span className="muted" style={{ padding: '12px 4px' }}>Nothing to group yet. Tag your trades with this field when you log them.</span>}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 640 }}>
              {rows.map((g, i) => (
                <div key={view + g.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) 64px 76px 90px minmax(0, 1.6fr) 100px', gap: 14, alignItems: 'center', minHeight: 62, padding: '6px 4px', borderTop: '1px solid var(--line)', animation: `rise .5s var(--ease) ${i * 0.05}s both` }}>
                  <span className="col" style={{ minWidth: 0 }}><span className="display" style={{ fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.key}</span><span className="faint num" style={{ fontSize: 12 }}>{g.n} trades</span></span>
                  <span className="col"><span className="faint" style={{ fontSize: 11 }}>Win</span><span className="num" style={{ fontWeight: 600 }}>{Math.round(g.win * 100)}%</span></span>
                  <span className="col"><span className="faint" style={{ fontSize: 11 }}>Avg R</span><span className="num" style={{ fontWeight: 600 }}>{fmtR(g.avgR)}</span></span>
                  <span className="col"><span className="faint" style={{ fontSize: 11 }}>Per trade</span><span className="num" style={{ fontWeight: 600 }}>{money(Math.round(g.exp))}</span></span>
                  <div className="bar well"><i style={{ width: `${(Math.abs(g.net) / maxNet) * 100}%`, background: g.net >= 0 ? '#FFF' : 'rgba(255,169,161,.6)', '--d': 0.15 + i * 0.06 + 's' }} /></div>
                  <span style={{ textAlign: 'right' }}><PnL v={g.net} className="display" /></span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid g2">
          <section className="glass panel" aria-label="Net by weekday and session">
            <div className="col" style={{ gap: 2 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600 }}>When you make money</h2>
              <span className="muted" style={{ fontSize: 13 }}>Net by weekday and session</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(4, minmax(0, 1fr))', gap: 6 }}>
              <span />
              {stats.sessionsList.map((s) => <span key={s} className="faint" style={{ fontSize: 11, textAlign: 'center' }}>{sessShort[s]}</span>)}
              {stats.heat.map((d) => (
                <React.Fragment key={d.day}>
                  <span className="faint" style={{ fontSize: 11.5, alignSelf: 'center' }}>{d.day}</span>
                  {d.cells.map((v, si) => {
                    const a = Math.abs(v) / heatMax
                    const has = d.counts[si] > 0
                    return (
                      <div key={si} title={`${d.day} ${stats.sessionsList[si]}: ${money(v)} on ${d.counts[si]} trades`} style={{ height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, background: v > 0 ? `rgba(255,255,255,${(0.08 + a * 0.8).toFixed(2)})` : v < 0 ? `rgba(255,169,161,${(0.05 + a * 0.2).toFixed(2)})` : 'rgba(255,255,255,0.03)', color: v > 0 && a > 0.5 ? '#000' : v < 0 ? 'var(--neg)' : '#FFF' }}>
                        {has ? compact(v) : ''}
                      </div>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </section>

          <section className="glass panel" aria-label="Your state before entry" style={{ gap: 10 }}>
            <div className="col" style={{ gap: 2, marginBottom: 6 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600 }}>Your state when you clicked</h2>
              <span className="muted" style={{ fontSize: 13 }}>What each mood made or cost you</span>
            </div>
            {!stats.states.length && <span className="muted">Tag how you felt on your trades and this fills in.</span>}
            {stats.states.map((s, i) => {
              const w = (Math.abs(s.net) / emax) * 50
              return (
                <div key={s.key} style={{ display: 'grid', gridTemplateColumns: '100px minmax(0, 1fr) 80px', gap: 12, alignItems: 'center', minHeight: 40 }}>
                  <span className="col"><span style={{ fontSize: 13.5, fontWeight: 500 }}>{s.key}</span><span className="faint num" style={{ fontSize: 11 }}>{s.n} · {Math.round(s.win * 100)}% win</span></span>
                  <div style={{ height: 14, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: -4, bottom: -4, left: '50%', width: 1, background: 'rgba(255,255,255,.18)' }} />
                    <div style={{ position: 'absolute', top: 0, height: 14, left: `${s.net >= 0 ? 50 : 50 - w}%`, width: `${w}%`, borderRadius: 99, background: s.net >= 0 ? '#FFF' : 'rgba(255,169,161,.6)', transformOrigin: s.net >= 0 ? 'left' : 'right', animation: `growX .9s var(--ease) ${0.2 + i * 0.06}s both` }} />
                  </div>
                  <span style={{ textAlign: 'right' }}><PnL v={s.net} className="display" /></span>
                </div>
              )
            })}
          </section>
        </div>

        {stats.nR >= 3 && (
          <section className="glass panel" aria-label="R multiple distribution" style={{ padding: 26 }}>
            <div className="col" style={{ gap: 2 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600 }}>R multiple distribution</h2>
              <span className="muted" style={{ fontSize: 13 }}>{stats.nR} trades with an R logged · average {fmtR(stats.avgR)}</span>
            </div>
            <PillBars height={170} width={16} items={stats.bins.map((b, i) => ({ label: b.label, value: String(b.n), pct: b.n / bmax, fill: b.loss ? 'rgba(255,169,161,.6)' : '#FFF', peak: i === peakBin }))} />
          </section>
        )}
      </div>
    </AppShell>
  )
}
