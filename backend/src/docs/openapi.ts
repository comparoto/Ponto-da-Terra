import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry';

/** Gera o documento OpenAPI a partir dos schemas Zod registrados nas rotas (chamar após importar as rotas). */
export function gerarOpenApi() {
  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Origem: Ponto da Terra — API',
      version: '0.1.0',
      description:
        'API REST do marketplace de artesanato pernambucano.\n\n' +
        'Todas as respostas seguem o envelope `ApiResult<T>` = `{ success, data, error, meta?, errors? }`.\n\n' +
        'Autenticação: faça login em `POST /api/auth/login`, clique em **Authorize** e cole o token.\n\n' +
        'Contas de demonstração: `admin@pontodaterra.com / admin123`, `comprador@pontodaterra.com / comprador123`, ' +
        '`artesao@pontodaterra.com / artesao123`.',
    },
    servers: [{ url: '/' }],
  });
}
