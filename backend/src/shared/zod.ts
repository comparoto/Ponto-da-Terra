import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Permite anotar os schemas com .openapi(...) para gerar o Swagger a partir das mesmas validações.
extendZodWithOpenApi(z);

// Mensagens de validação padrão em português (usadas quando o schema não define uma própria).
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined' || issue.received === 'null') return { message: 'Campo obrigatório' };
      return { message: `Tipo inválido: esperado ${issue.expected}` };
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') return { message: `Deve ter no mínimo ${issue.minimum} caractere(s)` };
      if (issue.type === 'number')
        return { message: issue.inclusive ? `Deve ser maior ou igual a ${issue.minimum}` : `Deve ser maior que ${issue.minimum}` };
      if (issue.type === 'array') return { message: `Informe ao menos ${issue.minimum} item(ns)` };
      break;
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') return { message: `Deve ter no máximo ${issue.maximum} caractere(s)` };
      if (issue.type === 'number') return { message: `Deve ser menor ou igual a ${issue.maximum}` };
      if (issue.type === 'array') return { message: `Informe no máximo ${issue.maximum} item(ns)` };
      break;
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'E-mail inválido' };
      if (issue.validation === 'url') return { message: 'URL inválida' };
      if (issue.validation === 'uuid') return { message: 'Identificador inválido' };
      break;
    case z.ZodIssueCode.invalid_enum_value:
      return { message: `Valor inválido. Opções: ${issue.options.join(', ')}` };
    case z.ZodIssueCode.unrecognized_keys:
      return { message: `Campo(s) não permitido(s): ${issue.keys.join(', ')}` };
  }
  return { message: ctx.defaultError };
});

export { z };
