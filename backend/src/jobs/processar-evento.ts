import { Prisma, TipoEvento } from '@prisma/client';
import { prisma } from '../config/prisma';
import { enviarEmail, urlDoSite } from '../shared/email';
import type { EventoPublicado } from './outbox';
import { processarImagem, type PayloadImagem } from './processar-imagem';

/**
 * Consumidor da fila de eventos (HU12 cenário 2): gera/atualiza a notificação do destinatário,
 * envia o e-mail (SMTP, se configurado — ver shared/email.ts) e grava o log de envio.
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
  CADASTRO_APROVADO: 'Seu cadastro de artesão foi aprovado',
  CADASTRO_REJEITADO: 'Seu cadastro de artesão precisa de ajustes',
  IMAGEM_ENVIADA: '',
};

/** Mantidos aqui por compatibilidade: o envio fica em shared/email.ts */
export { definirEnvioDeEmail } from '../shared/email';
export type { Email as EmailEnviado } from '../shared/email';

type Payload = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v));

/** Corpo do e-mail de cada evento, com o link para a tela certa do site */
function conteudo(tipo: Exclude<TipoEvento, 'IMAGEM_ENVIADA'>, p: Payload): { titulo: string; paragrafos: string[]; botao: { texto: string; url: string } } {
  const painel = { texto: 'Abrir meu painel', url: urlDoSite('/artesao') };
  switch (tipo) {
    case 'NOVO_PEDIDO':
      return { titulo: 'Você recebeu um novo pedido!', paragrafos: [`Compra ${str(p.codigoCompra)}: ${str(p.itens)}.`, 'Confira os itens e o endereço de entrega no seu painel e prepare o envio.'], botao: { texto: 'Ver pedido', url: urlDoSite('/artesao') } };
    case 'PRODUTO_APROVADO':
      return { titulo: 'Sua peça foi aprovada', paragrafos: [`"${str(p.titulo)}" passou pela curadoria e já está na vitrine.`], botao: painel };
    case 'PRODUTO_REJEITADO':
      return { titulo: 'Sua peça precisa de ajustes', paragrafos: [`"${str(p.titulo)}" não foi aprovada pela curadoria.`, `Motivo: ${str(p.justificativa)}`, 'Ajuste a peça no painel e ela volta para a análise.'], botao: painel };
    case 'NOVA_MENSAGEM':
      return { titulo: 'Um comprador enviou uma dúvida', paragrafos: [`${str(p.comprador)} perguntou sobre "${str(p.titulo)}":`, `"${str(p.trecho)}"`], botao: { texto: 'Responder', url: urlDoSite('/artesao') } };
    case 'PEDIDO_ATUALIZADO':
      return {
        titulo: 'Seu pedido foi atualizado',
        paragrafos: [str(p.mensagem) || 'Há novidades sobre o seu pedido.', ...(p.codigoRastreio ? [`Código de rastreio: ${str(p.codigoRastreio)}`] : []), ...(p.codigoCompra ? [`Compra ${str(p.codigoCompra)}`] : [])],
        botao: { texto: 'Acompanhar pedido', url: urlDoSite('/meus-pedidos') },
      };
    case 'CADASTRO_APROVADO':
      return { titulo: 'Bem-vindo ao Ponto da Terra!', paragrafos: ['Seu cadastro de artesão foi aprovado. Seu perfil e suas peças aprovadas já aparecem na vitrine.'], botao: painel };
    case 'CADASTRO_REJEITADO':
      return { titulo: 'Seu cadastro precisa de ajustes', paragrafos: [`Motivo: ${str(p.motivo)}`, 'Atualize seu perfil e fale com a curadoria pelo contato do site.'], botao: painel };
  }
}

export async function processarEvento(evento: EventoPublicado) {
  // Tarefa técnica (não gera notificação): otimizar a foto enviada
  if (evento.tipo === TipoEvento.IMAGEM_ENVIADA) return processarImagem(evento.payload as unknown as PayloadImagem);

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
    if (destinatario) await enviarEmail({ para: destinatario, assunto: ASSUNTOS[evento.tipo], eventoId: evento.id, ...conteudo(evento.tipo as Exclude<TipoEvento, 'IMAGEM_ENVIADA'>, payload) });
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
