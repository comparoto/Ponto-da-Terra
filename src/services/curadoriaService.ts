/**
 * Curadoria de catálogo pelo administrador (HU8 / TC04).
 */
import type { Peca, StatusProduto } from '@/types';
import { type ApiResult, request } from './http';
import { produtoParaPeca, type ProdutoApi } from './mappers';

export const curadoriaService = {
  async fila(status: StatusProduto = 'PENDENTE'): Promise<ApiResult<Peca[]>> {
    const res = await request<ProdutoApi[]>('/admin/curadoria', { query: { status, limit: 50 } });
    return { ...res, data: res.data ? res.data.map(produtoParaPeca) : null };
  },

  async aprovar(id: string): Promise<ApiResult<Peca>> {
    const res = await request<ProdutoApi>(`/admin/produtos/${id}/aprovar`, { method: 'POST' });
    return { ...res, data: res.data ? produtoParaPeca(res.data) : null };
  },

  /** A justificativa é obrigatória (mínimo de 10 caracteres) e é enviada ao artesão. */
  async reprovar(id: string, justificativa: string): Promise<ApiResult<Peca>> {
    const res = await request<ProdutoApi>(`/admin/produtos/${id}/reprovar`, { method: 'POST', body: { justificativa } });
    return { ...res, data: res.data ? produtoParaPeca(res.data) : null };
  },
};
