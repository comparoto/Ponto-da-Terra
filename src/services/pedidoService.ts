/**
 * Compras, pedidos e pagamentos via API real (fase 2 do backend).
 * Antes: pedidos salvos no localStorage do navegador.
 */
import { type ApiResult, request, urlImagem } from './http';

export type MetodoPagamento = 'PIX' | 'CARTAO' | 'BOLETO';
export type StatusPedido = 'CRIADO' | 'AGUARDANDO_PAGAMENTO' | 'PAGO' | 'EM_PRODUCAO' | 'DESPACHADO' | 'ENTREGUE' | 'CANCELADO';
export type StatusCompra = 'AGUARDANDO_PAGAMENTO' | 'PAGA' | 'CANCELADA';

export type Endereco = { cep: string; rua: string; numero: string; complemento?: string | null; bairro?: string | null; cidade: string; estado: string };
export type DadosCartao = { numero: string; validade: string; cvv: string; titular: string };

export type Compra = {
  codigo: string;
  agoraServidor: string;
  /** Diferença (ms) entre o relógio do servidor e o do aparelho, medida quando a resposta chegou */
  diferencaRelogioMs: number;
  status: StatusCompra;
  criadoEm: string;
  reservaExpiraEm: string;
  valorProdutos: number;
  valorFrete: number;
  valorTotal: number;
  endereco: Endereco;
  pagamento: null | {
    metodo: MetodoPagamento;
    status: 'PENDENTE' | 'APROVADO' | 'RECUSADO' | 'EXPIRADO';
    parcelas: number;
    valorParcela: number;
    codigoTransacao: string;
    expiraEm: string | null;
    pixCopiaECola: string | null;
    pixQrCode: string | null;
    linhaDigitavel: string | null;
    boletoUrl: string | null;
    cartaoFinal: string | null;
    motivoRecusa: string | null;
  };
  pedidos: { id: string; status: StatusPedido; artesao: { id: string; nome: string }; valorTotal: number; itens: { produtoId: string; titulo: string; quantidade: number; precoUnitario: number }[] }[];
};

export type EtapaLinhaDoTempo = { etapa: string; status: StatusPedido; data: string | null; concluida: boolean; atual: boolean };

export type Pedido = {
  id: string;
  codigoCompra: string;
  status: StatusPedido;
  dataPedido: string;
  valorProdutos: number;
  valorFrete: number;
  valorTotal: number;
  atrasado: boolean;
  diasEmAberto: number;
  artesao: { id: string; nome: string; cidade: string; estado: string };
  comprador?: { nome: string; email: string };
  pagamento: { metodo: MetodoPagamento; status: string; parcelas: number } | null;
  itens: { produtoId: string; titulo: string; quantidade: number; precoUnitario: number; subtotal: number; imagemUrl: string | null; avaliado?: boolean }[];
  entrega: null | {
    codigoRastreio: string | null;
    transportadora: string | null;
    urlRastreio: string | null;
    dataPostagem: string | null;
    dataPrevista: string | null;
    endereco: Endereco;
  };
  linhaDoTempo: EtapaLinhaDoTempo[];
  historico: { status: StatusPedido; criadoEm: string }[];
  intervencoes?: { id: string; nota: string; criadoEm: string }[];
};

export type FiltroPedidosAdmin = '' | 'AGUARDANDO_PAGAMENTO' | 'AGUARDANDO_ENVIO' | 'DESPACHADO' | 'ENTREGUE' | 'CANCELADO' | 'ATRASADO';

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  CRIADO: 'Criado',
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  PAGO: 'Pagamento confirmado',
  EM_PRODUCAO: 'Em produção',
  DESPACHADO: 'Postado',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export const COR_STATUS: Record<StatusPedido, string> = {
  CRIADO: 'gray',
  AGUARDANDO_PAGAMENTO: 'yellow',
  PAGO: 'teal',
  EM_PRODUCAO: 'purple',
  DESPACHADO: 'blue',
  ENTREGUE: 'green',
  CANCELADO: 'red',
};

const comImagens = (p: Pedido): Pedido => ({ ...p, itens: p.itens.map(i => ({ ...i, imagemUrl: urlImagem(i.imagemUrl) || null })) });
const mapear = (res: ApiResult<Pedido[]>): ApiResult<Pedido[]> => ({ ...res, data: res.data ? res.data.map(comImagens) : null });
const mapearUm = (res: ApiResult<Pedido>): ApiResult<Pedido> => ({ ...res, data: res.data ? comImagens(res.data) : null });

/** Mede a diferença de relógio no momento em que a resposta chega (a contagem do PIX usa a hora do servidor). */
const comRelogio = (res: ApiResult<Compra>): ApiResult<Compra> =>
  res.data ? { ...res, data: { ...res.data, diferencaRelogioMs: new Date(res.data.agoraServidor).getTime() - Date.now() } } : res;

export const compraService = {
  /** Reserva o estoque de forma atômica e cria a compra (um pedido por artesão). */
  checkout: (itens: { produtoId: string; quantidade: number }[], endereco: Endereco) =>
    request<Compra>('/checkout', { method: 'POST', body: { itens, endereco } }),

  pagar: (codigo: string, metodo: MetodoPagamento, parcelas = 1, cartao?: DadosCartao) =>
    request<Compra>(`/compras/${codigo}/pagamento`, { method: 'POST', body: { metodo, parcelas, cartao } }),

  detalhe: async (codigo: string) => comRelogio(await request<Compra>(`/compras/${codigo}`)),

  /** Gateway simulado: confirma o PIX/boleto (ambiente de demonstração). */
  simularPagamento: async (codigo: string) => comRelogio(await request<Compra>(`/compras/${codigo}/simular-pagamento`, { method: 'POST' })),
};

export const pedidoService = {
  meus: async () => mapear(await request<Pedido[]>('/comprador/pedidos', { query: { limit: 50 } })),
  detalhe: async (id: string) => mapearUm(await request<Pedido>(`/pedidos/${id}`)),
  confirmarRecebimento: async (id: string) => mapearUm(await request<Pedido>(`/pedidos/${id}/confirmar-recebimento`, { method: 'POST' })),

  doArtesao: async () => mapear(await request<Pedido[]>('/artesao/pedidos', { query: { limit: 50 } })),
  atualizarStatus: async (id: string, status: 'EM_PRODUCAO' | 'DESPACHADO' | 'ENTREGUE', codigoRastreio?: string) =>
    mapearUm(await request<Pedido>(`/artesao/pedidos/${id}/status`, { method: 'PATCH', body: { status, codigoRastreio } })),

  todos: async (filtro: FiltroPedidosAdmin = '') => mapear(await request<Pedido[]>('/admin/pedidos', { query: { limit: 50, filtro } })),
  registrarIntervencao: async (id: string, nota: string) => mapearUm(await request<Pedido>(`/admin/pedidos/${id}/intervencoes`, { method: 'POST', body: { nota } })),
};
