import { criarApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { closeRedis, waitRedisReady } from './config/redis';

async function iniciar() {
  await prisma.$connect();
  await waitRedisReady();

  const server = criarApp().listen(env.PORT, () => {
    console.log(`API Ponto da Terra em http://localhost:${env.PORT}/api`);
    console.log(`Swagger em http://localhost:${env.PORT}/api/docs`);
  });

  const encerrar = (sinal: string) => {
    console.log(`${sinal} recebido, encerrando...`);
    server.close(async () => {
      await Promise.allSettled([prisma.$disconnect(), closeRedis()]);
      process.exit(0);
    });
  };
  process.on('SIGINT', () => encerrar('SIGINT'));
  process.on('SIGTERM', () => encerrar('SIGTERM'));
}

iniciar().catch(err => {
  console.error('Falha ao iniciar a API:', err);
  process.exit(1);
});
