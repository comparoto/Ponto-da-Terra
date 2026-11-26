import { createHmac } from 'node:crypto';
import { parentPort, workerData } from 'node:worker_threads';
import type { EntradaDoWorker, SaidaDoWorker } from './reserva-concorrente';

/**
 * Código que roda DENTRO de cada thread. Cada thread recebe uma fatia dos pedidos e o MESMO bloco de memória
 * compartilhada (SharedArrayBuffer) com o estoque de cada produto.
 *
 * Para cada pedido a thread faz duas coisas:
 *  1. trabalho de CPU: assina o pedido (HMAC-SHA256 repetido), como numa conferência de integridade;
 *  2. reserva de estoque: lê o saldo, confere se basta e o decrementa.
 *
 * Modo SINCRONIZADO: o passo 2 é um laço de compare-and-swap (Atomics.compareExchange): a troca só vale se o saldo
 * ainda é o que a thread leu; se outra thread mexeu antes, tenta de novo. Nunca vende acima do saldo.
 *
 * Modo NÃO SINCRONIZADO (didático): lê o saldo, confere, assina o pedido e só então grava o novo saldo. Entre a
 * leitura e a escrita outra thread pode ter mudado o saldo: duas threads leem "10", ambas vendem 4 e ambas gravam
 * "6" (uma atualização é PERDIDA) ou ambas vendem os últimos itens (VENDA ACIMA DO ESTOQUE). É a condição de corrida.
 */
const entrada = workerData as EntradaDoWorker;
const estoque = new Int32Array(entrada.memoria);

function assinar(texto: string, rodadas: number): string {
  let assinatura = texto;
  for (let i = 0; i < rodadas; i++) assinatura = createHmac('sha256', entrada.chave).update(assinatura).digest('hex');
  return assinatura;
}

const vendidoPorProduto = new Array<number>(estoque.length).fill(0);
let recusados = 0;
let tentativasDeCas = 0;

for (const pedido of entrada.pedidos) {
  const { produto, quantidade } = pedido;
  if (entrada.sincronizado) {
    assinar(pedido.id, entrada.rodadasDeHash);
    for (;;) {
      const atual = Atomics.load(estoque, produto);
      if (atual < quantidade) {
        recusados++;
        break;
      }
      if (Atomics.compareExchange(estoque, produto, atual, atual - quantidade) === atual) {
        vendidoPorProduto[produto] += quantidade;
        break;
      }
      tentativasDeCas++; // outra thread alterou o saldo no meio: tenta de novo
    }
  } else {
    const atual = Atomics.load(estoque, produto); // 1) lê
    if (atual < quantidade) {
      recusados++;
    } else {
      assinar(pedido.id, entrada.rodadasDeHash); // 2) trabalho entre a leitura e a escrita (a janela da corrida)
      Atomics.store(estoque, produto, atual - quantidade); // 3) grava com base na leitura (talvez já velha)
      vendidoPorProduto[produto] += quantidade;
    }
  }
}

const saida: SaidaDoWorker = { vendidoPorProduto, recusados, tentativasDeCas };
parentPort?.postMessage(saida);
