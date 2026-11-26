import type { Comparador } from './lista-encadeada';

/**
 * Árvore binária de busca (ABB), sem balanceamento, com operações iterativas (sem recursão, para não estourar a
 * pilha de chamadas em árvores degeneradas).
 *
 * Papel no domínio: BUSCA ORDENADA de produtos por código. Além de encontrar um código, a ABB percorre os
 * produtos em ordem crescente (em ordem) e responde "qual o menor/maior código", o que a tabela hash não faz.
 *
 * Invariante: para todo nó, as chaves da subárvore esquerda são menores e as da direita são maiores.
 *
 * Complexidade (h = altura da árvore):
 *  - inserir, buscar, remover ........ O(h)
 *  - árvore equilibrada (chaves em ordem aleatória): h ≈ log₂ n  →  O(log n)
 *  - árvore degenerada (chaves inseridas já em ordem): h = n     →  O(n), vira uma lista
 *  - emOrdem ......................... O(n)
 * Esta ABB NÃO se rebalanceia. Uma árvore AVL ou rubro-negra garantiria O(log n) sempre, ao custo de rotações.
 */
interface No<K, V> {
  chave: K;
  valor: V;
  esquerda: No<K, V> | null;
  direita: No<K, V> | null;
}

export class ArvoreBinariaBusca<K, V> {
  private raiz: No<K, V> | null = null;
  private quantidade = 0;

  constructor(private readonly comparar: Comparador<K>) {}

  get tamanho(): number {
    return this.quantidade;
  }

  /** O(h). Se a chave já existe, substitui o valor. */
  inserir(chave: K, valor: V): void {
    const novo: No<K, V> = { chave, valor, esquerda: null, direita: null };
    if (!this.raiz) {
      this.raiz = novo;
      this.quantidade++;
      return;
    }
    let atual = this.raiz;
    for (;;) {
      const c = this.comparar(chave, atual.chave);
      if (c === 0) {
        atual.valor = valor;
        return;
      }
      const lado = c < 0 ? 'esquerda' : 'direita';
      const proximo = atual[lado];
      if (!proximo) {
        atual[lado] = novo;
        this.quantidade++;
        return;
      }
      atual = proximo;
    }
  }

  /** O(h) */
  buscar(chave: K): V | undefined {
    let atual = this.raiz;
    while (atual) {
      const c = this.comparar(chave, atual.chave);
      if (c === 0) return atual.valor;
      atual = c < 0 ? atual.esquerda : atual.direita;
    }
    return undefined;
  }

  /** O(h). Devolve true se a chave existia. */
  remover(chave: K): boolean {
    let pai: No<K, V> | null = null;
    let atual = this.raiz;
    while (atual && this.comparar(chave, atual.chave) !== 0) {
      pai = atual;
      atual = this.comparar(chave, atual.chave) < 0 ? atual.esquerda : atual.direita;
    }
    if (!atual) return false;

    // dois filhos: troca pelo sucessor em ordem (o menor da subárvore direita) e remove o sucessor
    if (atual.esquerda && atual.direita) {
      let paiSucessor: No<K, V> = atual;
      let sucessor: No<K, V> = atual.direita;
      while (sucessor.esquerda) {
        paiSucessor = sucessor;
        sucessor = sucessor.esquerda;
      }
      atual.chave = sucessor.chave;
      atual.valor = sucessor.valor;
      pai = paiSucessor;
      atual = sucessor;
    }

    // agora `atual` tem no máximo um filho: o filho (ou null) ocupa o lugar dele
    const filho = atual.esquerda ?? atual.direita;
    if (!pai) this.raiz = filho;
    else if (pai.esquerda === atual) pai.esquerda = filho;
    else pai.direita = filho;
    this.quantidade--;
    return true;
  }

  /** O(h) */
  menor(): { chave: K; valor: V } | undefined {
    let atual = this.raiz;
    while (atual?.esquerda) atual = atual.esquerda;
    return atual ? { chave: atual.chave, valor: atual.valor } : undefined;
  }

  /** O(h) */
  maior(): { chave: K; valor: V } | undefined {
    let atual = this.raiz;
    while (atual?.direita) atual = atual.direita;
    return atual ? { chave: atual.chave, valor: atual.valor } : undefined;
  }

  /** O(n). Percurso em ordem: devolve as chaves em ordem crescente. */
  *emOrdem(): Generator<[K, V]> {
    const pilha: No<K, V>[] = [];
    let atual = this.raiz;
    while (atual || pilha.length > 0) {
      while (atual) {
        pilha.push(atual);
        atual = atual.esquerda;
      }
      const no = pilha.pop();
      if (!no) break;
      yield [no.chave, no.valor];
      atual = no.direita;
    }
  }

  /** O(n). Altura = número de nós do caminho mais longo da raiz até uma folha (árvore vazia = 0). */
  altura(): number {
    if (!this.raiz) return 0;
    let maior = 0;
    const pilha: { no: No<K, V>; nivel: number }[] = [{ no: this.raiz, nivel: 1 }];
    while (pilha.length > 0) {
      const item = pilha.pop();
      if (!item) break;
      maior = Math.max(maior, item.nivel);
      if (item.no.esquerda) pilha.push({ no: item.no.esquerda, nivel: item.nivel + 1 });
      if (item.no.direita) pilha.push({ no: item.no.direita, nivel: item.nivel + 1 });
    }
    return maior;
  }
}
