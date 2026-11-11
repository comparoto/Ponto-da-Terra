import bcrypt from 'bcryptjs';
import { type Prisma, StatusUsuario, TipoUsuario } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { assinarToken } from '../../shared/auth';
import { invalidarCatalogo } from '../../shared/cache';
import { conflict, forbidden, notFound, unauthorized } from '../../shared/errors';
import type { z } from '../../shared/zod';
import type { atualizarMeBody, cadastroBody, loginBody } from './auth.schemas';

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
