# 📊 Análise de Lentidão - Sistema Frota DPE V81.1

## 🔴 PROBLEMAS CRÍTICOS (ORDEM DE IMPACTO)

---

## 1️⃣ **API OSRM - Cálculo de Distâncias (CRÍTICO)**

### 🎯 Impacto
- **Sintoma:** Sistema trava por 1-3 segundos ao clicar no botão "Add"
- **Frequência:** Acontece toda vez que adiciona um trecho
- **Severidade:** CRÍTICA (bloqueia UX do usuário)

### 🔍 Raiz do Problema
```javascript
// ❌ PROBLEMA: Requisição HTTP sem timeout
window.obtenerDistanciaTrecho = async (origem, destino) => {
  // ...
  const response = await fetch(url); // Sem timeout! Pode travar
  // ...
}
```

### ✅ Soluções Recomendadas

#### A) Adicionar Timeout (RÁPIDO - 5min)
```javascript
// Envolver fetch com timeout
async function fetchComTimeout(url, timeout = 3000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    if (e.name === 'AbortError') {
      console.warn(`Timeout na requisição: ${url}`);
      return null;
    }
    throw e;
  }
}
```

#### B) Implementar Retry com Backoff (MÉDIO - 10min)
```javascript
async function fetchComRetry(url, maxTentativas = 3) {
  for (let i = 0; i < maxTentativas; i++) {
    try {
      const response = await fetchComTimeout(url, 3000);
      if (response && response.ok) return response;
    } catch (e) {
      if (i === maxTentativas - 1) throw e;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

#### C) Usar Fallback com Distância Estimada (RÁPIDO - 5min)
```javascript
// Se API falhar, usar distância em linha reta como fallback
function distanciaEstimada(coord1, coord2) {
  const R = 6371; // Raio da Terra em km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(coord1.lat*Math.PI/180) * 
            Math.cos(coord2.lat*Math.PI/180) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 1.3); // 1.3x para aproximar de estrada
}
```

#### D) Desabilitar Cálculo Real-time (OPCIONAL - Trocar UX)
```javascript
// Em vez de calcular ao adicionar, calcular apenas ao salvar
async function adicionarTrecho() {
  // ... add roteiro
  renderRoteiro();
  // NÃO chamar updateDistanciaTotal() aqui
  // Chamar apenas ao clicar "Salvar Solicitação"
}
```

---

## 2️⃣ **Firebase Listeners - Carregamento Lento (SECUNDÁRIO)**

### 🎯 Impacto
- **Sintoma:** "Conectando..." fica visível por 3-5 segundos
- **Frequência:** Ao fazer login
- **Severidade:** MÉDIA (UX ruim, mas não bloqueia)

### 🔍 Raiz do Problema
```javascript
// ❌ PROBLEMA: Múltiplos listeners com timeout curto
carregarDadosDaUnidade() {
  const safetyTimeout = setTimeout(() => {
    resolve(); // Libera em 4s mesmo incompleto!
  }, 4000);
  
  onValue(ref1, ...); // Listener 1
  onValue(ref2, ...); // Listener 2
  onValue(ref3, ...); // Listener 3
}
```

### ✅ Soluções Recomendadas

#### A) Aumentar Timeout de Segurança (RÁPIDO - 2min)
```javascript
// Mudar de 4s para 8s
const safetyTimeout = setTimeout(() => {
  resolve();
}, 8000); // ← Aumentar daqui
```

#### B) Usar Race entre Promise e Timeout (MÉDIO - 10min)
```javascript
function carregarComTimeout(promises, timeout = 6000) {
  return Promise.race([
    Promise.all(promises),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]).catch(err => {
    console.warn('Carregamento parcial:', err.message);
    return null; // Retorna null em timeout, mas continua ouvindo
  });
}
```

#### C) Carregar Dados Críticos Primeiro (MÉDIO - 15min)
```javascript
// Priorizar: motorista > equipe > config
// Em vez de esperar todos, mostrar interface assim que motorista carregar
carregarDadosDaUnidade() {
  onValue(motorista, (snap) => {
    AppState.unidade.motorista = snap.val();
    if (equipeCarregada) configurarUI(); // Mostrar logo
  });
  
  onValue(equipe, (snap) => {
    AppState.unidade.equipe = snap.val();
    if (motoristaCarregado) configurarUI(); // Mostrar logo
  });
}
```

---

## 3️⃣ **Renderização de Tabela Pesada (SECUNDÁRIO)**

### 🎯 Impacto
- **Sintoma:** Tela trava por 2-5s ao mudar mês com 100+ viagens
- **Frequência:** Cada mudança de filtro
- **Severidade:** MÉDIA (afeta produtividade)

### 🔍 Raiz do Problema
```javascript
// ❌ PROBLEMA: Renderiza TUDO de uma vez
window.atualizarTabelaGlobal = () => {
  viagensPaginadas.forEach(v => {
    // Cria 20 linhas com múltiplos elementos DOM cada uma
    tr.insertCell(); // ← Operação DOM cara
    tr.insertCell(); // ← Operação DOM cara
    // ...
  });
};
```

### ✅ Soluções Recomendadas

#### A) Usar DocumentFragment (RÁPIDO - 5min)
```javascript
// ✅ Já está sendo feito no código!
// Apenas adicione ao tbody de uma vez
const fragment = document.createDocumentFragment();
viagensPaginadas.forEach(v => {
  // ... criar tr e adicionar a fragment
});
tb.appendChild(fragment); // ← Operação DOM única!
```

#### B) Lazy Load com Intersection Observer (AVANÇADO - 30min)
```javascript
// Renderizar linhas conforme entram no viewport
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      renderRow(entry.target);
      observer.unobserve(entry.target);
    }
  });
});

