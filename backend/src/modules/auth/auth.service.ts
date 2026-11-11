import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { type Prisma, StatusUsuario, TipoUsuario } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { assinarToken } from '../../shared/auth';
import { invalidarCatalogo } from '../../shared/cache';
import { env } from '../../config/env';
import { enviarEmail, urlDoSite } from '../../shared/email';
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../../shared/errors';
import type { z } from '../../shared/zod';
import type { alterarSenhaBody, atualizarMeBody, cadastroBody, esqueciSenhaBody, loginBody, redefinirSenhaBody } from './auth.schemas';

const hashDoToken = (token: string) => createHash('sha256').update(token).digest('hex');

const selecaoPerfil = {
  id: true,
  nome: true,
  email: true,
  telefone: true,
  tipo: true,
  status: true,
  tokenVersion: true,
  dataCadastro: true,
  termosAceitosEm: true,
  consumidor: { select: { id: true } },
  artesao: { select: { id: true, statusCadastro: true, motivoCadastro: true } },
} satisfies Prisma.UsuarioSelect;

type UsuarioSelecionado = Prisma.UsuarioGetPayload<{ select: typeof selecaoPerfil }>;

const perfil = (u: UsuarioSelecionado) => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  telefone: u.telefone,
  tipo: u.tipo,
  status: u.status,
  consumidorId: u.consumidor?.id ?? null,
  artesaoId: u.artesao?.id ?? null,
  termosAceitosEm: u.termosAceitosEm,
  cadastroArtesao: u.artesao ? { status: u.artesao.statusCadastro, motivo: u.artesao.motivoCadastro } : null,
  dataCadastro: u.dataCadastro,
});

