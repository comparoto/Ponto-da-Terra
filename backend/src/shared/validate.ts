import type { Request, RequestHandler } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { badRequest } from './errors';

type Schemas = { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny };

/**
 * Valida body/query/params com Zod ANTES de chegar ao handler (e portanto antes do banco — TC05).
 * Em caso de falha responde 400 com a lista exata de campos inválidos.
 * Os valores já convertidos ficam em req.valid (no Express 5, req.query é somente leitura).
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    const valid: Record<string, unknown> = {};
    const errors: { campo: string; mensagem: string }[] = [];

    for (const parte of ['params', 'query', 'body'] as const) {
      const schema = schemas[parte];
      if (!schema) continue;
      const result = schema.safeParse(req[parte] ?? {});
      if (result.success) valid[parte] = result.data;
      else
        for (const issue of result.error.issues)
          errors.push({ campo: issue.path.join('.') || parte, mensagem: issue.message });
    }

    if (errors.length) return next(badRequest('Dados inválidos', errors));
    req.valid = { ...req.valid, ...valid };
    next();
  };

type Parte = 'body' | 'query' | 'params';

/**
 * Lê a parte da requisição que o `validate` já conferiu, com o tipo exato do schema.
 * O schema é passado só para dar o tipo (a validação em si já aconteceu no middleware);
 * pedir uma parte que a rota não validou é erro de programação e falha na hora.
 */
export function entrada<S extends ZodTypeAny>(req: Request, parte: Parte, _schema: S): z.infer<S> {
  const valor = req.valid?.[parte];
  if (valor === undefined) throw new Error(`A rota não validou "${parte}" antes de usá-la`);
  return valor as z.infer<S>;
}
