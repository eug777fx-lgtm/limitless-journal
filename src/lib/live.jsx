// Live presence: every open tab of the app (and the marketing site) says where it is on one
// Supabase Realtime presence channel. Nothing is stored. The admin Live view reads it.
// Public payload on purpose: no names or emails, only a hashed account id the admin can match.
import React from 'react'
import { supabase } from './supabase'

export const LIVE_CHANNEL = 'ltj-live'
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
const KEY = rid()
const PHONE = typeof matchMedia !== 'undefined' && (matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 760px)').matches)
let tz = ''
try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch { /* old browser */ }

let ch = null, ready = false, sent = ''
let state = { k: 'app', p: 'start', u: '', a: 0, d: PHONE ? 'm' : 'd', z: tz, s: Date.now() }
const listeners = new Set()
const feed = new Set()

function push() {
  if (!ch || !ready) return
  const next = JSON.stringify(state)
  if (next === sent) return
  sent = next
  ch.track(state).catch(() => { sent = '' })
}

function ensure() {
  if (ch || typeof window === 'undefined') return
  ch = supabase.channel(LIVE_CHANNEL, { config: { presence: { key: KEY } } })
  ch.on('presence', { event: 'sync' }, () => { const s = ch.presenceState(); listeners.forEach((f) => f(s)) })
  ch.on('presence', { event: 'join' }, ({ key, newPresences }) => feed.forEach((f) => f('join', key, newPresences)))
  ch.on('presence', { event: 'leave' }, ({ key, leftPresences }) => feed.forEach((f) => f('leave', key, leftPresences)))
  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED') { ready = true; sent = ''; push() }
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') ready = false
  })
}

export function liveSet(patch) {
  state = { ...state, ...patch }
  ensure()
  push()
}

// Same hash on the admin side, so a live tab can be matched to a trader without sending ids
const hashCache = new Map()
export async function liveHash(uid) {
  if (!uid) return ''
  if (hashCache.has(uid)) return hashCache.get(uid)
  let h = ''
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ltj:' + uid))
    h = [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch { h = '' }
  hashCache.set(uid, h)
  return h
}

// Admin: live presence state and join/leave events
export function useLiveState(onEvent) {
  const [live, setLive] = React.useState({})
  const ev = React.useRef(onEvent)
  React.useEffect(() => { ev.current = onEvent }, [onEvent])
  React.useEffect(() => {
    ensure()
    const l = (s) => setLive({ ...s })
    const f = (type, key, metas) => ev.current && ev.current(type, key, metas)
    listeners.add(l); feed.add(f)
    if (ch && ready) l(ch.presenceState())
    return () => { listeners.delete(l); feed.delete(f) }
  }, [])
  return live
}

// Drop into any screen: <LiveBeacon page="pay" uid={id} admin />
export function LiveBeacon({ page, uid = '', admin = false }) {
  React.useEffect(() => {
    let dead = false
    liveHash(uid).then((u) => { if (!dead) liveSet({ k: 'app', p: page || 'app', u, a: admin ? 1 : 0 }) })
    return () => { dead = true }
  }, [page, uid, admin])
  return null
}
