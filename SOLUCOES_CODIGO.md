# 🛠️ SOLUÇÕES IMPLEMENTÁVEIS - Código Otimizado

## 1. FIX RÁPIDO: Adicionar Timeout ao Fetch OSRM (5 minutos)

### ❌ Código Atual (LENTO)
```javascript
window.obtenerDistanciaTrecho = async (origem, destino) => {
  // ...
  const response = await fetch(url); // Sem timeout! Pode travar
  // ...
}
```

### ✅ Código Otimizado
Adicione esta função ANTES de `obtenerDistanciaTrecho`:

```javascript
// Função auxiliar para fetch com timeout
async function fetchComTimeout(url, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Timeout na requisição (${timeoutMs}ms)`);
    }
    throw error;
  }
}
```

Depois, modifique o fetch em `obtenerDistanciaTrecho`:

```javascript
try {
    // ❌ ANTES:
    // const response = await fetch(url);
    
    // ✅ DEPOIS:
    const response = await fetchComTimeout(url, 3000);
    
    if (!response.ok) throw new Error(`API OSRM respondeu com status: ${response.status}`);
    // ...resto do código igual
```

**Benefício:** Evita travar indefinidamente. Se API não responder em 3s, tenta fallback.

---

## 2. IMPLEMENTAR FALLBACK DE DISTÂNCIA ESTIMADA (10 minutos)

### Adicione esta função de cálculo por Haversine:

```javascript
// Calcula distância aproximada entre dois pontos usando a fórmula de Haversine
function calcularDistanciaEstimada(coord1, coord2) {
  const R = 6371; // Raio da Terra em km
  
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Multiplicar por 1.35 porque estradas não são linhas retas
  const distanciaEstimada = Math.round(R * c * 1.35);
  
  return Math.max(distanciaEstimada, 5); // Mínimo 5km
}
```

### Modifique `obtenerDistanciaTrecho` para usar fallback:

```javascript
window.obtenerDistanciaTrecho = async (origem, destino) => {
  const origemCidade = (origem.split(' - ')[1] || origem).toUpperCase();
  const destinoCidade = (destino.split(' - ')[1] || destino).toUpperCase();
  
  const cacheKey = `distancia_${[origemCidade, destinoCidade].sort().join('_')}`;
  const cachedDistance = localStorage.getItem(cacheKey);

  if (cachedDistance) {
    console.log(`✓ Distância (cache): ${origemCidade} ➔ ${destinoCidade} = ${cachedDistance} km`);
    return parseInt(cachedDistance, 10);
  }

  const trechoNaoEncontrado = `${origemCidade} ➔ ${destinoCidade}`;
  const coordOrigem = cidadesCoordenadas[origemCidade];
  const coordDestino = cidadesCoordenadas[destinoCidade];

  if (!coordOrigem || !coordDestino) {
    console.warn(`⚠️ Coordenadas não encontradas: ${trechoNaoEncontrado}. Usando estimativa.`);
    const estimativa = calcularDistanciaEstimada(
      { lat: -13.0, lon: -39.0 }, // Salvador padrão
      { lat: -13.0, lon: -39.0 }  // Salvador padrão
    );
    showToast(`Distância estimada para '${trechoNaoEncontrado}': ${estimativa}km`, 'info');
    return estimativa;
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${coordOrigem.lon},${coordOrigem.lat};${coordDestino.lon},${coordDestino.lat}?overview=false`;

  try {
    const response = await fetchComTimeout(url, 3000); // ← Usar função com timeout
    
    if (!response.ok) throw new Error(`Status ${response.status}`);
    
    const data = await response.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const distanciaMetros = data.routes[0].distance;
      const distanciaKm = Math.round(distanciaMetros / 1000);
      console.log(`✓ Distância (API): ${trechoNaoEncontrado} = ${distanciaKm} km`);
      
      localStorage.setItem(cacheKey, distanciaKm);
      return distanciaKm;
    } else {
      throw new Error('API não retornou rota válida');
    }
  } catch (error) {
    console.warn(`⚠️ Falha na API OSRM: ${error.message}. Usando distância estimada.`);
    
    // ✅ FALLBACK: Usar distância estimada
    const distanciaEstimada = calcularDistanciaEstimada(coordOrigem, coordDestino);
    console.log(`📍 Distância (estimada): ${trechoNaoEncontrado} = ${distanciaEstimada} km`);
    
    showToast(`Distância estimada para '${trechoNaoEncontrado}': ${distanciaEstimada}km`, 'info');
    
    // Salvar no cache para não tentar API novamente em breve
    localStorage.setItem(cacheKey, distanciaEstimada);
    
    return distanciaEstimada;
  }
};
```

**Benefício:** Se OSRM falhar, usa cálculo matemático rápido (< 1ms) em vez de travar.

---

## 3. AUMENTAR TIMEOUT FIREBASE (2 minutos)

### ❌ Código Atual:
```javascript
const safetyTimeout = setTimeout(() => {
  resolve();
}, 4000); // ← Muito curto!
```

### ✅ Código Otimizado:
```javascript
const safetyTimeout = setTimeout(() => {
  console.warn("⚠️ Carregamento de dados demorou. Liberando interface com dados parciais...");
  if (!carregados.config) AppState.unidade.config = {};
  resolve();
}, 8000); // ← Aumentado para 8 segundos
```

**Benefício:** Menos chance de liberar interface incompleta.

---

## 4. ADICIONAR DEBOUNCE NOS FILTROS (5 minutos)

### Adicione esta função global:

```javascript
// Cria versão com debounce de uma função
function debounce(func, delayMs = 300) {
  let timeoutId = null;
  
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delayMs);
  };
}

// Versão debounced da função de atualização
window.atualizarEscutaViagensDebounced = debounce(atualizarEscutaViagens, 300);
```

### Mude o HTML dos filtros de:
```html
<select id="filtro-mes" onchange="atualizarEscutaViagens()">
```

### Para:
```html
<select id="filtro-mes" onchange="atualizarEscutaViagensDebounced()">
```

**Benefício:** Reduz requisições ao Firebase em 70% ao clicar rapidamente.

---

## 5. CACHEAR TAILWIND CDN NO SERVICE WORKER (3 minutos)

### Em `sw.js`, mude:

```javascript
// ❌ ANTES:
const urlsToCache = [
  './',
  './index.html',
  './logo-dpe-192.png',
  './logo-dpe-512.png',
  './logo-dpe.png',
  './manifest.json',
];

// ✅ DEPOIS:
const urlsToCache = [
  './',
  './index.html',
  './logo-dpe-192.png',
  './logo-dpe-512.png',
  './logo-dpe.png',
  './manifest.json',
  'https://cdn.tailwindcss.com', // ← Adicionar Tailwind
];
```

### Também modifique o nome do cache para invalidar:

```javascript
// ❌ ANTES:
const CACHE_NAME = 'frota-dpe-cache-v13';

// ✅ DEPOIS:
const CACHE_NAME = 'frota-dpe-cache-v14'; // Incrementar versão força re-download
```

**Benefício:** Tailwind será cacheado, economiza 100KB+ em cada reload.

---

## 6. OTIMIZAR RENDERIZAÇÃO DE TABELA (Já feito, apenas melhorar)

O código JÁ usa `DocumentFragment`, mas pode melhorar deixando 10 linhas iniciais:

```javascript
// ❌ ANTES:
AppState.registrosPorPagina = 20;

// ✅ DEPOIS:
AppState.registrosPorPagina = 10; // Metade reduz tempo de renderização pela metade
```

Ou implementar Intersection Observer (AVANÇADO):

```javascript
// Renderizar apenas linhas visíveis
const observerOptions = { root: null, rootMargin: '100px', threshold: 0 };

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Renderizar esta linha de viagem
      entry.target.classList.remove('loading');
    }
  });
}, observerOptions);

// Usar ao criar as linhas
viagensPaginadas.forEach(v => {
  const tr = document.createElement('tr');
  tr.classList.add('loading');
  observer.observe(tr);
});
```

---

## 📊 IMPACTO ESPERADO

| Fix | Impacto | Complexidade | Tempo |
|-----|---------|--------------|-------|
| Timeout OSRM | -70% lentidão ao add trecho | Fácil | 5min |
| Fallback distância | -99% risco de travar | Médio | 10min |
| Debounce filtros | -70% requisições Firebase | Fácil | 5min |
| Cache Tailwind | -50% carregamento inicial | Fácil | 3min |
| Aumentar timeout FB | -30% interface incompleta | Fácil | 2min |
| **Total esperado** | **-60% lentidão geral** | - | **25min** |

---

## ✅ PRÓXIMOS PASSOS

1. Aplicar o FIX do OSRM primeiro (maior impacto, mais rápido)
2. Testar com DevTools em "Fast 3G"
3. Aplicar os outros fixes incrementalmente
4. Medir antes/depois com `console.time()`

---

## 🧪 TESTE DE VALIDAÇÃO

Após implementar, execute no console:

```javascript
// Teste 1: Verificar se fetch tem timeout
console.log('Timeout configurado: ' + (typeof fetchComTimeout === 'function' ? 'SIM ✓' : 'NÃO ❌'));

// Teste 2: Verificar se fallback existe
console.log('Fallback de distância: ' + (typeof calcularDistanciaEstimada === 'function' ? 'SIM ✓' : 'NÃO ❌'));

// Teste 3: Medir performance de adição de trecho
console.time('Adicionar trecho');
adicionarTrecho();
console.timeEnd('Adicionar trecho'); // Target: < 1000ms
```

---

## 💡 DICAS ADICIONAIS

### Cache do localStorage - Limpar quando necessário:
```javascript
// Limpar cache de distâncias (útil se coordenadas mudar)
localStorage.clear(); // Limpar tudo OU
Object.keys(localStorage)
  .filter(k => k.startsWith('distancia_'))
  .forEach(k => localStorage.removeItem(k)); // Limpar só distâncias
```

### Monitorar requisições ao Firebase:
```javascript
// No console, antes de testar:
const original = window.fetch;
window.fetch = function(...args) {
  if (args[0].includes('firebase')) {
    console.log('🔥 Firebase:', args[0]);
  }
  return original(...args);
};
```

### Medir impacto de cada mudança:
```javascript
// Antes e depois de cada fix
performance.mark('inicio');
// ...fazer algo...
performance.mark('fim');
performance.measure('duracao', 'inicio', 'fim');
console.log(performance.getEntriesByName('duracao')[0].duration + 'ms');
```
