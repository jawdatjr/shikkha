// Ashik Shikkha — Offline-first PWA app shell, not cloud data storage.
const CACHE_VERSION = 'ashik-shikkha-salesman-mobile-receipt-v6-2026-10-17';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './tailwind-offline.css', './icon-192.png', './icon-512.png'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('ashik-shikkha-salesman-') && k !== CACHE_VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(req, {ignoreSearch: true}).then(cached => {
    if (cached) return cached;
    return fetch(req).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
      }
      return response;
    }).catch(() => req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
  }));
});