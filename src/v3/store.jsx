// v3 state. The real app (App.jsx) owns auth, the profile, the trades array and
// billing; this provider wraps them with the actions the glass screens need.
import React from 'react'
import { supabase } from '../lib/supabase'
import { toView, computeStats } from './data.js'

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

  const trades = React.useMemo(
    () => (rawTrades || []).map(toView).sort((a, b) => (b.date + b.created).localeCompare(a.date + a.created)),
    [rawTrades],
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
    trades, stats, toast, settings, share, log,
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
  }), [app, name, session, uid, trades, stats, toast, settings, share, log, notify, setTrades, setProfile])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export const useStore = () => React.useContext(Ctx)

// ── Hash routing (#dashboard, #journal …). Auth links (#access_token=…) are left alone. ──
const ROUTES = ['dashboard', 'journal', 'analytics', 'calendar', 'plan', 'network', 'news', 'billing', 'account', 'risk', 'admin', 'tos', 'copy', 'backtest']
const ALIAS = { settings: 'account', subscription: 'billing' }
const readRoute = () => {
  const raw = (location.hash || '').replace(/^#/, '')
  const h = ALIAS[raw] || raw
  return ROUTES.includes(h) ? h : 'dashboard'
}
export function useRoute() {
  const [route, setRoute] = React.useState(readRoute)
  React.useEffect(() => {
    const on = () => { setRoute(readRoute()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
export const go = (name) => { location.hash = name }
