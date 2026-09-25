import { Artesao } from '@/types';
import { ARTESAOS_MOCK } from '@/data';

export const ARTESAOS_DATA = ARTESAOS_MOCK;

export const artesaoService = {
  listarArtesaos: (): Artesao[] => {
    if (typeof window !== 'undefined') { try { const saved=localStorage.getItem('ponto_da_terra_artesans_v1'); if(saved) return JSON.parse(saved) as Artesao[]; } catch { /* usa catálogo inicial */ } }
    return [...ARTESAOS_DATA];
  },
  salvarArtesao: (artesao: Artesao): void => {
    if (typeof window === 'undefined') return;
    const atual=artesaoService.listarArtesaos();
    localStorage.setItem('ponto_da_terra_artesans_v1',JSON.stringify([...atual.filter(a=>a.id!==artesao.id),artesao]));
  },
  excluirArtesao: (id: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ponto_da_terra_artesans_v1',JSON.stringify(artesaoService.listarArtesaos().filter(a=>a.id!==id)));
  },
  getArtesaos: async (): Promise<Artesao[]> => {
    return new Promise(resolve => setTimeout(() => resolve(artesaoService.listarArtesaos()), 200));
  },
  getArtesaoById: async (id: string): Promise<Artesao | undefined> => {
    return new Promise(resolve => setTimeout(() => resolve(artesaoService.listarArtesaos().find(a => a.id === id)), 150));
  },
};

