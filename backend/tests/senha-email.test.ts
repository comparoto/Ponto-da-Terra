import { api, bearer, ciclo, prisma, unico } from './helpers';
import { emailsDeTeste, montarHtml, restaurarEnvioDeEmail } from '../src/shared/email';

ciclo();

beforeEach(() => {
  restaurarEnvioDeEmail();
  emailsDeTeste.length = 0;
});

/** Cria uma conta de comprador pela API (com senha real, para os testes de login) */
async function contaComSenha(senha = 'segredo1') {
  const email = `${unico('senha').replace(/\W/g, '')}@teste.com`;
  const res = await api().post('/api/auth/cadastro').send({ nome: 'Pessoa da Senha', email, senha, aceiteTermos: true });
  return { email, senha, token: res.body.data.token as string };
}

const entrar = (email: string, senha: string) => api().post('/api/auth/login').send({ email, senha });
const tokenDoLink = (url: string) => new URL(url).searchParams.get('token')!;

describe('Trocar a senha logado (PUT /api/me/senha)', () => {
  it('exige a senha atual, troca a senha, derruba as outras sessões e devolve um token novo', async () => {
    const conta = await contaComSenha();

    const errada = await api().put('/api/me/senha').set(bearer(conta.token)).send({ senhaAtual: 'naoehessa', novaSenha: 'novaSenha9' });
    expect(errada.status).toBe(400);
    expect(errada.body.errors).toEqual([{ campo: 'senhaAtual', mensagem: 'Senha atual incorreta' }]);

    const igual = await api().put('/api/me/senha').set(bearer(conta.token)).send({ senhaAtual: conta.senha, novaSenha: conta.senha });
    expect(igual.status).toBe(400);

    const ok = await api().put('/api/me/senha').set(bearer(conta.token)).send({ senhaAtual: conta.senha, novaSenha: 'novaSenha9' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.token).toEqual(expect.any(String));

    // O token antigo deixa de valer; o novo funciona
    expect((await api().get('/api/me').set(bearer(conta.token))).status).toBe(401);
    expect((await api().get('/api/me').set(bearer(ok.body.data.token))).status).toBe(200);
    expect((await entrar(conta.email, conta.senha)).status).toBe(401);
    expect((await entrar(conta.email, 'novaSenha9')).status).toBe(200);

    // Aviso por e-mail
    expect(emailsDeTeste).toEqual([expect.objectContaining({ para: conta.email, assunto: 'Sua senha foi alterada' })]);
  });

  it('sem login, não troca nada', async () => {
    expect((await api().put('/api/me/senha').send({ senhaAtual: 'a', novaSenha: 'bbbbbb' })).status).toBe(401);
  });
});

describe('Esqueci minha senha → link por e-mail → nova senha', () => {
  it('envia um link de uso único que redefine a senha e encerra as sessões', async () => {
    const conta = await contaComSenha();
    const pedido = await api().post('/api/auth/esqueci-senha').send({ email: conta.email.toUpperCase() });
    expect(pedido.status).toBe(200);

    expect(emailsDeTeste).toHaveLength(1);
    const email = emailsDeTeste[0];
    expect(email).toMatchObject({ para: conta.email, assunto: 'Redefinição de senha' });
    expect(email.botao!.url).toMatch(/^http.+\/redefinir-senha\?token=[\w-]{40,}$/);
    const token = tokenDoLink(email.botao!.url);

    // O banco guarda só o hash: o token do e-mail não aparece em lugar nenhum
    const registros = await prisma.tokenRedefinicaoSenha.findMany({ where: { usuario: { email: conta.email } } });
    expect(registros).toHaveLength(1);
    expect(registros[0].tokenHash).not.toContain(token);

    const curta = await api().post('/api/auth/redefinir-senha').send({ token, novaSenha: '123' });
    expect(curta.status).toBe(400);

    const ok = await api().post('/api/auth/redefinir-senha').send({ token, novaSenha: 'recuperada1' });
    expect(ok.status).toBe(200);
    expect((await api().get('/api/me').set(bearer(conta.token))).status).toBe(401); // sessões antigas encerradas
    expect((await entrar(conta.email, 'recuperada1')).status).toBe(200);

    // O mesmo link não funciona duas vezes
    const reuso = await api().post('/api/auth/redefinir-senha').send({ token, novaSenha: 'outraSenha2' });
    expect(reuso.status).toBe(400);
    expect(reuso.body.error).toMatch(/Link inválido ou expirado/);
  });

  it('responde igual para e-mail inexistente (não revela quem tem conta) e não envia nada', async () => {
    const res = await api().post('/api/auth/esqueci-senha').send({ email: 'ninguem-aqui@teste.com' });
    expect(res.status).toBe(200);
    expect(res.body.data.mensagem).toMatch(/Se houver uma conta/);
    expect(emailsDeTeste).toHaveLength(0);
  });

  it('um pedido novo anula o link anterior; link vencido é recusado', async () => {
    const conta = await contaComSenha();
    await api().post('/api/auth/esqueci-senha').send({ email: conta.email });
    await api().post('/api/auth/esqueci-senha').send({ email: conta.email });
    const [primeiro, segundo] = emailsDeTeste.map(e => tokenDoLink(e.botao!.url));

    expect((await api().post('/api/auth/redefinir-senha').send({ token: primeiro, novaSenha: 'tentativa1' })).status).toBe(400);

    // Vence o segundo link
    await prisma.tokenRedefinicaoSenha.updateMany({ where: { usuario: { email: conta.email }, usadoEm: null }, data: { expiraEm: new Date(Date.now() - 1000) } });
    expect((await api().post('/api/auth/redefinir-senha').send({ token: segundo, novaSenha: 'tentativa2' })).status).toBe(400);
    expect((await entrar(conta.email, conta.senha)).status).toBe(200); // senha continua a original
  });

  it('token inventado é recusado', async () => {
    const res = await api().post('/api/auth/redefinir-senha').send({ token: 'x'.repeat(43), novaSenha: 'qualquer1' });
    expect(res.status).toBe(400);
  });
});

describe('Modelo dos e-mails', () => {
  it('escapa HTML do conteúdo (nome do usuário não injeta tags)', () => {
    const html = montarHtml({ para: 'a@b.com', assunto: 'x', titulo: '<script>alert(1)</script>', paragrafos: ['Olá, <b>Maria</b>'] });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Origem: Ponto da Terra');
  });
});
