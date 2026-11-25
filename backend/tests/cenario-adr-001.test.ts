import { api, aprovarCadastro, bearer, ciclo, login, prisma, unico } from './helpers';

ciclo();

/**
 * Teste do cenário do ADR-001 (docs/adr/adr-001-adotar-revogacao-imediata-de-acesso-com-jwt-e-tokenversion-conferido-a-cada-requisicao.md).
 *
 * Em operação normal, com o artesão logado em dois aparelhos e com tokens ainda dentro da validade,
 * o administrador suspende a conta dele. A partir da resposta 200 da suspensão, em 100% das tentativas
 * e nos dois aparelhos: tokens antigos recusados com 401 "Sessão expirada", novo login recusado com
 * 403 "Conta suspensa" e detalhe de cada peça do artesão respondendo 404.
 *
 * A medida de custo (mediana de até 20 ms na checagem de sessão) não entra aqui, porque depende da
 * máquina e do banco: ela tem o seu próprio comando, `npm run medir:autenticacao`.
 */
describe('ADR-001 · revogação imediata em dois aparelhos', () => {
  it('depois da resposta 200 da suspensão, nenhuma requisição com tokens antigos é aceita nos dois aparelhos', async () => {
    const admin = (await login('admin')).token;

    // Artesão aprovado, com duas peças na vitrine
    const email = `${unico('dois-aparelhos').replace(/\W/g, '')}@teste.com`;
    const senha = 'segredo1';
    const cadastro = await api()
      .post('/api/auth/cadastro')
      .send({ nome: 'Artesão dos Dois Aparelhos', email, senha, tipo: 'ARTESAO', cidade: 'Olinda', estado: 'PE', especialidade: 'Barro', aceiteTermos: true });
    const { usuario } = cadastro.body.data;
    await aprovarCadastro(usuario.artesaoId);
    const pecas = await Promise.all(
      [1, 2].map(n =>
        prisma.produto.create({
          data: {
            titulo: `Peça ${n} do artesão dos dois aparelhos`,
            tecnica: 'Barro',
            poloOrigem: 'Olinda',
            preco: 10,
            status: 'ATIVO',
            artesaoId: usuario.artesaoId,
            imagensUrls: ['https://exemplo.com/a.jpg'],
            estoque: { create: { quantidadeDisponivel: 1 } },
          },
        }),
      ),
    );

    // Dois aparelhos: o token do cadastro e o de um segundo login. Os dois são válidos.
    // O token leva id, perfil, versão e horário (em segundos): dois logins no mesmo segundo gerariam o mesmo texto.
    // Na vida real os aparelhos entram em momentos diferentes, então espera-se 1,1 s para o segundo ter o seu próprio token.
    const aparelhoA: string = cadastro.body.data.token;
    await new Promise(resolver => setTimeout(resolver, 1100));
    const aparelhoB: string = (await api().post('/api/auth/login').send({ email, senha })).body.data.token;
    expect(aparelhoA).not.toBe(aparelhoB);
    for (const token of [aparelhoA, aparelhoB]) expect((await api().get('/api/me').set(bearer(token))).status).toBe(200);
    for (const peca of pecas) expect((await api().get(`/api/produtos/${peca.id}`)).status).toBe(200);

    // O administrador suspende a conta e recebe a confirmação (200): daqui em diante, nada é aceito
    const suspensao = await api()
      .post(`/api/admin/usuarios/${usuario.id}/suspender`)
      .set(bearer(admin))
      .send({ motivo: 'Venda de peças industrializadas como artesanais' });
    expect(suspensao.status).toBe(200);

    // 100% das tentativas nos dois aparelhos (5 por aparelho): todas recusadas com 401 "Sessão expirada"
    const tentativas = [];
    for (const token of [aparelhoA, aparelhoB]) {
      for (let i = 0; i < 5; i++) tentativas.push(await api().get('/api/me').set(bearer(token)));
    }
    expect(tentativas).toHaveLength(10);
    expect(tentativas.filter(r => r.status !== 401 || r.body.error !== 'Sessão expirada')).toHaveLength(0);
    expect(tentativas.filter(r => r.status === 200)).toHaveLength(0); // nenhuma requisição aceita

    // Novo login: recusado com 403 "Conta suspensa"
    const novoLogin = await api().post('/api/auth/login').send({ email, senha });
    expect(novoLogin.status).toBe(403);
    expect(novoLogin.body.error).toBe('Conta suspensa');

    // O detalhe de cada peça do artesão passa a responder 404
    for (const peca of pecas) expect((await api().get(`/api/produtos/${peca.id}`)).status).toBe(404);
  });
});
