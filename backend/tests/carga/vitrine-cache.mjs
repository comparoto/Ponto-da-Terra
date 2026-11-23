// Benchmark do cache da vitrine sem depender do k6 (mesmos dois cenários de vitrine-cache.k6.js).
// 50 usuários virtuais por 15 s em cada cenário:
//   com cache: todos pedem a MESMA consulta (resposta do Redis, X-Cache: HIT)
//   sem cache: cada requisição usa um filtro diferente (chave nova, vai ao PostgreSQL, X-Cache: MISS)
// Uso: cd backend && node tests/carga/vitrine-cache.mjs   (API em API=http://localhost:3333/api)
const API = process.env.API ?? 'http://localhost:3333/api';
const VUS = 50;
const DURACAO_MS = 15000;

async function cenario(nome, montarUrl) {
  const latencias = [];
  const cabecalhos = { HIT: 0, MISS: 0, outro: 0 };
  let erros = 0;
  const fim = Date.now() + DURACAO_MS;
  async function usuarioVirtual(vu) {
    for (let iter = 0; Date.now() < fim; iter++) {
      const t = Date.now();
      try {
        const r = await fetch(montarUrl(vu, iter));
        await r.arrayBuffer();
        if (r.status !== 200) erros++;
        const c = r.headers.get('x-cache');
        cabecalhos[c === 'HIT' || c === 'MISS' ? c : 'outro']++;
      } catch {
        erros++;
      }
      latencias.push(Date.now() - t);
    }
  }
  await Promise.all(Array.from({ length: VUS }, (_, vu) => usuarioVirtual(vu)));
  latencias.sort((a, b) => a - b);
  const pct = p => latencias[Math.min(latencias.length - 1, Math.floor(latencias.length * p))];
  return { nome, requisicoes: latencias.length, porSegundo: Math.round(latencias.length / (DURACAO_MS / 1000)), medianaMs: pct(0.5), p95Ms: pct(0.95), erros, ...cabecalhos };
}

const resultados = [];
resultados.push(await cenario('com cache', () => `${API}/produtos?limit=12&ordenacao=preco-desc`));
resultados.push(await cenario('sem cache', (vu, iter) => `${API}/produtos?limit=12&ordenacao=preco-desc&precoMin=${(vu * 100000 + iter) / 1000000}`));
console.table(resultados);
