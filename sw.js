// Shikkha Salesman v3 Live — Offline-first app shell, no client data stored in this cache.
const CACHE_VERSION = 'ashik-shikkha-salesman-v3-live-2026-10-19-r1';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './tailwind-v3-offline.css', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ashik-shikkha-salesman-') && key !== CACHE_VERSION).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    if (req.mode === 'navigate') {
      try {
        const response = await fetch(req);
        if (response.ok) await cache.put('./index.html', response.clone());
        return response;
      } catch (_) {
        return (await cache.match('./index.html')) || Response.error();
      }
    }
    const cached = await cache.match(req, {ignoreSearch:true});
    if (cached) return cached;
    try {
      const response = await fetch(req);
      if (response.ok) await cache.put(req, response.clone());
      return response;
    } catch (_) { return Response.error(); }
  })());
});