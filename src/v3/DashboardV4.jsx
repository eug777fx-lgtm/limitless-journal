// LIMITLESS dashboard v4. Owner preview only: index.jsx shows it to the super admin,
// everyone else keeps the current Dashboard until it is switched on for all.
import React from 'react'
import { Plus, RotateCcw, ArrowRight } from 'lucide-react'
import { useStore } from './store.jsx'
import { LOGO } from './ui.jsx'
import { isoLocal, monthLabel, dayLabel } from './data.js'
import { useSkin, setSkin, SkinTools } from './skin.jsx'
import { Scene } from './scene.jsx'
import { HeroBg, HeroPicker } from './hero.jsx'
import { TradeImage } from './art.jsx'
import './v4.css'

const PERIODS = [['week', 'Week'], ['month', 'Month'], ['year', 'Year'], ['all', 'All time']]
const INTRO_KEY = 'ltj_v4_intro'
const reduced = () => document.documentElement.getAttribute('data-motion') === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches
const signed = (v) => (v < 0 ? '−$' : '+$') + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })
const signedK = (v) => (v < 0 ? '−$' : '+$') + (Math.abs(v) >= 1000 ? (Math.abs(v) / 1000).toFixed(1) + 'K' : Math.round(Math.abs(v)))
const plain = (v) => '$' + Math.round(Math.abs(v)).toLocaleString('en-US')

function bounds(p, now = new Date()) {
  const today = isoLocal(now)
  const d = (y, m, day) => isoLocal(new Date(y, m, day))
  const Y = now.getFullYear(), M = now.getMonth(), D = now.getDate()
  if (p === 'week') return { from: d(Y, M, D - 6), to: today, prevFrom: d(Y, M, D - 13), prevTo: d(Y, M, D - 7), label: 'Last 7 days', prevLabel: 'Week before' }
  if (p === 'month') return { from: d(Y, M, 1), to: today, prevFrom: d(Y, M - 1, 1), prevTo: d(Y, M, 0), label: monthLabel(today.slice(0, 7)), prevLabel: monthLabel(d(Y, M - 1, 1).slice(0, 7)) }
  if (p === 'year') return { from: d(Y, M - 11, 1), to: today, prevFrom: d(Y, M - 23, 1), prevTo: d(Y, M - 11, 0), label: 'Last 12 months', prevLabel: '12 months before' }
  return { from: '0000-00-00', to: today, prevFrom: null, label: 'All time', prevLabel: '' }
}

function equity(chron, from) {
  const byDay = {}
  chron.forEach((t) => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl })
  const days = Object.keys(byDay).sort()
  let run = 0
  const eq = [{ date: from === '0000-00-00' ? days[0] || '' : from, v: 0 }]
  days.forEach((day) => { run += byDay[day]; eq.push({ date: day, v: run, day: byDay[day] }) })
  return { eq, byDay, days }
}

function periodStats(trades, b) {
  const chron = trades.filter((t) => t.date >= b.from && t.date <= b.to).slice().reverse()
  const wins = chron.filter((t) => t.pnl > 0), losses = chron.filter((t) => t.pnl < 0)
  const gw = wins.reduce((a, t) => a + t.pnl, 0), gl = -losses.reduce((a, t) => a + t.pnl, 0)
  const net = chron.reduce((a, t) => a + t.pnl, 0)
  const { eq, byDay, days } = equity(chron, b.from)
  let prev = null
  if (b.prevFrom) {
    const pc = trades.filter((t) => t.date >= b.prevFrom && t.date <= b.prevTo).slice().reverse()
    if (pc.length) prev = equity(pc, b.prevFrom).eq
  }
  const best = days.length ? days.reduce((a, d) => (byDay[d] > byDay[a] ? d : a), days[0]) : null
  const wk = isoLocal(new Date(Date.now() - 7 * 864e5))
  const last7 = trades.filter((t) => t.date > wk).reduce((a, t) => a + t.pnl, 0)
  return { chron, wins, losses, gw, gl, net, eq, prev, byDay, days, best, last7 }
}

