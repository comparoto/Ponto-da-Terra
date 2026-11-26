/**
 * Pilha LIFO (último a entrar, primeiro a sair) sobre um array.
 *
 * Papel no domínio: HISTÓRICO de operações do estoque. A última operação feita é a primeira a ser desfeita.
 *
 * Complexidade: empilhar, desempilhar, topo e tamanho são O(1) (amortizado no empilhar).
 */
export class Pilha<T> {
  private readonly itens: T[] = [];

  get tamanho(): number {
    return this.itens.length;
  }

  get vazia(): boolean {
    return this.itens.length === 0;
  }

  /** O(1) amortizado */
  empilhar(valor: T): void {
    this.itens.push(valor);
  }

  /** O(1). Devolve undefined se a pilha estiver vazia. */
  desempilhar(): T | undefined {
    return this.itens.pop();
  }

  /** O(1). Olha o topo sem remover. */
  topo(): T | undefined {
    return this.itens[this.itens.length - 1];
  }

  /** O(n). Do topo para a base (a ordem em que as operações seriam desfeitas). */
  paraArray(): T[] {
    return [...this.itens].reverse();
  }
}
