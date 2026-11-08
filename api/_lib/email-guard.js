// Shared guards for the scheduled emails, sized for Resend's free plan
// (100 emails per UTC day, 3,000 per month, 10 requests per second).
//  - suppressed(): addresses that bounced or marked us as spam are never mailed again.
//    Repeated bounces get a sending account paused, so this protects every email.
//  - weekendHalf(): splits traders into two stable halves, one sent Saturday, one Sunday.
const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function suppressed() {
  const r = await fetch(`${SUPA_URL}/rest/v1/email_log?status=eq.failed&error=in.(bounced,%22spam%20complaint%22)&select=user_id,recipient_email`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  }).catch(() => null)
  const rows = r && r.ok ? await r.json().catch(() => []) : []
  return {
    users: new Set(rows.map((x) => x.user_id).filter(Boolean)),
    emails: new Set(rows.map((x) => String(x.recipient_email || '').toLowerCase()).filter(Boolean)),
  }
}

// 0 or 1, stable per user id.
export function weekendHalf(id) {
  let h = 0
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % 2
}

// Hard stop per run, leaving room in the day for signup and approval emails.
export const MAX_PER_RUN = Number(process.env.EMAIL_MAX_PER_RUN || 85)
