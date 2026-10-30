import React from 'react'
import { Search, Upload, Download, Share2, PenLine, Trash2, FileSpreadsheet, ImageOff, X } from 'lucide-react'
import { useStore } from './store.jsx'
import { Seg, PnL, Modal, CloseBtn } from './ui.jsx'
import { money, fmtR, dayLabel, parseCSV, tradesToCSV } from './data.js'
import AppShell, { Empty } from './Shell.jsx'
import { TradeRow } from './Dashboard.jsx'

function Shots({ t }) {
  const [i, setI] = React.useState(0)
  const [zoom, setZoom] = React.useState(false)
  React.useEffect(() => { setI(0) }, [t.id])
  if (!t.shots.length) {
    return (
      <div className="ink col" style={{ borderRadius: 24, minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <ImageOff size={20} className="faint" />
        <span className="faint" style={{ fontSize: 12.5 }}>No chart screenshot on this trade</span>
      </div>
    )
  }
  return (
    <div className="col" style={{ gap: 8 }}>
      <button type="button" className="ink" onClick={() => setZoom(true)} style={{ borderRadius: 24, padding: 0, border: 'none', overflow: 'hidden', cursor: 'zoom-in' }} aria-label="Open screenshot">
        <img src={t.shots[i]} alt={`${t.symbol} chart ${i + 1}`} style={{ display: 'block', width: '100%', maxHeight: 320, objectFit: 'contain', background: '#000' }} />
      </button>
      {t.shots.length > 1 && (
        <div className="row" style={{ gap: 8 }}>
          {t.shots.map((s, k) => (
            <button key={s} type="button" onClick={() => setI(k)} aria-label={`Screenshot ${k + 1}`} style={{ width: 64, height: 44, borderRadius: 10, overflow: 'hidden', padding: 0, border: 'none', boxShadow: k === i ? '0 0 0 2px #fff' : 'inset 0 0 0 1px rgba(255,255,255,.15)' }}>
              <img src={s} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
      {zoom && (
        <div className="overlay" onMouseDown={() => setZoom(false)} style={{ alignItems: 'center', zIndex: 300 }}>
          <img src={t.shots[i]} alt="" style={{ maxWidth: '96vw', maxHeight: '90vh', borderRadius: 16 }} />
        </div>
      )}
    </div>
  )
}

function ReviewBlock({ label, text }) {
  if (!text || !text.trim()) return null
  return (
    <div className="well col" style={{ borderRadius: 20, padding: '14px 16px', gap: 6 }}>
      <span className="faint" style={{ fontSize: 12 }}>{label}</span>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'rgba(255,255,255,.88)', whiteSpace: 'pre-wrap' }}>{text}</p>
    </div>
  )
}

export function Detail({ t, onClose }) {
  const { openShare, editTrade, deleteTrade, notify } = useStore()
  const [confirm, setConfirm] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => { setConfirm(false) }, [t && t.id])
  if (!t) return null
  const tiles = [
    t.entry !== null && ['Entry', t.entry],
    t.exit !== null && ['Exit', t.exit],
    ['R:R', t.rr !== null ? Number(t.rr).toFixed(1) : '—'],
    ['Session', t.session || '—'],
    ['State', t.state || '—'],
    ['Plan', t.plan === 'YES' ? 'Followed' : t.plan === 'NO' ? 'Not followed' : t.plan === 'PARTIALLY' ? 'Partly' : '—'],
  ].filter(Boolean)
  const remove = async () => {
    setBusy(true)
    try { await deleteTrade(t.id); notify('Trade deleted'); onClose && onClose() } catch (e) { notify(e.message, 'err') }
    setBusy(false)
  }
  const reviewEmpty = ![t.reason, t.right, t.wrong, t.note].some((x) => x && x.trim())
  return (
    <div className="col" style={{ gap: 18 }}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div className="col" style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <span className="faint" style={{ fontSize: 12.5 }}>{dayLabel(t.date, true)}</span>
          <span className="display" style={{ fontSize: 20, fontWeight: 600 }}>{t.symbol} {t.side}</span>
          <span className="muted" style={{ fontSize: 13 }}>{[t.setup !== 'Untagged' ? t.setup : null, t.rating].filter(Boolean).join(' · ') || 'No setup tagged'}</span>
        </div>
        <span className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
          <PnL v={t.pnl} className="display" />
          {t.r !== null && <span className="faint num" style={{ fontSize: 13 }}>{fmtR(t.r)}</span>}
        </span>
        {onClose && <CloseBtn onClick={onClose} />}
      </div>
      <Shots t={t} />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {tiles.map(([k, v]) => (
          <div key={k} className="well col" style={{ borderRadius: 16, padding: '10px 12px', gap: 2, minWidth: 0 }}>
            <span className="faint" style={{ fontSize: 11 }}>{k}</span>
            <span className="num display" style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
          </div>
        ))}
      </div>
      {t.tags.length > 0 && <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>{t.tags.map((g) => <span key={g} className="well" style={{ fontSize: 12, fontWeight: 500, padding: '7px 12px', borderRadius: 99 }}>{g}</span>)}</div>}
      <ReviewBlock label="Why I took it" text={t.reason} />
      <ReviewBlock label="What I did right" text={t.right} />
      <ReviewBlock label="What I did wrong" text={t.wrong} />
      <ReviewBlock label="Notes" text={t.note} />
      {reviewEmpty && <div className="well" style={{ borderRadius: 20, padding: '14px 16px', fontSize: 13, color: 'var(--fg2)' }}>No review written yet. Add why you took it and what you would change.</div>}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => editTrade(t)}><PenLine size={15} /> Edit trade</button>
        {t.pnl > 0 && <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => openShare(t)}><Share2 size={15} /> Share this win</button>}
        <button type="button" className="icon-btn well" aria-label="Delete trade" onClick={() => setConfirm(true)}><Trash2 size={16} /></button>
      </div>
      {confirm && (
        <div className="ink col" style={{ borderRadius: 22, padding: 16, gap: 10 }}>
          <span className="display" style={{ fontWeight: 600 }}>Delete this trade?</span>
          <span className="muted" style={{ fontSize: 13 }}>{t.symbol} {t.side}, {money(t.pnl)} on {dayLabel(t.date)}. This can't be undone.</span>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>Keep it</button>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={remove}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function ImportModal({ open, onClose }) {
  const { importTrades, notify } = useStore()
  const [rows, setRows] = React.useState(null)
  const [file, setFile] = React.useState('')
  const [err, setErr] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [drag, setDrag] = React.useState(false)
  const reset = () => { setRows(null); setFile(''); setErr('') }
  const pick = (f) => {
    if (!f) return
    setErr('')
    const rd = new FileReader()
    rd.onload = () => {
      const parsed = parseCSV(String(rd.result || ''))
      if (!parsed.length) { setErr('No trades found. The file needs a header row with at least a symbol column.'); setRows(null); return }
      setFile(f.name); setRows(parsed)
    }
    rd.readAsText(f)
  }
  const run = async () => {
    setBusy(true); setErr('')
    try {
      const n = await importTrades(rows)
      notify(`${n} trade${n === 1 ? '' : 's'} imported`)
      reset(); onClose()
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }
  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} label="Import trades" maxWidth={620}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 22, fontWeight: 600 }}>Import trades</h2>
        <CloseBtn onClick={() => { reset(); onClose() }} />
      </div>
      <p className="muted">Drop a CSV exported from your platform or from LIMITLESS. Columns it reads: date, symbol, direction, pnl, rr, session, emotional_state, trade_rating, followed_plan, entry, exit, tags, notes.</p>
      {!rows ? (
        <label htmlFor="v3-csv" onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]) }}
          className="ink col" style={{ alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 180, borderRadius: 26, cursor: 'pointer', boxShadow: drag ? 'inset 0 0 0 2px #FFF' : undefined }}>
          <span className="check" style={{ width: 52, height: 52 }}><Upload size={20} /></span>
          <span className="display" style={{ fontWeight: 500 }}>Drop a CSV file or browse</span>
          <span className="faint" style={{ fontSize: 12 }}>Nothing is saved until you confirm</span>
          <input id="v3-csv" type="file" accept=".csv,text/csv" className="sr" onChange={(e) => { pick(e.target.files[0]); e.target.value = '' }} />
        </label>
      ) : (
        <div className="col" style={{ gap: 10 }}>
          <span className="faint" style={{ fontSize: 12.5 }}>{file} · {rows.length} trades found · first {Math.min(6, rows.length)} shown</span>
          <div className="well" style={{ borderRadius: 18, padding: 6, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead><tr>{['Date', 'Symbol', 'Side', 'P&L', 'R'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--fg3)', fontWeight: 500 }}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.slice(0, 6).map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={{ padding: '8px 10px' }}>{r.trade_date || 'today'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.symbol}</td>
                    <td style={{ padding: '8px 10px' }}>{r.direction || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{r.pnl === null ? '—' : <PnL v={r.pnl} />}</td>
                    <td style={{ padding: '8px 10px' }}>{r.rr === null ? '—' : r.rr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {err && <p role="alert" style={{ color: 'var(--neg)', fontSize: 13 }}>{err}</p>}
      <div className="row" style={{ gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {rows && <button type="button" className="btn btn-ghost" onClick={reset}>Choose another file</button>}
        <button type="button" className="btn btn-primary" disabled={!rows || busy} onClick={run}><FileSpreadsheet size={15} /> {busy ? 'Importing…' : rows ? `Import ${rows.length} trades` : 'Import'}</button>
      </div>
    </Modal>
  )
}

export function exportCSV(trades) {
  const csv = tradesToCSV(trades.map((t) => t.raw))
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `limitless-trades-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

export default function Journal() {
  const { trades, stats, openLog } = useStore()
  const [seg, setSeg] = React.useState('All')
  const [q, setQ] = React.useState('')
  const [sel, setSel] = React.useState(() => { try { return sessionStorage.getItem('ltj_v3_sel') || (trades[0] && trades[0].id) } catch { return trades[0] && trades[0].id } })
  const [sheet, setSheet] = React.useState(false)
  const [imp, setImp] = React.useState(false)
  const [limit, setLimit] = React.useState(40)
  React.useEffect(() => {
    try {
      const pre = sessionStorage.getItem('ltj_v3_sel')
      if (pre) { sessionStorage.removeItem('ltj_v3_sel'); if (window.matchMedia('(max-width: 760px)').matches) setSheet(true) }
    } catch { /* ignore */ }
  }, [])
  const filtered = trades.filter((t) => {
    if (seg === 'Wins' && t.pnl <= 0) return false
    if (seg === 'Losses' && t.pnl >= 0) return false
    if (seg === 'Off plan' && !(t.plan === 'NO' || t.plan === 'PARTIALLY')) return false
    if (q) {
      const hay = `${t.symbol} ${t.side} ${t.setup} ${t.rating || ''} ${t.state || ''} ${t.session || ''} ${t.reason} ${t.right} ${t.wrong} ${t.note} ${t.tags.join(' ')}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  })
  const shown = filtered.slice(0, limit)
  const groups = []
  shown.forEach((t) => {
    let g = groups.find((x) => x.date === t.date)
    if (!g) { g = { date: t.date, trades: [], net: 0 }; groups.push(g) }
    g.trades.push(t); g.net += t.pnl
  })
  const current = trades.find((t) => t.id === sel) || filtered[0]
  const choose = (id) => { setSel(id); if (window.matchMedia('(max-width: 760px)').matches) setSheet(true) }
  const fnet = filtered.reduce((s, t) => s + t.pnl, 0)

  return (
    <AppShell route="journal" word="JOURNAL" title="Journal">
      <div className="wrap col" style={{ gap: 18, paddingBottom: 60 }}>
        <div className="glass row" style={{ padding: '18px 20px', gap: '14px 18px', flexWrap: 'wrap' }}>
          <div className="col display" style={{ flex: '1 1 200px', gap: 2 }}>
            <span className="eyebrow" style={{ fontFamily: 'var(--body)' }}>{filtered.length} of {stats.n} trades</span>
            <span className="num" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em' }}><PnL v={fnet} cents /> <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--fg3)' }}>net</span></span>
          </div>
          <Seg options={['All', 'Wins', 'Losses', 'Off plan']} value={seg} onChange={setSeg} label="Show" style={{ maxWidth: '100%', overflowX: 'auto' }} />
          <label htmlFor="jr-search" className="well row" style={{ gap: 10, minHeight: 50, padding: '0 16px', borderRadius: 99, flex: '1 1 220px', maxWidth: 320 }}>
            <Search size={15} className="faint" />
            <span className="sr">Search trades</span>
            <input id="jr-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes, tags, symbols" style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: 14 }} />
          </label>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setImp(true)}><Upload size={15} /> Import</button>
            <button type="button" className="btn btn-ghost" onClick={() => exportCSV(filtered)} disabled={!filtered.length}><Download size={15} /> Export</button>
          </div>
        </div>

        {!trades.length ? (
          <Empty title="Your journal is empty." body="Log a trade or import a CSV from your platform." action={<button type="button" className="btn btn-primary" onClick={openLog}>Log trade</button>} />
        ) : (
          <div className="row" style={{ alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div className="col" style={{ flex: '999 1 520px', minWidth: 0, gap: 14 }}>
              {groups.length === 0 && <Empty title="No trades match." body="Try another filter or clear the search." action={q ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQ('')}><X size={13} /> Clear search</button> : null} />}
              {groups.map((g, gi) => (
                <section key={g.date} className="glass" style={{ padding: '14px 14px 8px', animation: `rise .6s var(--ease) ${Math.min(gi, 6) * 0.06}s both` }} aria-label={dayLabel(g.date, true)}>
                  <div className="row" style={{ gap: 10, padding: '4px 8px 8px' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>{dayLabel(g.date, true)}</h2>
                    <span className="faint" style={{ fontSize: 12.5 }}>{g.trades.length} {g.trades.length === 1 ? 'trade' : 'trades'}</span>
                    <PnL v={g.net} className="display" />
                  </div>
                  {g.trades.map((t) => <TradeRow key={t.id} t={t} active={current && current.id === t.id} onClick={() => choose(t.id)} />)}
                </section>
              ))}
              {filtered.length > limit && <button type="button" className="btn btn-ghost" onClick={() => setLimit((l) => l + 60)}>Show more trades</button>}
            </div>
            <aside className="glass hide-sm" style={{ flex: '1 1 380px', maxWidth: 440, padding: 22, position: 'sticky', top: 100 }} aria-label="Trade detail">
              {current ? <Detail t={current} /> : <span className="muted">Pick a trade to see the details.</span>}
            </aside>
          </div>
        )}
      </div>
      <Modal open={sheet && !!current} onClose={() => setSheet(false)} label="Trade detail" maxWidth={520}>
        <Detail t={current} onClose={() => setSheet(false)} />
      </Modal>
      <ImportModal open={imp} onClose={() => setImp(false)} />
    </AppShell>
  )
}

