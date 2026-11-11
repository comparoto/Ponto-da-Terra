/**
 * Artesãos via API real (antes: localStorage + dados mockados).
 */
import type { Artesao, Peca } from '@/types';
import { type ApiResult, request } from './http';
import { artesaoParaFront, type ArtesaoApi, produtoParaPeca, type ProdutoApi } from './mappers';

export const artesaoService = {
  async getArtesaos(): Promise<ApiResult<Artesao[]>> {
    const res = await request<ArtesaoApi[]>('/artesaos', { query: { limit: 100 } });
    return { ...res, data: res.data ? res.data.map(artesaoParaFront) : null };
  },

  /** Perfil público com as peças ativas (HU3). */
  async getArtesaoById(id: string): Promise<ApiResult<Artesao & { produtos: Peca[] }>> {
    const res = await request<ArtesaoApi & { produtos: ProdutoApi[] }>(`/artesaos/${id}`);
    return { ...res, data: res.data ? { ...artesaoParaFront(res.data), produtos: res.data.produtos.map(produtoParaPeca) } : null };
  },
};
