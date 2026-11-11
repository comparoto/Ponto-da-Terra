import { StatusProduto } from '@prisma/client';
import { api, bearer, ciclo, login, prisma, produtoValido } from './helpers';

ciclo();

describe('TC05 · Validação de payload na criação de produto', () => {
  it('sem título e com preço negativo → 400 listando exatamente os campos', async () => {
    const { token } = await login('artesao');
    const { titulo, ...semTitulo } = produtoValido({ preco: -10 });
    const antes = await prisma.produto.count();

    const res = await api().post('/api/produtos').set(bearer(token)).send(semTitulo);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        { campo: 'titulo', mensagem: 'Informe o título da peça' },
        { campo: 'preco', mensagem: 'O preço deve ser maior que zero' },
      ]),
    );
    expect(await prisma.produto.count()).toBe(antes); // nada gravado
  });

  it('estoque negativo e preço com 3 casas → 400', async () => {
    const { token } = await login('artesao');
    const res = await api().post('/api/produtos').set(bearer(token)).send(produtoValido({ estoque: -1, preco: 10.555 }));
    expect(res.status).toBe(400);
    const campos = res.body.errors.map((e: { campo: string }) => e.campo);
    expect(campos).toEqual(expect.arrayContaining(['estoque', 'preco']));
  });
});

describe('TC09 · Cadastro de peça', () => {
  it('sem polo de origem e técnica → 400 destacando os dois campos', async () => {
    const { token } = await login('artesao');
    const res = await api().post('/api/produtos').set(bearer(token)).send(produtoValido({ tecnica: undefined, poloOrigem: '  ' }));

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        { campo: 'tecnica', mensagem: 'Informe a técnica artesanal' },
        { campo: 'poloOrigem', mensagem: 'Informe o polo de origem' },
      ]),
    );
  });

  it('com polo e técnica → 201, persistido e listado no painel como PENDENTE (aguardando curadoria)', async () => {
    const { token } = await login('artesao');
    const res = await api().post('/api/produtos').set(bearer(token)).send(produtoValido({ poloOrigem: 'Caruaru', tecnica: 'barro' }));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'PENDENTE', tecnica: 'barro', poloOrigem: 'Caruaru', estoque: 3 });
    expect(await prisma.produto.findUnique({ where: { id: res.body.data.id } })).not.toBeNull();

    const painel = await api().get('/api/artesao/produtos?status=PENDENTE&limit=50').set(bearer(token));
    expect(painel.body.data.map((p: { id: string }) => p.id)).toContain(res.body.data.id);
  });

  it('peça PENDENTE não aparece na vitrine nem no detalhe público', async () => {
    const { token } = await login('artesao');
    const criado = await api().post('/api/produtos').set(bearer(token)).send(produtoValido());
    const id = criado.body.data.id;

    expect((await api().get(`/api/produtos/${id}`)).status).toBe(404);
    const vitrine = await api().get(`/api/produtos?busca=${encodeURIComponent(criado.body.data.titulo)}`);
    expect(vitrine.body.data).toEqual([]);
  });
});

describe('Vitrine (HU2 / TC03 / TC06)', () => {
  it('HU2: filtra por técnica + polo ao mesmo tempo (case-insensitive)', async () => {
    const res = await api().get('/api/produtos?tecnica=renda%20renascen%C3%A7a&polo=PESQUEIRA');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) {
      expect(p.tecnica).toBe('Renda Renascença');
      expect(p.poloOrigem).toBe('Pesqueira');
    }
  });

  it('TC03: filtro sem correspondência → 200 com lista vazia e totalItems 0', async () => {
    const res = await api().get('/api/produtos?tecnica=Inexistente&polo=Lugar%20Nenhum');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toMatchObject({ totalItems: 0, page: 1 });
  });

  it('TC06: page=2&limit=10 com 25 produtos → itens 11 a 20 e metadados corretos', async () => {
    const artesao = await prisma.artesao.findFirstOrThrow();
    const tecnica = `Técnica TC06 ${Date.now()}`;
    for (let i = 1; i <= 25; i++) {
      await prisma.produto.create({
        data: {
          titulo: `TC06 Peça ${String(i).padStart(2, '0')}`,
          tecnica,
          poloOrigem: 'Caruaru',
          preco: 10 + i,
          status: StatusProduto.ATIVO,
          imagensUrls: ['https://exemplo.com/a.jpg'],
          artesaoId: artesao.id,
          estoque: { create: { quantidadeDisponivel: 1 } },
        },
      });
    }

    const res = await api().get(`/api/produtos?tecnica=${encodeURIComponent(tecnica)}&page=2&limit=10&ordenacao=nome`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(10);
    expect(res.body.data.map((p: { titulo: string }) => p.titulo)).toEqual(
      Array.from({ length: 10 }, (_, i) => `TC06 Peça ${String(i + 11).padStart(2, '0')}`),
    );
    expect(res.body.meta).toEqual({ page: 2, limit: 10, totalItems: 25, totalPages: 3 });
  });

  it('parâmetros de paginação inválidos → 400', async () => {
    const res = await api().get('/api/produtos?page=0&limit=500');
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e: { campo: string }) => e.campo).sort()).toEqual(['limit', 'page']);
  });

  it('cache: segunda consulta idêntica é HIT; alteração no catálogo invalida', async () => {
    const url = '/api/produtos?ordenacao=preco-desc&limit=3';
    await api().get(url);
    const segunda = await api().get(url);
    expect(segunda.headers['x-cache']).toBe('HIT');

    // Ajuste de estoque de uma peça ativa invalida o catálogo
    const { token } = await login('artesao');
    const minhas = await api().get('/api/artesao/produtos?status=ATIVO').set(bearer(token));
    await api().patch(`/api/produtos/${minhas.body.data[0].id}/estoque`).set(bearer(token)).send({ quantidade: 7 });

    const depois = await api().get(url);
    expect(depois.headers['x-cache']).toBe('MISS');
  });

  it('editar uma peça ATIVA a devolve para a curadoria e a tira da vitrine', async () => {
    const { token } = await login('artesao');
    const ativas = await api().get('/api/artesao/produtos?status=ATIVO').set(bearer(token));
    const peca = ativas.body.data[0];

    const res = await api().put(`/api/produtos/${peca.id}`).set(bearer(token)).send({ descricao: 'Nova descrição' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PENDENTE');
    expect((await api().get(`/api/produtos/${peca.id}`)).status).toBe(404);
  });

  it('categorias retornam as 5 do catálogo', async () => {
    const res = await api().get('/api/categorias');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
  });
});
