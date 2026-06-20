// Shared email templates — single source of truth for every LIMITLESS email.
// Imported by api/daily-email.js, api/weekly-email.js, api/notify-signup.js and
// api/test-emails.js, so the manual test preview is byte-identical to production.
// (Lives under api/_lib/ so Vercel never turns it into a Serverless Function.)
//
// Email-client rules baked in here:
//   • 100% inline styles — no CSS classes, no <style> blocks, no external sheets.
//   • TABLE-based layout everywhere (no layout <div>s) — Outlook/Gmail need it.
//   • Every background uses `background-color:` set DIRECTLY on the element so
//     dark backgrounds actually render.

export const APP_URL = 'https://app.limitless-journal.com'
export const LOGO = 'https://limitless-journal.com/logo2.png'
export const SUPABASE_EDITOR = 'https://supabase.com/dashboard/project/fngdbdcpfamcoctmdhyc/editor'

export const usd = (n) => { const v = Math.round(Number(n) || 0); return `${v >= 0 ? '+' : '−'}$${Math.abs(v).toLocaleString()}` }
export const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))

// ── Brand building blocks (table-based, background-color inline on the cell) ───
// Two statCards per <tr> form the 2-up grid; the card background sits on the <td>.
const statCard = (label, value, color, sub) => `<td width="50%" valign="top" style="padding:6px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" bgcolor="#111111" style="background-color:#111111; border:1px solid #1f1f1f; border-radius:8px; padding:16px;">
        <p style="margin:0; color:#888888; font-size:10px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase;">${label}</p>
        <p style="margin:8px 0 0; color:${color || '#ffffff'}; font-size:24px; font-weight:700; line-height:1.1;">${value}</p>
        ${sub ? `<p style="margin:3px 0 0; color:#777777; font-size:11px;">${esc(sub)}</p>` : ''}
      </td>
    </tr>
  </table>
</td>`

const accentCard = (border, inner) => `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
  <tr>
    <td bgcolor="#111111" style="background-color:#111111; border:1px solid #1f1f1f; border-left:3px solid ${border}; border-radius:8px; padding:16px 20px;">${inner}</td>
  </tr>
</table>`

const ctaButton = (label, href) => `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
  <tr>
    <td align="center" bgcolor="#ffffff" style="background-color:#ffffff; border-radius:8px;">
      <a href="${href}" style="display:block; padding:16px 24px; color:#000000; font-size:15px; font-weight:700; text-decoration:none; border-radius:8px;">${label}</a>
    </td>
  </tr>
</table>`

// Full brand shell — exact table-based wrapper, all backgrounds inline.
export function shell(inner) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body bgcolor="#000000" style="margin:0; padding:0; background-color:#000000; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#000000" style="background-color:#000000; min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#0a0a0a" style="max-width:600px; background-color:#0a0a0a; border:1px solid #1a1a1a; border-radius:12px; overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td align="center" bgcolor="#0a0a0a" style="padding:32px 40px 24px; border-bottom:1px solid #1a1a1a;">
              <img src="${LOGO}" width="36" height="36" style="display:block; margin:0 auto 12px auto;" alt="LIMITLESS">
              <p style="margin:0; color:#ffffff; font-size:13px; font-weight:700; letter-spacing:0.2em;">LIMITLESS</p>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td bgcolor="#0a0a0a" style="padding:40px;">
${inner}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" bgcolor="#0a0a0a" style="padding:24px 40px; border-top:1px solid #1a1a1a;">
              <p style="margin:0 0 4px; color:#444444; font-size:12px;">LIMITLESS Trading Journal</p>
              <a href="https://limitless-journal.com" style="color:#aaffa0; font-size:12px; text-decoration:none;">limitless-journal.com</a>
              <p style="margin:8px 0 0; color:#333333; font-size:11px;">You're receiving this as a LIMITLESS member.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Daily — journaled today ───────────────────────────────────────────────────
