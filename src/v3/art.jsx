// Generated trade chart. Every trade gets a picture: the real screenshot when there is one,
// otherwise a candle chart drawn from the trade itself (side, result, R, entry and exit).
import React from 'react'

const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
const fmt = (v) => (Math.abs(v) >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : Number(v.toFixed(Math.abs(v) < 10 ? 4 : 2)).toString())

export function buildArt(t, n = 46) {
  let z = hash(t.id || t.symbol + t.date) || 7
  const r = () => ((z = (z * 1664525 + 1013904223) >>> 0) / 2 ** 32)
  const long = !/short|sell/i.test(t.side || '')
  const dir = long ? 1 : -1
  const win = t.pnl > 0
  const R = Math.min(4, Math.max(0.4, Math.abs(t.r ?? t.rr ?? (win ? 1.8 : 1))))
  const risk = 1
  const iEntry = Math.floor(n * (0.5 + r() * 0.12))
  // walk into the entry: price pulls back against the trade, then the entry candle
  const pts = []
  let p = 0
  for (let i = 0; i < iEntry; i++) {
    const pull = i > iEntry - 8 ? -dir * 0.22 : (r() - 0.5) * 0.1
    p += pull + (r() - 0.5) * 0.55
    pts.push(p)
  }
  const entry = p
  const target = entry + dir * (win ? R : -1) * risk
  const left = n - iEntry
  const iExit = iEntry + Math.max(4, Math.floor(left * (0.55 + r() * 0.3)))
  for (let i = iEntry; i < n; i++) {
    if (i <= iExit) {
      const k = (i - iEntry + 1) / (iExit - iEntry + 1)
      const ease = k * k * (3 - 2 * k)
      p = entry + (target - entry) * ease + (r() - 0.5) * 0.45 * (1 - k * 0.6)
      if (i === iExit) p = target
    } else p += (r() - 0.5) * 0.4
    pts.push(p)
  }
  const candles = pts.map((c, i) => {
    const o = i ? pts[i - 1] : c - 0.2
    const wick = 0.15 + r() * 0.35
    return { o, c, h: Math.max(o, c) + wick * r(), l: Math.min(o, c) - wick * r() }
  })
  const tp = entry + dir * R * risk, sl = entry - dir * risk
  return { candles, iEntry, iExit, entry, tp, sl, long, win, R }
}

const PHONE = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 760px)').matches

export function TradeArt({ t, labels = true, className = '' }) {
  const a = React.useMemo(() => buildArt(t, PHONE ? 30 : 46), [t.id, t.pnl, t.r, t.side])
  const W = 320, H = 200, pad = 14
  const lo = Math.min(a.sl, a.tp, ...a.candles.map((c) => c.l)), hi = Math.max(a.sl, a.tp, ...a.candles.map((c) => c.h))
  const y = (v) => pad + (1 - (v - lo) / (hi - lo || 1)) * (H - pad * 2)
  const cw = W / a.candles.length
  const x0 = a.iEntry * cw, x1 = Math.min(W, (a.iExit + 3) * cw)
  const pid = 'h' + React.useId().replace(/[^a-zA-Z0-9]/g, '')
  const hasPx = t.entry !== null && t.entry !== undefined && t.exit !== null && t.exit !== undefined
  return (
    <svg className={'tart ' + className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs><pattern id={pid} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" className="tart-hatch" /></pattern></defs>
      {[0.25, 0.5, 0.75].map((g) => <line key={g} className="tart-grid" x1="0" x2={W} y1={H * g} y2={H * g} />)}
      <rect className="tart-tp" x={x0} width={x1 - x0} y={Math.min(y(a.entry), y(a.tp))} height={Math.abs(y(a.tp) - y(a.entry))} />
      <rect className="tart-sl" fill={`url(#${pid})`} x={x0} width={x1 - x0} y={Math.min(y(a.entry), y(a.sl))} height={Math.abs(y(a.sl) - y(a.entry))} />
      <line className="tart-entry" x1={x0} x2={x1} y1={y(a.entry)} y2={y(a.entry)} />
      {a.candles.map((c, i) => {
        const up = c.c >= c.o, cx = i * cw + cw / 2
        return (
          <g key={i} className={up ? 'tart-up' : 'tart-dn'} style={{ '--i': i }}>
            <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} />
            <rect x={cx - cw * 0.32} width={cw * 0.64} y={y(Math.max(c.o, c.c))} height={Math.max(1, Math.abs(y(c.o) - y(c.c)))} rx="0.6" />
          </g>
        )
      })}
      <circle className="tart-in" cx={x0 + cw / 2} cy={y(a.entry)} r="3.2" />
      <circle className={a.win ? 'tart-out win' : 'tart-out loss'} cx={a.iExit * cw + cw / 2} cy={y(a.win ? a.tp : a.sl)} r="3.6" />
      {labels && hasPx && <text className="tart-lbl" x={4} y={Math.max(10, y(a.entry) - 5)}>{fmt(Number(t.entry))}</text>}
    </svg>
  )
}

// Screenshot if the trade has one, else the generated chart
export function TradeImage({ t, className = '' }) {
  const shot = t.shots && t.shots[0]
  if (shot) return <img className={'timg ' + className} src={shot} alt={`${t.symbol} chart`} loading="lazy" />
  return <TradeArt t={t} className={className} />
}
