import { api, bearer, ciclo, login, produtoValido } from './helpers';

ciclo();

/**
 * TC01 — Proteção de rotas administrativas (relatório de 09/11/2026: BLOQUEADO).
 * A checagem agora é feita no servidor, a partir do perfil gravado no JWT/banco.
 */
describe('TC01 · Isolamento de perfis', () => {
  const rotasAdmin = [
    ['get', '/api/admin/curadoria'],
    ['post', '/api/admin/produtos/00000000-0000-4000-8000-000000000000/aprovar'],
    ['post', '/api/admin/produtos/00000000-0000-4000-8000-000000000000/reprovar'],
  ] as const;

  it.each(rotasAdmin)('comprador em %s %s → 403', async (metodo, rota) => {
    const { token } = await login('comprador');
    const res = await api()[metodo](rota).set(bearer(token)).send({ justificativa: 'qualquer motivo aqui' });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, data: null, error: 'Acesso negado' });
  });

  it.each(rotasAdmin)('artesão em %s %s → 403', async (metodo, rota) => {
    const { token } = await login('artesao');
    const res = await api()[metodo](rota).set(bearer(token));
    expect(res.status).toBe(403);
  });

  it.each(rotasAdmin)('sem token em %s %s → 401', async (metodo, rota) => {
    const res = await api()[metodo](rota);
    expect(res.status).toBe(401);
  });

  it('admin acessa a fila de curadoria → 200', async () => {
    const { token } = await login('admin');
    const res = await api().get('/api/admin/curadoria').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual(expect.objectContaining({ page: 1 }));
  });

  it('comprador não pode cadastrar produto → 403', async () => {
    const { token } = await login('comprador');
    const res = await api().post('/api/produtos').set(bearer(token)).send(produtoValido());
    expect(res.status).toBe(403);
  });

  it('artesão não pode editar peça de outro artesão → 403', async () => {
    const dono = await login('artesao');
    const criado = await api().post('/api/produtos').set(bearer(dono.token)).send(produtoValido());
    const outro = await login('artesao2');

    const res = await api().put(`/api/produtos/${criado.body.data.id}`).set(bearer(outro.token)).send({ preco: 1 });
    expect(res.status).toBe(403);
    const estoque = await api().patch(`/api/produtos/${criado.body.data.id}/estoque`).set(bearer(outro.token)).send({ quantidade: 99 });
    expect(estoque.status).toBe(403);
  });

  it('rota inexistente → 404 no formato ApiResult', async () => {
    const res = await api().get('/api/nao-existe');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('força bruta: após 10 senhas erradas para o mesmo e-mail, o login responde 429', async () => {
    const tentar = (senha: string) => api().post('/api/auth/login').send({ email: 'forca-bruta@teste.com', senha });
    for (let i = 0; i < 10; i++) expect((await tentar('errada123')).status).toBe(401);
    const bloqueada = await tentar('errada123');
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body.error).toMatch(/Muitas tentativas de login/);
    // Outro e-mail, no mesmo IP, não é afetado
    expect((await api().post('/api/auth/login').send({ email: 'comprador@pontodaterra.com', senha: 'comprador123' })).status).toBe(200);
  });

  it('JSON malformado → 400', async () => {
    const res = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('JSON inválido no corpo da requisição');
  });
});
