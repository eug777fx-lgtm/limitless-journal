import React from 'react'
import { Image as ImageIcon, X, ChevronDown } from 'lucide-react'
import { useStore } from './store.jsx'
import { Seg, Modal, CloseBtn } from './ui.jsx'
import { QUICK_SYMBOLS, SESSIONS, STATES, RATINGS, TAGS, money, todayISO } from './data.js'

const blank = () => ({ symbol: 'NQ', other: '', side: 'Long', date: todayISO(), pnl: '', rr: '', session: 'New York', state: '', rating: '', tags: [], plan: '', entry: '', exit: '', reason: '', right: '', wrong: '', note: '' })
const fromTrade = (t) => ({
  symbol: QUICK_SYMBOLS.includes(t.symbol) ? t.symbol : 'Other', other: QUICK_SYMBOLS.includes(t.symbol) ? '' : t.symbol,
  side: t.side === 'Short' ? 'Short' : 'Long', date: t.date, pnl: t.raw.pnl ?? '', rr: t.raw.rr ?? '',
  session: t.session || '', state: t.state || '', rating: t.rating || '', tags: t.tags || [], plan: t.plan || '',
  entry: t.raw.entry ?? '', exit: t.raw.exit ?? '', reason: t.reason, right: t.right, wrong: t.wrong, note: t.note,
})
const num = (s) => { const v = Number(String(s).replace(/[$,\s]/g, '')); return s === '' || s === null || Number.isNaN(v) ? null : v }

function Chips({ options, value, onChange, multi = false, label }) {
  const on = (o) => (multi ? value.includes(o) : value === o)
  const toggle = (o) => {
    if (multi) onChange(on(o) ? value.filter((x) => x !== o) : [...value, o])
    else onChange(on(o) ? '' : o)
  }
  return (
    <div className="col" style={{ gap: 8 }}>
      <span className="faint" style={{ fontSize: 12.5 }}>{label}</span>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {options.map((o) => <button key={o} type="button" className="chip" aria-pressed={on(o)} onClick={() => toggle(o)}>{o}</button>)}
      </div>
    </div>
  )
}

