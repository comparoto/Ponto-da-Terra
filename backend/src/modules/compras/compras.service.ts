import { randomBytes } from 'node:crypto';
import {
  MetodoPagamento,
  Prisma,
  StatusCompra,
  StatusPagamento,
  StatusPedido,
  TipoEvento,
} from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { invalidarCatalogo } from '../../shared/cache';
import { AppError, badRequest, conflict, notFound } from '../../shared/errors';
import { notificar, registrarEvento } from '../../shared/eventos';
import { dinheiro } from '../../shared/serializers';
import type { ErroCampo } from '../../shared/api-result';
import { cotarPorArtesao } from '../carrinho/frete';
import { visivelNaVitrine } from '../produtos/produtos.service';
import { BoletoSimulado, CartaoSimulado, type DadosCartao, type MeioDePagamento, PixSimulado, validarCartao } from './gateway-simulado';
import { somarDiasUteis } from './gateway-simulado';
import { agendarExpiracao } from '../../jobs/serverless';

type Tx = Prisma.TransactionClient;

export const MSG_ESGOTADO = 'Item esgotado durante a finalização';

export type ItemCheckout = { produtoId: string; quantidade: number };
export type EnderecoCheckout = { cep: string; rua: string; numero: string; complemento?: string; bairro?: string; cidade: string; estado: string };

const OPCOES_TX = { maxWait: 15_000, timeout: 20_000 } as const;

