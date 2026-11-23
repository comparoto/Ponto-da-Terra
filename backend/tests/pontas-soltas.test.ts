import { StatusCadastroArtesao, TipoEvento } from '@prisma/client';
import { api, bearer, ciclo, login, novoComprador, pecaAtiva, prisma, produtoValido, unico } from './helpers';

ciclo();

const cadastrarArtesao = async (nome = 'Artesã Nova') => {
  const email = `${unico('artesa').replace(/\W/g, '')}@teste.com`;
  const res = await api()
    .post('/api/auth/cadastro')
    .send({ nome, email, senha: 'segredo1', tipo: 'ARTESAO', cidade: 'Olinda', estado: 'PE', especialidade: 'Xilogravura', aceiteTermos: true });
  return { ...res.body.data, email } as { token: string; usuario: { id: string; artesaoId: string; cadastroArtesao: { status: string } }; email: string };
};

/** HU8 — "moderar e aprovar peças e cadastros de novos artesãos antes de irem a público". */
describe('HU8 · Aprovação do cadastro de novos artesãos', () => {
  it('novo artesão nasce PENDENTE: perfil e peças não aparecem até o admin aprovar', async () => {
    const artesao = await cadastrarArtesao('Artesã Pendente');
    expect(artesao.usuario.cadastroArtesao).toEqual({ status: 'PENDENTE', motivo: null });

    // Mesmo com uma peça aprovada, nada aparece enquanto o cadastro está pendente
    const peca = (await api().post('/api/produtos').set(bearer(artesao.token)).send(produtoValido())).body.data;
    const admin = (await login('admin')).token;
    await api().post(`/api/admin/produtos/${peca.id}/aprovar`).set(bearer(admin));
    expect((await api().get(`/api/artesaos/${artesao.usuario.artesaoId}`)).status).toBe(404);
    expect((await api().get(`/api/produtos/${peca.id}`)).status).toBe(404);

    const fila = await api().get('/api/admin/cadastros').set(bearer(admin));
    expect(fila.body.data.map((c: { artesaoId: string }) => c.artesaoId)).toContain(artesao.usuario.artesaoId);

    const aprovado = await api().post(`/api/admin/artesaos/${artesao.usuario.artesaoId}/aprovar-cadastro`).set(bearer(admin));
    expect(aprovado.body.data.statusCadastro).toBe('APROVADO');
    expect((await api().get(`/api/artesaos/${artesao.usuario.artesaoId}`)).status).toBe(200);
    expect((await api().get(`/api/produtos/${peca.id}`)).status).toBe(200);

    const notificacoes = await api().get('/api/notificacoes').set(bearer(artesao.token));
    expect(notificacoes.body.data.some((n: { tipoEvento: string }) => n.tipoEvento === TipoEvento.CADASTRO_APROVADO)).toBe(true);
  });

  it('reprovação exige motivo, mantém o perfil oculto e avisa o artesão', async () => {
    const artesao = await cadastrarArtesao('Artesã Reprovada');
    const admin = (await login('admin')).token;
    const url = `/api/admin/artesaos/${artesao.usuario.artesaoId}/reprovar-cadastro`;

    expect((await api().post(url).set(bearer(admin)).send({})).status).toBe(400);
    const res = await api().post(url).set(bearer(admin)).send({ motivo: 'Fotos do processo produtivo não comprovam a técnica' });
    expect(res.body.data).toMatchObject({ statusCadastro: 'REJEITADO', motivoCadastro: 'Fotos do processo produtivo não comprovam a técnica' });
    expect((await api().get(`/api/artesaos/${artesao.usuario.artesaoId}`)).status).toBe(404);

    const me = await api().get('/api/me').set(bearer(artesao.token));
    expect(me.body.data.cadastroArtesao).toEqual({ status: 'REJEITADO', motivo: 'Fotos do processo produtivo não comprovam a técnica' });
    // Só cadastros pendentes podem ser decididos
    expect((await api().post(`/api/admin/artesaos/${artesao.usuario.artesaoId}/aprovar-cadastro`).set(bearer(admin))).status).toBe(400);
  });

  it('artesãos do seed (anteriores à regra) continuam aprovados; comprador não acessa a fila', async () => {
    expect(await prisma.artesao.count({ where: { usuario: { email: 'artesao@pontodaterra.com' }, statusCadastro: StatusCadastroArtesao.APROVADO } })).toBe(1);
    const comprador = (await login('comprador')).token;
    expect((await api().get('/api/admin/cadastros').set(bearer(comprador))).status).toBe(403);
  });
});