// Usar placeholder para cada linha
viagens.forEach(v => {
  const placeholder = document.createElement('tr');
  placeholder.id = `row-${v.id}`;
  observer.observe(placeholder);
});
```

#### C) Limitar Renderização Inicial (RÁPIDO - 3min)
```javascript
// Em vez de renderizar 20 linhas, começar com 10
AppState.registrosPorPagina = 10; // ← Reduzir de 20 para 10

// Ou criar paginação lazy:
// Inicialmente mostrar 10, ao scroll carregar mais 10
```

---

## 4️⃣ **Service Worker - Cache Ineficiente (MENOR)**

### 🎯 Impacto
- **Sintoma:** Carregamento inicial lento (especialmente offline)
- **Frequência:** Primeira carga e em conexões fracas
- **Severidade:** BAIXA (offline cache funciona)

### 🔍 Raiz do Problema
```javascript
// ❌ PROBLEMA: CDN externo não é cacheado
const urlsToCache = [
  './',
  './index.html',
  // Tailwind vem dinamicamente do CDN, não está aqui!
  'https://cdn.tailwindcss.com'
];
```

### ✅ Soluções Recomendadas

#### A) Cachear CDN Externo (FÁCIL - 3min)
```javascript
// sw.js - Adicionar CDN à lista de cache
const urlsToCache = [
  './',
  './index.html',
  './logo-dpe-192.png',
  './logo-dpe-512.png',
  './logo-dpe.png',
  './manifest.json',
  'https://cdn.tailwindcss.com', // ← Adicionar
];
```

#### B) Usar Cache Versioning (MÉDIO - 10min)
```javascript
// sw.js
const CACHE_NAME = 'frota-dpe-cache-v14'; // Incrementar versão

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(err => {
        console.warn('Erro ao cachear:', err);
        // Não falha tudo, continua carregando
      });
    })
  );
});
```

---

## 5️⃣ **Sem Debounce em Filtros (MENOR)**

### 🎯 Impacto
- **Sintoma:** Múltiplas requisições ao Firebase ao mudar filtros
- **Frequência:** Quando usuário muda mês/ano
- **Severidade:** BAIXA (funciona, mas ineficiente)

### ✅ Solução (RÁPIDO - 5min)
```javascript
let debounceTimerFiltro = null;

function atualizarEscutaViagensDebounced() {
  clearTimeout(debounceTimerFiltro);
  debounceTimerFiltro = setTimeout(() => {
    atualizarEscutaViagens();
  }, 300); // Esperar 300ms após última mudança
}

// Usar em lugar de onchange direto:
// onchange="atualizarEscutaViagensDebounced()"
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Adicionar timeout (3s) ao fetch OSRM
- [ ] Implementar retry com backoff exponencial
- [ ] Adicionar fallback de distância estimada
- [ ] Aumentar timeout Firebase de 4s para 8s
- [ ] Cachear CDN Tailwind no Service Worker
- [ ] Adicionar debounce nos filtros (300ms)
- [ ] Testar em conexão 3G (simular no DevTools)
- [ ] Medir antes/depois com Lighthouse

---

## 🧪 COMO TESTAR PERFORMANCE

### No Chrome DevTools:
1. F12 → Network → Throttle "Fast 3G"
2. F12 → Performance → Gravar
3. Realizar ação (ex: adicionar trecho)
4. Ver timeline (target: < 1s)

### Lighthouse:
1. F12 → Lighthouse
2. Clicar "Generate report"
3. Focar em "Performance" e "First Contentful Paint"

### Comando DevTools:
```javascript
console.time('updateDistancia');
updateDistanciaTotal();
console.timeEnd('updateDistancia'); // Mostra tempo total
```

---

## 📞 PRIORIDADE RECOMENDADA

1. **URGENTE (hoje):** Adicionar timeout OSRM + fallback
2. **IMPORTANTE (essa semana):** Aumentar timeout Firebase + debounce
3. **NICE-TO-HAVE:** Lazy loading tabela + cache CDN

---

## 🔧 Implementação Detalhada (ver próximo arquivo)
