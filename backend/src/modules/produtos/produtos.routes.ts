import { Router } from 'express';
import { TipoUsuario } from '@prisma/client';
import { documentar } from '../../docs/registry';
import { ok } from '../../shared/api-result';
import { artesaoIdDe, somente } from '../../shared/auth';
import { salvarImagem, uploadImagem } from '../../shared/upload';
import { validate } from '../../shared/validate';
import { z } from '../../shared/zod';
import {
  atualizarProdutoBody,
  criarProdutoBody,
  estoqueBody,
  idParam,
  meusProdutosQuery,
  produtoGestaoResposta,
  produtoResposta,
  vitrineQuery,
} from './produtos.schemas';
import { produtosService } from './produtos.service';

export const produtosRoutes = Router();
const imagemQuery = z.object({ substituir: z.enum(['true', 'false']).optional() });
const tags = ['Produtos'];
const json = <T extends z.ZodTypeAny>(schema: T) => ({ content: { 'application/json': { schema } } });

// ───────────── Público ─────────────

documentar({
  method: 'get',
  path: '/api/produtos',
  tags,
  summary: 'Vitrine pública (somente peças aprovadas), paginada e com filtros',
  description:
    'Filtros combináveis por técnica e polo (HU2), busca textual, categoria, faixa de preço e ordenação. ' +
    'Resposta em cache no Redis (header `X-Cache: HIT|MISS`).',
  request: { query: vitrineQuery },
  sucesso: { status: 200, descricao: 'Página de produtos + meta de paginação', data: z.array(produtoResposta), paginado: true },
  falhas: [400],
});
produtosRoutes.get('/produtos', validate({ query: vitrineQuery }), async (req, res) => {
  const { itens, meta, cacheHit } = await produtosService.vitrine(req.valid!.query);
  res.setHeader('X-Cache', cacheHit ? 'HIT' : 'MISS');
  res.json(ok(itens, meta));
});

documentar({
  method: 'get',
  path: '/api/produtos/{id}',
  tags,
  summary: 'Detalhe público de uma peça aprovada',
  request: { params: idParam },
  sucesso: { status: 200, descricao: 'Produto', data: produtoResposta },
  falhas: [400, 404],
});
produtosRoutes.get('/produtos/:id', validate({ params: idParam }), async (req, res) => {
  res.json(ok(await produtosService.detalhePublico(req.valid!.params.id)));
});

documentar({
  method: 'get',
  path: '/api/categorias',
  tags,
  summary: 'Lista as categorias de produtos',
  sucesso: { status: 200, descricao: 'Categorias', data: z.array(z.object({ id: z.string(), nome: z.string() })) },
});
produtosRoutes.get('/categorias', async (_req, res) => {
  res.json(ok(await produtosService.categorias()));
});

// ───────────── Artesão ─────────────

documentar({
  method: 'get',
  path: '/api/artesao/produtos',
  tags,
  summary: 'Peças do artesão logado (todos os status de curadoria)',
  autenticado: true,
  request: { query: meusProdutosQuery },
  sucesso: { status: 200, descricao: 'Peças do artesão', data: z.array(produtoGestaoResposta), paginado: true },
  falhas: [401, 403],
});
produtosRoutes.get('/artesao/produtos', ...somente(TipoUsuario.ARTESAO), validate({ query: meusProdutosQuery }), async (req, res) => {
  const { itens, meta } = await produtosService.doArtesao(artesaoIdDe(req), req.valid!.query);
  res.json(ok(itens, meta));
});

documentar({
  method: 'get',
  path: '/api/artesao/produtos/{id}',
  tags,
  summary: 'Detalhe de gestão de uma peça (dono ou admin), incluindo status e justificativa da curadoria',
  autenticado: true,
  request: { params: idParam },
  sucesso: { status: 200, descricao: 'Produto', data: produtoGestaoResposta },
  falhas: [401, 403, 404],
});
produtosRoutes.get('/artesao/produtos/:id', ...somente(TipoUsuario.ARTESAO, TipoUsuario.ADMIN), validate({ params: idParam }), async (req, res) => {
  res.json(ok(await produtosService.detalheGestao(req.user!, req.valid!.params.id)));
});

