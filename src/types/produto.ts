import { Artesao } from './artesao';

export interface Peca {
  id: string;
  nome: string;
  preco: number;
  imagemUrl: string;
  categoria?: string;
  artesaoId?: string;
  artesaoNome?: string;
  artesaoCidade?: string;
  descricao?: string;
  dimensoes?: string;
  material?: string;
  emEstoque?: boolean;
}

export type Produto = Peca;

export interface FiltrosProduto {
  termoBusca?: string;
  categoria?: string;
  artesaoId?: string;
  precoMin?: number;
  precoMax?: number;
  ordenacao?: 'recentes' | 'preco-asc' | 'preco-desc' | 'nome';
}
