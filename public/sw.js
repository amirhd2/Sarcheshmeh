/* =========================================================================
   ثمر — Service Worker (v5 — Full Offline PWA Support)
   =========================================================================
   - Navigation requests (HTML pages) → network-first, fall back to cache
     so users always get the latest UI when online, and work seamlessly offline.
   - Static assets (JS chunks, CSS, fonts, images, icons) → cache-first with
     stale-while-revalidate / cache-on-demand.
   - Pre-caches core app shell, fonts, and icon assets on install.
   ========================================================================= */

const CACHE_NAME = 'thamar-v6';

const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon-32.png',
  '/icons/favicon-16x16.png',
  '/icons/favicon-32x32.png',
  '/icons/android-chrome-192x192.png',
  '/icons/android-chrome-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/apple-touch-icon-180.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png',
  '/icons/icon.png',
  '/icons/thamar.png',
  '/icons/spring.png',
  '/icons/summer.png',
  '/icons/autumn.png',
  '/icons/winter.png',
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
    caches.open(CACHE_NAME).then(async (cache) => {
      // Safe addAll using Promise.allSettled
      await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (response && response.ok) {
              await cache.put(url, response);
            }
          } catch {
            // Ignore individual fetch errors during install
          }
        })
      );
    })
  );
  // Force the new SW to take over immediately
  self.skipWaiting();
});

// Activate — clean up all old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Take control of all open clients immediately
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
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback — return cached page or cached root
          const cached = await caches.match(request);
          if (cached) return cached;
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        })
    );
    return;
  }

  // ----- Static assets → cache-first (stale-while-revalidate) -----
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Update cache in background when online
        fetch(request)
          .then((response) => {
            if (response && response.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
            }
          })
          .catch(() => {});
        return cached;
      }

      // Not in cache — fetch from network and cache
      return fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // If offline and request is an image, try matching any icon fallback
          if (request.destination === 'image') {
            return caches.match('/icons/icon.webp');
          }
          return new Response('', { status: 408, headers: { 'Content-Type': 'text/plain' } });
        });
    })
  );
});
