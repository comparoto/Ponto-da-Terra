import { Router } from 'express';
import { TipoUsuario } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { documentar } from '../../docs/registry';
import { ok } from '../../shared/api-result';
import { somente } from '../../shared/auth';
import { forbidden, notFound } from '../../shared/errors';
import { incluirProduto, produtoPublico } from '../../shared/serializers';
import { validate } from '../../shared/validate';
import { z } from '../../shared/zod';
import { visivelNaVitrine } from '../produtos/produtos.service';
import { produtoResposta } from '../produtos/produtos.schemas';

/** Favoritos e carrinho guardados no servidor (acompanham o comprador entre aparelhos). */
export const compradorRoutes = Router();

const consumidorIdDe = (req: Express.Request) => {
  if (!req.user?.consumidorId) throw forbidden();
  return req.user.consumidorId;
};
const produtoParam = z.object({ produtoId: z.string().uuid('Identificador inválido') });

// ───────────── Favoritos (diagrama de classes: Consumidor "salva" Favorito) ─────────────

documentar({
  method: 'get',
  path: '/api/comprador/favoritos',
  tags: ['Favoritos'],
  summary: 'Peças favoritas do comprador (somente as que continuam na vitrine)',
  autenticado: true,
  sucesso: { status: 200, descricao: 'Favoritos', data: z.array(produtoResposta) },
  falhas: [401, 403],
});
compradorRoutes.get('/comprador/favoritos', ...somente(TipoUsuario.CONSUMIDOR), async (req, res) => {
  const favoritos = await prisma.favorito.findMany({
    where: { consumidorId: consumidorIdDe(req), produto: visivelNaVitrine },
    include: { produto: { include: incluirProduto } },
    orderBy: { id: 'desc' },
  });
  res.json(ok(favoritos.map(f => produtoPublico(f.produto))));
});

documentar({
  method: 'post',
  path: '/api/favoritos/{produtoId}',
  tags: ['Favoritos'],
  summary: 'Adiciona a peça aos favoritos (idempotente)',
  autenticado: true,
  request: { params: produtoParam },
  sucesso: { status: 201, descricao: 'Favoritada', data: z.object({ produtoId: z.string() }) },
  falhas: [401, 403, 404],
});
compradorRoutes.post('/favoritos/:produtoId', ...somente(TipoUsuario.CONSUMIDOR), validate({ params: produtoParam }), async (req, res) => {
  const consumidorId = consumidorIdDe(req);
  const { produtoId } = req.valid!.params;
  const produto = await prisma.produto.findFirst({ where: { id: produtoId, ...visivelNaVitrine }, select: { id: true } });
  if (!produto) throw notFound('Produto não encontrado');
  await prisma.favorito.upsert({ where: { consumidorId_produtoId: { consumidorId, produtoId } }, create: { consumidorId, produtoId }, update: {} });
  res.status(201).json(ok({ produtoId }));
});

documentar({
  method: 'delete',
  path: '/api/favoritos/{produtoId}',
  tags: ['Favoritos'],
  summary: 'Remove a peça dos favoritos (idempotente)',
  autenticado: true,
  request: { params: produtoParam },
  sucesso: { status: 200, descricao: 'Removida', data: z.null() },
  falhas: [401, 403],
});
compradorRoutes.delete('/favoritos/:produtoId', ...somente(TipoUsuario.CONSUMIDOR), validate({ params: produtoParam }), async (req, res) => {
  await prisma.favorito.deleteMany({ where: { consumidorId: consumidorIdDe(req), produtoId: req.valid!.params.produtoId } });
  res.json(ok(null));
});

// ───────────── Carrinho no servidor ─────────────

const carrinhoBody = z
  .object({
    itens: z
      .array(z.object({ produtoId: z.string().uuid('Identificador de produto inválido'), quantidade: z.number().int().min(1).max(100) }))
      .max(50),
  })
  .openapi('Carrinho');

const carrinhoResposta = z.object({ itens: z.array(z.object({ produto: produtoResposta, quantidade: z.number() })) }).openapi('CarrinhoSalvo');

/** Lê o carrinho: descarta peças que saíram da vitrine e limita cada quantidade ao estoque atual. */
async function lerCarrinho(consumidorId: string) {
  const carrinho = await prisma.carrinho.findUnique({
    where: { consumidorId },
    include: { itens: { include: { produto: { include: incluirProduto } }, orderBy: { id: 'asc' } } },
  });
  const visiveis = new Set(
    (await prisma.produto.findMany({ where: { id: { in: carrinho?.itens.map(i => i.produtoId) ?? [] }, ...visivelNaVitrine }, select: { id: true } })).map(p => p.id),
  );
  return {
    itens: (carrinho?.itens ?? [])
      .filter(i => visiveis.has(i.produtoId) && (i.produto.estoque?.quantidadeDisponivel ?? 0) > 0)
      .map(i => ({ produto: produtoPublico(i.produto), quantidade: Math.min(i.quantidade, i.produto.estoque?.quantidadeDisponivel ?? 0) })),
  };
}

documentar({
  method: 'get',
  path: '/api/carrinho',
  tags: ['Carrinho e Frete'],
  summary: 'Carrinho salvo do comprador (acompanha a conta entre aparelhos)',
  autenticado: true,
  sucesso: { status: 200, descricao: 'Carrinho', data: carrinhoResposta },
  falhas: [401, 403],
});
compradorRoutes.get('/carrinho', ...somente(TipoUsuario.CONSUMIDOR), async (req, res) => {
  res.json(ok(await lerCarrinho(consumidorIdDe(req))));
});

documentar({
  method: 'put',
  path: '/api/carrinho',
  tags: ['Carrinho e Frete'],
  summary: 'Substitui o carrinho salvo. Peças indisponíveis são descartadas e quantidades acima do estoque são limitadas',
  autenticado: true,
  request: { body: { content: { 'application/json': { schema: carrinhoBody } } } },
  sucesso: { status: 200, descricao: 'Carrinho salvo', data: carrinhoResposta },
  falhas: [400, 401, 403],
});
compradorRoutes.put('/carrinho', ...somente(TipoUsuario.CONSUMIDOR), validate({ body: carrinhoBody }), async (req, res) => {
  const consumidorId = consumidorIdDe(req);
  // Agrupa repetidos e mantém só peças que estão na vitrine
  const quantidades = new Map<string, number>();
  for (const { produtoId, quantidade } of req.valid!.body.itens as { produtoId: string; quantidade: number }[]) {
    quantidades.set(produtoId, Math.min(100, (quantidades.get(produtoId) ?? 0) + quantidade));
  }
  const validos = await prisma.produto.findMany({
    where: { id: { in: [...quantidades.keys()] }, ...visivelNaVitrine },
    select: { id: true, estoque: { select: { quantidadeDisponivel: true } } },
  });

  await prisma.$transaction(async tx => {
    const carrinho = await tx.carrinho.upsert({ where: { consumidorId }, create: { consumidorId }, update: {} });
    await tx.itemCarrinho.deleteMany({ where: { carrinhoId: carrinho.id } });
    const itens = validos
      .map(p => ({ carrinhoId: carrinho.id, produtoId: p.id, quantidade: Math.min(quantidades.get(p.id)!, p.estoque?.quantidadeDisponivel ?? 0) }))
      .filter(i => i.quantidade > 0);
    if (itens.length) await tx.itemCarrinho.createMany({ data: itens });
    await tx.carrinho.update({ where: { id: carrinho.id }, data: { atualizadoEm: new Date() } });
  });
  res.json(ok(await lerCarrinho(consumidorId)));
});
