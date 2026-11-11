import { Prisma, StatusCadastroArtesao, StatusProduto, StatusUsuario, TipoEvento, TipoUsuario } from '@prisma/client';
import { registrarEvento } from '../../shared/eventos';
import { prisma } from '../../config/prisma';
import { comCache, invalidarCatalogo } from '../../shared/cache';
import { badRequest, conflict, forbidden, notFound } from '../../shared/errors';
import { metaPaginacao, paginar } from '../../shared/pagination';
import { incluirProduto, produtoGestao, produtoPublico } from '../../shared/serializers';
import type { UsuarioAutenticado } from '../../types/express';
import { registrarBusca } from '../relatorios/relatorios.service';
import type { z } from '../../shared/zod';
import type { atualizarProdutoBody, criarProdutoBody, meusProdutosQuery, vitrineQuery } from './produtos.schemas';

const insensivel = (valor: string) => ({ equals: valor, mode: Prisma.QueryMode.insensitive });
const contem = (valor: string) => ({ contains: valor, mode: Prisma.QueryMode.insensitive });

/** Regra de visibilidade da vitrine (HU8/HU16): só peças ATIVAS de artesãos APROVADOS e com conta ATIVA. */
export const visivelNaVitrine: Prisma.ProdutoWhereInput = {
  status: StatusProduto.ATIVO,
  artesao: { statusCadastro: StatusCadastroArtesao.APROVADO, usuario: { status: StatusUsuario.ATIVO } },
};

const ORDEM: Record<z.infer<typeof vitrineQuery>['ordenacao'], Prisma.ProdutoOrderByWithRelationInput[]> = {
  recentes: [{ criadoEm: 'desc' }, { id: 'asc' }],
  'preco-asc': [{ preco: 'asc' }, { id: 'asc' }],
  'preco-desc': [{ preco: 'desc' }, { id: 'asc' }],
  nome: [{ titulo: 'asc' }, { id: 'asc' }],
};

async function validarCategoria(categoriaId?: string) {
  if (!categoriaId) return;
  const existe = await prisma.categoriaProduto.findUnique({ where: { id: categoriaId }, select: { id: true } });
  if (!existe) throw badRequest('Dados inválidos', [{ campo: 'categoriaId', mensagem: 'Categoria não encontrada' }]);
}

async function produtoDoArtesao(artesaoId: string, produtoId: string) {
  const produto = await prisma.produto.findUnique({ where: { id: produtoId }, select: { id: true, artesaoId: true, status: true } });
  if (!produto) throw notFound('Produto não encontrado');
  if (produto.artesaoId !== artesaoId) throw forbidden('Este produto pertence a outro artesão');
  return produto;
}

