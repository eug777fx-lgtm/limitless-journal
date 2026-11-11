// Background behind the P&L panel. Live liquid paint by default; the trader can switch to
// silver haze, the brushstroke painting, or upload their own picture (kept on this device).
import React from 'react'
import { createPortal } from 'react-dom'
import { ImagePlus, Check, Upload, Trash2 } from 'lucide-react'
import { useSkin, setSkin } from './skin.jsx'
import Ink from './ink.jsx'

export function HeroBg({ theme }) {
  const { hero, heroImg, heroColor } = useSkin()
  const light = theme === 'light'
  if (hero === 'haze') return <div className="hero-haze" aria-hidden="true"><div className="sk-aurora"><i className="a1" /><i className="a2" /><i className="a3" /></div></div>
  if (hero === 'art') return <span className={'hero-art ' + theme} aria-hidden="true"><i /></span>
  if (hero === 'custom' && heroImg) return <span className={'hero-art custom' + (heroColor ? ' color' : '')} aria-hidden="true"><i style={{ backgroundImage: `url(${heroImg})` }} /></span>
  return <Ink className="hero-ink" range={light ? [0.7, 1.0] : [0.0, 0.26]} highlight={light ? 0.12 : 0.26} zoom={1.05} scale={0.6} seed={7.7} />
}

// Shrink an uploaded picture so it fits in the browser's storage
function shrink(file) {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, 1800 / Math.max(img.width, img.height))
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(img.src)
      let q = 0.82, out = c.toDataURL('image/jpeg', q)
      while (out.length > 1_400_000 && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q) }
      res(out)
    }
    img.onerror = rej
    img.src = URL.createObjectURL(file)
  })
}

const OPTIONS = [['paint', 'Liquid paint', 'Live'], ['haze', 'Silver haze', 'Live'], ['art', 'Brushstrokes', 'Painting'], ['custom', 'Your image', 'Upload']]

export function HeroPicker() {
  const s = useSkin()
  const [open, setOpen] = React.useState(false)
  const [err, setErr] = React.useState('')
  const input = React.useRef(null)
  const btn = React.useRef(null)
  const [pos, setPos] = React.useState(null)
  React.useLayoutEffect(() => {
    if (!open) return
    const place = () => { const r = btn.current.getBoundingClientRect(); setPos({ top: r.bottom + 8, right: Math.max(12, innerWidth - r.right) }) }
    place(); addEventListener('resize', place); addEventListener('scroll', place, true)
    return () => { removeEventListener('resize', place); removeEventListener('scroll', place, true) }
  }, [open])
  React.useEffect(() => {
    if (!open) return
    const close = (e) => { if (!e.target.closest || !(e.target.closest('.hp') || e.target.closest('.hp-menu'))) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  const upload = async (f) => {
    if (!f || !f.type.startsWith('image/')) return
    setErr('')
    try { setSkin({ heroImg: await shrink(f), hero: 'custom' }) } catch { setErr('That image could not be read. Try a JPG or PNG.') }
  }
  return (
    <span className="hp">
      <button ref={btn} type="button" className="hp-btn" aria-label="Change the panel background" aria-expanded={open} onClick={() => setOpen((o) => !o)}><ImagePlus size={15} /></button>
      {open && pos && createPortal(
        <span className="hp-menu" role="dialog" aria-label="Panel background" style={{ top: pos.top, right: pos.right }}>
          <span className="sk-mono">Panel background</span>
          <span className="hp-grid">
            {OPTIONS.map(([k, l, sub]) => {
              const on = s.hero === k
              const pick = () => (k === 'custom' && !s.heroImg ? input.current.click() : setSkin({ hero: k }))
              return (
                <button key={k} type="button" className={'hp-opt ' + k + (on ? ' on' : '')} aria-pressed={on} onClick={pick}>
                  <span className="hp-thumb" style={k === 'custom' && s.heroImg ? { backgroundImage: `url(${s.heroImg})` } : null}>
                    {k === 'custom' && !s.heroImg && <Upload size={16} />}
                    {on && <i><Check size={12} strokeWidth={3} /></i>}
                  </span>
                  <b>{l}</b><small>{sub}</small>
                </button>
              )
            })}
          </span>
          <span className="hp-row">
            <button type="button" className="hp-link" onClick={() => input.current.click()}><Upload size={13} /> {s.heroImg ? 'Replace image' : 'Upload an image'}</button>
            {s.heroImg && <button type="button" className="hp-link" onClick={() => setSkin({ heroImg: '', hero: s.hero === 'custom' ? 'paint' : s.hero })}><Trash2 size={13} /> Remove</button>}
          </span>
          {s.heroImg && (
            <label className="hp-toggle"><input type="checkbox" checked={s.heroColor} onChange={(e) => setSkin({ heroColor: e.target.checked })} /> Keep my image in color</label>
          )}
          {err && <span className="hp-err">{err}</span>}
        </span>,
        document.body,
      )}
      <input ref={input} type="file" accept="image/*" className="sr" onChange={(e) => { upload(e.target.files[0]); e.target.value = '' }} />
    </span>
  )
}
