import React from 'react'
import { Plus, Search, Home, BookOpen, BarChart3, User, CreditCard, Newspaper, LogOut, Globe, Users, ShieldCheck, ScrollText, Repeat, FlaskConical } from 'lucide-react'
import { useStore, go } from './store.jsx'
import { Backdrop, Logo, wordSize } from './ui.jsx'

const SITE = 'https://limitless-journal.com'
const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'journal', label: 'Journal' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'plan', label: 'Plan' },
]
const MORE_ROUTES = ['account', 'billing', 'news', 'network', 'calendar', 'plan', 'risk', 'admin', 'tos', 'copy', 'backtest']

export const initials = (name) => (name || 'T').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

function TopNav({ route }) {
  const { openLog, user, logout, isAdmin, isSuperAdmin } = useStore()
  const ref = React.useRef(null)
  const [pill, setPill] = React.useState(null)
  const [menu, setMenu] = React.useState(false)
  // Measure the active link; again once web fonts land and whenever the capsule resizes
  React.useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current && ref.current.querySelector('[aria-current="page"]')
      setPill(el ? { left: el.offsetLeft, width: el.offsetWidth } : null)
    }
    measure()
    let dead = false
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!dead) measure() })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (ro && ref.current) ro.observe(ref.current)
    return () => { dead = true; ro && ro.disconnect() }
  }, [route])
  React.useEffect(() => {
    if (!menu) return
    const close = (e) => { if (!e.target.closest('[data-menu]')) setMenu(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menu])
  const items = [[User, 'Account and settings', 'account'], [CreditCard, 'Subscription', 'billing'], [Newspaper, 'News calendar', 'news'], [Users, 'Network', 'network']]
  if (isAdmin) items.push([FlaskConical, 'Asia backtest', 'backtest'], [ShieldCheck, 'Admin panel', 'admin'])
  if (isSuperAdmin) items.push([ScrollText, 'TOS', 'tos'], [Repeat, 'TradeSync', 'copy'])
  return (
    <div className="topnav wrap">
      <nav ref={ref} aria-label="Main" className="capsule glass">
        {pill && <span className="nav-pill" style={{ left: pill.left, width: pill.width }} />}
        <a href="#dashboard" className="logo-dot logo-chip" aria-label="Dashboard"><Logo /></a>
        {NAV.map((n) => (
          <a key={n.id} href={'#' + n.id} className="nav-link" aria-current={route === n.id ? 'page' : undefined}>{n.label}</a>
        ))}
        <button type="button" className="icon-btn" style={{ background: 'transparent', color: 'rgba(255,255,255,.75)' }} aria-label="Search trades" onClick={() => go('journal')}><Search size={17} /></button>
        <div data-menu style={{ position: 'relative' }}>
          <button type="button" className="icon-btn ink" aria-label="Account menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} style={{ fontFamily: 'var(--display)', fontSize: 12, fontWeight: 600, width: 44 }}>
            {initials(user.name)}
          </button>
          {menu && (
            <div className="glass" style={{ position: 'absolute', right: 0, top: 54, width: 240, padding: 8, borderRadius: 22, animation: 'modalIn .4s var(--spring) both', '--fill': 0.13, '--blur': '40px', zIndex: 5 }}>
              <div className="col" style={{ padding: '8px 12px 10px' }}>
                <span style={{ fontWeight: 600 }}>{user.name}</span>
                <span className="faint" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</span>
              </div>
              {items.map(([I, l, r]) => (
                <a key={r} href={'#' + r} onClick={() => setMenu(false)} className="row" style={{ gap: 10, padding: '10px 12px', borderRadius: 12, fontSize: 13.5 }}><I size={15} />{l}</a>
              ))}
              <a href={SITE} className="row" style={{ gap: 10, padding: '10px 12px', borderRadius: 12, fontSize: 13.5 }}><Globe size={15} />Back to site</a>
              <button type="button" onClick={logout} className="row" style={{ gap: 10, padding: '10px 12px', borderRadius: 12, fontSize: 13.5, width: '100%', background: 'transparent', border: 'none', color: 'var(--fg2)' }}><LogOut size={15} />Log out</button>
            </div>
          )}
        </div>
        <button type="button" className="btn btn-primary" style={{ minHeight: 44 }} onClick={openLog}><Plus size={15} strokeWidth={2.6} /> Log trade</button>
      </nav>
    </div>
  )
}

const TABS = [
  { id: 'dashboard', label: 'Home', Icon: Home },
  { id: 'journal', label: 'Journal', Icon: BookOpen },
  { id: 'analytics', label: 'Stats', Icon: BarChart3 },
  { id: 'account', label: 'More', Icon: User },
]

export default function AppShell({ route, word, title, children }) {
  const { openLog, user } = useStore()
  return (
    <div className="stage app view" key={route}>
      <Backdrop word={word} top={104} size={240} orbs={[{ left: '5%', top: 700, width: 360, height: 360 }, { right: '4%', top: 1100, width: 420, height: 420 }]} />
      <TopNav route={route} />
      <header className="mobilehead wrap" style={{ alignItems: 'center', justifyContent: 'space-between', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 18px)' }}>
        <a href="#dashboard" className="logo-dot glass logo-chip" aria-label="Dashboard"><Logo /></a>
        <span className="display" style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
        <a href="#account" className="logo-dot glass display" aria-label="Account" style={{ fontSize: 12, fontWeight: 600 }}>{initials(user.name)}</a>
      </header>
      <main>
        <div aria-hidden="true" style={{ height: `calc(${wordSize(word, 240)} * 0.82)` }} />
        {children}
      </main>
      <div className="tabbar">
        <nav aria-label="Main" className="glass">
          {TABS.map(({ id, label, Icon }) => (
            <a key={id} href={'#' + id} aria-current={route === id || (id === 'account' && MORE_ROUTES.includes(route)) ? 'page' : undefined}><Icon size={20} strokeWidth={1.9} />{label}</a>
          ))}
        </nav>
        <button type="button" className="fab" aria-label="Log trade" onClick={openLog}><Plus size={24} strokeWidth={2.6} /></button>
      </div>
    </div>
  )
}

export function Empty({ title, body, action }) {
  return (
    <div className="glass panel" style={{ alignItems: 'center', textAlign: 'center', padding: '40px 24px', gap: 10 }}>
      <span className="display" style={{ fontSize: 18, fontWeight: 600 }}>{title}</span>
      {body && <span className="muted" style={{ fontSize: 13.5, maxWidth: 420 }}>{body}</span>}
      {action}
    </div>
  )
}

export function ProLock({ title, body }) {
  return (
    <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 10, padding: 20 }}>
      <span className="ink" style={{ width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={20} /></span>
      <span className="display" style={{ fontSize: 18, fontWeight: 600 }}>{title}</span>
      <span className="muted" style={{ fontSize: 13.5, maxWidth: 320 }}>{body}</span>
    </div>
  )
}

