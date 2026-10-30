// ═══════════════════════════════════════════════════════════════════════════
//  NETWORK — shared, non-visual primitives.
//
//  These live outside NetworkSocial.jsx on purpose. App.jsx needs the profile
//  hook in its always-loaded shell, and a hook can never be React.lazy'd.
//  Keeping it here is what lets the rest of the Network layer
//  (NetworkSocial.jsx + NetworkExtras.jsx) stay in a lazy chunk instead of
//  being dragged into the first-load bundle.
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export const ACCENT = '#e4e4e7'

export async function fetchNetworkProfiles(userIds) {
  if (!userIds?.length) return new Map()
  const { data } = await supabase.from('network_profiles').select('*').in('user_id', userIds)
  return new Map((data || []).map(p => [p.user_id, p]))
}

export async function ensureMyProfile(session, profile) {
  const uid = session?.user?.id
  if (!uid) return null
  const { data } = await supabase.from('network_profiles').select('*').eq('user_id', uid).maybeSingle()
  if (data) return data
  const seed = {
    user_id: uid,
    display_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.username || session.user.email.split('@')[0],
  }
  const { data: created } = await supabase.from('network_profiles').insert(seed).select().maybeSingle()
  return created || seed
}

// convenience hook for NetworkPage
export function useMyNetworkProfile(session, profile) {
  const [np, setNp] = useState(null)
  useEffect(() => {
    let alive = true
    if (session?.user?.id) ensureMyProfile(session, profile).then(p => { if (alive) setNp(p) })
    return () => { alive = false }
  }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return [np, setNp]
}
