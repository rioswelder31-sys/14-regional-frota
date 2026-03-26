const CACHE_NAME = 'frota-dpe-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './dist/output.css', // Certifique-se de incluir o caminho correto para seu arquivo CSS
  './logo-dpe-192.png',
  './logo-dpe-dark-192.png',
  './manifest.json',
  // Adicione aqui outros assets estáticos (imagens, fontes, etc.)
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

function isFirebaseAPIRequest(url) {
  // Adicione aqui padrões de URL que correspondem às suas chamadas à API Firebase
  return url.startsWith('https://frota14regional-8fecc-default-rtdb.firebaseio.com/');
}

// Limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );
});


// Estratégia de cache: Stale-while-revalidate
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Se encontrar no cache, retorna
        if (cachedResponse) {
          return cachedResponse;
        }
        // Se não encontrar, faz a requisição e armazena em cache (para assets da mesma origem)
        return fetch(event.request).then(response => {
          // Garante que a resposta é válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Adiciona ao cache se for uma requisição à API do Firebase
          if (isFirebaseAPIRequest(event.request.url)) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
  );
});