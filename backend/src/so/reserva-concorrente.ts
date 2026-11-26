import { resolve } from 'node:path';
import { Worker } from 'node:worker_threads';

/**
 * Processamento concorrente de pedidos com THREADS reais (worker_threads) e memória compartilhada.
 * Módulo de Sistemas Operacionais: demonstra threads, sincronização e condição de corrida. É independente do
 * produto (nenhuma rota o importa). Relatório: docs/md/RELATORIO_SO.md
 *
 * Observação: o BullMQ `Worker` usado em src/worker.ts NÃO é uma thread; é um consumidor de fila em outro processo.
 * Aqui as threads são do sistema operacional, rodando em núcleos diferentes e compartilhando memória.
 */
export interface PedidoDeReserva {
  id: string;
  /** Índice do produto (posição no vetor de estoque). */
  produto: number;
  quantidade: number;
}

export interface EntradaDoWorker {
  memoria: SharedArrayBuffer;
  pedidos: PedidoDeReserva[];
  sincronizado: boolean;
  rodadasDeHash: number;
  chave: string;
}

export interface SaidaDoWorker {
  vendidoPorProduto: number[];
  recusados: number;
  tentativasDeCas: number;
}

export interface OpcoesDeReserva {
  threads: number;
  /** `true` = compare-and-swap atômico; `false` = leitura/escrita sem sincronização (mostra a corrida). */
  sincronizado: boolean;
  /** Quanto trabalho de CPU cada pedido faz (rodadas de HMAC-SHA256). */
  rodadasDeHash?: number;
}

export interface ResultadoDeReserva {
  threads: number;
  sincronizado: boolean;
  pedidos: number;
  duracaoMs: number;
  estoqueInicial: number[];
  estoqueFinal: number[];
  unidadesVendidas: number;
  pedidosRecusados: number;
  tentativasDeCas: number;
  /** Produtos cujo total vendido passou do estoque inicial (venda acima do estoque). */
  produtosVendidosAcimaDoEstoque: number;
  /** Unidades vendidas além do estoque inicial, somadas. */
  unidadesAcimaDoEstoque: number;
  /** Unidades cuja baixa foi perdida: (inicial − final) deveria ser igual ao vendido. */
  atualizacoesPerdidas: number;
  /** Conservação do estoque: por produto, inicial − final = vendido, e nunca vendeu acima do saldo. */
  consistente: boolean;
}

/** Pedidos sintéticos determinísticos (PRNG com semente fixa). */
export function gerarPedidos(quantidade: number, produtos: number, semente = 42): PedidoDeReserva[] {
  let s = semente >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: quantidade }, (_, i) => ({
    id: `PED-${i}`,
    produto: Math.floor(rand() * produtos),
    quantidade: 1 + Math.floor(rand() * 3),
  }));
}

/** Estoque inicial que cobre só uma fração da demanda de cada produto (para haver disputa pelas últimas unidades). */
export function estoqueParaDemanda(pedidos: PedidoDeReserva[], produtos: number, fracao = 0.6): number[] {
  const demanda = new Array<number>(produtos).fill(0);
  for (const p of pedidos) demanda[p.produto] += p.quantidade;
  return demanda.map(d => Math.max(1, Math.floor(d * fracao)));
}

/** Em TypeScript (jest, tsx) o worker é o .ts e precisa do carregador `tsx`; compilado, é o .js. */
function criarWorker(entrada: EntradaDoWorker): Worker {
  const emTypeScript = __filename.endsWith('.ts');
  const arquivo = resolve(__dirname, emTypeScript ? 'reserva-worker.ts' : 'reserva-worker.js');
  return new Worker(arquivo, { workerData: entrada, execArgv: emTypeScript ? ['--import', 'tsx'] : [] });
}

function executarWorker(entrada: EntradaDoWorker): Promise<SaidaDoWorker> {
  return new Promise((resolver, rejeitar) => {
    const worker = criarWorker(entrada);
    worker.once('message', resolver);
    worker.once('error', rejeitar);
    worker.once('exit', codigo => {
      if (codigo !== 0) rejeitar(new Error(`Thread terminou com código ${codigo}`));
    });
  });
}

/**
 * Distribui os pedidos entre `threads` threads (round-robin) e reserva o estoque compartilhado. Todas as threads
 * começam o trabalho juntas: o relógio mede do disparo até a última terminar (inclui a criação das threads).
 */
export async function reservarEmThreads(
  pedidos: PedidoDeReserva[],
  estoqueInicial: number[],
  opcoes: OpcoesDeReserva,
): Promise<ResultadoDeReserva> {
  if (!Number.isInteger(opcoes.threads) || opcoes.threads < 1) throw new RangeError('threads deve ser um inteiro >= 1');
  const memoria = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * estoqueInicial.length);
  const estoque = new Int32Array(memoria);
  estoqueInicial.forEach((q, i) => Atomics.store(estoque, i, q));

  const fatias: PedidoDeReserva[][] = Array.from({ length: opcoes.threads }, () => []);
  pedidos.forEach((p, i) => fatias[i % opcoes.threads].push(p));

  const inicio = performance.now();
  const saidas = await Promise.all(
    fatias.map(fatia =>
      executarWorker({ memoria, pedidos: fatia, sincronizado: opcoes.sincronizado, rodadasDeHash: opcoes.rodadasDeHash ?? 200, chave: 'chave-de-teste' }),
    ),
  );
  const duracaoMs = performance.now() - inicio;

  const estoqueFinal = Array.from(estoque);
  const vendidoPorProduto = estoqueInicial.map((_, p) => saidas.reduce((s, x) => s + x.vendidoPorProduto[p], 0));
  const unidadesVendidas = vendidoPorProduto.reduce((s, v) => s + v, 0);
  // Conservação por produto: o que saiu do saldo (inicial − final) tem de ser igual ao que as threads dizem ter vendido.
  const atualizacoesPerdidas = vendidoPorProduto.reduce((s, v, p) => s + Math.abs(v - (estoqueInicial[p] - estoqueFinal[p])), 0);
  const acima = vendidoPorProduto.map((v, p) => Math.max(0, v - estoqueInicial[p]));
  const unidadesAcimaDoEstoque = acima.reduce((s, x) => s + x, 0);
  const produtosVendidosAcimaDoEstoque = acima.filter(x => x > 0).length;

  return {
    threads: opcoes.threads,
    sincronizado: opcoes.sincronizado,
    pedidos: pedidos.length,
    duracaoMs,
    estoqueInicial,
    estoqueFinal,
    unidadesVendidas,
    pedidosRecusados: saidas.reduce((s, x) => s + x.recusados, 0),
    tentativasDeCas: saidas.reduce((s, x) => s + x.tentativasDeCas, 0),
    produtosVendidosAcimaDoEstoque,
    unidadesAcimaDoEstoque,
    atualizacoesPerdidas,
    consistente: atualizacoesPerdidas === 0 && unidadesAcimaDoEstoque === 0,
  };
}
