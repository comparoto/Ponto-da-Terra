import request from 'supertest';
import { criarApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { closeRedis, waitRedisReady } from '../src/config/redis';

export const app = criarApp();
export const api = () => request(app);
export { prisma };

export const CONTAS = {
  admin: { email: 'admin@pontodaterra.com', senha: 'admin123' },
  comprador: { email: 'comprador@pontodaterra.com', senha: 'comprador123' },
  artesao: { email: 'artesao@pontodaterra.com', senha: 'artesao123' }, // Mestre Severino Ramos
  artesao2: { email: 'artesao2@pontodaterra.com', senha: 'artesao123' }, // Dona Ana Lúcia
} as const;

export async function login(conta: keyof typeof CONTAS) {
  const res = await api().post('/api/auth/login').send(CONTAS[conta]);
  if (res.status !== 200) throw new Error(`Login de ${conta} falhou: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.data.token as string, usuario: res.body.data.usuario };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

let seq = 0;
export const unico = (prefixo: string) => `${prefixo} ${Date.now()}-${++seq}`;

/** Corpo válido de criação de produto (HU1). */
export const produtoValido = (extra: Record<string, unknown> = {}) => ({
  titulo: unico('Peça de teste'),
  descricao: 'Peça criada pelos testes automatizados',
  tecnica: 'Barro',
  poloOrigem: 'Caruaru',
  preco: 99.9,
  estoque: 3,
  imagensUrls: ['https://exemplo.com/foto.jpg'],
  ...extra,
});

/** Usa em cada arquivo de teste: conecta o Redis antes e fecha as conexões no fim. */
export function ciclo() {
  beforeAll(() => waitRedisReady());
  afterAll(async () => {
    await prisma.$disconnect();
    await closeRedis();
  });
}

// ───────────── Fase 2: compradores, peças e compras de teste ─────────────
import { StatusProduto, TipoUsuario } from '@prisma/client';
import { assinarToken } from '../src/shared/auth';

/** Cria um comprador direto no banco e devolve um token válido (rápido, sem bcrypt/login). */
export async function novoComprador(nome = 'Comprador Teste') {
  const usuario = await prisma.usuario.create({
    data: { nome, email: `${unico('c').replace(/\W/g, '')}@teste.com`, senhaHash: 'x', tipo: TipoUsuario.CONSUMIDOR, consumidor: { create: {} } },
    include: { consumidor: true },
  });
  return { usuario, consumidorId: usuario.consumidor!.id, token: assinarToken(usuario) };
}

/** Peça ATIVA com estoque definido, do artesão informado (padrão: Mestre Severino). */
export async function pecaAtiva(estoque: number, preco = 50, emailArtesao = 'artesao@pontodaterra.com') {
  const artesao = await prisma.artesao.findFirstOrThrow({ where: { usuario: { email: emailArtesao } } });
  return prisma.produto.create({
    data: {
      titulo: unico('Peça fase 2'),
      tecnica: 'Barro',
      poloOrigem: 'Caruaru',
      preco,
      status: StatusProduto.ATIVO,
      imagensUrls: ['https://exemplo.com/a.jpg'],
      artesaoId: artesao.id,
      estoque: { create: { quantidadeDisponivel: estoque } },
    },
  });
}

export const ENDERECO = { cep: '01310-100', rua: 'Av. Paulista', numero: '1000', cidade: 'São Paulo', estado: 'SP' };

export const checkout = (token: string, itens: { produtoId: string; quantidade: number }[]) =>
  api().post('/api/checkout').set(bearer(token)).send({ itens, endereco: ENDERECO });

export const pagar = (token: string, codigo: string, corpo: Record<string, unknown>) =>
  api().post(`/api/compras/${codigo}/pagamento`).set(bearer(token)).send(corpo);

export const CARTAO_OK = { numero: '4111 1111 1111 1111', validade: '12/30', cvv: '123', titular: 'Maria Teste' };
export const CARTAO_RECUSADO = { numero: '4000 0000 0000 0002', validade: '12/30', cvv: '123', titular: 'Maria Teste' };

export const estoqueDe = async (produtoId: string) =>
  (await prisma.estoque.findUniqueOrThrow({ where: { produtoId } })).quantidadeDisponivel;

/** Compra paga no cartão; devolve o código da compra e o id do pedido. */
export async function compraPaga(token: string, produtoId: string, quantidade = 1) {
  const c = await checkout(token, [{ produtoId, quantidade }]);
  if (c.status !== 201) throw new Error(`checkout falhou: ${JSON.stringify(c.body)}`);
  const p = await pagar(token, c.body.data.codigo, { metodo: 'CARTAO', parcelas: 1, cartao: CARTAO_OK });
  if (p.status !== 201) throw new Error(`pagamento falhou: ${JSON.stringify(p.body)}`);
  return { codigo: c.body.data.codigo as string, pedidoId: c.body.data.pedidos[0].id as string };
}

/** HU8: novos artesãos nascem PENDENTES; nos testes que precisam do perfil público, aprova direto no banco. */
export const aprovarCadastro = (artesaoId: string) =>
  prisma.artesao.update({ where: { id: artesaoId }, data: { statusCadastro: 'APROVADO' } });
