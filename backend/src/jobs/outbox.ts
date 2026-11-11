import type { TipoEvento } from '@prisma/client';
import { prisma } from '../config/prisma';

export type EventoPublicado = { id: string; tipo: TipoEvento; payload: Record<string, unknown> };

/**
 * Relay da Transactional Outbox → fila.
 *
 * Pega um lote de eventos ainda não publicados com `FOR UPDATE SKIP LOCKED` (vários relays
 * podem rodar em paralelo sem pegar o mesmo evento), entrega cada um à fila e só então marca
 * como publicado, tudo na mesma transação. Se a fila falhar, nada é marcado e o evento é
 * tentado de novo no próximo ciclo (entrega "pelo menos uma vez"). A fila usa o id do evento
 * como jobId, então uma eventual repetição não gera job duplicado.
 */
export async function publicarPendentes(enfileirar: (evento: EventoPublicado) => Promise<unknown>, lote = 100): Promise<number> {
  return prisma.$transaction(
    async tx => {
      const eventos = await tx.$queryRaw<EventoPublicado[]>`
        SELECT "id", "tipo", "payload" FROM "EventoOutbox"
        WHERE "publicadoEm" IS NULL
        ORDER BY "criadoEm"
        LIMIT ${lote}
        FOR UPDATE SKIP LOCKED`;
      for (const evento of eventos) await enfileirar(evento);
      if (eventos.length) {
        await tx.eventoOutbox.updateMany({ where: { id: { in: eventos.map(e => e.id) } }, data: { publicadoEm: new Date() } });
      }
      return eventos.length;
    },
    { timeout: 30_000 },
  );
}
