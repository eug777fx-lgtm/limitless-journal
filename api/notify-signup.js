// Notifies the admin when a new user signs up (approval needed).
// Sends via Resend to a fixed admin inbox. Public endpoint (called from the
// signup flow), so it only ever emails the hardcoded admin — never the caller.
//   Env: RESEND_API_KEY (required), SIGNUP_FROM_EMAIL (optional override).

const ADMIN_TO = 'eug777fx@gmail.com'
const SUPABASE_EDITOR = 'https://supabase.com/dashboard/project/fngdbdcpfamcoctmdhyc/editor'

const esc = (s) => String(s ?? '—').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' })
  const from = process.env.SIGNUP_FROM_EMAIL || 'LIMITLESS <noreply@limitless-journal.com>'

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body) } catch { return {} } })() : (req.body || {})
  const { name, email, phone, marketFocus } = body
  const when = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }) + ' ET'

  const row = (label, value) =>
    `<tr><td style="padding:8px 0;color:#888;font-size:13px;width:130px">${label}</td><td style="padding:8px 0;color:#fff;font-size:13px;font-weight:600">${esc(value)}</td></tr>`

  const html = `<!doctype html><html><body style="margin:0;background:#080808;font-family:-apple-system,Segoe UI,sans-serif">
    <div style="max-width:540px;margin:0 auto;padding:32px 24px">
      <div style="font-size:11px;letter-spacing:0.2em;color:#aaffa0;text-transform:uppercase;font-weight:700">LIMITLESS</div>
      <h1 style="color:#fff;font-size:22px;margin:10px 0 4px">🔔 New Signup — Approval Needed</h1>
      <p style="color:#888;font-size:13px;margin:0 0 22px">A new trader just created an account.</p>
      <table style="width:100%;border-collapse:collapse;background:#0d0d0d;border:1px solid #1f1f1f;border-radius:12px;padding:8px 18px">
        ${row('Name', name)}
        ${row('Email', email)}
        ${row('Phone', phone)}
        ${row('Market Focus', marketFocus)}
        ${row('Signup Time', when)}
      </table>
      <a href="${SUPABASE_EDITOR}" style="display:inline-block;margin-top:22px;background:#fff;color:#000;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px">Approve in Supabase →</a>
      <p style="color:#444;font-size:11px;margin-top:26px">Sent automatically by LIMITLESS Journal</p>
    </div>
  </body></html>`

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to: ADMIN_TO, subject: '🔔 New LIMITLESS Signup — Approval Needed', html }),
    })
    if (!r.ok) return res.status(502).json({ error: await r.text() })
    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
