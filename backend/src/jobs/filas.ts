import type { ConnectionOptions } from 'bullmq';
import { env } from '../config/env';

export const FILA_EVENTOS = 'eventos';
export const FILA_MANUTENCAO = 'manutencao';

/** Conexão do BullMQ a partir do REDIS_URL (o worker exige maxRetriesPerRequest = null). */
export function conexaoFila(): ConnectionOptions {
  if (!env.REDIS_URL) throw new Error('REDIS_URL é obrigatória para o worker de filas');
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: Number(url.pathname.replace('/', '') || 0),
    tls: url.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}
