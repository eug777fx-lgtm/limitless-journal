// What's new tour. Shows once per version after the opening screen, walking the trader
// through each page while the page itself changes behind the card. Replay from Account.
import React from 'react'
import { Sparkles, LayoutDashboard, Plus, BookOpen, ClipboardCheck, CalendarDays, Sun, Clapperboard, ImagePlus, Brain, Search, Tags, ArrowRight, Check } from 'lucide-react'

const KEY = 'ltj_tour_v4'
const STEPS = [
  { route: 'dashboard', Icon: Sparkles, title: 'Welcome to the new LIMITLESS', body: 'A calmer, black and white journal built to keep you focused. Here is a quick look around. It takes thirty seconds.',
    chips: [[Sun, 'Light or dark'], [Clapperboard, 'Moving backgrounds']] },
  { route: 'dashboard', Icon: LayoutDashboard, title: 'Your dashboard', body: 'Your P&L for the week, month or year with the equity line behind it. Tap the picture button on the panel to change its background, or upload your own.',
    chips: [[ImagePlus, 'Change the panel'], [CalendarDays, 'Week · Month · Year']] },
  { route: 'dashboard', Icon: Plus, title: 'Log a trade in seconds', body: 'Tap Log trade or the + button. Search any symbol, type your P&L and R:R, pick or write tags, and paste a chart screenshot. Everything else is optional.',
    chips: [[Search, 'Symbol search'], [Tags, 'Your own tags']] },
  { route: 'journal', Icon: BookOpen, title: 'Your journal, trade by trade', body: 'Every trade is a card with its chart. Tap one for the full review. The Mindset tab gives you a daily read, your reason for doing this, and one question for today.',
    chips: [[BookOpen, 'Trade cards'], [Brain, 'Mindset']] },
  { route: 'plan', Icon: ClipboardCheck, title: 'Trade your plan', body: 'Run the checklist before every trade, set your max trades and daily loss limit, and watch your discipline streak grow.',
    chips: [[ClipboardCheck, 'Pre-trade checklist'], [Check, 'Daily guardrails']] },
  { route: 'calendar', Icon: CalendarDays, title: 'Calendar and analytics', body: 'See your up and down days at a glance, then open Analytics to find where your edge really comes from.',
    chips: [[CalendarDays, 'P&L calendar'], [LayoutDashboard, 'Analytics']] },
]

export const replayTour = () => { try { localStorage.removeItem(KEY) } catch { /* ignore */ } dispatchEvent(new Event('ltj-tour')) }

export default function Tour() {
  const [open, setOpen] = React.useState(false)
  const [i, setI] = React.useState(0)
  const start = React.useCallback(() => {
    let seen = false
    try { seen = !!localStorage.getItem(KEY) } catch { /* ignore */ }
    if (!seen) { setI(0); setOpen(true) }
  }, [])
  React.useEffect(() => {
    const t = setTimeout(() => { if (!document.querySelector('.splash')) start() }, 600)
    const done = () => setTimeout(start, 250)
    const replay = () => { location.hash = 'dashboard'; setI(0); setOpen(true) }
    addEventListener('ltj-splash-done', done); addEventListener('ltj-tour', replay)
    return () => { clearTimeout(t); removeEventListener('ltj-splash-done', done); removeEventListener('ltj-tour', replay) }
  }, [start])
  React.useEffect(() => { if (open && STEPS[i] && location.hash.slice(1) !== STEPS[i].route) location.hash = STEPS[i].route }, [open, i])
  const close = () => { try { localStorage.setItem(KEY, '1') } catch { /* ignore */ } setOpen(false); if (location.hash.slice(1) !== 'dashboard') location.hash = 'dashboard' }
  React.useEffect(() => {
    if (!open) return
    const k = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') setI((x) => Math.min(STEPS.length - 1, x + 1)); if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1)) }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null
  const s = STEPS[i], last = i === STEPS.length - 1
  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="What's new">
      <div className="tour-card" key={i}>
        <div className="tour-top">
          <span className="tour-ico"><s.Icon size={22} /></span>
          <span className="sk-mono">What's new · {i + 1} of {STEPS.length}</span>
          <button type="button" className="tour-skip" onClick={close}>Skip</button>
        </div>
        <h2>{s.title}</h2>
        <p>{s.body}</p>
        <div className="tour-chips">{s.chips.map(([I, l]) => <span key={l}><I size={14} />{l}</span>)}</div>
        <div className="tour-foot">
          <div className="tour-dots">{STEPS.map((_, k) => <button key={k} type="button" aria-label={`Step ${k + 1}`} className={k === i ? 'on' : ''} onClick={() => setI(k)} />)}</div>
          <div className="row" style={{ gap: 8 }}>
            {i > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setI(i - 1)}>Back</button>}
            <button type="button" className="btn btn-primary btn-sm" onClick={() => (last ? close() : setI(i + 1))}>{last ? 'Start trading' : <>Next <ArrowRight size={14} /></>}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
