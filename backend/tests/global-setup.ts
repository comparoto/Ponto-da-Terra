import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import Redis from 'ioredis';

/**
 * Prepara o banco de TESTE: aplica as migrations pendentes (não destrutivo) e roda o seed,
 * que limpa e repopula as tabelas. Também limpa o cache Redis de teste e a pasta de uploads de teste.
 *
 * Trava de segurança: só executa se o banco alvo terminar em "_test", para que a suíte
 * nunca apague o banco de desenvolvimento (ou de produção) por engano.
 */
export default async function globalSetup() {
  const raiz = resolve(__dirname, '..');
  const env = config({ path: resolve(raiz, '.env.test'), override: true }).parsed!;

  const banco = new URL(env.DATABASE_URL).pathname.replace(/^\//, '');
  if (!banco.endsWith('_test')) {
    throw new Error(`Testes abortados: DATABASE_URL aponta para "${banco}", que não é um banco de teste (*_test).`);
  }

  const execEnv = { ...process.env, ...env };
  execSync('npx prisma migrate deploy', { cwd: raiz, env: execEnv, stdio: 'pipe' });
  execSync('npx tsx prisma/seed.ts', { cwd: raiz, env: execEnv, stdio: 'pipe' });

  const redis = new Redis(env.REDIS_URL);
  await redis.flushdb();
  await redis.quit();

  rmSync(resolve(raiz, env.UPLOAD_DIR), { recursive: true, force: true });
}
