/**
 * Seed do banco: substitui os dados da antiga Fake API do frontend.
 * Os dados vêm de prisma/seed-data.json (exportado uma única vez do antigo src/data/mockData.ts).
 *
 * Contas de demonstração (as mesmas do antigo demoAuth.ts):
 *   admin@pontodaterra.com     / admin123
 *   comprador@pontodaterra.com / comprador123
 *   artesao@pontodaterra.com   / artesao123   (Mestre Severino Ramos)
 *   artesao2..6@pontodaterra.com / artesao123 (demais artesãos)
 */
import { PrismaClient, StatusProduto, TipoUsuario } from '@prisma/client';
import bcrypt from 'bcryptjs';
import seedData from './seed-data.json';

const prisma = new PrismaClient();

type ArtesaoMock = (typeof seedData.artesaos)[number];
type ProdutoMock = (typeof seedData.produtos)[number];

const CATEGORIAS = ['Cerâmica & Barro', 'Escultura & Madeira', 'Renda & Têxtil', 'Cestaria & Palha', 'Xilogravura'];

/** Técnica artesanal derivada da categoria do mock (HU1/HU2 exigem técnica). */
const TECNICA_POR_CATEGORIA: Record<string, string> = {
  'Cerâmica & Barro': 'Barro',
  'Escultura & Madeira': 'Madeira entalhada',
  'Renda & Têxtil': 'Renda Renascença',
  'Cestaria & Palha': 'Cestaria',
  Xilogravura: 'Xilogravura',
};

const POLO_REGIONAL_POR_CIDADE: Record<string, string> = {
  Caruaru: 'Alto do Moura',
  Petrolina: 'Sertão do São Francisco',
  Tracunhaém: 'Zona da Mata Norte',
  Goiana: 'Zona da Mata Norte',
  Pesqueira: 'Agreste',
  Bezerros: 'Agreste',
};

/** Estoque determinístico; o produto "1" é peça única (útil para demonstrar o checkout concorrente). */
const estoqueInicial = (mockId: string, indice: number): number => (mockId === '1' ? 1 : 3 + (indice % 8));

async function limparBanco() {
  const tabelas = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tabelas.length) {
    const lista = tabelas.map(t => `"public"."${t.tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);
  }
}

async function main() {
  // O seed APAGA todas as tabelas antes de popular: nunca deve rodar em produção.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed bloqueado: NODE_ENV=production. O seed limpa o banco e só deve ser usado em desenvolvimento/teste.');
  }
  await limparBanco();

  const [hashAdmin, hashComprador, hashArtesao] = await Promise.all([
    bcrypt.hash('admin123', 10),
    bcrypt.hash('comprador123', 10),
    bcrypt.hash('artesao123', 10),
  ]);

  const categorias = new Map<string, string>();
  for (const nome of CATEGORIAS) {
    const c = await prisma.categoriaProduto.create({ data: { nome } });
    categorias.set(nome, c.id);
  }

  await prisma.usuario.create({
    data: {
      nome: 'Administrador',
      email: 'admin@pontodaterra.com',
      senhaHash: hashAdmin,
      tipo: TipoUsuario.ADMIN,
      administrador: { create: { nivelAcesso: 'TOTAL' } },
    },
  });

  await prisma.usuario.create({
    data: {
      nome: 'Comprador Demonstração',
      email: 'comprador@pontodaterra.com',
      senhaHash: hashComprador,
      tipo: TipoUsuario.CONSUMIDOR,
      consumidor: { create: {} },
    },
  });

  const artesaoIdPorMock = new Map<string, { id: string; cidade: string }>();
  for (const a of seedData.artesaos as ArtesaoMock[]) {
    const email = a.id === '1' ? 'artesao@pontodaterra.com' : `artesao${a.id}@pontodaterra.com`;
    const usuario = await prisma.usuario.create({
      data: {
        nome: a.nome,
        email,
        senhaHash: hashArtesao,
        tipo: TipoUsuario.ARTESAO,
        artesao: {
          create: {
            nomeAtelie: `Ateliê ${a.nome}`,
            biografia: a.biografia,
            especialidade: a.especialidade,
            tecnicasPrincipais: a.especialidade ? [a.especialidade] : [],
            poloRegional: POLO_REGIONAL_POR_CIDADE[a.cidade] ?? null,
            cidade: a.cidade,
            estado: a.estado,
            fotoPerfilUrl: a.imagemUrl,
          },
        },
      },
      include: { artesao: true },
    });
    artesaoIdPorMock.set(a.id, { id: usuario.artesao!.id, cidade: a.cidade });
  }

  const produtos = seedData.produtos as ProdutoMock[];
  for (const [i, p] of produtos.entries()) {
    const artesao = artesaoIdPorMock.get(p.artesaoId);
    if (!artesao) throw new Error(`Artesão ${p.artesaoId} do produto ${p.id} não encontrado no mock`);
    await prisma.produto.create({
      data: {
        titulo: p.nome,
        descricao: p.descricao,
        tecnica: TECNICA_POR_CATEGORIA[p.categoria] ?? p.categoria,
        poloOrigem: artesao.cidade,
        preco: p.preco,
        materiaisUtilizados: p.material,
        dimensoes: p.dimensoes,
        imagensUrls: [p.imagemUrl],
        status: StatusProduto.ATIVO,
        artesaoId: artesao.id,
        categoriaId: categorias.get(p.categoria) ?? null,
        estoque: { create: { quantidadeDisponivel: estoqueInicial(p.id, i) } },
      },
    });
  }

  // Uma peça aguardando curadoria, para demonstrar a HU8/TC04
  const severino = artesaoIdPorMock.get('1')!;
  await prisma.produto.create({
    data: {
      titulo: 'Bumba Meu Boi em Barro Pintado',
      descricao: 'Peça figurativa do folguedo do Bumba Meu Boi, modelada e pintada à mão.',
      tecnica: 'Barro',
      poloOrigem: severino.cidade,
      preco: 150,
      materiaisUtilizados: 'Barro e pigmentos naturais',
      imagensUrls: [produtos[0].imagemUrl],
      status: StatusProduto.PENDENTE,
      artesaoId: severino.id,
      categoriaId: categorias.get('Cerâmica & Barro') ?? null,
      estoque: { create: { quantidadeDisponivel: 2 } },
    },
  });

  const [usuarios, totalProdutos] = await Promise.all([prisma.usuario.count(), prisma.produto.count()]);
  console.log(`Seed concluído: ${usuarios} usuários, ${totalProdutos} produtos, ${CATEGORIAS.length} categorias.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
