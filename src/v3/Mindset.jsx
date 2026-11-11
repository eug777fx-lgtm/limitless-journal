// Mindset: a short daily read, your own reason for doing this, what your journal says
// about you, and one question to answer for today. Owner preview, kept on this device.
import React from 'react'
import { Pencil, Check, BookOpen, Quote } from 'lucide-react'
import { useStore } from './store.jsx'
import { PnL } from './ui.jsx'
import { isoLocal, money } from './data.js'

const READS = [
  ['The loss is the fee', 'Every business has costs. Yours show up as red trades. A loss taken at your stop is not a mistake, it is the price of being in the game. Pay it, log it, move on.'],
  ['One trade does not define you', 'The trade in front of you is one of the next thousand. Size it like that. Feel it like that. No single click gets to decide who you are.'],
  ['Boredom is part of the job', 'Most of trading is waiting. The edge lives in the minutes you sit on your hands while everyone else forces something. Waiting is a skill. Practice it today.'],
  ['Protect the version of you that wins', 'You already know how you trade when you are at your best: rested, patient, on plan. Today your only job is to show up as that person, or not trade at all.'],
  ['Your stop is a promise', 'When you set a stop you made a promise to yourself before emotion showed up. Moving it is breaking that promise. Keep your word, especially to yourself.'],
  ['Small and consistent beats big and random', 'A few clean R a week compounds into something real. Big swings feel good and then take it all back. Choose the boring path that actually builds.'],
  ['Green days are not proof, red days are not verdicts', 'Judge yourself on process, not on one day of P&L. Did you follow the plan? Then today was a good day, whatever the number says.'],
  ['Revenge has never paid you', 'Look at your journal. The trade right after a frustrating loss is rarely your best one. When you feel the urge to win it back, that is the signal to stand up.'],
  ['You are building a skill, not chasing a feeling', 'The rush of a big winner fades in an hour. The skill you build by journaling every trade stays for life. Stay with the work.'],
  ['Clarity before the click', 'If you cannot explain the trade in one sentence, you do not have a trade. Write the sentence first. Then decide.'],
  ['The market will be there tomorrow', 'There is no last opportunity. Missing a move costs you nothing. Forcing one can cost you the week. Let it go.'],
  ['Discipline is a decision you make early', 'You will not find discipline in the middle of a trade. You decide it in the morning: max trades, max loss, your setups only. Then you simply follow what you already decided.'],
  ['Write it down, even when it hurts', 'The trades you least want to log are the ones that teach you the most. Be honest in your journal. Nobody else is reading it, and it only works if it is true.'],
  ['Your edge is patience', 'You do not need more setups. You need to take only the ones you already know. Fewer, cleaner, calmer.'],
  ['Think in months', 'A day is noise. A week is a hint. A month starts to tell the truth. Zoom out before you judge your trading or yourself.'],
  ['Rest is part of the plan', 'Tired traders take tired trades. Sleep, food, a walk. Your body is part of your edge, treat it that way.'],
  ['Comparison is a cost', 'Someone else’s screenshot is not your plan. Their account, their risk, their story. Run your own race.'],
  ['Respect the first loss of the day', 'The first loss is information. Slow down after it. Reread your plan. The second loss is where days go wrong.'],
  ['Calm is a position', 'Before you enter, check your breathing. If your heart is racing, you are not trading, you are gambling. Calm first, then the click.'],
  ['You only control the process', 'Entry, stop, size, and whether you follow your rules. That is all you control. Put all of your energy there and let the outcome be what it is.'],
  ['Every great trader was once where you are', 'Inconsistent, frustrated, unsure. The difference is they kept showing up and kept writing it down. Keep going.'],
  ['Say no more often', 'Your best trading days often have the fewest trades. Every setup you skip because it is not yours is a win nobody sees.'],
  ['Make the plan boring', 'Exciting plans break under pressure. Boring plans survive. Simplify your rules until you could follow them on your worst day.'],
  ['Your future self is watching', 'In a year you will look back at this week. Trade today in a way that future you will be proud of.'],
  ['Pressure is a sign to size down', 'When you need the money, you trade worse. If today feels heavy, cut size in half. Survive the pressure, then rebuild.'],
  ['Wins can be mistakes too', 'A winner that broke your rules teaches you the wrong lesson. Review your green trades as honestly as your red ones.'],
  ['Know your number', 'Your daily loss limit is not a suggestion. Hit it, close the platform, go live your life. Tomorrow you get a clean slate.'],
  ['The goal is to still be here', 'The traders who make it are the ones who did not blow up. Protect your account so you get to keep learning.'],
  ['Progress is quiet', 'Some weeks it feels like nothing is changing. Then you look at your journal from three months ago and see how far you have come.'],
  ['Trade the plan, review the person', 'During the session, follow the rules. After the session, ask how you felt and why. Both matter.'],
  ['You chose this', 'Nobody forced you to become a trader. You chose something hard because you want something real. Remember that on the tough days.'],
]
const QUESTIONS = [
  'What would make today a good trading day, even if you took no trades?',
  'What is one rule you will not break today?',
  'How are you feeling right now, honestly?',
  'What did your last losing trade teach you?',
  'What are you trading for? Say it in one line.',
  'Which setup are you waiting for today, and only that one?',
  'What would the calmest version of you do this session?',
  'What is one thing you did well this week?',
  'Where did you break your plan recently, and why?',
  'What will you do the moment you hit your daily loss limit?',
]
const WHY_KEY = 'ltj_mind_why'
const ANS = (d) => 'ltj_mind_' + d
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } }
const dayIndex = () => Math.floor(new Date(isoLocal(new Date()) + 'T12:00:00').getTime() / 864e5)