// s = { count, pnl, winRate, best }
export function journaledHtml(name, s) {
  return shell(`
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <p style="margin:0; font-size:48px; line-height:1; color:#aaffa0;">&#10003;</p>
        <h1 style="margin:18px 0 10px; color:#ffffff; font-size:28px; font-weight:700;">Great session${name ? `, ${esc(name)}` : ''}.</h1>
        <p style="margin:0 auto; max-width:420px; color:#888888; font-size:16px; line-height:1.6;">You showed up. You logged. That's what separates serious traders.</p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>${statCard('Trades Today', String(s.count))}${statCard("Today's P&amp;L", usd(s.pnl), s.pnl >= 0 ? '#aaffa0' : '#ff8080')}</tr>
      <tr>${statCard('Win Rate', `${s.winRate}%`)}${statCard('Best Trade', s.best != null ? usd(s.best) : '—', '#aaffa0')}</tr>
    </table>
    ${accentCard('#aaffa0', `<p style="margin:0; color:#cde8c6; font-size:15px; line-height:1.65; font-style:italic;">"Every trade logged is data. Every data point builds your edge. Keep going."</p>`)}
    ${ctaButton('View Your Dashboard →', APP_URL)}
  `)
}

// ── Daily — did not journal ───────────────────────────────────────────────────
export function notJournaledHtml(name) {
  const step = (n, t) => `<tr><td style="padding:7px 0;">
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td width="26" height="26" align="center" valign="middle" bgcolor="#111111" style="background-color:#111111; border:1px solid #1f1f1f; border-radius:50%; color:#aaffa0; font-size:12px; font-weight:700; line-height:26px;">${n}</td>
        <td valign="middle" style="padding-left:14px; color:#dddddd; font-size:15px;">${t}</td>
      </tr>
    </table>
  </td></tr>`
  return shell(`
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <p style="margin:0; font-size:44px; line-height:1;">&#128197;</p>
        <h1 style="margin:16px 0 10px; color:#ffffff; font-size:28px; font-weight:700;">Did you trade today${name ? `, ${esc(name)}` : ''}?</h1>
        <p style="margin:0 auto; max-width:440px; color:#888888; font-size:16px; line-height:1.6;">Unlogged trades are missed lessons. Your edge lives in the data.</p>
      </td></tr>
    </table>
    ${accentCard('#f59e0b', `<p style="margin:0; color:#e0b877; font-size:15px; line-height:1.6;">Every session you don't review is a session you can't learn from.</p>`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
      ${step('1', 'Open your journal')}
      ${step('2', 'Log what happened')}
      ${step('3', 'Review and move on')}
    </table>
    ${ctaButton("Log Today's Trades →", APP_URL)}
    ${accentCard('#444444', `
      <p style="margin:0 0 6px; color:#ffffff; font-size:15px; font-weight:700;">Didn't trade today? Good.</p>
      <p style="margin:0; color:#888888; font-size:14px; line-height:1.7;">Not every day has a valid setup. Protecting capital IS trading well.</p>`)}
  `)
}

// ── Weekly ────────────────────────────────────────────────────────────────────
export function weeklyMessage(count, net) {
  return count === 0 ? 'No trades logged this week. The journal only works when you use it.'
    : net > 0 ? 'Profitable week. Process is working. Keep executing.'
    : net >= -500 ? 'Tough week. Review your losses. The data will show you why.'
    : 'Difficult week. Protect capital first. Review before Monday.'
}

