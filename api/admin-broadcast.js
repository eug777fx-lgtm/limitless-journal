// Admin email broadcast — the single endpoint for ALL manual sends (bulk AND
// per-user; a per-user send is just userIds of length 1). Super-admin only.
//   POST body: { type: 'approved' | 'weekly', userIds: string[] }
//   Auth: Authorization: Bearer <supabase access token>  (must be super-admin)
//   Returns: { sent, skipped, failed, failures: [{ email, reason }] }
//   Env: RESEND_API_KEY, SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
//
// Reuses the template builders + the weekly stat helper (one source of truth),
// sends through Resend's batch endpoint (chunked to 100), and logs every attempt.

import { approvedEmail, weeklyProfitableEmail, weeklyLosingEmail } from './_lib/email-templates.js'
import { weeklyWindow, buildWeeklyStats } from './_lib/weekly-stats.js'
import { logEmail } from './_lib/log-email.js'

const SUPER_ADMIN = 'eug777fx@gmail.com'
const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FROM = 'LIMITLESS <noreply@limitless-journal.com>'

const sb = (path) => fetch(`${SUPA_URL}/rest/v1/${path}`, {
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
}).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${path}: ${r.status}`))))

const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !SUPA_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing RESEND_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' })
  }

  // ── Super-admin gate (server-side; resolve the caller from their token) ──
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Missing authorization token' })
  let caller
  try {
    const ar = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` } })
    caller = ar.ok ? await ar.json() : null
  } catch { caller = null }
  if (!caller || caller.email !== SUPER_ADMIN) return res.status(403).json({ error: 'Forbidden — super admin only' })

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body) } catch { return {} } })() : (req.body || {})
  const type = body.type
  const userIds = Array.isArray(body.userIds) ? body.userIds.filter(Boolean) : []
  if (type !== 'approved' && type !== 'weekly') return res.status(400).json({ error: "type must be 'approved' or 'weekly'" })
  if (userIds.length === 0) return res.status(400).json({ error: 'userIds required' })

  const sentBy = caller.email
  let sent = 0, skipped = 0, failed = 0
  const failures = []

  try {
    const idList = userIds.join(',')
    const [profiles, usersView] = await Promise.all([
      sb(`profiles?id=in.(${idList})&status=eq.approved&select=id,first_name,username`),
      sb(`admin_users_view?id=in.(${idList})&select=id,email`).catch(() => []),
    ])
    const emailById = new Map((usersView || []).map((u) => [u.id, u.email]))

    // Build the per-user message list (and collect skips/failures pre-send).
    const toSend = [] // { userId, email, subject, html }
    if (type === 'approved') {
      for (const p of profiles) {
        const email = emailById.get(p.id)
        if (!email) { failed++; failures.push({ email: p.id, reason: 'no email on file' }); await logEmail({ userId: p.id, emailType: 'approved', status: 'failed', error: 'no email', sentBy }); continue }
        const { subject, html } = approvedEmail({ first_name: p.first_name || p.username || '' })
        toSend.push({ userId: p.id, email, subject, html })
      }
    } else {
      const { since, range } = weeklyWindow()
      const trades = await sb(`trades?trade_date=gte.${since}&user_id=in.(${idList})&select=user_id,pnl,rr,symbol`).catch(() => [])
      const byUser = new Map()
      for (const t of trades) { if (!byUser.has(t.user_id)) byUser.set(t.user_id, []); byUser.get(t.user_id).push(t) }
      for (const p of profiles) {
        const email = emailById.get(p.id)
        const ts = byUser.get(p.id) || []
        if (ts.length === 0) { skipped++; await logEmail({ userId: p.id, recipientEmail: email, emailType: 'weekly', status: 'skipped', error: 'no trades in window', sentBy }); continue }
        if (!email) { failed++; failures.push({ email: p.id, reason: 'no email on file' }); await logEmail({ userId: p.id, emailType: 'weekly', status: 'failed', error: 'no email', sentBy }); continue }
        const stats = buildWeeklyStats(ts, range)
        const user = { first_name: p.first_name || p.username || '' }
        const { subject, html } = stats.pnl > 0 ? weeklyProfitableEmail(user, stats) : weeklyLosingEmail(user, stats)
        toSend.push({ userId: p.id, email, subject, html })
      }
    }

    // ── Send via Resend batch endpoint, chunked to 100 ──
    // Open/click tracking is a Resend DOMAIN setting (dashboard → Domains →
    // limitless-journal.com → enable Open + Click Tracking). It is not a per-send
    // payload field. We store the returned resend_id below; api/resend-webhook.js
    // matches Resend's email.opened/clicked/etc. events back to that id.
    for (const group of chunk(toSend, 100)) {
      let data = null, chunkErr = null
      try {
        const r = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify(group.map((m) => ({ from: FROM, to: m.email, subject: m.subject, html: m.html }))),
        })
        if (r.ok) { data = (await r.json().catch(() => ({}))).data || [] }
        else { chunkErr = await r.text().catch(() => `HTTP ${r.status}`) }
      } catch (e) { chunkErr = e.message }

      for (let i = 0; i < group.length; i++) {
        const m = group[i]
        const resendId = data && data[i] && data[i].id
        if (data && resendId !== undefined) {
          sent++
          await logEmail({ userId: m.userId, recipientEmail: m.email, emailType: type, status: 'sent', sentBy, resendId: resendId || null })
        } else {
          failed++
          const reason = chunkErr || 'send failed'
          failures.push({ email: m.email, reason })
          await logEmail({ userId: m.userId, recipientEmail: m.email, emailType: type, status: 'failed', error: reason, sentBy })
        }
      }
    }

    return res.status(200).json({ sent, skipped, failed, failures })
  } catch (e) {
    console.error('admin-broadcast error:', e.message)
    return res.status(500).json({ error: e.message, sent, skipped, failed, failures })
  }
}
