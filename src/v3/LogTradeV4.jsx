// Log trade, new look (owner preview). The essentials up front: symbol (searchable), side,
// date, P&L, R:R, tags and a screenshot. Everything else sits under "More details".
import React from 'react'
import { Image as ImageIcon, X, ChevronDown, Search, Plus, Check } from 'lucide-react'
import { useStore } from './store.jsx'
import { Modal, CloseBtn } from './ui.jsx'
import { SESSIONS, STATES, RATINGS, money, todayISO } from './data.js'

export const SYMBOLS = [
  ['NQ', 'Nasdaq 100 E-mini', 'Futures'], ['MNQ', 'Micro Nasdaq 100', 'Futures'], ['ES', 'S&P 500 E-mini', 'Futures'], ['MES', 'Micro S&P 500', 'Futures'],
  ['YM', 'Dow E-mini', 'Futures'], ['MYM', 'Micro Dow', 'Futures'], ['RTY', 'Russell 2000 E-mini', 'Futures'], ['M2K', 'Micro Russell 2000', 'Futures'],
  ['GC', 'Gold', 'Futures'], ['MGC', 'Micro Gold', 'Futures'], ['SI', 'Silver', 'Futures'], ['CL', 'Crude Oil', 'Futures'], ['MCL', 'Micro Crude Oil', 'Futures'],
  ['NG', 'Natural Gas', 'Futures'], ['ZB', '30 Year Treasury Bond', 'Futures'], ['ZN', '10 Year Treasury Note', 'Futures'], ['6E', 'Euro FX', 'Futures'], ['6B', 'British Pound', 'Futures'],
  ['EUR/USD', 'Euro / US Dollar', 'Forex'], ['GBP/USD', 'British Pound / US Dollar', 'Forex'], ['USD/JPY', 'US Dollar / Yen', 'Forex'], ['AUD/USD', 'Aussie / US Dollar', 'Forex'],
  ['USD/CAD', 'US Dollar / Canadian Dollar', 'Forex'], ['USD/CHF', 'US Dollar / Swiss Franc', 'Forex'], ['NZD/USD', 'Kiwi / US Dollar', 'Forex'], ['EUR/GBP', 'Euro / British Pound', 'Forex'],
  ['EUR/JPY', 'Euro / Yen', 'Forex'], ['GBP/JPY', 'British Pound / Yen', 'Forex'],
  ['XAU/USD', 'Gold spot', 'Metals'], ['XAG/USD', 'Silver spot', 'Metals'],
  ['NAS100', 'Nasdaq 100 CFD', 'Indices'], ['US30', 'Dow 30 CFD', 'Indices'], ['SPX500', 'S&P 500 CFD', 'Indices'], ['GER40', 'DAX 40 CFD', 'Indices'], ['UK100', 'FTSE 100 CFD', 'Indices'],
  ['BTC/USD', 'Bitcoin', 'Crypto'], ['ETH/USD', 'Ethereum', 'Crypto'], ['SOL/USD', 'Solana', 'Crypto'],
]
export const BASE_TAGS = ['Revenge Trade', 'Liquidity Sweep', 'IFVG', 'FVG', 'Order Block', 'Break of Structure', 'SMT', 'News Trade', 'FOMO']
const TAG_KEY = 'ltj_custom_tags'
const readTags = () => { try { const v = JSON.parse(localStorage.getItem(TAG_KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }
const writeTags = (v) => { try { localStorage.setItem(TAG_KEY, JSON.stringify(v)) } catch { /* private mode */ } }

const blank = (sym = '') => ({ symbol: sym, side: 'Long', date: todayISO(), pnl: '', rr: '', session: '', state: '', rating: '', tags: [], plan: '', entry: '', exit: '', reason: '', right: '', wrong: '', note: '' })
const fromTrade = (t) => ({
  symbol: t.symbol || '', side: t.side === 'Short' ? 'Short' : 'Long', date: t.date, pnl: t.raw.pnl ?? '', rr: t.raw.rr ?? '',
  session: t.session || '', state: t.state || '', rating: t.rating || '', tags: (t.tags || []).filter((g) => !RATINGS.includes(g)), plan: t.plan || '',
  entry: t.raw.entry ?? '', exit: t.raw.exit ?? '', reason: t.reason, right: t.right, wrong: t.wrong, note: t.note,
})
const num = (s) => { const v = Number(String(s).replace(/[$,\s]/g, '')); return s === '' || s === null || Number.isNaN(v) ? null : v }

function SymbolSearch({ value, onChange, recent }) {
  const [q, setQ] = React.useState(value)
  const [open, setOpen] = React.useState(false)
  const [hi, setHi] = React.useState(0)
  const box = React.useRef(null)
  React.useEffect(() => { setQ(value) }, [value])
  React.useEffect(() => {
    if (!open) return
    const close = (e) => { if (box.current && !box.current.contains(e.target)) { setOpen(false); setQ(value) } }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open, value])
  const term = q.trim().toUpperCase().replace(/\s+/g, '')
  const list = React.useMemo(() => {
    const all = [...recent.filter((r) => !SYMBOLS.some(([k]) => k === r)).map((r) => [r, 'Your symbol', 'Recent']), ...SYMBOLS]
    if (!term) return all.slice(0, 40)
    const t = term.replace('/', '')
    return all.filter(([k, n]) => k.replace('/', '').includes(t) || n.toUpperCase().includes(term)).slice(0, 30)
  }, [term, recent])
  const exact = list.some(([k]) => k.replace('/', '') === term.replace('/', ''))
  const opts = term && !exact ? [...list, [term, 'Use this symbol', 'Custom']] : list
  const pick = (k) => { onChange(k); setQ(k); setOpen(false) }
  const key = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi((h) => Math.min(opts.length - 1, h + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (opts[hi]) pick(opts[hi][0]) }
    else if (e.key === 'Escape') { setOpen(false); setQ(value) }
  }
  return (
    <div className="lt-sym" ref={box}>
      <label className="lt-symbox">
        <Search size={16} />
        <input value={q} placeholder="Search symbol, e.g. NQ, gold, EUR/USD" onFocus={() => { setOpen(true); setHi(0) }} onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0) }} onKeyDown={key} aria-label="Symbol" role="combobox" aria-expanded={open} autoComplete="off" spellCheck="false" />
        {value && <b className="lt-symval">{value}</b>}
      </label>
      {open && (
        <div className="lt-symlist" role="listbox">
          {opts.length === 0 && <span className="lt-none">Type the symbol you traded</span>}
          {opts.map(([k, n, g], i) => (
            <button key={k + g} type="button" role="option" aria-selected={i === hi} className={i === hi ? 'hi' : ''} onMouseEnter={() => setHi(i)} onClick={() => pick(k)}>
              <b>{k}</b><span>{n}</span><small>{g}</small>{value === k && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
      {recent.length > 0 && (
        <div className="lt-recent">
          {recent.slice(0, 6).map((r) => <button key={r} type="button" className={'lt-chip' + (value === r ? ' on' : '')} onClick={() => pick(r)}>{r}</button>)}
        </div>
      )}
    </div>
  )
}

function TagPicker({ value, onChange, mine }) {
  const [draft, setDraft] = React.useState('')
  const all = [...new Set([...BASE_TAGS, ...mine, ...value])]
  const toggle = (g) => onChange(value.includes(g) ? value.filter((x) => x !== g) : [...value, g])
  const add = () => {
    const g = draft.trim().replace(/\s+/g, ' ')
    if (!g) return
    const name = g.length <= 4 ? g.toUpperCase() : g.replace(/\b\w/g, (c) => c.toUpperCase())
    if (!value.includes(name)) onChange([...value, name])
    const saved = readTags(); if (!saved.includes(name) && !BASE_TAGS.includes(name)) writeTags([...saved, name].slice(-40))
    setDraft('')
  }
  return (
    <div className="lt-tags">
      {all.map((g) => <button key={g} type="button" className={'lt-chip' + (value.includes(g) ? ' on' : '')} aria-pressed={value.includes(g)} onClick={() => toggle(g)}>{value.includes(g) && <Check size={12} strokeWidth={3} />}{g}</button>)}
      <span className="lt-addtag">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder="Your own tag" aria-label="New tag" maxLength={28} />
        <button type="button" aria-label="Add tag" onClick={add} disabled={!draft.trim()}><Plus size={14} /></button>
      </span>
    </div>
  )
}

function Opt({ options, value, onChange }) {
  return (
    <div className="lt-opts">
      {options.map((o) => { const v = typeof o === 'string' ? o : o.value, l = typeof o === 'string' ? o : o.label; return <button key={v} type="button" className={'lt-chip' + (value === v ? ' on' : '')} aria-pressed={value === v} onClick={() => onChange(value === v ? '' : v)}>{l}</button> })}
    </div>
  )
}

export default function LogTradeV4() {
  const { log, closeLog, addTrade, updateTrade, notify, openShare, uploadImages, user, trades } = useStore()
  const editing = log && log.mode === 'edit' ? log.trade : null
  const recent = React.useMemo(() => [...new Set(trades.map((t) => t.symbol).filter((x) => x && x !== '—'))].slice(0, 12), [trades])
  const mine = React.useMemo(() => {
    const used = new Map()
    trades.forEach((t) => (t.tags || []).forEach((g) => { if (!RATINGS.includes(g)) used.set(g, (used.get(g) || 0) + 1) }))
    return [...new Set([...[...used.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g), ...readTags()])].slice(0, 16)
  }, [trades, log])
  const [f, setF] = React.useState(() => blank())
  const [keep, setKeep] = React.useState([])
  const [files, setFiles] = React.useState([])
  const [prices, setPrices] = React.useState(false)
  const [more, setMore] = React.useState(false)
  const [err, setErr] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!log) return
    setErr(''); setFiles([]); setBusy(false)
    if (editing) {
      setF(fromTrade(editing)); setKeep(editing.shots); setPrices(editing.entry !== null || editing.exit !== null)
      setMore(!!(editing.session || editing.state || editing.rating || editing.reason || editing.right || editing.wrong || editing.note))
    } else { setF(blank(recent[0] || '')); setKeep([]); setPrices(false); setMore(false) }
  }, [log]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v && v.target ? v.target.value : v }))
  const total = keep.length + files.length
  const addFiles = (list) => {
    const imgs = Array.from(list || []).filter((x) => x.type && x.type.startsWith('image/')).slice(0, Math.max(0, 4 - total))
    setFiles((cur) => [...cur, ...imgs.map((file) => ({ file, url: URL.createObjectURL(file) }))])
  }
  const onPaste = (e) => { if (e.clipboardData && e.clipboardData.files.length) addFiles(e.clipboardData.files) }
  const pnlV = num(f.pnl)

  const save = async (again) => {
    const symbol = f.symbol.trim().toUpperCase()
    if (!symbol) return setErr('Pick a symbol.')
    if (pnlV === null) return setErr('Add the P&L in dollars, for example 350 or -180.')
    setErr(''); setBusy(true)
    let urls = [...keep]
    if (files.length) {
      try { urls = urls.concat(await uploadImages(files.map((x) => x.file), user.id)) }
      catch (e) { notify(`Screenshot upload failed: ${e.message}. The trade saves without it.`, 'err') }
    }
    const tags = f.tags
    const row = {
      symbol, direction: f.side, trade_date: f.date || todayISO(),
      pnl: pnlV, rr: num(f.rr), session: f.session || null,
      emotional_state: f.state || null, trade_rating: f.rating || null,
      tags: tags.length ? tags : null, followed_plan: f.plan || null,
      entry: num(f.entry), exit: num(f.exit),
      entry_reason: f.reason.trim() || null, did_correctly: f.right.trim() || null, did_wrong: f.wrong.trim() || null, notes: f.note.trim() || null,
      chart_url: urls.length === 0 ? null : urls.length === 1 ? urls[0] : JSON.stringify(urls),
    }
    try {
      const saved = editing ? await updateTrade(editing.id, row) : await addTrade(row)
      notify(`${editing ? 'Trade updated' : 'Trade saved'} · ${money(Math.round(saved.pnl))}`)
      files.forEach((x) => URL.revokeObjectURL(x.url))
      if (again && !editing) { setF({ ...blank(f.symbol), date: f.date, session: f.session }); setFiles([]); setKeep([]) }
      else closeLog()
      if (!editing && !again && saved.pnl > 0) setTimeout(() => openShare(saved), 450)
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <Modal open={!!log} onClose={closeLog} label={editing ? 'Edit trade' : 'Log trade'} maxWidth={640}>
      <div onPaste={onPaste} className="lt">
        <header className="lt-head">
          <div className="col" style={{ gap: 4 }}>
            <span className="sk-mono">{editing ? 'Edit trade' : 'New trade'} · {new Date((f.date || todayISO()) + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            <h2>{f.symbol || 'Log a trade'} <span>{f.symbol ? f.side : ''}</span></h2>
          </div>
          <CloseBtn onClick={closeLog} />
        </header>

        <SymbolSearch value={f.symbol} onChange={set('symbol')} recent={recent} />

        <div className="lt-row">
          <div className="lt-side" role="group" aria-label="Side">
            {['Long', 'Short'].map((k) => <button key={k} type="button" aria-pressed={f.side === k} className={f.side === k ? 'on' : ''} onClick={() => set('side')(k)}>{k}</button>)}
          </div>
          <label className="lt-field"><span>Date</span><input className="input num" type="date" value={f.date} onChange={set('date')} /></label>
        </div>

        <div className="lt-money">
          <label className="lt-pnl">
            <span className="sk-mono">P&amp;L ($)</span>
            <input className="num" inputMode="decimal" placeholder="0" value={f.pnl} onChange={set('pnl')} aria-label="P and L in dollars" />
            <small>{pnlV === null ? 'Use a minus for a loss, e.g. -180' : pnlV > 0 ? 'Win' : pnlV < 0 ? 'Loss' : 'Break even'}</small>
          </label>
          <label className="lt-rr">
            <span className="sk-mono">R:R</span>
            <input className="num" inputMode="decimal" placeholder="2.0" value={f.rr} onChange={set('rr')} aria-label="Risk to reward" />
            <small>Optional</small>
          </label>
        </div>

        <button type="button" className="lt-toggle" onClick={() => setPrices((p) => !p)}><ChevronDown size={14} style={{ transform: prices ? 'rotate(180deg)' : 'none' }} /> Entry and exit (optional)</button>
        {prices && (
          <div className="lt-row">
            <label className="lt-field"><span>Entry</span><input className="input num" inputMode="decimal" value={f.entry} onChange={set('entry')} /></label>
            <label className="lt-field"><span>Exit</span><input className="input num" inputMode="decimal" value={f.exit} onChange={set('exit')} /></label>
          </div>
        )}

        <div className="lt-block">
          <span className="sk-mono">Tags</span>
          <TagPicker value={f.tags} onChange={set('tags')} mine={mine} />
        </div>

        <div className="lt-block">
          <span className="sk-mono">Followed your plan?</span>
          <Opt options={[{ value: 'YES', label: 'Yes' }, { value: 'PARTIALLY', label: 'Partly' }, { value: 'NO', label: 'No' }]} value={f.plan} onChange={set('plan')} />
        </div>

        <label htmlFor="lt4-shots" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }} className="lt-drop">
          {total ? (
            <span className="lt-thumbs">
              {keep.map((src) => (
                <span key={src}><img src={src} alt="" /><button type="button" aria-label="Remove screenshot" onClick={(e) => { e.preventDefault(); setKeep(keep.filter((x) => x !== src)) }}><X size={12} /></button></span>
              ))}
              {files.map((x) => (
                <span key={x.url}><img src={x.url} alt="" /><button type="button" aria-label="Remove screenshot" onClick={(e) => { e.preventDefault(); setFiles(files.filter((y) => y !== x)) }}><X size={12} /></button></span>
              ))}
            </span>
          ) : <ImageIcon size={18} />}
          <span><b>{total ? `${total} of 4 screenshots` : 'Add a chart screenshot'}</b><small>Paste, drop or click. Shows on your journal card.</small></span>
          <input id="lt4-shots" type="file" accept="image/*" multiple className="sr" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
        </label>

        <button type="button" className="lt-toggle" onClick={() => setMore((m) => !m)}><ChevronDown size={14} style={{ transform: more ? 'rotate(180deg)' : 'none' }} /> More details: session, mood, grade, notes</button>
        {more && (
          <div className="lt-more">
            <div className="lt-block"><span className="sk-mono">Session</span><Opt options={SESSIONS} value={f.session} onChange={set('session')} /></div>
            <div className="lt-block"><span className="sk-mono">How you felt</span><Opt options={STATES} value={f.state} onChange={set('state')} /></div>
            <div className="lt-block"><span className="sk-mono">Setup grade</span><Opt options={RATINGS} value={f.rating} onChange={set('rating')} /></div>
            <label className="lt-field"><span>Why you took it</span><textarea rows="2" className="input" value={f.reason} onChange={set('reason')} placeholder="Swept the low, waited for displacement" /></label>
            <div className="lt-row">
              <label className="lt-field"><span>Did right</span><textarea rows="2" className="input" value={f.right} onChange={set('right')} /></label>
              <label className="lt-field"><span>Did wrong</span><textarea rows="2" className="input" value={f.wrong} onChange={set('wrong')} /></label>
            </div>
            <label className="lt-field"><span>Notes</span><textarea rows="2" className="input" value={f.note} onChange={set('note')} /></label>
          </div>
        )}

        {err && <p role="alert" className="lt-err">{err}</p>}
        <footer className="lt-foot">
          {!editing && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => save(true)}>Save and log another</button>}
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save(false)}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save trade'}</button>
        </footer>
      </div>
    </Modal>
  )
}
