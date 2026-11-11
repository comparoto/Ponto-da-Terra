import { Router } from 'express';
import { documentar } from '../../docs/registry';
import { ok } from '../../shared/api-result';
import { autenticar } from '../../shared/auth';
import { limitarPedidosDeSenha, limitarTentativasDeLogin } from '../../shared/rate-limit';
import { validate } from '../../shared/validate';
import { z } from '../../shared/zod';
import { alterarSenhaBody, atualizarMeBody, cadastroBody, esqueciSenhaBody, loginBody, perfilUsuario, redefinirSenhaBody, sessao } from './auth.schemas';
import { authService } from './auth.service';

export const authRoutes = Router();

documentar({
  method: 'post',
  path: '/api/auth/cadastro',
  tags: ['Autenticação'],
  summary: 'Cadastra um comprador ou artesão',
  description: 'Artesão exige cidade, UF e especialidade (RN06). Retorna o token JWT já autenticado.',
  request: { body: { content: { 'application/json': { schema: cadastroBody } } } },
  sucesso: { status: 201, descricao: 'Conta criada', data: sessao },
  falhas: [400, 409],
});
authRoutes.post('/auth/cadastro', validate({ body: cadastroBody }), async (req, res) => {
  res.status(201).json(ok(await authService.cadastrar(req.valid!.body)));
});

documentar({
  method: 'post',
  path: '/api/auth/login',
  tags: ['Autenticação'],
  summary: 'Autentica e retorna um JWT',
  request: { body: { content: { 'application/json': { schema: loginBody } } } },
  description: 'Após 10 tentativas erradas em 15 minutos (mesmo IP e e-mail), responde 429 até a janela expirar.',
  sucesso: { status: 200, descricao: 'Autenticado', data: sessao },
  falhas: [400, 401, 403, 429],
});
authRoutes.post('/auth/login', limitarTentativasDeLogin, validate({ body: loginBody }), async (req, res) => {
  res.json(ok(await authService.login(req.valid!.body)));
});

documentar({
  method: 'post',
  path: '/api/auth/logout',
  tags: ['Autenticação'],
  summary: 'Encerra a sessão (invalida todos os tokens emitidos para o usuário)',
  autenticado: true,
  sucesso: { status: 200, descricao: 'Sessão encerrada', data: z.null() },
  falhas: [401],
});
authRoutes.post('/auth/logout', autenticar, async (req, res) => {
  await authService.logout(req.user!.id);
  res.json(ok(null));
});

documentar({
  method: 'get',
  path: '/api/me',
  tags: ['Autenticação'],
  summary: 'Perfil do usuário autenticado',
  autenticado: true,
  sucesso: { status: 200, descricao: 'Perfil', data: perfilUsuario },
  falhas: [401],
});
authRoutes.get('/me', autenticar, async (req, res) => {
  res.json(ok(await authService.perfil(req.user!.id)));
});

documentar({
  method: 'put',
  path: '/api/me',
  tags: ['Autenticação'],
  summary: 'Atualiza nome e telefone',
  autenticado: true,
  request: { body: { content: { 'application/json': { schema: atualizarMeBody } } } },
  sucesso: { status: 200, descricao: 'Perfil atualizado', data: perfilUsuario },
  falhas: [400, 401],
});
authRoutes.put('/me', autenticar, validate({ body: atualizarMeBody }), async (req, res) => {
  res.json(ok(await authService.atualizar(req.user!.id, req.valid!.body)));
});

documentar({
  method: 'put',
  path: '/api/me/senha',
  tags: ['Autenticação'],
  summary: 'Troca a senha (exige a senha atual)',
  description: 'Encerra as outras sessões e devolve um token novo para este aparelho. Envia um e-mail avisando da troca.',
  autenticado: true,
  request: { body: { content: { 'application/json': { schema: alterarSenhaBody } } } },
  sucesso: { status: 200, descricao: 'Senha alterada', data: sessao },
  falhas: [400, 401],
});
authRoutes.put('/me/senha', autenticar, validate({ body: alterarSenhaBody }), async (req, res) => {
  res.json(ok(await authService.alterarSenha(req.user!.id, req.valid!.body)));
});

documentar({
  method: 'post',
  path: '/api/auth/esqueci-senha',
  tags: ['Autenticação'],
  summary: 'Envia por e-mail um link para criar uma nova senha',
  description: 'Sempre responde 200, exista ou não a conta (não revela e-mails cadastrados). Limite de 5 pedidos a cada 15 minutos por IP.',
  request: { body: { content: { 'application/json': { schema: esqueciSenhaBody } } } },
  sucesso: { status: 200, descricao: 'Pedido registrado', data: z.object({ mensagem: z.string() }) },
  falhas: [400, 429],
});
authRoutes.post('/auth/esqueci-senha', limitarPedidosDeSenha, validate({ body: esqueciSenhaBody }), async (req, res) => {
  await authService.esqueciSenha(req.valid!.body);
  res.json(ok({ mensagem: 'Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha.' }));
});

documentar({
  method: 'post',
  path: '/api/auth/redefinir-senha',
  tags: ['Autenticação'],
  summary: 'Cria a nova senha com o link recebido por e-mail',
  description: 'O link vale por 60 minutos e só pode ser usado uma vez. Todas as sessões abertas são encerradas.',
  request: { body: { content: { 'application/json': { schema: redefinirSenhaBody } } } },
  sucesso: { status: 200, descricao: 'Senha redefinida', data: z.null() },
  falhas: [400, 429],
});
authRoutes.post('/auth/redefinir-senha', limitarPedidosDeSenha, validate({ body: redefinirSenhaBody }), async (req, res) => {
  await authService.redefinirSenha(req.valid!.body);
  res.json(ok(null));
});

documentar({
  method: 'delete',
  path: '/api/me',
  tags: ['Autenticação'],
  summary: 'Exclui a própria conta (bloqueado se houver pedidos vinculados)',
  autenticado: true,
  sucesso: { status: 200, descricao: 'Conta excluída', data: z.null() },
  falhas: [401, 403, 409],
});
authRoutes.delete('/me', autenticar, async (req, res) => {
  await authService.excluir(req.user!.id);
  res.json(ok(null));
});
