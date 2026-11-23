import type { ErroCampo } from './api-result';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: ErroCampo[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (msg: string, errors?: ErroCampo[]) => new AppError(400, msg, errors);
export const unauthorized = (msg = 'Autenticação necessária') => new AppError(401, msg);
export const forbidden = (msg = 'Acesso negado') => new AppError(403, msg);
export const notFound = (msg = 'Recurso não encontrado') => new AppError(404, msg);
export const conflict = (msg: string) => new AppError(409, msg);
