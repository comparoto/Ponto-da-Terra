/**
 * Avaliações (HU17), contato com o produtor (HU14), notificações, painel do artesão
 * (indicadores HU18, checklist HU15) e administração (usuários HU16, dashboard HU9).
 */
import { request } from './http';

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
  marcarLida: (id: string) => request<Notificacao>(`/notificacoes/${id}/lida`, { method: 'PATCH' }),
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
  metricas: (de?: string, ate?: string) => request<MetricasAdmin>('/admin/dashboard/metricas', { query: { de, ate } }),
};
