import { Router } from 'express';
import { Prisma, StatusProduto, StatusUsuario, TipoUsuario } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { documentar } from '../../docs/registry';
import { ok } from '../../shared/api-result';
import { somente } from '../../shared/auth';
import { invalidarCatalogo } from '../../shared/cache';
import { badRequest, forbidden, notFound } from '../../shared/errors';
import { metaPaginacao, paginacaoQuery, paginar } from '../../shared/pagination';
import { validate } from '../../shared/validate';
import { z } from '../../shared/zod';
import { periodoPadrao, periodoQuery, relatoriosService } from '../relatorios/relatorios.service';

/** Admin: gestão de usuários (HU16) e dashboard de indicadores (HU9). Todas exigem perfil ADMIN (TC01). */
export const adminExtrasRoutes = Router();

const idParam = z.object({ id: z.string().uuid('Identificador inválido') });
const usuariosQuery = z.object({
  ...paginacaoQuery,
  tipo: z.nativeEnum(TipoUsuario).optional(),
  status: z.nativeEnum(StatusUsuario).optional(),
  busca: z.string().trim().max(100).optional(),
});
const suspenderBody = z
  .object({ motivo: z.string({ required_error: 'Informe o motivo da suspensão' }).trim().min(10, 'Descreva o motivo formal da suspensão (mínimo de 10 caracteres)').max(1000) })
  .openapi('SuspenderUsuario');

const usuarioResposta = (u: Prisma.UsuarioGetPayload<{ include: { artesao: { select: { id: true; _count: { select: { produtos: true } } } } } }>) => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  tipo: u.tipo,
  status: u.status,
  motivoSuspensao: u.motivoSuspensao,
  dataCadastro: u.dataCadastro,
  artesaoId: u.artesao?.id ?? null,
  produtosAtivos: u.artesao?._count.produtos ?? 0,
});
const incluirUsuario = { artesao: { select: { id: true, _count: { select: { produtos: { where: { status: StatusProduto.ATIVO } } } } } } } as const;

documentar({
  method: 'get',
  path: '/api/admin/usuarios',
  tags: ['Admin · Usuários'],
  summary: 'Lista compradores, artesãos e admins com filtros (HU16)',
  autenticado: true,
  request: { query: usuariosQuery },
  sucesso: { status: 200, descricao: 'Usuários', data: z.any(), paginado: true },
  falhas: [401, 403],
});
adminExtrasRoutes.get('/admin/usuarios', ...somente(TipoUsuario.ADMIN), validate({ query: usuariosQuery }), async (req, res) => {
  const q = req.valid!.query as z.infer<typeof usuariosQuery>;
  const where: Prisma.UsuarioWhereInput = {
    ...(q.tipo ? { tipo: q.tipo } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.busca ? { OR: [{ nome: { contains: q.busca, mode: 'insensitive' } }, { email: { contains: q.busca, mode: 'insensitive' } }] } : {}),
  };
  const [total, itens] = await prisma.$transaction([
    prisma.usuario.count({ where }),
    prisma.usuario.findMany({ where, include: incluirUsuario, orderBy: { dataCadastro: 'desc' }, ...paginar(q.page, q.limit) }),
  ]);
  res.json(ok(itens.map(usuarioResposta), metaPaginacao(q.page, q.limit, total)));
});

documentar({
  method: 'post',
  path: '/api/admin/usuarios/{id}/suspender',
  tags: ['Admin · Usuários'],
  summary: 'Suspende a conta com motivo formal: invalida as sessões e oculta as peças do artesão (HU16)',
  autenticado: true,
  request: { params: idParam, body: { content: { 'application/json': { schema: suspenderBody } } } },
  sucesso: { status: 200, descricao: 'Conta suspensa', data: z.any() },
  falhas: [400, 401, 403, 404],
});
adminExtrasRoutes.post('/admin/usuarios/:id/suspender', ...somente(TipoUsuario.ADMIN), validate({ params: idParam, body: suspenderBody }), async (req, res) => {
  const { id } = req.valid!.params;
  const alvo = await prisma.usuario.findUnique({ where: { id }, select: { tipo: true, status: true } });
  if (!alvo) throw notFound('Usuário não encontrado');
  if (alvo.tipo === TipoUsuario.ADMIN) throw forbidden('Contas de administrador não podem ser suspensas por aqui');
  if (alvo.status === StatusUsuario.SUSPENSO) throw badRequest('A conta já está suspensa');

  const usuario = await prisma.usuario.update({
    where: { id },
    // tokenVersion++ invalida imediatamente todos os tokens já emitidos para essa conta
    data: { status: StatusUsuario.SUSPENSO, motivoSuspensao: req.valid!.body.motivo, tokenVersion: { increment: 1 } },
    include: incluirUsuario,
  });
  await invalidarCatalogo(); // peças do artesão saem da vitrine
  res.json(ok(usuarioResposta(usuario)));
});

documentar({
  method: 'post',
  path: '/api/admin/usuarios/{id}/reativar',
  tags: ['Admin · Usuários'],
  summary: 'Reativa uma conta suspensa — o acesso é restabelecido imediatamente (HU16)',
  autenticado: true,
  request: { params: idParam },
  sucesso: { status: 200, descricao: 'Conta reativada', data: z.any() },
  falhas: [400, 401, 403, 404],
});
adminExtrasRoutes.post('/admin/usuarios/:id/reativar', ...somente(TipoUsuario.ADMIN), validate({ params: idParam }), async (req, res) => {
  const { id } = req.valid!.params;
  const alvo = await prisma.usuario.findUnique({ where: { id }, select: { status: true } });
  if (!alvo) throw notFound('Usuário não encontrado');
  if (alvo.status === StatusUsuario.ATIVO) throw badRequest('A conta já está ativa');
  const usuario = await prisma.usuario.update({ where: { id }, data: { status: StatusUsuario.ATIVO, motivoSuspensao: null }, include: incluirUsuario });
  await invalidarCatalogo();
  res.json(ok(usuarioResposta(usuario)));
});

documentar({
  method: 'get',
  path: '/api/admin/dashboard/metricas',
  tags: ['Admin · Dashboard'],
  summary: 'Indicadores: receita, pedidos concluídos, novos artesãos, mais ativos, mais vendidas e mais buscadas (HU9)',
  description: 'Período padrão: mês atual. As agregações rodam em paralelo (Promise.all).',
  autenticado: true,
  request: { query: periodoQuery },
  sucesso: { status: 200, descricao: 'Métricas do período', data: z.any() },
  falhas: [400, 401, 403],
});
adminExtrasRoutes.get('/admin/dashboard/metricas', ...somente(TipoUsuario.ADMIN), validate({ query: periodoQuery }), async (req, res) => {
  const { de, ate } = req.valid!.query as z.infer<typeof periodoQuery>;
  res.json(ok(await relatoriosService.dashboardAdmin(periodoPadrao(de, ate))));
});
