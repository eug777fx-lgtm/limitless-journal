// First-time Network setup (and Edit profile): photo and name, how you trade, privacy, who to follow.
// Saves to the same network_profiles row the classic Network used.
import React from 'react'
import { Camera, Check, ArrowRight, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useStore } from './store.jsx'
import { Modal, CloseBtn } from './ui.jsx'

const STYLES = ['Futures', 'Forex', 'Indices', 'Crypto', 'Gold', 'Scalper', 'Day trader', 'Swing', 'ICT', 'Price action', 'Order flow', 'Funded trader']
const STEPS = ['Profile', 'Style', 'Privacy', 'Follow']

function Toggle({ on, onChange, label, sub }) {
  return (
    <button type="button" className="ns-toggle" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="ns-tl"><b>{label}</b><small>{sub}</small></span>
      <span className={'ns-sw' + (on ? ' on' : '')}><i /></span>
    </button>
  )
}

export default function NetworkSetup({ open, onClose, np, onSaved, edit = false }) {
  const { session, profile, notify } = useStore()
  const me = session?.user?.id
  const [step, setStep] = React.useState(0)
  const [f, setF] = React.useState(null)
  const [lb, setLb] = React.useState(false)
  const [up, setUp] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [people, setPeople] = React.useState([])
  const [following, setFollowing] = React.useState(new Set())
  const file = React.useRef(null)

  React.useEffect(() => {
    if (!open) return
    setStep(0)
    const name = np?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.username || ''
    setF({
      display_name: name, bio: np?.bio || '', trading_style: np?.trading_style || '', twitter: np?.twitter || '', instagram: np?.instagram || '',
      is_public: np?.is_public ?? true, stats_visible: np?.stats_visible ?? false, show_pnl: np?.show_pnl ?? false, avatar_url: np?.avatar_url || '',
    })
    setLb(!!profile?.show_on_leaderboard)
    if (me) {
      supabase.from('network_follows').select('following_id').eq('follower_id', me).then(({ data }) => setFollowing(new Set((data || []).map((x) => x.following_id))))
      supabase.rpc('network_leaderboard', { period: 'month' }).then(async ({ data }) => {
        let list = (data || []).filter((r) => r.user_id !== me).slice(0, 8)
        if (list.length < 6) {
          const { data: more } = await supabase.from('network_profiles').select('user_id, display_name, avatar_url, trading_style').neq('user_id', me).eq('is_public', true).limit(12)
          const seen = new Set(list.map((r) => r.user_id))
          list = [...list, ...(more || []).filter((r) => !seen.has(r.user_id))].slice(0, 8)
        }
        setPeople(list)
      }, () => setPeople([]))
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!f) return null
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e && e.target ? e.target.value : e }))
  const styles = f.trading_style ? f.trading_style.split(' · ').filter(Boolean) : []
  const toggleStyle = (s) => { const n = styles.includes(s) ? styles.filter((x) => x !== s) : [...styles, s]; setF((p) => ({ ...p, trading_style: n.join(' · ') })) }

  const avatar = async (e) => {
    const fl = e.target.files?.[0]; e.target.value = ''
    if (!fl || !me) return
    setUp(true)
    try {
      const ext = (fl.name.split('.').pop() || 'png').toLowerCase()
      const path = `avatars/${me}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('chart-images').upload(path, fl)
      if (error) throw error
      const { data } = supabase.storage.from('chart-images').getPublicUrl(path)
      setF((p) => ({ ...p, avatar_url: data.publicUrl }))
    } catch (err) { notify(`Photo upload failed: ${err.message}`, 'err') }
    setUp(false)
  }
  const follow = async (uid) => {
    if (!me) return
    const on = following.has(uid)
    setFollowing((s) => { const n = new Set(s); on ? n.delete(uid) : n.add(uid); return n })
    if (on) await supabase.from('network_follows').delete().eq('follower_id', me).eq('following_id', uid)
    else await supabase.from('network_follows').insert({ follower_id: me, following_id: uid })
  }
  const save = async () => {
    if (!f.display_name.trim()) { setStep(0); return notify('Add the name traders will see', 'err') }
    setBusy(true)
    try {
      const { data, error } = await supabase.from('network_profiles').upsert({ user_id: me, ...f, display_name: f.display_name.trim(), bio: f.bio.trim(), updated_at: new Date().toISOString() }).select().maybeSingle()
      if (error) throw error
      await supabase.from('profiles').update({ show_on_leaderboard: lb }).eq('id', me)
      try { localStorage.setItem('ltj_nx_setup_' + me, '1') } catch { /* ignore */ }
      onSaved && onSaved(data || { user_id: me, ...f }, following)
      notify(edit ? 'Profile saved' : "You're set. Say hi to the Network.")
      onClose()
    } catch (e) { notify(e.message, 'err') }
    setBusy(false)
  }
  const last = step === STEPS.length - 1
  const ini = (f.display_name || 'T').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <Modal open={open} onClose={onClose} label={edit ? 'Edit your Network profile' : 'Set up your Network profile'} maxWidth={560}>
      <div className="lt ns">
        <header className="lt-head">
          <div className="col" style={{ gap: 4 }}>
            <span className="sk-mono">{edit ? 'Edit profile' : 'Welcome to the Network'} · {step + 1} of {STEPS.length}</span>
            <h2>{['Your trader profile', 'How do you trade?', 'Your privacy', 'Follow a few traders'][step]}</h2>
          </div>
          <CloseBtn onClick={onClose} />
        </header>
        <div className="ns-bar"><i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>

        {step === 0 && (
          <div className="ns-body">
            <p className="ns-lead">This is how other traders see you in the feed and on the leaderboard.</p>
            <div className="ns-avrow">
              <button type="button" className="ns-av" onClick={() => file.current.click()} aria-label="Upload a profile photo">
                {f.avatar_url ? <img src={f.avatar_url} alt="" /> : <span>{ini}</span>}
                <i><Camera size={14} /></i>
              </button>
              <div className="col" style={{ gap: 4 }}>
                <b>{up ? 'Uploading…' : f.avatar_url ? 'Looking good' : 'Add a photo'}</b>
                <span className="nx-dim nx-small">A face or a logo. Square works best.</span>
              </div>
              <input ref={file} type="file" accept="image/*" className="sr" onChange={avatar} />
            </div>
            <label className="lt-field"><span>Name traders see</span><input className="input" value={f.display_name} onChange={set('display_name')} maxLength={40} placeholder="Your name or trading name" /></label>
          </div>
        )}

        {step === 1 && (
          <div className="ns-body">
            <p className="ns-lead">Pick what fits. It shows on your profile so the right traders find you.</p>
            <div className="lt-tags">{STYLES.map((s) => <button key={s} type="button" className={'lt-chip' + (styles.includes(s) ? ' on' : '')} onClick={() => toggleStyle(s)}>{styles.includes(s) && <Check size={12} strokeWidth={3} />}{s}</button>)}</div>
            <label className="lt-field"><span>Short bio</span><textarea className="input" rows={3} maxLength={160} value={f.bio} onChange={set('bio')} placeholder="NQ scalper. London open. Journaling every trade since 2024." /></label>
            <div className="lt-row">
              <label className="lt-field"><span>X (optional)</span><input className="input" value={f.twitter} onChange={set('twitter')} placeholder="handle" /></label>
              <label className="lt-field"><span>Instagram (optional)</span><input className="input" value={f.instagram} onChange={set('instagram')} placeholder="handle" /></label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="ns-body">
            <p className="ns-lead">You decide what other traders can see. You can change this anytime.</p>
            <Toggle on={f.is_public} onChange={set('is_public')} label="Public profile" sub="Other members can open your profile" />
            <Toggle on={f.show_pnl} onChange={set('show_pnl')} label="Show $ amounts" sub="Off means only R and win or loss are shown" />
            <Toggle on={f.stats_visible} onChange={set('stats_visible')} label="Show my stats" sub="Win rate and average R on your profile" />
            <Toggle on={lb} onChange={setLb} label="Appear on the leaderboard" sub="Ranked by R gained, never by $" />
          </div>
        )}

        {step === 3 && (
          <div className="ns-body">
            <p className="ns-lead">Follow traders to fill your Following tab. You can skip this.</p>
            {!people.length && <span className="nx-dim">No other traders to show yet.</span>}
            <div className="ns-people">
              {people.map((p) => (
                <div key={p.user_id} className="ns-person">
                  {p.avatar_url ? <img className="nx-av" src={p.avatar_url} alt="" style={{ width: 40, height: 40 }} /> : <span className="nx-av" style={{ width: 40, height: 40 }}>{(p.display_name || 'T').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>}
                  <span className="nx-who"><b>{p.display_name || p.username || 'Trader'}</b><small>{p.r_gained != null ? `${p.r_gained >= 0 ? '+' : '−'}${Math.abs(Number(p.r_gained)).toFixed(1)}R this month` : p.trading_style || 'LIMITLESS trader'}</small></span>
                  <button type="button" className={'nx-follow' + (following.has(p.user_id) ? ' on' : '')} onClick={() => follow(p.user_id)}>{following.has(p.user_id) ? 'Following' : 'Follow'}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="lt-foot">
          {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}><ArrowLeft size={15} /> Back</button>}
          {!last && <button type="button" className="btn btn-primary" disabled={step === 0 && !f.display_name.trim()} onClick={() => setStep(step + 1)}>Next <ArrowRight size={15} /></button>}
          {last && <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : edit ? 'Save profile' : 'Finish'}</button>}
        </footer>
      </div>
    </Modal>
  )
}
