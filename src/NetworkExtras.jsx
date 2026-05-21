import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { Award, Heart, Smile, Image as ImageIcon, Send, Pin, Trash2, BookOpen, Target, ChevronRight, X } from 'lucide-react'
import { supabase } from './lib/supabase'

export const NETWORK_ADMIN_EMAIL = 'eug777fx@gmail.com'

// Small helpers reused only inside this file
const cardS = { background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '14px', padding: '20px', backdropFilter: 'var(--card-blur, none)' }
const lbl = { fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: '600' }
const inp = { width: '100%', background: 'var(--inp-bg)', border: '1px solid var(--inp-border)', borderRadius: '8px', color: 'var(--text-hi)', fontSize: '13px', padding: '9px 12px', fontFamily: 'inherit', outline: 'none' }
const nameOf = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.username || 'Unknown'

function Avatar({ name, size = 32 }) {
  const initials = (name || 'U').split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#141414', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: '700', color: '#aaa', flexShrink: 0 }}>{initials}</div>
  )
}

const relTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ─── Accountability Partners ──────────────────────────────
export function NetworkPartners({ session }) {
  const myId = session?.user?.id
  const [partnerships, setPartnerships] = useState([])
  const [available,    setAvailable]    = useState([])
  const [partnerData,  setPartnerData]  = useState(null)
  const [msgDraft,     setMsgDraft]     = useState('')
  const [busy,         setBusy]         = useState(false)
  const [sending,      setSending]      = useState(false)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => { if (myId) loadAll() }, [myId])

  const loadAll = async () => {
    if (!myId) return
    setLoading(true)
    try {
      const { data: parts, error } = await supabase
        .from('accountability_partners').select('*')
        .or(`user_id.eq.${myId},partner_id.eq.${myId}`)
      if (error) throw error
      setPartnerships(parts || [])
      const accepted = (parts || []).find(p => p.status === 'accepted')
      if (accepted) {
        const partnerId = accepted.user_id === myId ? accepted.partner_id : accepted.user_id
        await loadPartnerDetails(partnerId)
        setAvailable([])
      } else {
        setPartnerData(null); setMsgDraft('')
        await loadAvailable(parts || [])
      }
    } catch (e) {
      console.error('[partners] load', e)
      toast.error(`Couldn't load partners — ${e.message}`)
    } finally { setLoading(false) }
  }

  const loadPartnerDetails = async (partnerId) => {
    const today = new Date().toISOString().slice(0, 10)
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoKey = weekAgo.toISOString().slice(0, 10)
    const [profileRes, tradesRes, msgsRes] = await Promise.all([
      supabase.from('profiles').select('id, username, first_name, last_name').eq('id', partnerId).maybeSingle(),
      supabase.from('trades').select('id, pnl, trade_date').eq('user_id', partnerId).gte('trade_date', weekAgoKey),
      supabase.from('partner_messages').select('*').eq('sent_date', today)
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${myId})`),
    ])
    const messages = msgsRes.data || []
    const outgoing = messages.find(m => m.sender_id === myId)
    setMsgDraft(outgoing?.message || '')
    setPartnerData({ partnerId, profile: profileRes.data, trades: tradesRes.data || [], messages })
  }

  const loadAvailable = async (existing) => {
    const blocked = new Set([myId])
    existing.forEach(p => { blocked.add(p.user_id); blocked.add(p.partner_id) })
    try {
      const { data, error } = await supabase
        .from('profiles').select('id, username, first_name, last_name, status').eq('status', 'approved')
      if (error) throw error
      setAvailable((data || []).filter(u => !blocked.has(u.id)))
    } catch (e) { console.error('[partners] available', e); setAvailable([]) }
  }

  const sendRequest = async (targetId) => {
    setBusy(true)
    try {
      const { error } = await supabase.from('accountability_partners').insert({ user_id: myId, partner_id: targetId, status: 'pending' })
      if (error) throw error
      toast.success('Partner request sent')
      await loadAll()
    } catch (e) { toast.error(`Failed to send — ${e.message}`) }
    finally { setBusy(false) }
  }

  const respond = async (partnershipId, accept) => {
    setBusy(true)
    try {
      const { error } = await supabase.from('accountability_partners').update({ status: accept ? 'accepted' : 'declined' }).eq('id', partnershipId)
      if (error) throw error
      toast.success(accept ? 'Partnered up! 🤝' : 'Request declined')
      await loadAll()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  const removePartner = async () => {
    if (!confirm('Remove your accountability partner? You can pair with someone else after.')) return
    const accepted = partnerships.find(p => p.status === 'accepted')
    if (!accepted) return
    setBusy(true)
    try {
      const { error } = await supabase.from('accountability_partners').delete().eq('id', accepted.id)
      if (error) throw error
      toast.success('Partnership ended')
      await loadAll()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  const sendMessage = async () => {
    if (!msgDraft.trim() || !partnerData) return
    setSending(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const { error } = await supabase.from('partner_messages').upsert({
        sender_id: myId, receiver_id: partnerData.partnerId, message: msgDraft.trim(), sent_date: today,
      }, { onConflict: 'sender_id,receiver_id,sent_date' })
      if (error) throw error
      toast.success('Message sent')
      await loadPartnerDetails(partnerData.partnerId)
    } catch (e) { toast.error(e.message) }
    finally { setSending(false) }
  }

  const incoming = partnerships.filter(p => p.status === 'pending' && p.partner_id === myId)
  const outgoing = partnerships.filter(p => p.status === 'pending' && p.user_id === myId)

  if (loading) return <div style={{ ...cardS, textAlign: 'center', fontSize: '13px', color: 'var(--text-lo)', padding: '40px' }}>Loading…</div>

  if (partnerData) {
    const p = partnerData
    const tradesThisWeek = p.trades.length
    const wins = p.trades.filter(t => (Number(t.pnl) || 0) > 0).length
    const winRate = tradesThisWeek > 0 ? Math.round((wins / tradesThisWeek) * 100) : 0
    const latestTrade = p.trades.reduce((acc, t) => { const d = new Date(t.trade_date); return !acc || d > acc ? d : acc }, null)
    const todayKey = new Date().toISOString().slice(0, 10)
    const latestKey = latestTrade ? latestTrade.toISOString().slice(0, 10) : null
    const onlineToday = latestKey === todayKey
    const daysSince = latestTrade ? Math.floor((Date.now() - latestTrade.getTime()) / 86_400_000) : null
    let streak = 0
    if (p.trades.length) {
      const dates = new Set(p.trades.map(t => (t.trade_date || '').slice(0, 10)))
      let cursor = new Date()
      while (dates.has(cursor.toISOString().slice(0, 10))) { streak++; cursor.setDate(cursor.getDate() - 1) }
    }
    const outgoingMsg = p.messages.find(m => m.sender_id === myId)
    const incomingMsg = p.messages.find(m => m.sender_id === p.partnerId)

    return (
      <>
        <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '16px' }}>Your Accountability Partner</div>
        <div style={cardS}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <Avatar name={nameOf(p.profile)} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-hi)', letterSpacing: '-0.3px' }}>{nameOf(p.profile)}</div>
                <span style={{
                  fontSize: '10px', fontWeight: '700', letterSpacing: '0.06em',
                  padding: '3px 8px', borderRadius: '99px',
                  background: onlineToday ? 'rgba(170,255,160,0.10)' : '#141414',
                  border: `1px solid ${onlineToday ? 'rgba(170,255,160,0.30)' : '#222'}`,
                  color: onlineToday ? '#aaffa0' : '#666',
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: onlineToday ? '#aaffa0' : '#555' }} />
                  {onlineToday ? 'Active today' : (daysSince != null ? `Last seen ${daysSince}d ago` : 'No activity yet')}
                </span>
              </div>
              {p.profile?.username && <div style={{ fontSize: '12px', color: 'var(--text-lo)' }}>@{p.profile.username}</div>}
            </div>
            <button onClick={removePartner} disabled={busy} style={{ background: 'transparent', border: '1px solid rgba(255,128,128,0.25)', color: '#ff8080', borderRadius: '8px', padding: '7px 14px', fontSize: '11px', fontWeight: '600', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', minHeight: 'auto', opacity: busy ? 0.6 : 1 }}>Remove Partner</button>
          </div>

          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
            {[
              { l: 'Streak',          v: streak > 0 ? `${streak}🔥` : '—',                            c: streak > 0 ? '#ff8c28' : '#666' },
              { l: 'Last Trade',      v: latestTrade ? new Date(latestTrade).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—', c: 'var(--text-hi)' },
              { l: 'Trades / Week',   v: tradesThisWeek,                                              c: 'var(--text-hi)' },
              { l: 'Win Rate / Week', v: tradesThisWeek > 0 ? `${winRate}%` : '—',                    c: winRate >= 50 ? '#aaffa0' : winRate > 0 ? '#ffd966' : 'var(--text-hi)' },
            ].map(s => (
              <div key={s.l} style={{ background: '#080808', border: '1px solid #141414', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontSize: '10px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>{s.l}</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: s.c, letterSpacing: '-0.3px' }}>{s.v}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#080808', border: '1px solid #141414', borderRadius: '10px', padding: '16px' }}>
            <div style={{ ...lbl, marginBottom: '10px' }}>Today's Notes</div>
            {incomingMsg && (
              <div style={{ background: 'rgba(170,255,160,0.04)', border: '1px solid rgba(170,255,160,0.15)', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#aaffa0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>From {nameOf(p.profile)}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-md)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{incomingMsg.message}</div>
              </div>
            )}
            <textarea value={msgDraft} onChange={e => setMsgDraft(e.target.value)} placeholder="Share your mindset today — wins, losses, lessons. (1 message/day)" style={{ ...inp, minHeight: '60px', resize: 'vertical', marginBottom: '10px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '11px', color: '#555' }}>{outgoingMsg ? '✓ Sent today — you can update it' : 'Not sent yet'}</div>
              <button onClick={sendMessage} disabled={sending || !msgDraft.trim()} style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '99px', padding: '8px 18px', fontSize: '12px', fontWeight: '700', cursor: sending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: (sending || !msgDraft.trim()) ? 0.5 : 1 }}>{sending ? 'Sending…' : outgoingMsg ? 'Update Message' : 'Send Message'}</button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {incoming.length > 0 && (
        <>
          <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ffd966', marginBottom: '12px' }}>Pending Requests for You</div>
          <div style={{ display: 'grid', gap: '8px', marginBottom: '24px' }}>
            {incoming.map(req => (
              <div key={req.id} style={{ ...cardS, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <Avatar name="?" size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-hi)', fontWeight: '600' }}>A trader wants to partner up</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-lo)' }}>{relTime(req.created_at)}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => respond(req.id, true)}  disabled={busy} style={{ background: 'rgba(170,255,160,0.08)', border: '1px solid rgba(170,255,160,0.25)', color: '#aaffa0', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: '700', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', minHeight: 'auto', opacity: busy ? 0.6 : 1 }}>Accept</button>
                  <button onClick={() => respond(req.id, false)} disabled={busy} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: 'var(--text-md)', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', minHeight: 'auto' }}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {outgoing.length > 0 && (
        <>
          <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '12px' }}>Sent Requests</div>
          <div style={{ display: 'grid', gap: '8px', marginBottom: '24px' }}>
            {outgoing.map(req => (
              <div key={req.id} style={{ ...cardS, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-md)' }}>Waiting for response… ({relTime(req.created_at)})</div>
                <span style={{ fontSize: '11px', color: '#ffd966', background: 'rgba(255,217,102,0.08)', border: '1px solid rgba(255,217,102,0.25)', borderRadius: '99px', padding: '3px 10px', fontWeight: '700' }}>Pending</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '16px' }}>Available Traders</div>
      {available.length === 0 ? (
        <div style={{ ...cardS, textAlign: 'center', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <Heart size={28} color="#333" />
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-hi)' }}>No available traders right now</div>
          <div style={{ fontSize: '12px', color: 'var(--text-lo)' }}>Check back when more traders join the platform.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }} className="chart-grid">
          {available.map(u => (
            <div key={u.id} style={{ ...cardS, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Avatar name={nameOf(u)} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-hi)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nameOf(u)}</div>
                {u.username && <div style={{ fontSize: '11px', color: 'var(--text-lo)', marginTop: '2px' }}>@{u.username}</div>}
              </div>
              <button onClick={() => sendRequest(u.id)} disabled={busy} style={{ background: 'rgba(170,255,160,0.08)', border: '1px solid rgba(170,255,160,0.25)', color: '#aaffa0', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', minHeight: 'auto', opacity: busy ? 0.6 : 1, whiteSpace: 'nowrap' }}>Partner Up</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ─── Hall of Fame ──────────────────────────────────────────
export function NetworkHallOfFame({ isAdmin }) {
  const [entries, setEntries] = useState([])
  const [filter,  setFilter]  = useState('all')
  const [loading, setLoading] = useState(true)
  const [busyId,  setBusyId]  = useState(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data: hall, error } = await supabase.from('hall_of_fame').select('*').order('featured_at', { ascending: false })
      if (error) throw error
      if (!hall || hall.length === 0) { setEntries([]); setLoading(false); return }
      const tradeIds = [...new Set(hall.map(h => h.trade_id).filter(Boolean))]
      const userIds  = [...new Set(hall.map(h => h.user_id).filter(Boolean))]
      const [tRes, pRes] = await Promise.all([
        tradeIds.length ? supabase.from('trades').select('*').in('id', tradeIds) : Promise.resolve({ data: [] }),
        userIds.length  ? supabase.from('profiles').select('id, username, first_name, last_name').in('id', userIds) : Promise.resolve({ data: [] }),
      ])
      const tradeMap = new Map((tRes.data || []).map(t => [t.id, t]))
      const userMap  = new Map((pRes.data  || []).map(u => [u.id, u]))
      setEntries(hall.map(h => ({ ...h, trade: tradeMap.get(h.trade_id) || null, user: userMap.get(h.user_id) || null })))
    } catch (e) {
      console.error('[hall] load', e)
      toast.error(`Couldn't load Hall of Fame — ${e.message}`)
      setEntries([])
    } finally { setLoading(false) }
  }

  const remove = async (id) => {
    if (!confirm('Remove from Hall of Fame?')) return
    setBusyId(id)
    try {
      const { error } = await supabase.from('hall_of_fame').delete().eq('id', id)
      if (error) throw error
      setEntries(prev => prev.filter(e => e.id !== id))
      toast.success('Removed from Hall of Fame')
    } catch (e) { toast.error(e.message) }
    finally { setBusyId(null) }
  }

  const symbols = [...new Set(entries.map(e => e.trade?.symbol).filter(Boolean))]
  const thisMonthKey = new Date().toISOString().slice(0, 7)
  const filtered = entries.filter(e => {
    if (filter === 'all')   return true
    if (filter === 'month') return (e.featured_at || '').slice(0, 7) === thisMonthKey
    return e.trade?.symbol === filter
  }).sort((a, b) => (Number(b.trade?.pnl) || 0) - (Number(a.trade?.pnl) || 0))

  const gold = '#FFD700'
  const pillStyle = (active) => ({ background: active ? 'var(--text-hi)' : 'transparent', border: `1px solid ${active ? 'var(--text-hi)' : 'var(--card-border)'}`, color: active ? 'var(--bg)' : 'var(--text-md)', fontSize: '12px', fontWeight: active ? '700' : '500', padding: '6px 14px', borderRadius: '99px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' })

  return (
    <>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button onClick={() => setFilter('all')}   style={pillStyle(filter === 'all')}>All Time</button>
        <button onClick={() => setFilter('month')} style={pillStyle(filter === 'month')}>This Month</button>
        {symbols.map(s => <button key={s} onClick={() => setFilter(s)} style={pillStyle(filter === s)}>{s}</button>)}
      </div>

      {loading ? (
        <div style={{ ...cardS, textAlign: 'center', padding: '40px', fontSize: '13px', color: 'var(--text-lo)' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...cardS, padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <Award size={32} color="#333" />
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-hi)' }}>No trades in the Hall of Fame yet</div>
          <div style={{ fontSize: '12px', color: 'var(--text-lo)', maxWidth: '300px' }}>{isAdmin ? 'Use "Feature This Trade" in the Trade Log to add one.' : 'Check back soon for legendary trades.'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }} className="chart-grid">
          {filtered.map(e => {
            if (!e.trade) return null
            const t = e.trade
            const pnl = Number(t.pnl) || 0
            const isWin = pnl > 0
            const chartUrl = t.chart_url ? (() => { try { const parsed = JSON.parse(t.chart_url); return Array.isArray(parsed) ? parsed[0] : t.chart_url } catch { return t.chart_url } })() : null
            const featuredMonth = new Date(e.featured_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            return (
              <div key={e.id} style={{
                background: 'var(--card-bg)',
                border: `1px solid ${gold}55`,
                borderRadius: '14px', overflow: 'hidden', position: 'relative',
                boxShadow: `0 0 0 1px ${gold}22 inset, 0 0 24px ${gold}11`,
                backdropFilter: 'var(--card-blur, none)',
              }}>
                <div style={{ position: 'absolute', top: '12px', right: '12px', background: gold, color: '#000', fontSize: '10px', fontWeight: '800', letterSpacing: '0.06em', padding: '4px 10px', borderRadius: '99px', zIndex: 2, boxShadow: `0 2px 8px ${gold}66` }}>
                  🏆 HALL OF FAME
                </div>

                {chartUrl && (
                  <div style={{ aspectRatio: '16/9', background: '#000', overflow: 'hidden' }}>
                    <img src={chartUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                  </div>
                )}

                <div style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <Avatar name={nameOf(e.user)} size={32} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-hi)' }}>{nameOf(e.user)}</div>
                      {e.user?.username && <div style={{ fontSize: '10px', color: 'var(--text-lo)' }}>@{e.user.username}</div>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    {t.symbol && <span style={{ background: '#141414', color: '#ddd', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '6px', letterSpacing: '0.04em' }}>{t.symbol}</span>}
                    {t.direction && <span style={{ background: t.direction === 'Long' ? 'rgba(170,255,160,0.10)' : 'rgba(255,128,128,0.10)', border: `1px solid ${t.direction === 'Long' ? 'rgba(170,255,160,0.25)' : 'rgba(255,128,128,0.25)'}`, color: t.direction === 'Long' ? '#aaffa0' : '#ff8080', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '6px' }}>{t.direction}</span>}
                  </div>

                  <div style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-1.5px', color: isWin ? '#aaffa0' : '#ff8080', lineHeight: 1, marginBottom: '4px', textShadow: isWin ? '0 0 24px rgba(170,255,160,0.4)' : 'none' }}>
                    {pnl >= 0 ? '+' : '−'}${Math.abs(Math.round(pnl)).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-lo)', marginBottom: '14px', letterSpacing: '0.02em' }}>
                    {t.rr ? `${t.rr}R · ` : ''}{t.trade_date ? new Date(t.trade_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </div>

                  {(t.entry_reason || t.notes) && (
                    <div style={{ fontSize: '12px', color: 'var(--text-md)', lineHeight: 1.5, marginBottom: '14px', background: '#080808', border: '1px solid #141414', borderRadius: '8px', padding: '10px 12px' }}>
                      {t.entry_reason || t.notes}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '10px', color: gold, fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Featured {featuredMonth}</div>
                    {isAdmin && (
                      <button onClick={() => remove(e.id)} disabled={busyId === e.id} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#666', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', cursor: busyId === e.id ? 'wait' : 'pointer', fontFamily: 'inherit', minHeight: 'auto' }}>Remove</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ─── Chat (general-chat + announcements share this) ─────────
const EMOJIS = ['😀', '😂', '🔥', '💪', '🎉', '📈', '📉', '🏆', '🤝', '👍', '❤️', '🙏', '💯', '⚡', '🎯', '✨']

export function NetworkChat({ session, profile, channel = 'general-chat', readOnly = false, isAdmin = false }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const scrollRef = useRef(null)
  const fileRef = useRef(null)

  const myId = session?.user?.id
  const myUsername = profile?.username || session?.user?.email?.split('@')[0] || 'user'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('network_messages').select('*')
          .eq('channel', channel)
          .order('created_at', { ascending: true })
          .limit(200)
        if (error) throw error
        if (!cancelled) setMessages(data || [])
      } catch (e) {
        console.error('[chat] load', e)
        toast.error(`Couldn't load #${channel} — ${e.message}`)
      }
    })()
    return () => { cancelled = true }
  }, [channel])

  useEffect(() => {
    const sub = supabase.channel(`chat-${channel}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'network_messages', filter: `channel=eq.${channel}` }, payload => {
        setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'network_messages', filter: `channel=eq.${channel}` }, payload => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [channel])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [messages])

  const send = async (text, imageUrl) => {
    const body = (text ?? input).trim()
    if (!body && !imageUrl) return
    if (!myId) { toast.error('Not signed in'); return }
    setSending(true)
    try {
      const { error } = await supabase.from('network_messages').insert({
        user_id: myId, username: myUsername, channel, message: body || null, image_url: imageUrl || null,
      })
      if (error) throw error
      setInput('')
    } catch (e) {
      console.error('[chat] send', e)
      toast.error(`Failed to send — ${e.message}`)
    } finally { setSending(false) }
  }

  const deleteMessage = async (id) => {
    if (!confirm('Delete this message?')) return
    try {
      const { error } = await supabase.from('network_messages').delete().eq('id', id)
      if (error) throw error
    } catch (e) { toast.error(e.message) }
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `chat/${myId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('chart-images').upload(path, file, { upsert: false })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('chart-images').getPublicUrl(path)
      await send('', pub.publicUrl)
    } catch (e) {
      toast.error(`Upload failed — ${e.message}`)
    } finally { setUploading(false) }
  }

  const items = []
  let lastDate = null
  for (const m of messages) {
    const dateStr = new Date(m.created_at).toDateString()
    if (dateStr !== lastDate) {
      items.push({ type: 'date', key: `d-${dateStr}`, date: dateStr })
      lastDate = dateStr
    }
    items.push({ type: 'msg', key: m.id, msg: m })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-lo)', fontSize: '13px' }}>
            No messages yet. Be the first to say something.
          </div>
        ) : items.map(it => {
          if (it.type === 'date') {
            const today = new Date().toDateString()
            const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toDateString() })()
            const label = it.date === today ? 'Today' : it.date === yesterday ? 'Yesterday' : new Date(it.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
            return (
              <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 12px', color: '#555' }}>
                <div style={{ flex: 1, height: '1px', background: '#1a1a1a' }} />
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ flex: 1, height: '1px', background: '#1a1a1a' }} />
              </div>
            )
          }
          const m = it.msg
          const mine = m.user_id === myId
          const time = new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          return (
            <div key={it.key} className="chat-row" style={{ display: 'flex', gap: '12px', padding: '6px 8px', borderRadius: '8px', alignItems: 'flex-start', position: 'relative' }}>
              <Avatar name={m.username} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-hi)' }}>{m.username || 'user'}</span>
                  <span style={{ fontSize: '10px', color: '#555' }}>{time}</span>
                </div>
                {m.message && <div style={{ fontSize: '14px', color: 'var(--text-md)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.message}</div>}
                {m.image_url && (
                  <a href={m.image_url} target="_blank" rel="noopener noreferrer">
                    <img src={m.image_url} alt="" style={{ maxWidth: '320px', maxHeight: '240px', marginTop: '6px', borderRadius: '8px', border: '1px solid #1a1a1a', display: 'block' }} />
                  </a>
                )}
              </div>
              {(mine || isAdmin) && (
                <button onClick={() => deleteMessage(m.id)} className="chat-delete" style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '2px 4px', minHeight: 'auto', fontFamily: 'inherit', fontSize: '11px', opacity: 0 }} title="Delete">✕</button>
              )}
            </div>
          )
        })}
      </div>

      {!readOnly && (
        <div style={{ padding: '14px 18px 18px', borderTop: '1px solid #1a1a1a', flexShrink: 0, position: 'relative' }}>
          <div style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: '10px', padding: '6px 10px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
            <button onClick={() => fileRef.current?.click()} disabled={uploading || sending} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: '6px', minHeight: 'auto', display: 'flex', alignItems: 'center' }} title="Attach image">
              <ImageIcon size={16} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
            <button onClick={() => setEmojiOpen(v => !v)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: '6px', minHeight: 'auto', display: 'flex', alignItems: 'center' }} title="Emoji">
              <Smile size={16} />
            </button>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={`Message #${channel}`}
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-hi)', fontSize: '14px', resize: 'none', outline: 'none', padding: '8px 4px', fontFamily: 'inherit', maxHeight: '120px' }}
            />
            <button onClick={() => send()} disabled={sending || !input.trim()} style={{ background: input.trim() ? '#fff' : 'transparent', border: 'none', color: input.trim() ? '#000' : '#555', borderRadius: '8px', padding: '7px 10px', cursor: sending || !input.trim() ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', minHeight: 'auto', opacity: (sending || !input.trim()) ? 0.5 : 1 }} title="Send">
              <Send size={14} />
            </button>
          </div>
          {emojiOpen && (
            <div style={{ position: 'absolute', bottom: '70px', right: '18px', background: '#0d0d0d', border: '1px solid #1f1f1f', borderRadius: '10px', padding: '8px', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px', zIndex: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => { setInput(s => s + e); setEmojiOpen(false) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', fontSize: '18px', minHeight: 'auto', borderRadius: '6px' }}>{e}</button>
              ))}
            </div>
          )}
          {uploading && <div style={{ fontSize: '11px', color: '#aaffa0', marginTop: '6px' }}>Uploading…</div>}
        </div>
      )}
      {readOnly && (
        <div style={{ padding: '12px 18px', borderTop: '1px solid #1a1a1a', flexShrink: 0, fontSize: '12px', color: 'var(--text-lo)', textAlign: 'center' }}>
          🔒 Only admins can post here
        </div>
      )}

      <style>{`.chat-row:hover { background: rgba(255,255,255,0.02); } .chat-row:hover .chat-delete { opacity: 1 !important; }`}</style>
    </div>
  )
}

export function NetworkAnnouncements({ session, profile, isAdmin }) {
  return <NetworkChat session={session} profile={profile} channel="announcements" readOnly={!isAdmin} isAdmin={isAdmin} />
}

// ─── Challenges ─────────────────────────────────────────────
const NETWORK_CHALLENGES = [
  { id: 1, title: '30 Days No Revenge Trades',   duration: '30 days', reward: '🛡️ Discipline Badge', description: 'Zero revenge trades for 30 consecutive days. Walk away after every loss.', participants: 12 },
  { id: 2, title: '60% Win Rate Month',          duration: '1 month', reward: '🎯 Sharpshooter Badge', description: 'Hit at least 60% win rate over a full calendar month with 20+ trades.', participants: 8 },
  { id: 3, title: 'Plan Adherence Streak',       duration: '21 days', reward: '📋 Process Badge',     description: 'Follow your trading plan on every trade for 21 days straight.',           participants: 15 },
  { id: 4, title: 'Risk Discipline Challenge',   duration: '60 days', reward: '⚖️ Risk Master Badge', description: 'Never risk more than 1% per trade for 60 days. No exceptions.',           participants: 6 },
]

export function NetworkChallenges() {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '16px' }}>Active Challenges</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {NETWORK_CHALLENGES.map(c => (
          <div key={c.id} style={cardS}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>{c.reward.split(' ')[0]}</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-hi)', marginBottom: '6px' }}>{c.title}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-md)', lineHeight: 1.5, marginBottom: '14px' }}>{c.description}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#aaa', background: '#141414', border: '1px solid #222', padding: '3px 9px', borderRadius: '99px' }}>{c.duration}</span>
                <span style={{ fontSize: '11px', color: '#aaa', background: '#141414', border: '1px solid #222', padding: '3px 9px', borderRadius: '99px' }}>{c.participants} joined</span>
              </div>
              <button style={{ background: 'rgba(170,255,160,0.08)', border: '1px solid rgba(170,255,160,0.25)', color: '#aaffa0', borderRadius: '99px', padding: '6px 14px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', minHeight: 'auto' }} onClick={() => toast.success(`Joined "${c.title}"`)}>Join</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Resources ──────────────────────────────────────────────
