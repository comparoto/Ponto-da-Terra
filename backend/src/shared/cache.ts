import { createHash } from 'node:crypto';
import { env } from '../config/env';
import { getRedis } from '../config/redis';

/**
 * Cache do catálogo (exigência do Notion: "cache em pontos críticos, como o catálogo").
 *
 * Estratégia de invalidação por versão: toda chave inclui o número em `catalogo:versao`.
 * Qualquer alteração que afete a vitrine (aprovação, edição, exclusão, estoque) incrementa
 * a versão — as chaves antigas deixam de ser lidas e expiram sozinhas pelo TTL.
 * Isso evita varrer o Redis (SCAN/DEL) a cada escrita.
 */
const VERSAO_KEY = 'catalogo:versao';

export const chaveDe = (prefixo: string, partes: unknown) =>
  `${prefixo}:${createHash('sha1').update(JSON.stringify(partes)).digest('hex')}`;

export async function comCache<T>(prefixo: string, partes: unknown, carregar: () => Promise<T>): Promise<{ valor: T; hit: boolean }> {
  const redis = getRedis();
  if (!redis) return { valor: await carregar(), hit: false };

  try {
    const versao = (await redis.get(VERSAO_KEY)) ?? '0';
    const chave = `catalogo:v${versao}:${chaveDe(prefixo, partes)}`;
    const salvo = await redis.get(chave);
    if (salvo) return { valor: JSON.parse(salvo) as T, hit: true };

    const valor = await carregar();
    await redis.set(chave, JSON.stringify(valor), 'EX', env.CACHE_TTL_SECONDS);
    return { valor, hit: false };
  } catch {
    // Redis falhou no meio da operação: segue sem cache
    return { valor: await carregar(), hit: false };
  }
}

export async function invalidarCatalogo(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.incr(VERSAO_KEY).catch(() => undefined);
}
