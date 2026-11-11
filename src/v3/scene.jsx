// Live background scenes for the new look. They react to how your week is going:
// calm green light on an up week, warm red on a down week, silver when flat.
import React from 'react'
import { useStore } from './store.jsx'
import { useSkin, Terrain } from './skin.jsx'
import { isoLocal } from './data.js'
import Ink from './ink.jsx'

const still = () => document.documentElement.getAttribute('data-motion') === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches

function useMood() {
  const { trades } = useStore()
  return React.useMemo(() => {
    const from = new Date(); from.setDate(from.getDate() - 6)
    const f = isoLocal(from)
    const net = trades.filter((t) => t.date >= f).reduce((s, t) => s + t.pnl, 0)
    return net > 0 ? 'up' : net < 0 ? 'down' : 'flat'
  }, [trades])
}

const PHONE = typeof matchMedia !== 'undefined' && (matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 760px)').matches)
// CSS ease-in-out, cubic-bezier(.42, 0, .58, 1)
function ease(x) {
  if (x <= 0) return 0; if (x >= 1) return 1
  let t = x
  for (let i = 0; i < 6; i++) { const u = 1 - t, bx = 3 * u * u * t * 0.42 + 3 * u * t * t * 0.58 + t * t * t, d = 3 * u * u * 0.42 + 6 * u * t * (0.58 - 0.42) + 3 * t * t * (1 - 0.58); if (Math.abs(bx - x) < 1e-4 || !d) break; t -= (bx - x) / d }
  const u = 1 - t
  return 3 * u * t * t + t * t * t
}
const swing = (t, dur) => { const q = (t / dur) % 2; return q <= 1 ? q : 2 - q }
const MOVES = [[22, 10, 1.25, 26], [-26, 14, 0.85, 32], [12, -22, 1.2, 38]]
const DRIFT = [[-2, -1, -1.2, 1.02], [1.5, 1.5, 0.6, 1.05], [2, -1.5, 1.4, 1.03]]

// Silver haze. Drawn on a small canvas a few times a second instead of a huge CSS blur
// that had to be redone on every screen refresh. The soft look comes from scaling it up.
export function Haze({ mood = 'flat', drift }) {
  const box = React.useRef(null), cvRef = React.useRef(null)
  React.useEffect(() => {
    const el = box.current, cv = cvRef.current
    if (!el || !cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const blur = 'filter' in ctx
    let geo = null, k = 0.12, raf = 0, last = -1e9, hold = 0, dead = false
    // the haze drifts about 1px per tick at this rate, so it still reads as smooth motion
    const gap = 1000 / (PHONE ? 12 : 15)
    const rgba = (c, a) => { ctx.fillStyle = '#000'; ctx.fillStyle = c || '#888'; const v = ctx.fillStyle; if (v[0] === '#') { const n = parseInt(v.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})` } return v.replace(/rgba?\(([^,]+),([^,]+),([^,)]+)(,[^)]*)?\)/, `rgba($1,$2,$3,${a})`) }
    const measure = () => {
      const W = el.offsetWidth, H = el.offsetHeight
      if (!W || !H) { geo = null; return }
      k = Math.min(0.2, 320 / Math.max(W, H))
      cv.width = Math.max(2, Math.round(W * k)); cv.height = Math.max(2, Math.round(H * k))
      const cs = getComputedStyle(el)
      const light = document.body.classList.contains('v4-light')
      geo = {
        blend: light ? 'multiply' : 'screen',
        b: [...el.querySelectorAll('i')].map((i, j) => {
          const c = cs.getPropertyValue('--c' + (j + 1)).trim()
          return { x: i.offsetLeft, y: i.offsetTop, w: i.offsetWidth, h: i.offsetHeight, op: parseFloat(getComputedStyle(i).opacity) || 1, c0: rgba(c, 1), c1: rgba(c, 0) }
        }),
      }
    }
    const paint = (now) => {
      if (!geo) return
      const t = now / 1000, vw = innerWidth / 100, vh = innerHeight / 100
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1
      if (blur) ctx.filter = 'none'
      ctx.clearRect(0, 0, cv.width, cv.height)
      if (blur) ctx.filter = `blur(${Math.max(1, 80 * k).toFixed(1)}px)`
      ctx.globalCompositeOperation = geo.blend
      geo.b.forEach((b, j) => {
        const [dx, dy, sc, dur] = MOVES[j] || MOVES[0]
        const p = ease(swing(t, dur)), s = 1 + (sc - 1) * p
        const cx = b.x + b.w / 2 + dx * vw * p, cy = b.y + b.h / 2 + dy * vh * p
        ctx.save()
        ctx.globalAlpha = b.op
        ctx.translate(cx * k, cy * k); ctx.scale((b.w / 2) * s * k, (b.h / 2) * s * k)
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
        g.addColorStop(0, b.c0); g.addColorStop(1, b.c1)
        ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2)
        ctx.restore()
      })
      const d = drift && drift.current
      if (d) {
        const q = swing(t, 70), seg = q < 0.5 ? 0 : 1, u = ease((q - seg * 0.5) * 2), A = DRIFT[seg], B = DRIFT[seg + 1]
        const L = (i) => A[i] + (B[i] - A[i]) * u
        d.style.transform = `translate3d(${(L(0) * d.offsetWidth / 100).toFixed(1)}px, ${(L(1) * d.offsetHeight / 100).toFixed(1)}px, 0) rotate(${L(2).toFixed(3)}deg) scale(${L(3).toFixed(4)})`
      }
    }
    // a popup covers the page: hold still (time stands still, so it resumes without a jump)
    let prev = 0, lost = 0
    const frame = (now) => {
      if (dead) return
      raf = requestAnimationFrame(frame)
      const dt = prev ? Math.min(now - prev, 100) : 0; prev = now
      if (document.querySelector('.overlay')) { lost += dt; return }
      if (now - last < gap || now < hold) return
      last = now; paint(now - lost)
    }
    measure(); paint(performance.now())
    // the theme classes land on <body> right after this mounts, so look again next frame
    const r0 = requestAnimationFrame(() => { if (dead) return; measure(); paint(performance.now()); if (!still()) raf = requestAnimationFrame(frame) })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { measure(); paint(performance.now() - lost) }) : null
    ro && ro.observe(el)
    const onScroll = () => { hold = performance.now() + 180 }
    addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => { dead = true; cancelAnimationFrame(r0); cancelAnimationFrame(raf); ro && ro.disconnect(); removeEventListener('scroll', onScroll, { capture: true }) }
  }, [drift])
  return (
    <div ref={box} className={'sk-aurora cv ' + mood} aria-hidden="true">
      <i className="a1" /><i className="a2" /><i className="a3" />
      <canvas ref={cvRef} className="sk-haze-cv" />
    </div>
  )
}

export function Scene({ light }) {
  const { scene } = useSkin()
  const mood = useMood()
  const drift = React.useRef(null)
  return (
    <div className={'sk-scene ' + (scene === 'aurora' ? 'aurora' : 'ink')} aria-hidden="true">
      {scene !== 'aurora' && <Ink key={light ? 'l' : 'd'} phoneFps={15} phoneScale={0.45} range={light ? [0.865, 0.985] : [0.012, 0.13]} highlight={light ? 0.07 : 0.16} zoom={1.25} scale={0.42} />}
      {scene === 'aurora' && <Haze key={light ? 'l' : 'd'} mood={mood} drift={drift} />}
      {scene === 'aurora' && <div ref={drift} className="sk-terrain drift js"><Terrain light={light} /></div>}
    </div>
  )
}
