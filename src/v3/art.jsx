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

// Drawn straight onto a small canvas, only when the card is about to come on screen, a few
// per frame. No SVG documents to parse, so switching to the journal stays smooth on phones.
const PAL = {
  light: { ink: '#0B0B0C', dim: '#9AA0A8', line: '#E1E4E8', solid: '#FFFFFF', tp: 'rgba(11,11,12,.09)', hatch: 'rgba(11,11,12,.22)' },
  dark: { ink: '#FFFFFF', dim: 'rgba(255,255,255,.42)', line: 'rgba(255,255,255,.09)', solid: '#0E0E0F', tp: 'rgba(255,255,255,.10)', hatch: 'rgba(255,255,255,.24)' },
}
const VW = 320, VH = 200, PAD = 14
const artCache = new Map()
function artFor(t, n) {
  const key = `${t.id}|${t.symbol}|${t.date}|${t.pnl}|${t.r ?? t.rr}|${t.side}|${n}`
  let a = artCache.get(key)
  if (!a) {
    a = buildArt(t, n)
    if (artCache.size > 1200) artCache.delete(artCache.keys().next().value)
    artCache.set(key, a)
  }
  return a
}

function paintArt(cv, st) {
  const { t, theme, n, labels } = st.job
  const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1)
  const W = Math.max(1, Math.round(st.w * dpr)), H = Math.max(1, Math.round(st.h * dpr))
  if (cv.width !== W) cv.width = W
  if (cv.height !== H) cv.height = H
  const ctx = cv.getContext('2d')
  if (!ctx) return
  const c = PAL[theme] || PAL.light
  const a = artFor(t, n)
  const sx = W / VW, sy = H / VH, sm = (sx + sy) / 2
  let lo = Math.min(a.sl, a.tp), hi = Math.max(a.sl, a.tp)
  for (const k of a.candles) { if (k.l < lo) lo = k.l; if (k.h > hi) hi = k.h }
  const yv = (v) => PAD + (1 - (v - lo) / (hi - lo || 1)) * (VH - PAD * 2) // viewBox units
  const cw = VW / a.candles.length
  const x0 = a.iEntry * cw, x1 = Math.min(VW, (a.iExit + 3) * cw)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, W, H)
  ctx.lineCap = 'butt'
  // grid
  ctx.strokeStyle = c.line; ctx.lineWidth = dpr
  ctx.beginPath()
  for (const g of [0.25, 0.5, 0.75]) { const y = VH * g * sy; ctx.moveTo(0, y); ctx.lineTo(W, y) }
  ctx.stroke()
  // target zone
  const ye = yv(a.entry), yt = yv(a.tp), ys = yv(a.sl)
  ctx.fillStyle = c.tp
  ctx.fillRect(x0 * sx, Math.min(ye, yt) * sy, (x1 - x0) * sx, Math.abs(yt - ye) * sy)
  // stop zone, hatched
  ctx.save()
  ctx.beginPath(); ctx.rect(x0 * sx, Math.min(ye, ys) * sy, (x1 - x0) * sx, Math.abs(ys - ye) * sy); ctx.clip()
  ctx.strokeStyle = c.hatch; ctx.lineWidth = 1.2 * sm
  ctx.beginPath()
  const step = 5 * Math.SQRT2 * sx, top = Math.min(ye, ys) * sy, bot = Math.max(ye, ys) * sy, hgt = bot - top
  for (let x = x0 * sx - hgt * (sx / sy) - step; x < x1 * sx + step; x += step) { ctx.moveTo(x + hgt * (sx / sy), top); ctx.lineTo(x, bot) }
  ctx.stroke()
  ctx.restore()
  // entry line
  ctx.strokeStyle = c.dim; ctx.lineWidth = dpr; ctx.setLineDash([3 * dpr, 3 * dpr])
  ctx.beginPath(); ctx.moveTo(x0 * sx, ye * sy); ctx.lineTo(x1 * sx, ye * sy); ctx.stroke()
  ctx.setLineDash([])
  // candles: two passes so each colour is one path
  for (const up of [true, false]) {
    const col = up ? c.ink : c.dim
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = dpr
    ctx.beginPath()
    a.candles.forEach((k, i) => {
      if ((k.c >= k.o) !== up) return
      const cx = (i * cw + cw / 2) * sx
      ctx.moveTo(cx, yv(k.h) * sy); ctx.lineTo(cx, yv(k.l) * sy)
    })
    ctx.stroke()
    a.candles.forEach((k, i) => {
      if ((k.c >= k.o) !== up) return
      const cx = i * cw + cw / 2
      const yTop = yv(Math.max(k.o, k.c)), bh = Math.max(1, Math.abs(yv(k.o) - yv(k.c)))
      ctx.fillRect((cx - cw * 0.32) * sx, yTop * sy, cw * 0.64 * sx, bh * sy)
    })
  }
  // entry and exit dots
  const dot = (x, y, r, fill, stroke, sw) => {
    ctx.beginPath(); ctx.ellipse(x * sx, y * sy, r * sx, r * sy, 0, 0, Math.PI * 2)
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = sw * sm; ctx.stroke()
  }
  dot(x0 + cw / 2, ye, 3.2, c.solid, c.ink, 1.6)
  if (a.win) dot(a.iExit * cw + cw / 2, yt, 3.6, c.ink, c.solid, 1.4)
  else dot(a.iExit * cw + cw / 2, ys, 3.6, c.solid, c.ink, 1.6)
  const hasPx = labels && t.entry !== null && t.entry !== undefined && t.exit !== null && t.exit !== undefined
  if (hasPx) {
    ctx.save(); ctx.scale(sx, sy)
    ctx.font = '600 9px ui-monospace, SFMono-Regular, Menlo, monospace'; ctx.fillStyle = c.dim; ctx.textBaseline = 'alphabetic'
    ctx.fillText(fmt(Number(t.entry)), 4, Math.max(10, ye - 5))
    ctx.restore()
  }
}

