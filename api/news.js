export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=1800')

  // Get the Monday of the current week (UTC)
  const getThisMonday = () => {
    const now = new Date()
    const day = now.getUTCDay() // 0=Sun, 1=Mon...
    const diff = day === 0 ? -6 : 1 - day
    const mon = new Date(now)
    mon.setUTCDate(now.getUTCDate() + diff)
    mon.setUTCHours(0, 0, 0, 0)
    return mon
  }

  const thisMonday = getThisMonday()

  // Parse ?week=YYYY-MM-DD — treat it as the Monday of the requested week
  const weekParam = req.query?.week
  let requestedMonday = null
  if (weekParam) {
    const d = new Date(weekParam + 'T00:00:00Z')
    if (!isNaN(d.getTime())) requestedMonday = d
  }

  // Determine offset in weeks
  let diffWeeks = 0
  if (requestedMonday) {
    const diffMs = requestedMonday.getTime() - thisMonday.getTime()
    diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000))
  }

  if (diffWeeks > 1) {
    console.log('[news] Requested week is beyond next week — returning unavailable')
    return res.status(200).json({ unavailable: true, message: 'Only current and next week data available from Forex Factory.' })
  }

  // For next week, try both known URL variants in order
  const urls = diffWeeks <= 0
    ? ['https://nfs.faireconomy.media/ff_calendar_thisweek.json']
    : [
        'https://nfs.faireconomy.media/ff_calendar_nextweek.json',
        'https://nfs.faireconomy.media/ff_calendar_next_week.json',
      ]

  let lastError = null
  for (const url of urls) {
    try {
      console.log(`[news] Fetching: ${url}`)
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
      })
      console.log(`[news] Response status: ${response.status} from ${url}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      const count = Array.isArray(data) ? data.length : 0
      console.log(`[news] Events returned: ${count}`)
      return res.status(200).json(data)
    } catch (err) {
      console.log(`[news] Failed ${url}: ${err.message}`)
      lastError = err
    }
  }

  res.status(500).json({ error: lastError?.message || 'All URLs failed' })
}
