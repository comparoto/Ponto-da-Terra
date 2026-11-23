import { api, aprovarCadastro, bearer, ciclo, compraPaga, login, novoComprador, pecaAtiva, prisma } from './helpers';

ciclo();

async function compraEntregue(tokenComprador: string, produtoId: string) {
  const { pedidoId } = await compraPaga(tokenComprador, produtoId);
  const artesao = (await login('artesao')).token;
  await api().patch(`/api/artesao/pedidos/${pedidoId}/status`).set(bearer(artesao)).send({ status: 'DESPACHADO', codigoRastreio: 'AA000000000BR' });
  await api().post(`/api/pedidos/${pedidoId}/confirmar-recebimento`).set(bearer(tokenComprador));
  return pedidoId;
}

/** HU17 — avaliações. */
describe('HU17 · Avaliar pedidos', () => {
  it('comprador com pedido ENTREGUE avalia; médias do produto e do artesão são recalculadas', async () => {
    const peca = await pecaAtiva(3, 70);
    const c1 = await novoComprador('Ana Souza');
    const c2 = await novoComprador('Bruno Lima');
    await compraEntregue(c1.token, peca.id);
    await compraEntregue(c2.token, peca.id);

    const r1 = await api().post('/api/avaliacoes').set(bearer(c1.token)).send({ produtoId: peca.id, nota: 5, comentario: 'Peça linda!' });
    expect(r1.status).toBe(201);
    const r2 = await api().post('/api/avaliacoes').set(bearer(c2.token)).send({ produtoId: peca.id, nota: 4 });
    expect(r2.body.data).toMatchObject({ mediaProduto: 4.5, totalAvaliacoes: 2 });

    expect((await prisma.produto.findUniqueOrThrow({ where: { id: peca.id } })).avaliacaoMedia).toBe(4.5);
    expect((await prisma.artesao.findUniqueOrThrow({ where: { id: peca.artesaoId } })).avaliacaoMedia).toBeGreaterThan(0);

    const publico = await api().get(`/api/produtos/${peca.id}/avaliacoes`);
    expect(publico.body.data).toMatchObject({ media: 4.5, total: 2 });
    expect(publico.body.data.avaliacoes.map((a: { autor: string }) => a.autor).sort()).toEqual(['Ana', 'Bruno']); // só o primeiro nome

    // O item aparece como avaliado em "Meus pedidos"
    const pedidos = await api().get('/api/comprador/pedidos').set(bearer(c1.token));
    expect(pedidos.body.data[0].itens[0].avaliado).toBe(true);
  });

  it('sem compra entregue → 403 "Apenas compradores verificados podem avaliar este item"', async () => {
    const peca = await pecaAtiva(3, 70);
    const c = await novoComprador();
    const semCompra = await api().post('/api/avaliacoes').set(bearer(c.token)).send({ produtoId: peca.id, nota: 5 });
    expect(semCompra.status).toBe(403);
    expect(semCompra.body.error).toBe('Apenas compradores verificados podem avaliar este item');

    await compraPaga(c.token, peca.id); // pago, mas ainda não entregue
    expect((await api().post('/api/avaliacoes').set(bearer(c.token)).send({ produtoId: peca.id, nota: 5 })).status).toBe(403);
  });

  it('nota fora de 1..5 → 400; segunda avaliação da mesma peça → 409', async () => {
    const peca = await pecaAtiva(2, 70);
    const c = await novoComprador();
    await compraEntregue(c.token, peca.id);
    expect((await api().post('/api/avaliacoes').set(bearer(c.token)).send({ produtoId: peca.id, nota: 6 })).status).toBe(400);
    await api().post('/api/avaliacoes').set(bearer(c.token)).send({ produtoId: peca.id, nota: 3 });
    expect((await api().post('/api/avaliacoes').set(bearer(c.token)).send({ produtoId: peca.id, nota: 4 })).status).toBe(409);
  });
});

