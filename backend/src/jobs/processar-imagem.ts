import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { prisma } from '../config/prisma';
import { invalidarCatalogo } from '../shared/cache';
import { gravarArquivo, lerArquivo, removerArquivo } from '../shared/upload';

/** Onde a foto está sendo usada */
export type AlvoImagem = { tipo: 'produto'; produtoId: string } | { tipo: 'artesao'; artesaoId: string; campo: 'fotoPerfilUrl' | 'fotoAtelieUrl' };
export type PayloadImagem = { url: string; pasta: string; alvo: AlvoImagem };

export const LADO_MAXIMO = 1600;

/**
 * Converte a foto original para WebP de no máximo 1600 px, corrigindo a rotação da câmera e
 * removendo os metadados EXIF (inclusive a localização GPS de quem tirou a foto).
 */
export const otimizar = (original: Buffer) =>
  sharp(original).rotate().resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();

async function aindaEmUso(p: PayloadImagem) {
  if (p.alvo.tipo === 'produto') {
    const produto = await prisma.produto.findUnique({ where: { id: p.alvo.produtoId }, select: { imagensUrls: true } });
    return Boolean(produto?.imagensUrls.includes(p.url));
  }
  return (await prisma.artesao.count({ where: { id: p.alvo.artesaoId, [p.alvo.campo]: p.url } })) > 0;
}

/** Troca a URL original pela otimizada, só se a original ainda estiver lá (operação atômica no banco) */
async function trocarUrl(p: PayloadImagem, novaUrl: string): Promise<boolean> {
  if (p.alvo.tipo === 'produto') {
    const n = await prisma.$executeRaw`
      UPDATE "Produto" SET "imagensUrls" = array_replace("imagensUrls", ${p.url}, ${novaUrl})
      WHERE "id" = ${p.alvo.produtoId} AND ${p.url} = ANY("imagensUrls")`;
    return n > 0;
  }
  const r = await prisma.artesao.updateMany({ where: { id: p.alvo.artesaoId, [p.alvo.campo]: p.url }, data: { [p.alvo.campo]: novaUrl } });
  return r.count > 0;
}

/**
 * Consumidor do evento IMAGEM_ENVIADA (fila). IDEMPOTENTE: se a URL original já foi trocada
 * (retry da fila) ou a foto foi removida/substituída nesse meio-tempo, não faz nada.
 */
export async function processarImagem(p: PayloadImagem): Promise<{ processada: boolean; url?: string; bytesAntes?: number; bytesDepois?: number }> {
  if (!(await aindaEmUso(p))) return { processada: false };

  const original = await lerArquivo(p.url);
  const otimizada = await otimizar(original);
  const novaUrl = await gravarArquivo(p.pasta, `${randomUUID()}.webp`, otimizada, 'image/webp');

  if (!(await trocarUrl(p, novaUrl))) {
    await removerArquivo(novaUrl); // a foto mudou enquanto processávamos: descarta a versão nova
    return { processada: false };
  }
  await removerArquivo(p.url);
  await invalidarCatalogo();
  return { processada: true, url: novaUrl, bytesAntes: original.length, bytesDepois: otimizada.length };
}
