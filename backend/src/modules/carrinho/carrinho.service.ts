import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { badRequest } from '../../shared/errors';
import type { ErroCampo } from '../../shared/api-result';
import { dinheiro } from '../../shared/serializers';
import { visivelNaVitrine } from '../produtos/produtos.service';
import { cotarPorArtesao } from './frete';

export const MSG_LIMITE_ESTOQUE = 'Limite de estoque atingido para esta peça';

type ItemEntrada = { produtoId: string; quantidade: number };

/**
 * Calcula o carrinho EXCLUSIVAMENTE com dados do banco (TC08 / RN15).
 * Qualquer preço/subtotal enviado pelo frontend é descartado na validação e nunca é lido aqui.
 * Também aplica o limite de estoque (HU4 / TC14).
 */
export async function calcularCarrinho(itensEntrada: ItemEntrada[], cep?: string) {
  // Agrupa itens repetidos do mesmo produto
  const quantidades = new Map<string, number>();
  for (const { produtoId, quantidade } of itensEntrada) quantidades.set(produtoId, (quantidades.get(produtoId) ?? 0) + quantidade);

  const produtos = await prisma.produto.findMany({
    where: { id: { in: [...quantidades.keys()] }, ...visivelNaVitrine },
    select: { id: true, titulo: true, preco: true, imagensUrls: true, artesaoId: true, estoque: { select: { quantidadeDisponivel: true } } },
  });
  const porId = new Map(produtos.map(p => [p.id, p]));

  const errors: ErroCampo[] = [];
  let total = new Prisma.Decimal(0);
  const itens = [...quantidades.entries()].flatMap(([produtoId, quantidade], i) => {
    const p = porId.get(produtoId);
    if (!p) {
      errors.push({ campo: `itens.${i}.produtoId`, mensagem: 'Peça indisponível ou inexistente' });
      return [];
    }
    const disponivel = p.estoque?.quantidadeDisponivel ?? 0;
    if (quantidade > disponivel) {
      errors.push({ campo: `itens.${i}.quantidade`, mensagem: `${MSG_LIMITE_ESTOQUE} (disponível: ${disponivel})` });
    }
    const subtotal = p.preco.mul(quantidade);
    total = total.add(subtotal);
    return [
      {
        produtoId,
        titulo: p.titulo,
        imagemUrl: p.imagensUrls[0] ?? null,
        artesaoId: p.artesaoId,
        precoUnitario: dinheiro(p.preco),
        quantidade,
        subtotal: dinheiro(subtotal),
        estoqueDisponivel: disponivel,
      },
    ];
  });

  if (errors.length) {
    const soEstoque = errors.every(e => e.mensagem.startsWith(MSG_LIMITE_ESTOQUE));
    throw badRequest(soEstoque ? MSG_LIMITE_ESTOQUE : 'Carrinho contém itens inválidos', errors);
  }

  const unidadesPorArtesao = new Map<string, number>();
  for (const i of itens) unidadesPorArtesao.set(i.artesaoId, (unidadesPorArtesao.get(i.artesaoId) ?? 0) + i.quantidade);
  const frete = cep ? cotarPorArtesao(cep, unidadesPorArtesao) : null;
  const totalLiquido = dinheiro(total);
  return {
    itens,
    quantidadeItens: itens.reduce((s, i) => s + i.quantidade, 0),
    totalLiquido,
    frete,
    totalGeral: dinheiro(total.add(frete?.valor ?? 0)),
  };
}
