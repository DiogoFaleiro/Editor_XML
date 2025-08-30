self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('pwa-cache').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/style.css',
        '/script.js',
        '/assets/favicon-192.png',  // Verifique o caminho do arquivo
        '/assets/favicon-512.png',  // Verifique o caminho do arquivo
        '/assets/logo.png'          // Verifique o caminho do arquivo
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});