export const produtosService = {
  /** Vitrine pública com filtros combináveis (HU2), paginação (TC06) e cache (Notion). */
  async vitrine(filtros: z.infer<typeof vitrineQuery>) {
    if (filtros.busca && filtros.page === 1) registrarBusca(filtros.busca); // "peças mais buscadas" (HU9)
    const { valor, hit } = await comCache('vitrine', filtros, async () => {
      const where: Prisma.ProdutoWhereInput = {
        ...visivelNaVitrine,
        ...(filtros.categoria && filtros.categoria !== 'Todas' ? { categoria: { nome: insensivel(filtros.categoria) } } : {}),
        ...(filtros.tecnica ? { tecnica: insensivel(filtros.tecnica) } : {}),
        ...(filtros.polo ? { poloOrigem: insensivel(filtros.polo) } : {}),
        ...(filtros.artesaoId ? { artesaoId: filtros.artesaoId } : {}),
        ...(filtros.precoMin !== undefined || filtros.precoMax !== undefined
          ? { preco: { gte: filtros.precoMin, lte: filtros.precoMax } }
          : {}),
        ...(filtros.busca
          ? {
              OR: [
                { titulo: contem(filtros.busca) },
                { descricao: contem(filtros.busca) },
                { tecnica: contem(filtros.busca) },
                { poloOrigem: contem(filtros.busca) },
                { artesao: { cidade: contem(filtros.busca) } },
                { artesao: { usuario: { nome: contem(filtros.busca) } } },
              ],
            }
          : {}),
      };

      const [total, itens] = await prisma.$transaction([
        prisma.produto.count({ where }),
        prisma.produto.findMany({
          where,
          include: incluirProduto,
          orderBy: ORDEM[filtros.ordenacao],
          ...paginar(filtros.page, filtros.limit),
        }),
      ]);
      return { itens: itens.map(produtoPublico), meta: metaPaginacao(filtros.page, filtros.limit, total) };
    });
    return { ...valor, cacheHit: hit };
  },

  async detalhePublico(id: string) {
    const produto = await prisma.produto.findFirst({ where: { id, ...visivelNaVitrine }, include: incluirProduto });
    if (!produto) throw notFound('Produto não encontrado');
    return produtoPublico(produto);
  },

  async categorias() {
    const { valor } = await comCache('categorias', {}, () =>
      prisma.categoriaProduto.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
    );
    return valor;
  },

  async doArtesao(artesaoId: string, filtros: z.infer<typeof meusProdutosQuery>) {
    const where: Prisma.ProdutoWhereInput = { artesaoId, ...(filtros.status ? { status: filtros.status } : {}) };
    const [total, itens] = await prisma.$transaction([
      prisma.produto.count({ where }),
      prisma.produto.findMany({ where, include: incluirProduto, orderBy: { criadoEm: 'desc' }, ...paginar(filtros.page, filtros.limit) }),
    ]);
    return { itens: itens.map(produtoGestao), meta: metaPaginacao(filtros.page, filtros.limit, total) };
  },

  async detalheGestao(usuario: UsuarioAutenticado, id: string) {
    const produto = await prisma.produto.findUnique({ where: { id }, include: incluirProduto });
    if (!produto) throw notFound('Produto não encontrado');
    if (usuario.tipo !== TipoUsuario.ADMIN && produto.artesaoId !== usuario.artesaoId) throw forbidden('Este produto pertence a outro artesão');
    return produtoGestao(produto);
  },

  /** HU1: toda peça nova entra como PENDENTE e só aparece na vitrine após a curadoria (HU8). */
  async criar(artesaoId: string, { estoque, ...dados }: z.infer<typeof criarProdutoBody>) {
    await validarCategoria(dados.categoriaId);
    const produto = await prisma.produto.create({
      data: {
        ...dados,
        artesaoId,
        status: StatusProduto.PENDENTE,
        estoque: { create: { quantidadeDisponivel: estoque } },
      },
      include: incluirProduto,
    });
    return produtoGestao(produto);
  },

  /** Editar dados curados devolve a peça para a fila de curadoria. */
  async atualizar(artesaoId: string, id: string, dados: z.infer<typeof atualizarProdutoBody>) {
    const atual = await produtoDoArtesao(artesaoId, id);
    await validarCategoria(dados.categoriaId);
    const produto = await prisma.produto.update({
      where: { id },
      data: { ...dados, status: StatusProduto.PENDENTE, justificativaCuradoria: null },
      include: incluirProduto,
    });
    if (atual.status === StatusProduto.ATIVO) await invalidarCatalogo();
    return produtoGestao(produto);
  },

  /** Ajuste de estoque pelo artesão (UC "Gerenciar estoque"). Não passa por curadoria. */
  async ajustarEstoque(artesaoId: string, id: string, quantidade: number) {
    await produtoDoArtesao(artesaoId, id);
    await prisma.estoque.upsert({
      where: { produtoId: id },
      create: { produtoId: id, quantidadeDisponivel: quantidade },
      update: { quantidadeDisponivel: quantidade, versao: { increment: 1 } },
    });
    await invalidarCatalogo();
    const produto = await prisma.produto.findUniqueOrThrow({ where: { id }, include: incluirProduto });
    return produtoGestao(produto);
  },

  /** Adiciona uma foto à peça; com `substituir`, ela passa a ser a única foto (troca da foto principal). */
  async adicionarImagem(artesaoId: string, id: string, url: string, substituir = false) {
    const atual = await produtoDoArtesao(artesaoId, id);
    const produto = await prisma.$transaction(async tx => {
      const atualizado = await tx.produto.update({
        where: { id },
        // Fotos fazem parte da curadoria (TC04: "falta nitidez nas fotos") → volta para PENDENTE
        data: {
          imagensUrls: substituir ? { set: [url] } : { push: url },
          status: StatusProduto.PENDENTE,
          justificativaCuradoria: null,
        },
        include: incluirProduto,
      });
      // A fila gera a versão otimizada da foto (WebP, até 1600 px, sem EXIF)
      await registrarEvento(tx, TipoEvento.IMAGEM_ENVIADA, { url, pasta: 'produtos', alvo: { tipo: 'produto', produtoId: id } });
      return atualizado;
    });
    if (atual.status === StatusProduto.ATIVO) await invalidarCatalogo();
    return produtoGestao(produto);
  },

  async remover(usuario: UsuarioAutenticado, id: string) {
    const produto = await prisma.produto.findUnique({ where: { id }, select: { artesaoId: true, _count: { select: { itensPedido: true } } } });
    if (!produto) throw notFound('Produto não encontrado');
    if (usuario.tipo !== TipoUsuario.ADMIN && produto.artesaoId !== usuario.artesaoId) throw forbidden('Este produto pertence a outro artesão');
    if (produto._count.itensPedido > 0) throw conflict('Produto possui pedidos vinculados e não pode ser excluído');
    await prisma.produto.delete({ where: { id } });
    await invalidarCatalogo();
  },
};
