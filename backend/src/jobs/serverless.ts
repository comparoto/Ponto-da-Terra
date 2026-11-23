import { Client, Receiver } from '@upstash/qstash';
import { waitUntil } from '@vercel/functions';
import type { RequestHandler } from 'express';
import { env, isTest, modoFila } from '../config/env';
import { publicarPendentes, type EventoPublicado } from './outbox';

/**
 * Fila no modo serverless (Vercel), com Upstash QStash no lugar do BullMQ + worker.
 *
 *   API ──(mesma transação)──► EventoOutbox
 *     └─ logo após responder (waitUntil) ──► relay ──► QStash ──HTTP──► POST /api/jobs/evento ──► processarEvento
 *
 *  - O relay é o MESMO usado pelo worker local (publicarPendentes), só muda o destino.
 *  - O QStash refaz a entrega com backoff se a rota falhar, e o deduplicationId (= id do evento)
 *    impede que o mesmo evento seja enfileirado duas vezes.
 *  - A expiração de reservas é agendada para o instante exato (mensagem com atraso), em vez de
 *    um job a cada minuto. Um Vercel Cron diário roda a expiração como rede de segurança.
 */

type Publicador = { publishJSON: Client['publishJSON'] };

let cliente: Publicador | null = null;
export const definirPublicador = (p: Publicador | null) => {
  cliente = p;
};
function publicador(): Publicador {
  if (!cliente) cliente = new Client({ token: env.QSTASH_TOKEN!, ...(env.QSTASH_URL ? { baseUrl: env.QSTASH_URL } : {}) });
  return cliente;
}

const urlJob = (rota: string) => {
  if (!env.PUBLIC_URL) throw new Error('PUBLIC_URL é obrigatória no modo QStash (a fila precisa chamar a API de volta)');
  return `${env.PUBLIC_URL.replace(/\/$/, '')}/api/jobs/${rota}`;
};

/** Publica no QStash os eventos pendentes da outbox. */
export function publicarViaQStash(): Promise<number> {
  return publicarPendentes((evento: EventoPublicado) =>
    publicador().publishJSON({ url: urlJob('evento'), body: evento, deduplicationId: evento.id, retries: 5 }),
  );
}

/** Agenda a expiração de reservas para o instante informado (modo QStash). No modo BullMQ, o worker já verifica a cada minuto. */
export async function agendarExpiracao(quando: Date): Promise<void> {
  if (modoFila !== 'qstash') return;
  await publicador().publishJSON({
    url: urlJob('expirar-reservas'),
    body: { motivo: 'reserva-vencida' },
    notBefore: Math.ceil(quando.getTime() / 1000) + 5,
    retries: 3,
  });
}

/**
 * Depois de cada requisição que altera dados, dispara o relay da outbox SEM atrasar a resposta
 * (waitUntil mantém a função viva só o necessário). No modo BullMQ não faz nada: o worker cuida.
 */
export const publicarAposResposta: RequestHandler = (req, res, next) => {
  if (modoFila === 'qstash' && req.method !== 'GET' && !req.path.startsWith('/api/jobs/')) {
    res.on('finish', () => {
      const tarefa = publicarViaQStash().catch(err => console.error('[fila] falha ao publicar eventos:', err));
      if (!isTest) waitUntil(tarefa);
    });
  }
  next();
};

/** Verifica a assinatura que o QStash envia em cada chamada (header Upstash-Signature). */
export async function assinaturaQStashValida(assinatura: string, corpo: string, url: string): Promise<boolean> {
  if (!env.QSTASH_CURRENT_SIGNING_KEY || !env.QSTASH_NEXT_SIGNING_KEY) return false;
  const receiver = new Receiver({ currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY, nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY });
  try {
    return await receiver.verify({ signature: assinatura, body: corpo, url });
  } catch {
    return false;
  }
}
