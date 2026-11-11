import { Prisma, StatusPedido, TipoEvento } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { badRequest, forbidden, notFound } from '../../shared/errors';
import { notificar } from '../../shared/eventos';
import { metaPaginacao, paginar } from '../../shared/pagination';
import { dinheiro } from '../../shared/serializers';
import type { UsuarioAutenticado } from '../../types/express';

/**
 * Pedidos (HU6, HU10, HU13 / TC12, TC13).
 * Um pedido pertence a UM artesão; vários pedidos formam uma compra (checkout).
 */

export const incluirPedido = {
  itens: { include: { produto: { select: { imagensUrls: true } } } },
  entrega: { include: { endereco: true } },
  historico: { orderBy: { criadoEm: 'asc' } },
  compra: { select: { codigo: true, pagamento: { select: { metodo: true, status: true, parcelas: true } } } },
  artesao: { select: { id: true, cidade: true, estado: true, usuario: { select: { nome: true, email: true } } } },
  consumidor: { select: { id: true, usuario: { select: { nome: true, email: true } } } },
  intervencoes: { orderBy: { criadoEm: 'asc' } },
} satisfies Prisma.PedidoInclude;

type PedidoCompleto = Prisma.PedidoGetPayload<{ include: typeof incluirPedido }>;
type Visao = 'comprador' | 'artesao' | 'admin';

const PAGOS: StatusPedido[] = [StatusPedido.PAGO, StatusPedido.EM_PRODUCAO, StatusPedido.DESPACHADO, StatusPedido.ENTREGUE];
const EM_ABERTO: StatusPedido[] = [StatusPedido.PAGO, StatusPedido.EM_PRODUCAO, StatusPedido.DESPACHADO];

/** HU6: etapas da linha do tempo exibida ao comprador. */
const ETAPAS: { etapa: string; status: StatusPedido }[] = [
  { etapa: 'Pagamento Confirmado', status: StatusPedido.PAGO },
  { etapa: 'Em Produção no Ateliê', status: StatusPedido.EM_PRODUCAO },
  { etapa: 'Despachado', status: StatusPedido.DESPACHADO },
  { etapa: 'Entregue', status: StatusPedido.ENTREGUE },
];

const atrasado = (p: { status: StatusPedido; entrega: { dataPrevista: Date | null } | null }) =>
  EM_ABERTO.includes(p.status) && !!p.entrega?.dataPrevista && p.entrega.dataPrevista < new Date();

function linhaDoTempo(p: PedidoCompleto) {
  const indiceAtual = ETAPAS.findIndex(e => e.status === p.status);
  return ETAPAS.map((e, i) => {
    const registro = p.historico.find(h => h.status === e.status);
    return {
      etapa: e.etapa,
      status: e.status,
      data: registro?.criadoEm ?? null,
      // Peça de pronta entrega pode pular "Em produção": a etapa conta como concluída se uma posterior foi alcançada
      concluida: indiceAtual >= i,
      atual: indiceAtual === i,
    };
  });
}

const URL_RASTREIO = 'https://rastreamento.correios.com.br/app/index.php';

export function pedidoDto(p: PedidoCompleto, visao: Visao, avaliados: Set<string> = new Set()) {
  const entrega = p.entrega;
  return {
    id: p.id,
    codigoCompra: p.compra.codigo,
    status: p.status,
    dataPedido: p.dataPedido,
    valorProdutos: dinheiro(p.valorProdutos),
    valorFrete: dinheiro(p.valorFrete),
    valorTotal: dinheiro(p.valorTotal),
    atrasado: atrasado(p),
    diasEmAberto: Math.floor((Date.now() - p.dataPedido.getTime()) / 86_400_000),
    artesao: { id: p.artesao.id, nome: p.artesao.usuario.nome, cidade: p.artesao.cidade, estado: p.artesao.estado },
    ...(visao !== 'comprador' ? { comprador: { nome: p.consumidor.usuario.nome, email: p.consumidor.usuario.email } } : {}),
    pagamento: p.compra.pagamento,
    itens: p.itens.map(i => ({
      produtoId: i.produtoId,
      titulo: i.tituloProduto,
      quantidade: i.quantidade,
      precoUnitario: dinheiro(i.precoUnitario),
      subtotal: dinheiro(Number(i.precoUnitario) * i.quantidade),
      imagemUrl: i.produto.imagensUrls[0] ?? null,
      ...(visao === 'comprador' ? { avaliado: avaliados.has(i.produtoId) } : {}),
    })),
    entrega: entrega
      ? {
          codigoRastreio: entrega.codigoRastreio,
          transportadora: entrega.transportadora,
          urlRastreio: entrega.codigoRastreio ? URL_RASTREIO : null,
          dataPostagem: entrega.dataPostagem,
          dataPrevista: entrega.dataPrevista,
          endereco: {
            cep: entrega.endereco.cep,
            rua: entrega.endereco.rua,
            numero: entrega.endereco.numero,
            complemento: entrega.endereco.complemento,
            bairro: entrega.endereco.bairro,
            cidade: entrega.endereco.cidade,
            estado: entrega.endereco.estado,
          },
        }
      : null,
    linhaDoTempo: linhaDoTempo(p),
    historico: p.historico.map(h => ({ status: h.status, criadoEm: h.criadoEm })),
    ...(visao === 'admin' ? { intervencoes: p.intervencoes.map(n => ({ id: n.id, nota: n.nota, adminId: n.adminId, criadoEm: n.criadoEm })) } : {}),
  };
}