function insights(trades) {
  const out = []
  if (trades.length < 5) return out
  const on = trades.filter((t) => t.plan === 'YES'), off = trades.filter((t) => t.plan === 'NO' || t.plan === 'PARTIALLY')
  if (on.length >= 3 && off.length >= 3) {
    const a = on.reduce((s, t) => s + t.pnl, 0) / on.length, b = off.reduce((s, t) => s + t.pnl, 0) / off.length
    out.push(['Your plan works', <>On plan you average <PnL v={Math.round(a)} /> a trade. Off plan, <PnL v={Math.round(b)} />.</>])
  }
  const byDay = new Map()
  trades.slice().reverse().forEach((t) => { if (!byDay.has(t.date)) byDay.set(t.date, []); byDay.get(t.date).push(t) })
  let after = 0, afterWin = 0
  byDay.forEach((ts) => ts.forEach((t, i) => { if (i > 0 && ts[i - 1].pnl < 0) { after++; if (t.pnl > 0) afterWin++ } }))
  if (after >= 4) out.push(['After a loss', <>The next trade the same day wins <b>{Math.round((afterWin / after) * 100)}%</b> of the time. {afterWin / after < 0.5 ? 'Slow down after a red trade.' : 'You recover well. Keep it calm.'}</>])
  const sess = {}
  trades.forEach((t) => { if (t.session) { sess[t.session] = sess[t.session] || { n: 0, net: 0 }; sess[t.session].n++; sess[t.session].net += t.pnl } })
  const best = Object.entries(sess).filter(([, v]) => v.n >= 3).sort((a, b) => b[1].net - a[1].net)[0]
  if (best) out.push(['Where you shine', <><b>{best[0]}</b> is your best session: <PnL v={Math.round(best[1].net)} /> over {best[1].n} trades.</>])
  const days = [...byDay.keys()].sort().reverse()
  let streak = 0
  for (const d of days) { if (byDay.get(d).reduce((s, t) => s + t.pnl, 0) > 0) streak++; else break }
  const rev = trades.filter((t) => (t.tags || []).includes('Revenge Trade'))
  if (rev.length) out.push(['Revenge trades', <>{rev.length} tagged, net <PnL v={Math.round(rev.reduce((s, t) => s + t.pnl, 0))} />. That is the cost of trading angry.</>])
  else out.push(['Current run', <>{streak ? <><b>{streak}</b> green {streak === 1 ? 'day' : 'days'} in a row. Protect it with patience.</> : 'Last day was red. Today is a reset, not a revenge.'}</>])
  return out.slice(0, 4)
}