const NETWORK_RESOURCES = [
  { id: 1, title: 'The Inner Voice of Trading',         type: 'Book',    author: 'Michael Martin',          url: 'https://www.amazon.com/Inner-Voice-Trading-Michael-Martin/dp/0132616254', description: 'Psychology + risk management for serious traders.' },
  { id: 2, title: 'ICT 2022 Mentorship',                type: 'Video',   author: 'The Inner Circle Trader', url: 'https://youtube.com/playlist?list=PLwjvfFC-Mlz3uXJUfXjnHmhKnFKJyKfBl', description: 'Free public mentorship on price action, liquidity, and time-based concepts.' },
  { id: 3, title: 'Trading in the Zone',                type: 'Book',    author: 'Mark Douglas',            url: 'https://www.amazon.com/Trading-Zone-Confidence-Discipline-Attitude/dp/0735201447', description: 'The classic on trading psychology. Essential reading.' },
  { id: 4, title: 'BabyPips School of Pipsology',       type: 'Course',  author: 'BabyPips',                url: 'https://www.babypips.com/learn/forex', description: 'Free comprehensive forex education for beginners and beyond.' },
  { id: 5, title: 'Reminiscences of a Stock Operator',  type: 'Book',    author: 'Edwin Lefèvre',           url: 'https://www.amazon.com/Reminiscences-Stock-Operator-Edwin-Lefevre/dp/0471770884', description: 'Wisdom from Jesse Livermore — timeless trader stories.' },
  { id: 6, title: 'Forex Factory Calendar',             type: 'Tool',    author: 'Forex Factory',           url: 'https://www.forexfactory.com/calendar', description: 'Free high-impact news calendar for all sessions.' },
]
const RESOURCE_TYPE_COLOR = { Book: '#7cc9ff', Video: '#ff8080', Course: '#aaffa0', Tool: '#ffd966', Article: '#c28cff' }

