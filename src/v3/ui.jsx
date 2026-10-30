import React from 'react'
import { Check, X } from 'lucide-react'
import { useStore } from './store.jsx'

export const LOGO = '/logo2.png'

export function Logo({ size = 26 }) {
  return <img src={LOGO} alt="" width={size} style={{ width: size, height: 'auto', display: 'block' }} />
}

// Giant word size: never wider than the screen, never larger than `size`
export const wordSize = (word, size) => `min(${size}px, ${(94 / (Math.max(4, word.length) * 0.66)).toFixed(1)}vw)`

// Black stage with spotlight, grid and the giant word that blurs through glass
export function Backdrop({ word, top = 110, size = 236, orbs = [] }) {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="grid" />
      <div className="spot" />
      {orbs.map((o, i) => <div key={i} className="orb" style={o} />)}
      {word && <div className="word" data-word={word} style={{ top, fontSize: wordSize(word, size) }}>{word}</div>}
    </div>
  )
}

// Segmented control with a sliding white pill
export function Seg({ options, value, onChange, label, className = '', style }) {
  const ref = React.useRef(null)
  const [pill, setPill] = React.useState(null)
  React.useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current && ref.current.querySelector('[aria-pressed="true"]')
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth })
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (ro && ref.current) ro.observe(ref.current)
    return () => ro && ro.disconnect()
  }, [value, options.length])
  return (
    <div ref={ref} className={'seg well ' + className} role="group" aria-label={label} style={style}>
      {pill && <span className="seg-pill" style={{ left: pill.left, width: pill.width }} />}
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        return <button key={v} type="button" aria-pressed={value === v ? 'true' : 'false'} onClick={() => onChange(v)}>{l}</button>
      })}
    </div>
  )
}

// Number that counts to its value
export function CountUp({ value, format = (v) => String(Math.round(v)), duration = 1100 }) {
  const [shown, setShown] = React.useState(value)
  const from = React.useRef(0)
  React.useEffect(() => {
    const reduce = document.documentElement.getAttribute('data-motion') === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setShown(value); from.current = value; return }
    const start = performance.now(), a = from.current, b = value
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const e = 1 - Math.pow(1 - p, 4)
      setShown(a + (b - a) * e)
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = b
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{format(shown)}</>
}

// Progress ring
export function Ring({ pct, size = 104, stroke = 10, label, sub }) {
  const r = 50 - stroke / 2
  const len = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, pct))
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${Math.round(p * 100)} percent ${sub || ''}`} style={{ flexShrink: 0 }}>
      <circle cx="50" cy="50" r={r} fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
      <circle cx="50" cy="50" r={r} fill="none" stroke="#FFFFFF" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${len * p} ${len}`} transform="rotate(-90 50 50)"
        style={{ '--len': len * p, strokeDashoffset: 0, animation: 'ring 1.4s var(--ease) .3s both', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.55))' }} />
      <text x="50" y={sub ? 52 : 57} textAnchor="middle" fill="#FFFFFF" style={{ font: '700 20px Poppins, sans-serif' }}>{label}</text>
      {sub && <text x="50" y="68" textAnchor="middle" fill="rgba(255,255,255,0.6)" style={{ font: '500 9px Inter, sans-serif' }}>{sub}</text>}
    </svg>
  )
}

export function Bar({ pct, fill, delay = 0.2 }) {
  return (
    <div className="bar well">
      <i style={{ width: `${Math.max(0, Math.min(100, pct * 100))}%`, background: fill, '--d': delay + 's', boxShadow: '0 0 14px rgba(255,255,255,0.3)' }} />
    </div>
  )
}

export function Modal({ open, onClose, label, children, maxWidth = 780 }) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="overlay sheet" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal glass" role="dialog" aria-modal="true" aria-label={label} style={{ maxWidth }}>{children}</div>
    </div>
  )
}

export function CloseBtn({ onClick, label = 'Close' }) {
  return <button type="button" className="icon-btn well" aria-label={label} onClick={onClick}><X size={16} /></button>
}

export function ToastHost() {
  const { toast } = useStore()
  if (!toast) return null
  return (
    <div key={toast.id} className={"toast glass" + (toast.tone === "err" ? " err" : "")} role="status">
      <span className="check" style={{ width: 28, height: 28 }}>{toast.tone === "err" ? <X size={15} strokeWidth={3} /> : <Check size={15} strokeWidth={3} />}</span>
      {toast.text}
    </div>
  )
}

// Tracks the pointer over glass so its specular highlight follows it
export function useGlassLight() {
  React.useEffect(() => {
    let last = null
    const on = (e) => {
      const el = e.target.closest && e.target.closest('.glass')
      if (!el) return
      if (last && last !== el) { last.style.removeProperty('--mx'); last.style.removeProperty('--my') }
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
      last = el
    }
    document.addEventListener('pointermove', on, { passive: true })
    return () => document.removeEventListener('pointermove', on)
  }, [])
}

export const PnL = ({ v, cents = false, className = '' }) => {
  const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })
  const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : 'muted'
  return <span className={`num ${cls} ${className}`}>{v > 0 ? '+$' : v < 0 ? '−$' : '$'}{abs}</span>
}