const novoCodigoCompra = () => `PT-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;

// ───────────── Serialização ─────────────

export const incluirCompra = {
  pagamento: true,
  endereco: true,
  pedidos: {
    include: {
      artesao: { select: { id: true, usuario: { select: { nome: true } } } },
      itens: true,
    },
    orderBy: { dataPedido: 'asc' },
  },
} satisfies Prisma.CompraInclude;

type CompraCompleta = Prisma.CompraGetPayload<{ include: typeof incluirCompra }>;

export const compraDto = (c: CompraCompleta) => ({
  codigo: c.codigo,
  /** Hora do servidor: a tela usa para a contagem regressiva do PIX não depender do relógio do aparelho */
  agoraServidor: new Date(),
  status: c.status,
  criadoEm: c.criadoEm,
  reservaExpiraEm: c.reservaExpiraEm,
  valorProdutos: dinheiro(c.valorProdutos),
  valorFrete: dinheiro(c.valorFrete),
  valorTotal: dinheiro(c.valorTotal),
  endereco: { cep: c.endereco.cep, rua: c.endereco.rua, numero: c.endereco.numero, complemento: c.endereco.complemento, bairro: c.endereco.bairro, cidade: c.endereco.cidade, estado: c.endereco.estado },
  pagamento: c.pagamento
    ? {
        metodo: c.pagamento.metodo,
        status: c.pagamento.status,
        parcelas: c.pagamento.parcelas,
        valorParcela: dinheiro(Number(c.valorTotal) / c.pagamento.parcelas),
        codigoTransacao: c.pagamento.codigoTransacao,
        expiraEm: c.pagamento.expiraEm,
        pixCopiaECola: c.pagamento.pixCopiaECola,
        pixQrCode: c.pagamento.pixQrCode,
        linhaDigitavel: c.pagamento.linhaDigitavel,
        boletoUrl: c.pagamento.metodo === MetodoPagamento.BOLETO ? `${env.PUBLIC_URL ?? ''}/api/pagamentos/${c.pagamento.codigoTransacao}/boleto.pdf` : null,
        cartaoFinal: c.pagamento.cartaoFinal,
        motivoRecusa: c.pagamento.motivoRecusa,
      }
    : null,
  pedidos: c.pedidos.map(p => ({
    id: p.id,
    status: p.status,
    artesao: { id: p.artesao.id, nome: p.artesao.usuario.nome },
    valorProdutos: dinheiro(p.valorProdutos),
    valorFrete: dinheiro(p.valorFrete),
    valorTotal: dinheiro(p.valorTotal),
    itens: p.itens.map(i => ({ produtoId: i.produtoId, titulo: i.tituloProduto, quantidade: i.quantidade, precoUnitario: dinheiro(i.precoUnitario) })),
  })),
});

// ───────────── Operações internas (sempre dentro de uma transação) ─────────────

/** Marca a compra e seus pedidos como pagos. Condicional: só age se ainda estiver aguardando pagamento. */
async function confirmarCompra(tx: Tx, compraId: string) {
  const { count } = await tx.compra.updateMany({ where: { id: compraId, status: StatusCompra.AGUARDANDO_PAGAMENTO }, data: { status: StatusCompra.PAGA } });
  if (!count) return false;

  const compra = await tx.compra.findUniqueOrThrow({
    where: { id: compraId },
    select: { codigo: true, consumidor: { select: { usuarioId: true } }, pedidos: { select: { id: true, artesaoId: true, valorTotal: true } } },
  });
  for (const pedido of compra.pedidos) {
    await tx.pedido.update({ where: { id: pedido.id }, data: { status: StatusPedido.PAGO, historico: { create: { status: StatusPedido.PAGO } } } });
    await notificar(tx, TipoEvento.PEDIDO_ATUALIZADO, { artesaoId: pedido.artesaoId, pedidoId: pedido.id }, {
      codigoCompra: compra.codigo,
      status: StatusPedido.PAGO,
      mensagem: 'Pagamento confirmado: o pedido pode seguir para produção.',
    });
  }
  await notificar(tx, TipoEvento.PEDIDO_ATUALIZADO, { usuarioId: compra.consumidor.usuarioId }, {
    codigoCompra: compra.codigo,
    status: StatusPedido.PAGO,
    mensagem: 'Pagamento confirmado! Seus pedidos foram enviados aos artesãos.',
  });
  return true;
}

/**
 * Cancela a compra e DEVOLVE o estoque reservado (PIX expirado, cartão recusado — TC15/TC16).
 * Condicional: se a compra já foi paga ou cancelada, não faz nada (protege contra corrida com o webhook).
 */
async function cancelarCompra(tx: Tx, compraId: string, motivo: 'EXPIRADA' | 'PAGAMENTO_RECUSADO') {
  const { count } = await tx.compra.updateMany({ where: { id: compraId, status: StatusCompra.AGUARDANDO_PAGAMENTO }, data: { status: StatusCompra.CANCELADA } });
  if (!count) return false;

  const compra = await tx.compra.findUniqueOrThrow({
    where: { id: compraId },
    select: { codigo: true, consumidor: { select: { usuarioId: true } }, pedidos: { select: { id: true, itens: { select: { produtoId: true, quantidade: true } } } } },
  });

  // Devolução do estoque, em ordem de produto para evitar deadlock com checkouts concorrentes
  const devolver = new Map<string, number>();
  for (const p of compra.pedidos) for (const i of p.itens) devolver.set(i.produtoId, (devolver.get(i.produtoId) ?? 0) + i.quantidade);
  for (const [produtoId, quantidade] of [...devolver.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    await tx.$executeRaw`UPDATE "Estoque" SET "quantidadeDisponivel" = "quantidadeDisponivel" + ${quantidade}, "versao" = "versao" + 1 WHERE "produtoId" = ${produtoId}`;
  }

  for (const p of compra.pedidos) {
    await tx.pedido.update({ where: { id: p.id }, data: { status: StatusPedido.CANCELADO, historico: { create: { status: StatusPedido.CANCELADO } } } });
  }
  if (motivo === 'EXPIRADA') {
    await tx.pagamento.updateMany({ where: { compraId, status: StatusPagamento.PENDENTE }, data: { status: StatusPagamento.EXPIRADO, dataProcessamento: new Date() } });
  }
  await notificar(tx, TipoEvento.PEDIDO_ATUALIZADO, { usuarioId: compra.consumidor.usuarioId }, {
    codigoCompra: compra.codigo,
    status: StatusPedido.CANCELADO,
    mensagem: motivo === 'EXPIRADA' ? 'O prazo de pagamento expirou e a compra foi cancelada.' : 'O pagamento foi recusado e a compra foi cancelada.',
  });
  return true;
}

// ───────────── API do serviço ─────────────

export const comprasService = {
  /**
   * Checkout com reserva ATÔMICA de estoque (HU11 / TC02 / FCCPD).
   *
   * Para cada peça (em ordem de id, evitando deadlock entre compras concorrentes):
   *   UPDATE "Estoque" SET qtd = qtd - n WHERE produto = ? AND qtd >= n
   * O banco serializa os UPDATEs na mesma linha; quem chega depois de o estoque acabar
   * afeta 0 linhas → a transação inteira é desfeita e o comprador recebe 400.
   * O CHECK (quantidadeDisponivel >= 0) da migration é a segunda barreira.
   */
  async checkout(consumidorId: string, itensEntrada: ItemCheckout[], endereco: EnderecoCheckout) {
    const quantidades = new Map<string, number>();
    const indiceOriginal = new Map<string, number>();
    itensEntrada.forEach(({ produtoId, quantidade }, i) => {
      quantidades.set(produtoId, (quantidades.get(produtoId) ?? 0) + quantidade);
      if (!indiceOriginal.has(produtoId)) indiceOriginal.set(produtoId, i);
    });
    const ids = [...quantidades.keys()].sort();

    const compra = await prisma.$transaction(async tx => {
      const produtos = await tx.produto.findMany({
        where: { id: { in: ids }, ...visivelNaVitrine },
        select: { id: true, titulo: true, preco: true, artesaoId: true },
      });
      const porId = new Map(produtos.map(p => [p.id, p]));
      const invalidos: ErroCampo[] = ids
        .filter(id => !porId.has(id))
        .map(id => ({ campo: `itens.${indiceOriginal.get(id)}.produtoId`, mensagem: 'Peça indisponível ou inexistente' }));
      if (invalidos.length) throw badRequest('Carrinho contém itens inválidos', invalidos);

      // Reserva atômica, linha a linha
      for (const id of ids) {
        const qtd = quantidades.get(id)!;
        const afetadas = await tx.$executeRaw`
          UPDATE "Estoque" SET "quantidadeDisponivel" = "quantidadeDisponivel" - ${qtd}, "versao" = "versao" + 1
          WHERE "produtoId" = ${id} AND "quantidadeDisponivel" >= ${qtd}`;
        if (afetadas === 0) {
          throw badRequest(MSG_ESGOTADO, [{ campo: `itens.${indiceOriginal.get(id)}.quantidade`, mensagem: `${porId.get(id)!.titulo}: ${MSG_ESGOTADO}` }]);
        }
      }

      // Agrupa por artesão: cada artesão recebe o seu pedido, com frete próprio
      const grupos = new Map<string, { produtoId: string; titulo: string; preco: Prisma.Decimal; quantidade: number }[]>();
      for (const id of ids) {
        const p = porId.get(id)!;
        grupos.set(p.artesaoId, [...(grupos.get(p.artesaoId) ?? []), { produtoId: id, titulo: p.titulo, preco: p.preco, quantidade: quantidades.get(id)! }]);
      }
      const unidades = new Map([...grupos.entries()].map(([a, itens]) => [a, itens.reduce((s, i) => s + i.quantidade, 0)]));
      const frete = cotarPorArtesao(endereco.cep, unidades);
      const fretePorArtesao = new Map(frete.porArtesao.map(f => [f.artesaoId, f]));

      const enderecoCriado = await tx.endereco.create({ data: { consumidorId, ...endereco, cep: frete.cep } });

      const pedidos = [...grupos.entries()].map(([artesaoId, itens]) => {
        const valorProdutos = itens.reduce((s, i) => s.add(i.preco.mul(i.quantidade)), new Prisma.Decimal(0));
        const f = fretePorArtesao.get(artesaoId)!;
        return { artesaoId, itens, valorProdutos, valorFrete: new Prisma.Decimal(f.valor), prazoDias: f.prazoDias };
      });
      const valorProdutos = pedidos.reduce((s, p) => s.add(p.valorProdutos), new Prisma.Decimal(0));
      const valorFrete = pedidos.reduce((s, p) => s.add(p.valorFrete), new Prisma.Decimal(0));

      const criada = await tx.compra.create({
        data: {
          codigo: novoCodigoCompra(),
          consumidor: { connect: { id: consumidorId } },
          endereco: { connect: { id: enderecoCriado.id } },
          valorProdutos,
          valorFrete,
          valorTotal: valorProdutos.add(valorFrete),
          reservaExpiraEm: new Date(Date.now() + env.RESERVA_MINUTOS * 60_000),
          pedidos: {
            create: pedidos.map(p => ({
              consumidor: { connect: { id: consumidorId } },
              artesao: { connect: { id: p.artesaoId } },
              status: StatusPedido.AGUARDANDO_PAGAMENTO,
              valorProdutos: p.valorProdutos,
              valorFrete: p.valorFrete,
              valorTotal: p.valorProdutos.add(p.valorFrete),
              itens: {
                create: p.itens.map(i => ({
                  produto: { connect: { id: i.produtoId } },
                  artesao: { connect: { id: p.artesaoId } },
                  tituloProduto: i.titulo,
                  quantidade: i.quantidade,
                  precoUnitario: i.preco,
                })),
              },
              entrega: { create: { endereco: { connect: { id: enderecoCriado.id } }, dataPrevista: somarDiasUteis(new Date(), p.prazoDias) } },
              historico: { create: { status: StatusPedido.AGUARDANDO_PAGAMENTO } },
            })),
          },
        },
        include: incluirCompra,
      });

      // HU12: o evento "Novo Pedido" é gravado na mesma transação e publicado na fila pelo worker
      for (const pedido of criada.pedidos) {
        await registrarEvento(tx, TipoEvento.NOVO_PEDIDO, {
          pedidoId: pedido.id,
          artesaoId: pedido.artesaoId,
          codigoCompra: criada.codigo,
          valorTotal: dinheiro(pedido.valorTotal),
          itens: pedido.itens.map(i => `${i.quantidade}x ${i.tituloProduto}`),
        });
      }
      return criada;
    }, OPCOES_TX);

    await invalidarCatalogo(); // o estoque mudou
    await agendarExpiracao(compra.reservaExpiraEm).catch(err => console.error('[fila] falha ao agendar expiração:', err));
    return compraDto(compra);
  },

  async detalhe(consumidorId: string, codigo: string) {
    const compra = await prisma.compra.findUnique({ where: { codigo }, include: incluirCompra });
    if (!compra || compra.consumidorId !== consumidorId) throw notFound('Compra não encontrada');
    return compraDto(compra);
  },

  /** Inicia o pagamento da compra pelo meio escolhido (HU5). */
  async pagar(consumidorId: string, codigo: string, metodo: MetodoPagamento, parcelas: number, cartao?: DadosCartao) {
    const compra = await prisma.compra.findUnique({ where: { codigo }, include: { pagamento: true } });
    if (!compra || compra.consumidorId !== consumidorId) throw notFound('Compra não encontrada');
    if (compra.status !== StatusCompra.AGUARDANDO_PAGAMENTO) throw badRequest('Esta compra não está aguardando pagamento');
    if (compra.reservaExpiraEm < new Date()) throw badRequest('A reserva das peças expirou. Refaça a compra.');
    if (compra.pagamento) throw conflict('O pagamento desta compra já foi iniciado');

    let meio: MeioDePagamento;
    if (metodo === MetodoPagamento.CARTAO) {
      if (!cartao) throw badRequest('Dados inválidos', [{ campo: 'cartao', mensagem: 'Informe os dados do cartão' }]);
      const erros = validarCartao(cartao);
      if (erros.length) throw badRequest('Dados do cartão inválidos', erros);
      meio = new CartaoSimulado(cartao);
    } else {
      meio = metodo === MetodoPagamento.PIX ? new PixSimulado(env.RESERVA_MINUTOS) : new BoletoSimulado(3);
    }

    const valor = Number(compra.valorTotal);
    const resultado = await meio.iniciar(valor, compra.codigo);

    await prisma.$transaction(async tx => {
      // Trava a compra primeiro (mesma ordem de lock do webhook e da expiração)
      const [travada] = await tx.$queryRaw<{ status: StatusCompra }[]>`SELECT "status" FROM "Compra" WHERE "id" = ${compra.id} FOR UPDATE`;
      // A reserva pode ter expirado entre a validação acima e este ponto
      if (travada.status !== StatusCompra.AGUARDANDO_PAGAMENTO) throw badRequest('Esta compra não está mais aguardando pagamento');
      const base = { compraId: compra.id, metodo, parcelas: metodo === MetodoPagamento.CARTAO ? parcelas : 1, codigoTransacao: resultado.codigoTransacao };

      if (resultado.tipo === 'PENDENTE') {
        await tx.pagamento.create({
          data: { ...base, status: StatusPagamento.PENDENTE, expiraEm: resultado.expiraEm, pixCopiaECola: resultado.pixCopiaECola, pixQrCode: resultado.pixQrCode, linhaDigitavel: resultado.linhaDigitavel },
        });
        // A reserva do estoque passa a durar até o vencimento do PIX/boleto
        await tx.compra.update({ where: { id: compra.id }, data: { reservaExpiraEm: resultado.expiraEm } });
      } else if (resultado.tipo === 'APROVADO') {
        await tx.pagamento.create({ data: { ...base, status: StatusPagamento.APROVADO, cartaoFinal: resultado.cartaoFinal, dataProcessamento: new Date() } });
        await confirmarCompra(tx, compra.id);
      } else {
        await tx.pagamento.create({
          data: { ...base, status: StatusPagamento.RECUSADO, cartaoFinal: resultado.cartaoFinal, motivoRecusa: resultado.motivo, dataProcessamento: new Date() },
        });
        await cancelarCompra(tx, compra.id, 'PAGAMENTO_RECUSADO');
      }
    }, OPCOES_TX);

    if (resultado.tipo === 'PENDENTE') {
      await agendarExpiracao(resultado.expiraEm).catch(err => console.error('[fila] falha ao agendar expiração:', err));
    }
    if (resultado.tipo === 'RECUSADO') {
      await invalidarCatalogo(); // estoque devolvido
      throw new AppError(
        402,
        `Pagamento recusado pela operadora (${resultado.motivo.toLowerCase()}). Nenhum valor foi cobrado e o seu carrinho foi mantido: tente outro cartão ou outro meio de pagamento.`,
      );
    }
    return this.detalhe(consumidorId, codigo);
  },

  /**
   * Confirmação do pagamento pelo gateway (webhook) — IDEMPOTENTE (TC16).
   * O UPDATE condicional (status = PENDENTE) garante que, mesmo com callbacks simultâneos,
   * só um deles confirma; os demais recebem `jaProcessado: true`.
   */
  async confirmarPagamento(codigoTransacao: string) {
    const pagamento = await prisma.pagamento.findUnique({ where: { codigoTransacao }, select: { compraId: true } });
    if (!pagamento) throw notFound('Transação não encontrada');

    const resultado = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Compra" WHERE "id" = ${pagamento.compraId} FOR UPDATE`;
      const { count } = await tx.pagamento.updateMany({
        where: { codigoTransacao, status: StatusPagamento.PENDENTE, expiraEm: { gt: new Date() } },
        data: { status: StatusPagamento.APROVADO, dataProcessamento: new Date() },
      });
      if (!count) {
        const atual = await tx.pagamento.findUniqueOrThrow({ where: { codigoTransacao }, select: { status: true } });
        if (atual.status === StatusPagamento.APROVADO) return { processado: false, jaProcessado: true };
        throw badRequest(atual.status === StatusPagamento.PENDENTE || atual.status === StatusPagamento.EXPIRADO ? 'Pagamento expirado' : 'Pagamento não pode ser confirmado');
      }
      await confirmarCompra(tx, pagamento.compraId);
      return { processado: true, jaProcessado: false };
    }, OPCOES_TX);
    return resultado;
  },

  /** Usado pela tela de pagamento (ambiente de demonstração) para simular o pagamento do PIX/boleto. */
  async simularPagamento(consumidorId: string, codigo: string) {
    const compra = await prisma.compra.findUnique({ where: { codigo }, include: { pagamento: true } });
    if (!compra || compra.consumidorId !== consumidorId) throw notFound('Compra não encontrada');
    if (!compra.pagamento) throw badRequest('Escolha a forma de pagamento antes');
    await this.confirmarPagamento(compra.pagamento.codigoTransacao);
    return this.detalhe(consumidorId, codigo);
  },

  /**
   * Cancela compras com reserva vencida e devolve o estoque (TC16). Rodado periodicamente pelo worker.
   * `SKIP LOCKED` permite vários workers em paralelo sem processar a mesma compra duas vezes.
   */
  async expirarReservas(lote = 100): Promise<number> {
    let canceladas = 0;
    const vencidas = await prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Compra"
      WHERE "status" = 'AGUARDANDO_PAGAMENTO' AND "reservaExpiraEm" < NOW()
      ORDER BY "reservaExpiraEm" LIMIT ${lote}`;
    for (const { id } of vencidas) {
      const ok = await prisma.$transaction(async tx => {
        const [livre] = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Compra" WHERE "id" = ${id} FOR UPDATE SKIP LOCKED`;
        return livre ? cancelarCompra(tx, id, 'EXPIRADA') : false;
      }, OPCOES_TX);
      if (ok) canceladas++;
    }
    if (canceladas) await invalidarCatalogo();
    return canceladas;
  },

  async boletoPdf(codigoTransacao: string) {
    const pagamento = await prisma.pagamento.findUnique({
      where: { codigoTransacao },
      include: { compra: { select: { codigo: true, valorTotal: true, consumidor: { select: { usuario: { select: { nome: true } } } } } } },
    });
    if (!pagamento || pagamento.metodo !== MetodoPagamento.BOLETO) throw notFound('Boleto não encontrado');
    return { pagamento, valor: dinheiro(pagamento.compra.valorTotal) };
  },
};
