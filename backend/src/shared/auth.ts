import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { StatusUsuario, type TipoUsuario } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { forbidden, unauthorized } from './errors';

type TokenPayload = { sub: string; tipo: TipoUsuario; tv: number };

export function assinarToken(usuario: { id: string; tipo: TipoUsuario; tokenVersion: number }): string {
  const payload: TokenPayload = { sub: usuario.id, tipo: usuario.tipo, tv: usuario.tokenVersion };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

/**
 * Exige um JWT válido em "Authorization: Bearer <token>".
 * - token ausente           → 401 "Autenticação necessária"
 * - token expirado          → 401 "Sessão expirada"            (TC07)
 * - token revogado (logout/suspensão incrementou tokenVersion) → 401 "Sessão expirada" (HU16)
 * - conta suspensa/inativa  → 403
 * A validação acontece antes de qualquer consulta de negócio ao banco.
 */
export const autenticar: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(unauthorized());

  let payload: TokenPayload;
  try {
    payload = jwt.verify(header.slice(7), env.JWT_SECRET) as unknown as TokenPayload;
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) return next(unauthorized('Sessão expirada'));
    return next(unauthorized('Token inválido'));
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      nome: true,
      email: true,
      tipo: true,
      status: true,
      tokenVersion: true,
      consumidor: { select: { id: true } },
      artesao: { select: { id: true } },
      administrador: { select: { id: true } },
    },
  });

  if (!usuario || usuario.tokenVersion !== payload.tv) return next(unauthorized('Sessão expirada'));
  if (usuario.status === StatusUsuario.SUSPENSO) return next(forbidden('Conta suspensa'));
  if (usuario.status === StatusUsuario.INATIVO) return next(forbidden('Conta inativa'));

  req.user = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    tipo: usuario.tipo,
    consumidorId: usuario.consumidor?.id ?? null,
    artesaoId: usuario.artesao?.id ?? null,
    administradorId: usuario.administrador?.id ?? null,
  };
  next();
};

/**
 * Restringe a rota a determinados perfis. Perfil diferente → 403 (TC01).
 * Deve ser usado depois de `autenticar`.
 */
export const autorizar =
  (...tipos: TipoUsuario[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!tipos.includes(req.user.tipo)) return next(forbidden());
    next();
  };

/** Atalho: autentica e exige um dos perfis informados. */
export const somente = (...tipos: TipoUsuario[]): RequestHandler[] => [autenticar, autorizar(...tipos)];

/** Garante que o usuário logado tenha perfil de artesão e devolve o id. */
export function artesaoIdDe(req: Express.Request): string {
  if (!req.user?.artesaoId) throw forbidden();
  return req.user.artesaoId;
}