// one shared queue, observers and frame loop for every chart on the page
const states = new Map()
const queue = new Set()
let raf = 0
function run() {
  raf = 0
  const t0 = performance.now()
  for (const cv of queue) {
    queue.delete(cv)
    const st = states.get(cv)
    if (!st || !st.job || !st.vis || !st.w || !st.h || st.done) continue
    try { paintArt(cv, st) } catch { /* a bad row never breaks the page */ }
    st.done = true
    if (!cv.classList.contains('on')) cv.classList.add('on')
    if (performance.now() - t0 > 6) break
  }
  if (queue.size && !raf) raf = requestAnimationFrame(run)
}
function want(cv) {
  const st = states.get(cv)
  if (!st || !st.job || !st.vis || !st.w || st.done) return
  queue.add(cv)
  if (!raf) raf = requestAnimationFrame(run)
}
let io = null, ro = null
function observers() {
  if (io || typeof IntersectionObserver === 'undefined') return
  io = new IntersectionObserver((list) => list.forEach((e) => {
    const st = states.get(e.target); if (!st) return
    st.vis = e.isIntersecting
    if (st.vis) want(e.target)
  }), { rootMargin: '500px 0px 500px 0px' })
  ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver((list) => list.forEach((e) => {
    const st = states.get(e.target); if (!st) return
    const w = Math.round(e.contentRect.width), h = Math.round(e.contentRect.height)
    if (w === st.w && h === st.h) return
    st.w = w; st.h = h; st.done = false
    want(e.target)
  })) : null
}

export function TradeArt({ t, labels = true, className = '' }) {
  const { theme } = useSkin()
  const ref = React.useRef(null)
  const th = theme === 'dark' ? 'dark' : 'light', n = PHONE ? 30 : 46
  const sig = `${t.id}|${t.symbol}|${t.date}|${t.pnl}|${t.r ?? t.rr}|${t.side}|${t.entry}|${t.exit}|${th}|${n}|${labels ? 1 : 0}`
  React.useEffect(() => {
    const cv = ref.current
    if (!cv) return
    observers()
    states.set(cv, { vis: !io, w: 0, h: 0, done: false, job: null })
    if (io) io.observe(cv)
    if (ro) ro.observe(cv)
    else { const st = states.get(cv); st.w = cv.clientWidth; st.h = cv.clientHeight }
    return () => { if (io) io.unobserve(cv); if (ro) ro.unobserve(cv); queue.delete(cv); states.delete(cv) }
  }, [])
  React.useEffect(() => {
    const cv = ref.current, st = cv && states.get(cv)
    if (!st) return
    st.job = { t, theme: th, n, labels }
    st.done = false
    want(cv)
  }, [sig]) // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} className={'tart ' + className} aria-hidden="true" />
}

// Screenshot if the trade has one, else the generated chart
export function TradeImage({ t, className = '' }) {
  const shot = t.shots && t.shots[0]
  if (shot) return <img className={'timg ' + className} src={shot} alt={`${t.symbol} chart`} loading="lazy" />
  return <TradeArt t={t} className={className} />
}
