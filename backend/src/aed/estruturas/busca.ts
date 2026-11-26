import type { Comparador } from './lista-encadeada';

/**
 * Busca linear: percorre o array do início ao fim até achar. O(n). Funciona em qualquer array.
 * Devolve o índice do elemento ou -1.
 */
export function buscaLinear<T>(itens: readonly T[], predicado: (item: T) => boolean): number {
  for (let i = 0; i < itens.length; i++) if (predicado(itens[i])) return i;
  return -1;
}

/**
 * Busca binária: a cada passo compara com o elemento do meio e descarta metade do array. O(log n).
 * EXIGE o array ordenado de forma crescente segundo `comparar`. Devolve o índice do elemento ou -1.
 * (Se houver elementos iguais, devolve o índice de algum deles.)
 */
export function buscaBinaria<T, A>(itens: readonly T[], alvo: A, compararComAlvo: (item: T, alvo: A) => number): number {
  let baixo = 0;
  let alto = itens.length - 1;
  while (baixo <= alto) {
    const meio = baixo + ((alto - baixo) >> 1);
    const c = compararComAlvo(itens[meio], alvo);
    if (c === 0) return meio;
    if (c < 0) baixo = meio + 1;
    else alto = meio - 1;
  }
  return -1;
}

/**
 * Menor índice cujo elemento NÃO é menor que o alvo (ponto de inserção em um array ordenado). O(log n).
 * Útil para inserir mantendo a ordem sem percorrer todo o array.
 */
export function limiteInferior<T>(itens: readonly T[], valor: T, comparar: Comparador<T>): number {
  let baixo = 0;
  let alto = itens.length;
  while (baixo < alto) {
    const meio = baixo + ((alto - baixo) >> 1);
    if (comparar(itens[meio], valor) < 0) baixo = meio + 1;
    else alto = meio;
  }
  return baixo;
}
