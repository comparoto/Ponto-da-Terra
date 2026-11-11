import { Prisma, TipoEvento } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { EventoPublicado } from './outbox';

/**
 * Consumidor da fila de eventos (HU12 cenário 2): gera/atualiza a notificação do destinatário,
 * "envia" o e-mail (simulado — registrado no log do worker) e grava o log de envio.
 *
 * IDEMPOTENTE: a notificação é identificada pelo id do evento (`eventoId` único). Se o mesmo
 * evento for processado de novo (retry da fila), nenhuma notificação duplicada é criada.
 */
const ASSUNTOS: Record<TipoEvento, string> = {
  NOVO_PEDIDO: 'Você recebeu um novo pedido',
  PRODUTO_APROVADO: 'Sua peça foi aprovada e já está na vitrine',
  PRODUTO_REJEITADO: 'Sua peça precisa de ajustes',
  NOVA_MENSAGEM: 'Um comprador enviou uma dúvida sobre sua peça',
  PEDIDO_ATUALIZADO: 'Atualização do pedido',
};

export type EmailEnviado = { para: string; assunto: string; eventoId: string };

/** Ponto de extensão para um provedor real de e-mail (SMTP, SES...). Hoje só registra no log. */
export let enviarEmail = async (email: EmailEnviado): Promise<void> => {
  if (process.env.NODE_ENV !== 'test') console.info(`[worker] e-mail (simulado) para ${email.para}: ${email.assunto} · evento ${email.eventoId}`);
};
export const definirEnvioDeEmail = (fn: typeof enviarEmail) => {
  enviarEmail = fn;
};

export async function processarEvento(evento: EventoPublicado) {
  const payload = (evento.payload ?? {}) as Record<string, unknown>;
  const artesaoId = typeof payload.artesaoId === 'string' ? payload.artesaoId : undefined;
  const usuarioId = typeof payload.usuarioId === 'string' ? payload.usuarioId : undefined;
  const pedidoId = typeof payload.pedidoId === 'string' ? payload.pedidoId : undefined;

  // Cria a notificação se ainda não existe (NOVO_PEDIDO); as demais já foram criadas na transação de origem
  let notificacao;
  try {
    notificacao = await prisma.notificacaoLog.upsert({
      where: { eventoId: evento.id },
      create: { eventoId: evento.id, tipoEvento: evento.tipo, payload: payload as Prisma.InputJsonObject, artesaoId, usuarioId, pedidoId },
      update: {},
    });
  } catch (e) {
    // Dois workers processando o mesmo evento ao mesmo tempo: o segundo encontra o registro já criado
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      notificacao = await prisma.notificacaoLog.findUniqueOrThrow({ where: { eventoId: evento.id } });
    } else throw e;
  }
  if (notificacao.enviadoComSucesso) return { notificacaoId: notificacao.id, reenviado: false };

  const destinatario = artesaoId
    ? await prisma.artesao.findUnique({ where: { id: artesaoId }, select: { usuario: { select: { email: true } } } }).then(a => a?.usuario.email)
    : usuarioId
      ? await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { email: true } }).then(u => u?.email)
      : undefined;

  try {
    if (destinatario) await enviarEmail({ para: destinatario, assunto: ASSUNTOS[evento.tipo], eventoId: evento.id });
    await prisma.notificacaoLog.update({
      where: { id: notificacao.id },
      data: { enviadoComSucesso: true, tentativas: { increment: 1 }, dataEnvio: new Date() },
    });
  } catch (erro) {
    await prisma.notificacaoLog.update({ where: { id: notificacao.id }, data: { tentativas: { increment: 1 } } });
    throw erro; // a fila tenta de novo com backoff exponencial
  }
  return { notificacaoId: notificacao.id, reenviado: true };
}
