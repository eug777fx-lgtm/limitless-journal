// Opening moment for the new look: the logo pops in, a ring draws around it, then the greeting.
// Shows once per app open (per tab session). Tap anywhere to skip.
import React from 'react'
import { useStore } from './store.jsx'
import { LOGO } from './ui.jsx'

const KEY = 'ltj_v4_splash'
const still = () => document.documentElement.getAttribute('data-motion') === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Splash() {
  const { user } = useStore()
  const [show, setShow] = React.useState(() => { try { return !sessionStorage.getItem(KEY) } catch { return false } })
  const [out, setOut] = React.useState(false)
  // if the loading screen is still up, carry on from it instead of popping the logo again
  const [cont] = React.useState(() => !!document.querySelector('.ltj-boot'))
  React.useEffect(() => {
    const replay = () => { setOut(false); setShow(true) }
    addEventListener('ltj-splash', replay)
    return () => removeEventListener('ltj-splash', replay)
  }, [])
  React.useEffect(() => {
    if (!show) return
    try { sessionStorage.setItem(KEY, '1') } catch { /* private mode */ }
    const t1 = setTimeout(() => setOut(true), still() ? 900 : 2600)
    const t2 = setTimeout(() => { setShow(false); setOut(false) }, still() ? 1300 : 3300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [show])
  if (!show) return null
  const h = new Date().getHours()
  const greet = h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const first = (user.name || 'Trader').split(' ')[0]
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <div className={'splash' + (out ? ' out' : '') + (cont ? ' cont' : '')} onClick={() => setOut(true)} role="presentation">
      <div className="splash-mark">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle className="r1" cx="100" cy="100" r="92" />
          <circle className="r2" cx="100" cy="100" r="92" />
        </svg>
        <span className="splash-logo"><img src={LOGO} alt="LIMITLESS" /></span>
      </div>
      <h1 className="splash-hi"><span>{greet},</span> <span className="nm">{first}.</span></h1>
      <span className="splash-date">{date}</span>
    </div>
  )
}

export const replaySplash = () => dispatchEvent(new Event('ltj-splash'))
