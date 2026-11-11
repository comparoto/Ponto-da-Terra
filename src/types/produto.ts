export type StatusProduto = 'PENDENTE' | 'ATIVO' | 'REJEITADO';

export interface Peca {
  id: string;
  nome: string;
  preco: number;
  imagemUrl: string;
  imagensUrls?: string[];
  categoria?: string;
  categoriaId?: string;
  artesaoId?: string;
  artesaoNome?: string;
  artesaoCidade?: string;
  descricao?: string;
  dimensoes?: string;
  material?: string;
  /** Técnica artesanal (HU1/HU2) */
  tecnica?: string;
  /** Polo de origem em Pernambuco (HU1/HU2) */
  poloOrigem?: string;
  /** Quantidade disponível em estoque (HU4) */
  estoque?: number;
  emEstoque?: boolean;
  /** Status de curadoria (visível ao dono e ao admin) */
  status?: StatusProduto;
  justificativaCuradoria?: string;
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
