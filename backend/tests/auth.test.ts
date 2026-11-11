import jwt from 'jsonwebtoken';
import { api, bearer, ciclo, login, unico } from './helpers';

ciclo();

describe('Autenticação', () => {
  it('cadastra um comprador e já devolve o token', async () => {
    const email = `${unico('comprador').replace(/\W/g, '')}@teste.com`;
    const res = await api().post('/api/auth/cadastro').send({ nome: 'Comprador Teste', email, senha: 'segredo1' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.usuario).toMatchObject({ email, tipo: 'CONSUMIDOR', status: 'ATIVO' });
    expect(res.body.data.usuario).not.toHaveProperty('senhaHash');
  });

  it('recusa e-mail já cadastrado com 409', async () => {
    const res = await api().post('/api/auth/cadastro').send({ nome: 'Outro', email: 'COMPRADOR@pontodaterra.com', senha: 'segredo1' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('E-mail já cadastrado');
  });

  it('RN06: artesão sem cidade, UF e especialidade → 400 listando os campos', async () => {
    const res = await api().post('/api/auth/cadastro').send({ nome: 'Artesã', email: 'artesa-sem-dados@teste.com', senha: 'segredo1', tipo: 'ARTESAO' });

    expect(res.status).toBe(400);
    expect(res.body.errors.map((e: { campo: string }) => e.campo).sort()).toEqual(['cidade', 'especialidade', 'estado']);
  });

  it('RN04: senha curta → 400', async () => {
    const res = await api().post('/api/auth/cadastro').send({ nome: 'Fulano', email: 'curta@teste.com', senha: '123' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toContainEqual({ campo: 'senha', mensagem: 'A senha deve ter no mínimo 6 caracteres' });
  });

  it('cadastra artesão com perfil de ateliê', async () => {
    const res = await api()
      .post('/api/auth/cadastro')
      .send({ nome: 'Artesã Nova', email: 'artesa-nova@teste.com', senha: 'segredo1', tipo: 'ARTESAO', cidade: 'Olinda', estado: 'PE', especialidade: 'Xilogravura' });

    expect(res.status).toBe(201);
    expect(res.body.data.usuario.tipo).toBe('ARTESAO');
    expect(res.body.data.usuario.artesaoId).toEqual(expect.any(String));
  });

  it('login com senha errada → 401 sem revelar se o e-mail existe', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'comprador@pontodaterra.com', senha: 'errada' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('E-mail ou senha inválidos');
  });

  it('GET /api/me retorna o perfil do token', async () => {
    const { token } = await login('comprador');
    const res = await api().get('/api/me').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: 'comprador@pontodaterra.com', tipo: 'CONSUMIDOR' });
  });

  it('sem token → 401 "Autenticação necessária"', async () => {
    const res = await api().get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Autenticação necessária');
  });

  it('TC07: token JWT expirado → 401 "Sessão expirada"', async () => {
    const { usuario } = await login('artesao');
    const expirado = jwt.sign(
      { sub: usuario.id, tipo: 'ARTESAO', tv: 0, exp: Math.floor(Date.now() / 1000) - 3600 },
      process.env.JWT_SECRET!,
    );
    const res = await api().get('/api/artesao/perfil').set(bearer(expirado));

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, data: null, error: 'Sessão expirada' });
  });

  it('token assinado com outro segredo → 401 "Token inválido"', async () => {
    const falso = jwt.sign({ sub: 'x', tipo: 'ADMIN', tv: 0 }, 'segredo-de-um-atacante-qualquer');
    const res = await api().get('/api/me').set(bearer(falso));
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token inválido');
  });

  it('logout invalida o token emitido (HU16: sessões invalidadas)', async () => {
    const email = 'logout@teste.com';
    const cadastro = await api().post('/api/auth/cadastro').send({ nome: 'Logout', email, senha: 'segredo1' });
    const token = cadastro.body.data.token;

    expect((await api().post('/api/auth/logout').set(bearer(token))).status).toBe(200);
    const res = await api().get('/api/me').set(bearer(token));
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Sessão expirada');
  });

  it('DELETE /api/me exclui a conta; o token deixa de valer e o login falha', async () => {
    const email = 'excluir@teste.com';
    const cadastro = await api().post('/api/auth/cadastro').send({ nome: 'Excluir', email, senha: 'segredo1' });
    const token = cadastro.body.data.token;

    expect((await api().delete('/api/me').set(bearer(token))).status).toBe(200);
    expect((await api().get('/api/me').set(bearer(token))).status).toBe(401);
    expect((await api().post('/api/auth/login').send({ email, senha: 'segredo1' })).status).toBe(401);
  });

  it('DELETE /api/me de artesão remove o perfil público e as peças', async () => {
    const cadastro = await api()
      .post('/api/auth/cadastro')
      .send({ nome: 'Artesã Temporária', email: 'temporaria@teste.com', senha: 'segredo1', tipo: 'ARTESAO', cidade: 'Olinda', estado: 'PE', especialidade: 'Barro' });
    const { token, usuario } = cadastro.body.data;

    expect((await api().delete('/api/me').set(bearer(token))).status).toBe(200);
    expect((await api().get(`/api/artesaos/${usuario.artesaoId}`)).status).toBe(404);
  });

  it('admin não pode excluir a própria conta por /api/me → 403', async () => {
    const { token } = await login('admin');
    expect((await api().delete('/api/me').set(bearer(token))).status).toBe(403);
  });

  it('PUT /api/me atualiza nome e recusa campos não permitidos', async () => {
    const { token } = await login('comprador');
    const okRes = await api().put('/api/me').set(bearer(token)).send({ telefone: '81999990000' });
    expect(okRes.status).toBe(200);
    expect(okRes.body.data.telefone).toBe('81999990000');

    const ruim = await api().put('/api/me').set(bearer(token)).send({ tipo: 'ADMIN' });
    expect(ruim.status).toBe(400);
  });
});
