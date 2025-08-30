self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('pwa-cache').then((cache) => {
      return cache.addAll([
        '/index.html',
        '/style.css',
        '/script.js',
        '/assets/favicon-192.png',
        '/assets/favicon-512.png',
        '/assets/logo.png',
      ]).catch(err => {
        console.error('Erro ao adicionar ao cache:', err);
      });
    })
  );
});