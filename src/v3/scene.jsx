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

function Aurora({ mood }) {
  return (
    <div className={'sk-aurora ' + mood} aria-hidden="true">
      <i className="a1" /><i className="a2" /><i className="a3" />
    </div>
  )
}

// Long exposure light trails on a curved highway
function Drive({ light, mood }) {
  const ref = React.useRef(null)
  React.useEffect(() => {
    const cv = ref.current; if (!cv) return
    const c = cv.getContext('2d')
    let W = 0, H = 0, raf = 0, last = 0
    const size = () => { W = cv.width = Math.round(innerWidth * 0.75); H = cv.height = Math.round(innerHeight * 0.75) }
    size(); addEventListener('resize', size)
    const lanes = 9
    // lane path: from bottom left, sweeping to the horizon on the right
    const at = (lane, k) => {
      const spread = (lane - (lanes - 1) / 2) / lanes
      const x = W * (-0.1 + k * 1.2)
      const y = H * (0.95 - k * 0.55 + Math.sin(k * 3.1 + 0.6) * 0.06) + spread * H * 0.5 * (1 - k * 0.8)
      return [x, y]
    }
    const share = mood === 'up' ? 0.8 : mood === 'down' ? 0.25 : 0.55
    const cars = Array.from({ length: 42 }, (_, i) => ({ lane: i % lanes, k: Math.random(), v: 0.0012 + Math.random() * 0.0024, head: Math.random() < share }))
    const col = (head) => (light ? (head ? 'rgba(11,11,12,' : 'rgba(110,116,124,') : (head ? 'rgba(255,255,255,' : 'rgba(150,150,156,'))
    const frame = (t) => {
      raf = requestAnimationFrame(frame)
      if (t - last < 33) return
      last = t
      c.globalCompositeOperation = 'destination-out'
      c.fillStyle = 'rgba(0,0,0,0.085)'; c.fillRect(0, 0, W, H)
      c.globalCompositeOperation = light ? 'source-over' : 'lighter'
      for (const car of cars) {
        const k0 = car.k
        car.k += car.head ? car.v : -car.v * 0.8
        if (car.k > 1.05) car.k = -0.05
        if (car.k < -0.05) car.k = 1.05
        const [x0, y0] = at(car.lane, k0), [x1, y1] = at(car.lane, car.k)
        const a = Math.max(0, 1 - Math.abs(car.k - 0.5) * 1.6) * (light ? 0.35 : 0.8)
        c.strokeStyle = col(car.head) + a + ')'
        c.lineWidth = (1 - car.k * 0.7) * (light ? 1.6 : 2.2)
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke()
      }
    }
    if (still()) { for (let i = 0; i < 90; i++) frame(i * 40) ; cancelAnimationFrame(raf) } else raf = requestAnimationFrame(frame)
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden && !still()) raf = requestAnimationFrame(frame) }
    document.addEventListener('visibilitychange', vis)
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); document.removeEventListener('visibilitychange', vis) }
  }, [light, mood])
  return <canvas ref={ref} className="sk-drive" aria-hidden="true" />
}

export function Scene({ light }) {
  const { scene } = useSkin()
  const mood = useMood()
  return (
    <div className={'sk-scene ' + scene} aria-hidden="true">
      {scene === 'ink' && <Ink range={light ? [0.865, 0.985] : [0.012, 0.13]} highlight={light ? 0.07 : 0.16} zoom={1.25} scale={0.42} />}
      {scene === 'aurora' && <Aurora mood={mood} />}
      {scene === 'drive' && <Drive light={light} mood={mood} />}
      {scene !== 'ink' && <div className={scene === 'still' ? 'sk-terrain' : 'sk-terrain drift'}><Terrain light={light} /></div>}
    </div>
  )
}
