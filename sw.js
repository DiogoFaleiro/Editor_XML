self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('pwa-cache').then((cache) => {
      return cache.addAll([
        '/index.html', // Verifique se o arquivo está na raiz do seu projeto
        '/style.css', 
        '/script.js',
        '/assets/favicon-192.png',
        '/assets/favicon-512.png',
        '/assets/logo.png',
      ]);
    }).catch(err => {
      console.error('Erro ao adicionar ao cache:', err);
    })
  );
});