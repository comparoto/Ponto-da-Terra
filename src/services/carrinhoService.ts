/**
 * Cálculo do carrinho e do frete no servidor (TC08 / TC14).
 * O frontend envia apenas id e quantidade; preços e totais vêm do banco.
 */
import type { ItemCarrinho } from '@/types';
import { type ApiResult, request } from './http';

export type CotacaoFrete = { cep: string; valor: number; prazoDias: number; regiao: string; simulado: boolean };

export type CalculoCarrinho = {
  itens: {
    produtoId: string;
    titulo: string;
    imagemUrl: string | null;
    artesaoId: string;
    precoUnitario: number;
    quantidade: number;
    subtotal: number;
    estoqueDisponivel: number;
  }[];
  quantidadeItens: number;
  totalLiquido: number;
  frete: CotacaoFrete | null;
  totalGeral: number;
};

export const carrinhoService = {
  calcular(itens: ItemCarrinho[], cep?: string): Promise<ApiResult<CalculoCarrinho>> {
    return request<CalculoCarrinho>('/carrinho/calcular', {
      method: 'POST',
      body: { itens: itens.map(i => ({ produtoId: i.peca.id, quantidade: i.quantidade })), cep: cep || undefined },
    });
  },

  frete(cep: string, quantidade = 1): Promise<ApiResult<CotacaoFrete>> {
    return request<CotacaoFrete>('/frete', { query: { cep, quantidade } });
  },
};
