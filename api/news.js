export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=1800')
  try {
    const response = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    })
    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
