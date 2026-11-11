import { type Prisma, StatusProduto, TipoEvento } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { invalidarCatalogo } from '../../shared/cache';
import { badRequest, notFound } from '../../shared/errors';
import { notificar } from '../../shared/eventos';
import { metaPaginacao, paginar } from '../../shared/pagination';
import { incluirProduto, produtoGestao } from '../../shared/serializers';

/**
 * Curadoria de catálogo (HU8 / TC04).
 *
 * Correções em relação à rodada de testes de 09/11/2026 (TC04 reprovado):
 *  - reprovar NÃO apaga a peça: muda o status para REJEITADO e guarda a justificativa;
 *  - a justificativa é obrigatória;
 *  - o artesão é notificado (NotificacaoLog visível no painel + evento na outbox para o e-mail assíncrono);
 *  - peças PENDENTE/REJEITADO nunca aparecem na vitrine (ver visivelNaVitrine).
 */
async function decidir(produtoId: string, adminId: string, decisao: 'APROVAR' | 'REPROVAR', justificativa?: string) {
  const produto = await prisma.$transaction(async tx => {
    // Lock da linha: evita que dois admins decidam a mesma peça ao mesmo tempo
    const [linha] = await tx.$queryRaw<{ status: StatusProduto; imagensUrls: string[] }[]>`
      SELECT "status", "imagensUrls" FROM "Produto" WHERE "id" = ${produtoId} FOR UPDATE`;
    if (!linha) throw notFound('Produto não encontrado');
    if (linha.status !== StatusProduto.PENDENTE)
      throw badRequest(`Somente peças pendentes podem ser ${decisao === 'APROVAR' ? 'aprovadas' : 'reprovadas'} (status atual: ${linha.status})`);
    if (decisao === 'APROVAR' && linha.imagensUrls.length === 0)
      throw badRequest('A peça precisa de ao menos uma foto para ser aprovada (HU1)');

    const atualizado = await tx.produto.update({
      where: { id: produtoId },
      data:
        decisao === 'APROVAR'
          ? { status: StatusProduto.ATIVO, justificativaCuradoria: null }
          : { status: StatusProduto.REJEITADO, justificativaCuradoria: justificativa },
      include: incluirProduto,
    });

    const tipoEvento = decisao === 'APROVAR' ? TipoEvento.PRODUTO_APROVADO : TipoEvento.PRODUTO_REJEITADO;
    const payload: Prisma.InputJsonObject = {
      produtoId,
      titulo: atualizado.titulo,
      artesaoId: atualizado.artesaoId,
      adminId,
      ...(justificativa ? { justificativa } : {}),
    };
    // Notificação no painel do artesão (in-app) + evento para o worker enviar o e-mail
    await notificar(tx, tipoEvento, { artesaoId: atualizado.artesaoId }, payload);

    return atualizado;
  });

  await invalidarCatalogo();
  return produtoGestao(produto);
}

export const curadoriaService = {
  async fila(status: StatusProduto, page: number, limit: number) {
    const where = { status };
    const [total, itens] = await prisma.$transaction([
      prisma.produto.count({ where }),
      prisma.produto.findMany({ where, include: incluirProduto, orderBy: { atualizadoEm: 'asc' }, ...paginar(page, limit) }),
    ]);
    return { itens: itens.map(produtoGestao), meta: metaPaginacao(page, limit, total) };
  },
  aprovar: (produtoId: string, adminId: string) => decidir(produtoId, adminId, 'APROVAR'),
  reprovar: (produtoId: string, adminId: string, justificativa: string) => decidir(produtoId, adminId, 'REPROVAR', justificativa),
};
