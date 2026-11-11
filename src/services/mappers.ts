/**
 * Conversão dos formatos da API para os tipos que o frontend já usava (Peca, Artesao).
 * Assim os componentes continuam lendo `peca.nome`, `peca.imagemUrl`, `artesao.imagemUrl`, etc.
 */
import type { Artesao, Peca, StatusProduto } from '@/types';
import { urlImagem } from './http';

export type ProdutoApi = {
  id: string;
  titulo: string;
  descricao: string | null;
  tecnica: string;
  poloOrigem: string;
  preco: number;
  materiaisUtilizados: string | null;
  dimensoes: string | null;
  imagensUrls: string[];
  estoque: number;
  emEstoque: boolean;
  categoria: { id: string; nome: string } | null;
  artesao: { id: string; nome: string; cidade: string; estado: string };
  status?: StatusProduto;
  justificativaCuradoria?: string | null;
};

export type ArtesaoApi = {
  id: string;
  nome: string;
  nomeAtelie: string | null;
  biografia: string | null;
  especialidade: string | null;
  tecnicasPrincipais: string[];
  poloRegional: string | null;
  cidade: string;
  estado: string;
  fotoPerfilUrl: string | null;
  fotoAtelieUrl: string | null;
  aceitaEncomenda: boolean;
  avaliacaoMedia: number;
  cepOrigem?: string | null;
};

export const produtoParaPeca = (p: ProdutoApi): Peca => ({
  id: p.id,
  nome: p.titulo,
  preco: p.preco,
  imagemUrl: urlImagem(p.imagensUrls[0]),
  imagensUrls: p.imagensUrls.map(urlImagem),
  categoria: p.categoria?.nome,
  categoriaId: p.categoria?.id,
  artesaoId: p.artesao.id,
  artesaoNome: p.artesao.nome,
  artesaoCidade: `${p.artesao.cidade} - ${p.artesao.estado}`,
  descricao: p.descricao ?? undefined,
  dimensoes: p.dimensoes ?? undefined,
  material: p.materiaisUtilizados ?? undefined,
  tecnica: p.tecnica,
  poloOrigem: p.poloOrigem,
  estoque: p.estoque,
  emEstoque: p.emEstoque,
  status: p.status,
  justificativaCuradoria: p.justificativaCuradoria ?? undefined,
});

export const artesaoParaFront = (a: ArtesaoApi): Artesao => ({
  id: a.id,
  nome: a.nome,
  cidade: a.cidade,
  estado: a.estado,
  imagemUrl: urlImagem(a.fotoPerfilUrl),
  biografia: a.biografia ?? undefined,
  especialidade: a.especialidade ?? undefined,
  nomeAtelie: a.nomeAtelie ?? undefined,
  poloRegional: a.poloRegional ?? undefined,
  fotoAtelieUrl: urlImagem(a.fotoAtelieUrl) || undefined,
  tecnicasPrincipais: a.tecnicasPrincipais,
});