documentar({
  method: 'post',
  path: '/api/produtos',
  tags,
  summary: 'Cadastra uma peça (entra como PENDENTE para curadoria)',
  description: 'HU1 / TC05 / TC09. Título, técnica, polo de origem, preço > 0 e estoque são obrigatórios.',
  autenticado: true,
  request: { body: json(criarProdutoBody) },
  sucesso: { status: 201, descricao: 'Peça criada com status PENDENTE', data: produtoGestaoResposta },
  falhas: [400, 401, 403],
});
produtosRoutes.post('/produtos', ...somente(TipoUsuario.ARTESAO), validate({ body: criarProdutoBody }), async (req, res) => {
  res.status(201).json(ok(await produtosService.criar(artesaoIdDe(req), req.valid!.body)));
});

documentar({
  method: 'put',
  path: '/api/produtos/{id}',
  tags,
  summary: 'Edita uma peça própria (volta para PENDENTE)',
  autenticado: true,
  request: { params: idParam, body: json(atualizarProdutoBody) },
  sucesso: { status: 200, descricao: 'Peça atualizada', data: produtoGestaoResposta },
  falhas: [400, 401, 403, 404],
});
produtosRoutes.put('/produtos/:id', ...somente(TipoUsuario.ARTESAO), validate({ params: idParam, body: atualizarProdutoBody }), async (req, res) => {
  res.json(ok(await produtosService.atualizar(artesaoIdDe(req), req.valid!.params.id, req.valid!.body)));
});

documentar({
  method: 'patch',
  path: '/api/produtos/{id}/estoque',
  tags,
  summary: 'Define a quantidade em estoque de uma peça própria',
  autenticado: true,
  request: { params: idParam, body: json(estoqueBody) },
  sucesso: { status: 200, descricao: 'Estoque atualizado', data: produtoGestaoResposta },
  falhas: [400, 401, 403, 404],
});
produtosRoutes.patch('/produtos/:id/estoque', ...somente(TipoUsuario.ARTESAO), validate({ params: idParam, body: estoqueBody }), async (req, res) => {
  res.json(ok(await produtosService.ajustarEstoque(artesaoIdDe(req), req.valid!.params.id, req.valid!.body.quantidade)));
});

documentar({
  method: 'post',
  path: '/api/produtos/{id}/imagens',
  tags,
  summary: 'Envia uma foto da peça (multipart, campo `imagem`, JPG/PNG até 5 MB)',
  description: 'Com `?substituir=true` a nova foto substitui as anteriores (troca da foto principal).',
  autenticado: true,
  request: {
    params: idParam,
    query: imagemQuery,
    body: { content: { 'multipart/form-data': { schema: z.object({ imagem: z.any().openapi({ type: 'string', format: 'binary' }) }) } } },
  },
  sucesso: { status: 201, descricao: 'Foto adicionada (peça volta para PENDENTE)', data: produtoGestaoResposta },
  falhas: [400, 401, 403, 404],
});
produtosRoutes.post(
  '/produtos/:id/imagens',
  ...somente(TipoUsuario.ARTESAO),
  validate({ params: idParam, query: imagemQuery }),
  uploadImagem('imagem'),
  async (req, res) => {
    const artesaoId = artesaoIdDe(req);
    const url = await salvarImagem(req.file, 'imagem', 'produtos');
    const substituir = req.valid!.query.substituir === 'true';
    res.status(201).json(ok(await produtosService.adicionarImagem(artesaoId, req.valid!.params.id, url, substituir)));
  },
);

documentar({
  method: 'delete',
  path: '/api/produtos/{id}',
  tags,
  summary: 'Remove uma peça (dono ou admin). Peças com pedidos não podem ser removidas.',
  autenticado: true,
  request: { params: idParam },
  sucesso: { status: 200, descricao: 'Removida', data: z.null() },
  falhas: [401, 403, 404, 409],
});
produtosRoutes.delete('/produtos/:id', ...somente(TipoUsuario.ARTESAO, TipoUsuario.ADMIN), validate({ params: idParam }), async (req, res) => {
  await produtosService.remover(req.user!, req.valid!.params.id);
  res.json(ok(null));
});