async function produtosAvaliados(consumidorId: string, produtoIds: string[]) {
  const avaliacoes = await prisma.avaliacao.findMany({ where: { consumidorId, produtoId: { in: produtoIds } }, select: { produtoId: true } });
  return new Set(avaliacoes.map(a => a.produtoId));
}

/** Transições que o ARTESÃO pode fazer (HU13). Pronta entrega pode ir direto de PAGO para DESPACHADO. */
const TRANSICOES_ARTESAO: Partial<Record<StatusPedido, StatusPedido[]>> = {
  [StatusPedido.PAGO]: [StatusPedido.EM_PRODUCAO, StatusPedido.DESPACHADO],
  [StatusPedido.EM_PRODUCAO]: [StatusPedido.DESPACHADO],
  [StatusPedido.DESPACHADO]: [StatusPedido.ENTREGUE],
};

const MENSAGEM_STATUS: Partial<Record<StatusPedido, string>> = {
  [StatusPedido.EM_PRODUCAO]: 'Seu pedido está em produção no ateliê.',
  [StatusPedido.DESPACHADO]: 'Seu pedido foi postado! Acompanhe pelo código de rastreio.',
  [StatusPedido.ENTREGUE]: 'Pedido entregue. Que tal avaliar a peça?',
};

export type FiltroAdmin = 'AGUARDANDO_PAGAMENTO' | 'AGUARDANDO_ENVIO' | 'DESPACHADO' | 'ENTREGUE' | 'CANCELADO' | 'ATRASADO';

function whereFiltroAdmin(filtro?: FiltroAdmin): Prisma.PedidoWhereInput {
  switch (filtro) {
    case 'AGUARDANDO_PAGAMENTO':
      return { status: StatusPedido.AGUARDANDO_PAGAMENTO };
    case 'AGUARDANDO_ENVIO':
      return { status: { in: [StatusPedido.PAGO, StatusPedido.EM_PRODUCAO] } };
    case 'DESPACHADO':
      return { status: StatusPedido.DESPACHADO };
    case 'ENTREGUE':
      return { status: StatusPedido.ENTREGUE };
    case 'CANCELADO':
      return { status: StatusPedido.CANCELADO };
    case 'ATRASADO':
      return { status: { in: EM_ABERTO }, entrega: { dataPrevista: { lt: new Date() } } };
    default:
      return {};
  }
}

async function listar(where: Prisma.PedidoWhereInput, page: number, limit: number) {
  const [total, itens] = await prisma.$transaction([
    prisma.pedido.count({ where }),
    prisma.pedido.findMany({ where, include: incluirPedido, orderBy: { dataPedido: 'desc' }, ...paginar(page, limit) }),
  ]);
  return { itens, meta: metaPaginacao(page, limit, total) };
}

