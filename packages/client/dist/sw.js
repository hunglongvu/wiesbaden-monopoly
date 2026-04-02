const CACHE = 'wm-v1';

// Cache app shell on install
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// Network first, fallback to cache for GET requests
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Skip socket.io – always network
  if (e.request.url.includes('/socket.io')) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
