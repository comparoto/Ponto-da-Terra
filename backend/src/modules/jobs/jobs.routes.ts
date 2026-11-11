import { timingSafeEqual } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import { env } from '../../config/env';
import { documentar } from '../../docs/registry';
import { publicarPendentes, type EventoPublicado } from '../../jobs/outbox';
import { processarEvento } from '../../jobs/processar-evento';
import { assinaturaQStashValida, publicarViaQStash } from '../../jobs/serverless';
import { ok } from '../../shared/api-result';
import { badRequest, unauthorized } from '../../shared/errors';
import { z } from '../../shared/zod';
import { comprasService } from '../compras/compras.service';

/**
 * Rotas internas de processamento assíncrono, usadas no modo serverless (Vercel):
 * chamadas pelo QStash (assinatura no header Upstash-Signature) ou pelo Vercel Cron
 * (Authorization: Bearer CRON_SECRET). Não são para o frontend.
 */
export const jobsRoutes = Router();
const tags = ['Interno · Filas'];

const iguais = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

const autenticarJob: RequestHandler = async (req, _res, next) => {
  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (bearer && env.CRON_SECRET && iguais(bearer, env.CRON_SECRET)) return next();

  const assinatura = req.headers['upstash-signature'];
  if (typeof assinatura === 'string' && env.PUBLIC_URL) {
    const url = `${env.PUBLIC_URL.replace(/\/$/, '')}${req.originalUrl}`;
    if (await assinaturaQStashValida(assinatura, req.rawBody ?? '', url)) return next();
  }
  next(unauthorized('Chamada de job não autorizada'));
};

const eventoBody = z.object({ id: z.string().min(1), tipo: z.string().min(1), payload: z.record(z.string(), z.unknown()) });

documentar({
  method: 'post',
  path: '/api/jobs/evento',
  tags,
  summary: 'Processa um evento da fila (chamado pelo QStash) — notificação + e-mail simulado',
  sucesso: { status: 200, descricao: 'Evento processado', data: z.any() },
  falhas: [400, 401],
});
jobsRoutes.post('/jobs/evento', autenticarJob, async (req, res) => {
  const evento = eventoBody.safeParse(req.body);
  if (!evento.success) throw badRequest('Evento inválido');
  res.json(ok(await processarEvento(evento.data as EventoPublicado)));
});

documentar({
  method: 'post',
  path: '/api/jobs/expirar-reservas',
  tags,
  summary: 'Cancela compras com reserva vencida e devolve o estoque (QStash agendado / Vercel Cron)',
  sucesso: { status: 200, descricao: 'Quantidade de compras canceladas', data: z.object({ canceladas: z.number() }) },
  falhas: [401],
});
const expirar: RequestHandler = async (_req, res) => {
  res.json(ok({ canceladas: await comprasService.expirarReservas() }));
};
jobsRoutes.post('/jobs/expirar-reservas', autenticarJob, expirar);
jobsRoutes.get('/jobs/expirar-reservas', autenticarJob, expirar); // Vercel Cron usa GET

documentar({
  method: 'post',
  path: '/api/jobs/outbox-relay',
  tags,
  summary: 'Publica eventos pendentes da outbox (rede de segurança via Vercel Cron)',
  sucesso: { status: 200, descricao: 'Quantidade de eventos publicados', data: z.object({ publicados: z.number() }) },
  falhas: [401],
});
const relay: RequestHandler = async (_req, res) => {
  // No modo QStash publica na fila; sem QStash (ex.: teste), processa direto
  const publicados = env.QSTASH_TOKEN ? await publicarViaQStash() : await publicarPendentes(e => processarEvento(e));
  res.json(ok({ publicados }));
};
jobsRoutes.post('/jobs/outbox-relay', autenticarJob, relay);
jobsRoutes.get('/jobs/outbox-relay', autenticarJob, relay);
