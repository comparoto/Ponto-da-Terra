export * from './artesao';
export * from './produto';

export interface ItemCarrinho {
  peca: import('./produto').Peca;
  quantidade: number;
}