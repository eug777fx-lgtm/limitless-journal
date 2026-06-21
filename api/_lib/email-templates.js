// Shared email templates — single source of truth for every LIMITLESS email.
// Imported by api/notify-signup.js, api/daily-email.js, api/weekly-email.js,
// api/send-approval.js and api/test-emails.js.
//
// Mobile dark-mode strategy (Gmail mobile strips <head><style> entirely):
//   • EVERY <table> and <td> carries an inline background-color directly on it —
//     no classes, no reliance on parent inheritance, no priority overrides.
//   • One full-width black master <table> wraps the centered 580px card (no
//     <div> anywhere — Gmail mobile drops background-color on divs), so the page
//     background is solid black edge-to-edge with no white gaps.
//   • The <head> is minimal (meta only) for the desktop clients that read it.
//   • Shell is identical across all 6 templates — only the content section differs.

const APP_URL = 'https://app.limitless-journal.com'

const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))
const usd = (n) => { const v = Math.round(Number(n) || 0); return `${v >= 0 ? '+' : '−'}$${Math.abs(v).toLocaleString()}` }

// Coloured-cell attribute builders: bgcolor attribute + inline background-color
// directly on the element (no class, no priority overrides).
const blk = (extra = '') => `bgcolor="#000000" style="background-color:#000000;${extra}"`
const dk = (extra = '') => `bgcolor="#0d0d0d" style="background-color:#0d0d0d;${extra}"`
const cd = (extra = '') => `bgcolor="#111111" style="background-color:#111111;${extra}"`
const wh = (extra = '') => `bgcolor="#ffffff" style="background-color:#ffffff;${extra}"`

const HEAD = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
</head>`

// Full brand shell — full-bleed black wrapper + centered 580px card.
// Identical for every template; only `inner` changes.
function page(inner) {
  return `${HEAD}
<body style="margin:0;padding:0;background-color:#000000;" bgcolor="#000000">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${blk('width:100%;margin:0;padding:0;')}>
<tr>
<td align="center" ${blk('padding:32px 16px;')}>

<table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" ${dk('border:1px solid #1a1a1a;border-radius:16px;max-width:580px;width:100%;')}>

<!-- HEADER -->
<tr>
<td align="center" ${blk('padding:32px 40px 24px;border-bottom:1px solid #1a1a1a;border-radius:16px 16px 0 0;')}>
<p style="margin:0;font-size:11px;font-weight:700;color:#ffffff;letter-spacing:0.25em;font-family:Arial,sans-serif;">LIMITLESS</p>
<p style="margin:4px 0 0;font-size:10px;color:#444444;letter-spacing:0.1em;font-family:Arial,sans-serif;">TRADING JOURNAL</p>
</td>
</tr>

<!-- CONTENT -->
<tr>
<td ${dk('padding:36px 40px;font-family:Arial,sans-serif;')}>
${inner}
</td>
</tr>

<!-- FOOTER -->
<tr>
<td align="center" ${blk('padding:24px 40px;border-top:1px solid #1a1a1a;border-radius:0 0 16px 16px;')}>
<p style="margin:0 0 6px;font-size:11px;color:#444444;font-family:Arial,sans-serif;">LIMITLESS Trading Journal</p>
<a href="https://limitless-journal.com" style="font-size:11px;color:#aaffa0;text-decoration:none;font-family:Arial,sans-serif;">limitless-journal.com</a>
<p style="margin:10px 0 0;font-size:10px;color:#333333;font-family:Arial,sans-serif;">You're receiving this as a LIMITLESS member.</p>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>`
}

// ── Brand building blocks (every table & td carries its own inline bg) ────────
const statCard = (label, value, color, sub) => `<td width="50%" valign="top" ${dk('padding:6px;')}>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${dk()}>
    <tr>
      <td align="center" ${cd('border:1px solid #1f1f1f;border-radius:8px;padding:16px;')}>
        <p style="margin:0;color:#888888;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;">${label}</p>
        <p style="margin:8px 0 0;color:${color || '#ffffff'};font-size:24px;font-weight:700;line-height:1.1;">${value}</p>
        ${sub ? `<p style="margin:3px 0 0;color:#777777;font-size:11px;">${esc(sub)}</p>` : ''}
      </td>
    </tr>
  </table>
</td>`

const accentCard = (border, inner) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${dk('margin-top:22px;')}>
  <tr>
    <td ${cd(`border:1px solid #1f1f1f;border-left:3px solid ${border};border-radius:8px;padding:16px 20px;`)}>${inner}</td>
  </tr>
</table>`

const ctaButton = (label, href) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${dk('margin-top:28px;')}>
  <tr>
    <td align="center" ${wh('border-radius:8px;')}>
      <a href="${href}" style="display:block;padding:16px 24px;color:#000000;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">${label}</a>
    </td>
  </tr>
</table>`

