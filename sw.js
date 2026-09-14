const CACHE_VERSION = 'achilles-os-v10-9';
const APP_SHELL = ['./', './index.html', './IMG_9302.jpeg', './manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    for (const url of APP_SHELL) {
      try { await cache.add(url); } catch (_) {}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith('achilles-os-') && key !== CACHE_VERSION)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request, { cache: 'no-store' });
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_VERSION);
          cache.put('./index.html', fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch (_) {
        return (
          (await caches.match(request)) ||
          (await caches.match('./index.html')) ||
          (await caches.match('./'))
        );
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);

    if (cached) {
      event.waitUntil(
        fetch(request, { cache: 'no-store' })
          .then(async response => {
            if (response && response.ok) {
              const cache = await caches.open(CACHE_VERSION);
              await cache.put(request, response.clone());
            }
          })
          .catch(() => {})
      );
      return cached;
    }

    try {
      const response = await fetch(request, { cache: 'no-store' });
      if (response && response.ok) {
        const cache = await caches.open(CACHE_VERSION);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (_) {
      return Response.error();
    }
  })());
});