/** HU14 — contatar produtor. */
describe('HU14 · Contatar produtor', () => {
  it('mensagem gravada vinculada à peça e notificação no painel do artesão', async () => {
    const peca = await pecaAtiva(1, 70);
    const c = await novoComprador('Carla Dias');
    const res = await api().post(`/api/produtos/${peca.id}/mensagens`).set(bearer(c.token)).send({ mensagem: 'Vocês fazem essa peça em tamanho maior?' });
    expect(res.status).toBe(201);

    const artesao = (await login('artesao')).token;
    const caixa = await api().get('/api/artesao/mensagens').set(bearer(artesao));
    expect(caixa.body.data[0]).toMatchObject({ mensagem: 'Vocês fazem essa peça em tamanho maior?', produto: { id: peca.id }, comprador: { nome: 'Carla Dias' } });

    const notificacoes = await api().get('/api/notificacoes?limit=50').set(bearer(artesao));
    expect(notificacoes.body.data.some((n: { tipoEvento: string; payload: { produtoId: string } }) => n.tipoEvento === 'NOVA_MENSAGEM' && n.payload.produtoId === peca.id)).toBe(true);
  });

  it('campo vazio → 400 "O campo de mensagem não pode ficar vazio"; visitante → 401', async () => {
    const peca = await pecaAtiva(1, 70);
    const c = await novoComprador();
    const vazio = await api().post(`/api/produtos/${peca.id}/mensagens`).set(bearer(c.token)).send({ mensagem: '   ' });
    expect(vazio.status).toBe(400);
    expect(vazio.body.errors[0].mensagem).toBe('O campo de mensagem não pode ficar vazio');
    expect((await api().post(`/api/produtos/${peca.id}/mensagens`).send({ mensagem: 'oi' })).status).toBe(401);
  });
});

/** HU16 — moderação de usuários. */
describe('HU16 · Suspender e reativar contas', () => {
  it('suspensão invalida a sessão, bloqueia o login e oculta as peças do artesão; reativação restabelece', async () => {
    const admin = (await login('admin')).token;
    const cadastro = await api()
      .post('/api/auth/cadastro')
      .send({ nome: 'Artesão Suspenso', email: 'suspenso@teste.com', senha: 'segredo1', tipo: 'ARTESAO', cidade: 'Olinda', estado: 'PE', especialidade: 'Barro' });
    const { token, usuario } = cadastro.body.data;
    await aprovarCadastro(usuario.artesaoId);
    const peca = await prisma.produto.create({
      data: { titulo: 'Peça de artesão suspenso', tecnica: 'Barro', poloOrigem: 'Olinda', preco: 10, status: 'ATIVO', artesaoId: usuario.artesaoId, imagensUrls: ['https://x/a.jpg'], estoque: { create: { quantidadeDisponivel: 1 } } },
    });
    expect((await api().get(`/api/produtos/${peca.id}`)).status).toBe(200);

    const semMotivo = await api().post(`/api/admin/usuarios/${usuario.id}/suspender`).set(bearer(admin)).send({});
    expect(semMotivo.status).toBe(400);

    const suspenso = await api().post(`/api/admin/usuarios/${usuario.id}/suspender`).set(bearer(admin)).send({ motivo: 'Venda de peças industrializadas como artesanais' });
    expect(suspenso.body.data).toMatchObject({ status: 'SUSPENSO', motivoSuspensao: 'Venda de peças industrializadas como artesanais' });

    expect((await api().get('/api/me').set(bearer(token))).status).toBe(401); // sessão invalidada
    expect((await api().post('/api/auth/login').send({ email: 'suspenso@teste.com', senha: 'segredo1' })).status).toBe(403);
    expect((await api().get(`/api/produtos/${peca.id}`)).status).toBe(404); // oculta da vitrine

    const reativado = await api().post(`/api/admin/usuarios/${usuario.id}/reativar`).set(bearer(admin));
    expect(reativado.body.data.status).toBe('ATIVO');
    expect((await api().post('/api/auth/login').send({ email: 'suspenso@teste.com', senha: 'segredo1' })).status).toBe(200);
    expect((await api().get(`/api/produtos/${peca.id}`)).status).toBe(200);
  });

  it('lista com filtros; admin não pode ser suspenso; comprador não acessa → 403', async () => {
    const admin = await login('admin');
    const lista = await api().get('/api/admin/usuarios?tipo=ARTESAO&limit=50').set(bearer(admin.token));
    expect(lista.body.data.every((u: { tipo: string }) => u.tipo === 'ARTESAO')).toBe(true);
    expect((await api().post(`/api/admin/usuarios/${admin.usuario.id}/suspender`).set(bearer(admin.token)).send({ motivo: 'teste de suspensão de admin' })).status).toBe(403);
    const comprador = (await login('comprador')).token;
    expect((await api().get('/api/admin/usuarios').set(bearer(comprador))).status).toBe(403);
  });
});

