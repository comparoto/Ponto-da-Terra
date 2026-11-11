import { Router } from 'express';
import { StatusUsuario, TipoUsuario } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { documentar } from '../../docs/registry';
import { ok } from '../../shared/api-result';
import { artesaoIdDe, somente } from '../../shared/auth';
import { comCache, invalidarCatalogo } from '../../shared/cache';
import { notFound } from '../../shared/errors';
import { metaPaginacao, paginar } from '../../shared/pagination';
import { artesaoPublico, incluirArtesaoComNome, incluirProduto, produtoPublico } from '../../shared/serializers';
import { salvarImagem, uploadImagem } from '../../shared/upload';
import { validate } from '../../shared/validate';
import { z } from '../../shared/zod';
import { UFS } from '../auth/auth.schemas';
import { visivelNaVitrine } from '../produtos/produtos.service';
import { produtoResposta } from '../produtos/produtos.schemas';

export const artesaosRoutes = Router();
const tags = ['Artesãos'];

const artesaoResposta = z
  .object({
    id: z.string().uuid(),
    nome: z.string(),
    nomeAtelie: z.string().nullable(),
    biografia: z.string().nullable(),
    especialidade: z.string().nullable(),
    tecnicasPrincipais: z.array(z.string()),
    poloRegional: z.string().nullable(),
    cidade: z.string(),
    estado: z.string(),
    fotoPerfilUrl: z.string().nullable(),
    fotoAtelieUrl: z.string().nullable(),
    aceitaEncomenda: z.boolean(),
    avaliacaoMedia: z.number(),
  })
  .openapi('Artesao');

const listaQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  polo: z.string().trim().max(60).optional(),
});
const idParam = z.object({ id: z.string().uuid('Identificador inválido') });

