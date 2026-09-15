/* =========================================================================
   ثمر — Service Worker (v3 — network-first for HTML, cache-first for assets)
   =========================================================================
   v3 fixes the "stale UI" problem:
   - Navigation requests (HTML pages) → network-first, fall back to cache
     so users always get the latest UI on refresh, but can still use the
     app offline.
   - Static assets (JS chunks, CSS, fonts, icons) → cache-first (they have
     hashed filenames so they're safe to cache forever).
   - Bumping CACHE_NAME to v3 automatically invalidates the old v2 cache.
   ========================================================================= */

const CACHE_NAME = 'thamar-v4';
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/favicon-16x16.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon.ico',
  '/icons/android-chrome-192x192.png',
  '/icons/android-chrome-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon.webp',
  '/icons/thamar.webp',
  '/icons/spring.webp',
  '/icons/summer.webp',
  '/icons/autumn.webp',
  '/icons/winter.webp',
  '/fonts/Vazirmatn-Light.woff2',
  '/fonts/Vazirmatn-Regular.woff2',
  '/fonts/Vazirmatn-Medium.woff2',
  '/fonts/Vazirmatn-SemiBold.woff2',
  '/fonts/Vazirmatn-Bold.woff2',
  '/fonts/Vazirmatn-ExtraBold.woff2',
];

// Install — precache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // If any precache fails, continue anyway — assets will be
        // cached on-demand during fetch.
      });
    })
  );
  // Force the new SW to take over immediately, even if an old SW is active.
  self.skipWaiting();
});

// Activate — clean up ALL old caches (any cache that isn't the current version)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Take control of all open clients immediately.
      return self.clients.claim();
    })
  );
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension requests
  if (request.url.startsWith('chrome-extension://')) return;

  const isSameOrigin = request.url.startsWith(self.location.origin);
  if (!isSameOrigin) return; // let cross-origin requests pass through

  // ----- Navigation requests (HTML pages) → network-first -----
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh HTML for next time
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline — return cached HTML (or root as fallback)
          return caches.match(request).then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // ----- Static assets → cache-first (hashed filenames are safe) -----
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Update cache in background (stale-while-revalidate)
        fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
        }).catch(() => {});
        return cached;
      }
      // Not in cache — fetch and cache
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
