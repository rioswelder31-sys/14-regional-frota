const CACHE_NAME = 'frota-dpe-cache-v2';
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

// Nova Estratégia de Cache Otimizada
self.addEventListener('fetch', event => {
  // REGRA 1: Ignorar requisições do Firebase e APIs externas. 
  // Fazer cache do Firebase quebra a conexão em tempo real (estado Online/Offline).
  if (event.request.url.includes('firebaseio.com') || event.request.url.includes('googleapis.com') || event.request.url.includes('gstatic.com')) {
    return;
  }

  // REGRA 2: Para requisições de navegação (HTML), usa Rede Primeiro (Network First).
  // Garante que o usuário sempre veja a versão mais atualizada do app, mas funciona offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // REGRA 3: Para outros arquivos (CSS, Imagens), usa Cache Primeiro, caindo para a Rede.
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(response => {
          return response;
        });
      })
  );
});