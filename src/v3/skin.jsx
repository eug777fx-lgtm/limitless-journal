// LIMITLESS v4 skin: the new look for every page. Owner only for now; index.jsx
// switches it on for the super admin, everyone else keeps the current glass app.
import React from 'react'
import { Sun, Moon, Sparkles, Clapperboard, Check } from 'lucide-react'
import { isoLocal } from './data.js'

const ON = 'ltj_v4_on', THEME = 'ltj_v4_theme', SAMPLE = 'ltj_v4_sample', SCENE = 'ltj_v4_scene2'
export const SCENES = [['ink', 'Liquid paint'], ['aurora', 'Silver haze'], ['drive', 'Night drive'], ['terrain', 'Terrain'], ['still', 'Still']]
const read = (k, d) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const write = (k, v) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } }

let state = { on: read(ON, '1') === '1', theme: read(THEME, 'light') === 'dark' ? 'dark' : 'light', sample: read(SAMPLE, '0') === '1', scene: SCENES.some(([k]) => k === read(SCENE, '')) ? read(SCENE, '') : 'ink' }
const subs = new Set()
export function setSkin(patch) {
  state = { ...state, ...patch }
  if ('on' in patch) write(ON, state.on ? '1' : '0')
  if ('theme' in patch) write(THEME, state.theme)
  if ('sample' in patch) write(SAMPLE, state.sample ? '1' : '0')
  if ('scene' in patch) write(SCENE, state.scene)
  subs.forEach((f) => f())
}
const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }
export const useSkin = () => React.useSyncExternalStore(subscribe, () => state)

// Applies the skin to <body> so the nav, sheets and modals follow it too
export function useSkinActive(owner) {
  const s = useSkin()
  const active = !!owner && s.on
  const light = active && s.theme === 'light'
  React.useLayoutEffect(() => {
    const b = document.body
    b.classList.toggle('v4-skin', active)
    b.classList.toggle('v4-light', light)
    document.documentElement.classList.toggle('v4-light-root', light)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', light ? '#F1F2F3' : '#000000')
  }, [active, light])
  React.useEffect(() => () => {
    document.body.classList.remove('v4-skin', 'v4-light')
    document.documentElement.classList.remove('v4-light-root')
  }, [])
  return active
}

