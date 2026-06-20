// Shared email templates — single source of truth for every LIMITLESS email.
// Imported by api/notify-signup.js, api/daily-email.js, api/weekly-email.js and
// api/test-emails.js. Premium dark design, table-based, 100% inline styles +
// bgcolor attributes so dark backgrounds render in every client.
//
// The logo is loaded from the hosted URL so it renders correctly in Gmail,
// Apple Mail and every other email client (data: URIs are blocked by Gmail).

const logoUrl = 'https://limitless-journal.com/logo2.png'

const APP_URL = 'https://app.limitless-journal.com'
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"

const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))
const usd = (n) => { const v = Math.round(Number(n) || 0); return `${v >= 0 ? '+' : '−'}$${Math.abs(v).toLocaleString()}` }
const pnlColor = (n) => (Number(n) >= 0 ? '#aaffa0' : '#ff8080')

// ── Shared shell ──────────────────────────────────────────────────────────────
// `content` is the middle <tr>…</tr> block(s) that sit between header and footer.
function shell(content) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style type="text/css">
body { background-color:#000000 !important; margin:0 !important; padding:0 !important; }
.bg-black { background-color:#000000 !important; }
.bg-dark { background-color:#0d0d0d !important; }
.bg-card { background-color:#111111 !important; }
@media screen and (max-width:600px) {
  body { background-color:#000000 !important; }
  .wrapper { width:100% !important; border-radius:0 !important; }
  .content-pad { padding:24px 16px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#000000 !important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;font-family:${FONT};" bgcolor="#000000">
<table class="bg-black" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#000000" style="background-color:#000000 !important;">
<tr><td align="center" bgcolor="#000000" style="background-color:#000000 !important;padding:40px 20px;">
<table class="bg-dark wrapper" border="0" cellpadding="0" cellspacing="0" width="580" bgcolor="#0d0d0d" style="background-color:#0d0d0d !important;border:1px solid #1a1a1a;border-radius:16px;overflow:hidden;">

<!-- HEADER -->
<tr><td align="center" bgcolor="#000000" style="background-color:#000000 !important;padding:32px 40px 24px;border-bottom:1px solid #1a1a1a;">
<img src="${logoUrl}" width="40" height="40" style="display:block;margin:0 auto 12px;border:0;" alt="LIMITLESS"/>
<p style="margin:0;font-size:11px;font-weight:700;color:#ffffff;letter-spacing:0.25em;font-family:${FONT};">LIMITLESS</p>
<p style="margin:4px 0 0;font-size:10px;color:#444444;letter-spacing:0.1em;font-family:${FONT};">TRADING JOURNAL</p>
</td></tr>

${content}

<!-- FOOTER -->
<tr><td align="center" bgcolor="#000000" style="background-color:#000000 !important;padding:24px 40px;border-top:1px solid #1a1a1a;">
<p style="margin:0 0 6px;font-size:11px;color:#444444;font-family:${FONT};">LIMITLESS Trading Journal</p>
<a href="https://limitless-journal.com" style="font-size:11px;color:#aaffa0;text-decoration:none;font-family:${FONT};">limitless-journal.com</a>
<p style="margin:10px 0 0;font-size:10px;color:#333333;font-family:${FONT};">You're receiving this as a LIMITLESS member.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

// ── Building blocks (table-based, bgcolor on every coloured cell) ─────────────
const statCard = (label, value, color) => `<td width="48%" align="center" class="bg-card" bgcolor="#111111" style="background-color:#111111 !important;border:1px solid #1f1f1f;border-radius:8px;padding:18px 12px;">
<p style="margin:0 0 6px;font-size:10px;font-weight:600;color:#666666;letter-spacing:0.1em;text-transform:uppercase;font-family:${FONT};">${label}</p>
<p style="margin:0;font-size:22px;font-weight:700;color:${color};font-family:${FONT};">${value}</p>
</td>`

const statRow = (a, b) => `<tr>${a}<td width="4%"></td>${b}</tr>`
const gridGap = `<tr><td colspan="3" height="12" style="height:12px;line-height:12px;font-size:0;">&nbsp;</td></tr>`

const accentCard = (border, textColor, text) => `<table border="0" cellpadding="0" cellspacing="0" width="100%" class="bg-card" bgcolor="#111111" style="background-color:#111111 !important;border:1px solid #1f1f1f;border-left:3px solid ${border};border-radius:8px;margin-bottom:24px;">
<tr><td style="padding:18px 22px;">
<p style="margin:0;font-size:14px;color:${textColor};line-height:1.6;font-style:italic;font-family:${FONT};">${text}</p>
</td></tr>
</table>`

const ctaButton = (label, href, bg = '#ffffff', color = '#000000') => `<table border="0" cellpadding="0" cellspacing="0" width="100%">
<tr><td align="center" bgcolor="${bg}" style="background-color:${bg} !important;border-radius:8px;padding:16px 32px;">
<a href="${href}" style="color:${color};font-size:14px;font-weight:700;text-decoration:none;font-family:${FONT};">${label}</a>
</td></tr>
</table>`

const stepRow = (n, text, last) => `<tr><td style="padding:9px 0;${last ? '' : 'border-bottom:1px solid #1a1a1a;'}">
<table border="0" cellpadding="0" cellspacing="0"><tr>
<td width="24" height="24" align="center" valign="middle" bgcolor="#1a1a1a" style="background-color:#1a1a1a !important;border-radius:12px;"><span style="color:#aaffa0;font-size:11px;font-weight:700;font-family:${FONT};">${n}</span></td>
<td style="padding-left:12px;"><span style="color:#888888;font-size:13px;font-family:${FONT};">${esc(text)}</span></td>
</tr></table>
</td></tr>`

const kvRow = (k, v, last) => `<tr>
<td style="padding:10px 0;${last ? '' : 'border-bottom:1px solid #1a1a1a;'}"><span style="color:#666666;font-size:12px;font-family:${FONT};">${esc(k)}</span></td>
<td align="right" style="padding:10px 0;${last ? '' : 'border-bottom:1px solid #1a1a1a;'}"><span style="color:#cccccc;font-size:12px;font-weight:600;font-family:${FONT};">${v}</span></td>
</tr>`

// ── Template 1 — signupNotification(user) → admin ─────────────────────────────
function signupNotification(user = {}) {
  const subject = `New signup — ${user.first_name || 'Someone'} needs approval`
  const content = `<tr><td class="content-pad" bgcolor="#0d0d0d" style="background-color:#0d0d0d !important;padding:36px 40px;">
<p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;font-family:${FONT};">New trader signup</p>
<p style="margin:0 0 24px;font-size:14px;color:#666666;line-height:1.6;font-family:${FONT};">Someone just applied for early access and needs your approval.</p>
<table border="0" cellpadding="0" cellspacing="0" width="100%" class="bg-card" bgcolor="#111111" style="background-color:#111111 !important;border:1px solid #1f1f1f;border-radius:8px;">
<tr><td style="padding:20px 24px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:8px 0;border-bottom:1px solid #1a1a1a;"><span style="color:#555555;font-size:12px;font-family:${FONT};">Name</span></td><td align="right" style="padding:8px 0;border-bottom:1px solid #1a1a1a;"><span style="color:#cccccc;font-size:12px;font-family:${FONT};">${esc([user.first_name, user.last_name].filter(Boolean).join(' ') || '—')}</span></td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #1a1a1a;"><span style="color:#555555;font-size:12px;font-family:${FONT};">Email</span></td><td align="right" style="padding:8px 0;border-bottom:1px solid #1a1a1a;"><span style="color:#cccccc;font-size:12px;font-family:${FONT};">${esc(user.email || '—')}</span></td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #1a1a1a;"><span style="color:#555555;font-size:12px;font-family:${FONT};">Phone</span></td><td align="right" style="padding:8px 0;border-bottom:1px solid #1a1a1a;"><span style="color:#cccccc;font-size:12px;font-family:${FONT};">${esc(user.phone || '—')}</span></td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #1a1a1a;"><span style="color:#555555;font-size:12px;font-family:${FONT};">Market focus</span></td><td align="right" style="padding:8px 0;border-bottom:1px solid #1a1a1a;"><span style="color:#cccccc;font-size:12px;font-family:${FONT};">${esc(user.market_focus || '—')}</span></td></tr>
<tr><td style="padding:8px 0;"><span style="color:#555555;font-size:12px;font-family:${FONT};">Signed up</span></td><td align="right" style="padding:8px 0;"><span style="color:#cccccc;font-size:12px;font-family:${FONT};">${esc(user.when || new Date().toLocaleString())}</span></td></tr>
</table>
</td></tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;">
<tr><td align="center" bgcolor="#aaffa0" style="background-color:#aaffa0 !important;border-radius:8px;padding:16px 32px;">
<a href="${APP_URL}" style="color:#000000;font-size:14px;font-weight:700;text-decoration:none;font-family:${FONT};">Open Admin Panel →</a>
</td></tr>
</table>
</td></tr>`
  return { subject, html: shell(content) }
}

// ── Template 2 — approvedEmail(user) → newly approved user ────────────────────
function approvedEmail(user = {}) {
  const name = user.first_name || 'trader'
  const subject = `You're in, ${name}. Welcome to LIMITLESS.`
  const feature = (glyph, label) => `<td width="33%" align="center" class="bg-card" bgcolor="#111111" style="background-color:#111111 !important;border:1px solid #1f1f1f;border-radius:8px;padding:16px 12px;">
<p style="margin:0 0 6px;font-size:18px;color:#aaffa0;font-family:${FONT};">${glyph}</p>
<p style="margin:0;font-size:11px;color:#888888;font-family:${FONT};">${label}</p>
</td>`
  const content = `<tr><td class="content-pad" bgcolor="#0d0d0d" style="background-color:#0d0d0d !important;padding:36px 40px;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
<tr><td align="center">
<span style="background-color:#0a1f0a !important;border:1px solid #1a3a1a;border-radius:20px;padding:6px 16px;color:#aaffa0;font-size:12px;font-weight:600;font-family:${FONT};">✓ Approved</span>
</td></tr>
</table>
<p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;font-family:${FONT};">You're in, ${esc(name)}.</p>
<p style="margin:0 0 24px;font-size:14px;color:#666666;line-height:1.6;font-family:${FONT};">Your account is ready. Start journaling your trades and building your edge today.</p>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
<tr>
${feature('▸', 'Track every trade')}
<td width="4%"></td>
${feature('◈', 'Analyze performance')}
<td width="4%"></td>
${feature('◎', 'Build consistency')}
</tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" width="100%" class="bg-card" bgcolor="#111111" style="background-color:#111111 !important;border:1px solid #1f1f1f;border-radius:8px;margin-bottom:24px;">
<tr><td style="padding:20px 24px;">
<p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#888888;letter-spacing:0.1em;text-transform:uppercase;font-family:${FONT};">What to do next</p>
<table width="100%" cellpadding="0" cellspacing="0">
${stepRow('1', 'Log your first trade')}
${stepRow('2', 'Set your monthly goal in settings')}
${stepRow('3', 'Review your performance weekly', true)}
</table>
</td></tr>
</table>
${ctaButton('Go to your dashboard →', APP_URL)}
<p style="text-align:center;margin:10px 0 0;font-size:12px;color:#aaffa0;font-family:${FONT};">app.limitless-journal.com</p>
</td></tr>`
  return { subject, html: shell(content) }
}

// ── Template 3 — dailyJournaledEmail(user, stats) ─────────────────────────────
// stats = { trades, pnl, winRate, bestTrade }
function dailyJournaledEmail(user = {}, stats = {}) {
  const name = user.first_name || 'trader'
  const subject = `You showed up today, ${name} ✓`
  const content = `<tr><td class="content-pad" bgcolor="#0d0d0d" style="background-color:#0d0d0d !important;padding:36px 40px;">
<table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
<table border="0" cellpadding="0" cellspacing="0"><tr>
<td width="64" height="64" align="center" valign="middle" bgcolor="#0a1f0a" style="background-color:#0a1f0a !important;border:1px solid #1a3a1a;border-radius:32px;"><span style="font-size:30px;color:#aaffa0;line-height:64px;font-family:${FONT};">✓</span></td>
</tr></table>
</td></tr></table>
<p style="margin:20px 0 8px;font-size:24px;font-weight:700;color:#ffffff;text-align:center;font-family:${FONT};">Great session, ${esc(name)}.</p>
<p style="margin:0 0 28px;font-size:14px;color:#666666;line-height:1.6;text-align:center;font-family:${FONT};">You showed up. You logged your trades. That's the discipline that compounds.</p>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
${statRow(statCard('Trades', String(stats.trades ?? 0), '#ffffff'), statCard("Today's P&L", usd(stats.pnl), pnlColor(stats.pnl)))}
${gridGap}
${statRow(statCard('Win Rate', `${stats.winRate ?? 0}%`, '#ffffff'), statCard('Best Trade', stats.bestTrade != null ? usd(stats.bestTrade) : '—', '#aaffa0'))}
</table>
${accentCard('#aaffa0', '#aaffa0', '"Every trade logged is data. Every data point sharpens your edge. Keep going."')}
${ctaButton('View your dashboard →', APP_URL)}
</td></tr>`
  return { subject, html: shell(content) }
}

// ── Template 4 — dailyNoJournalEmail(user) ────────────────────────────────────
function dailyNoJournalEmail(user = {}) {
  const name = user.first_name || 'trader'
  const subject = `Don't let today slip away, ${name}`
  const content = `<tr><td class="content-pad" bgcolor="#0d0d0d" style="background-color:#0d0d0d !important;padding:36px 40px;">
<p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;font-family:${FONT};">Did you trade today, ${esc(name)}?</p>
<p style="margin:0 0 24px;font-size:14px;color:#666666;line-height:1.6;font-family:${FONT};">Unlogged trades are missed lessons. Your edge lives in the data you capture.</p>
${accentCard('#f59e0b', '#e0b877', "Every session you don't review is a session you can't learn from.")}
<table border="0" cellpadding="0" cellspacing="0" width="100%" class="bg-card" bgcolor="#111111" style="background-color:#111111 !important;border:1px solid #1f1f1f;border-radius:8px;margin-bottom:24px;">
<tr><td style="padding:20px 24px;">
<p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#888888;letter-spacing:0.1em;text-transform:uppercase;font-family:${FONT};">Two minutes is all it takes</p>
<table width="100%" cellpadding="0" cellspacing="0">
${stepRow('1', 'Open your journal')}
${stepRow('2', 'Log what happened')}
${stepRow('3', 'Review and move on', true)}
</table>
</td></tr>
</table>
${ctaButton("Log today's trades →", APP_URL)}
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;"><tr><td height="1" bgcolor="#1a1a1a" style="background-color:#1a1a1a !important;height:1px;line-height:1px;font-size:0;">&nbsp;</td></tr></table>
<table border="0" cellpadding="0" cellspacing="0" width="100%" class="bg-card" bgcolor="#111111" style="background-color:#111111 !important;border:1px solid #1f1f1f;border-radius:8px;">
<tr><td style="padding:20px 24px;">
<p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#ffffff;font-family:${FONT};">Didn't trade today? Good.</p>
<p style="margin:0;font-size:13px;color:#888888;line-height:1.7;font-family:${FONT};">Not every day has a valid setup. Protecting capital is trading well.</p>
</td></tr>
</table>
</td></tr>`
  return { subject, html: shell(content) }
}

// ── Weekly (shared body for templates 5 & 6) ──────────────────────────────────
// stats = { pnl, winRate, trades, avgRR, bestTrade, wins, losses, mostTraded, dateRange }
function weeklyBody(user, stats, variant) {
  const name = user.first_name || 'trader'
  const accent = variant === 'loss' ? '#ff8080' : '#aaffa0'
  const message = variant === 'loss'
    ? 'Tough week. Review your losses honestly — the data will show you why. Protect capital, then reset for Monday.'
    : 'Profitable week. The process is working. Keep executing with discipline.'
  return `<tr><td class="content-pad" bgcolor="#0d0d0d" style="background-color:#0d0d0d !important;padding:36px 40px;">
<p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#aaffa0;letter-spacing:0.22em;text-transform:uppercase;text-align:center;font-family:${FONT};">Week in Review</p>
<p style="margin:0 0 4px;font-size:13px;color:#666666;text-align:center;font-family:${FONT};">${esc(stats.dateRange || '')}</p>
<p style="margin:8px 0 28px;font-size:24px;font-weight:700;color:#ffffff;text-align:center;font-family:${FONT};">Here's how your week looked, ${esc(name)}.</p>
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
${statRow(statCard('Net P&L', usd(stats.pnl), pnlColor(stats.pnl)), statCard('Win Rate', `${stats.winRate ?? 0}%`, '#ffffff'))}
${gridGap}
${statRow(statCard('Trades', String(stats.trades ?? 0), '#ffffff'), statCard('Avg R:R', stats.avgRR ? Number(stats.avgRR).toFixed(1) : '—', '#ffffff'))}
</table>
${accentCard(accent, accent, message)}
<table border="0" cellpadding="0" cellspacing="0" width="100%" class="bg-card" bgcolor="#111111" style="background-color:#111111 !important;border:1px solid #1f1f1f;border-radius:8px;margin-bottom:24px;">
<tr><td style="padding:8px 24px;">
<table width="100%" cellpadding="0" cellspacing="0">
${kvRow('Best trade', stats.bestTrade != null ? usd(stats.bestTrade) : '—')}
${kvRow('Wins / Losses', `<span style="color:#aaffa0;">${stats.wins ?? 0}W</span> · <span style="color:#ff8080;">${stats.losses ?? 0}L</span>`)}
${kvRow('Most traded', esc(stats.mostTraded || '—'), true)}
</table>
</td></tr>
</table>
${ctaButton('Review full performance →', APP_URL)}
</td></tr>`
}

// ── Template 5 — weeklyProfitableEmail(user, stats) ───────────────────────────
function weeklyProfitableEmail(user = {}, stats = {}) {
  const name = user.first_name || 'trader'
  const subject = `Your week in review, ${name} — ${stats.dateRange || ''}`.trim().replace(/—\s*$/, '').trim()
  return { subject, html: shell(weeklyBody(user, stats, 'profit')) }
}

// ── Template 6 — weeklyLosingEmail(user, stats) ───────────────────────────────
function weeklyLosingEmail(user = {}, stats = {}) {
  const name = user.first_name || 'trader'
  const subject = `Tough week — let's review, ${name}`
  return { subject, html: shell(weeklyBody(user, stats, 'loss')) }
}

export {
  signupNotification,
  approvedEmail,
  dailyJournaledEmail,
  dailyNoJournalEmail,
  weeklyProfitableEmail,
  weeklyLosingEmail,
}
