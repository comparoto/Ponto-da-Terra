import { ListaEncadeada, type Comparador } from './lista-encadeada';

/**
 * Fila FIFO (primeiro a entrar, primeiro a sair) sobre um buffer circular.
 *
 * Papel no domínio: fila de PEDIDOS/REQUISIÇÕES de saída de estoque, atendidos na ordem de chegada.
 *
 * Complexidade: enfileirar, desenfileirar, espiar e tamanho são O(1) (amortizado no enfileirar, por causa do
 * crescimento do buffer). Um array comum com `shift()` custaria O(n) por remoção, porque desloca os elementos.
 */
export class Fila<T> {
  private buffer: (T | undefined)[];
  private inicio = 0;
  private quantidade = 0;

  constructor(capacidadeInicial = 16) {
    if (!Number.isInteger(capacidadeInicial) || capacidadeInicial < 1) throw new RangeError('A capacidade inicial deve ser um inteiro positivo');
    this.buffer = new Array<T | undefined>(capacidadeInicial);
  }

  get tamanho(): number {
    return this.quantidade;
  }

  get vazia(): boolean {
    return this.quantidade === 0;
  }

  /** O(1) amortizado */
  enfileirar(valor: T): void {
    if (this.quantidade === this.buffer.length) this.crescer();
    this.buffer[(this.inicio + this.quantidade) % this.buffer.length] = valor;
    this.quantidade++;
  }

  /** O(1). Devolve undefined se a fila estiver vazia. */
  desenfileirar(): T | undefined {
    if (this.quantidade === 0) return undefined;
    const valor = this.buffer[this.inicio];
    this.buffer[this.inicio] = undefined; // libera a referência para o coletor de lixo
    this.inicio = (this.inicio + 1) % this.buffer.length;
    this.quantidade--;
    return valor;
  }

  /** O(1). Olha o próximo elemento sem removê-lo. */
  espiar(): T | undefined {
    return this.quantidade === 0 ? undefined : this.buffer[this.inicio];
  }

  private crescer(): void {
    const novo = new Array<T | undefined>(this.buffer.length * 2);
    for (let i = 0; i < this.quantidade; i++) novo[i] = this.buffer[(this.inicio + i) % this.buffer.length];
    this.buffer = novo;
    this.inicio = 0;
  }
}

/**
 * Fila de prioridade por INSERÇÃO ORDENADA: a lista é mantida sempre ordenada, então o próximo a sair é o primeiro.
 *
 * Papel no domínio: fila de pedidos em que um pedido mais urgente passa na frente dos demais. Entre pedidos de
 * mesma prioridade vale a ordem de chegada (a inserção ordenada é estável).
 *
 * Complexidade: enfileirar O(n) no pior caso (procura a posição); desenfileirar e espiar O(1).
 * Alternativa mais rápida para volumes grandes: heap binário (enfileirar O(log n)); aqui a inserção ordenada é
 * a técnica pedida na atividade e é a mais simples de explicar e de testar.
 */
export class FilaDePrioridade<T> {
  private readonly lista = new ListaEncadeada<T>();

  /** `comparar(a, b) < 0` significa que `a` deve sair antes de `b`. */
  constructor(private readonly comparar: Comparador<T>) {}

  get tamanho(): number {
    return this.lista.tamanho;
  }

  get vazia(): boolean {
    return this.lista.vazia;
  }

  enfileirar(valor: T): void {
    this.lista.inserirOrdenado(valor, this.comparar);
  }

  desenfileirar(): T | undefined {
    return this.lista.removerPrimeiro();
  }

  espiar(): T | undefined {
    return this.lista.primeiro();
  }

  paraArray(): T[] {
    return this.lista.paraArray();
  }
}