// Theme switch + way back to the old look, shown in every page header
export function SkinTools({ children }) {
  const s = useSkin()
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    if (!open) return
    const close = (e) => { if (!e.target.closest || !e.target.closest('.sk-scenes')) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  return (
    <div className="sk-tools">
      {children}
      <span className="sk-owner">Only you see this <button type="button" onClick={() => setSkin({ on: false })}>Old view</button></span>
      <button type="button" className="sk-old" title="Only you see the new look" onClick={() => setSkin({ on: false })}>Old view</button>
      <span className="sk-scenes">
        <button type="button" className="sk-ibtn" aria-label="Background scene" aria-expanded={open} onClick={() => setOpen((o) => !o)}><Clapperboard size={16} /></button>
        {open && (
          <span className="sk-menu" role="menu">
            <span className="sk-mono" style={{ padding: '4px 10px 6px' }}>Scene · move your mouse</span>
            {SCENES.map(([k, l]) => (
              <button key={k} type="button" role="menuitemradio" aria-checked={s.scene === k} onClick={() => { setSkin({ scene: k }); setOpen(false) }}>{l}{s.scene === k && <Check size={14} />}</button>
            ))}
          </span>
        )}
      </span>
      <button type="button" className="sk-ibtn" aria-label={s.theme === 'light' ? 'Dark mode' : 'Light mode'} onClick={() => setSkin({ theme: s.theme === 'light' ? 'dark' : 'light' })}>
        {s.theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
      </button>
    </div>
  )
}

export function SkinReturn() {
  return (
    <button type="button" className="sk-return" onClick={() => setSkin({ on: true })}><Sparkles size={15} /> Try the new look</button>
  )
}

export function SampleBanner() {
  const s = useSkin()
  if (!s.sample) return null
  return <span className="sk-owner">Sample trades <button type="button" onClick={() => setSkin({ sample: false })}>Hide</button></span>
}

// Contour lines behind every page
export function Terrain({ light }) {
  const ref = React.useRef(null)
  React.useEffect(() => {
    const draw = () => {
      const cv = ref.current; if (!cv) return
      const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight
      cv.width = W * dpr; cv.height = H * dpr
      const c = cv.getContext('2d'); c.scale(dpr, dpr); c.clearRect(0, 0, W, H)
      const f = (x, y) => Math.sin(x * 0.0042 + Math.sin(y * 0.003) * 1.6) + Math.cos(y * 0.0051 + Math.sin(x * 0.0024) * 1.8) + 0.6 * Math.sin((x + y) * 0.0029)
      c.strokeStyle = light ? 'rgba(11,11,12,.065)' : 'rgba(255,255,255,.05)'; c.lineWidth = 1
      const s = 12
      for (let lv = -2.4; lv <= 2.4; lv += 0.32) {
        c.beginPath()
        for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s) {
          const a = f(x, y) - lv, b = f(x + s, y) - lv, dd = f(x, y + s) - lv, e = f(x + s, y + s) - lv, P = []
          if (a * b < 0) P.push([x + s * a / (a - b), y]); if (b * e < 0) P.push([x + s, y + s * b / (b - e)])
          if (dd * e < 0) P.push([x + s * dd / (dd - e), y + s]); if (a * dd < 0) P.push([x, y + s * a / (a - dd)])
          if (P.length >= 2) { c.moveTo(P[0][0], P[0][1]); c.lineTo(P[1][0], P[1][1]) }
          if (P.length === 4) { c.moveTo(P[2][0], P[2][1]); c.lineTo(P[3][0], P[3][1]) }
        }
        c.stroke()
      }
    }
    draw(); addEventListener('resize', draw)
    return () => removeEventListener('resize', draw)
  }, [light])
  return <canvas ref={ref} className="v4-terrain" aria-hidden="true" />
}

// Example trades (database row shape) so an empty account can preview every page
export function sampleRows() {
  let z = 11; const r = () => ((z = (z * 1664525 + 1013904223) >>> 0) / 2 ** 32)
  const pick = (a) => a[Math.floor(r() * a.length)]
  const out = [], now = new Date()
  for (let d = 420; d >= 0; d--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d), wd = day.getDay()
    if (wd === 0 || wd === 6 || r() < 0.2) continue
    for (let k = 0, n = 1 + Math.floor(r() * 2.2); k < n; k++) {
      const win = r() < 0.56, size = 120 + r() * 520
      const pnl = Math.round((win ? size * (1 + r() * 1.6) : -size * (0.55 + r() * 0.6)) * 100) / 100
      const rr = Math.round((win ? 1 + r() * 2.4 : 0.6 + r() * 0.5) * 10) / 10
      out.push({
        id: `sample-${d}-${k}`, trade_date: isoLocal(day), created_at: `${isoLocal(day)}T${String(8 + k * 3).padStart(2, '0')}:30:00`,
        symbol: pick(['NQ', 'ES', 'MNQ', 'XAU/USD', 'EUR/USD']), direction: r() < 0.55 ? 'Long' : 'Short', pnl, rr,
        session: pick(['London', 'New York', 'Asia', 'New York']), emotional_state: pick(['Calm', 'Focused', 'Confident', 'Anxious']),
        trade_rating: pick(['A+', 'A', 'B', 'C']), tags: [pick(['Breakout', 'Pullback', 'Reversal', 'Range'])], followed_plan: win ? pick(['YES', 'YES', 'PARTIALLY']) : pick(['YES', 'NO', 'PARTIALLY']),
        entry_reason: 'Example trade for the preview', did_correctly: '', did_wrong: '', notes: '', chart_url: null,
      })
    }
  }
  return out
}
