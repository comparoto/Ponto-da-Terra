import { PrismaClient } from '@prisma/client';
import { env } from './env';

/**
 * Pooler de conexões (Neon "-pooler" / PgBouncer em modo transação): o Prisma precisa de
 * `pgbouncer=true` para não usar prepared statements nomeados. Acrescenta automaticamente
 * quando a URL aponta para um pooler e o parâmetro não foi informado.
 */
export function ajustarUrlBanco(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('-pooler') && !u.searchParams.has('pgbouncer')) u.searchParams.set('pgbouncer', 'true');
    return u.toString();
  } catch {
    return url;
  }
}

export const prisma = new PrismaClient({ datasourceUrl: ajustarUrlBanco(env.DATABASE_URL) });
