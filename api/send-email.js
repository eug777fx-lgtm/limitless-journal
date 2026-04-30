// Sends emails via Resend (https://resend.com/api).
// Required env vars on Vercel:
//   RESEND_API_KEY    — your Resend secret key
//   ADMIN_FROM_EMAIL  — verified sender, e.g. "LIMITLESS <noreply@yourdomain.com>"
// Frontend POSTs: { to: string | string[], subject: string, message: string }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.ADMIN_FROM_EMAIL
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' })
  if (!from)   return res.status(500).json({ error: 'ADMIN_FROM_EMAIL not configured' })

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body) } catch { return {} } })() : (req.body || {})
  let { to, subject, message } = body

  if (!to || !subject || !message) return res.status(400).json({ error: 'Missing to / subject / message' })
  if (!Array.isArray(to)) to = [to]
  to = to.filter(e => typeof e === 'string' && /\S+@\S+\.\S+/.test(e))
  if (to.length === 0) return res.status(400).json({ error: 'No valid recipients' })

  const html = `<!doctype html><html><body style="font-family:-apple-system,sans-serif;line-height:1.6;color:#222;max-width:600px;margin:0 auto;padding:24px;">${message.replace(/\n/g, '<br>')}<hr style="border:none;border-top:1px solid #eee;margin:24px 0"><p style="font-size:11px;color:#888">Sent from LIMITLESS Private Journal</p></body></html>`

  const results = await Promise.allSettled(
    to.map(addr => fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to: addr, subject, html }),
    }).then(async r => {
      if (!r.ok) {
        const errBody = await r.text()
        throw new Error(`${addr}: ${r.status} ${errBody}`)
      }
      return addr
    })),
  )

  const sent   = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').map(r => r.reason?.message || 'unknown')

  res.status(failed.length === to.length ? 502 : 200).json({ sent, total: to.length, failed })
}
