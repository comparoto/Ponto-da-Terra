import { Router } from 'express';
import { StatusProduto, TipoUsuario } from '@prisma/client';
import { documentar } from '../../docs/registry';
import { ok } from '../../shared/api-result';
import { somente } from '../../shared/auth';
import { paginacaoQuery } from '../../shared/pagination';
import { validate } from '../../shared/validate';
import { z } from '../../shared/zod';
import { produtoGestaoResposta } from '../produtos/produtos.schemas';
import { curadoriaService } from './curadoria.service';

/** Todas as rotas /api/admin/* exigem JWT de ADMIN no servidor (TC01). */
export const adminRoutes = Router();
adminRoutes.use('/admin', ...somente(TipoUsuario.ADMIN));

const tags = ['Admin · Curadoria'];
const idParam = z.object({ id: z.string().uuid('Identificador inválido') });
const filaQuery = z.object({ ...paginacaoQuery, status: z.nativeEnum(StatusProduto).default(StatusProduto.PENDENTE) });
const reprovarBody = z
  .object({
    justificativa: z
      .string({ required_error: 'Informe o motivo da reprovação' })
      .trim()
      .min(10, 'Descreva o motivo da reprovação (mínimo de 10 caracteres)')
      .max(1000)
      .openapi({ example: 'Falta nitidez nas fotos' }),
  })
  .openapi('ReprovarProduto');

documentar({
  method: 'get',
  path: '/api/admin/curadoria',
  tags,
  summary: 'Fila de curadoria (padrão: peças PENDENTE, mais antigas primeiro)',
  autenticado: true,
  request: { query: filaQuery },
  sucesso: { status: 200, descricao: 'Peças', data: z.array(produtoGestaoResposta), paginado: true },
  falhas: [401, 403],
});
adminRoutes.get('/admin/curadoria', validate({ query: filaQuery }), async (req, res) => {
  const { status, page, limit } = req.valid!.query as z.infer<typeof filaQuery>;
  const { itens, meta } = await curadoriaService.fila(status, page, limit);
  res.json(ok(itens, meta));
});

documentar({
  method: 'post',
  path: '/api/admin/produtos/{id}/aprovar',
  tags,
  summary: 'Aprova uma peça PENDENTE → ATIVO (aparece na vitrine e o artesão é notificado)',
  autenticado: true,
  request: { params: idParam },
  sucesso: { status: 200, descricao: 'Peça aprovada', data: produtoGestaoResposta },
  falhas: [400, 401, 403, 404],
});
adminRoutes.post('/admin/produtos/:id/aprovar', validate({ params: idParam }), async (req, res) => {
  res.json(ok(await curadoriaService.aprovar(req.valid!.params.id, req.user!.id)));
});

documentar({
  method: 'post',
  path: '/api/admin/produtos/{id}/reprovar',
  tags,
  summary: 'Reprova uma peça PENDENTE → REJEITADO com justificativa obrigatória (TC04)',
  description: 'A peça NÃO é apagada: fica com status REJEITADO, invisível na vitrine, e o artesão recebe o motivo.',
  autenticado: true,
  request: { params: idParam, body: { content: { 'application/json': { schema: reprovarBody } } } },
  sucesso: { status: 200, descricao: 'Peça reprovada', data: produtoGestaoResposta },
  falhas: [400, 401, 403, 404],
});
adminRoutes.post('/admin/produtos/:id/reprovar', validate({ params: idParam, body: reprovarBody }), async (req, res) => {
  res.json(ok(await curadoriaService.reprovar(req.valid!.params.id, req.user!.id, req.valid!.body.justificativa)));
});