/** HU16 — ativar, INATIVAR ou suspender contas. */
describe('HU16 · Inativar conta', () => {
  it('inativar bloqueia o login com "Conta inativa" e invalida a sessão; reativar devolve o acesso', async () => {
    const comprador = await novoComprador('Conta a Inativar');
    const admin = (await login('admin')).token;

    const res = await api().post(`/api/admin/usuarios/${comprador.usuario.id}/inativar`).set(bearer(admin)).send({ motivo: 'Solicitação do próprio usuário' });
    expect(res.body.data).toMatchObject({ status: 'INATIVO', motivoSuspensao: 'Solicitação do próprio usuário' });
    expect((await api().get('/api/me').set(bearer(comprador.token))).status).toBe(401);

    expect((await api().post(`/api/admin/usuarios/${comprador.usuario.id}/inativar`).set(bearer(admin)).send({})).status).toBe(400);
    expect((await api().post(`/api/admin/usuarios/${comprador.usuario.id}/reativar`).set(bearer(admin))).body.data.status).toBe('ATIVO');
  });
});

describe('Aceite dos Termos de Uso registrado no servidor', () => {
  it('cadastro e login com aceite gravam a data; sem aceite, nada muda', async () => {
    const artesao = await cadastrarArtesao();
    const me = await api().get('/api/me').set(bearer(artesao.token));
    expect(new Date(me.body.data.termosAceitosEm).getTime()).toBeGreaterThan(Date.now() - 60_000);

    const semAceite = await api().post('/api/auth/cadastro').send({ nome: 'Sem Aceite', email: `${unico('sa').replace(/\W/g, '')}@teste.com`, senha: 'segredo1' });
    expect(semAceite.body.data.usuario.termosAceitosEm).toBeNull();

    const login2 = await api().post('/api/auth/login').send({ email: 'comprador@pontodaterra.com', senha: 'comprador123', aceiteTermos: true });
    expect(login2.body.data.usuario.termosAceitosEm).not.toBeNull();
  });
});

describe('Favoritos', () => {
  it('favoritar, listar e desfavoritar (idempotente); só comprador', async () => {
    const peca = await pecaAtiva(2, 70);
    const comprador = await novoComprador();

    expect((await api().post(`/api/favoritos/${peca.id}`).set(bearer(comprador.token))).status).toBe(201);
    expect((await api().post(`/api/favoritos/${peca.id}`).set(bearer(comprador.token))).status).toBe(201); // repetido não duplica
    const lista = await api().get('/api/comprador/favoritos').set(bearer(comprador.token));
    expect(lista.body.data.map((p: { id: string }) => p.id)).toEqual([peca.id]);

    expect((await api().delete(`/api/favoritos/${peca.id}`).set(bearer(comprador.token))).status).toBe(200);
    expect((await api().get('/api/comprador/favoritos').set(bearer(comprador.token))).body.data).toEqual([]);

    const artesao = (await login('artesao')).token;
    expect((await api().post(`/api/favoritos/${peca.id}`).set(bearer(artesao))).status).toBe(403);
    expect((await api().post('/api/favoritos/00000000-0000-4000-8000-000000000000').set(bearer(comprador.token))).status).toBe(404);
  });
});

describe('Carrinho salvo no servidor', () => {
  it('salva, lê de volta (em outro "aparelho"), limita ao estoque e descarta peças indisponíveis', async () => {
    const a = await pecaAtiva(3, 50);
    const b = await pecaAtiva(1, 30);
    const comprador = await novoComprador();

    const salvo = await api()
      .put('/api/carrinho')
      .set(bearer(comprador.token))
      .send({ itens: [{ produtoId: a.id, quantidade: 2 }, { produtoId: b.id, quantidade: 5 }, { produtoId: '00000000-0000-4000-8000-000000000000', quantidade: 1 }] });
    expect(salvo.status).toBe(200);
    expect(salvo.body.data.itens.map((i: { produto: { id: string }; quantidade: number }) => [i.produto.id, i.quantidade])).toEqual([
      [a.id, 2],
      [b.id, 1], // limitado ao estoque
    ]);

    // Outro login do mesmo comprador enxerga o mesmo carrinho
    const lido = await api().get('/api/carrinho').set(bearer(comprador.token));
    expect(lido.body.data.itens).toHaveLength(2);

    // Peça que sai da vitrine some do carrinho
    await prisma.produto.update({ where: { id: b.id }, data: { status: 'PENDENTE' } });
    expect((await api().get('/api/carrinho').set(bearer(comprador.token))).body.data.itens).toHaveLength(1);

    // Esvaziar
    expect((await api().put('/api/carrinho').set(bearer(comprador.token)).send({ itens: [] })).body.data.itens).toEqual([]);
  });
});

describe('Notificações do comprador', () => {
  it('marcar todas como lidas', async () => {
    const comprador = await novoComprador();
    await prisma.notificacaoLog.createMany({
      data: [1, 2].map(() => ({ usuarioId: comprador.usuario.id, tipoEvento: TipoEvento.PEDIDO_ATUALIZADO, payload: { mensagem: 'teste' } })),
    });
    const naoLidas = await api().get('/api/notificacoes?naoLidas=true').set(bearer(comprador.token));
    expect(naoLidas.body.meta.totalItems).toBe(2);
    const res = await api().post('/api/notificacoes/marcar-todas-lidas').set(bearer(comprador.token));
    expect(res.body.data.marcadas).toBe(2);
    expect((await api().get('/api/notificacoes?naoLidas=true').set(bearer(comprador.token))).body.meta.totalItems).toBe(0);
  });
});
