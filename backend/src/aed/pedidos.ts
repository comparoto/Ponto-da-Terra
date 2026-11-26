import { EstoqueInsuficienteError, type Alocacao, type EstoqueFefo } from './estoque';
import { FilaDePrioridade } from './estruturas/fila';

/**
 * Fila de pedidos de saída de estoque, atendidos por prioridade (inserção ordenada) e, entre pedidos de mesma
 * prioridade, pela ordem de chegada.
 */
export interface Pedido {
  id: string;
  codigoProduto: string;
  quantidade: number;
  /** 1 = mais urgente; números maiores = menos urgente. */
  prioridade: number;
}

export interface ResultadoPedido {
  pedido: Pedido;
  status: 'atendido' | 'recusado';
  motivo?: string;
  alocacoes: Alocacao[];
}

interface PedidoNaFila {
  pedido: Pedido;
  ordemDeChegada: number;
}

const antes = (a: PedidoNaFila, b: PedidoNaFila) => a.pedido.prioridade - b.pedido.prioridade || a.ordemDeChegada - b.ordemDeChegada;

export class ProcessadorDePedidos {
  private readonly fila = new FilaDePrioridade<PedidoNaFila>(antes);
  private contador = 0;

  get pendentes(): number {
    return this.fila.tamanho;
  }

  /** O(n) no pior caso (inserção ordenada). */
  enfileirar(pedido: Pedido): void {
    if (!Number.isInteger(pedido.prioridade) || pedido.prioridade < 1) throw new RangeError('A prioridade deve ser um inteiro maior ou igual a 1');
    this.fila.enfileirar({ pedido, ordemDeChegada: this.contador++ });
  }

  /** Próximo pedido a ser atendido, sem retirá-lo da fila. */
  proximo(): Pedido | undefined {
    return this.fila.espiar()?.pedido;
  }

  /** Atende o pedido de maior prioridade. Se faltar estoque, o pedido é recusado e o estoque não muda. */
  processarProximo(estoque: EstoqueFefo): ResultadoPedido | undefined {
    const item = this.fila.desenfileirar();
    if (!item) return undefined;
    try {
      const { alocacoes } = estoque.saida(item.pedido.codigoProduto, item.pedido.quantidade);
      return { pedido: item.pedido, status: 'atendido', alocacoes };
    } catch (e) {
      if (e instanceof EstoqueInsuficienteError) return { pedido: item.pedido, status: 'recusado', motivo: e.message, alocacoes: [] };
      throw e;
    }
  }

  processarTodos(estoque: EstoqueFefo): ResultadoPedido[] {
    const resultados: ResultadoPedido[] = [];
    for (let r = this.processarProximo(estoque); r; r = this.processarProximo(estoque)) resultados.push(r);
    return resultados;
  }
}
