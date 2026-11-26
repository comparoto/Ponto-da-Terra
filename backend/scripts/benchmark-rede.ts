/**
 * Benchmark de rede da API (SO, Unidade 2): latência (p50/p95/p99), vazão, perda e jitter de requisições HTTP reais,
 * comparados com os requisitos de negócio (frete < 300 ms, vitrine fluida).
 *
 * Uso:   cd backend && npm run benchmark:rede -- --alvo=http://localhost:3333/api
 *        npm run benchmark:rede -- --alvo=https://ponto-da-terra-api.vercel.app/api --producao
 *        npm run benchmark:rede -- --alvo=... --amostras=100 --concorrencias=1,5,20 --duracao=8
 *
 * Só faz requisições GET de leitura (não altera dados). Com --producao a carga é limitada (no máximo 10 conexões
 * simultâneas e 5 s por nível) para não sobrecarregar o ambiente de demonstração.
 *
 * Metodologia:
 *  - fase sequencial: N requisições seguidas a cada endpoint (a primeira é descartada: conexão/TLS/função fria);
 *    latência = tempo até o corpo completo da resposta, medido no cliente; jitter = média da diferença absoluta
 *    entre latências consecutivas; perda = requisições sem resposta HTTP < 500 dentro do limite de tempo;
 *  - fase concorrente: K conexões simultâneas pedindo o mesmo endpoint durante D segundos; vazão = respostas
 *    válidas por segundo; mede também a perda e a latência sob carga.
 * A rede entre o cliente e a API faz parte da medida: o resultado vale para a máquina, o provedor e o horário em que rodou.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, platform, release } from 'node:os';
import { resolve } from 'node:path';

const argumento = (nome: string) => process.argv.find(a => a.startsWith(`--${nome}=`))?.split('=')[1];
const PRODUCAO = process.argv.includes('--producao');
const RAPIDO = process.argv.includes('--rapido');
const ALVO = (argumento('alvo') ?? 'http://localhost:3333/api').replace(/\/$/, '');
const AMOSTRAS = Number(argumento('amostras') ?? (RAPIDO ? 15 : 60));
const DURACAO_S = Math.min(Number(argumento('duracao') ?? (RAPIDO ? 2 : 8)), PRODUCAO ? 5 : 60);
const CONCORRENCIAS = (argumento('concorrencias') ?? (RAPIDO ? '1,5' : '1,5,20')).split(',').map(Number).map(c => Math.min(c, PRODUCAO ? 10 : 200));
const LIMITE_MS = Number(argumento('limite') ?? 8000);
const ROTULO = argumento('rotulo') ?? (PRODUCAO ? 'producao' : 'local');
const PASTA_SAIDA = resolve(__dirname, '..', '..', argumento('saida') ?? 'docs/so/resultados');

interface Endpoint {
  id: string;
  caminho: string;
  /** Requisito de negócio de latência p95 (ms), quando existir. */
  requisitoP95Ms?: number;
  origemDoRequisito?: string;
}
const ENDPOINTS: Endpoint[] = [
  { id: 'health', caminho: '/health' },
  { id: 'vitrine', caminho: '/produtos?limit=12' },
  { id: 'categorias', caminho: '/categorias' },
  { id: 'frete', caminho: '/frete?cep=01001000', requisitoP95Ms: 300, origemDoRequisito: 'RN16: frete em < 300 ms' },
];

const arred = (x: number, c = 1) => Math.round(x * 10 ** c) / 10 ** c;
const percentil = (v: number[], p: number) => {
  if (!v.length) return 0;
  const o = [...v].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.max(0, Math.ceil((p / 100) * o.length) - 1))];
};
const jitter = (v: number[]) => (v.length < 2 ? 0 : v.slice(1).reduce((s, x, i) => s + Math.abs(x - v[i]), 0) / (v.length - 1));

