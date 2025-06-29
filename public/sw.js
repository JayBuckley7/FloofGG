const CACHE_NAME = 'floofgg-cache-v4';
const URLS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/images/ash.png',
  '/images/card_bk.png',
  '/images/cheese.webp',
  '/images/cheese_32.png',
  '/images/churu.png',
  '/images/drain.jpg',
  '/images/elfy300300.png',
  '/images/even_cd.jpg',
  '/images/floof-pfp1.png',
  '/images/floof-pfp2.jpg',
  '/images/floof-pfp3.jpg',
  '/images/floof-pfp4.jpg',
  '/images/fluffy_creature1.jpg',
  '/images/fluffy_creature2.jpg',
  '/images/fox_chatter.gif',
  '/images/newpfp.jpg',
  '/images/nib_cd.jpg',
  '/images/salsa300.png',
  '/images/salsa34.png',
  '/images/salsa42.png',
  '/images/snack.png',
  '/images/time.jpeg',
  '/images/train1.png',
  '/images/train2.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('/assets/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
