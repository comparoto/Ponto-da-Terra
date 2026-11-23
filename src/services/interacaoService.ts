/**
 * Avaliações (HU17), contato com o produtor (HU14), notificações, painel do artesão
 * (indicadores HU18, checklist HU15) e administração (usuários HU16, dashboard HU9).
 */
import type { Peca } from '@/types';
import { type ApiResult, request } from './http';
import { produtoParaPeca, type ProdutoApi } from './mappers';

export type ResumoAvaliacoes = {
  media: number;
  total: number;
  avaliacoes: { id: string; nota: number; comentario: string | null; data: string; autor: string }[];
};

export type Notificacao = { id: string; tipoEvento: string; payload: Record<string, unknown>; lida: boolean; dataEnvio: string };

export type MensagemRecebida = {
  id: string;
  mensagem: string;
  dataEnvio: string;
  produto: { id: string; titulo: string };
  comprador: { nome: string; email: string };
};

export type Indicadores = {
  faturamentoTotal: number;
  pedidosPagos: number;
  pedidosConcluidos: number;
  taxaConclusao: number;
  faturamentoPorMes: { mes: string; receita: number; pedidos: number }[];
  pecasMaisVendidas: { produtoId: string; titulo: string; quantidade: number }[];
  pedidosPorPolo: { polo: string; pedidos: number; receita: number }[];
  mensagem: string | null;
};

export type Checklist = { itensDisponiveis: string[]; itensConcluidos: string[]; percentualConclusao: number; atualizadoEm: string | null };

export type UsuarioAdmin = {
  id: string;
  nome: string;
  email: string;
  tipo: 'ADMIN' | 'ARTESAO' | 'CONSUMIDOR';
  status: 'ATIVO' | 'INATIVO' | 'SUSPENSO';
  motivoSuspensao: string | null;
  dataCadastro: string;
  produtosAtivos: number;
  statusCadastro: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | null;
};

export type CadastroArtesao = {
  artesaoId: string;
  usuarioId: string;
  nome: string;
  email: string;
  cidade: string;
  estado: string;
  especialidade: string | null;
  biografia: string | null;
  statusCadastro: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  motivoCadastro: string | null;
  pecasCadastradas: number;
  dataCadastro: string;
};

export type MetricasAdmin = {
  receitaBruta: number;
  pedidosPagos: number;
  pedidosConcluidos: number;
  novosArtesaos: number;
  ticketMedio: number;
  artesaosMaisAtivos: { artesaoId: string; nome: string; receita: number; pedidos: number }[];
  pecasMaisVendidas: { produtoId: string; titulo: string; quantidade: number }[];
  termosMaisBuscados: { termo: string; buscas: number }[];
  pedidosPorStatus: Record<string, number>;
  receitaPorDia: { dia: string; receita: number; pedidos: number }[];
  geradoEmMs: number;
};

export const avaliacaoService = {
  doProduto: (produtoId: string) => request<ResumoAvaliacoes>(`/produtos/${produtoId}/avaliacoes`, { query: { limit: 20 } }),
  avaliar: (produtoId: string, nota: number, comentario?: string) =>
    request<{ mediaProduto: number }>('/avaliacoes', { method: 'POST', body: { produtoId, nota, comentario: comentario || undefined } }),
};

export const mensagemService = {
  enviar: (produtoId: string, mensagem: string) => request<{ id: string }>(`/produtos/${produtoId}/mensagens`, { method: 'POST', body: { mensagem } }),
  recebidas: () => request<MensagemRecebida[]>('/artesao/mensagens', { query: { limit: 50 } }),
};

export const notificacaoService = {
  listar: () => request<Notificacao[]>('/notificacoes', { query: { limit: 30 } }),
  naoLidas: () => request<Notificacao[]>('/notificacoes', { query: { limit: 1, naoLidas: 'true' } }),
  marcarLida: (id: string) => request<Notificacao>(`/notificacoes/${id}/lida`, { method: 'PATCH' }),
  marcarTodasLidas: () => request<{ marcadas: number }>('/notificacoes/marcar-todas-lidas', { method: 'POST' }),
};

const mapearPecas = (res: ApiResult<ProdutoApi[]>): ApiResult<Peca[]> => ({ ...res, data: res.data ? res.data.map(produtoParaPeca) : null });

export const favoritoService = {
  listar: async () => mapearPecas(await request<ProdutoApi[]>('/comprador/favoritos')),
  adicionar: (produtoId: string) => request<{ produtoId: string }>(`/favoritos/${produtoId}`, { method: 'POST' }),
  remover: (produtoId: string) => request<null>(`/favoritos/${produtoId}`, { method: 'DELETE' }),
};

type CarrinhoApi = { itens: { produto: ProdutoApi; quantidade: number }[] };
const mapearCarrinho = (res: ApiResult<CarrinhoApi>): ApiResult<{ peca: Peca; quantidade: number }[]> => ({
  ...res,
  data: res.data ? res.data.itens.map(i => ({ peca: produtoParaPeca(i.produto), quantidade: i.quantidade })) : null,
});

/** Carrinho guardado no servidor: acompanha o comprador entre aparelhos. */
export const carrinhoSalvoService = {
  ler: async () => mapearCarrinho(await request<CarrinhoApi>('/carrinho')),
  salvar: async (itens: { produtoId: string; quantidade: number }[]) => mapearCarrinho(await request<CarrinhoApi>('/carrinho', { method: 'PUT', body: { itens } })),
};

export const painelService = {
  indicadores: (de?: string, ate?: string) => request<Indicadores>('/artesao/indicadores', { query: { de, ate } }),
  checklist: () => request<Checklist>('/artesao/checklist'),
  salvarChecklist: (itensConcluidos: string[]) => request<Checklist>('/artesao/checklist', { method: 'PUT', body: { itensConcluidos } }),
};

export const adminService = {
  usuarios: (filtros: { tipo?: string; status?: string; busca?: string }) => request<UsuarioAdmin[]>('/admin/usuarios', { query: { limit: 50, ...filtros } }),
  suspender: (id: string, motivo: string) => request<UsuarioAdmin>(`/admin/usuarios/${id}/suspender`, { method: 'POST', body: { motivo } }),
  reativar: (id: string) => request<UsuarioAdmin>(`/admin/usuarios/${id}/reativar`, { method: 'POST' }),
  inativar: (id: string, motivo?: string) => request<UsuarioAdmin>(`/admin/usuarios/${id}/inativar`, { method: 'POST', body: { motivo: motivo || undefined } }),
  cadastrosPendentes: () => request<CadastroArtesao[]>('/admin/cadastros', { query: { status: 'PENDENTE', limit: 50 } }),
  aprovarCadastro: (artesaoId: string) => request<CadastroArtesao>(`/admin/artesaos/${artesaoId}/aprovar-cadastro`, { method: 'POST' }),
  reprovarCadastro: (artesaoId: string, motivo: string) =>
    request<CadastroArtesao>(`/admin/artesaos/${artesaoId}/reprovar-cadastro`, { method: 'POST', body: { motivo } }),
  metricas: (de?: string, ate?: string) => request<MetricasAdmin>('/admin/dashboard/metricas', { query: { de, ate } }),
};
