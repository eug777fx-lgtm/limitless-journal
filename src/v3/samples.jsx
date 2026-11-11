// Owner only: put example trades into the real account (so they show on every device),
// and remove them again in one tap. They carry the tag "Sample" so nothing else is touched.
import React from 'react'
import { useStore } from './store.jsx'
import { useSkin, setSkin, sampleRows } from './skin.jsx'
import { isoLocal } from './data.js'

export const SAMPLE_TAG = 'Sample'

export function SampleControls() {
  const { isSuperAdmin, trades, sample, importTrades, deleteTrades, notify } = useStore()
  const skin = useSkin()
  const [busy, setBusy] = React.useState(false)
  if (!isSuperAdmin || !skin.on) return null
  const saved = sample ? [] : trades.filter((t) => (t.tags || []).includes(SAMPLE_TAG))
  const add = async () => {
    setBusy(true)
    try {
      const from = isoLocal(new Date(Date.now() - 92 * 864e5))
      const rows = sampleRows().filter((r) => r.trade_date >= from).map(({ id, created_at, ...r }) => ({ ...r, tags: [...(r.tags || []), SAMPLE_TAG], notes: 'Sample trade, safe to delete' }))
      const n = await importTrades(rows)
      setSkin({ sample: false })
      notify(`${n} sample trades added to your account`)
    } catch (e) { notify(e.message, 'err') }
    setBusy(false)
  }
  const remove = async () => {
    setBusy(true)
    try { const n = await deleteTrades(saved.map((t) => t.id)); notify(`${n} sample trades removed`) } catch (e) { notify(e.message, 'err') }
    setBusy(false)
  }
  if (saved.length) return <span className="sk-owner sk-samples">{saved.length} sample trades in your account <button type="button" disabled={busy} onClick={remove}>{busy ? 'Removing…' : 'Remove them'}</button></span>
  if (sample) return <span className="sk-owner sk-samples">Sample trades <button type="button" disabled={busy} onClick={add}>{busy ? 'Saving…' : 'Save to my account'}</button> <button type="button" onClick={() => setSkin({ sample: false })}>Hide</button></span>
  return null
}
