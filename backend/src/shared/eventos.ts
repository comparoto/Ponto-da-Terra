import type { Prisma, TipoEvento } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/**
 * Transactional Outbox: o evento é gravado NA MESMA TRANSAÇÃO da operação de negócio.
 * Se a transação for desfeita, o evento some junto; se for confirmada, o relay do worker
 * garante que ele chegue à fila (pelo menos uma vez) — "sem perda de mensagens".
 */
export function registrarEvento(tx: Tx, tipo: TipoEvento, payload: Prisma.InputJsonObject) {
  return tx.eventoOutbox.create({ data: { tipo, payload } });
}

type Destino = { artesaoId?: string; usuarioId?: string; pedidoId?: string };

/**
 * Notificação in-app imediata (aparece no painel na hora) + evento na outbox para o
 * envio assíncrono (e-mail simulado) pelo worker. O `eventoId` liga os dois, então o
 * worker atualiza a mesma notificação em vez de criar outra.
 */
export async function notificar(tx: Tx, tipo: TipoEvento, destino: Destino, payload: Prisma.InputJsonObject) {
  const dados = { ...payload, ...destino } as Prisma.InputJsonObject;
  const evento = await registrarEvento(tx, tipo, dados);
  await tx.notificacaoLog.create({
    data: { eventoId: evento.id, tipoEvento: tipo, payload: dados, artesaoId: destino.artesaoId, usuarioId: destino.usuarioId, pedidoId: destino.pedidoId },
  });
  return evento;
}
