import { Peca, FiltrosProduto } from '@/types';

export const CATEGORIAS = [
  'Todas',
  'Cerâmica & Barro',
  'Escultura & Madeira',
  'Renda & Têxtil',
  'Cestaria & Palha',
  'Xilogravura',
];

export const PECAS_DATA: Peca[] = [
  {
    id: '1',
    nome: 'Pote Tradicional de Barro com Tampa',
    preco: 85.0,
    categoria: 'Cerâmica & Barro',
    artesaoId: '1',
    artesaoNome: 'Mestre Severino Ramos',
    artesaoCidade: 'Caruaru - PE',
    imagemUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
    descricao: 'Pote modelado à mão em argila vermelha selecionada do Agreste. Queima em forno a lenha tradicional, garantindo cor e resistência únicas para armazenar água ou decorar.',
    dimensoes: '28cm x 20cm x 20cm',
    material: 'Argila natural e pigmento de barro',
    emEstoque: true,
  },
  {
    id: '2',
    nome: 'Carranca Guardiã do São Francisco',
    preco: 165.0,
    categoria: 'Escultura & Madeira',
    artesaoId: '2',
    artesaoNome: 'Dona Ana Lúcia',
    artesaoCidade: 'Petrolina - PE',
    imagemUrl: 'https://images.unsplash.com/photo-1582561424760-0321d75e81fa?auto=format&fit=crop&w=600&q=80',
    descricao: 'Figura mística entalhada em madeira nobre reaproveitada, inspirada nos barqueiros do Rio São Francisco que usavam carrancas para espantar maus espíritos e atrair fartura.',
    dimensoes: '35cm x 15cm x 12cm',
    material: 'Madeira maciça entalhada com acabamento em cera',
    emEstoque: true,
  },
  {
    id: '3',
    nome: 'Painel Decorativo Floral em Terracota',
    preco: 220.0,
    categoria: 'Cerâmica & Barro',
    artesaoId: '3',
    artesaoNome: 'Tiago de Tracunhaém',
    artesaoCidade: 'Tracunhaém - PE',
    imagemUrl: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=600&q=80',
    descricao: 'Painel de parede em alto relevo com motivos florais da flora nordestina. Peça premiada e símbolo do artesanato da Zona da Mata Norte.',
    dimensoes: '40cm x 40cm x 5cm',
    material: 'Argila queimada e esmalte fosco',
    emEstoque: true,
  },
  {
    id: '4',
    nome: 'Trio Nordestino em Barro Figurativo',
    preco: 120.0,
    categoria: 'Cerâmica & Barro',
    artesaoId: '1',
    artesaoNome: 'Mestre Severino Ramos',
    artesaoCidade: 'Caruaru - PE',
    imagemUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&q=80',
    descricao: 'Conjunto clássico de tocadores de forró pé-de-serra (sanfona, zabumba e triângulo). Representação viva do legado cultural do Alto do Moura.',
    dimensoes: '18cm x 22cm x 10cm',
    material: 'Barro policromado com tinta acrílica artesanal',
    emEstoque: true,
  },
  {
    id: '5',
    nome: 'Cesto Trançado de Palha de Carnaúba',
    preco: 65.0,
    categoria: 'Cestaria & Palha',
    artesaoId: '4',
    artesaoNome: 'Maria do Carmo',
    artesaoCidade: 'Goiana - PE',
    imagemUrl: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=600&q=80',
    descricao: 'Cesto multiuso confeccionado manualmente com fibras secas ao sol da palha de carnaúba. Acabamento primoroso e alta durabilidade.',
    dimensoes: '25cm x 30cm diâmetro',
    material: 'Palha de carnaúba natural tratada',
    emEstoque: true,
  },
  {
    id: '6',
    nome: 'Toalha de Mesa em Renda Renascença',
    preco: 280.0,
    categoria: 'Renda & Têxtil',
    artesaoId: '5',
    artesaoNome: 'Dona Zilda',
    artesaoCidade: 'Pesqueira - PE',
    imagemUrl: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=600&q=80',
    descricao: 'Trabalho minucioso de agulha e laçadas que dura semanas para ser concluído. Tradição secular de Pesqueira que encanta pelo requinte.',
    dimensoes: '80cm x 80cm',
    material: 'Linha 100% algodão egípcio',
    emEstoque: true,
  },
  {
    id: '7',
    nome: 'Xilogravura O Sertão e a Lua',
    preco: 75.0,
    categoria: 'Xilogravura',
    artesaoId: '6',
    artesaoNome: 'Borges da Xilo',
    artesaoCidade: 'Bezerros - PE',
    imagemUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
    descricao: 'Impressão manual sobre papel encorpado a partir de matriz original entalhada em umburana. Assinada e numerada à mão pelo artista.',
    dimensoes: '30cm x 42cm (A3)',
    material: 'Papel canson 220g e tinta gráfica preta',
    emEstoque: true,
  },
  {
    id: '8',
    nome: 'Moringa de Barro Polida',
    preco: 95.0,
    categoria: 'Cerâmica & Barro',
    artesaoId: '1',
    artesaoNome: 'Mestre Severino Ramos',
    artesaoCidade: 'Caruaru - PE',
    imagemUrl: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=600&q=80',
    descricao: 'Moringa que mantém a água naturalmente fresca pela porosidade equilibrada do barro artesanal. Acompanha pratinho coletor e tampa torneada.',
    dimensoes: '26cm x 16cm x 16cm',
    material: 'Argila vermelha sem verniz químico',
    emEstoque: true,
  },
  {
    id: '9',
    nome: 'Vaso Bojudo Terracota Esculpido',
    preco: 140.0,
    categoria: 'Cerâmica & Barro',
    artesaoId: '3',
    artesaoNome: 'Tiago de Tracunhaém',
    artesaoCidade: 'Tracunhaém - PE',
    imagemUrl: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=600&q=80',
    descricao: 'Vaso com relevos geométricos que homenageiam os grafismos indígenas da região. Ideal para arranjos secos ou destaque em ambientes rústicos.',
    dimensoes: '32cm x 22cm x 22cm',
    material: 'Terracota natural de queima lenta',
    emEstoque: true,
  },
  {
    id: '10',
    nome: 'Fruteira Centro de Mesa em Palha',
    preco: 80.0,
    categoria: 'Cestaria & Palha',
    artesaoId: '4',
    artesaoNome: 'Maria do Carmo',
    artesaoCidade: 'Goiana - PE',
    imagemUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
    descricao: 'Design circular contemporâneo entrelaçado com palha clara e tingimento natural de casca de angico.',
    dimensoes: '38cm diâmetro x 8cm altura',
    material: 'Fibras vegetais e corantes botânicos',
    emEstoque: true,
  },
  {
    id: '11',
    nome: 'Caminho de Mesa Renda Renascença',
    preco: 190.0,
    categoria: 'Renda & Têxtil',
    artesaoId: '5',
    artesaoNome: 'Dona Zilda',
    artesaoCidade: 'Pesqueira - PE',
    imagemUrl: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=600&q=80',
    descricao: 'Faixa decorativa para mesas de jantar e aparadores. Padronagem clássica em pontos que atravessam gerações de artesãs.',
    dimensoes: '120cm x 35cm',
    material: 'Linha de puro algodão alvejado',
    emEstoque: true,
  },
  {
    id: '12',
    nome: 'Xilogravura Asa Branca e o Voo',
    preco: 80.0,
    categoria: 'Xilogravura',
    artesaoId: '6',
    artesaoNome: 'Borges da Xilo',
    artesaoCidade: 'Bezerros - PE',
    imagemUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80',
    descricao: 'Tributo em arte visual à clássica canção de Luiz Gonzaga e Humberto Teixeira. Peça marcante e cheia de identidade nordestina.',
    dimensoes: '30cm x 42cm',
    material: 'Papel canson texturizado e óleo tipográfico',
    emEstoque: true,
  },
];

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


