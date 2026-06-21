// Shared email logger — inserts one row into the `email_log` table per send
// attempt (sent / failed / skipped). Used by every email endpoint + cron so the
// admin "Emails → Log" tab shows a complete delivery history.
//
// Uses the SAME Supabase server client the email endpoints already use: the
// SERVICE ROLE key via PostgREST. The service role bypasses RLS, so the insert
// always succeeds with no insert policy needed. (env SUPABASE_SERVICE_ROLE_KEY
// is already required + present for send-approval / daily / weekly emails.)
//
// Fire-and-forget: logging never throws and never blocks/fails the actual send.

const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function logEmail({ userId, recipientEmail, emailType, status, error, sentBy, resendId } = {}) {
  if (!SUPA_URL || !SERVICE_KEY) return
  try {
    await fetch(`${SUPA_URL}/rest/v1/email_log`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId || null,
        recipient_email: recipientEmail || null,
        email_type: emailType || null,
        status: status || null,
        error: error ? String(error).slice(0, 500) : null,
        sent_by: sentBy || 'system',
        resend_id: resendId || null,
      }),
    })
  } catch (e) {
    console.error('logEmail failed:', e.message)
  }
}
