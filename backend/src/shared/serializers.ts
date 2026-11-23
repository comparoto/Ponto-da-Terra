import type { Prisma } from '@prisma/client';

/** Prisma devolve Decimal; a API expõe número com 2 casas. */
export const dinheiro = (v: Prisma.Decimal | number): number => Math.round(Number(v) * 100) / 100;

// ───────────── Artesão ─────────────

export const incluirArtesaoComNome = { usuario: { select: { nome: true } } } satisfies Prisma.ArtesaoInclude;
type ArtesaoComNome = Prisma.ArtesaoGetPayload<{ include: typeof incluirArtesaoComNome }>;

export const artesaoPublico = (a: ArtesaoComNome) => ({
  id: a.id,
  nome: a.usuario.nome,
  nomeAtelie: a.nomeAtelie,
  biografia: a.biografia,
  especialidade: a.especialidade,
  tecnicasPrincipais: a.tecnicasPrincipais,
  poloRegional: a.poloRegional,
  cidade: a.cidade,
  estado: a.estado,
  fotoPerfilUrl: a.fotoPerfilUrl,
  fotoAtelieUrl: a.fotoAtelieUrl,
  aceitaEncomenda: a.aceitaEncomenda,
  avaliacaoMedia: a.avaliacaoMedia,
});

// ───────────── Produto ─────────────

export const incluirProduto = {
  estoque: { select: { quantidadeDisponivel: true } },
  categoria: { select: { id: true, nome: true } },
  artesao: { select: { id: true, cidade: true, estado: true, usuario: { select: { nome: true } } } },
} satisfies Prisma.ProdutoInclude;

type ProdutoCompleto = Prisma.ProdutoGetPayload<{ include: typeof incluirProduto }>;

/** Visão pública (vitrine). */
export const produtoPublico = (p: ProdutoCompleto) => {
  const estoque = p.estoque?.quantidadeDisponivel ?? 0;
  return {
    id: p.id,
    titulo: p.titulo,
    descricao: p.descricao,
    tecnica: p.tecnica,
    poloOrigem: p.poloOrigem,
    preco: dinheiro(p.preco),
    materiaisUtilizados: p.materiaisUtilizados,
    dimensoes: p.dimensoes,
    prontaEntrega: p.prontaEntrega,
    tempoProducaoDias: p.tempoProducaoDias,
    imagensUrls: p.imagensUrls,
    avaliacaoMedia: p.avaliacaoMedia,
    estoque,
    emEstoque: estoque > 0,
    categoria: p.categoria,
    artesao: { id: p.artesao.id, nome: p.artesao.usuario.nome, cidade: p.artesao.cidade, estado: p.artesao.estado },
    criadoEm: p.criadoEm,
  };
};

/** Visão do dono/admin: inclui status de curadoria. */
export const produtoGestao = (p: ProdutoCompleto) => ({
  ...produtoPublico(p),
  status: p.status,
  justificativaCuradoria: p.justificativaCuradoria,
  atualizadoEm: p.atualizadoEm,
});
