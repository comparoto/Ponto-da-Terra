/**
 * Contrato de resposta da API — o mesmo ApiResult<T> usado pela Fake API do frontend
 * (src/services/api.ts), estendido com `meta` (paginação, TC06) e `errors` (validação, TC05).
 */
export type PaginacaoMeta = { page: number; limit: number; totalItems: number; totalPages: number };
export type ErroCampo = { campo: string; mensagem: string };

export type ApiResult<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: PaginacaoMeta;
  errors?: ErroCampo[];
};

export const ok = <T>(data: T, meta?: PaginacaoMeta): ApiResult<T> =>
  meta ? { success: true, data, error: null, meta } : { success: true, data, error: null };

export const fail = (error: string, errors?: ErroCampo[]): ApiResult<null> =>
  errors?.length ? { success: false, data: null, error, errors } : { success: false, data: null, error };
