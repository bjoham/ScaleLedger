// Service worker for Weight Ledger
// Bump CACHE_VERSION to force all clients to refresh cached files.
const CACHE_VERSION = 'v4';
const CACHE_NAME = `ledger-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon.png',
];

// Install: pre-cache the app shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Fetch strategy:
//   - API calls to Anthropic: always network (never cache).
//   - App shell and static assets: cache-first, fall back to network.
//   - CDN scripts (React, Recharts, Lucide, Babel): stale-while-revalidate.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API calls.
  if (url.hostname === 'api.anthropic.com') {
    return; // let the browser handle it normally
  }

  // For navigation requests, try cache first, fall back to network.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) =>
        cached || fetch(request)
      )
    );
    return;
  }

  // For CDN scripts, stale-while-revalidate.
  if (url.hostname === 'esm.sh' ||
      url.hostname === 'cdn.jsdelivr.net' ||
      url.hostname === 'unpkg.com' ||
      url.hostname === 'fonts.googleapis.com' ||
      url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request).then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => cached); // offline? use cache.
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Everything else: cache-first.
  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((response) => {
        if (response && response.status === 200 && request.method === 'GET') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
    )
  );
});
