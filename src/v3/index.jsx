// LIMITLESS v3: the glass journal on real data. App.jsx mounts it for every
// signed in, approved trader. Older screens (plan, network, admin) render inside it.
import React from 'react'
import { Toaster } from 'react-hot-toast'
import css from './styles.css?inline'
import { V3Provider, useStore, useRoute } from './store.jsx'
import { ToastHost, useGlassLight } from './ui.jsx'
import AppShell from './Shell.jsx'
import Dashboard from './Dashboard.jsx'
import Journal from './Journal.jsx'
import Analytics from './Analytics.jsx'
import { Calendar, News } from './Pages.jsx'
import { Billing, Account } from './Account.jsx'
import LogTrade from './LogTrade.jsx'
import ShareCard from './ShareCard.jsx'

const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@300..700&family=Poppins:wght@300;400;500;600;700;800&display=swap'

function useV3Document() {
  React.useLayoutEffect(() => {
    const html = document.documentElement
    html.classList.add('v3-on')
    const style = document.createElement('style')
    style.setAttribute('data-v3', '')
    style.textContent = css
    document.head.appendChild(style)
    let link = document.querySelector('link[data-v3-fonts]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'stylesheet'; link.href = FONTS; link.setAttribute('data-v3-fonts', '')
      document.head.appendChild(link)
    }
    const meta = document.querySelector('meta[name="theme-color"]')
    const prevTheme = meta && meta.getAttribute('content')
    if (meta) meta.setAttribute('content', '#000000')
    return () => {
      html.classList.remove('v3-on')
      style.remove()
      if (meta && prevTheme) meta.setAttribute('content', prevTheme)
      ;['--fill', '--blur'].forEach((p) => html.style.removeProperty(p))
      html.removeAttribute('data-pnl'); html.removeAttribute('data-motion')
    }
  }, [])
}

const LEGACY = {
  plan: { word: 'PLAN', title: 'Trading plan' },
  network: { word: 'NETWORK', title: 'Network' },
  admin: { word: 'ADMIN', title: 'Admin', admin: true },
  tos: { word: 'TOS', title: 'TOS', superAdmin: true },
  copy: { word: 'SYNC', title: 'TradeSync', superAdmin: true },
}

function Legacy({ route }) {
  const { renderLegacy, isAdmin, isSuperAdmin } = useStore()
  const meta = LEGACY[route]
  if ((meta.admin && !isAdmin) || (meta.superAdmin && !isSuperAdmin)) return <Dashboard />
  return (
    <AppShell route={route} word={meta.word} title={meta.title}>
      <div className="wrap" style={{ paddingBottom: 60 }}>
        <div className="glass v3-legacy" style={{ padding: 'clamp(4px, 1.5vw, 12px)', overflow: 'hidden' }}>
          {renderLegacy(route)}
        </div>
      </div>
    </AppShell>
  )
}

function Router() {
  const route = useRoute()
  useGlassLight()
  const C = { dashboard: Dashboard, journal: Journal, analytics: Analytics, calendar: Calendar, news: News, billing: Billing, account: Account }[route]
  return (
    <>
      <React.Fragment key={route}>{C ? <C /> : LEGACY[route] ? <Legacy route={route} /> : <Dashboard />}</React.Fragment>
      <LogTrade />
      <ShareCard />
      <ToastHost />
    </>
  )
}

export default function V3App(props) {
  useV3Document()
  return (
    <V3Provider app={props}>
      <div className="v3root">
        <Toaster position="top-center" toastOptions={{ style: { background: 'rgba(20,20,22,0.92)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 99, fontSize: 13 } }} />
        <Router />
      </div>
    </V3Provider>
  )
}
