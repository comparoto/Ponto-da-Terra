import { StatusProduto, TipoEvento } from '@prisma/client';
import { api, bearer, ciclo, login, prisma, produtoValido } from './helpers';

ciclo();

/**
 * TC04 — Moderação de catálogo (relatório de 09/11/2026: REPROVADO).
 * Falhas apontadas: reprovação não pedia motivo, APAGAVA a peça, não avisava o artesão,
 * e peças não aprovadas já apareciam na vitrine.
 */
describe('TC04 · Curadoria reprovada', () => {
  let tokenAdmin: string;
  let tokenArtesao: string;

  beforeAll(async () => {
    tokenAdmin = (await login('admin')).token;
    tokenArtesao = (await login('artesao')).token;
  });

  const criarPendente = async () => (await api().post('/api/produtos').set(bearer(tokenArtesao)).send(produtoValido())).body.data;

  it('reprovar sem justificativa → 400 e a peça continua PENDENTE', async () => {
    const peca = await criarPendente();
    const res = await api().post(`/api/admin/produtos/${peca.id}/reprovar`).set(bearer(tokenAdmin)).send({});

    expect(res.status).toBe(400);
    expect(res.body.errors).toContainEqual({ campo: 'justificativa', mensagem: 'Informe o motivo da reprovação' });
    expect((await prisma.produto.findUniqueOrThrow({ where: { id: peca.id } })).status).toBe(StatusProduto.PENDENTE);
  });

  it('reprovar com justificativa → REJEITADO (não apaga), invisível na vitrine e artesão notificado', async () => {
    const peca = await criarPendente();
    const motivo = 'Falta nitidez nas fotos';

    const res = await api().post(`/api/admin/produtos/${peca.id}/reprovar`).set(bearer(tokenAdmin)).send({ justificativa: motivo });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'REJEITADO', justificativaCuradoria: motivo });

    // Não foi apagada
    const noBanco = await prisma.produto.findUnique({ where: { id: peca.id } });
    expect(noBanco).toMatchObject({ status: StatusProduto.REJEITADO, justificativaCuradoria: motivo });

    // Continua invisível na vitrine
    expect((await api().get(`/api/produtos/${peca.id}`)).status).toBe(404);

    // Artesão vê a peça rejeitada com o motivo no painel
    const painel = await api().get(`/api/artesao/produtos/${peca.id}`).set(bearer(tokenArtesao));
    expect(painel.body.data).toMatchObject({ status: 'REJEITADO', justificativaCuradoria: motivo });

    // Artesão recebeu a notificação com o motivo
    const notificacoes = await api().get('/api/notificacoes?naoLidas=true&limit=50').set(bearer(tokenArtesao));
    const aviso = notificacoes.body.data.find((n: { payload: { produtoId: string } }) => n.payload.produtoId === peca.id);
    expect(aviso).toMatchObject({ tipoEvento: 'PRODUTO_REJEITADO', lida: false, payload: { justificativa: motivo } });

    // Evento gravado na outbox para o envio assíncrono (fase 2)
    const eventos = await prisma.eventoOutbox.findMany({ where: { tipo: TipoEvento.PRODUTO_REJEITADO } });
    expect(eventos.some(e => (e.payload as { produtoId: string }).produtoId === peca.id)).toBe(true);

    // Marcar como lida
    const lida = await api().patch(`/api/notificacoes/${aviso.id}/lida`).set(bearer(tokenArtesao));
    expect(lida.body.data.lida).toBe(true);
  });

  it('não é possível reprovar duas vezes (só peças PENDENTE)', async () => {
    const peca = await criarPendente();
    await api().post(`/api/admin/produtos/${peca.id}/reprovar`).set(bearer(tokenAdmin)).send({ justificativa: 'Procedência não comprovada' });
    const res = await api().post(`/api/admin/produtos/${peca.id}/reprovar`).set(bearer(tokenAdmin)).send({ justificativa: 'Procedência não comprovada' });
    expect(res.status).toBe(400);
  });

  it('artesão corrige a peça rejeitada e ela volta para a fila como PENDENTE', async () => {
    const peca = await criarPendente();
    await api().post(`/api/admin/produtos/${peca.id}/reprovar`).set(bearer(tokenAdmin)).send({ justificativa: 'Descrição incompleta da técnica' });

    const res = await api().put(`/api/produtos/${peca.id}`).set(bearer(tokenArtesao)).send({ descricao: 'Descrição completa da técnica de modelagem' });
    expect(res.body.data).toMatchObject({ status: 'PENDENTE', justificativaCuradoria: null });

    const fila = await api().get('/api/admin/curadoria?limit=50').set(bearer(tokenAdmin));
    expect(fila.body.data.map((p: { id: string }) => p.id)).toContain(peca.id);
  });
});

describe('HU8 · Curadoria aprovada', () => {
  it('aprovar → ATIVO, aparece na vitrine e o artesão é notificado', async () => {
    const tokenAdmin = (await login('admin')).token;
    const tokenArtesao = (await login('artesao')).token;
    const peca = (await api().post('/api/produtos').set(bearer(tokenArtesao)).send(produtoValido())).body.data;

    const res = await api().post(`/api/admin/produtos/${peca.id}/aprovar`).set(bearer(tokenAdmin));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ATIVO');

    expect((await api().get(`/api/produtos/${peca.id}`)).status).toBe(200);
    const notificacoes = await api().get('/api/notificacoes?limit=50').set(bearer(tokenArtesao));
    expect(notificacoes.body.data.some((n: { tipoEvento: string; payload: { produtoId: string } }) => n.tipoEvento === 'PRODUTO_APROVADO' && n.payload.produtoId === peca.id)).toBe(true);
  });

  it('peça sem nenhuma foto não pode ser aprovada (HU1: ao menos uma foto)', async () => {
    const tokenAdmin = (await login('admin')).token;
    const tokenArtesao = (await login('artesao')).token;
    const peca = (await api().post('/api/produtos').set(bearer(tokenArtesao)).send(produtoValido({ imagensUrls: [] }))).body.data;

    const res = await api().post(`/api/admin/produtos/${peca.id}/aprovar`).set(bearer(tokenAdmin));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ao menos uma foto/);
  });

  it('produto inexistente → 404', async () => {
    const tokenAdmin = (await login('admin')).token;
    const res = await api().post('/api/admin/produtos/00000000-0000-4000-8000-000000000000/aprovar').set(bearer(tokenAdmin));
    expect(res.status).toBe(404);
  });
});
