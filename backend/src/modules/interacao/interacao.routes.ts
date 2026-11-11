import { Router } from 'express';
import { Prisma, StatusPedido, TipoEvento, TipoUsuario } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { documentar } from '../../docs/registry';
import { ok } from '../../shared/api-result';
import { artesaoIdDe, somente } from '../../shared/auth';
import { invalidarCatalogo } from '../../shared/cache';
import { conflict, forbidden, notFound } from '../../shared/errors';
import { notificar } from '../../shared/eventos';
import { metaPaginacao, paginacaoQuery, paginar } from '../../shared/pagination';
import { validate } from '../../shared/validate';
import { z } from '../../shared/zod';
import { visivelNaVitrine } from '../produtos/produtos.service';

/** Avaliações (HU17) e contato com o produtor (HU14). */
export const interacaoRoutes = Router();

const consumidorIdDe = (req: Express.Request) => {
  if (!req.user?.consumidorId) throw forbidden();
  return req.user.consumidorId;
};

// ───────────── HU17 · Avaliações ─────────────

const avaliacaoBody = z
  .object({
    produtoId: z.string().uuid('Identificador de produto inválido'),
    nota: z.number({ required_error: 'Informe a nota' }).int('A nota deve ser inteira').min(1, 'A nota vai de 1 a 5').max(5, 'A nota vai de 1 a 5'),
    comentario: z.string().trim().max(1000).optional(),
  })
  .openapi('Avaliacao');
const produtoParam = z.object({ id: z.string().uuid('Identificador inválido') });

