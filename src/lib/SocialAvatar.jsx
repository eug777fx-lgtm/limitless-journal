// Purple-accent avatar used by the Network layer and by App.jsx's header.
// Kept in its own file so the always-loaded shell can import it without
// dragging NetworkSocial.jsx into the first-load bundle (and so Fast Refresh
// stays happy: components-only module).
import { ACCENT } from './networkShared.js'

export function SocialAvatar({ name, url, size = 36 }) {
  const initials = (name || 'U').split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase()
  if (url) return <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${ACCENT}44`, flexShrink: 0 }} />
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `${ACCENT}18`, border: `1px solid ${ACCENT}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.34, fontWeight: 700, color: '#f4f4f5', flexShrink: 0 }}>{initials}</div>
  )
}
