import { TipoEvento } from '@prisma/client';
import { publicarPendentes, type EventoPublicado } from '../src/jobs/outbox';
import { definirEnvioDeEmail, processarEvento, type EmailEnviado } from '../src/jobs/processar-evento';
import { api, bearer, checkout, ciclo, compraPaga, login, novoComprador, pecaAtiva, prisma } from './helpers';

ciclo();

const statusArtesao = (token: string, pedidoId: string, corpo: Record<string, unknown>) =>
  api().patch(`/api/artesao/pedidos/${pedidoId}/status`).set(bearer(token)).send(corpo);

/** HU13 / TC12 — relatório: BLOQUEADO (o pedido não tinha rastreio nem linha do tempo). */
describe('HU13 / TC12 · Status de envio, rastreio e linha do tempo', () => {
  let tokenArtesao: string;
  beforeAll(async () => {
    tokenArtesao = (await login('artesao')).token;
  });

  it('fluxo completo: produção → postado (com rastreio) → entregue, com linha do tempo de 4 etapas', async () => {
    const peca = await pecaAtiva(2, 80);
    const comprador = await novoComprador();
    const { pedidoId } = await compraPaga(comprador.token, peca.id);

    expect((await statusArtesao(tokenArtesao, pedidoId, { status: 'EM_PRODUCAO' })).status).toBe(200);

    // Cenário 2: "Postado" sem código de rastreio → bloqueado
    const semCodigo = await statusArtesao(tokenArtesao, pedidoId, { status: 'DESPACHADO' });
    expect(semCodigo.status).toBe(400);
    expect(semCodigo.body.errors[0]).toEqual({ campo: 'codigoRastreio', mensagem: 'Informe o código de rastreio dos Correios antes de confirmar a postagem' });

    const postado = await statusArtesao(tokenArtesao, pedidoId, { status: 'DESPACHADO', codigoRastreio: 'aa123456789br' });
    expect(postado.status).toBe(200);

    // A visão do comprador reflete na hora (TC12)
    const visto = await api().get(`/api/pedidos/${pedidoId}`).set(bearer(comprador.token));
    expect(visto.body.data.status).toBe('DESPACHADO');
    expect(visto.body.data.entrega).toMatchObject({ codigoRastreio: 'AA123456789BR', urlRastreio: expect.stringMatching(/^https:\/\/.*correios/) });
    expect(visto.body.data.linhaDoTempo.map((e: { etapa: string }) => e.etapa)).toEqual(['Pagamento Confirmado', 'Em Produção no Ateliê', 'Despachado', 'Entregue']);
    expect(visto.body.data.linhaDoTempo.map((e: { concluida: boolean }) => e.concluida)).toEqual([true, true, true, false]);
    expect(visto.body.data.linhaDoTempo[2].atual).toBe(true);

    // Comprador confirma o recebimento
    const entregue = await api().post(`/api/pedidos/${pedidoId}/confirmar-recebimento`).set(bearer(comprador.token));
    expect(entregue.body.data.status).toBe('ENTREGUE');

    // Comprador foi notificado das mudanças
    const notificacoes = await api().get('/api/notificacoes?limit=50').set(bearer(comprador.token));
    expect(notificacoes.body.data.some((n: { payload: { codigoRastreio?: string } }) => n.payload.codigoRastreio === 'AA123456789BR')).toBe(true);
  });

  it('transição inválida (ex.: entregue antes de postar) → 400; pedido aguardando pagamento não pode ser produzido', async () => {
    const peca = await pecaAtiva(2, 80);
    const comprador = await novoComprador();
    const { pedidoId } = await compraPaga(comprador.token, peca.id);
    expect((await statusArtesao(tokenArtesao, pedidoId, { status: 'ENTREGUE' })).status).toBe(400);

    const naoPago = await checkout(comprador.token, [{ produtoId: peca.id, quantidade: 1 }]);
    expect((await statusArtesao(tokenArtesao, naoPago.body.data.pedidos[0].id, { status: 'EM_PRODUCAO' })).status).toBe(400);
  });

  it('artesão não altera pedido de outro artesão → 403', async () => {
    const peca = await pecaAtiva(1, 80);
    const comprador = await novoComprador();
    const { pedidoId } = await compraPaga(comprador.token, peca.id);
    const outro = (await login('artesao2')).token;
    expect((await statusArtesao(outro, pedidoId, { status: 'EM_PRODUCAO' })).status).toBe(403);
  });
});

/** TC13 — isolamento entre compradores (relatório: BLOQUEADO). */
describe('TC13 · Isolamento de pedidos (IDOR)', () => {
  it('comprador A só lista os seus; o pedido de B retorna 404; sem token 401', async () => {
    const peca = await pecaAtiva(5, 40);
    const a = await novoComprador('A');
    const b = await novoComprador('B');
    await compraPaga(a.token, peca.id);
    await compraPaga(a.token, peca.id);
    const doB = await compraPaga(b.token, peca.id);

    const lista = await api().get('/api/comprador/pedidos').set(bearer(a.token));
    expect(lista.body.meta.totalItems).toBe(2);

    const alheio = await api().get(`/api/pedidos/${doB.pedidoId}`).set(bearer(a.token));
    expect(alheio.status).toBe(404);
    expect(alheio.body.data).toBeNull();

    expect((await api().get(`/api/pedidos/${doB.pedidoId}`)).status).toBe(401);
  });
});