export function NetworkResources() {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '16px' }}>Curated Resource Library</div>
      <div style={{ display: 'grid', gap: '8px' }}>
        {NETWORK_RESOURCES.map(r => {
          const tcolor = RESOURCE_TYPE_COLOR[r.type] || '#aaa'
          return (
            <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" style={{ ...cardS, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none', transition: 'border-color 0.15s' }}
               onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
               onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${tcolor}15`, border: `1px solid ${tcolor}40`, color: tcolor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BookOpen size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-hi)' }}>{r.title}</span>
                  <span style={{ fontSize: '10px', color: tcolor, background: `${tcolor}15`, border: `1px solid ${tcolor}40`, padding: '2px 7px', borderRadius: '4px', fontWeight: '700', letterSpacing: '0.04em' }}>{r.type}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-lo)', marginBottom: '4px' }}>by {r.author}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-md)', lineHeight: 1.4 }}>{r.description}</div>
              </div>
              <ChevronRight size={16} color="#444" style={{ flexShrink: 0 }} />
            </a>
          )
        })}
      </div>
    </div>
  )
}

// ─── Members List + Popup (right column) ─────────────────────
export function NetworkMembersList({ members, onPickMember }) {
  return (
    <div style={{ padding: '16px 14px' }}>
      <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: '12px', padding: '0 6px' }}>Members — {members.length}</div>
      {members.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--text-lo)', textAlign: 'center', padding: '20px 0' }}>No members</div>
      ) : (
        <div>
          {members.map(m => {
            const isAdminMember = m.email === NETWORK_ADMIN_EMAIL
            const display = nameOf(m) || m.email || 'user'
            return (
              <button
                key={m.id}
                onClick={() => onPickMember?.(m)}
                style={{ width: '100%', background: 'transparent', border: 'none', padding: '7px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.15s', minHeight: 'auto' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar name={display} size={28} />
                  <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '10px', height: '10px', borderRadius: '50%', background: '#3ba55d', border: '2px solid #111' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: '13px', color: 'var(--text-md)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{display}</span>
                  {isAdminMember && <span title="Admin" style={{ fontSize: '13px' }}>👑</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function NetworkMemberPopup({ member, onClose }) {
  const [stats, setStats] = useState({ loading: true })
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase.from('trades').select('id, pnl, trade_date').eq('user_id', member.id)
        if (error) throw error
        if (cancelled) return
        const trades = data || []
        const wins = trades.filter(t => (Number(t.pnl) || 0) > 0).length
        const wr = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0
        const dates = new Set(trades.map(t => (t.trade_date || '').slice(0, 10)))
        let streak = 0
        let cursor = new Date()
        while (dates.has(cursor.toISOString().slice(0, 10))) { streak++; cursor.setDate(cursor.getDate() - 1) }
        setStats({ loading: false, totalTrades: trades.length, winRate: wr, streak })
      } catch (e) {
        if (!cancelled) setStats({ loading: false, error: e.message })
      }
    })()
    return () => { cancelled = true }
  }, [member.id])

  const display = nameOf(member) || member.email || 'user'
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '320px', background: '#0d0d0d', border: '1px solid #1f1f1f', borderRadius: '14px', padding: '22px', boxShadow: '0 32px 100px rgba(0,0,0,0.9)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '4px', minHeight: 'auto', lineHeight: 1, fontSize: '16px' }}>✕</button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <Avatar name={display} size={64} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-hi)' }}>{display}</div>
            {member.username && <div style={{ fontSize: '11px', color: 'var(--text-lo)', marginTop: '2px' }}>@{member.username}</div>}
            {member.email === NETWORK_ADMIN_EMAIL && <div style={{ fontSize: '10px', fontWeight: '700', color: '#ffd700', marginTop: '6px', letterSpacing: '0.08em' }}>👑 ADMIN</div>}
          </div>
        </div>
        {stats.loading ? (
          <div style={{ fontSize: '12px', color: 'var(--text-lo)', textAlign: 'center' }}>Loading…</div>
        ) : stats.error ? (
          <div style={{ fontSize: '12px', color: '#ff8080', textAlign: 'center' }}>{stats.error}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[
              { l: 'Streak',  v: stats.streak > 0 ? `${stats.streak}🔥` : '—', c: stats.streak > 0 ? '#ff8c28' : 'var(--text-md)' },
              { l: 'Trades',  v: stats.totalTrades,                              c: 'var(--text-hi)' },
              { l: 'Win Rate', v: stats.totalTrades > 0 ? `${stats.winRate}%`   : '—', c: stats.winRate >= 50 ? '#aaffa0' : 'var(--text-hi)' },
            ].map(s => (
              <div key={s.l} style={{ background: '#080808', border: '1px solid #141414', borderRadius: '8px', padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '5px' }}>{s.l}</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: s.c, letterSpacing: '-0.3px' }}>{s.v}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
