import type { TipoUsuario } from '@prisma/client';

export type UsuarioAutenticado = {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  consumidorId: string | null;
  artesaoId: string | null;
  administradorId: string | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: UsuarioAutenticado;
      /** Entrada já validada pelo Zod. Não ler direto: use `entrada(req, 'body', schema)` (shared/validate.ts), que devolve o tipo certo. */
      valid?: { body?: unknown; query?: unknown; params?: unknown };
      /** Corpo original (texto), usado para verificar a assinatura do QStash */
      rawBody?: string;
    }
  }
}

export {};
