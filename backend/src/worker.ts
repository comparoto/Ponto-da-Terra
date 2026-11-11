/**
 * Worker de processamento assíncrono (FCCPD / HU12) — processo SEPARADO da API.
 *
 *   API ──(mesma transação)──► EventoOutbox ──relay──► fila "eventos" (Redis/BullMQ) ──► consumidores
 *
 * Filas:
 *  - "manutencao": tarefas periódicas
 *      · outbox-relay (a cada 1 s): publica os eventos da outbox na fila "eventos"
 *      · expirar-reservas (a cada 60 s): cancela compras não pagas e devolve o estoque (TC16)
 *  - "eventos": notificações (in-app + e-mail simulado), com 5 tentativas e backoff exponencial
 *
 * Uso: npm run worker   (em desenvolvimento: npm run dev:worker)
 */
import { Queue, Worker } from 'bullmq';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { closeRedis } from './config/redis';
import { FILA_EVENTOS, FILA_MANUTENCAO, conexaoFila } from './jobs/filas';
import { publicarPendentes } from './jobs/outbox';
import { processarEvento } from './jobs/processar-evento';
import { comprasService } from './modules/compras/compras.service';

async function iniciar() {
  const connection = conexaoFila();

  const filaEventos = new Queue(FILA_EVENTOS, {
    connection,
    defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 1000, removeOnFail: 5000 },
  });
  const filaManutencao = new Queue(FILA_MANUTENCAO, { connection });

  await filaManutencao.upsertJobScheduler('outbox-relay', { every: 1000 }, { name: 'outbox-relay' });
  await filaManutencao.upsertJobScheduler('expirar-reservas', { every: 60_000 }, { name: 'expirar-reservas' });

  const manutencao = new Worker(
    FILA_MANUTENCAO,
    async job => {
      if (job.name === 'outbox-relay') {
        const n = await publicarPendentes(evento => filaEventos.add(evento.tipo, evento, { jobId: evento.id }));
        if (n) console.info(`[worker] ${n} evento(s) publicados na fila`);
        return n;
      }
      if (job.name === 'expirar-reservas') {
        const n = await comprasService.expirarReservas();
        if (n) console.info(`[worker] ${n} compra(s) expirada(s); estoque devolvido`);
        return n;
      }
    },
    { connection, concurrency: 1 },
  );

  const eventos = new Worker(FILA_EVENTOS, async job => processarEvento(job.data), { connection, concurrency: 5 });

  eventos.on('completed', job => console.info(`[worker] ${job.name} processado (evento ${job.id})`));
  eventos.on('failed', (job, err) => console.error(`[worker] falha em ${job?.name} (tentativa ${job?.attemptsMade}): ${err.message}`));
  manutencao.on('failed', (job, err) => console.error(`[worker] falha em ${job?.name}: ${err.message}`));

  console.info(`[worker] em execução (${env.NODE_ENV}) · filas: ${FILA_EVENTOS}, ${FILA_MANUTENCAO}`);

  const encerrar = async (sinal: string) => {
    console.info(`[worker] ${sinal} recebido, encerrando...`);
    await Promise.allSettled([manutencao.close(), eventos.close(), filaEventos.close(), filaManutencao.close()]);
    await Promise.allSettled([prisma.$disconnect(), closeRedis()]);
    process.exit(0);
  };
  process.on('SIGINT', () => void encerrar('SIGINT'));
  process.on('SIGTERM', () => void encerrar('SIGTERM'));
}

iniciar().catch(err => {
  console.error('[worker] falha ao iniciar:', err);
  process.exit(1);
});
