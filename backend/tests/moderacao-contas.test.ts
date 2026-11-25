import { api, bearer, ciclo, login, novoComprador, prisma } from './helpers';

ciclo();

/**
 * Testes de CARACTERIZAÇÃO da moderação de contas (HU16: suspender, inativar, reativar).
 *
 * Foram escritos ANTES da refatoração do módulo (ver docs/code_smells/REFATORACAO_MODERACAO_CONTAS.md) para fixar o
 * comportamento observável: status HTTP, mensagens, campos gravados e efeito nas sessões (tokenVersion).
 * Eles passam no código antigo e devem continuar passando, sem alteração, depois da refatoração.
 */

const acao = (admin: string, id: string, rota: 'suspender' | 'inativar' | 'reativar', corpo?: object) => {
  const req = api().post(`/api/admin/usuarios/${id}/${rota}`).set(bearer(admin));
  return corpo ? req.send(corpo) : req;
};
const MOTIVO = 'Motivo com mais de dez caracteres';
const tokenVersion = async (id: string) => (await prisma.usuario.findUniqueOrThrow({ where: { id }, select: { tokenVersion: true } })).tokenVersion;

describe('Moderação de contas · regras comuns a suspender e inativar', () => {
  it.each([
    ['suspender', 'SUSPENSO', 'suspensas', 'suspensa'],
    ['inativar', 'INATIVO', 'inativadas', 'inativa'],
  ] as const)('%s: grava o status, derruba as sessões e recusa conta inexistente, administrador e conta já no mesmo estado', async (rota, status, plural, singular) => {
    const admin = (await login('admin')).token;
    const alvo = await novoComprador();
    const antes = await tokenVersion(alvo.usuario.id);

    const res = await acao(admin, alvo.usuario.id, rota, { motivo: MOTIVO });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: alvo.usuario.id, status, motivoSuspensao: MOTIVO, tipo: 'CONSUMIDOR' });
    expect(await tokenVersion(alvo.usuario.id)).toBe(antes + 1); // todos os tokens emitidos deixam de valer
    expect((await api().get('/api/me').set(bearer(alvo.token))).status).toBe(401);

    // Repetir a mesma ação: 400 com mensagem específica, sem derrubar sessões de novo
    const repetida = await acao(admin, alvo.usuario.id, rota, { motivo: MOTIVO });
    expect(repetida.status).toBe(400);
    expect(repetida.body.error).toBe(`A conta já está ${singular}`);
    expect(await tokenVersion(alvo.usuario.id)).toBe(antes + 1);

    // Administradores não podem ser moderados por aqui
    const adminId = (await login('admin')).usuario.id;
    const contraAdmin = await acao(admin, adminId, rota, { motivo: MOTIVO });
    expect(contraAdmin.status).toBe(403);
    expect(contraAdmin.body.error).toBe(`Contas de administrador não podem ser ${plural} por aqui`);

    // Conta inexistente
    const inexistente = await acao(admin, '00000000-0000-4000-8000-000000000000', rota, { motivo: MOTIVO });
    expect(inexistente.status).toBe(404);
    expect(inexistente.body.error).toBe('Usuário não encontrado');

    // Identificador inválido é recusado antes de chegar ao banco
    expect((await acao(admin, 'nao-e-uuid', rota, { motivo: MOTIVO })).status).toBe(400);
  });

  it('só administradores moderam: comprador recebe 403 e visitante 401', async () => {
    const alvo = await novoComprador();
    const comprador = (await login('comprador')).token;
    for (const rota of ['suspender', 'inativar', 'reativar'] as const) {
      expect((await acao(comprador, alvo.usuario.id, rota, { motivo: MOTIVO })).status).toBe(403);
      expect((await api().post(`/api/admin/usuarios/${alvo.usuario.id}/${rota}`).send({ motivo: MOTIVO })).status).toBe(401);
    }
  });
});

