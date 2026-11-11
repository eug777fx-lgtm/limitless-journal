// Generated trade chart. Every trade gets a picture: the real screenshot when there is one,
// otherwise a candle chart drawn from the trade itself (side, result, R, entry and exit).
import React from 'react'
import { useSkin } from './skin.jsx'

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

// Drawn once to a picture and cached, so a journal full of charts stays light to scroll.
const PAL = {
  light: { ink: '#0B0B0C', dim: '#9AA0A8', line: '#E1E4E8', solid: '#FFFFFF', tp: 'rgba(11,11,12,.09)', hatch: 'rgba(11,11,12,.22)' },
  dark: { ink: '#FFFFFF', dim: 'rgba(255,255,255,.42)', line: 'rgba(255,255,255,.09)', solid: '#0E0E0F', tp: 'rgba(255,255,255,.10)', hatch: 'rgba(255,255,255,.24)' },
}
const cache = new Map()
function artUrl(t, theme, n, labels) {
  const key = `${t.id}|${t.pnl}|${t.r}|${t.side}|${theme}|${n}|${labels ? 1 : 0}`
  const hit = cache.get(key); if (hit) return hit
  const c = PAL[theme] || PAL.light
  const a = buildArt(t, n)
  const W = 320, H = 200, pad = 14
  const lo = Math.min(a.sl, a.tp, ...a.candles.map((k) => k.l)), hi = Math.max(a.sl, a.tp, ...a.candles.map((k) => k.h))
  const y = (v) => (pad + (1 - (v - lo) / (hi - lo || 1)) * (H - pad * 2)).toFixed(1)
  const cw = W / a.candles.length
  const x0 = a.iEntry * cw, x1 = Math.min(W, (a.iExit + 3) * cw)
  const r = (n2) => n2.toFixed(1)
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`
  svg += `<defs><pattern id="h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="${c.hatch}" stroke-width="1.2"/></pattern></defs>`
  ;[0.25, 0.5, 0.75].forEach((g) => { svg += `<line x1="0" x2="${W}" y1="${H * g}" y2="${H * g}" stroke="${c.line}" stroke-width="1" vector-effect="non-scaling-stroke"/>` })
  svg += `<rect x="${r(x0)}" width="${r(x1 - x0)}" y="${Math.min(y(a.entry), y(a.tp))}" height="${Math.abs(y(a.tp) - y(a.entry)).toFixed(1)}" fill="${c.tp}"/>`
  svg += `<rect x="${r(x0)}" width="${r(x1 - x0)}" y="${Math.min(y(a.entry), y(a.sl))}" height="${Math.abs(y(a.sl) - y(a.entry)).toFixed(1)}" fill="url(#h)"/>`
  svg += `<line x1="${r(x0)}" x2="${r(x1)}" y1="${y(a.entry)}" y2="${y(a.entry)}" stroke="${c.dim}" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>`
  a.candles.forEach((k, i) => {
    const col = k.c >= k.o ? c.ink : c.dim, cx = i * cw + cw / 2
    svg += `<line x1="${r(cx)}" x2="${r(cx)}" y1="${y(k.h)}" y2="${y(k.l)}" stroke="${col}" stroke-width="1" vector-effect="non-scaling-stroke"/>`
    svg += `<rect x="${r(cx - cw * 0.32)}" width="${r(cw * 0.64)}" y="${y(Math.max(k.o, k.c))}" height="${Math.max(1, Math.abs(y(k.o) - y(k.c))).toFixed(1)}" fill="${col}"/>`
  })
  svg += `<circle cx="${r(x0 + cw / 2)}" cy="${y(a.entry)}" r="3.2" fill="${c.solid}" stroke="${c.ink}" stroke-width="1.6"/>`
  svg += a.win ? `<circle cx="${r(a.iExit * cw + cw / 2)}" cy="${y(a.tp)}" r="3.6" fill="${c.ink}" stroke="${c.solid}" stroke-width="1.4"/>` : `<circle cx="${r(a.iExit * cw + cw / 2)}" cy="${y(a.sl)}" r="3.6" fill="${c.solid}" stroke="${c.ink}" stroke-width="1.6"/>`
  const hasPx = labels && t.entry !== null && t.entry !== undefined && t.exit !== null && t.exit !== undefined
  if (hasPx) svg += `<text x="4" y="${Math.max(10, Number(y(a.entry)) - 5)}" font-family="monospace" font-size="9" font-weight="600" fill="${c.dim}">${fmt(Number(t.entry))}</text>`
  svg += '</svg>'
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  if (cache.size > 800) cache.delete(cache.keys().next().value)
  cache.set(key, url)
  return url
}

export function TradeArt({ t, labels = true, className = '' }) {
  const { theme } = useSkin()
  const url = artUrl(t, theme === 'dark' ? 'dark' : 'light', PHONE ? 30 : 46, labels)
  return <img className={'tart ' + className} src={url} alt="" decoding="async" draggable="false" />
}

// Screenshot if the trade has one, else the generated chart
export function TradeImage({ t, className = '' }) {
  const shot = t.shots && t.shots[0]
  if (shot) return <img className={'timg ' + className} src={shot} alt={`${t.symbol} chart`} loading="lazy" />
  return <TradeArt t={t} className={className} />
}