// Odometer: each digit rolls to its new value; cents sit small and quiet
function Odo({ value }) {
  const prevRef = React.useRef('')
  const abs = Math.abs(value)
  const whole = Math.floor(abs).toLocaleString('en-US')
  const cents = (abs % 1).toFixed(2).slice(1)
  const digits = [...whole].filter((c) => /\d/.test(c))
  const [shown, setShown] = React.useState(() => digits.map(() => 0))
  React.useEffect(() => {
    const from = prevRef.current.split('').map(Number)
    setShown(digits.map((_, i) => from[i] || 0))
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(digits.map(Number))))
    prevRef.current = digits.join('')
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whole])
  let k = -1
  return (
    <div className={'odo' + (value < 0 ? ' neg' : '')} aria-label={(value < 0 ? '−$' : '$') + abs.toFixed(2)}>
      <span className="sym">{value < 0 ? '−$' : '$'}</span>
      {[...whole].map((ch, i) => {
        if (!/\d/.test(ch)) return <span key={i} className="fx">{ch}</span>
        k += 1
        const v = shown[k] ?? 0
        return <span key={i} className="slot"><span className="reel" style={{ transform: `translateY(-${v * 10}%)`, transitionDelay: `${i * 45}ms` }}>{'0123456789'.split('').map((n) => <span key={n}>{n}</span>)}</span></span>
      })}
      <span className="cents">{cents}</span>
    </div>
  )
}

const smooth = (pts) => pts.reduce((d, [x, y], i) => {
  if (!i) return `M${x},${y}`
  const [px, py] = pts[i - 1], cx = (px + x) / 2
  return `${d} C${cx},${py} ${cx},${y} ${x},${y}`
}, '')

function Curve({ eq, prev, chartRef, onGeom, veiled }) {
  const box = React.useRef(null)
  const [size, setSize] = React.useState({ w: 1000, h: 240 })
  const [hover, setHover] = React.useState(null)
  React.useLayoutEffect(() => {
    const el = box.current
    const measure = () => setSize({ w: el.clientWidth || 1000, h: el.clientHeight || 240 })
    measure()
    const ro = new ResizeObserver(measure); ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const { w, h } = size, pad = 18
  const all = eq.map((p) => p.v).concat(prev ? prev.map((p) => p.v) : [])
  const min = Math.min(...all), max = Math.max(...all)
  const Y = (v) => pad + (1 - (v - min) / (max - min || 1)) * (h - pad * 2)
  const pts = eq.map((p, i) => [(i / Math.max(1, eq.length - 1)) * w, Y(p.v)])
  const d = smooth(pts)
  const gd = prev && prev.length > 1 ? smooth(prev.map((p, i) => [(i / (prev.length - 1)) * w, Y(p.v)])) : ''
  const last = pts[pts.length - 1] || [w, h / 2]
  const line = React.useRef(null)
  const [drawn, setDrawn] = React.useState(false)
  React.useLayoutEffect(() => {
    if (onGeom) onGeom({ d, w, h, last })
    setDrawn(false)
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)))
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d])
  const len = line.current ? line.current.getTotalLength() : 4000
  const move = (e) => {
    const r = box.current.getBoundingClientRect(), x = e.clientX - r.left
    if (x < 0 || x > r.width || e.clientY < r.top) return setHover(null)
    const i = Math.round((x / r.width) * (pts.length - 1))
    setHover({ i, x: (pts[i][0] / w) * r.width, y: (pts[i][1] / h) * r.height })
  }
  React.useImperativeHandle(chartRef, () => box.current)
  const instant = reduced()
  return (
    <>
      <svg ref={box} className="curve" style={{ opacity: veiled ? 0 : 1 }} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" onPointerMove={move} onPointerLeave={() => setHover(null)} aria-hidden="true">
        <defs><linearGradient id="v4fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopOpacity=".12" /><stop offset="1" stopOpacity="0" /></linearGradient></defs>
        {gd && <path className="gh" d={gd} />}
        <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#v4fill)" style={{ opacity: drawn ? 1 : 0, transition: drawn && !instant ? 'opacity 1s .6s' : 'none' }} />
        <path ref={line} className="ln" d={d} style={{ strokeDasharray: len, strokeDashoffset: drawn || instant ? 0 : len, transition: drawn && !instant ? 'stroke-dashoffset 1.4s cubic-bezier(.65,0,.25,1)' : 'none' }} />
        <circle cx={last[0]} cy={last[1]} r="5" fill="var(--v4-ink)" style={{ opacity: drawn ? 1 : 0, transition: drawn ? 'opacity .4s 1.3s' : 'none' }} />
      </svg>
      {hover && (() => {
        const p = eq[hover.i]
        const r = box.current.getBoundingClientRect(), hr = box.current.parentElement.getBoundingClientRect()
        const left = r.left - hr.left + hover.x, top = r.top - hr.top + hover.y
        return <>
          <div className="xh" style={{ left }} />
          <div className="tip" style={{ left, top }}>{(p.v < 0 ? '−$' : '$') + Math.abs(p.v).toLocaleString('en-US', { maximumFractionDigits: 0 })}<small>{hover.i ? `${dayLabel(p.date)} · day ${signed(p.day || 0)}` : 'Start'}</small></div>
        </>
      })()}
    </>
  )
}

