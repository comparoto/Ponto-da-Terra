import { OpenAPIRegistry, type RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '../shared/zod';

export const registry = new OpenAPIRegistry();

export const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

const erroCampo = z.object({ campo: z.string(), mensagem: z.string() });
const meta = z.object({ page: z.number(), limit: z.number(), totalItems: z.number(), totalPages: z.number() });

/** Envelope ApiResult<T> para a documentação. */
export const envelope = (data: z.ZodTypeAny = z.any(), paginado = false) =>
  z.object({
    success: z.boolean(),
    data: data.nullable(),
    error: z.string().nullable(),
    ...(paginado ? { meta } : {}),
  });

const envelopeErro = z
  .object({ success: z.literal(false), data: z.null(), error: z.string(), errors: z.array(erroCampo).optional() })
  .openapi('Erro');

const respostaErro = (descricao: string) => ({ description: descricao, content: { 'application/json': { schema: envelopeErro } } });

export const erros = {
  400: respostaErro('Dados inválidos (lista de campos em `errors`)'),
  401: respostaErro('Sem token, token inválido ou "Sessão expirada"'),
  403: respostaErro('Perfil sem permissão ou recurso de outro usuário'),
  404: respostaErro('Recurso não encontrado'),
  409: respostaErro('Conflito (ex.: e-mail já cadastrado)'),
};

type Doc = Omit<RouteConfig, 'responses'> & {
  sucesso: { status: number; descricao: string; data?: z.ZodTypeAny; paginado?: boolean };
  falhas?: (keyof typeof erros)[];
  autenticado?: boolean;
};

/** Registra uma rota no Swagger com o envelope ApiResult e os erros padrão. */
export function documentar({ sucesso, falhas = [], autenticado = false, ...rota }: Doc) {
  registry.registerPath({
    ...rota,
    security: autenticado ? [{ [bearerAuth.name]: [] }] : undefined,
    responses: {
      [sucesso.status]: {
        description: sucesso.descricao,
        content: { 'application/json': { schema: envelope(sucesso.data, sucesso.paginado) } },
      },
      ...Object.fromEntries(falhas.map(c => [c, erros[c]])),
    },
  });
}
