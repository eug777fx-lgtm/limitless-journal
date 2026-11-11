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

export function Scene({ light }) {
  const { scene } = useSkin()
  const mood = useMood()
  return (
    <div className={'sk-scene ' + (scene === 'aurora' ? 'aurora' : 'ink')} aria-hidden="true">
      {scene !== 'aurora' && <Ink key={light ? 'l' : 'd'} phoneFps={15} phoneScale={0.45} range={light ? [0.865, 0.985] : [0.012, 0.13]} highlight={light ? 0.07 : 0.16} zoom={1.25} scale={0.42} />}
      {scene === 'aurora' && <Aurora mood={mood} />}
      {scene === 'aurora' && <div className="sk-terrain drift"><Terrain light={light} /></div>}
    </div>
  )
}
