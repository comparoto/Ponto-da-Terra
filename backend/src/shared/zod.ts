import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Permite anotar os schemas com .openapi(...) para gerar o Swagger a partir das mesmas validações.
extendZodWithOpenApi(z);

// Mensagens de validação padrão em português (usadas quando o schema não define uma própria).
z.config({
  customError: issue => {
    switch (issue.code) {
      case 'invalid_type':
        if (issue.input === undefined || issue.input === null) return 'Campo obrigatório';
        return `Tipo inválido: esperado ${issue.expected}`;
      case 'too_small':
        if (issue.origin === 'string') return `Deve ter no mínimo ${issue.minimum} caractere(s)`;
        if (issue.origin === 'number') return issue.inclusive ? `Deve ser maior ou igual a ${issue.minimum}` : `Deve ser maior que ${issue.minimum}`;
        if (issue.origin === 'array') return `Informe ao menos ${issue.minimum} item(ns)`;
        return undefined;
      case 'too_big':
        if (issue.origin === 'string') return `Deve ter no máximo ${issue.maximum} caractere(s)`;
        if (issue.origin === 'number') return `Deve ser menor ou igual a ${issue.maximum}`;
        if (issue.origin === 'array') return `Informe no máximo ${issue.maximum} item(ns)`;
        return undefined;
      case 'invalid_format':
        if (issue.format === 'email') return 'E-mail inválido';
        if (issue.format === 'url') return 'URL inválida';
        if (issue.format === 'uuid') return 'Identificador inválido';
        return undefined;
      case 'invalid_value':
        return `Valor inválido. Opções: ${issue.values.join(', ')}`;
      case 'unrecognized_keys':
        return `Campo(s) não permitido(s): ${issue.keys.join(', ')}`;
    }
    return undefined;
  },
});

export { z };
