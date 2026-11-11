// Time zone for the app's clock. "auto" follows the device; a trader can pick one in Account.
import React from 'react'

const KEY = 'ltj_tz'
export const ZONES = [
  ['auto', 'Automatic (this device)'],
  ['America/New_York', 'New York (ET)'], ['America/Chicago', 'Chicago (CT)'], ['America/Denver', 'Denver (MT)'], ['America/Los_Angeles', 'Los Angeles (PT)'],
  ['America/Aruba', 'Aruba / Caribbean (AST)'], ['America/Sao_Paulo', 'São Paulo'], ['America/Toronto', 'Toronto (ET)'],
  ['Europe/London', 'London'], ['Europe/Berlin', 'Berlin / Paris / Amsterdam'], ['Europe/Istanbul', 'Istanbul'], ['Africa/Lagos', 'Lagos'], ['Africa/Johannesburg', 'Johannesburg'],
  ['Asia/Dubai', 'Dubai'], ['Asia/Kolkata', 'India'], ['Asia/Singapore', 'Singapore'], ['Asia/Hong_Kong', 'Hong Kong'], ['Asia/Tokyo', 'Tokyo'], ['Asia/Seoul', 'Seoul'],
  ['Australia/Sydney', 'Sydney'], ['Pacific/Auckland', 'Auckland'],
]
const read = () => { try { return localStorage.getItem(KEY) || 'auto' } catch { return 'auto' } }
let current = read()
const subs = new Set()
export const setTz = (z) => { current = z; try { localStorage.setItem(KEY, z) } catch { /* ignore */ } subs.forEach((f) => f()) }
export const useTzSetting = () => React.useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => current)
export const tzName = (z) => (z && z !== 'auto' ? z : undefined)
export const tzAbbr = (z, d = new Date()) => {
  try { return new Intl.DateTimeFormat('en-US', { timeZone: tzName(z), timeZoneName: 'short' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value || '' } catch { return '' }
}
export const tzHour = (z, d = new Date()) => {
  try { return +new Intl.DateTimeFormat('en-US', { timeZone: tzName(z), hour: '2-digit', hourCycle: 'h23' }).format(d) % 24 } catch { return d.getHours() }
}
