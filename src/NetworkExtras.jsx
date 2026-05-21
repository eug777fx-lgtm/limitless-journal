import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Award, Heart } from 'lucide-react'
import { supabase } from './lib/supabase'

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
