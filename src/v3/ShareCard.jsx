import React from 'react'
import { Download, Share2, Shuffle, Check } from 'lucide-react'
import { useStore } from './store.jsx'
import { Modal, CloseBtn, Seg, LOGO } from './ui.jsx'
import { dayLabel } from './data.js'

const NAMES = { NQ: 'E-mini Nasdaq 100', MNQ: 'Micro Nasdaq 100', ES: 'E-mini S&P 500', MES: 'Micro S&P 500', YM: 'E-mini Dow', MYM: 'Micro Dow', RTY: 'E-mini Russell 2000', GC: 'Gold', MGC: 'Micro Gold', SI: 'Silver', CL: 'Crude Oil', 'EUR/USD': 'Euro / US Dollar', 'GBP/USD': 'Pound / US Dollar', 'XAU/USD': 'Gold spot', 'BTC/USD': 'Bitcoin', 'ETH/USD': 'Ethereum' }
import { SCENES, paintOil, drawBadge } from './oil.js'

const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src })
const rr = (ctx, x, y, w, h, rad) => { ctx.beginPath(); ctx.moveTo(x + rad, y); ctx.arcTo(x + w, y, x + w, y + h, rad); ctx.arcTo(x + w, y + h, x, y + h, rad); ctx.arcTo(x, y + h, x, y, rad); ctx.arcTo(x, y, x + w, y, rad); ctx.closePath() }
const fmtPrice = (v) => { const dp = Math.min(5, (String(v).split('.')[1] || '').length); return Number(v).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }) }