/** HU10 — acompanhamento operacional pelo admin. */
describe('HU10 · Pedidos no painel do admin', () => {
  it('filtra por "aguardando envio" e "atrasado" e registra nota de intervenção visível só para o admin', async () => {
    const peca = await pecaAtiva(3, 60);
    const comprador = await novoComprador();
    const { pedidoId } = await compraPaga(comprador.token, peca.id);
    const admin = (await login('admin')).token;

    const aguardando = await api().get('/api/admin/pedidos?filtro=AGUARDANDO_ENVIO&limit=50').set(bearer(admin));
    expect(aguardando.body.data.map((p: { id: string }) => p.id)).toContain(pedidoId);
    expect(aguardando.body.data[0]).toHaveProperty('comprador');
    expect(aguardando.body.data[0]).toHaveProperty('diasEmAberto');

    // Força o atraso: a data prevista de entrega já passou
    await prisma.entrega.update({ where: { pedidoId }, data: { dataPrevista: new Date(Date.now() - 86_400_000) } });
    const atrasados = await api().get('/api/admin/pedidos?filtro=ATRASADO&limit=50').set(bearer(admin));
    const achado = atrasados.body.data.find((p: { id: string }) => p.id === pedidoId);
    expect(achado.atrasado).toBe(true);

    const nota = await api().post(`/api/admin/pedidos/${pedidoId}/intervencoes`).set(bearer(admin)).send({ nota: 'Comprador relatou atraso; artesão contatado por telefone.' });
    expect(nota.status).toBe(201);
    expect(nota.body.data.intervencoes).toHaveLength(1);

    // O comprador não vê as notas internas
    const visaoComprador = await api().get(`/api/pedidos/${pedidoId}`).set(bearer(comprador.token));
    expect(visaoComprador.body.data).not.toHaveProperty('intervencoes');

    expect((await api().get('/api/admin/pedidos').set(bearer(comprador.token))).status).toBe(403);
  });
});

/** HU12 — fila assíncrona (relatório: BLOQUEADO; o worker não existia). */
describe('HU12 · Fila: outbox → relay → worker', () => {
  it('o evento NOVO_PEDIDO é publicado e o worker cria a notificação do artesão e registra o envio, uma única vez', async () => {
    const emails: EmailEnviado[] = [];
    definirEnvioDeEmail(async e => {
      emails.push(e);
    });

    const peca = await pecaAtiva(1, 60);
    const comprador = await novoComprador();
    const c = await checkout(comprador.token, [{ produtoId: peca.id, quantidade: 1 }]);
    const pedidoId = c.body.data.pedidos[0].id;

    // Relay: publica os pendentes numa "fila" em memória
    const fila: EventoPublicado[] = [];
    await publicarPendentes(async e => {
      fila.push(e);
    });
    const evento = fila.find(e => e.tipo === TipoEvento.NOVO_PEDIDO && e.payload.pedidoId === pedidoId)!;
    expect(evento).toBeDefined();

    // Nada fica pendente depois do relay (não publica de novo)
    const segundaRodada: EventoPublicado[] = [];
    await publicarPendentes(async e => {
      segundaRodada.push(e);
    });
    expect(segundaRodada.find(e => e.id === evento.id)).toBeUndefined();

    // Worker processa duas vezes (simulando retry) → uma notificação e um e-mail
    await processarEvento(evento);
    await processarEvento(evento);
    const notificacoes = await prisma.notificacaoLog.findMany({ where: { eventoId: evento.id } });
    expect(notificacoes).toHaveLength(1);
    expect(notificacoes[0]).toMatchObject({ tipoEvento: 'NOVO_PEDIDO', enviadoComSucesso: true, tentativas: 1, pedidoId });
    const enviados = emails.filter(e => e.eventoId === evento.id);
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toMatchObject({ para: 'artesao@pontodaterra.com', assunto: 'Você recebeu um novo pedido', eventoId: evento.id });
    expect(enviados[0].botao?.url).toMatch(/\/artesao$/);

    // A notificação aparece no painel do artesão
    const artesao = (await login('artesao')).token;
    const painel = await api().get('/api/notificacoes?limit=50').set(bearer(artesao));
    expect(painel.body.data.some((n: { id: string }) => n.id === notificacoes[0].id)).toBe(true);
  });

  it('falha no envio do e-mail: registra a tentativa e lança erro para a fila tentar de novo', async () => {
    definirEnvioDeEmail(async () => {
      throw new Error('SMTP fora do ar');
    });
    const peca = await pecaAtiva(1, 60);
    const comprador = await novoComprador();
    await checkout(comprador.token, [{ produtoId: peca.id, quantidade: 1 }]);
    const fila: EventoPublicado[] = [];
    await publicarPendentes(async e => {
      fila.push(e);
    });
    const evento = fila.find(e => e.tipo === TipoEvento.NOVO_PEDIDO)!;

    await expect(processarEvento(evento)).rejects.toThrow('SMTP fora do ar');
    const n = await prisma.notificacaoLog.findUniqueOrThrow({ where: { eventoId: evento.id } });
    expect(n).toMatchObject({ enviadoComSucesso: false, tentativas: 1 });

    definirEnvioDeEmail(async () => undefined);
    await processarEvento(evento); // retry bem-sucedido
    expect(await prisma.notificacaoLog.findUniqueOrThrow({ where: { eventoId: evento.id } })).toMatchObject({ enviadoComSucesso: true, tentativas: 2 });
  });
});
