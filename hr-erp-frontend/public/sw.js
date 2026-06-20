/**
 * Service worker: never cache hashed bundles; network-first for all SPA pages.
 * (Cache-first on /login used to serve stale shells after deploy.)
 */
const CACHE_NAME = 'hr-erp-shell-v5';

function isSpaNavigation(request, url) {
  if (request.mode === 'navigate') {
    return true;
  }
  if (url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    return true;
  }
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/static/')) {
    return false;
  }
  // App routes like /login, /employee, /admin — no file extension
  return !/\.[a-z0-9]+$/i.test(url.pathname);
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/manifest.json', '/favicon.ico']).catch(() => {})
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return undefined;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (url.pathname.startsWith('/static/js/') || url.pathname.startsWith('/static/css/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isSpaNavigation(event.request, url)) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then((response) => {
        if (
          !response ||
          response.status !== 200 ||
          response.type !== 'basic' ||
          url.pathname.match(/\.(js|css|html)$/i)
        ) {
          return response;
        }
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
