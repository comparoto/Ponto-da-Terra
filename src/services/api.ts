/**
 * Fachada (Facade) consumida pelas páginas — antes `fakeApi`, agora sobre a API real.
 * O contrato ApiResult<T> = { success, data, error } foi preservado.
 */
import type { Artesao, Peca } from '../types';
import { artesaoService } from './artesaoService';
import { produtoService } from './produtoService';

export type { ApiResult } from './http';

export const api = {
  getArtesaos: (): Promise<import('./http').ApiResult<Artesao[]>> => artesaoService.getArtesaos(),
  getPecas: (): Promise<import('./http').ApiResult<Peca[]>> => produtoService.getProdutos(),
};

export { artesaoService, produtoService };
