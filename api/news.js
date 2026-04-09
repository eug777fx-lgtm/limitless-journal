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

  // Determine which FF URL to use
  let url
  if (!requestedMonday) {
    url = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'
  } else {
    const diffMs = requestedMonday.getTime() - thisMonday.getTime()
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000))
    if (diffWeeks <= 0) {
      url = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'
    } else if (diffWeeks === 1) {
      url = 'https://nfs.faireconomy.media/ff_calendar_nextweek.json'
    } else {
      return res.status(200).json({ unavailable: true, message: 'Only current and next week data available from Forex Factory.' })
    }
  }

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    })
    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
