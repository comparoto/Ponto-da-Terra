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
      valid?: { body?: any; query?: any; params?: any };
      /** Corpo original (texto), usado para verificar a assinatura do QStash */
      rawBody?: string;
    }
  }
}

export {};
