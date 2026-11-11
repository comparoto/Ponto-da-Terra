import { Prisma, StatusPedido } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { getRedis } from '../../config/redis';
import { z } from '../../shared/zod';

/**
 * Relatórios do admin (HU9) e do artesão (HU18).
 *
 * FCCPD — "processamento paralelo em relatórios": cada relatório dispara suas agregações
 * independentes AO MESMO TEMPO (Promise.all), em vez de uma depois da outra. O tempo total
 * passa a ser o da consulta mais lenta, e não a soma de todas.
 */
const PAGOS: StatusPedido[] = [StatusPedido.PAGO, StatusPedido.EM_PRODUCAO, StatusPedido.DESPACHADO, StatusPedido.ENTREGUE];
const pagosSql = Prisma.join(PAGOS.map(s => Prisma.sql`${s}::"StatusPedido"`));
const dinheiro = (v: Prisma.Decimal | number | null | undefined) => Math.round(Number(v ?? 0) * 100) / 100;

export const BUSCAS_KEY = 'busca:termos';

/** Registra o termo buscado na vitrine (para "peças mais buscadas" — HU9). Falha silenciosa. */
export function registrarBusca(termo: string) {
  const redis = getRedis();
  const normalizado = termo.trim().toLowerCase().slice(0, 60);
  if (redis && normalizado.length >= 2) void redis.zincrby(BUSCAS_KEY, 1, normalizado).catch(() => undefined);
}

export type Periodo = { de: Date; ate: Date };

