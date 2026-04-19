// Service worker for Weight Ledger.
// Bump CACHE_VERSION on every release to invalidate old caches.
const CACHE_VERSION = 'v10';
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

// Install: pre-cache the app shell. skipWaiting makes the new worker
// take over immediately on next navigation, without waiting for all
// clients to close.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches and take control of all open pages.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Fetch strategy:
//   - Anthropic API: always network, never cache.
//   - service-worker.js itself: NEVER intercept (let browser's update check see fresh bytes).
//   - Navigation / index.html: network-first (fall back to cache if offline).
//     This ensures users always get the latest HTML when online, which matters
//     because index.html pins which version of everything else to load.
//   - CDN libs (React, Recharts, OpenCV, fonts): stale-while-revalidate.
//   - Everything else in app shell (icons, manifest): cache-first.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API calls.
  if (url.hostname === 'api.anthropic.com') {
    return;
  }

  // Never intercept the service worker file itself — the browser needs
  // to see fresh bytes to detect an update.
  if (url.pathname.endsWith('/service-worker.js')) {
    return;
  }

  // Navigation requests: network-first, fall back to cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
        }
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Same-origin index.html fetched directly: also network-first.
  if (url.origin === self.location.origin && url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // CDN libraries: stale-while-revalidate.
  if (url.hostname === 'esm.sh' ||
      url.hostname === 'cdn.jsdelivr.net' ||
      url.hostname === 'unpkg.com' ||
      url.hostname === 'docs.opencv.org' ||
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
          }).catch(() => cached);
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
