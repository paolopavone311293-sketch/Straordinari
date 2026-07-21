const CACHE_NAME = 'straordinari-v6';
const ASSETS = [
  './',
  './app.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {
        // Se alcuni asset non vengono cachati, continua comunque
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Network-first: prova sempre la rete, usa la cache come fallback offline.
  // Così gli aggiornamenti dell'app arrivano subito senza cache bloccata.
  event.respondWith(
    fetch(event.request).then(fetchResponse => {
      return caches.open(CACHE_NAME).then(cache => {
        cache.put(event.request, fetchResponse.clone());
        return fetchResponse;
      });
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});