/** Uma requisição: devolve a latência (ms) se houve resposta válida, ou `null` se houve perda/erro 5xx. */
async function requisitar(url: string): Promise<{ ms: number; bytes: number } | null> {
  const controle = new AbortController();
  const temporizador = setTimeout(() => controle.abort(), LIMITE_MS);
  const inicio = performance.now();
  try {
    const res = await fetch(url, { signal: controle.signal, headers: { 'Cache-Control': 'no-cache' } });
    const corpo = await res.arrayBuffer();
    if (res.status >= 500) return null;
    return { ms: performance.now() - inicio, bytes: corpo.byteLength };
  } catch {
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}

async function sequencial(e: Endpoint) {
  const url = `${ALVO}${e.caminho}`;
  await requisitar(url); // descarta a primeira (conexão, TLS, função fria)
  const tempos: number[] = [];
  let bytes = 0;
  for (let i = 0; i < AMOSTRAS; i++) {
    const r = await requisitar(url);
    if (r) {
      tempos.push(r.ms);
      bytes += r.bytes;
    }
  }
  const falhas = AMOSTRAS - tempos.length;
  const p95 = percentil(tempos, 95);
  return {
    endpoint: e.id,
    caminho: e.caminho,
    amostras: AMOSTRAS,
    falhas,
    perdaPct: arred((falhas / AMOSTRAS) * 100),
    latenciaMs: { min: arred(Math.min(...tempos, Infinity) === Infinity ? 0 : Math.min(...tempos)), p50: arred(percentil(tempos, 50)), p95: arred(p95), p99: arred(percentil(tempos, 99)), max: arred(Math.max(0, ...tempos)) },
    jitterMs: arred(jitter(tempos)),
    bytesPorResposta: tempos.length ? Math.round(bytes / tempos.length) : 0,
    requisitoP95Ms: e.requisitoP95Ms ?? null,
    origemDoRequisito: e.origemDoRequisito ?? null,
    atendeRequisito: e.requisitoP95Ms === undefined ? null : p95 > 0 && p95 <= e.requisitoP95Ms,
  };
}

async function concorrente(e: Endpoint, conexoes: number) {
  const url = `${ALVO}${e.caminho}`;
  const fim = performance.now() + DURACAO_S * 1000;
  const tempos: number[] = [];
  let falhas = 0;
  let bytes = 0;
  const inicio = performance.now();
  await Promise.all(
    Array.from({ length: conexoes }, async () => {
      while (performance.now() < fim) {
        const r = await requisitar(url);
        if (r) {
          tempos.push(r.ms);
          bytes += r.bytes;
        } else falhas++;
      }
    }),
  );
  const segundos = (performance.now() - inicio) / 1000;
  const total = tempos.length + falhas;
  return {
    endpoint: e.id,
    conexoes,
    duracaoS: arred(segundos),
    respostas: tempos.length,
    falhas,
    perdaPct: total ? arred((falhas / total) * 100) : 0,
    vazaoReqPorSeg: arred(tempos.length / segundos),
    vazaoKbPorSeg: arred(bytes / 1024 / segundos),
    latenciaMs: { p50: arred(percentil(tempos, 50)), p95: arred(percentil(tempos, 95)), p99: arred(percentil(tempos, 99)) },
    jitterMs: arred(jitter(tempos)),
  };
}

async function principal() {
  console.log(`Alvo: ${ALVO} (${ROTULO}) · amostras ${AMOSTRAS} · concorrências ${CONCORRENCIAS.join(',')} · ${DURACAO_S}s por nível\n`);
  const sequenciais = [];
  for (const e of ENDPOINTS) {
    const r = await sequencial(e);
    sequenciais.push(r);
    console.log(`${r.endpoint.padEnd(11)} p50 ${String(r.latenciaMs.p50).padStart(7)} ms  p95 ${String(r.latenciaMs.p95).padStart(7)} ms  p99 ${String(r.latenciaMs.p99).padStart(7)} ms  jitter ${String(r.jitterMs).padStart(6)} ms  perda ${r.perdaPct}%` + (r.requisitoP95Ms ? `  [requisito p95 ≤ ${r.requisitoP95Ms} ms: ${r.atendeRequisito ? 'ATENDE' : 'NÃO ATENDE'}]` : ''));
  }
  console.log('');
  const sobCarga = [];
  const alvoDeCarga = ENDPOINTS.find(e => e.id === 'vitrine') ?? ENDPOINTS[0];
  for (const c of CONCORRENCIAS) {
    const r = await concorrente(alvoDeCarga, c);
    sobCarga.push(r);
    console.log(`${r.endpoint} com ${String(c).padStart(3)} conexões: ${String(r.vazaoReqPorSeg).padStart(7)} req/s  p95 ${String(r.latenciaMs.p95).padStart(7)} ms  jitter ${String(r.jitterMs).padStart(6)} ms  perda ${r.perdaPct}% (${r.falhas}/${r.respostas + r.falhas})`);
  }

  const resultado = {
    geradoEm: new Date().toISOString(),
    rotulo: ROTULO,
    alvo: ALVO,
    cliente: { node: process.version, plataforma: `${platform()} ${release()}`, cpu: cpus()[0]?.model ?? 'desconhecida', nucleos: cpus().length },
    parametros: { amostras: AMOSTRAS, duracaoPorNivelS: DURACAO_S, concorrencias: CONCORRENCIAS, limiteDeTempoMs: LIMITE_MS, descartadaPrimeiraRequisicao: true },
    sequencial: sequenciais,
    sobCarga,
  };
  mkdirSync(PASTA_SAIDA, { recursive: true });
  writeFileSync(resolve(PASTA_SAIDA, `benchmark-rede-${ROTULO}.json`), JSON.stringify(resultado, null, 2));
  const linhas = [
    'rotulo,fase,endpoint,conexoes,p50_ms,p95_ms,p99_ms,jitter_ms,perda_pct,vazao_req_s',
    ...sequenciais.map(r => [ROTULO, 'sequencial', r.endpoint, 1, r.latenciaMs.p50, r.latenciaMs.p95, r.latenciaMs.p99, r.jitterMs, r.perdaPct, ''].join(',')),
    ...sobCarga.map(r => [ROTULO, 'carga', r.endpoint, r.conexoes, r.latenciaMs.p50, r.latenciaMs.p95, r.latenciaMs.p99, r.jitterMs, r.perdaPct, r.vazaoReqPorSeg].join(',')),
  ];
  writeFileSync(resolve(PASTA_SAIDA, `benchmark-rede-${ROTULO}.csv`), linhas.join('\n') + '\n');
  console.log(`\nResultados em ${PASTA_SAIDA} (benchmark-rede-${ROTULO}.json/.csv)`);
}

principal().catch(e => {
  console.error(e);
  process.exit(1);
});
