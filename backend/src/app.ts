import './shared/zod'; // registra mensagens de validação em PT-BR e a extensão OpenAPI antes de tudo
import { resolve } from 'node:path';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isTest, naVercel } from './config/env';
import { publicarAposResposta } from './jobs/serverless';
import { prisma } from './config/prisma';
import { getRedis, waitRedisReady } from './config/redis';
import { gerarOpenApi } from './docs/openapi';
import { paginaSwagger } from './docs/swagger-ui';
import { documentar } from './docs/registry';
import { adminRoutes } from './modules/admin/admin.routes';
import { adminExtrasRoutes } from './modules/admin/usuarios.routes';
import { painelArtesaoRoutes } from './modules/artesaos/painel.routes';
import { comprasRoutes } from './modules/compras/compras.routes';
import { interacaoRoutes } from './modules/interacao/interacao.routes';
import { jobsRoutes } from './modules/jobs/jobs.routes';
import { pedidosRoutes } from './modules/pedidos/pedidos.routes';
import { artesaosRoutes } from './modules/artesaos/artesaos.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { carrinhoRoutes } from './modules/carrinho/carrinho.routes';
import { notificacoesRoutes } from './modules/notificacoes/notificacoes.routes';
import { produtosRoutes } from './modules/produtos/produtos.routes';
import { ok } from './shared/api-result';
import { rotaNaoEncontrada, tratarErros } from './shared/error-handler';
import { z } from './shared/zod';

/**
 * CORS_ORIGIN: lista separada por vírgulas. Aceita curinga "*" dentro do host, útil para as URLs
 * de preview da Vercel (ex.: https://ponto-da-terra-*.vercel.app).
 */
export function origemPermitida(config: string) {
  const regras = config.split(',').map(o => o.trim()).filter(Boolean);
  const escapar = (s: string) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const padroes = regras.map(r => new RegExp(`^${escapar(r).replace(/\*/g, '[a-z0-9-]+')}$`, 'i'));
  return (origem: string | undefined, cb: (erro: Error | null, permitido?: boolean) => void) => {
    // Sem cabeçalho Origin (curl, apps, chamadas servidor-a-servidor como o QStash): não é requisição de navegador
    if (!origem) return cb(null, true);
    cb(null, padroes.some(p => p.test(origem)));
  };
}

export function criarApp() {
  const app = express();

  app.disable('x-powered-by');
  // Na Vercel a API fica atrás do proxy da plataforma: confia no X-Forwarded-For para obter o IP real (rate limit)
  if (naVercel) app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: origemPermitida(env.CORS_ORIGIN), exposedHeaders: ['X-Cache'] }));
  app.use(
    express.json({
      limit: '1mb',
      // Guarda o corpo original para verificar a assinatura das chamadas do QStash
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf.toString('utf8');
      },
    }),
  );
  app.use(publicarAposResposta); // modo serverless: publica os eventos da outbox logo após responder
  if (!isTest) app.use(morgan('dev'));

  // Imagens enviadas (storage local)
  app.use('/uploads', express.static(resolve(env.UPLOAD_DIR), { fallthrough: false, maxAge: '7d' }));

  const api = Router();

  documentar({
    method: 'get',
    path: '/api/health',
    tags: ['Infra'],
    summary: 'Health check (API, banco e Redis)',
    sucesso: { status: 200, descricao: 'Status dos serviços', data: z.object({ api: z.string(), banco: z.string(), redis: z.string() }) },
  });
  api.get('/health', async (_req, res) => {
    const banco = await prisma.$queryRaw`SELECT 1`.then(() => 'ok').catch(() => 'indisponivel');
    await waitRedisReady(1500); // em função serverless recém-iniciada, a conexão ainda pode estar abrindo
    const redis = getRedis() ? 'ok' : 'indisponivel';
    res.status(banco === 'ok' ? 200 : 503).json(ok({ api: 'ok', banco, redis }));
  });

  api.use(authRoutes);
  api.use(produtosRoutes);
  api.use(artesaosRoutes);
  api.use(carrinhoRoutes);
  api.use(notificacoesRoutes);
  api.use(comprasRoutes);
  api.use(pedidosRoutes);
  api.use(interacaoRoutes);
  api.use(painelArtesaoRoutes);
  api.use(adminExtrasRoutes);
  api.use(jobsRoutes);
  api.use(adminRoutes);

  const openapi = gerarOpenApi();
  api.get('/openapi.json', (_req, res) => res.json(openapi));
  app.get(['/api/docs', '/api/docs/'], paginaSwagger);

  app.use('/api', api);
  app.use(rotaNaoEncontrada);
  app.use(tratarErros);
  return app;
}
