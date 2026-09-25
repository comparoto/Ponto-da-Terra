import { Artesao, Peca } from '../types';
import { artesaoService } from './artesaoService';
import { produtoService } from './produtoService';

export type ApiResult<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

const normalizeApiResult = <T>(data: T, error?: unknown): ApiResult<T> => {
  if (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Erro ao carregar os dados.',
    };
  }

  return {
    success: true,
    data,
    error: null,
  };
};

export const fakeApi = {
  getArtesaos: async (): Promise<ApiResult<Artesao[]>> => {
    try {
      return normalizeApiResult(await artesaoService.getArtesaos());
    } catch (error) {
      return normalizeApiResult([], error);
    }
  },

  getPecas: async (): Promise<ApiResult<Peca[]>> => {
    try {
      return normalizeApiResult(await produtoService.getProdutos());
    } catch (error) {
      return normalizeApiResult([], error);
    }
  },
};

export { artesaoService, produtoService };