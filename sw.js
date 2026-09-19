const CACHE_VERSION = 'achilles-os-v11-0-0';
const APP_SHELL = [
  "./",
  "./index.html",
  "./app.css",
  "./coach-settings.js",
  "./coach-training.js",
  "./coach-training-ui.js",
  "./coach-engine.js",
  "./coach-cycle.js",
  "./coach-workflow.js",
  "./manifest.webmanifest",
  "./IMG_9302.png",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./foods_ua_10000.js",
  "./foods_ua_extra.js",
  "./foods_ua_market.js",
  "./food-catalog.js",
  "./firebase-sync.js",
  "./platform.js",
  "./legacy-runtime.js",
  "./core-data.js",
  "./training.js",
  "./app-runtime.js",
  "./system-ui.js",
  "./nutrition-reliability.js",
  "./pwa.js",
  "./nutrition-local.js",
  "./food-search.js"
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    for (const url of APP_SHELL) {
      try { await cache.add(new Request(url, { cache: 'reload' })); } catch (error) {
        console.warn('[Achilles SW] precache skipped:', url, error);
      }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('achilles-os-') && key !== CACHE_VERSION)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Always try the newest document first so deployments are visible immediately.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request, { cache: 'no-store' });
        const cache = await caches.open(CACHE_VERSION);
        cache.put('./index.html', fresh.clone()).catch(() => {});
        return fresh;
      } catch (_) {
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }

  // App assets: instant cached response, refresh quietly in the background.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // HTML versions its assets with ?v=. Precached shell keys have no query.
    // Only the current cache may supply this fallback, never an older release.
    const shellAsset = APP_SHELL.some(path => new URL(path, self.location.href).pathname === url.pathname);
    const cached = await cache.match(request, { ignoreSearch: shellAsset });
    if (cached) {
      event.waitUntil(fetch(request, { cache: 'no-cache' })
        .then(async response => {
          if (response?.ok) {
            const cache = await caches.open(CACHE_VERSION);
            await cache.put(request, response.clone());
          }
        })
        .catch(() => {}));
      return cached;
    }

    try {
      const response = await fetch(request);
      if (response?.ok) {
        const cache = await caches.open(CACHE_VERSION);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (_) {
      return Response.error();
    }
  })());
});