// s = { count, net, winRate, avgRR, best:{pnl,symbol}|null, worst:{pnl,symbol}|null, wins, losses, be, mostTraded, message }
export function weeklyHtml(s, range) {
  const pnlColor = s.net >= 0 ? '#aaffa0' : '#ff8080'
  const border = s.count === 0 ? '#555555' : s.net > 0 ? '#aaffa0' : s.net >= -500 ? '#f59e0b' : '#ff8080'
  const msgColor = s.count === 0 ? '#888888' : s.net > 0 ? '#aaffa0' : s.net >= -500 ? '#e0b877' : '#ff8080'
  return shell(`
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <p style="margin:0; font-size:11px; font-weight:700; letter-spacing:0.22em; color:#aaffa0; text-transform:uppercase;">Week in Review</p>
        <p style="margin:8px 0 0; color:#888888; font-size:14px;">${esc(range)}</p>
        <h1 style="margin:14px 0 0; color:#ffffff; font-size:28px; font-weight:700;">Here's how your week looked.</h1>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>${statCard('Net P&amp;L', usd(s.net), pnlColor)}${statCard('Win Rate', `${s.winRate}%`)}</tr>
      <tr>${statCard('Total Trades', String(s.count))}${statCard('Avg R:R', s.avgRR ? Number(s.avgRR).toFixed(1) : '—')}</tr>
      <tr>${statCard('Best Trade', s.best ? usd(s.best.pnl) : '—', '#aaffa0', s.best && s.best.symbol)}${statCard('Worst Trade', s.worst ? usd(s.worst.pnl) : '—', '#ff8080', s.worst && s.worst.symbol)}</tr>
    </table>
    ${accentCard(border, `<p style="margin:0; color:${msgColor}; font-size:15px; font-weight:600; line-height:1.6;">${esc(s.message)}</p>`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
      <tr>
        <td align="center" bgcolor="#111111" style="background-color:#111111; border:1px solid #1f1f1f; border-radius:8px; padding:16px; color:#888888; font-size:13px; line-height:1.7;">
          Wins: <b style="color:#aaffa0;">${s.wins}</b> · Losses: <b style="color:#ff8080;">${s.losses}</b> · BE: <b style="color:#ffffff;">${s.be}</b> · Most Traded: <b style="color:#ffffff;">${esc(s.mostTraded)}</b>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td align="center" style="color:#888888; font-size:14px; line-height:1.8;">
          Stay focused on process.<br>One valid setup at a time.<br><span style="color:#aaffa0;">See you next week.</span>
        </td>
      </tr>
    </table>
    ${ctaButton('Review Full Performance →', APP_URL)}
  `)
}

// ── Signup notification (admin-facing; same wrapper, admin footer) ────────────
export function signupNotificationHtml({ name, email, phone, marketFocus, when }) {
  const row = (label, value) => {
    const shown = value == null || value === '' ? '—' : esc(value)
    return `<tr>
      <td style="padding:8px 0; color:#888888; font-size:13px; width:130px;">${label}</td>
      <td style="padding:8px 0; color:#ffffff; font-size:13px; font-weight:600;">${shown}</td>
    </tr>`
  }
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body bgcolor="#000000" style="margin:0; padding:0; background-color:#000000; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#000000" style="background-color:#000000; min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#0a0a0a" style="max-width:600px; background-color:#0a0a0a; border:1px solid #1a1a1a; border-radius:12px; overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td align="center" bgcolor="#0a0a0a" style="padding:32px 40px 24px; border-bottom:1px solid #1a1a1a;">
              <img src="${LOGO}" width="36" height="36" style="display:block; margin:0 auto 12px auto;" alt="LIMITLESS">
              <p style="margin:0; color:#ffffff; font-size:13px; font-weight:700; letter-spacing:0.2em;">LIMITLESS</p>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td bgcolor="#0a0a0a" style="padding:40px;">
              <h1 style="margin:0 0 4px; color:#ffffff; font-size:22px; font-weight:700;">🔔 New Signup — Approval Needed</h1>
              <p style="margin:0 0 22px; color:#888888; font-size:13px;">A new trader just created an account.</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td bgcolor="#111111" style="background-color:#111111; border:1px solid #1f1f1f; border-radius:8px; padding:8px 18px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${row('Name', name)}
                      ${row('Email', email)}
                      ${row('Phone', phone)}
                      ${row('Market Focus', marketFocus)}
                      ${row('Signup Time', when)}
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
                <tr>
                  <td align="center" bgcolor="#ffffff" style="background-color:#ffffff; border-radius:8px;">
                    <a href="${SUPABASE_EDITOR}" style="display:block; padding:14px 22px; color:#000000; font-size:14px; font-weight:700; text-decoration:none; border-radius:8px;">Approve in Supabase →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" bgcolor="#0a0a0a" style="padding:24px 40px; border-top:1px solid #1a1a1a;">
              <p style="margin:0; color:#444444; font-size:11px;">Sent automatically by LIMITLESS Journal</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