async function drawCard(canvas, t, opt, logo) {
  const W = 1080, H = opt.format === 'story' ? 1920 : opt.format === 'square' ? 1080 : 1350
  const sq = opt.format === 'square'
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  const bg = document.createElement('canvas'); bg.width = W; bg.height = H
  paintOil(bg.getContext('2d'), W, H, opt.bg, opt.seed)
  ctx.drawImage(bg, 0, 0)
  // dim + vignette so white type always reads
  ctx.fillStyle = `rgba(0,0,0,${opt.dim})`; ctx.fillRect(0, 0, W, H)
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, W * 0.2, W / 2, H * 0.5, H * 0.75)
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)')
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)

  const pad = 84, white = '#ffffff', soft = 'rgba(255,255,255,0.72)', faint = 'rgba(255,255,255,0.5)'
  ctx.textBaseline = 'alphabetic'
  // corner logo, wordmark tucked under it
  if (logo) { const lw = 92, lh = lw * (logo.height / logo.width); ctx.drawImage(logo, pad, pad, lw, lh) }
  ctx.fillStyle = white; ctx.font = '600 26px Poppins, sans-serif'
  ctx.letterSpacing = '8px'
  ctx.fillText('LIMITLESS', pad, pad + 74)
  ctx.letterSpacing = '0px'
  ctx.textAlign = 'right'; ctx.fillStyle = soft; ctx.font = '500 28px Inter, sans-serif'
  ctx.fillText(dayLabel(t.date, true), W - pad, pad + 38)
  ctx.fillStyle = faint; ctx.font = '500 24px Inter, sans-serif'
  if (t.session) ctx.fillText(`${t.session} session`, W - pad, pad + 74)
  ctx.textAlign = 'left'

  // hero block
  const top = opt.format === 'story' ? 720 : sq ? 400 : 460
  const bd = sq ? 112 : 132, fsym = sq ? 76 : 92, fname = sq ? 26 : 30
  const symY = top - 30, nameY = symY - fsym * 0.78 - 18
  // badge centred on the two-line block (market name + ticker)
  drawBadge(ctx, t.symbol, pad, (nameY - fname * 0.8 + symY) / 2 - bd / 2, bd)
  const tx = pad + bd + 28
  ctx.fillStyle = soft; ctx.font = `500 ${fname}px Inter, sans-serif`
  ctx.fillText(NAMES[t.symbol] || 'Futures and FX', tx, nameY)
  ctx.fillStyle = white; ctx.font = `700 ${fsym}px Poppins, sans-serif`
  ctx.fillText(t.symbol, tx, top - 30)
  const symW = ctx.measureText(t.symbol).width
  // side pill
  ctx.font = '600 28px Poppins, sans-serif'
  const side = (t.side || '').toUpperCase(), sw = ctx.measureText(side).width + 48
  const pyl = symY - fsym * 0.62 - 4
  rr(ctx, tx + symW + 22, pyl, sw, 56, 28); ctx.fillStyle = white; ctx.fill()
  ctx.fillStyle = '#000'; ctx.fillText(side, tx + symW + 46, pyl + 38)
  const heroGap = sq ? 22 : 46

  const showR = opt.show === 'r' && t.r !== null
  const big = !showR ? `+$${Math.abs(t.pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `+${Math.abs(t.r).toFixed(2)}R`
  let fs = sq ? 160 : 210
  ctx.font = `700 ${fs}px Poppins, sans-serif`
  while (ctx.measureText(big).width > W - pad * 2 && fs > 120) { fs -= 8; ctx.font = `700 ${fs}px Poppins, sans-serif` }
  const bg2 = ctx.createLinearGradient(0, top + 30, 0, top + fs)
  bg2.addColorStop(0, '#ffffff'); bg2.addColorStop(1, '#d8ffe4')
  ctx.shadowColor = 'rgba(166,242,190,0.45)'; ctx.shadowBlur = 50
  ctx.fillStyle = bg2; ctx.fillText(big, pad - 6, top + heroGap + fs * 0.86)
  ctx.shadowBlur = 0
  ctx.fillStyle = soft; ctx.font = '500 36px Inter, sans-serif'
  const subl = [!showR && t.r !== null ? `+${Math.abs(t.r).toFixed(2)}R` : null, t.setup !== 'Untagged' ? t.setup : null, t.rating].filter(Boolean).join('  ·  ')
  if (subl) ctx.fillText(subl, pad, top + heroGap + fs + 50)

  // frosted stats panel
  const rows = [t.entry !== null && ['Entry', fmtPrice(t.entry)], t.exit !== null && ['Exit', fmtPrice(t.exit)], t.rr !== null && ['R:R', Number(t.rr).toFixed(1)], t.setup !== 'Untagged' && ['Setup', t.setup], t.state && ['State', t.state], t.plan && ['Plan', t.plan === 'YES' ? 'Followed' : t.plan === 'NO' ? 'Not followed' : 'Partly'], t.session && ['Session', t.session], ['Side', t.side]].filter(Boolean).slice(0, 6)
  const cols = sq ? 3 : 2
  const pw = W - pad * 2, rowH = 92, ph = rowH * Math.ceil(rows.length / cols) + 56
  const py = opt.format === 'story' ? H - pad - ph - 150 : sq ? H - pad - ph - 76 : H - pad - ph - 110
  ctx.save(); rr(ctx, pad, py, pw, ph, 44); ctx.clip()
  if ('filter' in ctx) { ctx.filter = 'blur(28px)'; ctx.drawImage(canvas, 0, 0); ctx.filter = 'none' }
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(pad, py, pw, ph)
  ctx.restore()
  rr(ctx, pad + 1, py + 1, pw - 2, ph - 2, 43); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke()
  const colW = (pw - 44) / cols
  rows.forEach(([k, v], i) => {
    const cx = pad + 44 + (i % cols) * colW, cy = py + 28 + Math.floor(i / cols) * rowH
    ctx.fillStyle = faint; ctx.font = '500 26px Inter, sans-serif'; ctx.fillText(k, cx, cy + 30)
    ctx.fillStyle = white; ctx.font = '600 36px Poppins, sans-serif'; ctx.fillText(v, cx, cy + 74)
  })

  // footer
  ctx.fillStyle = faint; ctx.font = '500 26px Inter, sans-serif'
  ctx.fillText('Logged in LIMITLESS', pad, H - pad - 30)
  ctx.textAlign = 'right'; ctx.fillStyle = soft
  ctx.fillText(opt.handle ? opt.handle : 'limitless-journal.com', W - pad, H - pad - 30)
  ctx.textAlign = 'left'
}

export default function ShareCard() {
  const { share, closeShare, notify, user } = useStore()
  const [opt, setOpt] = React.useState({ bg: 'harbor', seed: 11, format: 'story', show: 'usd', dim: 0.3, handle: '' })
  const [ready, setReady] = React.useState(false)
  const ref = React.useRef(null)
  const logo = React.useRef(null)
  React.useEffect(() => { if (share && user && !opt.handle) setOpt((o) => ({ ...o, handle: '@' + (user.name || 'trader').toLowerCase().replace(/\s+/g, '') })) }, [share]) // eslint-disable-line
  React.useEffect(() => {
    if (!share || !ref.current) return
    let dead = false
    setReady(false)
    ;(async () => {
      if (!logo.current) logo.current = await loadImg(LOGO)
      if (document.fonts && document.fonts.ready) await document.fonts.ready
      if (dead) return
      await drawCard(ref.current, share, opt, logo.current)
      if (!dead) setReady(true)
    })()
    return () => { dead = true }
  }, [share, opt])

  const blob = () => new Promise((res) => ref.current.toBlob(res, 'image/png'))
  const name = share ? `limitless-${share.symbol}-${share.date}.png` : 'limitless.png'
  const save = async () => {
    const b = await blob(); if (!b) return
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    notify('Image saved')
  }
  const canShareFiles = typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] })
  const shareIt = async () => {
    const b = await blob(); if (!b) return
    try { await navigator.share({ files: [new File([b], name, { type: 'image/png' })] }) } catch { /* cancelled */ }
  }

  return (
    <Modal open={!!share} onClose={closeShare} label="Share your win" maxWidth={920}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="col"><span className="display" style={{ fontSize: 22, fontWeight: 600 }}>Share your win</span><span className="faint" style={{ fontSize: 13 }}>Made for your story. Pick a painting and save.</span></div>
        <CloseBtn onClick={closeShare} />
      </div>
      <div className="share-grid">
        <div className={'share-preview ' + opt.format}>
          <canvas ref={ref} aria-label="Trade card preview" role="img" style={{ opacity: ready ? 1 : 0.4 }} />
        </div>
        <div className="col" style={{ gap: 18 }}>
          <div className="col" style={{ gap: 10 }}>
            <span className="faint" style={{ fontSize: 12.5 }}>Background</span>
            <div className="share-swatches">
              {SCENES.map((p) => (
                <button key={p.id} type="button" aria-label={p.name} title={p.name} aria-pressed={opt.bg === p.id} className={'swatch' + (opt.bg === p.id ? ' on' : '')} style={{ background: `linear-gradient(170deg, ${p.swatch[0]}, ${p.swatch[1]} 55%, ${p.swatch[2]})` }} onClick={() => setOpt({ ...opt, bg: p.id })}>
                  {opt.bg === p.id && <Check size={14} strokeWidth={3} />}
                </button>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpt({ ...opt, seed: Math.floor(Math.random() * 1e6) })}><Shuffle size={14} /> New painting</button>
            </div>
          </div>
          <div className="col" style={{ gap: 10 }}>
            <span className="faint" style={{ fontSize: 12.5 }}>Size</span>
            <Seg options={[{ value: 'story', label: 'Story' }, { value: 'square', label: 'Square' }, { value: 'post', label: 'Post 4:5' }]} value={opt.format} onChange={(v) => setOpt({ ...opt, format: v })} label="Card size" />
          </div>
          <div className="col" style={{ gap: 10 }}>
            <span className="faint" style={{ fontSize: 12.5 }}>Show</span>
            <Seg options={share && share.r !== null ? [{ value: 'usd', label: 'Dollars' }, { value: 'r', label: 'R only' }] : [{ value: 'usd', label: 'Dollars' }]} value={share && share.r !== null ? opt.show : 'usd'} onChange={(v) => setOpt({ ...opt, show: v })} label="What to show" />
          </div>
          <label className="col" style={{ gap: 10 }} htmlFor="share-dim">
            <span className="faint" style={{ fontSize: 12.5 }}>Dim background</span>
            <input id="share-dim" type="range" className="range" min="0.15" max="0.7" step="0.01" value={opt.dim} onChange={(e) => setOpt({ ...opt, dim: Number(e.target.value) })} />
          </label>
          <label className="col" style={{ gap: 8 }} htmlFor="share-handle">
            <span className="faint" style={{ fontSize: 12.5 }}>Your handle</span>
            <input id="share-handle" className="input" style={{ height: 48 }} value={opt.handle} maxLength={24} onChange={(e) => setOpt({ ...opt, handle: e.target.value })} placeholder="@yourname" />
          </label>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            <button type="button" className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={save} disabled={!ready}><Download size={16} /> Save image</button>
            {canShareFiles && <button type="button" className="btn btn-ghost btn-lg" style={{ flex: 1 }} onClick={shareIt} disabled={!ready}><Share2 size={16} /> Share</button>}
          </div>
        </div>
      </div>
    </Modal>
  )
}
