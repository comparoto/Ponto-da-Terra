import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '../config/env';
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
export const limitarTentativasDeLogin = rateLimit({
  windowMs: env.LOGIN_JANELA_MINUTOS * 60_000,
  limit: env.LOGIN_MAX_TENTATIVAS,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: req => `${ipKeyGenerator(req.ip ?? '')}:${String(req.body?.email ?? '').trim().toLowerCase()}`,
  handler: (_req, res) => {
    res.status(429).json(fail(`Muitas tentativas de login. Aguarde ${env.LOGIN_JANELA_MINUTOS} minutos e tente novamente.`));
  },
});
