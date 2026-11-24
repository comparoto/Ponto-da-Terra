/**
 * Ambiente isolado do benchmark de paralelismo. DEVE ser o primeiro import de `benchmark-paralelismo.ts`:
 * ele valida o banco e define as variáveis de ambiente ANTES de a aplicação (`src/config`) ser carregada.
 *
 * Trava de segurança: o benchmark apaga e recria dados, então só roda em um banco cujo nome termina em "_bench".
 */
export const URL_BANCO = process.env.BENCH_DATABASE_URL ?? 'postgresql://pdt:pdt@localhost:5434/pontodaterra_bench?schema=public';
export const NOME_BANCO = new URL(URL_BANCO).pathname.replace(/^\//, '');

if (!NOME_BANCO.endsWith('_bench')) {
  throw new Error(`Benchmark abortado: o banco "${NOME_BANCO}" não termina em "_bench". O script apaga e recria dados; use um banco exclusivo.`);
}

process.env.DATABASE_URL = URL_BANCO;
process.env.DATABASE_URL_UNPOOLED = URL_BANCO;
// Redis separado (db 2) para não misturar com o cache de desenvolvimento (db 0) nem com o dos testes (db 1)
process.env.REDIS_URL = process.env.BENCH_REDIS_URL ?? 'redis://localhost:6380/2';
