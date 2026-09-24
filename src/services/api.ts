import { Artesao, Peca } from '../types';

export const fakeApi = {
  getArtesaos: async (): Promise<Artesao[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: '1', nome: 'Fulano de tal', cidade: 'Cidade', estado: 'PE', imagemUrl: 'https://cdn-icons-png.flaticon.com/512/12225/12225881.png' },
          { id: '2', nome: 'Fulano de tal', cidade: 'Cidade', estado: 'PE', imagemUrl: 'https://cdn-icons-png.flaticon.com/512/12225/12225881.png' },
          { id: '3', nome: 'Fulano de tal', cidade: 'Cidade', estado: 'PE', imagemUrl: 'https://cdn-icons-png.flaticon.com/512/12225/12225881.png' },
          { id: '4', nome: 'Fulano de tal', cidade: 'Cidade', estado: 'PE', imagemUrl: 'https://cdn-icons-png.flaticon.com/512/12225/12225881.png' },
        ]);
      }, 500);
    });
  },

  getPecas: async (): Promise<Peca[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: '1', nome: 'Pote de barro', preco: 85.00, imagemUrl: 'https://static.vecteezy.com/system/resources/thumbnails/065/454/272/small/traditional-clay-pot-used-for-storage-in-rural-settings-during-the-day-png.png' },
          { id: '2', nome: 'Pote de barro', preco: 85.00, imagemUrl: 'https://static.vecteezy.com/system/resources/thumbnails/065/454/272/small/traditional-clay-pot-used-for-storage-in-rural-settings-during-the-day-png.png' },
          { id: '3', nome: 'Pote de barro', preco: 85.00, imagemUrl: 'https://static.vecteezy.com/system/resources/thumbnails/065/454/272/small/traditional-clay-pot-used-for-storage-in-rural-settings-during-the-day-png.png' },
          { id: '4', nome: 'Pote de barro', preco: 85.00, imagemUrl: 'https://static.vecteezy.com/system/resources/thumbnails/065/454/272/small/traditional-clay-pot-used-for-storage-in-rural-settings-during-the-day-png.png' },
        ]);
      }, 500);
    });
  }
};