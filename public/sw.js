/* =========================================================================
   سرچشمه — Service Worker
   =========================================================================
   Caches all app assets for complete offline functionality.
   Strategy:
   - Install: precache core assets (HTML, CSS, JS, fonts, icons)
   - Fetch: cache-first for same-origin, network-first for others
   - Activate: clean up old caches
   ========================================================================= */

const CACHE_NAME = 'sarcheshmeh-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon-32.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon-180.png',
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
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch — cache-first for same-origin, network-first for cross-origin
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension requests
  if (request.url.startsWith('chrome-extension://')) return;

  const isSameOrigin = request.url.startsWith(self.location.origin);

  if (isSameOrigin) {
    // Cache-first for same-origin
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Update cache in background
          fetch(request).then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response.clone());
              });
            }
          }).catch(() => {});
          return cached;
        }
        // Not in cache — fetch and cache
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        }).catch(() => {
          // Offline and not cached — return cached index.html as fallback
          return caches.match('/');
        });
      })
    );
  }
  // For cross-origin requests (e.g., Google Fonts), just try network
  // and don't cache — we've self-hosted everything we need.
});
