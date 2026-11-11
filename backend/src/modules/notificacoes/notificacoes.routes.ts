import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { documentar } from '../../docs/registry';
import { ok } from '../../shared/api-result';
import { autenticar } from '../../shared/auth';
import { notFound } from '../../shared/errors';
import { metaPaginacao, paginacaoQuery, paginar } from '../../shared/pagination';
import { validate } from '../../shared/validate';
import { z } from '../../shared/zod';
import type { UsuarioAutenticado } from '../../types/express';

/** Notificações in-app do usuário (ex.: peça aprovada/reprovada — HU8; novo pedido — HU12). */
export const notificacoesRoutes = Router();
const tags = ['Notificações'];

const listaQuery = z.object({ ...paginacaoQuery, naoLidas: z.enum(['true', 'false']).optional() });
const idParam = z.object({ id: z.string().uuid('Identificador inválido') });
const notificacaoResposta = z
  .object({
    id: z.string(),
    tipoEvento: z.string(),
    payload: z.any(),
    lida: z.boolean(),
    dataEnvio: z.string(),
  })
  .openapi('Notificacao');

const doUsuario = (u: UsuarioAutenticado): Prisma.NotificacaoLogWhereInput => ({
  OR: [{ usuarioId: u.id }, ...(u.artesaoId ? [{ artesaoId: u.artesaoId }] : [])],
});
const selecao = { id: true, tipoEvento: true, payload: true, lida: true, dataEnvio: true } as const;

documentar({
  method: 'get',
  path: '/api/notificacoes',
  tags,
  summary: 'Notificações do usuário logado (mais recentes primeiro)',
  autenticado: true,
  request: { query: listaQuery },
  sucesso: { status: 200, descricao: 'Notificações', data: z.array(notificacaoResposta), paginado: true },
  falhas: [401],
});
notificacoesRoutes.get('/notificacoes', autenticar, validate({ query: listaQuery }), async (req, res) => {
  const q = req.valid!.query as z.infer<typeof listaQuery>;
  const where = { ...doUsuario(req.user!), ...(q.naoLidas === 'true' ? { lida: false } : {}) };
  const [total, itens] = await prisma.$transaction([
    prisma.notificacaoLog.count({ where }),
    prisma.notificacaoLog.findMany({ where, select: selecao, orderBy: { dataEnvio: 'desc' }, ...paginar(q.page, q.limit) }),
  ]);
  res.json(ok(itens, metaPaginacao(q.page, q.limit, total)));
});

documentar({
  method: 'post',
  path: '/api/notificacoes/marcar-todas-lidas',
  tags,
  summary: 'Marca todas as notificações do usuário como lidas',
  autenticado: true,
  sucesso: { status: 200, descricao: 'Quantidade marcada', data: z.object({ marcadas: z.number() }) },
  falhas: [401],
});
notificacoesRoutes.post('/notificacoes/marcar-todas-lidas', autenticar, async (req, res) => {
  const { count } = await prisma.notificacaoLog.updateMany({ where: { ...doUsuario(req.user!), lida: false }, data: { lida: true } });
  res.json(ok({ marcadas: count }));
});

documentar({
  method: 'patch',
  path: '/api/notificacoes/{id}/lida',
  tags,
  summary: 'Marca uma notificação como lida',
  autenticado: true,
  request: { params: idParam },
  sucesso: { status: 200, descricao: 'Notificação atualizada', data: notificacaoResposta },
  falhas: [401, 404],
});
notificacoesRoutes.patch('/notificacoes/:id/lida', autenticar, validate({ params: idParam }), async (req, res) => {
  const { id } = req.valid!.params;
  const { count } = await prisma.notificacaoLog.updateMany({ where: { id, ...doUsuario(req.user!) }, data: { lida: true } });
  if (!count) throw notFound('Notificação não encontrada');
  res.json(ok(await prisma.notificacaoLog.findUniqueOrThrow({ where: { id }, select: selecao })));
});