export const authService = {
  async cadastrar(dados: z.infer<typeof cadastroBody>) {
    const existente = await prisma.usuario.findUnique({ where: { email: dados.email }, select: { id: true } });
    if (existente) throw conflict('E-mail já cadastrado');

    const senhaHash = await bcrypt.hash(dados.senha, 10);
    const usuario = await prisma.usuario.create({
      data: {
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone,
        senhaHash,
        termosAceitosEm: dados.aceiteTermos ? new Date() : undefined,
        tipo: dados.tipo === 'ARTESAO' ? TipoUsuario.ARTESAO : TipoUsuario.CONSUMIDOR,
        ...(dados.tipo === 'ARTESAO'
          ? {
              artesao: {
                create: {
                  cidade: dados.cidade!,
                  estado: dados.estado!,
                  especialidade: dados.especialidade,
                  tecnicasPrincipais: dados.especialidade ? [dados.especialidade] : [],
                },
              },
            }
          : { consumidor: { create: {} } }),
      },
      select: selecaoPerfil,
    });

    return { token: assinarToken(usuario), usuario: perfil(usuario) };
  },

  async login({ email, senha, aceiteTermos }: z.infer<typeof loginBody>) {
    let usuario = await prisma.usuario.findUnique({ where: { email }, select: { ...selecaoPerfil, senhaHash: true, motivoSuspensao: true } });
    // Mesma mensagem para e-mail inexistente e senha errada (não revela quais e-mails existem)
    if (!usuario || !(await bcrypt.compare(senha, usuario.senhaHash))) throw unauthorized('E-mail ou senha inválidos');
    if (usuario.status === StatusUsuario.SUSPENSO) throw forbidden('Conta suspensa');
    if (usuario.status === StatusUsuario.INATIVO) throw forbidden('Conta inativa');

    // Registra (ou renova) o aceite dos Termos feito na tela de login
    if (aceiteTermos) {
      usuario = await prisma.usuario.update({ where: { id: usuario.id }, data: { termosAceitosEm: new Date() }, select: { ...selecaoPerfil, senhaHash: true, motivoSuspensao: true } });
    }

    return { token: assinarToken(usuario), usuario: perfil(usuario) };
  },

  /** Invalida TODOS os tokens já emitidos para o usuário (tokenVersion++). */
  async logout(usuarioId: string) {
    await prisma.usuario.update({ where: { id: usuarioId }, data: { tokenVersion: { increment: 1 } } });
  },

  async perfil(usuarioId: string) {
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: selecaoPerfil });
    if (!usuario) throw notFound('Usuário não encontrado');
    return perfil(usuario);
  },

  async atualizar(usuarioId: string, dados: z.infer<typeof atualizarMeBody>) {
    const usuario = await prisma.usuario.update({ where: { id: usuarioId }, data: dados, select: selecaoPerfil });
    return perfil(usuario);
  },

  /**
   * Troca a senha de quem está logado. Invalida as outras sessões (tokenVersion++) e devolve
   * um token novo, para a pessoa continuar logada neste aparelho.
   */
  async alterarSenha(usuarioId: string, { senhaAtual, novaSenha }: z.infer<typeof alterarSenhaBody>) {
    const atual = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { senhaHash: true } });
    if (!atual) throw notFound('Usuário não encontrado');
    if (!(await bcrypt.compare(senhaAtual, atual.senhaHash))) throw badRequest('Senha atual incorreta', [{ campo: 'senhaAtual', mensagem: 'Senha atual incorreta' }]);
    const usuario = await prisma.usuario.update({
      where: { id: usuarioId },
      data: { senhaHash: await bcrypt.hash(novaSenha, 10), tokenVersion: { increment: 1 } },
      select: selecaoPerfil,
    });
    await enviarEmail({
      para: usuario.email,
      assunto: 'Sua senha foi alterada',
      titulo: 'Sua senha foi alterada',
      paragrafos: [`Olá, ${usuario.nome}. A senha da sua conta acabou de ser trocada.`, 'Se não foi você, use "Esqueci minha senha" na tela de login e fale com a gente.'],
    }).catch(e => console.error('[e-mail] falha ao avisar troca de senha', e));
    return { token: assinarToken(usuario), usuario: perfil(usuario) };
  },

  /**
   * "Esqueci minha senha": gera um link de uso único (válido por REDEFINIR_SENHA_MINUTOS) e envia
   * por e-mail. Responde igual exista ou não a conta, para não revelar quais e-mails estão cadastrados.
   */
  async esqueciSenha({ email }: z.infer<typeof esqueciSenhaBody>) {
    const usuario = await prisma.usuario.findUnique({ where: { email }, select: { id: true, nome: true, email: true, status: true } });
    if (!usuario || usuario.status !== StatusUsuario.ATIVO) return;

    const token = randomBytes(32).toString('base64url');
    await prisma.$transaction([
      // Um pedido novo anula os links anteriores ainda não usados
      prisma.tokenRedefinicaoSenha.updateMany({ where: { usuarioId: usuario.id, usadoEm: null }, data: { usadoEm: new Date() } }),
      prisma.tokenRedefinicaoSenha.create({
        data: { usuarioId: usuario.id, tokenHash: hashDoToken(token), expiraEm: new Date(Date.now() + env.REDEFINIR_SENHA_MINUTOS * 60_000) },
      }),
    ]);
    await enviarEmail({
      para: usuario.email,
      assunto: 'Redefinição de senha',
      titulo: 'Vamos criar uma nova senha',
      paragrafos: [
        `Olá, ${usuario.nome}. Recebemos um pedido para redefinir a senha da sua conta no Ponto da Terra.`,
        `O link abaixo vale por ${env.REDEFINIR_SENHA_MINUTOS} minutos e só pode ser usado uma vez.`,
        'Se você não pediu, ignore este e-mail: sua senha continua a mesma.',
      ],
      botao: { texto: 'Criar nova senha', url: urlDoSite(`/redefinir-senha?token=${token}`) },
    }).catch(e => console.error('[e-mail] falha ao enviar link de redefinição', e));
  },

  /** Conclui a redefinição com o token do e-mail; derruba todas as sessões abertas. */
  async redefinirSenha({ token, novaSenha }: z.infer<typeof redefinirSenhaBody>) {
    const invalido = 'Link inválido ou expirado. Peça um novo em "Esqueci minha senha".';
    const registro = await prisma.tokenRedefinicaoSenha.findUnique({ where: { tokenHash: hashDoToken(token) } });
    if (!registro || registro.usadoEm || registro.expiraEm < new Date()) throw badRequest(invalido);
    // Marca como usado só se ninguém usou antes (dois cliques ao mesmo tempo não redefinem duas vezes)
    const marcado = await prisma.tokenRedefinicaoSenha.updateMany({ where: { id: registro.id, usadoEm: null }, data: { usadoEm: new Date() } });
    if (marcado.count === 0) throw badRequest(invalido);
    await prisma.usuario.update({
      where: { id: registro.usuarioId },
      data: { senhaHash: await bcrypt.hash(novaSenha, 10), tokenVersion: { increment: 1 } },
    });
  },

  /**
   * Exclui a conta (e, em cascata, perfil, carrinho, peças do artesão etc.).
   * Contas com pedidos vinculados não podem ser apagadas, para preservar o histórico de vendas.
   */
  async excluir(usuarioId: string) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        tipo: true,
        consumidor: { select: { _count: { select: { pedidos: true, compras: true } } } },
        artesao: { select: { id: true, _count: { select: { pedidos: true, itensVendidos: true } } } },
      },
    });
    if (!usuario) throw notFound('Usuário não encontrado');
    if (usuario.tipo === TipoUsuario.ADMIN) throw forbidden('Contas de administrador não podem ser excluídas por aqui');

    const pedidos =
      (usuario.consumidor?._count.pedidos ?? 0) +
      (usuario.consumidor?._count.compras ?? 0) +
      (usuario.artesao?._count.pedidos ?? 0) +
      (usuario.artesao?._count.itensVendidos ?? 0);
    if (pedidos > 0) throw conflict('A conta possui pedidos vinculados e não pode ser excluída');

    await prisma.usuario.delete({ where: { id: usuarioId } });
    if (usuario.artesao) await invalidarCatalogo(); // as peças do artesão saem da vitrine
  },
};