/** Datas "AAAA-MM-DD" são interpretadas em UTC; a data final vale até 23:59:59.999 do dia. */
const data = (fimDoDia: boolean) =>
  z.preprocess(
    v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T${fimDoDia ? '23:59:59.999' : '00:00:00.000'}Z` : v),
    z.coerce.date({ error: fimDoDia ? 'Data final inválida' : 'Data inicial inválida' }),
  );

export const periodoQuery = z
  .object({ de: data(false).optional(), ate: data(true).optional() })
  .refine(p => !p.de || !p.ate || p.de <= p.ate, { message: 'A data inicial deve ser anterior à final', path: ['de'] });

/** Período padrão (em UTC): mês atual, ou os últimos N meses incluindo o atual. */
export function periodoPadrao(de?: Date, ate?: Date, mesesAtras?: number): Periodo {
  const fim = ate ?? new Date();
  const inicio = de ?? new Date(Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth() - (mesesAtras ? mesesAtras - 1 : 0), 1));
  return { de: inicio, ate: fim };
}

export const relatoriosService = {
  /** HU9: indicadores consolidados da plataforma no período. */
  async dashboardAdmin({ de, ate }: Periodo) {
    const noPeriodo = { dataPedido: { gte: de, lte: ate } };
    const pagosNoPeriodo: Prisma.PedidoWhereInput = { ...noPeriodo, status: { in: PAGOS } };
    const inicio = performance.now();

    const [receita, concluidos, novosArtesaos, porArtesao, maisVendidas, porStatus, serie, termos] = await Promise.all([
      prisma.pedido.aggregate({ where: pagosNoPeriodo, _sum: { valorTotal: true }, _count: true }),
      prisma.pedido.count({ where: { ...noPeriodo, status: StatusPedido.ENTREGUE } }),
      prisma.artesao.count({ where: { dataCadastro: { gte: de, lte: ate } } }),
      prisma.pedido.groupBy({ by: ['artesaoId'], where: pagosNoPeriodo, _sum: { valorTotal: true }, _count: { _all: true }, orderBy: { _sum: { valorTotal: 'desc' } }, take: 5 }),
      prisma.itemPedido.groupBy({ by: ['produtoId', 'tituloProduto'], where: { pedido: pagosNoPeriodo }, _sum: { quantidade: true }, orderBy: { _sum: { quantidade: 'desc' } }, take: 5 }),
      prisma.pedido.groupBy({ by: ['status'], where: noPeriodo, _count: { _all: true } }),
      prisma.$queryRaw<{ dia: Date; receita: number; pedidos: number }[]>`
        SELECT date_trunc('day', "dataPedido") AS dia, SUM("valorTotal")::float AS receita, COUNT(*)::int AS pedidos
        FROM "Pedido" WHERE "status" IN (${pagosSql}) AND "dataPedido" BETWEEN ${de} AND ${ate}
        GROUP BY 1 ORDER BY 1`,
      getRedis()?.zrevrange(BUSCAS_KEY, 0, 9, 'WITHSCORES').catch(() => []) ?? Promise.resolve([] as string[]),
    ]);

    const nomes = await prisma.artesao.findMany({ where: { id: { in: porArtesao.map(a => a.artesaoId) } }, select: { id: true, usuario: { select: { nome: true } } } });
    const nomePorId = new Map(nomes.map(n => [n.id, n.usuario.nome]));
    const termosLista: { termo: string; buscas: number }[] = [];
    for (let i = 0; i < termos.length; i += 2) termosLista.push({ termo: termos[i], buscas: Number(termos[i + 1]) });

    return {
      periodo: { de, ate },
      receitaBruta: dinheiro(receita._sum.valorTotal),
      pedidosPagos: receita._count,
      pedidosConcluidos: concluidos,
      novosArtesaos,
      ticketMedio: receita._count ? dinheiro(Number(receita._sum.valorTotal) / receita._count) : 0,
      artesaosMaisAtivos: porArtesao.map(a => ({ artesaoId: a.artesaoId, nome: nomePorId.get(a.artesaoId) ?? '-', receita: dinheiro(a._sum.valorTotal), pedidos: a._count._all })),
      pecasMaisVendidas: maisVendidas.map(p => ({ produtoId: p.produtoId, titulo: p.tituloProduto, quantidade: p._sum.quantidade ?? 0 })),
      termosMaisBuscados: termosLista,
      pedidosPorStatus: Object.fromEntries(porStatus.map(s => [s.status, s._count._all])),
      receitaPorDia: serie.map(s => ({ dia: s.dia, receita: dinheiro(s.receita), pedidos: s.pedidos })),
      geradoEmMs: Math.round(performance.now() - inicio),
    };
  },

  /** HU18: indicadores do artesão (faturamento mensal, mais vendidas, taxa de conclusão, pedidos por polo). */
  async indicadoresArtesao(artesaoId: string, { de, ate }: Periodo) {
    const noPeriodo = { artesaoId, dataPedido: { gte: de, lte: ate } };
    const pagos: Prisma.PedidoWhereInput = { ...noPeriodo, status: { in: PAGOS } };

    const [faturamento, maisVendidas, porStatus, porPolo, porMes] = await Promise.all([
      prisma.pedido.aggregate({ where: pagos, _sum: { valorTotal: true }, _count: true }),
      prisma.itemPedido.groupBy({ by: ['produtoId', 'tituloProduto'], where: { pedido: pagos }, _sum: { quantidade: true }, orderBy: { _sum: { quantidade: 'desc' } }, take: 5 }),
      prisma.pedido.groupBy({ by: ['status'], where: noPeriodo, _count: { _all: true } }),
      prisma.$queryRaw<{ polo: string; pedidos: number; receita: number }[]>`
        SELECT pr."poloOrigem" AS polo, COUNT(DISTINCT p."id")::int AS pedidos, SUM(i."precoUnitario" * i."quantidade")::float AS receita
        FROM "ItemPedido" i JOIN "Pedido" p ON p."id" = i."pedidoId" JOIN "Produto" pr ON pr."id" = i."produtoId"
        WHERE p."artesaoId" = ${artesaoId} AND p."status" IN (${pagosSql}) AND p."dataPedido" BETWEEN ${de} AND ${ate}
        GROUP BY pr."poloOrigem" ORDER BY pedidos DESC`,
      prisma.$queryRaw<{ mes: Date; receita: number; pedidos: number }[]>`
        SELECT date_trunc('month', "dataPedido") AS mes, SUM("valorTotal")::float AS receita, COUNT(*)::int AS pedidos
        FROM "Pedido" WHERE "artesaoId" = ${artesaoId} AND "status" IN (${pagosSql}) AND "dataPedido" BETWEEN ${de} AND ${ate}
        GROUP BY 1 ORDER BY 1`,
    ]);

    // Série mensal com zeros nos meses sem venda (HU18 cenário 2)
    const meses: { mes: string; receita: number; pedidos: number }[] = [];
    const cursor = new Date(Date.UTC(de.getUTCFullYear(), de.getUTCMonth(), 1));
    while (cursor <= ate) {
      const chave = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
      const achado = porMes.find(m => {
        const d = new Date(m.mes);
        return d.getUTCFullYear() === cursor.getUTCFullYear() && d.getUTCMonth() === cursor.getUTCMonth();
      });
      meses.push({ mes: chave, receita: dinheiro(achado?.receita), pedidos: achado?.pedidos ?? 0 });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    const contagem = Object.fromEntries(porStatus.map(s => [s.status, s._count._all])) as Partial<Record<StatusPedido, number>>;
    const concluidos = contagem.ENTREGUE ?? 0;
    const validos = PAGOS.reduce((s, st) => s + (contagem[st] ?? 0), 0);
    const semVendas = faturamento._count === 0;

    return {
      periodo: { de, ate },
      faturamentoTotal: dinheiro(faturamento._sum.valorTotal),
      pedidosPagos: faturamento._count,
      pedidosConcluidos: concluidos,
      taxaConclusao: validos ? Math.round((concluidos / validos) * 1000) / 10 : 0,
      faturamentoPorMes: meses,
      pecasMaisVendidas: maisVendidas.map(p => ({ produtoId: p.produtoId, titulo: p.tituloProduto, quantidade: p._sum.quantidade ?? 0 })),
      pedidosPorPolo: porPolo.map(p => ({ polo: p.polo, pedidos: p.pedidos, receita: dinheiro(p.receita) })),
      mensagem: semVendas
        ? 'Ainda não há vendas neste período. Divulgue suas peças nas redes sociais e mantenha fotos nítidas e descrições completas para atrair compradores.'
        : null,
    };
  },
};
