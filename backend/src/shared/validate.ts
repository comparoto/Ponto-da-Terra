import type { RequestHandler } from 'express';
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

/** Helper de tipagem para ler os dados validados no handler. */
export const valid = <S extends ZodTypeAny>(v: unknown, _schema: S) => v as z.infer<S>;
