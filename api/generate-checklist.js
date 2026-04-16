export default async function handler(req, res) {
  console.log('API KEY EXISTS:', !!process.env.ANTHROPIC_API_KEY)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body) } catch { return {} } })() : (req.body || {})
  const rules = body.rules

  if (!rules || typeof rules !== 'string' || !rules.trim()) {
    return res.status(400).json({ error: 'Missing rules text' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })

  const prompt = `Based on these trading rules, generate a concise pre-trade checklist of 6-8 actionable items a trader should check before entering a trade. Return ONLY a JSON array of strings, nothing else. No markdown, no code fences, no prose.

Rules:
${rules}`

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await anthropicRes.json()
    if (!anthropicRes.ok) {
      return res.status(anthropicRes.status).json({ error: data?.error?.message || 'Anthropic API error' })
    }

    const text = (data?.content?.[0]?.text || '').trim()
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()

    let items = null
    try { items = JSON.parse(cleaned) } catch {
      const match = cleaned.match(/\[[\s\S]*\]/)
      if (match) { try { items = JSON.parse(match[0]) } catch {} }
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(502).json({ error: 'Could not parse checklist from response', raw: text })
    }

    const clean = items
      .filter(s => typeof s === 'string' && s.trim())
      .map(s => s.trim())
      .slice(0, 12)

    res.status(200).json({ items: clean })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Request failed' })
  }
}
