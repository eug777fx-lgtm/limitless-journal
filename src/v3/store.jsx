// v3 state. The real app (App.jsx) owns auth, the profile, the trades array and
// billing; this provider wraps them with the actions the glass screens need.
import React from 'react'
import { flushSync } from 'react-dom'
import { supabase } from '../lib/supabase'
import { toView, computeStats } from './data.js'
import { useSkin, sampleRows } from './skin.jsx'
import { hasPaidAccess } from '../lib/billing'

const Ctx = React.createContext(null)
const SETTINGS_KEY = 'ltj_v3_settings'
const loadSettings = () => {
  try { return { glass: 0.5, pnl: 'soft', motion: true, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')) } } catch { return { glass: 0.5, pnl: 'soft', motion: true } }
}

export function V3Provider({ app, children }) {
  const { session, profile, setProfile, trades: rawTrades, setTrades } = app
  const [toast, setToast] = React.useState(null)
  const [log, setLog] = React.useState(null) // null | { mode: 'new' } | { mode: 'edit', trade }
  const [share, setShare] = React.useState(null)
  const [settings, setSettings] = React.useState(loadSettings)

  React.useEffect(() => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch { /* private mode */ } }, [settings])
  React.useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--fill', (0.02 + settings.glass * 0.1).toFixed(3))
    root.style.setProperty('--blur', Math.round(10 + settings.glass * 32) + 'px')
    root.setAttribute('data-pnl', settings.pnl === 'mono' ? 'mono' : 'soft')
    root.setAttribute('data-motion', settings.motion ? 'on' : 'off')
  }, [settings])

  // owner preview: example trades fill an empty account so every page can be seen
  const skin = useSkin()
  const sample = !!app.isSuperAdmin && skin.on && skin.sample && !(rawTrades || []).length
  const trades = React.useMemo(
    () => (sample ? sampleRows() : rawTrades || []).map(toView).sort((a, b) => (b.date + b.created).localeCompare(a.date + a.created)),
    [rawTrades, sample],
  )
  const stats = React.useMemo(() => computeStats(trades), [trades])

  const notify = React.useCallback((text, tone = 'ok') => {
    const id = Date.now()
    setToast({ text, tone, id })
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2800)
  }, [])

  const uid = session?.user?.id
  const name = profile?.first_name || profile?.username || (session?.user?.email || '').split('@')[0] || 'Trader'

  const api = React.useMemo(() => ({
    ...app,
    user: { name, email: session?.user?.email || '', id: uid },
    trades, stats, toast, settings, share, log, sample,
    // Pro unlocks the Network and TradeSync. Admins always have them.
    pro: !!(app.isAdmin || app.isSuperAdmin || (app.subscription && app.subscription.plan === 'pro' && hasPaidAccess(app.subscription))),
    notify,
    setSetting: (k, v) => setSettings((s) => ({ ...s, [k]: v })),
    openShare: (t) => setShare(t),
    closeShare: () => setShare(null),
    openLog: () => setLog({ mode: 'new' }),
    editTrade: (t) => setLog({ mode: 'edit', trade: t }),
    closeLog: () => setLog(null),

    async addTrade(row) {
      const { data, error } = await supabase.from('trades').insert({ ...row, user_id: uid }).select().single()
      if (error) throw new Error(error.message)
      setTrades((prev) => [data, ...prev])
      return toView(data)
    },
    async updateTrade(id, patch) {
      const { data, error } = await supabase.from('trades').update(patch).eq('id', id).select().single()
      if (error) throw new Error(error.message)
      setTrades((prev) => prev.map((t) => (t.id === id ? data : t)))
      return toView(data)
    },
    async deleteTrade(id) {
      const { error } = await supabase.from('trades').delete().eq('id', id)
      if (error) throw new Error(error.message)
      setTrades((prev) => prev.filter((t) => t.id !== id))
    },
    async deleteTrades(ids) {
      if (!ids.length) return 0
      const { error } = await supabase.from('trades').delete().in('id', ids).eq('user_id', uid)
      if (error) throw new Error(error.message)
      const gone = new Set(ids)
      setTrades((prev) => prev.filter((t) => !gone.has(t.id)))
      return ids.length
    },
    async importTrades(rows) {
      const clean = rows.map((r) => ({ ...r, user_id: uid, trade_date: r.trade_date || new Date().toISOString().slice(0, 10) }))
      const { data, error } = await supabase.from('trades').insert(clean).select()
      if (error) throw new Error(error.message)
      setTrades((prev) => [...data, ...prev])
      return data.length
    },
    async saveProfile(patch) {
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', uid).select().single()
      if (error) throw new Error(error.message)
      setProfile && setProfile(data)
      return data
    },
  }), [app, name, session, uid, trades, stats, toast, settings, share, log, sample, notify, setTrades, setProfile])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useStore = () => React.useContext(Ctx)

// ── Hash routing (#dashboard, #journal …). Auth links (#access_token=…) are left alone. ──
const ROUTES = ['dashboard', 'journal', 'analytics', 'calendar', 'plan', 'network', 'news', 'billing', 'account', 'risk', 'admin', 'tos', 'copy', 'backtest']
const ALIAS = { settings: 'account', subscription: 'billing' }
const readRoute = () => {
  const raw = (location.hash || '').replace(/^#/, '')
  const h = ALIAS[raw] || raw || (location.pathname.startsWith('/asia') ? 'backtest' : '')
  return ROUTES.includes(h) ? h : 'dashboard'
}
// Page switches: a real cross-fade between the old and new page where the browser supports it.
// The trader picks Smooth, Quick or Off in Account (key ltj_transition).
export const TRANSITION_KEY = 'ltj_transition'
export const getTransition = () => { try { return localStorage.getItem(TRANSITION_KEY) || 'smooth' } catch { return 'smooth' } }
export const applyTransitionPref = () => {
  const m = getTransition()
  const vt = m !== 'off' && typeof document !== 'undefined' && !!document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches
  document.documentElement.setAttribute('data-transition', m)
  document.documentElement.classList.toggle('vt-on', vt)
}
export function useRoute() {
  const [route, setRoute] = React.useState(readRoute)
  React.useEffect(() => {
    applyTransitionPref()
    const on = () => {
      const next = readRoute()
      const apply = () => { flushSync(() => setRoute(next)); window.scrollTo(0, 0) }
      if (document.documentElement.classList.contains('vt-on') && !document.querySelector('.overlay')) {
        try { document.startViewTransition(apply); return } catch { /* fall back */ }
      }
      apply()
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
export const go = (name) => { location.hash = name }