// Welcome: greeting, the period P&L counts up while its equity line draws, then the line flies into the chart
function Intro({ name, label, net, geom, chartEl, onDone }) {
  const [phase, setPhase] = React.useState('')
  const [amt, setAmt] = React.useState(0)
  const g = React.useRef(null), ln = React.useRef(null), end = React.useRef(null), glow = React.useRef(null)
  const done = React.useRef(false)
  const W = innerWidth, H = innerHeight
  const B = { x: W * 0.08, y: H * 0.6, w: W * 0.84, h: H * 0.22 }
  const kx = B.w / geom.w, ky = B.h / geom.h
  // the chart path, re-drawn in screen space for the intro band
  const sd = React.useMemo(() => geom.d.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, x, y) => `${(B.x + x * kx).toFixed(1)},${(B.y + y * ky).toFixed(1)}`), [geom.d])
  const finish = React.useCallback((fast) => {
    if (done.current) return; done.current = true
    if (fast || reduced() || !chartEl()) { onDone(); return }
    const R = chartEl().getBoundingClientRect(), top = R.top - 18
    const sx = (R.width / geom.w) / kx, sy = (R.height / geom.h) / ky
    setPhase('go morph')
    g.current.style.transition = 'transform 1s cubic-bezier(.7,0,.2,1)'
    g.current.style.transform = `translate(${R.left - B.x * sx}px, ${top - B.y * sy}px) scale(${sx}, ${sy})`
    glow.current.style.opacity = 0
    end.current.style.transition = 'cx 1s cubic-bezier(.7,0,.2,1), cy 1s cubic-bezier(.7,0,.2,1)'
    end.current.setAttribute('cx', R.left + geom.last[0] * (R.width / geom.w)); end.current.setAttribute('cy', top + geom.last[1] * (R.height / geom.h))
    onDone('reveal')
    setTimeout(() => onDone(), 1000)
  }, [chartEl, geom, onDone])
  React.useEffect(() => {
    const L = ln.current.getTotalLength()
    ln.current.style.strokeDasharray = L; ln.current.style.strokeDashoffset = L
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('go')))
    const t1 = setTimeout(() => { ln.current.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(.65,0,.25,1)'; ln.current.style.strokeDashoffset = 0 }, 900)
    const t0 = performance.now() + 900
    let raf
    const tick = (now) => { const k = Math.min(1, Math.max(0, (now - t0) / 1400)); setAmt(net * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    const t2 = setTimeout(() => { end.current.style.opacity = 1; glow.current.style.opacity = 1 }, 2150)
    const t3 = setTimeout(() => finish(false), 3300)
    return () => { cancelAnimationFrame(id); cancelAnimationFrame(raf); [t1, t2, t3].forEach(clearTimeout) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const greet = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  return (
    <div className={'v4-intro ' + phase} onClick={() => finish(true)} aria-hidden="true">
      <div className="ibg" />
      <svg viewBox={`0 0 ${W} ${H}`}>
        <defs><linearGradient id="v4introFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--v4-pos)" stopOpacity=".28" /><stop offset="1" stopColor="var(--v4-pos)" stopOpacity="0" /></linearGradient></defs>
        <g ref={g}>
          <path ref={glow} className="iglow" d={`${sd} L${B.x + B.w},${B.y + B.h} L${B.x},${B.y + B.h} Z`} fill="url(#v4introFill)" />
          <path ref={ln} className="iln" d={sd} />
        </g>
        <circle ref={end} className="iend" r="5" cx={B.x + geom.last[0] * kx} cy={B.y + geom.last[1] * ky} />
      </svg>
      <div className="mark">
        <span className="crown"><img src={LOGO} alt="" /></span>
        <div className="hi"><span style={{ transitionDelay: '250ms' }}>{greet},</span> <span className="dim" style={{ transitionDelay: '410ms' }}>{name}.</span></div>
        <div className="so"><span className="mono">{label} so far</span><span className="amt" style={{ color: net < 0 ? 'var(--v4-neg)' : 'var(--v4-pos)' }}>{(net < 0 ? '−$' : '+$') + Math.abs(amt).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
      </div>
      <span className="mono skip">Tap to skip</span>
    </div>
  )
}

// Welcome header: live clock, a greeting that types itself in, your period in one line,
// and the three trading sessions with live countdowns
const SESSIONS = [['Asia', 'Asia/Tokyo', 9 * 60, 15 * 60], ['London', 'Europe/London', 8 * 60, 16 * 60 + 30], ['New York', 'America/New_York', 9 * 60 + 30, 16 * 60]]
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
function zoneNow(now, tz) {
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((x) => [x.type, x.value]))
    return { wd: WD.indexOf(p.weekday), min: (+p.hour % 24) * 60 + +p.minute }
  } catch { return { wd: now.getDay(), min: now.getHours() * 60 + now.getMinutes() } }
}
function sessionState(now, [name, tz, open, close]) {
  const { wd, min } = zoneNow(now, tz)
  const weekday = wd >= 1 && wd <= 5
  if (weekday && min >= open && min < close) return { name, open: true, mins: close - min }
  if (weekday && min < open) return { name, open: false, mins: open - min }
  let mins = 24 * 60 - min + open, w = (wd + 1) % 7
  while (w === 0 || w === 6) { mins += 24 * 60; w = (w + 1) % 7 }
  return { name, open: false, mins }
}
const dur = (m) => (m >= 60 * 24 ? `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h` : m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`)

function Greeting() {
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => { const i = setInterval(() => setNow(new Date()), 20000); return () => clearInterval(i) }, [])
  const date = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const sess = SESSIONS.map((x) => sessionState(now, x))
  const open = sess.filter((x) => x.open)
  const next = sess.filter((x) => !x.open).sort((a, b) => a.mins - b.mins)[0]
  const head = open.length ? `${open.map((x) => x.name).join(' & ')} ${open.length > 1 ? 'open' : 'is open'}` : `${next.name} opens in ${dur(next.mins)}`
  const tail = open.length ? `${dur(Math.min(...open.map((x) => x.mins)))} left` : 'markets closed'
  return (
    <div className={'gline' + (open.length ? ' is-open' : '')} aria-live="polite">
      <span className="mono">{date}</span>
      <span className="gnow"><i /><b key={head}>{head}</b><small>{tail}</small></span>
    </div>
  )
}

export default function DashboardV4() {
  const { trades, user, openLog, sample } = useStore()
  const { theme } = useSkin()
  const on = true
  const [period, setPeriod] = React.useState('month')
  const [intro, setIntro] = React.useState(() => { try { return !sessionStorage.getItem(INTRO_KEY) } catch { return false } })
  const [hidden, setHidden] = React.useState(intro)
  const [geom, setGeom] = React.useState(null)
  // never leave the page hidden if the welcome cannot run
  React.useEffect(() => { if (!intro) return; const t = setTimeout(() => { setHidden(false); setIntro(false) }, 6000); return () => clearTimeout(t) }, [intro])
  const chart = React.useRef(null)
  const segRef = React.useRef(null)
  const [pill, setPill] = React.useState(null)
  const strip = React.useRef(null)

  React.useLayoutEffect(() => {
    const measure = () => { const b = segRef.current && segRef.current.querySelector('button.on'); if (b) setPill({ left: b.offsetLeft, width: b.offsetWidth }) }
    measure()
    let alive = true
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => alive && measure())
    const ro = typeof ResizeObserver !== 'undefined' && segRef.current ? new ResizeObserver(measure) : null
    if (ro) ro.observe(segRef.current)
    return () => { alive = false; if (ro) ro.disconnect() }
  }, [period, on])

  const b = React.useMemo(() => bounds(period), [period])
  const s = React.useMemo(() => periodStats(trades, b), [trades, b])
  const monthTrades = React.useMemo(() => trades.filter((t) => t.date.slice(0, 7) === isoLocal(new Date()).slice(0, 7)).length, [trades])
  const first = (user.name || 'Trader').split(' ')[0]

  const wr = s.chron.length ? (s.wins.length / s.chron.length) * 100 : 0
  const seq = s.chron.slice(-40), mx = Math.max(1, ...seq.map((t) => Math.abs(t.pnl)))
  const aw = s.wins.length ? s.gw / s.wins.length : 0, al = s.losses.length ? s.gl / s.losses.length : 0
  const green = s.days.filter((d) => s.byDay[d] > 0).length
  const recent = trades.slice(0, 12)
  const openTrade = (t) => { sessionStorage.setItem('ltj_v3_sel', t.id); location.hash = 'journal' }

  return (
    <div className={'stage app v4' + (hidden && trades.length > 0 && intro ? ' intro-on' : '')}>
      <Scene light={theme === 'light'} />
      <div className="chrome-space" aria-hidden="true" />
      <div className="v4-wrap">
        <section className="hello rise">
          <div className="tools">
            <div ref={segRef} className="seg4 glassy" role="group" aria-label="Period">
              {pill && <i style={{ left: pill.left, width: pill.width }} />}
              {PERIODS.map(([v, l]) => <button key={v} type="button" className={period === v ? 'on' : ''} aria-pressed={period === v} onClick={() => setPeriod(v)}>{l}</button>)}
            </div>
            <Greeting />
            <div className="tools-r">
              {sample && <span className="owner">Sample trades <button type="button" onClick={() => setSkin({ sample: false })}>Hide</button></span>}
              <SkinTools />
              <button type="button" className="ibtn glassy" aria-label="Replay welcome" title="Replay welcome" onClick={() => { setHidden(true); setIntro(true) }}><RotateCcw size={16} /></button>
            </div>
          </div>
        </section>

        {!trades.length ? (
          <section className="hero glassy rise" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 12 }}>
            <span className="mono k">Net P&amp;L</span>
            <span className="odo" style={{ fontSize: 64 }}>$0</span>
            <span style={{ color: 'var(--v4-ink2)' }}>Log your first trade and this fills in.</span>
            <button type="button" className="owner" style={{ cursor: 'pointer', border: 0 }} onClick={() => setSkin({ sample: true })}>Preview with sample trades</button>
            <button type="button" className="ibtn" onClick={openLog} style={{ width: 'auto', padding: '0 18px', borderRadius: 99, background: 'var(--v4-btn)', color: 'var(--v4-btn-ink)', fontWeight: 600, gap: 8, display: 'inline-flex', alignItems: 'center' }}><Plus size={15} /> Log trade</button>
          </section>
        ) : (
          <>
            <section className="hero glassy rise" aria-label="Net P&L">
              <HeroBg theme={theme} />
              <span className="hero-scrim" aria-hidden="true" />
              <div className="top">
                <span className="mono live"><b />Net P&amp;L · {b.label}</span>
                <span className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <span className="mono legend"><span><i />{b.label}</span>{s.prev && <span><i className="g" />{b.prevLabel}</span>}</span>
                  <HeroPicker />
                </span>
              </div>
              <div className="num">
                <Odo value={hidden && intro ? 0 : s.net} />
                <div className="sub">
                  <span className="pill">{s.wins.length}W · {s.losses.length}L</span>
                  <span className={'pill ' + (s.last7 >= 0 ? 'up' : 'down')}>{signedK(s.last7)} last 7 days</span>
                </div>
              </div>
              <Curve eq={s.eq} prev={s.prev} chartRef={chart} onGeom={setGeom} veiled={intro && trades.length > 0} />
              <div className="foot"><span className="mono">{s.eq[0]?.date ? `${dayLabel(s.eq[0].date)} to ${dayLabel(b.to)}` : ''}</span><a href="#analytics">Full breakdown →</a></div>
            </section>

            <section className="stats" aria-label="Key stats">
              <div className="tile tall glassy rise">
                <span className="mono k">Win rate</span>
                <div><div className="v xl">{wr.toFixed(1)}%</div><div className="d">{s.wins.length} wins out of {s.chron.length} trades</div></div>
                <div className="split" aria-hidden="true"><b className="w" style={{ flexGrow: Math.max(s.wins.length, 0.001) }} /><b className="l" style={{ flexGrow: Math.max(s.losses.length, 0.001) }} /></div>
                <div>
                  <svg className="tape" viewBox={`0 0 ${Math.max(1, seq.length) * 8} 100`} preserveAspectRatio="none" role="img" aria-label="Wins and losses in order">
                    <line className="mid" x1="0" x2={seq.length * 8} y1="50" y2="50" vectorEffect="non-scaling-stroke" />
                    {seq.map((t, i) => { const hh = 6 + (Math.abs(t.pnl) / mx) * 42; return <rect key={t.id} className={t.pnl > 0 ? 'w' : 'l'} x={i * 8 + 1.5} y={t.pnl > 0 ? 50 - hh : 50} width="5" height={hh} rx="2" /> })}
                  </svg>
                  <div className="tape-lbl"><span className="mono">Oldest</span><span className="mono">Latest</span></div>
                </div>
              </div>
              <div className="tile glassy rise"><span className="mono k">Profit factor</span><div className="v">{s.gl ? (s.gw / s.gl).toFixed(2) : '∞'}</div><div className="d">{plain(s.gw)} won · {plain(s.gl)} lost</div></div>
              <div className="tile glassy rise"><span className="mono k">Up days</span><div className="v">{green} / {s.days.length}</div><div className="days">{s.days.slice(-40).map((d) => <i key={d} className={s.byDay[d] > 0 ? 'g' : 'r'} />)}</div></div>
              <div className="tile glassy rise"><span className="mono k">Best day</span><div className="v">{s.best ? signed(s.byDay[s.best]) : '$0'}</div><div className="d">{s.best ? new Date(s.best + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'No trades yet'}</div></div>
              <div className="tile glassy rise"><span className="mono k">Avg win / loss</span><div className="v">{al ? (aw / al).toFixed(2) + 'R' : '∞'}</div>
                <div className="bars"><div><b style={{ width: (aw / (Math.max(aw, al) || 1)) * 100 + '%', background: 'var(--v4-pos)' }} /></div><div><b style={{ width: (al / (Math.max(aw, al) || 1)) * 100 + '%', background: 'var(--v4-neg)' }} /></div></div>
                <div className="d">{plain(aw)} avg win · {plain(al)} avg loss</div></div>
            </section>

            <section className="recent glassy rise" aria-label="Recent trades">
              <header><span className="mono k">Recent trades</span><span className="r"><span className="mono">Last {recent.length}</span><button type="button" className="arrow" aria-label="Scroll back" onClick={() => strip.current.scrollBy({ left: -480, behavior: 'smooth' })}>‹</button><button type="button" className="arrow" aria-label="Scroll forward" onClick={() => strip.current.scrollBy({ left: 480, behavior: 'smooth' })}>›</button></span></header>
              <div className="strip" ref={strip}>
                {recent.map((t) => {
                  const c = t.pnl > 0 ? 'var(--v4-pos)' : t.pnl < 0 ? 'var(--v4-neg)' : 'var(--v4-ink2)'
                  return (
                    <button type="button" key={t.id} className="tc" onClick={() => openTrade(t)}>
                      <div className="shot"><TradeImage t={t} /><span className="side">{String(t.side).toUpperCase()}</span></div>
                      <div className="meta"><b>{t.symbol}</b><span className="p" style={{ color: c }}>{signed(t.pnl)}</span><small>{dayLabel(t.date)}</small><small>{t.shots[0] ? 'Chart saved' : t.setup !== 'Untagged' ? t.setup : 'No screenshot'}</small></div>
                    </button>
                  )
                })}
              </div>
            </section>
            <a href="#calendar" className="mono" style={{ alignSelf: 'center', textDecoration: 'none', display: 'inline-flex', gap: 8, alignItems: 'center' }}>Calendar, plan and insights <ArrowRight size={13} /></a>
          </>
        )}
      </div>

      {intro && trades.length > 0 && geom && (
        <Intro name={first} label={b.label} net={s.net} geom={geom} chartEl={() => chart.current}
          onDone={(step) => { if (step === 'reveal') { setHidden(false); return } setHidden(false); setIntro(false); try { sessionStorage.setItem(INTRO_KEY, '1') } catch { /* private mode */ } }} />
      )}
    </div>
  )
}