/** HU9 — dashboard do admin; HU18 — indicadores do artesão. */
describe('HU9 / HU18 · Indicadores', () => {
  it('admin: receita, pedidos, mais vendidas e termos mais buscados no período', async () => {
    const peca = await pecaAtiva(5, 100);
    const c = await novoComprador();
    await compraPaga(c.token, peca.id, 2);
    await api().get('/api/produtos?busca=carranca');
    await api().get('/api/produtos?busca=Carranca');

    const admin = (await login('admin')).token;
    const res = await api().get('/api/admin/dashboard/metricas').set(bearer(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.receitaBruta).toBeGreaterThanOrEqual(200);
    expect(res.body.data.pecasMaisVendidas.some((p: { produtoId: string; quantidade: number }) => p.produtoId === peca.id && p.quantidade === 2)).toBe(true);
    expect(res.body.data.termosMaisBuscados[0]).toEqual({ termo: 'carranca', buscas: 2 });
    expect(res.body.data).toHaveProperty('artesaosMaisAtivos');
    expect(res.body.data).toHaveProperty('receitaPorDia');

    // Período sem dados → zeros
    const vazio = await api().get('/api/admin/dashboard/metricas?de=2020-01-01&ate=2020-01-31').set(bearer(admin));
    expect(vazio.body.data).toMatchObject({ receitaBruta: 0, pedidosPagos: 0, pedidosConcluidos: 0 });

    const invalido = await api().get('/api/admin/dashboard/metricas?de=2026-12-01&ate=2026-01-01').set(bearer(admin));
    expect(invalido.status).toBe(400);
  });

  it('artesão: faturamento mensal (6 meses, com zeros), taxa de conclusão e pedidos por polo', async () => {
    const peca = await pecaAtiva(2, 90);
    const c = await novoComprador();
    await compraEntregue(c.token, peca.id);
    const artesao = (await login('artesao')).token;
    const res = await api().get('/api/artesao/indicadores').set(bearer(artesao));
    expect(res.status).toBe(200);
    expect(res.body.data.faturamentoPorMes).toHaveLength(6);
    expect(res.body.data.faturamentoTotal).toBeGreaterThan(0);
    expect(res.body.data.pedidosConcluidos).toBeGreaterThanOrEqual(1);
    expect(res.body.data.taxaConclusao).toBeGreaterThan(0);
    expect(res.body.data.pedidosPorPolo.some((p: { polo: string }) => p.polo === 'Caruaru')).toBe(true);

    const vazio = await api().get('/api/artesao/indicadores?de=2020-01-01&ate=2020-03-31').set(bearer(artesao));
    expect(vazio.body.data.faturamentoPorMes).toEqual([
      { mes: '2020-01', receita: 0, pedidos: 0 },
      { mes: '2020-02', receita: 0, pedidos: 0 },
      { mes: '2020-03', receita: 0, pedidos: 0 },
    ]);
    expect(vazio.body.data.mensagem).toMatch(/Divulgue suas peças/);
  });
});

/** HU15 — checklist de formalização. */
describe('HU15 · Checklist de formalização', () => {
  it('salva o progresso no perfil e calcula o percentual de prontidão', async () => {
    const artesao = (await login('artesao2')).token;
    const inicial = await api().get('/api/artesao/checklist').set(bearer(artesao));
    expect(inicial.body.data).toMatchObject({ percentualConclusao: 0, itensConcluidos: [] });

    const salvo = await api().put('/api/artesao/checklist').set(bearer(artesao)).send({ itensConcluidos: ['rg', 'cpf', 'comprovante-residencia'] });
    expect(salvo.body.data.percentualConclusao).toBe(50);
    expect((await api().get('/api/artesao/checklist').set(bearer(artesao))).body.data.itensConcluidos).toEqual(['rg', 'cpf', 'comprovante-residencia']);

    expect((await api().put('/api/artesao/checklist').set(bearer(artesao)).send({ itensConcluidos: ['passaporte'] })).status).toBe(400);
  });
});
