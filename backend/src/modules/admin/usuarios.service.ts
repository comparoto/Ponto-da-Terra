import { Prisma, StatusProduto, StatusUsuario, TipoUsuario } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { invalidarCatalogo } from '../../shared/cache';
import { badRequest, forbidden, notFound } from '../../shared/errors';
import { metaPaginacao, paginar } from '../../shared/pagination';

/**
 * Moderação de contas pelo administrador (HU16): listar, suspender, inativar e reativar.
 * As rotas só validam a entrada e devolvem a resposta; as regras de negócio ficam aqui.
 */

const incluirUsuario = {
  artesao: { select: { id: true, statusCadastro: true, _count: { select: { produtos: { where: { status: StatusProduto.ATIVO } } } } } },
} satisfies Prisma.UsuarioInclude;

const usuarioResposta = (u: Prisma.UsuarioGetPayload<{ include: typeof incluirUsuario }>) => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  tipo: u.tipo,
  status: u.status,
  motivoSuspensao: u.motivoSuspensao,
  dataCadastro: u.dataCadastro,
  artesaoId: u.artesao?.id ?? null,
  produtosAtivos: u.artesao?._count.produtos ?? 0,
  statusCadastro: u.artesao?.statusCadastro ?? null,
});

export type FiltroUsuarios = { tipo?: TipoUsuario; status?: StatusUsuario; busca?: string; page: number; limit: number };

/** Estados que bloqueiam o acesso. Cada um muda só o texto das mensagens de erro. */
type Restricao = Extract<StatusUsuario, 'SUSPENSO' | 'INATIVO'>;
const TEXTO: Record<Restricao, { plural: string; singular: string }> = {
  SUSPENSO: { plural: 'suspensas', singular: 'suspensa' },
  INATIVO: { plural: 'inativadas', singular: 'inativa' },
};

/**
 * Bloqueia o acesso de uma conta (suspensão ou inativação): mesmas regras, mesmo efeito.
 * tokenVersion++ invalida de imediato todos os tokens já emitidos, e a limpeza do cache tira
 * da vitrine as peças do artesão.
 */
async function restringirConta(id: string, novoStatus: Restricao, motivo: string | null) {
  const texto = TEXTO[novoStatus];
  const alvo = await prisma.usuario.findUnique({ where: { id }, select: { tipo: true, status: true } });
  if (!alvo) throw notFound('Usuário não encontrado');
  if (alvo.tipo === TipoUsuario.ADMIN) throw forbidden(`Contas de administrador não podem ser ${texto.plural} por aqui`);
  if (alvo.status === novoStatus) throw badRequest(`A conta já está ${texto.singular}`);

  const usuario = await prisma.usuario.update({
    where: { id },
    data: { status: novoStatus, motivoSuspensao: motivo, tokenVersion: { increment: 1 } },
    include: incluirUsuario,
  });
  await invalidarCatalogo();
  return usuarioResposta(usuario);
}

export const usuariosAdminService = {
  async listar({ tipo, status, busca, page, limit }: FiltroUsuarios) {
    const where: Prisma.UsuarioWhereInput = {
      ...(tipo ? { tipo } : {}),
      ...(status ? { status } : {}),
      ...(busca ? { OR: [{ nome: { contains: busca, mode: 'insensitive' } }, { email: { contains: busca, mode: 'insensitive' } }] } : {}),
    };
    const [total, itens] = await prisma.$transaction([
      prisma.usuario.count({ where }),
      prisma.usuario.findMany({ where, include: incluirUsuario, orderBy: { dataCadastro: 'desc' }, ...paginar(page, limit) }),
    ]);
    return { itens: itens.map(usuarioResposta), meta: metaPaginacao(page, limit, total) };
  },

  /** Suspensão é uma sanção: exige motivo formal (validado na rota). */
  suspender: (id: string, motivo: string) => restringirConta(id, StatusUsuario.SUSPENSO, motivo),

  /** Inativação não tem caráter punitivo: o motivo é opcional. */
  inativar: (id: string, motivo?: string) => restringirConta(id, StatusUsuario.INATIVO, motivo || null),

  /** Restabelece o acesso (de suspensa ou inativa). Não mexe nas sessões: quem estava bloqueado já não tem token válido. */
  async reativar(id: string) {
    const alvo = await prisma.usuario.findUnique({ where: { id }, select: { status: true } });
    if (!alvo) throw notFound('Usuário não encontrado');
    if (alvo.status === StatusUsuario.ATIVO) throw badRequest('A conta já está ativa');
    const usuario = await prisma.usuario.update({ where: { id }, data: { status: StatusUsuario.ATIVO, motivoSuspensao: null }, include: incluirUsuario });
    await invalidarCatalogo();
    return usuarioResposta(usuario);
  },
};
