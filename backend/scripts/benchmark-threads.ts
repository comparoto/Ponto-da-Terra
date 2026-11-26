/**
 * Benchmark de threads (SO, Unidade 1): reserva de estoque com worker_threads e memória compartilhada.
 *
 * Uso:   cd backend && npm run benchmark:threads
 *        npm run benchmark:threads -- --rapido
 *        npm run benchmark:threads -- --pedidos=20000 --repeticoes=7 --threads=1,2,4,8
 *
 * Mede, para o MESMO conjunto de pedidos sintéticos (semente fixa):
 *  1. tempo e ganho (speedup) por número de threads, versão sincronizada (compare-and-swap);
 *  2. a corrida de dados: em N execuções SEM sincronização, quantas terminam com o estoque inconsistente
 *     e quantas unidades foram vendidas além do estoque / tiveram a baixa perdida.
 * O ganho de tempo depende de quantos núcleos a máquina tem (registrado no resultado).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, platform, release } from 'node:os';
import { resolve } from 'node:path';
import { estoqueParaDemanda, gerarPedidos, reservarEmThreads } from '../src/so/reserva-concorrente';

const argumento = (nome: string) => process.argv.find(a => a.startsWith(`--${nome}=`))?.split('=')[1];
const RAPIDO = process.argv.includes('--rapido');
const PEDIDOS = Number(argumento('pedidos') ?? (RAPIDO ? 2_000 : 6_000));
const REPETICOES = Number(argumento('repeticoes') ?? (RAPIDO ? 3 : 5));
const THREADS = (argumento('threads') ?? (RAPIDO ? '1,2' : '1,2,4,8')).split(',').map(Number);
const EXECUCOES_SEM_SINCRONIA = Number(argumento('corridas') ?? (RAPIDO ? 5 : 20));
const RODADAS_DE_HASH = Number(argumento('rodadas') ?? 100);
const PRODUTOS = 8;
const PASTA_SAIDA = resolve(__dirname, '..', '..', argumento('saida') ?? 'docs/so/resultados');

const mediana = (v: number[]) => {
  const o = [...v].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};
const arred = (x: number, c = 1) => Math.round(x * 10 ** c) / 10 ** c;

async function principal() {
  const pedidos = gerarPedidos(PEDIDOS, PRODUTOS, 42);
  const estoque = estoqueParaDemanda(pedidos, PRODUTOS, 0.6);
  console.log(`Pedidos: ${PEDIDOS}, produtos: ${PRODUTOS}, núcleos: ${cpus().length}, rodadas de hash por pedido: ${RODADAS_DE_HASH}\n`);

  // aquecimento (carrega o tsx e o JIT nas threads)
  await reservarEmThreads(pedidos.slice(0, 200), estoque, { threads: 2, sincronizado: true, rodadasDeHash: RODADAS_DE_HASH });

  const escalonamento: { threads: number; medianaMs: number; speedup: number; eficiencia: number; consistente: boolean; tentativasDeCasMediana: number }[] = [];
  for (const threads of THREADS) {
    const tempos: number[] = [];
    const cas: number[] = [];
    let consistente = true;
    for (let i = 0; i < REPETICOES; i++) {
      const r = await reservarEmThreads(pedidos, estoque, { threads, sincronizado: true, rodadasDeHash: RODADAS_DE_HASH });
      tempos.push(r.duracaoMs);
      cas.push(r.tentativasDeCas);
      consistente &&= r.consistente;
    }
    escalonamento.push({ threads, medianaMs: mediana(tempos), speedup: 0, eficiencia: 0, consistente, tentativasDeCasMediana: mediana(cas) });
  }
  const base = escalonamento.find(e => e.threads === 1)?.medianaMs ?? escalonamento[0].medianaMs;
  for (const e of escalonamento) {
    e.speedup = arred(base / e.medianaMs, 2);
    e.eficiencia = arred(e.speedup / e.threads, 2);
    e.medianaMs = arred(e.medianaMs);
    console.log(`threads=${String(e.threads).padStart(2)}  ${String(e.medianaMs).padStart(8)} ms  speedup ${e.speedup}x  eficiência ${e.eficiencia}  consistente=${e.consistente}  CAS refeitos(mediana)=${e.tentativasDeCasMediana}`);
  }

  // corrida de dados: sem sincronização, com o maior número de threads testado
  const threadsCorrida = Math.max(...THREADS, 2);
  const semSincronia = [];
  for (let i = 0; i < EXECUCOES_SEM_SINCRONIA; i++) {
    const r = await reservarEmThreads(pedidos, estoque, { threads: threadsCorrida, sincronizado: false, rodadasDeHash: RODADAS_DE_HASH });
    semSincronia.push({ consistente: r.consistente, atualizacoesPerdidas: r.atualizacoesPerdidas, unidadesAcimaDoEstoque: r.unidadesAcimaDoEstoque });
  }
  const comSincronia = [];
  for (let i = 0; i < EXECUCOES_SEM_SINCRONIA; i++) {
    const r = await reservarEmThreads(pedidos, estoque, { threads: threadsCorrida, sincronizado: true, rodadasDeHash: RODADAS_DE_HASH });
    comSincronia.push({ consistente: r.consistente, atualizacoesPerdidas: r.atualizacoesPerdidas, unidadesAcimaDoEstoque: r.unidadesAcimaDoEstoque });
  }
  const resumir = (execs: { consistente: boolean; atualizacoesPerdidas: number; unidadesAcimaDoEstoque: number }[]) => ({
    execucoes: execs.length,
    inconsistentes: execs.filter(e => !e.consistente).length,
    atualizacoesPerdidasMediana: mediana(execs.map(e => e.atualizacoesPerdidas)),
    atualizacoesPerdidasMax: Math.max(...execs.map(e => e.atualizacoesPerdidas)),
    unidadesAcimaDoEstoqueMediana: mediana(execs.map(e => e.unidadesAcimaDoEstoque)),
    unidadesAcimaDoEstoqueMax: Math.max(...execs.map(e => e.unidadesAcimaDoEstoque)),
  });
  const corrida = { threads: threadsCorrida, semSincronizacao: resumir(semSincronia), comSincronizacao: resumir(comSincronia) };
  console.log('\nCorrida de dados', JSON.stringify(corrida, null, 2));

  const resultado = {
    geradoEm: new Date().toISOString(),
    ambiente: { node: process.version, plataforma: `${platform()} ${release()}`, cpu: cpus()[0]?.model ?? 'desconhecida', nucleos: cpus().length },
    parametros: { pedidos: PEDIDOS, produtos: PRODUTOS, repeticoes: REPETICOES, rodadasDeHash: RODADAS_DE_HASH, estoqueInicial: estoque },
    escalonamento,
    corrida,
  };
  mkdirSync(PASTA_SAIDA, { recursive: true });
  writeFileSync(resolve(PASTA_SAIDA, 'benchmark-threads-ultimo.json'), JSON.stringify(resultado, null, 2));
  writeFileSync(
    resolve(PASTA_SAIDA, 'benchmark-threads-resumo.csv'),
    ['threads,mediana_ms,speedup,eficiencia', ...escalonamento.map(e => [e.threads, e.medianaMs, e.speedup, e.eficiencia].join(','))].join('\n') + '\n',
  );
  console.log(`\nResultados em ${PASTA_SAIDA}`);
}

principal().catch(e => {
  console.error(e);
  process.exit(1);
});