export const pedidosService = {
  async doComprador(consumidorId: string, page: number, limit: number) {
    const { itens, meta } = await listar({ consumidorId }, page, limit);
    const avaliados = await produtosAvaliados(consumidorId, itens.flatMap(p => p.itens.map(i => i.produtoId)));
    return { itens: itens.map(p => pedidoDto(p, 'comprador', avaliados)), meta };
  },

  async doArtesao(artesaoId: string, status: StatusPedido | undefined, page: number, limit: number) {
    const { itens, meta } = await listar({ artesaoId, ...(status ? { status } : {}) }, page, limit);
    return { itens: itens.map(p => pedidoDto(p, 'artesao')), meta };
  },

  async todos(filtro: FiltroAdmin | undefined, page: number, limit: number) {
    const { itens, meta } = await listar(whereFiltroAdmin(filtro), page, limit);
    return { itens: itens.map(p => pedidoDto(p, 'admin')), meta };
  },

  /**
   * Detalhe com isolamento (TC13 / IDOR): comprador só vê os seus, artesão só os dele.
   * Pedido de outra pessoa → 404, sem revelar que ele existe.
   */
  async detalhe(usuario: UsuarioAutenticado, id: string) {
    const pedido = await prisma.pedido.findUnique({ where: { id }, include: incluirPedido });
    const visao: Visao | null =
      usuario.tipo === 'ADMIN' ? 'admin' : pedido?.consumidorId === usuario.consumidorId && usuario.consumidorId ? 'comprador' : pedido?.artesaoId === usuario.artesaoId && usuario.artesaoId ? 'artesao' : null;
    if (!pedido || !visao) throw notFound('Pedido não encontrado');
    const avaliados = visao === 'comprador' ? await produtosAvaliados(pedido.consumidorId, pedido.itens.map(i => i.produtoId)) : undefined;
    return pedidoDto(pedido, visao, avaliados);
  },

  /** HU13: artesão atualiza o status; "Postado/Despachado" exige código de rastreio. */
  async atualizarStatusArtesao(artesaoId: string, id: string, novo: StatusPedido, codigoRastreio?: string) {
    await prisma.$transaction(async tx => {
      const [linha] = await tx.$queryRaw<{ artesaoId: string; status: StatusPedido; consumidorId: string }[]>`
        SELECT "artesaoId", "status", "consumidorId" FROM "Pedido" WHERE "id" = ${id} FOR UPDATE`;
      if (!linha) throw notFound('Pedido não encontrado');
      if (linha.artesaoId !== artesaoId) throw forbidden('Este pedido pertence a outro artesão');

      const permitidos = TRANSICOES_ARTESAO[linha.status] ?? [];
      if (!permitidos.includes(novo)) throw badRequest(`Não é possível mudar o pedido de ${linha.status} para ${novo}`);
      if (novo === StatusPedido.DESPACHADO && !codigoRastreio?.trim()) {
        throw badRequest('Informe o código de rastreio dos Correios antes de confirmar a postagem', [
          { campo: 'codigoRastreio', mensagem: 'Informe o código de rastreio dos Correios antes de confirmar a postagem' },
        ]);
      }

      await tx.pedido.update({ where: { id }, data: { status: novo, historico: { create: { status: novo, autorId: artesaoId } } } });
      if (novo === StatusPedido.DESPACHADO) {
        await tx.entrega.update({ where: { pedidoId: id }, data: { codigoRastreio: codigoRastreio!.trim().toUpperCase(), dataPostagem: new Date() } });
      }
      const consumidor = await tx.consumidor.findUniqueOrThrow({ where: { id: linha.consumidorId }, select: { usuarioId: true } });
      await notificar(tx, TipoEvento.PEDIDO_ATUALIZADO, { usuarioId: consumidor.usuarioId, pedidoId: id }, {
        status: novo,
        mensagem: MENSAGEM_STATUS[novo] ?? 'Seu pedido foi atualizado.',
        ...(novo === StatusPedido.DESPACHADO ? { codigoRastreio: codigoRastreio!.trim().toUpperCase() } : {}),
      });
    });
    return prisma.pedido.findUniqueOrThrow({ where: { id }, include: incluirPedido }).then(p => pedidoDto(p, 'artesao'));
  },

  /** Comprador confirma o recebimento (DESPACHADO → ENTREGUE). */
  async confirmarRecebimento(consumidorId: string, id: string) {
    await prisma.$transaction(async tx => {
      const [linha] = await tx.$queryRaw<{ consumidorId: string; status: StatusPedido; artesaoId: string }[]>`
        SELECT "consumidorId", "status", "artesaoId" FROM "Pedido" WHERE "id" = ${id} FOR UPDATE`;
      if (!linha || linha.consumidorId !== consumidorId) throw notFound('Pedido não encontrado');
      if (linha.status !== StatusPedido.DESPACHADO) throw badRequest('Só é possível confirmar o recebimento de pedidos despachados');
      await tx.pedido.update({ where: { id }, data: { status: StatusPedido.ENTREGUE, historico: { create: { status: StatusPedido.ENTREGUE } } } });
      await notificar(tx, TipoEvento.PEDIDO_ATUALIZADO, { artesaoId: linha.artesaoId, pedidoId: id }, {
        status: StatusPedido.ENTREGUE,
        mensagem: 'O comprador confirmou o recebimento do pedido.',
      });
    });
    const pedido = await prisma.pedido.findUniqueOrThrow({ where: { id }, include: incluirPedido });
    const avaliados = await produtosAvaliados(consumidorId, pedido.itens.map(i => i.produtoId));
    return pedidoDto(pedido, 'comprador', avaliados);
  },

  /** HU10: nota de intervenção interna do admin, vinculada ao log do pedido. */
  async registrarIntervencao(adminUsuarioId: string, id: string, nota: string) {
    const existe = await prisma.pedido.findUnique({ where: { id }, select: { id: true } });
    if (!existe) throw notFound('Pedido não encontrado');
    await prisma.intervencaoPedido.create({ data: { pedidoId: id, adminId: adminUsuarioId, nota } });
    return prisma.pedido.findUniqueOrThrow({ where: { id }, include: incluirPedido }).then(p => pedidoDto(p, 'admin'));
  },

  PAGOS,
};
