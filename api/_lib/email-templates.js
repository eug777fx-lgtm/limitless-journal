// Shared email templates — single source of truth for every LIMITLESS email.
// Imported by api/daily-email.js, api/weekly-email.js, api/notify-signup.js and
// api/test-emails.js, so the manual test preview is byte-identical to production.
// (Lives under api/_lib/ so Vercel never turns it into a Serverless Function.)

export const APP_URL = 'https://app.limitless-journal.com'
export const LOGO = 'https://limitless-journal.com/logo2.png'
export const SUPABASE_EDITOR = 'https://supabase.com/dashboard/project/fngdbdcpfamcoctmdhyc/editor'

export const usd = (n) => { const v = Math.round(Number(n) || 0); return `${v >= 0 ? '+' : '−'}$${Math.abs(v).toLocaleString()}` }
export const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))

// ── Brand building blocks (inline styles only — email-client safe) ────────────
const statCard = (label, value, color, sub) => `<td width="50%" style="padding:6px;vertical-align:top">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111111;border:1px solid #1f1f1f;border-radius:8px">
    <tr><td style="padding:18px 14px;text-align:center">
      <div style="color:#888888;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase">${label}</div>
      <div style="color:${color || '#ffffff'};font-size:24px;font-weight:700;margin-top:8px;line-height:1.1">${value}</div>
      ${sub ? `<div style="color:#777777;font-size:11px;margin-top:3px">${esc(sub)}</div>` : ''}
    </td></tr>
  </table>
</td>`

const accentCard = (border, inner) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;background:#111111;border:1px solid #1f1f1f;border-left:3px solid ${border};border-radius:8px">
  <tr><td style="padding:16px 20px">${inner}</td></tr>
</table>`

const ctaButton = (label, href) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px">
  <tr><td align="center" style="background:#ffffff;border-radius:8px">
    <a href="${href}" style="display:block;padding:16px 24px;color:#000000;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px">${label}</a>
  </td></tr>
</table>`

