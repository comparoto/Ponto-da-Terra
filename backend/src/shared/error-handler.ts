import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { fail } from './api-result';
import { AppError } from './errors';
import { isTest } from '../config/env';

export const rotaNaoEncontrada: RequestHandler = (req, res) => {
  res.status(404).json(fail(`Rota não encontrada: ${req.method} ${req.path}`));
};

export const tratarErros: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json(fail(err.message, err.errors));
  }

  // JSON malformado no corpo da requisição
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json(fail('JSON inválido no corpo da requisição'));
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json(fail('Corpo da requisição muito grande'));
  }

  if (err instanceof multer.MulterError) {
    const mensagem = err.code === 'LIMIT_FILE_SIZE' ? 'A imagem deve ter no máximo 5 MB' : `Falha no upload: ${err.message}`;
    return res.status(400).json(fail(mensagem, [{ campo: err.field ?? 'arquivo', mensagem }]));
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json(fail('Registro duplicado'));
    if (err.code === 'P2025') return res.status(404).json(fail('Recurso não encontrado'));
    if (err.code === 'P2003') return res.status(409).json(fail('Operação viola um relacionamento existente'));
  }

  // Erros HTTP de bibliotecas (ex.: 404 do express.static em /uploads)
  const status = typeof err?.status === 'number' ? err.status : typeof err?.statusCode === 'number' ? err.statusCode : 500;
  if (status >= 400 && status < 500) {
    return res.status(status).json(fail(status === 404 ? 'Recurso não encontrado' : 'Requisição inválida'));
  }

  if (!isTest) console.error(err);
  return res.status(500).json(fail('Erro interno'));
};