const perfilBody = z
  .object({
    nomeAtelie: z.string().trim().min(2).max(120).nullable(),
    biografia: z.string().trim().max(3000).nullable(),
    especialidade: z.string().trim().min(2).max(80),
    tecnicasPrincipais: z.array(z.string().trim().min(2).max(60)).max(10),
    poloRegional: z.string().trim().min(2).max(80).nullable(),
    cidade: z.string().trim().min(2).max(80),
    estado: z.enum(UFS),
    cepOrigem: z
      .string()
      .trim()
      .regex(/^\d{5}-?\d{3}$/, 'CEP inválido')
      .nullable(),
    aceitaEncomenda: z.boolean(),
  })
  .partial()
  .strict()
  .refine(d => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar' })
  .openapi('AtualizarPerfilArtesao');

const fotoQuery = z.object({ tipo: z.enum(['perfil', 'atelie']).default('perfil') });

/** Artesãos visíveis publicamente: conta ATIVA. */
const artesaoVisivel = { usuario: { status: StatusUsuario.ATIVO } };

// ───────────── Público ─────────────

documentar({
  method: 'get',
  path: '/api/artesaos',
  tags,
  summary: 'Lista artesãos (substitui fakeApi.getArtesaos)',
  request: { query: listaQuery },
  sucesso: { status: 200, descricao: 'Artesãos', data: z.array(artesaoResposta), paginado: true },
});
artesaosRoutes.get('/artesaos', validate({ query: listaQuery }), async (req, res) => {
  const q = req.valid!.query as z.infer<typeof listaQuery>;
  const { valor, hit } = await comCache('artesaos', q, async () => {
    const where = { ...artesaoVisivel, ...(q.polo ? { poloRegional: { equals: q.polo, mode: 'insensitive' as const } } : {}) };
    const [total, itens] = await prisma.$transaction([
      prisma.artesao.count({ where }),
      prisma.artesao.findMany({ where, include: incluirArtesaoComNome, orderBy: { usuario: { nome: 'asc' } }, ...paginar(q.page, q.limit) }),
    ]);
    return { itens: itens.map(artesaoPublico), meta: metaPaginacao(q.page, q.limit, total) };
  });
  res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
  res.json(ok(valor.itens, valor.meta));
});

documentar({
  method: 'get',
  path: '/api/artesaos/{id}',
  tags,
  summary: 'Perfil público do artesão com as peças ativas (HU3 / TC11)',
  request: { params: idParam },
  sucesso: { status: 200, descricao: 'Perfil público', data: artesaoResposta.extend({ produtos: z.array(produtoResposta) }) },
  falhas: [400, 404],
});
artesaosRoutes.get('/artesaos/:id', validate({ params: idParam }), async (req, res) => {
  const { id } = req.valid!.params;
  const { valor, hit } = await comCache('artesao', { id }, async () => {
    const artesao = await prisma.artesao.findFirst({ where: { id, ...artesaoVisivel }, include: incluirArtesaoComNome });
    if (!artesao) return null;
    const produtos = await prisma.produto.findMany({
      where: { artesaoId: id, ...visivelNaVitrine },
      include: incluirProduto,
      orderBy: { criadoEm: 'desc' },
    });
    return { ...artesaoPublico(artesao), produtos: produtos.map(produtoPublico) };
  });
  if (!valor) throw notFound('Artesão não encontrado');
  res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
  res.json(ok(valor));
});

// ───────────── Artesão logado ─────────────

documentar({
  method: 'get',
  path: '/api/artesao/perfil',
  tags,
  summary: 'Perfil do ateliê do artesão logado',
  autenticado: true,
  sucesso: { status: 200, descricao: 'Perfil', data: artesaoResposta.extend({ cepOrigem: z.string().nullable() }) },
  falhas: [401, 403],
});
artesaosRoutes.get('/artesao/perfil', ...somente(TipoUsuario.ARTESAO), async (req, res) => {
  const artesao = await prisma.artesao.findUniqueOrThrow({ where: { id: artesaoIdDe(req) }, include: incluirArtesaoComNome });
  res.json(ok({ ...artesaoPublico(artesao), cepOrigem: artesao.cepOrigem }));
});

documentar({
  method: 'put',
  path: '/api/artesao/perfil',
  tags,
  summary: 'Atualiza biografia, técnicas, polo e dados do ateliê (HU7 / TC10)',
  autenticado: true,
  request: { body: { content: { 'application/json': { schema: perfilBody } } } },
  sucesso: { status: 200, descricao: 'Perfil atualizado (refletido imediatamente na página pública)', data: artesaoResposta },
  falhas: [400, 401, 403],
});
artesaosRoutes.put('/artesao/perfil', ...somente(TipoUsuario.ARTESAO), validate({ body: perfilBody }), async (req, res) => {
  const artesao = await prisma.artesao.update({ where: { id: artesaoIdDe(req) }, data: req.valid!.body, include: incluirArtesaoComNome });
  await invalidarCatalogo(); // a página pública e a vitrine exibem dados do artesão
  res.json(ok({ ...artesaoPublico(artesao), cepOrigem: artesao.cepOrigem }));
});

documentar({
  method: 'post',
  path: '/api/artesao/perfil/fotos',
  tags,
  summary: 'Envia a foto de perfil ou da oficina (multipart, campo `foto`, JPG/PNG até 5 MB)',
  description: 'Use `?tipo=perfil` ou `?tipo=atelie`. GIF, arquivos com extensão falsa ou acima de 5 MB são recusados sem gravar nada (TC10).',
  autenticado: true,
  request: {
    query: fotoQuery,
    body: { content: { 'multipart/form-data': { schema: z.object({ foto: z.any().openapi({ type: 'string', format: 'binary' }) }) } } },
  },
  sucesso: { status: 201, descricao: 'Foto salva', data: artesaoResposta },
  falhas: [400, 401, 403],
});
artesaosRoutes.post('/artesao/perfil/fotos', ...somente(TipoUsuario.ARTESAO), validate({ query: fotoQuery }), uploadImagem('foto'), async (req, res) => {
  const artesaoId = artesaoIdDe(req);
  const url = await salvarImagem(req.file, 'foto', 'artesaos');
  const campo = req.valid!.query.tipo === 'atelie' ? 'fotoAtelieUrl' : 'fotoPerfilUrl';
  const artesao = await prisma.artesao.update({ where: { id: artesaoId }, data: { [campo]: url }, include: incluirArtesaoComNome });
  await invalidarCatalogo();
  res.status(201).json(ok(artesaoPublico(artesao)));
});
