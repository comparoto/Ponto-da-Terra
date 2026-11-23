/**
 * Produtos via API real (antes: localStorage + dados mockados).
 */
import type { Peca, StatusProduto } from '@/types';
import { type ApiResult, request } from './http';
import { produtoParaPeca, type ProdutoApi } from './mappers';

export const CATEGORIAS = ['Todas', 'Cerâmica & Barro', 'Escultura & Madeira', 'Renda & Têxtil', 'Cestaria & Palha', 'Xilogravura'];

/** Converte ApiResult<ProdutoApi[]> → ApiResult<Peca[]> preservando meta/erros. */
const mapearLista = (res: ApiResult<ProdutoApi[]>): ApiResult<Peca[]> => ({ ...res, data: res.data ? res.data.map(produtoParaPeca) : null });
const mapearUm = (res: ApiResult<ProdutoApi>): ApiResult<Peca> => ({ ...res, data: res.data ? produtoParaPeca(res.data) : null });

export interface DadosPeca {
  nome: string;
  preco: number;
  categoriaId?: string;
  tecnica: string;
  poloOrigem: string;
  descricao?: string;
  material?: string;
  dimensoes?: string;
}

const corpoProduto = (d: DadosPeca) => ({
  titulo: d.nome,
  preco: d.preco,
  categoriaId: d.categoriaId || undefined,
  tecnica: d.tecnica,
  poloOrigem: d.poloOrigem,
  descricao: d.descricao || undefined,
  materiaisUtilizados: d.material || undefined,
  dimensoes: d.dimensoes || undefined,
});

export const produtoService = {
  /** Vitrine pública: todas as peças aprovadas (percorre as páginas da API). */
  async getProdutos(): Promise<ApiResult<Peca[]>> {
    const todas: Peca[] = [];
    for (let page = 1; ; page++) {
      const res = mapearLista(await request<ProdutoApi[]>('/produtos', { query: { page, limit: 50 } }));
      if (!res.success || !res.data) return res;
      todas.push(...res.data);
      if (!res.meta || page >= res.meta.totalPages) return { ...res, data: todas };
    }
  },

  async getProdutoById(id: string): Promise<ApiResult<Peca>> {
    return mapearUm(await request<ProdutoApi>(`/produtos/${id}`));
  },

  async getCategorias(): Promise<ApiResult<{ id: string; nome: string }[]>> {
    return request('/categorias');
  },

  getCategoriasFixas: (): string[] => CATEGORIAS,

  // ───── Artesão ─────

  async listarMinhas(status?: StatusProduto): Promise<ApiResult<Peca[]>> {
    return mapearLista(await request<ProdutoApi[]>('/artesao/produtos', { query: { limit: 50, status } }));
  },

  /** Cria a peça (nasce PENDENTE, aguardando curadoria) e envia a foto. */
  async criar(dados: DadosPeca, estoque: number, foto?: File): Promise<ApiResult<Peca>> {
    const res = mapearUm(await request<ProdutoApi>('/produtos', { method: 'POST', body: { ...corpoProduto(dados), estoque } }));
    if (!res.success || !res.data || !foto) return res;
    return this.enviarFoto(res.data.id, foto, true);
  },

  /** Edita a peça (volta para PENDENTE) e, se houver nova foto, a substitui. */
  async atualizar(id: string, dados: DadosPeca, estoque: number, foto?: File): Promise<ApiResult<Peca>> {
    const res = mapearUm(await request<ProdutoApi>(`/produtos/${id}`, { method: 'PUT', body: corpoProduto(dados) }));
    if (!res.success) return res;
    const est = mapearUm(await request<ProdutoApi>(`/produtos/${id}/estoque`, { method: 'PATCH', body: { quantidade: estoque } }));
    if (!est.success || !foto) return est;
    return this.enviarFoto(id, foto, true);
  },

  async ajustarEstoque(id: string, quantidade: number): Promise<ApiResult<Peca>> {
    return mapearUm(await request<ProdutoApi>(`/produtos/${id}/estoque`, { method: 'PATCH', body: { quantidade } }));
  },

  async enviarFoto(id: string, foto: File, substituir = false): Promise<ApiResult<Peca>> {
    const form = new FormData();
    form.append('imagem', foto);
    return mapearUm(await request<ProdutoApi>(`/produtos/${id}/imagens`, { method: 'POST', form, query: { substituir: String(substituir) } }));
  },

  async excluir(id: string): Promise<ApiResult<null>> {
    return request<null>(`/produtos/${id}`, { method: 'DELETE' });
  },
};
