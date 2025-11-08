// Immediately unregister if on localhost (development)
const isDevelopment = self.location.hostname === 'localhost' || 
                      self.location.hostname === '127.0.0.1' ||
                      self.location.hostname === '[::1]' ||
                      self.location.protocol === 'http:';

if (isDevelopment) {
  // Unregister immediately
  self.registration?.unregister();
  
  // Skip waiting and claim clients immediately
  self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
  });
  
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      self.clients.claim().then(() => {
        // Unregister after claiming clients
        return self.registration.unregister();
      })
    );
  });
  
  // Completely bypass all fetch requests in dev - don't intercept anything
  // By not calling event.respondWith(), the browser handles the request normally
  self.addEventListener('fetch', (event) => {
    // Check if this is a Vite dev server request or any localhost request
    const url = new URL(event.request.url);
    if (url.hostname === 'localhost' || 
        url.hostname === '127.0.0.1' || 
        url.hostname === '[::1]' ||
        url.pathname.startsWith('/@') ||
        url.pathname.startsWith('/src/') ||
        url.pathname.includes('vite') ||
        url.pathname.includes('react-refresh')) {
      // Don't intercept - let the browser handle it normally
      // Do NOT call event.respondWith() - this allows normal browser fetch
      return;
    }
    // For other requests, also don't intercept in dev
  });
  
  // Exit early - don't run production code
} else {
  // Production code below
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
}