// Full brand shell: page bg, 600px container, black header w/ crown, footer.
export function shell(inner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark" /><meta name="supported-color-schemes" content="dark" /></head>
  <body style="margin:0;padding:0;background:#000000">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#000000">
      <tr><td align="center" style="padding:24px 12px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#0a0a0a;border:1px solid #1f1f1f;border-radius:12px">
          <!-- Header -->
          <tr><td style="background:#000000;padding:28px 40px 20px;text-align:center;border-radius:12px 12px 0 0">
            <img src="${LOGO}" width="40" height="auto" alt="LIMITLESS" style="display:block;margin:0 auto 8px auto;border:0" />
            <div style="color:#ffffff;font-weight:700;font-size:13px;letter-spacing:0.2em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">LIMITLESS</div>
          </td></tr>
          <tr><td style="height:1px;line-height:1px;font-size:0;background:#1a1a1a">&nbsp;</td></tr>
          <!-- Body -->
          <tr><td style="padding:40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">${inner}</td></tr>
          <!-- Footer -->
          <tr><td style="padding:26px 40px 32px;border-top:1px solid #1f1f1f;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
            <div style="color:#888888;font-size:13px;font-weight:600;letter-spacing:0.04em">LIMITLESS Trading Journal</div>
            <div style="margin-top:6px"><a href="https://limitless-journal.com" style="color:#aaffa0;font-size:12px;text-decoration:none">limitless-journal.com</a></div>
            <div style="color:#666666;font-size:11px;margin-top:14px;line-height:1.5">You're receiving this because you're a LIMITLESS member.</div>
            <div style="margin-top:8px"><a href="mailto:noreply@limitless-journal.com?subject=Unsubscribe" style="color:#555555;font-size:11px;text-decoration:underline">Unsubscribe</a></div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`
}

// ── Daily — journaled today ───────────────────────────────────────────────────
// s = { count, pnl, winRate, best }
export function journaledHtml(name, s) {
  return shell(`
    <div style="text-align:center">
      <div style="font-size:48px;line-height:1;color:#aaffa0">&#10003;</div>
      <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin:18px 0 10px">Great session${name ? `, ${esc(name)}` : ''}.</h1>
      <p style="color:#888888;font-size:16px;line-height:1.6;margin:0 auto;max-width:420px">You showed up. You logged. That's what separates serious traders.</p>
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px">
      <tr>${statCard('Trades Today', String(s.count))}${statCard("Today's P&amp;L", usd(s.pnl), s.pnl >= 0 ? '#aaffa0' : '#ff8080')}</tr>
      <tr>${statCard('Win Rate', `${s.winRate}%`)}${statCard('Best Trade', s.best != null ? usd(s.best) : '—', '#aaffa0')}</tr>
    </table>
    ${accentCard('#aaffa0', `<div style="color:#cde8c6;font-size:15px;line-height:1.65;font-style:italic">"Every trade logged is data. Every data point builds your edge. Keep going."</div>`)}
    ${ctaButton('View Your Dashboard →', APP_URL)}
  `)
}

// ── Daily — did not journal ───────────────────────────────────────────────────
export function notJournaledHtml(name) {
  const step = (n, t) => `<tr><td style="padding:7px 0">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="28" style="vertical-align:middle"><div style="width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:#111111;border:1px solid #1f1f1f;color:#aaffa0;font-size:12px;font-weight:700">${n}</div></td>
      <td style="vertical-align:middle;padding-left:14px;color:#dddddd;font-size:15px">${t}</td>
    </tr></table></td></tr>`
  return shell(`
    <div style="text-align:center">
      <div style="font-size:44px;line-height:1">&#128197;</div>
      <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin:16px 0 10px">Did you trade today${name ? `, ${esc(name)}` : ''}?</h1>
      <p style="color:#888888;font-size:16px;line-height:1.6;margin:0 auto;max-width:440px">Unlogged trades are missed lessons. Your edge lives in the data.</p>
    </div>
    ${accentCard('#f59e0b', `<div style="color:#e0b877;font-size:15px;line-height:1.6">Every session you don't review is a session you can't learn from.</div>`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px">
      ${step('1', 'Open your journal')}
      ${step('2', 'Log what happened')}
      ${step('3', 'Review and move on')}
    </table>
    ${ctaButton("Log Today's Trades →", APP_URL)}
    ${accentCard('#444444', `
      <div style="color:#ffffff;font-size:15px;font-weight:700;margin-bottom:6px">Didn't trade today? Good.</div>
      <div style="color:#888888;font-size:14px;line-height:1.7">Not every day has a valid setup. Protecting capital IS trading well.</div>`)}
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
    <div style="text-align:center">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.22em;color:#aaffa0;text-transform:uppercase">Week in Review</div>
      <div style="color:#888888;font-size:14px;margin-top:8px">${esc(range)}</div>
      <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin:14px 0 0">Here's how your week looked.</h1>
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px">
      <tr>${statCard('Net P&amp;L', usd(s.net), pnlColor)}${statCard('Win Rate', `${s.winRate}%`)}</tr>
      <tr>${statCard('Total Trades', String(s.count))}${statCard('Avg R:R', s.avgRR ? Number(s.avgRR).toFixed(1) : '—')}</tr>
      <tr>${statCard('Best Trade', s.best ? usd(s.best.pnl) : '—', '#aaffa0', s.best && s.best.symbol)}${statCard('Worst Trade', s.worst ? usd(s.worst.pnl) : '—', '#ff8080', s.worst && s.worst.symbol)}</tr>
    </table>
    ${accentCard(border, `<div style="color:${msgColor};font-size:15px;font-weight:600;line-height:1.6">${esc(s.message)}</div>`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;background:#111111;border:1px solid #1f1f1f;border-radius:8px">
      <tr><td style="padding:16px;text-align:center;color:#888888;font-size:13px;line-height:1.7">
        Wins: <b style="color:#aaffa0">${s.wins}</b> · Losses: <b style="color:#ff8080">${s.losses}</b> · BE: <b style="color:#ffffff">${s.be}</b> · Most Traded: <b style="color:#ffffff">${esc(s.mostTraded)}</b>
      </td></tr>
    </table>
    <div style="margin-top:24px;text-align:center;color:#888888;font-size:14px;line-height:1.8">
      Stay focused on process.<br />One valid setup at a time.<br /><span style="color:#aaffa0">See you next week.</span>
    </div>
    ${ctaButton('Review Full Performance →', APP_URL)}
  `)
}

// ── Signup notification (admin-facing; its own minimal design) ────────────────
export function signupNotificationHtml({ name, email, phone, marketFocus, when }) {
  const row = (label, value) => {
    const shown = value == null || value === '' ? '—' : esc(value)
    return `<tr><td style="padding:8px 0;color:#888;font-size:13px;width:130px">${label}</td><td style="padding:8px 0;color:#fff;font-size:13px;font-weight:600">${shown}</td></tr>`
  }
  return `<!doctype html><html><body style="margin:0;background:#000000;font-family:-apple-system,Segoe UI,sans-serif">
    <div style="max-width:540px;margin:0 auto;padding:32px 24px">
      <div style="text-align:center;margin-bottom:24px">
        <img src="${LOGO}" width="40" height="auto" alt="LIMITLESS" style="display:block;margin:0 auto 8px auto;border:0" />
        <div style="color:#ffffff;font-weight:700;font-size:13px;letter-spacing:0.2em">LIMITLESS</div>
      </div>
      <h1 style="color:#fff;font-size:22px;margin:10px 0 4px">🔔 New Signup — Approval Needed</h1>
      <p style="color:#888;font-size:13px;margin:0 0 22px">A new trader just created an account.</p>
      <table style="width:100%;border-collapse:collapse;background:#111111;border:1px solid #1f1f1f;border-radius:12px;padding:8px 18px">
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
}
