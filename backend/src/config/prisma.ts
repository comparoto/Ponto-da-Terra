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
// Tamanho do pool: 10 conexões por instância no ambiente local e 3 na Vercel. `DB_POOL_MAX` só existe para os
// experimentos de benchmark (docs/md/RELATORIO_FCCPD_U2.md); sem ela, o comportamento é exatamente o de antes.
const poolPadrao = Number(process.env.DB_POOL_MAX) || (naVercel ? 3 : 10);

export const criarPrisma = (connectionString: string, maxConexoes = poolPadrao) =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString, max: maxConexoes }) });

export const prisma = criarPrisma(env.DATABASE_URL);