documentar({
  method: 'post',
  path: '/api/avaliacoes',
  tags: ['Avaliações'],
  summary: 'Avalia uma peça recebida (nota 1–5). Só para quem tem pedido ENTREGUE dessa peça (HU17)',
  autenticado: true,
  request: { body: { content: { 'application/json': { schema: avaliacaoBody } } } },
  sucesso: { status: 201, descricao: 'Avaliação registrada; médias do produto e do artesão recalculadas', data: z.any() },
  falhas: [400, 401, 403, 409],
});
interacaoRoutes.post('/avaliacoes', ...somente(TipoUsuario.CONSUMIDOR), validate({ body: avaliacaoBody }), async (req, res) => {
  const consumidorId = consumidorIdDe(req);
  const { produtoId, nota, comentario } = req.valid!.body as z.infer<typeof avaliacaoBody>;

  const compraVerificada = await prisma.itemPedido.findFirst({
    where: { produtoId, pedido: { consumidorId, status: StatusPedido.ENTREGUE } },
    select: { id: true },
  });
  if (!compraVerificada) throw forbidden('Apenas compradores verificados podem avaliar este item');

  const resultado = await prisma.$transaction(async tx => {
    let avaliacao;
    try {
      avaliacao = await tx.avaliacao.create({ data: { consumidorId, produtoId, nota, comentario: comentario || null } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw conflict('Você já avaliou esta peça');
      throw e;
    }
    // Recalcula as médias do produto e do artesão
    const produto = await tx.produto.findUniqueOrThrow({ where: { id: produtoId }, select: { artesaoId: true } });
    const [mediaProduto, mediaArtesao] = await Promise.all([
      tx.avaliacao.aggregate({ where: { produtoId }, _avg: { nota: true }, _count: true }),
      tx.avaliacao.aggregate({ where: { produto: { artesaoId: produto.artesaoId } }, _avg: { nota: true } }),
    ]);
    const arredondar = (v: number | null) => Math.round((v ?? 0) * 10) / 10;
    await tx.produto.update({ where: { id: produtoId }, data: { avaliacaoMedia: arredondar(mediaProduto._avg.nota) } });
    await tx.artesao.update({ where: { id: produto.artesaoId }, data: { avaliacaoMedia: arredondar(mediaArtesao._avg.nota) } });
    return { avaliacao, mediaProduto: arredondar(mediaProduto._avg.nota), totalAvaliacoes: mediaProduto._count, mediaArtesao: arredondar(mediaArtesao._avg.nota) };
  });
  await invalidarCatalogo();
  res.status(201).json(ok(resultado));
});

documentar({
  method: 'get',
  path: '/api/produtos/{id}/avaliacoes',
  tags: ['Avaliações'],
  summary: 'Avaliações públicas de uma peça',
  request: { params: produtoParam, query: z.object(paginacaoQuery) },
  sucesso: { status: 200, descricao: 'Avaliações e média', data: z.any(), paginado: true },
  falhas: [400],
});
interacaoRoutes.get('/produtos/:id/avaliacoes', validate({ params: produtoParam, query: z.object(paginacaoQuery) }), async (req, res) => {
  const { id } = req.valid!.params;
  const { page, limit } = req.valid!.query as { page: number; limit: number };
  const where = { produtoId: id };
  const [total, itens, media] = await prisma.$transaction([
    prisma.avaliacao.count({ where }),
    prisma.avaliacao.findMany({
      where,
      orderBy: { dataAvaliacao: 'desc' },
      select: { id: true, nota: true, comentario: true, dataAvaliacao: true, consumidor: { select: { usuario: { select: { nome: true } } } } },
      ...paginar(page, limit),
    }),
    prisma.avaliacao.aggregate({ where, _avg: { nota: true } }),
  ]);
  res.json(
    ok(
      {
        media: Math.round((media._avg.nota ?? 0) * 10) / 10,
        total,
        // Só o primeiro nome do autor (privacidade)
        avaliacoes: itens.map(a => ({ id: a.id, nota: a.nota, comentario: a.comentario, data: a.dataAvaliacao, autor: a.consumidor.usuario.nome.split(' ')[0] })),
      },
      metaPaginacao(page, limit, total),
    ),
  );
});

// ───────────── HU14 · Contatar produtor ─────────────

const mensagemBody = z
  .object({
    mensagem: z
      .string({ required_error: 'O campo de mensagem não pode ficar vazio' })
      .trim()
      .min(1, 'O campo de mensagem não pode ficar vazio')
      .max(1000, 'A mensagem deve ter no máximo 1000 caracteres'),
  })
  .openapi('MensagemContato');

documentar({
  method: 'post',
  path: '/api/produtos/{id}/mensagens',
  tags: ['Contato com o produtor'],
  summary: 'Envia uma dúvida ao artesão sobre a peça; gera notificação no painel dele (HU14)',
  autenticado: true,
  request: { params: produtoParam, body: { content: { 'application/json': { schema: mensagemBody } } } },
  sucesso: { status: 201, descricao: 'Mensagem enviada', data: z.any() },
  falhas: [400, 401, 403, 404],
});
interacaoRoutes.post('/produtos/:id/mensagens', ...somente(TipoUsuario.CONSUMIDOR), validate({ params: produtoParam, body: mensagemBody }), async (req, res) => {
  const consumidorId = consumidorIdDe(req);
  const produto = await prisma.produto.findFirst({ where: { id: req.valid!.params.id, ...visivelNaVitrine }, select: { id: true, titulo: true, artesaoId: true } });
  if (!produto) throw notFound('Produto não encontrado');
  const texto = req.valid!.body.mensagem as string;

  const mensagem = await prisma.$transaction(async tx => {
    const criada = await tx.mensagemContato.create({ data: { consumidorId, artesaoId: produto.artesaoId, produtoId: produto.id, mensagem: texto } });
    await notificar(tx, TipoEvento.NOVA_MENSAGEM, { artesaoId: produto.artesaoId }, {
      mensagemId: criada.id,
      produtoId: produto.id,
      titulo: produto.titulo,
      comprador: req.user!.nome,
      trecho: texto.slice(0, 120),
    });
    return criada;
  });
  res.status(201).json(ok({ id: mensagem.id, dataEnvio: mensagem.dataEnvio }));
});

documentar({
  method: 'get',
  path: '/api/artesao/mensagens',
  tags: ['Contato com o produtor'],
  summary: 'Dúvidas recebidas pelo artesão (HU14)',
  autenticado: true,
  request: { query: z.object(paginacaoQuery) },
  sucesso: { status: 200, descricao: 'Mensagens', data: z.any(), paginado: true },
  falhas: [401, 403],
});
interacaoRoutes.get('/artesao/mensagens', ...somente(TipoUsuario.ARTESAO), validate({ query: z.object(paginacaoQuery) }), async (req, res) => {
  const { page, limit } = req.valid!.query as { page: number; limit: number };
  const where = { artesaoId: artesaoIdDe(req) };
  const [total, itens] = await prisma.$transaction([
    prisma.mensagemContato.count({ where }),
    prisma.mensagemContato.findMany({
      where,
      orderBy: { dataEnvio: 'desc' },
      include: { produto: { select: { id: true, titulo: true } }, consumidor: { select: { usuario: { select: { nome: true, email: true } } } } },
      ...paginar(page, limit),
    }),
  ]);
  res.json(
    ok(
      itens.map(m => ({
        id: m.id,
        mensagem: m.mensagem,
        dataEnvio: m.dataEnvio,
        produto: m.produto,
        comprador: { nome: m.consumidor.usuario.nome, email: m.consumidor.usuario.email },
      })),
      metaPaginacao(page, limit, total),
    ),
  );
});
