import 'dotenv/config';
import { z } from 'zod';

const opcional = z
  .string()
  .optional()
  .transform(v => (v && v.trim() ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  /// Redis (cache e fila local). Na Vercel, o Upstash Redis pode fornecer REDIS_URL ou KV_URL.
  REDIS_URL: opcional,
  KV_URL: opcional,
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET deve ter ao menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  UPLOAD_DIR: z.string().default('uploads'),
  PUBLIC_URL: opcional,
  /// Segredo compartilhado com o gateway de pagamento (simulado) para o webhook — TC16
  WEBHOOK_SECRET: z.string().min(8).default('dev-webhook-secret'),
  /// Minutos de reserva do estoque após o checkout, sem pagamento (PIX expira em 30 min — TC16)
  RESERVA_MINUTOS: z.coerce.number().int().positive().default(30),
  /// Proteção contra força bruta: falhas de login permitidas por IP + e-mail dentro da janela
  LOGIN_MAX_TENTATIVAS: z.coerce.number().int().positive().default(10),
  LOGIN_JANELA_MINUTOS: z.coerce.number().int().positive().default(15),

  // ───── Implantação na Vercel (todas opcionais; sem elas, roda no modo local: BullMQ + disco) ─────
  /// Upstash QStash: fila serverless. Com QSTASH_TOKEN, a fila deixa de usar o worker BullMQ.
  QSTASH_TOKEN: opcional,
  QSTASH_URL: opcional,
  QSTASH_CURRENT_SIGNING_KEY: opcional,
  QSTASH_NEXT_SIGNING_KEY: opcional,
  /// Vercel Blob: com o token, as imagens vão para o Blob em vez do disco local.
  BLOB_READ_WRITE_TOKEN: opcional,
  /// Segredo das tarefas agendadas (Vercel Cron envia "Authorization: Bearer <CRON_SECRET>").
  CRON_SECRET: opcional,
  /// Variáveis de sistema da Vercel (preenchidas automaticamente pela plataforma)
  VERCEL: opcional,
  VERCEL_PROJECT_PRODUCTION_URL: opcional,
  VERCEL_URL: opcional,
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Em função serverless, process.exit derrubaria a instância sem resposta: lançar é mais claro nos logs
  throw new Error(`Variáveis de ambiente inválidas: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
}

const dados = parsed.data;

export const env = {
  ...dados,
  REDIS_URL: dados.REDIS_URL ?? dados.KV_URL,
  /// URL pública da API: explícita, ou a URL de produção que a Vercel informa
  PUBLIC_URL:
    dados.PUBLIC_URL ??
    (dados.VERCEL_PROJECT_PRODUCTION_URL ? `https://${dados.VERCEL_PROJECT_PRODUCTION_URL}` : dados.VERCEL_URL ? `https://${dados.VERCEL_URL}` : undefined),
};

export const isTest = env.NODE_ENV === 'test';
export const naVercel = Boolean(env.VERCEL);
/// Modo da fila: "qstash" (serverless, Vercel) ou "bullmq" (worker local/servidor)
export const modoFila: 'qstash' | 'bullmq' = env.QSTASH_TOKEN ? 'qstash' : 'bullmq';
