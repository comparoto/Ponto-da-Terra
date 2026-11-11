import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import multer from 'multer';
import { put } from '@vercel/blob';
import { env } from '../config/env';
import { badRequest } from './errors';

/**
 * Upload de imagens (HU7, TC10): somente JPG/PNG de até 5 MB.
 *
 * O arquivo fica em memória até ser validado. Assim, um arquivo recusado (GIF, > 5 MB,
 * extensão falsa) NUNCA chega ao storage. O tipo é conferido pelos "magic bytes" do
 * conteúdo, e não pelo nome ou pelo Content-Type enviados pelo cliente, que podem ser forjados.
 *
 * Storage (Strategy): com BLOB_READ_WRITE_TOKEN (Vercel), as imagens vão para o Vercel Blob;
 * sem ele, para o disco local (pasta UPLOAD_DIR, servida em /uploads).
 */
export const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;
const MENSAGEM_FORMATO = 'Formato não suportado. Envie uma imagem JPG ou PNG de até 5 MB';

export const uploadImagem = (campo: string) =>
  multer({ storage: multer.memoryStorage(), limits: { fileSize: TAMANHO_MAXIMO_IMAGEM, files: 1 } }).single(campo);

type FormatoImagem = { ext: 'jpg' | 'png'; mime: string };

export function detectarFormato(buffer: Buffer): FormatoImagem | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buffer.length >= 8 && png.every((b, i) => buffer[i] === b)) return { ext: 'png', mime: 'image/png' };
  return null;
}

/** Valida o arquivo recebido pelo multer e o persiste. Retorna a URL pública. */
export async function salvarImagem(arquivo: Express.Multer.File | undefined, campo: string, pasta: string): Promise<string> {
  if (!arquivo) throw badRequest('Nenhuma imagem enviada', [{ campo, mensagem: 'Envie um arquivo de imagem' }]);
  const formato = detectarFormato(arquivo.buffer);
  if (!formato) throw badRequest(MENSAGEM_FORMATO, [{ campo, mensagem: MENSAGEM_FORMATO }]);

  const nomeArquivo = `${randomUUID()}.${formato.ext}`;

  // Vercel: funções serverless não têm disco persistente → Vercel Blob
  if (env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${pasta}/${nomeArquivo}`, arquivo.buffer, { access: 'public', contentType: formato.mime, token: env.BLOB_READ_WRITE_TOKEN });
    return blob.url;
  }

  const diretorio = resolve(env.UPLOAD_DIR, pasta);
  await mkdir(diretorio, { recursive: true });
  await writeFile(join(diretorio, nomeArquivo), arquivo.buffer);

  return `${env.PUBLIC_URL ?? ''}/uploads/${pasta}/${nomeArquivo}`;
}
