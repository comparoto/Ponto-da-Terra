/* eslint-disable */
// Benchmark da vitrine (FCCPD / exigência de "cache em pontos críticos, como o catálogo").
//
// Dois cenários em sequência, com 50 usuários virtuais por 15 s cada:
//   - com_cache:  todos pedem a MESMA consulta → respondida pelo Redis (X-Cache: HIT)
//   - sem_cache:  cada requisição usa um filtro diferente → chave nova, vai ao PostgreSQL (X-Cache: MISS)
// Compare http_req_duration{cenario:...} e http_reqs no resumo.
//
// Uso: k6 run tests/carga/vitrine-cache.k6.js
//      (ou via Docker: docker run --rm -i -e API=http://host.docker.internal:3333/api grafana/k6 run - < tests/carga/vitrine-cache.k6.js)
import http from 'k6/http';
import { check } from 'k6';

const API = __ENV.API || 'http://localhost:3333/api';

export const options = {
  scenarios: {
    com_cache: { executor: 'constant-vus', vus: 50, duration: '15s', exec: 'comCache', tags: { cenario: 'com_cache' } },
    sem_cache: { executor: 'constant-vus', vus: 50, duration: '15s', startTime: '16s', exec: 'semCache', tags: { cenario: 'sem_cache' } },
  },
  thresholds: {
    'http_req_failed{cenario:com_cache}': ['rate==0'],
    'http_req_failed{cenario:sem_cache}': ['rate==0'],
    'http_req_duration{cenario:com_cache}': ['p(95)<500'],
    'http_req_duration{cenario:sem_cache}': ['p(95)<1500'],
  },
};

export function comCache() {
  const r = http.get(`${API}/produtos?limit=12&ordenacao=preco-desc`);
  check(r, { 'HTTP 200': x => x.status === 200, 'servido pelo cache (HIT)': x => x.headers['X-Cache'] === 'HIT' });
}

export function semCache() {
  // Filtro de preço único por requisição → nunca repete a chave de cache (e não polui "termos mais buscados")
  const precoMin = (__VU * 100000 + __ITER) / 1000000;
  const r = http.get(`${API}/produtos?limit=12&ordenacao=preco-desc&precoMin=${precoMin}`);
  check(r, { 'HTTP 200': x => x.status === 200, 'consulta ao banco (MISS)': x => x.headers['X-Cache'] === 'MISS' });
}
