import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env, isTest } from '../config/env';
import { fail } from './api-result';

/**
 * Proteção contra força bruta no login (achado do teste de segurança de 11/11/2026).
 *
 * Conta apenas as tentativas que FALHAM, por combinação de IP + e-mail: um invasor não
 * consegue testar senhas em sequência, e um usuário legítimo que acerta a senha não é afetado.
 * Depois de N falhas na janela, responde 429 até a janela expirar.
 *
 * Armazenamento em memória: suficiente para uma instância. Com várias instâncias da API,
 * troque por um store compartilhado no Redis (ex.: rate-limit-redis).
 */
/** "Esqueci minha senha" e redefinição: 5 pedidos a cada 15 minutos por IP (evita spam de e-mails e adivinhação de links). */
export const limitarPedidosDeSenha = rateLimit({
  windowMs: 15 * 60_000,
  limit: isTest ? 1000 : 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: req => ipKeyGenerator(req.ip ?? ''),
  handler: (_req, res) => {
    res.status(429).json(fail('Muitos pedidos de redefinição de senha. Aguarde 15 minutos e tente novamente.'));
  },
});

/** E-mail enviado no corpo do login, ou texto vazio se o corpo não tiver o formato esperado. */
const emailDoCorpo = (corpo: unknown): string => {
  if (typeof corpo !== 'object' || corpo === null || !('email' in corpo)) return '';
  return typeof corpo.email === 'string' ? corpo.email : '';
};

export const limitarTentativasDeLogin = rateLimit({
  windowMs: env.LOGIN_JANELA_MINUTOS * 60_000,
  limit: env.LOGIN_MAX_TENTATIVAS,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: req => `${ipKeyGenerator(req.ip ?? '')}:${emailDoCorpo(req.body).trim().toLowerCase()}`,
  handler: (_req, res) => {
    res.status(429).json(fail(`Muitas tentativas de login. Aguarde ${env.LOGIN_JANELA_MINUTOS} minutos e tente novamente.`));
  },
});