describe('Moderação de contas · o que é específico de cada ação', () => {
  it('suspender exige motivo de pelo menos 10 caracteres', async () => {
    const admin = (await login('admin')).token;
    const alvo = await novoComprador();
    expect((await acao(admin, alvo.usuario.id, 'suspender', {})).status).toBe(400);
    const curto = await acao(admin, alvo.usuario.id, 'suspender', { motivo: 'curto' });
    expect(curto.status).toBe(400);
    expect(curto.body.errors[0]).toMatchObject({ campo: 'motivo' });
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: alvo.usuario.id } })).status).toBe('ATIVO');
  });

  it('inativar aceita motivo opcional; sem motivo grava null (e texto vazio também)', async () => {
    const admin = (await login('admin')).token;
    const a = await novoComprador();
    const semMotivo = await acao(admin, a.usuario.id, 'inativar', {});
    expect(semMotivo.status).toBe(200);
    expect(semMotivo.body.data).toMatchObject({ status: 'INATIVO', motivoSuspensao: null });

    const b = await novoComprador();
    const vazio = await acao(admin, b.usuario.id, 'inativar', { motivo: '   ' });
    expect(vazio.body.data).toMatchObject({ status: 'INATIVO', motivoSuspensao: null });
  });

  it('é possível passar de suspensa para inativa e de inativa para suspensa (cada uma derruba as sessões)', async () => {
    const admin = (await login('admin')).token;
    const alvo = await novoComprador();
    await acao(admin, alvo.usuario.id, 'suspender', { motivo: MOTIVO });
    const v1 = await tokenVersion(alvo.usuario.id);

    const inativada = await acao(admin, alvo.usuario.id, 'inativar', { motivo: 'Pedido da própria pessoa' });
    expect(inativada.body.data).toMatchObject({ status: 'INATIVO', motivoSuspensao: 'Pedido da própria pessoa' });
    expect(await tokenVersion(alvo.usuario.id)).toBe(v1 + 1);

    const suspensa = await acao(admin, alvo.usuario.id, 'suspender', { motivo: MOTIVO });
    expect(suspensa.body.data).toMatchObject({ status: 'SUSPENSO', motivoSuspensao: MOTIVO });
    expect(await tokenVersion(alvo.usuario.id)).toBe(v1 + 2);
  });

  it('reativar: volta a ATIVO, apaga o motivo, não mexe nas sessões e recusa conta já ativa ou inexistente', async () => {
    const admin = (await login('admin')).token;
    const alvo = await novoComprador();

    const jaAtiva = await acao(admin, alvo.usuario.id, 'reativar');
    expect(jaAtiva.status).toBe(400);
    expect(jaAtiva.body.error).toBe('A conta já está ativa');

    await acao(admin, alvo.usuario.id, 'suspender', { motivo: MOTIVO });
    const v = await tokenVersion(alvo.usuario.id);
    const res = await acao(admin, alvo.usuario.id, 'reativar');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'ATIVO', motivoSuspensao: null });
    expect(await tokenVersion(alvo.usuario.id)).toBe(v); // reativar não incrementa o tokenVersion

    expect((await acao(admin, '00000000-0000-4000-8000-000000000000', 'reativar')).status).toBe(404);
  });

  it('reativar também funciona para contas inativas; administradores não são bloqueados por aqui (já estão ativos)', async () => {
    const admin = await login('admin');
    const alvo = await novoComprador();
    await acao(admin.token, alvo.usuario.id, 'inativar', {});
    expect((await acao(admin.token, alvo.usuario.id, 'reativar')).body.data.status).toBe('ATIVO');
    expect((await acao(admin.token, admin.usuario.id, 'reativar')).body.error).toBe('A conta já está ativa');
  });
});

describe('Moderação de contas · resposta e listagem', () => {
  it('a resposta traz o formato público da conta (sem dados sensíveis)', async () => {
    const admin = (await login('admin')).token;
    const alvo = await novoComprador('Pessoa Moderada');
    const res = await acao(admin, alvo.usuario.id, 'suspender', { motivo: MOTIVO });
    expect(Object.keys(res.body.data).sort()).toEqual(
      ['artesaoId', 'dataCadastro', 'email', 'id', 'motivoSuspensao', 'nome', 'produtosAtivos', 'statusCadastro', 'status', 'tipo'].sort(),
    );
    expect(res.body.data).toMatchObject({ nome: 'Pessoa Moderada', artesaoId: null, produtosAtivos: 0, statusCadastro: null });
    expect(JSON.stringify(res.body)).not.toMatch(/senhaHash|tokenVersion/);
  });

  it('a lista filtra por tipo, status e busca, e pagina', async () => {
    const admin = (await login('admin')).token;
    const alvo = await novoComprador('Zelda Listagem');
    await acao(admin, alvo.usuario.id, 'inativar', {});

    const porStatus = await api().get('/api/admin/usuarios?status=INATIVO&limit=50').set(bearer(admin));
    expect(porStatus.body.data.map((u: { id: string }) => u.id)).toContain(alvo.usuario.id);
    expect(porStatus.body.data.every((u: { status: string }) => u.status === 'INATIVO')).toBe(true);

    const porBusca = await api().get('/api/admin/usuarios?busca=zelda%20listagem').set(bearer(admin));
    expect(porBusca.body.data).toHaveLength(1);
    expect(porBusca.body.meta).toMatchObject({ page: 1, totalItems: 1 });

    expect((await api().get('/api/admin/usuarios?limit=51').set(bearer(admin))).status).toBe(400); // máximo de 50 por página

    const pagina = await api().get('/api/admin/usuarios?limit=2&page=1').set(bearer(admin));
    expect(pagina.body.data.length).toBeLessThanOrEqual(2);
    expect(pagina.body.meta.limit).toBe(2);
  });
});
