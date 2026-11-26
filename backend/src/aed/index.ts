/**
 * Módulo AED (Algoritmos e Estruturas de Dados): estruturas implementadas à mão e o estoque que as usa.
 * É independente do produto: nenhuma rota importa este módulo. Para consumir:
 *
 *   import { EstoqueFefo, ProcessadorDePedidos } from './aed';
 *
 * Documentação, complexidade e benchmark: docs/md/RELATORIO_AED.md
 */
export { ListaEncadeada, type Comparador } from './estruturas/lista-encadeada';
export { Fila, FilaDePrioridade } from './estruturas/fila';
export { Pilha } from './estruturas/pilha';
export { IndiceHash, hashFnv1a, type EstatisticasHash } from './estruturas/indice-hash';
export { ArvoreBinariaBusca } from './estruturas/arvore-binaria-busca';
export { buscaLinear, buscaBinaria, limiteInferior } from './estruturas/busca';
export {
  EstoqueFefo,
  EstoqueInsuficienteError,
  compararPorValidade,
  type Alocacao,
  type ConsultaEstoque,
  type Lote,
  type OperacaoDoHistorico,
  type ResultadoSaida,
} from './estoque';
export { ProcessadorDePedidos, type Pedido, type ResultadoPedido } from './pedidos';