export default function LogTrade() {
  const { log, closeLog, addTrade, updateTrade, notify, openShare, uploadImages, user } = useStore()
  const editing = log && log.mode === 'edit' ? log.trade : null
  const [f, setF] = React.useState(blank)
  const [keep, setKeep] = React.useState([]) // existing screenshot URLs kept on edit
  const [files, setFiles] = React.useState([]) // { file, url }
  const [prices, setPrices] = React.useState(false)
  const [err, setErr] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!log) return
    setErr(''); setFiles([]); setBusy(false)
    if (editing) { setF(fromTrade(editing)); setKeep(editing.shots); setPrices(editing.entry !== null || editing.exit !== null) }
    else { setF(blank()); setKeep([]); setPrices(false) }
  }, [log]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v && v.target ? v.target.value : v }))
  const total = keep.length + files.length
  const addFiles = (list) => {
    const imgs = Array.from(list || []).filter((x) => x.type && x.type.startsWith('image/')).slice(0, Math.max(0, 4 - total))
    setFiles((cur) => [...cur, ...imgs.map((file) => ({ file, url: URL.createObjectURL(file) }))])
  }
  const onPaste = (e) => { if (e.clipboardData && e.clipboardData.files.length) addFiles(e.clipboardData.files) }

  const save = async (again) => {
    const symbol = (f.symbol === 'Other' ? f.other : f.symbol).trim().toUpperCase()
    if (!symbol) return setErr('Pick a symbol or type one in.')
    const pnl = num(f.pnl)
    if (pnl === null) return setErr('Add the P&L in dollars, for example 350 or -180.')
    setErr(''); setBusy(true)
    let urls = [...keep]
    if (files.length) {
      try { urls = urls.concat(await uploadImages(files.map((x) => x.file), user.id)) }
      catch (e) { notify(`Screenshot upload failed: ${e.message}. The trade saves without it.`, 'err') }
    }
    const row = {
      symbol, direction: f.side, trade_date: f.date || todayISO(),
      pnl, rr: num(f.rr), session: f.session || null,
      emotional_state: f.state || null, trade_rating: f.rating || null,
      tags: f.tags.length ? f.tags : null, followed_plan: f.plan || null,
      entry: num(f.entry), exit: num(f.exit),
      entry_reason: f.reason.trim() || null, did_correctly: f.right.trim() || null, did_wrong: f.wrong.trim() || null, notes: f.note.trim() || null,
      chart_url: urls.length === 0 ? null : urls.length === 1 ? urls[0] : JSON.stringify(urls),
    }
    try {
      const saved = editing ? await updateTrade(editing.id, row) : await addTrade(row)
      notify(`${editing ? 'Trade updated' : 'Trade saved'} · ${money(Math.round(saved.pnl))}`)
      files.forEach((x) => URL.revokeObjectURL(x.url))
      if (again && !editing) { setF({ ...blank(), symbol: f.symbol, other: f.other, session: f.session, date: f.date }); setFiles([]); setKeep([]) }
      else closeLog()
      if (!editing && !again && saved.pnl > 0) setTimeout(() => openShare(saved), 450)
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <Modal open={!!log} onClose={closeLog} label={editing ? 'Edit trade' : 'Log trade'}>
      <div onPaste={onPaste} className="col" style={{ gap: 20 }}>
        <div className="row" style={{ gap: 12 }}>
          <div className="col" style={{ flex: 1, gap: 2 }}>
            <h2 style={{ fontSize: 26, fontWeight: 600 }}>{editing ? 'Edit trade' : 'Log trade'}</h2>
            <span className="muted" style={{ fontSize: 13 }}>The number first, then the why. The review is what makes you better.</span>
          </div>
          <CloseBtn onClick={closeLog} />
        </div>

        <div className="col" style={{ gap: 8 }}>
          <span className="faint" style={{ fontSize: 12.5 }}>Symbol</span>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {[...QUICK_SYMBOLS, 'Other'].map((k) => <button key={k} type="button" className="chip" aria-pressed={f.symbol === k} onClick={() => setF({ ...f, symbol: k })}>{k}</button>)}
          </div>
          {f.symbol === 'Other' && <input className="input" aria-label="Symbol" placeholder="Type the symbol, for example RTY or USD/JPY" value={f.other} onChange={set('other')} style={{ maxWidth: 360 }} />}
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div className="col" style={{ gap: 8 }}>
            <span className="faint" style={{ fontSize: 12.5 }}>Side</span>
            <Seg options={['Long', 'Short']} value={f.side} onChange={set('side')} label="Side" style={{ display: 'flex' }} className="seg-full" />
          </div>
          <label className="field"><span>Date</span><input className="input num" type="date" value={f.date} onChange={set('date')} /></label>
          <label className="field"><span>P&amp;L ($)</span><input className="input num" inputMode="decimal" placeholder="350 or -180" value={f.pnl} onChange={set('pnl')} /></label>
          <label className="field"><span>R:R</span><input className="input num" inputMode="decimal" placeholder="2.0" value={f.rr} onChange={set('rr')} /></label>
        </div>

        <button type="button" className="row" onClick={() => setPrices((p) => !p)} style={{ gap: 6, background: 'transparent', border: 'none', padding: 0, fontSize: 13, color: 'var(--fg2)', alignSelf: 'flex-start' }}>
          <ChevronDown size={14} style={{ transform: prices ? 'rotate(180deg)' : 'none', transition: 'transform .3s' }} /> Entry and exit prices (optional)
        </button>
        {prices && (
          <div className="grid g2" style={{ gap: 12, marginTop: -8 }}>
            <label className="field"><span>Entry</span><input className="input num" inputMode="decimal" value={f.entry} onChange={set('entry')} /></label>
            <label className="field"><span>Exit</span><input className="input num" inputMode="decimal" value={f.exit} onChange={set('exit')} /></label>
          </div>
        )}

        <div className="col" style={{ gap: 8 }}>
          <span className="faint" style={{ fontSize: 12.5 }}>Session</span>
          <Seg options={SESSIONS} value={f.session} onChange={set('session')} label="Session" style={{ maxWidth: '100%', overflowX: 'auto' }} />
        </div>
        <Chips label="How you felt when you clicked" options={STATES} value={f.state} onChange={set('state')} />
        <div className="grid g2" style={{ gap: 18 }}>
          <Chips label="Setup grade" options={RATINGS} value={f.rating} onChange={set('rating')} />
          <Chips label="Tags" options={TAGS} value={f.tags} onChange={set('tags')} multi />
        </div>
        <div className="col" style={{ gap: 8 }}>
          <span className="faint" style={{ fontSize: 12.5 }}>Did you follow your plan?</span>
          <Seg options={[{ value: 'YES', label: 'Yes' }, { value: 'PARTIALLY', label: 'Partly' }, { value: 'NO', label: 'No' }]} value={f.plan} onChange={set('plan')} label="Followed plan" />
        </div>

        <div className="grid g2" style={{ gap: 12 }}>
          <label className="field"><span>Why did you take this trade?</span><textarea rows="3" className="input" placeholder="Swept London low, waited for displacement, entered on the FVG" value={f.reason} onChange={set('reason')} /></label>
          <label htmlFor="lt-shots" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }} className="ink col" style={{ minHeight: 116, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', padding: 12 }}>
            {total ? (
              <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {keep.map((src) => (
                  <span key={src} style={{ position: 'relative' }}>
                    <img src={src} alt="" style={{ width: 74, height: 54, objectFit: 'cover', borderRadius: 10 }} />
                    <button type="button" aria-label="Remove screenshot" onClick={(e) => { e.preventDefault(); setKeep(keep.filter((x) => x !== src)) }} style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#fff', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><X size={12} /></button>
                  </span>
                ))}
                {files.map((x) => (
                  <span key={x.url} style={{ position: 'relative' }}>
                    <img src={x.url} alt="" style={{ width: 74, height: 54, objectFit: 'cover', borderRadius: 10 }} />
                    <button type="button" aria-label="Remove screenshot" onClick={(e) => { e.preventDefault(); setFiles(files.filter((y) => y !== x)) }} style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#fff', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><X size={12} /></button>
                  </span>
                ))}
              </div>
            ) : <ImageIcon size={22} className="muted" />}
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>{total ? `${total} of 4 screenshots` : 'Paste or drop chart screenshots'}</span>
            <span className="faint hide-sm" style={{ fontSize: 11.5 }}>⌘V works anywhere in this window</span>
            <input id="lt-shots" type="file" accept="image/*" multiple className="sr" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
          </label>
          <label className="field"><span>What did you do right?</span><textarea rows="3" className="input" placeholder="Waited for confirmation, respected my stop" value={f.right} onChange={set('right')} /></label>
          <label className="field"><span>What did you do wrong?</span><textarea rows="3" className="input" placeholder="Moved my target early" value={f.wrong} onChange={set('wrong')} /></label>
        </div>
        <label className="field"><span>Notes</span><textarea rows="2" className="input" placeholder="Market context, anything to remember next time" value={f.note} onChange={set('note')} /></label>

        {err && <p role="alert" style={{ color: 'var(--neg)', fontSize: 13 }}>{err}</p>}
        <div className="row" style={{ gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {!editing && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => save(true)}>Save and log another</button>}
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save(false)}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save trade'}</button>
        </div>
      </div>
    </Modal>
  )
}
