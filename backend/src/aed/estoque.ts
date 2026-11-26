import { IndiceHash } from './estruturas/indice-hash';
import { ListaEncadeada } from './estruturas/lista-encadeada';
import { Pilha } from './estruturas/pilha';

/**
 * Estoque de lotes com saída por validade (FEFO: o que vence primeiro sai primeiro), histórico de operações em
 * pilha (desfazer) e índice por código do produto.
 *
 * Como as estruturas se combinam:
 *  - IndiceHash ........ código do produto → lista de lotes (acha o produto em O(1) em média);
 *  - ListaEncadeada .... lotes do produto, mantidos em ordem de validade por INSERÇÃO ORDENADA;
 *  - Pilha ............. histórico: cada entrada/saída empilha o "como desfazer".
 */
export interface Lote {
  id: string;
  codigoProduto: string;
  quantidade: number;
  /** Data de validade. `null` = sem validade (vai para o fim da fila de saída). */
  validade: Date | null;
}

export interface Alocacao {
  loteId: string;
  quantidade: number;
}

export interface ResultadoSaida {
  codigoProduto: string;
  quantidade: number;
  alocacoes: Alocacao[];
}

export interface ConsultaEstoque {
  codigoProduto: string;
  quantidadeTotal: number;
  /** Lotes na ordem em que sairão (menor validade primeiro). */
  lotes: Lote[];
}

export interface OperacaoDoHistorico {
  tipo: 'entrada' | 'saida';
  descricao: string;
  desfazer: () => void;
}

export class EstoqueInsuficienteError extends Error {
  constructor(
    readonly codigoProduto: string,
    readonly solicitado: number,
    readonly disponivel: number,
  ) {
    super(`Estoque insuficiente para ${codigoProduto}: solicitado ${solicitado}, disponível ${disponivel}`);
    this.name = 'EstoqueInsuficienteError';
  }
}

/** Menor validade primeiro; lotes sem validade por último. */
export const compararPorValidade = (a: Lote, b: Lote): number => {
  if (a.validade === null && b.validade === null) return 0;
  if (a.validade === null) return 1;
  if (b.validade === null) return -1;
  return a.validade.getTime() - b.validade.getTime();
};

const inteiroPositivo = (n: number) => Number.isInteger(n) && n > 0;

export class EstoqueFefo {
  private readonly porProduto = new IndiceHash<ListaEncadeada<Lote>>();
  private readonly historico = new Pilha<OperacaoDoHistorico>();

  /** Quantas operações podem ser desfeitas. */
  get operacoesNoHistorico(): number {
    return this.historico.tamanho;
  }

  /**
   * Registra a entrada de um lote. O(1) em média para achar o produto + O(k) para inserir ordenado entre os
   * k lotes do produto (O(1) se a validade é a maior até então).
   */
  entrada(lote: Lote): void {
    if (!inteiroPositivo(lote.quantidade)) throw new RangeError('A quantidade do lote deve ser um inteiro positivo');
    const novo: Lote = { ...lote, validade: lote.validade ? new Date(lote.validade) : null };
    let lista = this.porProduto.obter(novo.codigoProduto);
    if (!lista) {
      lista = new ListaEncadeada<Lote>();
      this.porProduto.definir(novo.codigoProduto, lista);
    }
    lista.inserirOrdenado(novo, compararPorValidade);
    this.historico.empilhar({
      tipo: 'entrada',
      descricao: `entrada do lote ${novo.id} (${novo.quantidade} un. de ${novo.codigoProduto})`,
      desfazer: () => {
        this.porProduto.obter(novo.codigoProduto)?.remover(l => l.id === novo.id);
      },
    });
  }

  /**
   * Retira `quantidade` unidades do produto, consumindo primeiro os lotes de menor validade. Se o estoque total não
   * bastar, lança EstoqueInsuficienteError e NÃO altera nada. O(1) em média para achar o produto + O(k) lotes.
   */
  saida(codigoProduto: string, quantidade: number): ResultadoSaida {
    if (!inteiroPositivo(quantidade)) throw new RangeError('A quantidade da saída deve ser um inteiro positivo');
    const lista = this.porProduto.obter(codigoProduto);
    const disponivel = lista ? [...lista].reduce((soma, l) => soma + l.quantidade, 0) : 0;
    if (!lista || disponivel < quantidade) throw new EstoqueInsuficienteError(codigoProduto, quantidade, disponivel);

    const alocacoes: Alocacao[] = [];
    const esgotados: Lote[] = []; // lotes que acabaram (saem da lista), na ordem em que estavam
    let parcial: { lote: Lote; quantidadeAntes: number; retirada: number } | null = null;
    let faltam = quantidade;

    for (const lote of lista) {
      if (faltam === 0) break;
      const retirada = Math.min(lote.quantidade, faltam);
      alocacoes.push({ loteId: lote.id, quantidade: retirada });
      faltam -= retirada;
      if (retirada === lote.quantidade) esgotados.push(lote);
      else parcial = { lote, quantidadeAntes: lote.quantidade, retirada };
    }

    // aplica: os esgotados são sempre os primeiros da lista (a saída consome em ordem)
    for (let i = 0; i < esgotados.length; i++) lista.removerPrimeiro();
    if (parcial) parcial.lote.quantidade -= parcial.retirada;

    const parcialAplicado = parcial;
    this.historico.empilhar({
      tipo: 'saida',
      descricao: `saída de ${quantidade} un. de ${codigoProduto}`,
      desfazer: () => {
        // devolve os lotes esgotados ao início, na ordem original, e a quantidade do lote parcial
        for (let i = esgotados.length - 1; i >= 0; i--) lista.inserirNoInicio(esgotados[i]);
        if (parcialAplicado) parcialAplicado.lote.quantidade = parcialAplicado.quantidadeAntes;
      },
    });
    return { codigoProduto, quantidade, alocacoes };
  }

  /** Desfaz a última operação (entrada ou saída). O(1) + o custo de reverter a operação. */
  desfazer(): OperacaoDoHistorico | undefined {
    const operacao = this.historico.desempilhar();
    operacao?.desfazer();
    return operacao;
  }

  /** O(1) em média para achar o produto + O(k) para copiar os lotes. */
  consultar(codigoProduto: string): ConsultaEstoque {
    const lista = this.porProduto.obter(codigoProduto);
    const lotes = lista ? lista.paraArray().map(l => ({ ...l, validade: l.validade ? new Date(l.validade) : null })) : [];
    return { codigoProduto, quantidadeTotal: lotes.reduce((soma, l) => soma + l.quantidade, 0), lotes };
  }

  /** Códigos de produto com estoque cadastrado. */
  codigos(): string[] {
    return [...this.porProduto.entradas()].map(([codigo]) => codigo);
  }
}
