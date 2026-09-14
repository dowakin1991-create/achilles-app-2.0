const CACHE_NAME = 'achilles-os-v10-13';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './IMG_9302.png',
  './foods_ua_5000.js',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request, {
            cache: 'no-store'
          });

          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', response.clone());

          return response;
        } catch (error) {
          const cached =
            await caches.match(request) ||
            await caches.match('./index.html');

          if (cached) return cached;

          throw error;
        }
      })()
    );

    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);

      if (cached) {
        fetch(request)
          .then(async response => {
            if (!response || !response.ok) return;

            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
          })
          .catch(() => {});

        return cached;
      }

      try {
        const response = await fetch(request);

        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        throw error;
      }
    })()
  );
});
