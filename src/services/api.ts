import { Artesao, Peca } from '../types';
import { artesaoService } from './artesaoService';
import { produtoService } from './produtoService';

export const fakeApi = {
  getArtesaos: async (): Promise<Artesao[]> => {
    return artesaoService.getArtesaos();
  },

  getPecas: async (): Promise<Peca[]> => {
    return produtoService.getProdutos();
  },
};

export { artesaoService, produtoService };