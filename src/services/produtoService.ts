import { Peca, FiltrosProduto } from '@/types';
import { PRODUTOS_MOCK } from '@/data';

export const CATEGORIAS = [
  'Todas',
  'Cerâmica & Barro',
  'Escultura & Madeira',
  'Renda & Têxtil',
  'Cestaria & Palha',
  'Xilogravura',
];

export const PECAS_DATA: Peca[] = PRODUTOS_MOCK;

export const produtoService = {
  listarProdutosSincrono: (): Peca[] => {
    if (typeof window !== 'undefined') {
      try { const saved = localStorage.getItem('ponto_da_terra_products_v1'); if (saved) return JSON.parse(saved) as Peca[]; } catch { /* usa catálogo inicial */ }
    }
    return [...PECAS_DATA];
  },
  salvarProduto: (produto: Peca): void => {
    if (typeof window === 'undefined') return;
    const atual = produtoService.listarProdutosSincrono();
    localStorage.setItem('ponto_da_terra_products_v1', JSON.stringify([...atual.filter(p => p.id !== produto.id), produto]));
  },
  excluirProduto: (id: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ponto_da_terra_products_v1', JSON.stringify(produtoService.listarProdutosSincrono().filter(p => p.id !== id)));
  },
  getProdutos: async (filtros?: FiltrosProduto): Promise<Peca[]> => {
    return new Promise(resolve => {
      setTimeout(() => {
        let resultado = produtoService.listarProdutosSincrono();

        if (filtros?.termoBusca) {
          const termo = filtros.termoBusca.toLowerCase().trim();
          resultado = resultado.filter(
            p =>
              p.nome.toLowerCase().includes(termo) ||
              p.artesaoNome?.toLowerCase().includes(termo) ||
              p.categoria?.toLowerCase().includes(termo) ||
              p.artesaoCidade?.toLowerCase().includes(termo)
          );
        }

        if (filtros?.categoria && filtros.categoria !== 'Todas') {
          resultado = resultado.filter(p => p.categoria === filtros.categoria);
        }

        if (filtros?.artesaoId) {
          resultado = resultado.filter(p => p.artesaoId === filtros.artesaoId);
        }

        if (filtros?.precoMin !== undefined) {
          resultado = resultado.filter(p => p.preco >= filtros.precoMin!);
        }

        if (filtros?.precoMax !== undefined) {
          resultado = resultado.filter(p => p.preco <= filtros.precoMax!);
        }

        if (filtros?.ordenacao) {
          switch (filtros.ordenacao) {
            case 'preco-asc':
              resultado.sort((a, b) => a.preco - b.preco);
              break;
            case 'preco-desc':
              resultado.sort((a, b) => b.preco - a.preco);
              break;
            case 'nome':
              resultado.sort((a, b) => a.nome.localeCompare(b.nome));
              break;
            case 'recentes':
            default:
              break;
          }
        }

        resolve(resultado);
      }, 250);
    });
  },

  getProdutoById: async (id: string): Promise<Peca | undefined> => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(produtoService.listarProdutosSincrono().find(p => p.id === id));
      }, 150);
    });
  },

  getCategorias: (): string[] => {
    return CATEGORIAS;
  },
};


