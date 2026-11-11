import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { env, naVercel } from './env';

/**
 * Prisma 7: a conexão é feita pelo driver `pg` (node-postgres) através do adaptador oficial.
 *
 * O adaptador não usa prepared statements nomeados, então funciona direto com o pooler do Neon
 * (PgBouncer em modo transação) — o antigo parâmetro `pgbouncer=true` deixou de ser necessário.
 * Nas funções serverless da Vercel, cada instância abre poucas conexões: quem multiplexa é o pooler.
 */
export const criarPrisma = (connectionString: string, maxConexoes = naVercel ? 3 : 10) =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString, max: maxConexoes }) });

export const prisma = criarPrisma(env.DATABASE_URL);