export default function Mindset() {
  const { trades, user } = useStore()
  const i = dayIndex()
  const [title, body] = READS[i % READS.length]
  const question = QUESTIONS[i % QUESTIONS.length]
  const today = isoLocal(new Date())
  const [why, setWhy] = React.useState(() => load(WHY_KEY, { why: '', who: '' }))
  const [editing, setEditing] = React.useState(() => !load(WHY_KEY, { why: '' }).why)
  const [ans, setAns] = React.useState(() => load(ANS(today), ''))
  const [saved, setSaved] = React.useState(false)
  const past = React.useMemo(() => {
    const out = []
    for (let k = 1; k <= 14 && out.length < 4; k++) { const d = isoLocal(new Date(Date.now() - k * 864e5)); const a = load(ANS(d), ''); if (a) out.push([d, a, QUESTIONS[(i - k) % QUESTIONS.length]]) }
    return out
  }, [i])
  const ins = React.useMemo(() => insights(trades), [trades])
  const first = (user.name || 'Trader').split(' ')[0]

  return (
    <div className="mind">
      <section className="glass mind-read">
        <span className="sk-mono"><BookOpen size={12} /> Today's read · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
        <h2>{title}</h2>
        <p>{body}</p>
      </section>

      <section className="glass mind-why">
        <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
          <span className="sk-mono">Why you're doing this</span>
          {!editing && <button type="button" className="sk-ibtn" aria-label="Edit your why" onClick={() => setEditing(true)}><Pencil size={14} /></button>}
        </div>
        {editing ? (
          <div className="col" style={{ gap: 10 }}>
            <label className="lt-field"><span>Why this has to work</span><textarea className="input" rows={3} value={why.why} onChange={(e) => setWhy({ ...why, why: e.target.value })} placeholder="Freedom to work from anywhere. Never asking for permission again." /></label>
            <label className="lt-field"><span>Who you're doing it for</span><input className="input" value={why.who} onChange={(e) => setWhy({ ...why, who: e.target.value })} placeholder="My family, my future self" /></label>
            <button type="button" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} disabled={!why.why.trim()} onClick={() => { save(WHY_KEY, why); setEditing(false) }}><Check size={14} /> Save</button>
          </div>
        ) : (
          <blockquote>
            <Quote size={18} />
            <p>{why.why}</p>
            {why.who && <footer>For {why.who}. Keep going, {first}.</footer>}
          </blockquote>
        )}
      </section>

      {ins.length > 0 && (
        <section className="mind-ins">
          <span className="sk-mono" style={{ padding: '0 4px' }}>What your journal says about you</span>
          <div className="mind-grid">
            {ins.map(([k, v]) => <div key={k} className="glass mind-card"><b>{k}</b><p>{v}</p></div>)}
          </div>
        </section>
      )}

      <section className="glass mind-q">
        <span className="sk-mono">Question for today</span>
        <h3>{question}</h3>
        <textarea className="input" rows={3} value={ans} onChange={(e) => { setAns(e.target.value); setSaved(false) }} placeholder="Write a few honest lines…" />
        <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
          <span className="faint" style={{ fontSize: 12 }}>Only you can see this.</span>
          <button type="button" className="btn btn-primary btn-sm" disabled={!ans.trim()} onClick={() => { save(ANS(today), ans.trim()); setSaved(true) }}>{saved ? <><Check size={14} /> Saved</> : 'Save answer'}</button>
        </div>
        {past.length > 0 && (
          <div className="mind-past">
            {past.map(([d, a, q]) => (
              <div key={d}><span className="sk-mono">{new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span><small>{q}</small><p>{a}</p></div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
