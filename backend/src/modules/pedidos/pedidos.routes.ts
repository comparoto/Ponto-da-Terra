import { Router } from 'express';
import { StatusPedido, TipoUsuario } from '@prisma/client';
import { documentar } from '../../docs/registry';
import { ok } from '../../shared/api-result';
import { artesaoIdDe, autenticar, somente } from '../../shared/auth';
import { forbidden } from '../../shared/errors';
import { paginacaoQuery } from '../../shared/pagination';
import { validate } from '../../shared/validate';
import { z } from '../../shared/zod';
import { pedidosService } from './pedidos.service';

export const pedidosRoutes = Router();
const tags = ['Pedidos'];

const idParam = z.object({ id: z.string().uuid('Identificador inválido') });
const listaQuery = z.object(paginacaoQuery);
const artesaoQuery = z.object({ ...paginacaoQuery, status: z.nativeEnum(StatusPedido).optional() });
const adminQuery = z.object({
  ...paginacaoQuery,
  filtro: z.enum(['AGUARDANDO_PAGAMENTO', 'AGUARDANDO_ENVIO', 'DESPACHADO', 'ENTREGUE', 'CANCELADO', 'ATRASADO']).optional(),
});
const statusBody = z
  .object({
    status: z.enum([StatusPedido.EM_PRODUCAO, StatusPedido.DESPACHADO, StatusPedido.ENTREGUE]),
    codigoRastreio: z.string().trim().max(40).optional().openapi({ example: 'AA123456789BR' }),
  })
  .openapi('AtualizarStatusPedido');
const intervencaoBody = z
  .object({ nota: z.string().trim().min(5, 'Descreva a intervenção (mínimo de 5 caracteres)').max(2000) })
  .openapi('IntervencaoPedido');
const pedidoResposta = z.any().openapi({ description: 'Pedido com itens, entrega, linha do tempo e histórico' });

const consumidorIdDe = (req: Express.Request) => {
  if (!req.user?.consumidorId) throw forbidden();
  return req.user.consumidorId;
};

// ───── Comprador ─────

documentar({
  method: 'get',
  path: '/api/comprador/pedidos',
  tags,
  summary: 'Meus pedidos (somente os do comprador logado — TC13)',
  autenticado: true,
  request: { query: listaQuery },
  sucesso: { status: 200, descricao: 'Pedidos', data: z.array(pedidoResposta), paginado: true },
  falhas: [401, 403],
});
pedidosRoutes.get('/comprador/pedidos', ...somente(TipoUsuario.CONSUMIDOR), validate({ query: listaQuery }), async (req, res) => {
  const { page, limit } = req.valid!.query as z.infer<typeof listaQuery>;
  const { itens, meta } = await pedidosService.doComprador(consumidorIdDe(req), page, limit);
  res.json(ok(itens, meta));
});

documentar({
  method: 'get',
  path: '/api/pedidos/{id}',
  tags,
  summary: 'Detalhe do pedido com linha do tempo e rastreio (HU6 / TC12). Pedido de outra pessoa → 404 (TC13)',
  autenticado: true,
  request: { params: idParam },
  sucesso: { status: 200, descricao: 'Pedido', data: pedidoResposta },
  falhas: [401, 404],
});
pedidosRoutes.get('/pedidos/:id', autenticar, validate({ params: idParam }), async (req, res) => {
  res.json(ok(await pedidosService.detalhe(req.user!, req.valid!.params.id)));
});

documentar({
  method: 'post',
  path: '/api/pedidos/{id}/confirmar-recebimento',
  tags,
  summary: 'Comprador confirma o recebimento (DESPACHADO → ENTREGUE)',
  autenticado: true,
  request: { params: idParam },
  sucesso: { status: 200, descricao: 'Pedido entregue', data: pedidoResposta },
  falhas: [400, 401, 403, 404],
});
pedidosRoutes.post('/pedidos/:id/confirmar-recebimento', ...somente(TipoUsuario.CONSUMIDOR), validate({ params: idParam }), async (req, res) => {
  res.json(ok(await pedidosService.confirmarRecebimento(consumidorIdDe(req), req.valid!.params.id)));
});

// ───── Artesão ─────

documentar({
  method: 'get',
  path: '/api/artesao/pedidos',
  tags,
  summary: 'Pedidos recebidos pelo artesão (HU13)',
  autenticado: true,
  request: { query: artesaoQuery },
  sucesso: { status: 200, descricao: 'Pedidos', data: z.array(pedidoResposta), paginado: true },
  falhas: [401, 403],
});
pedidosRoutes.get('/artesao/pedidos', ...somente(TipoUsuario.ARTESAO), validate({ query: artesaoQuery }), async (req, res) => {
  const { status, page, limit } = req.valid!.query as z.infer<typeof artesaoQuery>;
  const { itens, meta } = await pedidosService.doArtesao(artesaoIdDe(req), status, page, limit);
  res.json(ok(itens, meta));
});

documentar({
  method: 'patch',
  path: '/api/artesao/pedidos/{id}/status',
  tags,
  summary: 'Atualiza o status de envio. DESPACHADO ("Postado") exige código de rastreio (HU13)',
  autenticado: true,
  request: { params: idParam, body: { content: { 'application/json': { schema: statusBody } } } },
  sucesso: { status: 200, descricao: 'Pedido atualizado (comprador notificado)', data: pedidoResposta },
  falhas: [400, 401, 403, 404],
});
pedidosRoutes.patch('/artesao/pedidos/:id/status', ...somente(TipoUsuario.ARTESAO), validate({ params: idParam, body: statusBody }), async (req, res) => {
  const { status, codigoRastreio } = req.valid!.body as z.infer<typeof statusBody>;
  res.json(ok(await pedidosService.atualizarStatusArtesao(artesaoIdDe(req), req.valid!.params.id, status, codigoRastreio)));
});

// ───── Admin (HU10) — a proteção de /api/admin/* está em admin.routes ─────

documentar({
  method: 'get',
  path: '/api/admin/pedidos',
  tags: ['Admin · Pedidos'],
  summary: 'Todos os pedidos, com filtro (aguardando envio, atrasados, ...) — HU10',
  autenticado: true,
  request: { query: adminQuery },
  sucesso: { status: 200, descricao: 'Pedidos', data: z.array(pedidoResposta), paginado: true },
  falhas: [401, 403],
});
pedidosRoutes.get('/admin/pedidos', ...somente(TipoUsuario.ADMIN), validate({ query: adminQuery }), async (req, res) => {
  const { filtro, page, limit } = req.valid!.query as z.infer<typeof adminQuery>;
  const { itens, meta } = await pedidosService.todos(filtro, page, limit);
  res.json(ok(itens, meta));
});

documentar({
  method: 'post',
  path: '/api/admin/pedidos/{id}/intervencoes',
  tags: ['Admin · Pedidos'],
  summary: 'Registra nota de intervenção interna no log do pedido (HU10)',
  autenticado: true,
  request: { params: idParam, body: { content: { 'application/json': { schema: intervencaoBody } } } },
  sucesso: { status: 201, descricao: 'Nota registrada', data: pedidoResposta },
  falhas: [400, 401, 403, 404],
});
pedidosRoutes.post('/admin/pedidos/:id/intervencoes', ...somente(TipoUsuario.ADMIN), validate({ params: idParam, body: intervencaoBody }), async (req, res) => {
  res.status(201).json(ok(await pedidosService.registrarIntervencao(req.user!.id, req.valid!.params.id, req.valid!.body.nota)));
});
