import { Artesao } from '@/types';

export const ARTESAOS_DATA: Artesao[] = [
  {
    id: '1',
    nome: 'Mestre Severino Ramos',
    cidade: 'Caruaru',
    estado: 'PE',
    especialidade: 'Barro e Figuras Típicas',
    biografia: 'Mais de 40 anos dedicados à arte figurativa do Alto do Moura, mantendo viva a tradição da cerâmica popular pernambucana.',
    imagemUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: '2',
    nome: 'Dona Ana Lúcia',
    cidade: 'Petrolina',
    estado: 'PE',
    especialidade: 'Carrancas do São Francisco',
    biografia: 'Herdeira da tradição das famosas carrancas do Vale do São Francisco, esculpindo proteção e história em madeiras nobres.',
    imagemUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: '3',
    nome: 'Tiago de Tracunhaém',
    cidade: 'Tracunhaém',
    estado: 'PE',
    especialidade: 'Terracota e Painéis',
    biografia: 'Artesão e escultor da capital do artesanato em barro. Cria peças monumentais e utilitários com acabamento natural.',
    imagemUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: '4',
    nome: 'Maria do Carmo',
    cidade: 'Goiana',
    estado: 'PE',
    especialidade: 'Cestaria e Fibras',
    biografia: 'Trabalha trançando fibras de palha e cipó há três gerações na Zona da Mata Norte pernambucana.',
    imagemUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: '5',
    nome: 'Dona Zilda',
    cidade: 'Pesqueira',
    estado: 'PE',
    especialidade: 'Renda Renascença',
    biografia: 'Mestra rendeira no agreste pernambucano, transformando fios de algodão puro em verdadeiras joias têxteis.',
    imagemUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: '6',
    nome: 'Borges da Xilo',
    cidade: 'Bezerros',
    estado: 'PE',
    especialidade: 'Xilogravura e Cordel',
    biografia: 'Ilustrador e gravurista preservando as matrizes de madeira e a rica poesia popular de Bezerros.',
    imagemUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  },
];

export const artesaoService = {
  getArtesaos: async (): Promise<Artesao[]> => {
    return new Promise(resolve => setTimeout(() => resolve(ARTESAOS_DATA), 200));
  },
  getArtesaoById: async (id: string): Promise<Artesao | undefined> => {
    return new Promise(resolve =>
      setTimeout(() => resolve(ARTESAOS_DATA.find(a => a.id === id)), 150)
    );
  },
};