// ── Template 1 — signupNotification(user) → admin ─────────────────────────────
export function signupNotification(user = {}) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ')
  const row = (label, value) => {
    const shown = value == null || value === '' ? '—' : esc(value)
    return `<tr>
      <td ${cd('padding:8px 0;color:#888888;font-size:13px;width:130px;')}>${label}</td>
      <td align="right" ${cd('padding:8px 0;color:#ffffff;font-size:13px;font-weight:600;')}>${shown}</td>
    </tr>`
  }
  const inner = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${dk()}>
      <tr><td ${dk()}>
        <h1 style="margin:0 0 4px;color:#ffffff;font-size:22px;font-weight:700;">🔔 New Signup — Approval Needed</h1>
        <p style="margin:0 0 22px;color:#888888;font-size:13px;">A new trader just created an account.</p>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${dk()}>
      <tr>
        <td ${cd('border:1px solid #1f1f1f;border-radius:8px;padding:8px 18px;')}>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${cd()}>
            ${row('Name', name)}
            ${row('Email', user.email)}
            ${row('Phone', user.phone)}
            ${row('Market Focus', user.market_focus)}
            ${row('Signup Time', user.when || new Date().toLocaleString())}
          </table>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${dk('margin-top:22px;')}>
      <tr>
        <td align="center" ${wh('border-radius:8px;')}>
          <a href="${APP_URL}" style="display:block;padding:14px 22px;color:#000000;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">Open Admin Panel →</a>
        </td>
      </tr>
    </table>`
  return { subject: `New signup — ${user.first_name || 'Someone'} needs approval`, html: page(inner) }
}

// ── Template 2 — approvedEmail(user) → newly approved user ────────────────────
export function approvedEmail(user = {}) {
  const name = user.first_name || 'trader'
  const inner = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${dk()}>
      <tr><td align="center" ${dk()}>
        <p style="margin:0;font-size:48px;line-height:1;color:#aaffa0;">&#10003;</p>
        <h1 style="margin:18px 0 10px;color:#ffffff;font-size:28px;font-weight:700;">You're in, ${esc(name)}.</h1>
        <p style="margin:0 auto;max-width:440px;color:#888888;font-size:16px;line-height:1.6;">Your account is approved and ready. Start journaling your trades and building your edge today.</p>
      </td></tr>
    </table>
    ${accentCard('#aaffa0', `<p style="margin:0 0 10px;color:#ffffff;font-size:14px;font-weight:700;">What to do next</p>
      <p style="margin:0;color:#cde8c6;font-size:14px;line-height:1.9;">1. Log your first trade<br>2. Set your monthly goal in settings<br>3. Review your performance weekly</p>`)}
    ${ctaButton('Go to Your Dashboard →', APP_URL)}`
  return { subject: `You're in, ${name}. Welcome to LIMITLESS.`, html: page(inner) }
}

// ── Template 3 — dailyJournaledEmail(user, stats) ─────────────────────────────
// stats = { trades, pnl, winRate, bestTrade }
export function dailyJournaledEmail(user = {}, stats = {}) {
  const name = user.first_name || 'trader'
  const inner = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${dk()}>
      <tr><td align="center" ${dk()}>
        <p style="margin:0;font-size:48px;line-height:1;color:#aaffa0;">&#10003;</p>
        <h1 style="margin:18px 0 10px;color:#ffffff;font-size:28px;font-weight:700;">Great session, ${esc(name)}.</h1>
        <p style="margin:0 auto;max-width:420px;color:#888888;font-size:16px;line-height:1.6;">You showed up. You logged. That's what separates serious traders.</p>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${dk('margin-top:24px;')}>
      <tr>${statCard('Trades Today', String(stats.trades ?? 0))}${statCard("Today's P&amp;L", usd(stats.pnl), (stats.pnl ?? 0) >= 0 ? '#aaffa0' : '#ff8080')}</tr>
      <tr>${statCard('Win Rate', `${stats.winRate ?? 0}%`)}${statCard('Best Trade', stats.bestTrade != null ? usd(stats.bestTrade) : '—', '#aaffa0')}</tr>
    </table>
    ${accentCard('#aaffa0', `<p style="margin:0;color:#cde8c6;font-size:15px;line-height:1.65;font-style:italic;">"Every trade logged is data. Every data point builds your edge. Keep going."</p>`)}
    ${ctaButton('View Your Dashboard →', APP_URL)}`
  return { subject: `You showed up today, ${name} ✓`, html: page(inner) }
}

// ── Template 4 — dailyNoJournalEmail(user) ────────────────────────────────────
export function dailyNoJournalEmail(user = {}) {
  const name = user.first_name || 'trader'
  const step = (n, t) => `<tr><td ${dk('padding:7px 0;')}>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" ${dk()}>
      <tr>
        <td width="26" height="26" align="center" valign="middle" ${cd('border:1px solid #1f1f1f;border-radius:50%;color:#aaffa0;font-size:12px;font-weight:700;line-height:26px;')}>${n}</td>
        <td valign="middle" ${dk('padding-left:14px;color:#dddddd;font-size:15px;')}>${esc(t)}</td>
      </tr>
    </table>
  </td></tr>`
  const inner = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${dk()}>
      <tr><td align="center" ${dk()}>
        <p style="margin:0;font-size:44px;line-height:1;">&#128197;</p>
        <h1 style="margin:16px 0 10px;color:#ffffff;font-size:28px;font-weight:700;">Did you trade today, ${esc(name)}?</h1>
        <p style="margin:0 auto;max-width:440px;color:#888888;font-size:16px;line-height:1.6;">Unlogged trades are missed lessons. Your edge lives in the data.</p>
      </td></tr>
    </table>
    ${accentCard('#f59e0b', `<p style="margin:0;color:#e0b877;font-size:15px;line-height:1.6;">Every session you don't review is a session you can't learn from.</p>`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${dk('margin-top:22px;')}>
      ${step('1', 'Open your journal')}
      ${step('2', 'Log what happened')}
      ${step('3', 'Review and move on')}
    </table>
    ${ctaButton("Log Today's Trades →", APP_URL)}
    ${accentCard('#444444', `
      <p style="margin:0 0 6px;color:#ffffff;font-size:15px;font-weight:700;">Didn't trade today? Good.</p>
      <p style="margin:0;color:#888888;font-size:14px;line-height:1.7;">Not every day has a valid setup. Protecting capital IS trading well.</p>`)}`
  return { subject: `Don't let today slip away, ${name}`, html: page(inner) }
}

