import Redis from 'ioredis';
import { env } from './env';

/**
 * Cliente Redis compartilhado (cache do catálogo; na fase 2 também as filas BullMQ).
 * Se o Redis estiver indisponível, a API continua funcionando sem cache (degradação graciosa).
 */
let client: Redis | null = null;
let avisou = false;

export function getRedis(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    client.on('error', err => {
      if (!avisou) {
        console.warn(`[redis] indisponível (${err.message}); cache desativado até reconectar.`);
        avisou = true;
      }
    });
    client.on('ready', () => {
      avisou = false;
    });
  }
  return client.status === 'ready' ? client : null;
}

export async function waitRedisReady(timeoutMs = 3000): Promise<void> {
  getRedis();
  if (!client || client.status === 'ready') return;
  await new Promise<void>(resolve => {
    const t = setTimeout(resolve, timeoutMs);
    client!.once('ready', () => {
      clearTimeout(t);
      resolve();
    });
  });
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => client?.disconnect());
    client = null;
  }
}
