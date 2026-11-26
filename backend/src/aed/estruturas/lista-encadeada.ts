/**
 * Lista simplesmente encadeada com ponteiro para a cauda.
 *
 * Papel no domínio: representa o ESTOQUE de lotes de um produto (um lote após o outro, ordenados por validade).
 *
 * Complexidade (n = número de elementos):
 *  - inserirNoInicio / inserirNoFim / removerPrimeiro ......... O(1)
 *  - inserirOrdenado ........................................ O(n) no pior caso; O(1) se o valor já é o maior (cauda)
 *  - buscar / remover(predicado) ............................ O(n)
 *  - tamanho ................................................ O(1)
 *
 * Por que lista encadeada e não array: a inserção no meio e a remoção do primeiro elemento não deslocam os
 * demais elementos de memória. O custo é não ter acesso direto por posição (não há "lista[i]" em O(1)).
 */
interface No<T> {
  valor: T;
  proximo: No<T> | null;
}

export type Comparador<T> = (a: T, b: T) => number;

export class ListaEncadeada<T> implements Iterable<T> {
  private cabeca: No<T> | null = null;
  private cauda: No<T> | null = null;
  private quantidade = 0;

  get tamanho(): number {
    return this.quantidade;
  }

  get vazia(): boolean {
    return this.quantidade === 0;
  }

  /** O(1) */
  inserirNoInicio(valor: T): void {
    const no: No<T> = { valor, proximo: this.cabeca };
    this.cabeca = no;
    if (!this.cauda) this.cauda = no;
    this.quantidade++;
  }

  /** O(1) */
  inserirNoFim(valor: T): void {
    const no: No<T> = { valor, proximo: null };
    if (this.cauda) this.cauda.proximo = no;
    else this.cabeca = no;
    this.cauda = no;
    this.quantidade++;
  }

  /**
   * Inserção ordenada (insertion sort incremental): coloca o valor na posição certa, mantendo a lista em ordem
   * crescente segundo `comparar`. É ESTÁVEL: um valor igual a outros já presentes fica depois deles.
   * O(n) no pior caso; O(1) quando o valor é maior ou igual ao último (entradas já ordenadas).
   */
  inserirOrdenado(valor: T, comparar: Comparador<T>): void {
    if (!this.cabeca || !this.cauda) {
      this.inserirNoInicio(valor);
      return;
    }
    if (comparar(this.cauda.valor, valor) <= 0) {
      this.inserirNoFim(valor);
      return;
    }
    if (comparar(valor, this.cabeca.valor) < 0) {
      this.inserirNoInicio(valor);
      return;
    }
    // avança enquanto o próximo elemento for menor ou igual ao valor (mantém a estabilidade)
    let anterior: No<T> = this.cabeca;
    while (anterior.proximo && comparar(anterior.proximo.valor, valor) <= 0) anterior = anterior.proximo;
    const no: No<T> = { valor, proximo: anterior.proximo };
    anterior.proximo = no;
    if (!no.proximo) this.cauda = no;
    this.quantidade++;
  }

  /** O(1). Devolve undefined se a lista estiver vazia. */
  removerPrimeiro(): T | undefined {
    const no = this.cabeca;
    if (!no) return undefined;
    this.cabeca = no.proximo;
    if (!this.cabeca) this.cauda = null;
    this.quantidade--;
    return no.valor;
  }

  /** O(n). Remove o primeiro elemento que satisfaz o predicado e o devolve. */
  remover(predicado: (valor: T) => boolean): T | undefined {
    let anterior: No<T> | null = null;
    let atual = this.cabeca;
    while (atual) {
      if (predicado(atual.valor)) {
        if (anterior) anterior.proximo = atual.proximo;
        else this.cabeca = atual.proximo;
        if (atual === this.cauda) this.cauda = anterior;
        this.quantidade--;
        return atual.valor;
      }
      anterior = atual;
      atual = atual.proximo;
    }
    return undefined;
  }

  /** O(n) */
  buscar(predicado: (valor: T) => boolean): T | undefined {
    for (const valor of this) if (predicado(valor)) return valor;
    return undefined;
  }

  /** O(1) */
  primeiro(): T | undefined {
    return this.cabeca?.valor;
  }

  /** O(1) */
  ultimo(): T | undefined {
    return this.cauda?.valor;
  }

  /** O(n) */
  paraArray(): T[] {
    return [...this];
  }

  *[Symbol.iterator](): Iterator<T> {
    let atual = this.cabeca;
    while (atual) {
      yield atual.valor;
      atual = atual.proximo;
    }
  }
}