// ── Weekly (shared body for templates 5 & 6) ──────────────────────────────────
// stats = { pnl, winRate, trades, avgRR, bestTrade, wins, losses, mostTraded, dateRange }
function weeklyBody(name, stats, variant) {
  const pnl = stats.pnl ?? 0
  const pnlColor = pnl >= 0 ? '#aaffa0' : '#ff8080'
  const accent = variant === 'loss' ? '#ef4444' : '#aaffa0'
  const message = variant === 'loss'
    ? 'Tough week. Review your losses honestly — the data will show you why. Protect capital, then reset for Monday.'
    : 'Profitable week. The process is working. Keep executing with discipline.'
  const inner = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${dk()}>
      <tr><td align="center" ${dk()}>
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.22em;color:#aaffa0;text-transform:uppercase;">Week in Review</p>
        <p style="margin:8px 0 0;color:#888888;font-size:14px;">${esc(stats.dateRange || '')}</p>
        <h1 style="margin:14px 0 0;color:#ffffff;font-size:28px;font-weight:700;">Here's how your week looked, ${esc(name)}.</h1>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${dk('margin-top:24px;')}>
      <tr>${statCard('Net P&amp;L', usd(pnl), pnlColor)}${statCard('Win Rate', `${stats.winRate ?? 0}%`)}</tr>
      <tr>${statCard('Total Trades', String(stats.trades ?? 0))}${statCard('Avg R:R', stats.avgRR ? Number(stats.avgRR).toFixed(1) : '—')}</tr>
      <tr>${statCard('Best Trade', stats.bestTrade != null ? usd(stats.bestTrade) : '—', '#aaffa0')}${statCard('Most Traded', stats.mostTraded || '—')}</tr>
    </table>
    ${accentCard(accent, `<p style="margin:0;color:${accent};font-size:15px;font-weight:600;line-height:1.6;">${esc(message)}</p>`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${dk('margin-top:14px;')}>
      <tr>
        <td align="center" ${cd('border:1px solid #1f1f1f;border-radius:8px;padding:16px;color:#888888;font-size:13px;line-height:1.7;')}>
          Wins: <b style="color:#aaffa0;">${stats.wins ?? 0}</b> · Losses: <b style="color:#ff8080;">${stats.losses ?? 0}</b> · Most Traded: <b style="color:#ffffff;">${esc(stats.mostTraded || '—')}</b>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${dk('margin-top:24px;')}>
      <tr>
        <td align="center" ${dk('color:#888888;font-size:14px;line-height:1.8;')}>
          Stay focused on process.<br>One valid setup at a time.<br><span style="color:#aaffa0;">See you next week.</span>
        </td>
      </tr>
    </table>
    ${ctaButton('Review Full Performance →', APP_URL)}`
  return page(inner)
}

// ── Template 5 — weeklyProfitableEmail(user, stats) ───────────────────────────
export function weeklyProfitableEmail(user = {}, stats = {}) {
  const name = user.first_name || 'trader'
  const subject = `Your week in review, ${name} — ${stats.dateRange || ''}`.trim().replace(/—\s*$/, '').trim()
  return { subject, html: weeklyBody(name, stats, 'profit') }
}

// ── Template 6 — weeklyLosingEmail(user, stats) ───────────────────────────────
export function weeklyLosingEmail(user = {}, stats = {}) {
  const name = user.first_name || 'trader'
  return { subject: `Tough week — let's review, ${name}`, html: weeklyBody(name, stats, 'loss') }
}
