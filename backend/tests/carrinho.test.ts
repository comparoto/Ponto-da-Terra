import { StatusProduto } from '@prisma/client';
import { api, ciclo, prisma } from './helpers';

ciclo();

async function criarAtivo(titulo: string, preco: number, estoque: number) {
  const artesao = await prisma.artesao.findFirstOrThrow();
  return prisma.produto.create({
    data: {
      titulo,
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

/** TC08 — relatório de 09/11/2026: REPROVADO (subtotal era calculado no navegador). */
describe('TC08 · Subtotal calculado pelo backend', () => {
  it('2 × A (R$ 50) + 1 × B (R$ 30) = R$ 130, ignorando preços enviados pelo frontend', async () => {
    const a = await criarAtivo('Produto A TC08', 50, 10);
    const b = await criarAtivo('Produto B TC08', 30, 10);

    const res = await api()
      .post('/api/carrinho/calcular')
      .send({
        itens: [
          { produtoId: a.id, quantidade: 2, preco: 0.01, subtotal: 0.02 }, // valores adulterados
          { produtoId: b.id, quantidade: 1, preco: 0.01 },
        ],
        totalLiquido: 0.03,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.totalLiquido).toBe(130);
    expect(res.body.data.itens).toEqual([
      expect.objectContaining({ produtoId: a.id, precoUnitario: 50, quantidade: 2, subtotal: 100 }),
      expect.objectContaining({ produtoId: b.id, precoUnitario: 30, quantidade: 1, subtotal: 30 }),
    ]);
  });

  it('agrupa itens repetidos do mesmo produto', async () => {
    const a = await criarAtivo('Produto repetido TC08', 19.9, 10);
    const res = await api().post('/api/carrinho/calcular').send({ itens: [{ produtoId: a.id, quantidade: 1 }, { produtoId: a.id, quantidade: 2 }] });
    expect(res.body.data).toMatchObject({ quantidadeItens: 3, totalLiquido: 59.7 });
  });

  it('peça que não está ATIVA → 400', async () => {
    const pendente = await prisma.produto.findFirstOrThrow({ where: { status: StatusProduto.PENDENTE } });
    const res = await api().post('/api/carrinho/calcular').send({ itens: [{ produtoId: pendente.id, quantidade: 1 }] });
    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toEqual({ campo: 'itens.0.produtoId', mensagem: 'Peça indisponível ou inexistente' });
  });

  it('carrinho vazio → 400', async () => {
    const res = await api().post('/api/carrinho/calcular').send({ itens: [] });
    expect(res.status).toBe(400);
    expect(res.body.errors).toContainEqual({ campo: 'itens', mensagem: 'O carrinho está vazio' });
  });
});

/** TC14 — relatório de 09/11/2026: REPROVADO (sem controle de quantidade; frete fixo de R$ 15 sem validar CEP). */
describe('TC14 · Limite de estoque e frete por CEP', () => {
  it('peça com 2 unidades: 2 é aceito, 3 → 400 "Limite de estoque atingido para esta peça"', async () => {
    const p = await criarAtivo('Peça com 2 unidades TC14', 40, 2);

    const dois = await api().post('/api/carrinho/calcular').send({ itens: [{ produtoId: p.id, quantidade: 2 }] });
    expect(dois.status).toBe(200);
    expect(dois.body.data.itens[0].estoqueDisponivel).toBe(2);

    const tres = await api().post('/api/carrinho/calcular').send({ itens: [{ produtoId: p.id, quantidade: 3 }] });
    expect(tres.status).toBe(400);
    expect(tres.body.error).toBe('Limite de estoque atingido para esta peça');
    expect(tres.body.errors[0].campo).toBe('itens.0.quantidade');
  });

  it('CEP válido retorna valor e prazo em menos de 300 ms', async () => {
    const inicio = performance.now();
    const res = await api().get('/api/frete?cep=01310-100');
    const duracao = performance.now() - inicio;

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ cep: '01310-100', valor: expect.any(Number), prazoDias: expect.any(Number), simulado: true });
    expect(res.body.data.valor).toBeGreaterThan(0);
    expect(duracao).toBeLessThan(300);
  });

  it('frete varia por região (não é mais um valor fixo)', async () => {
    const recife = await api().get('/api/frete?cep=50030230');
    const portoAlegre = await api().get('/api/frete?cep=90010-000');
    expect(recife.body.data.valor).toBeLessThan(portoAlegre.body.data.valor);
    expect(recife.body.data.prazoDias).toBeLessThan(portoAlegre.body.data.prazoDias);
  });

  it.each(['00000-000', '1234', 'abcde-fgh', '11111111'])('CEP inválido %s → 400 sem calcular', async cep => {
    const res = await api().get(`/api/frete?cep=${cep}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('CEP inválido');
  });

  it('calcular com CEP soma o frete ao total geral', async () => {
    const p = await criarAtivo('Peça com frete TC14', 100, 5);
    const res = await api().post('/api/carrinho/calcular').send({ itens: [{ produtoId: p.id, quantidade: 1 }], cep: '01310-100' });
    expect(res.body.data.totalGeral).toBeCloseTo(100 + res.body.data.frete.valor, 2);
  });
});
