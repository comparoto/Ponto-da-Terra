import { Router } from 'express';
import { TipoUsuario } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { documentar } from '../../docs/registry';
import { ok } from '../../shared/api-result';
import { artesaoIdDe, somente } from '../../shared/auth';
import { validate } from '../../shared/validate';
import { z } from '../../shared/zod';
import { periodoPadrao, periodoQuery, relatoriosService } from '../relatorios/relatorios.service';

/** Painel do artesão: indicadores (HU18) e checklist de formalização (HU15). */
export const painelArtesaoRoutes = Router();

/** Documentos/etapas da Carteira Nacional do Artesão e do MEI (HU15 cenário 3). */
export const ITENS_CHECKLIST = ['rg', 'cpf', 'comprovante-residencia', 'fotos-processo', 'pecas-amostra', 'conta-gov-br'] as const;

const checklistBody = z
  .object({ itensConcluidos: z.array(z.enum(ITENS_CHECKLIST)).max(ITENS_CHECKLIST.length) })
  .openapi('ChecklistFormalizacao');

const checklistDto = (itens: string[], atualizadoEm: Date | null) => ({
  itensDisponiveis: ITENS_CHECKLIST,
  itensConcluidos: itens,
  percentualConclusao: Math.round((itens.length / ITENS_CHECKLIST.length) * 100),
  atualizadoEm,
});

documentar({
  method: 'get',
  path: '/api/artesao/indicadores',
  tags: ['Artesão · Indicadores'],
  summary: 'Faturamento mensal, peças mais vendidas, taxa de conclusão e pedidos por polo (HU18). Padrão: últimos 6 meses',
  autenticado: true,
  request: { query: periodoQuery },
  sucesso: { status: 200, descricao: 'Indicadores (com zeros e mensagem quando não há vendas)', data: z.any() },
  falhas: [400, 401, 403],
});
painelArtesaoRoutes.get('/artesao/indicadores', ...somente(TipoUsuario.ARTESAO), validate({ query: periodoQuery }), async (req, res) => {
  const { de, ate } = req.valid!.query as z.infer<typeof periodoQuery>;
  res.json(ok(await relatoriosService.indicadoresArtesao(artesaoIdDe(req), periodoPadrao(de, ate, 6))));
});

documentar({
  method: 'get',
  path: '/api/artesao/checklist',
  tags: ['Artesão · Central de orientação'],
  summary: 'Checklist de documentos para a Carteira do Artesão / MEI, com percentual de prontidão (HU15)',
  autenticado: true,
  sucesso: { status: 200, descricao: 'Checklist', data: z.any() },
  falhas: [401, 403],
});
painelArtesaoRoutes.get('/artesao/checklist', ...somente(TipoUsuario.ARTESAO), async (req, res) => {
  const checklist = await prisma.checklistFormalizacao.findUnique({ where: { artesaoId: artesaoIdDe(req) } });
  res.json(ok(checklistDto((checklist?.itensConcluidos as string[]) ?? [], checklist?.atualizadoEm ?? null)));
});

documentar({
  method: 'put',
  path: '/api/artesao/checklist',
  tags: ['Artesão · Central de orientação'],
  summary: 'Salva o progresso do checklist no perfil (HU15)',
  autenticado: true,
  request: { body: { content: { 'application/json': { schema: checklistBody } } } },
  sucesso: { status: 200, descricao: 'Checklist salvo', data: z.any() },
  falhas: [400, 401, 403],
});
painelArtesaoRoutes.put('/artesao/checklist', ...somente(TipoUsuario.ARTESAO), validate({ body: checklistBody }), async (req, res) => {
  const artesaoId = artesaoIdDe(req);
  const itens = [...new Set(req.valid!.body.itensConcluidos as string[])];
  const percentualConclusao = Math.round((itens.length / ITENS_CHECKLIST.length) * 100);
  const salvo = await prisma.checklistFormalizacao.upsert({
    where: { artesaoId },
    create: { artesaoId, itensConcluidos: itens, percentualConclusao },
    update: { itensConcluidos: itens, percentualConclusao },
  });
  res.json(ok(checklistDto(itens, salvo.atualizadoEm)));
});
