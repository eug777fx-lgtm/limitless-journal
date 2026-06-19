/* LIMITLESS service worker — minimal app-shell cache for installability + offline shell.
   Network-first: always try the network, fall back to cache only when offline. */
const CACHE = 'limitless-v1'
const SHELL = ['/', '/index.html', '/manifest.json', '/LIMITLESS LOGO FAVICON.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  // Only handle same-origin GETs; let API / Supabase / cross-origin pass straight through.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  if (request.url.includes('/api/')) return

  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
        return res
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match('/index.html'))),
  )
})
