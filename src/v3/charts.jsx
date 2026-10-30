import React from 'react'
import { dayLabel, money } from './data.js'

const f = (n) => Math.round(n * 10) / 10

// Catmull-Rom through the points, as cubic Beziers
export function smooth(pts) {
  if (!pts.length) return ''
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d
}

// Equity curve: draws in, glows, and scrubs under the pointer.
// series: [{ label, value, sub? }]
export function EquityChart({ series, target, height = 250, ticks = 5, labelFor = (p) => p.label }) {
  // The viewBox matches the real pixel width, so strokes and labels keep their size on every screen
  const box = React.useRef(null)
  const [W, setW] = React.useState(1000)
  React.useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setW(Math.max(280, Math.round(el.getBoundingClientRect().width)))
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (ro) ro.observe(el)
    return () => ro && ro.disconnect()
  }, [])
  const narrow = W < 600
  const H = narrow ? Math.round(height * 0.82) : height, padL = 8, padR = narrow ? 20 : 30, top = target ? 40 : 18, bottom = H - 22
  ticks = narrow ? Math.min(ticks, 4) : ticks
  const max = Math.max(target || 0, ...series.map((p) => p.value), 1)
  const min = Math.min(0, ...series.map((p) => p.value))
  const x = (i) => padL + (i / Math.max(1, series.length - 1)) * (W - padL - padR)
  const y = (v) => bottom - ((v - min) / (max - min)) * (bottom - top)
  const pts = series.map((p, i) => [x(i), y(p.value)])
  const line = smooth(pts)
  const last = pts[pts.length - 1] || [0, 0]
  const area = `${line} L${f(last[0])} ${H} L${f(pts[0] ? pts[0][0] : 0)} ${H} Z`
  const [hover, setHover] = React.useState(null)
  const ref = React.useRef(null)
  const key = series.map((p) => p.value).join(',')

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect()
    const vx = ((e.clientX - r.left) / r.width) * W
    let best = 0, bd = Infinity
    pts.forEach((p, i) => { const d = Math.abs(p[0] - vx); if (d < bd) { bd = d; best = i } })
    setHover(best)
  }
  const hp = hover !== null ? pts[hover] : null
  const tickIdx = [...new Set(Array.from({ length: ticks }, (_, k) => Math.round((k / (ticks - 1)) * (series.length - 1))))]
  const labels = tickIdx.map((ti) => labelFor(series[ti])).filter((l, k, arr) => l && arr.indexOf(l) === k)

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <svg ref={ref} key={key} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', touchAction: 'pan-y' }}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img"
        aria-label={`Equity from ${money(series[0] ? series[0].value : 0, false)} to ${money(series.length ? series[series.length - 1].value : 0, false)}`}>
        <defs>
          <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.17" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {target && <>
          <line x1={padL} y1={y(target)} x2={W - padR} y2={y(target)} stroke="rgba(255,255,255,0.3)" strokeDasharray="2 7" />
          <text x={padL} y={y(target) - 10} fill="rgba(255,255,255,0.55)" style={{ font: '500 12px Inter, sans-serif' }}>Goal {money(target, false)}</text>
        </>}
        {min < 0 && <line x1={padL} y1={y(0)} x2={W - padR} y2={y(0)} stroke="rgba(255,255,255,0.12)" />}
        <path d={area} fill="url(#eqFill)" style={{ animation: 'fade 1.2s var(--ease) .5s both' }} />
        <path d={line} fill="none" stroke="#FFFFFF" strokeWidth={narrow ? 3 : 3.5} strokeLinecap="round" pathLength="1" strokeDasharray="1"
          style={{ animation: 'draw 1.6s var(--ease) .15s both', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.45))' }} />
        {hp ? <>
          <line x1={hp[0]} y1={hp[1]} x2={hp[0]} y2={H} stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" strokeDasharray="4 6" />
          <circle cx={hp[0]} cy={hp[1]} r="9" fill="#000" stroke="#FFFFFF" strokeWidth="4" />
        </> : <>
          <line x1={last[0]} y1={last[1]} x2={last[0]} y2={H} stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeDasharray="4 6" style={{ animation: 'fade .6s 1.5s both' }} />
          <circle cx={last[0]} cy={last[1]} r="10" fill="#000" stroke="#FFFFFF" strokeWidth="4" style={{ transformOrigin: `${last[0]}px ${last[1]}px`, animation: 'pop .6s var(--spring) 1.5s both' }} />
        </>}
      </svg>
      {hp && (
        <div className="glass" style={{ position: 'absolute', left: `${(hp[0] / W) * 100}%`, top: `${(hp[1] / H) * 100}%`, transform: `translate(${hp[0] > W * 0.7 ? '-110%' : '14px'}, -120%)`, padding: '8px 12px', borderRadius: 14, pointerEvents: 'none', whiteSpace: 'nowrap', '--fill': 0.14 }}>
          <div className="faint" style={{ fontSize: 11 }}>{labelFor(series[hover])}</div>
          <div className="num display" style={{ fontSize: 16, fontWeight: 600 }}>{money(series[hover].value, true)}</div>
          {series[hover].sub !== undefined && <div className="num" style={{ fontSize: 11.5 }}><span className="faint">Day </span><span className={series[hover].sub >= 0 ? 'pos' : 'neg'}>{money(series[hover].sub)}</span></div>}
        </div>
      )}
      <div className="num display" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--fg3)', marginTop: 6 }}>
        {labels.map((l, k) => k === labels.length - 1
          ? <span key={l} style={{ background: '#FFFFFF', color: '#000', fontWeight: 600, borderRadius: 99, padding: '6px 12px' }}>{l}</span>
          : <span key={l}>{l}</span>)}
      </div>
    </div>
  )
}

export const dayTick = (p) => (p.date ? dayLabel(p.date) : p.label)

// Vertical pill bars, as in the reference cards
export function PillBars({ items, height = 140, width = 12 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: 12, alignItems: 'end' }}>
      {items.map((it, i) => (
        <div key={it.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span className="num" style={{ fontSize: 12, fontWeight: 600, padding: it.peak ? '5px 10px' : 0, borderRadius: 10, background: it.peak ? '#FFF' : 'transparent', color: it.peak ? '#000' : 'rgba(255,255,255,0.8)', boxShadow: it.peak ? '0 0 18px rgba(255,255,255,0.4)' : 'none' }}>{it.value}</span>
          <div className="well" style={{ width, height, borderRadius: 99, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${Math.max(3, it.pct * 100)}%`, borderRadius: 99, background: it.fill || '#FFFFFF', transformOrigin: 'bottom', animation: `growY 1s var(--ease) ${0.2 + i * 0.07}s both` }} />
          </div>
          <span style={{ fontSize: 11, lineHeight: 1.3, color: 'var(--fg2)', textAlign: 'center' }}>{it.label}</span>
        </div>
      ))}
    </div>
  )
}
