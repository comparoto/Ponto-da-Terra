/**
 * Tabela hash com encadeamento separado, implementada do zero (sem usar `Map`).
 *
 * Papel no domínio: ÍNDICE DE ESTOQUE por código do produto. Dado o código, encontra o estoque do produto sem
 * percorrer todos os produtos.
 *
 * Como funciona: a função hash (FNV-1a, 32 bits) transforma o código em um número; o resto da divisão pelo
 * tamanho da tabela escolhe o "balde". Códigos que caem no mesmo balde (colisão) ficam em uma lista pequena.
 * Quando o fator de carga (elementos ÷ baldes) passa de 0,75, a tabela dobra de tamanho e redistribui os
 * elementos, para as listas continuarem curtas.
 *
 * Complexidade: definir, obter, remover e tem são O(1) em média (O(n) no pior caso, se todas as chaves
 * colidissem); o redimensionamento custa O(n) e é amortizado.
 */
interface Entrada<V> {
  chave: string;
  valor: V;
}

export interface EstatisticasHash {
  elementos: number;
  baldes: number;
  fatorDeCarga: number;
  baldesOcupados: number;
  maiorCadeia: number;
  colisoes: number;
}

const FATOR_DE_CARGA_MAXIMO = 0.75;

/** FNV-1a de 32 bits: simples, rápida e com boa dispersão para textos curtos como códigos de produto. */
export function hashFnv1a(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export class IndiceHash<V> {
  private baldes: Entrada<V>[][];
  private quantidade = 0;

  constructor(capacidadeInicial = 16) {
    if (!Number.isInteger(capacidadeInicial) || capacidadeInicial < 1) throw new RangeError('A capacidade inicial deve ser um inteiro positivo');
    this.baldes = Array.from({ length: capacidadeInicial }, () => []);
  }

  get tamanho(): number {
    return this.quantidade;
  }

  private balde(chave: string, baldes: Entrada<V>[][] = this.baldes): Entrada<V>[] {
    return baldes[hashFnv1a(chave) % baldes.length];
  }

  /** O(1) em média. Insere ou substitui o valor da chave. */
  definir(chave: string, valor: V): void {
    const balde = this.balde(chave);
    const existente = balde.find(e => e.chave === chave);
    if (existente) {
      existente.valor = valor;
      return;
    }
    balde.push({ chave, valor });
    this.quantidade++;
    if (this.quantidade / this.baldes.length > FATOR_DE_CARGA_MAXIMO) this.redimensionar();
  }

  /** O(1) em média */
  obter(chave: string): V | undefined {
    return this.balde(chave).find(e => e.chave === chave)?.valor;
  }

  /** O(1) em média */
  tem(chave: string): boolean {
    return this.balde(chave).some(e => e.chave === chave);
  }

  /** O(1) em média. Devolve true se a chave existia. */
  remover(chave: string): boolean {
    const balde = this.balde(chave);
    const i = balde.findIndex(e => e.chave === chave);
    if (i < 0) return false;
    balde.splice(i, 1);
    this.quantidade--;
    return true;
  }

  /** O(n) */
  *entradas(): Generator<[string, V]> {
    for (const balde of this.baldes) for (const e of balde) yield [e.chave, e.valor];
  }

  /** O(n). Mostra como as chaves se distribuíram (útil para a análise de colisões). */
  estatisticas(): EstatisticasHash {
    let ocupados = 0;
    let maior = 0;
    let colisoes = 0;
    for (const balde of this.baldes) {
      if (balde.length > 0) ocupados++;
      if (balde.length > 1) colisoes += balde.length - 1;
      maior = Math.max(maior, balde.length);
    }
    return { elementos: this.quantidade, baldes: this.baldes.length, fatorDeCarga: this.quantidade / this.baldes.length, baldesOcupados: ocupados, maiorCadeia: maior, colisoes };
  }

  private redimensionar(): void {
    const novos: Entrada<V>[][] = Array.from({ length: this.baldes.length * 2 }, () => []);
    for (const balde of this.baldes) for (const e of balde) this.balde(e.chave, novos).push(e);
    this.baldes = novos;
  }
}
