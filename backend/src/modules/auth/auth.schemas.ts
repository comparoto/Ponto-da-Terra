import { z } from '../../shared/zod';

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

const email = z.string().trim().toLowerCase().email().openapi({ example: 'comprador@pontodaterra.com' });

export const cadastroBody = z
  .object({
    nome: z.string().trim().min(2).max(120).openapi({ example: 'Maria da Silva' }),
    email,
    senha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres').max(72).openapi({ example: 'senha123' }),
    tipo: z.enum(['CONSUMIDOR', 'ARTESAO']).default('CONSUMIDOR'),
    telefone: z.string().trim().max(20).optional(),
    // Obrigatórios para artesão (RN06)
    cidade: z.string().trim().max(80).optional(),
    estado: z.enum(UFS).optional(),
    especialidade: z.string().trim().max(80).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.tipo !== 'ARTESAO') return;
    if (!d.cidade || d.cidade.length < 2) ctx.addIssue({ code: 'custom', path: ['cidade'], message: 'Informe a cidade do ateliê' });
    if (!d.estado) ctx.addIssue({ code: 'custom', path: ['estado'], message: 'Informe a UF do ateliê' });
    if (!d.especialidade || d.especialidade.length < 2)
      ctx.addIssue({ code: 'custom', path: ['especialidade'], message: 'Informe sua especialidade artesanal' });
  })
  .openapi('Cadastro');

export const loginBody = z
  .object({
    email,
    senha: z.string().min(1).openapi({ example: 'comprador123' }),
  })
  .openapi('Login');

export const atualizarMeBody = z
  .object({
    nome: z.string().trim().min(2).max(120).optional(),
    telefone: z.string().trim().max(20).nullable().optional(),
  })
  .strict()
  .refine(d => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar' });

export const perfilUsuario = z
  .object({
    id: z.string().uuid(),
    nome: z.string(),
    email: z.string(),
    telefone: z.string().nullable(),
    tipo: z.enum(['ADMIN', 'ARTESAO', 'CONSUMIDOR']),
    status: z.enum(['ATIVO', 'INATIVO', 'SUSPENSO']),
    consumidorId: z.string().nullable(),
    artesaoId: z.string().nullable(),
    dataCadastro: z.string(),
  })
  .openapi('PerfilUsuario');

export const sessao = z.object({ token: z.string(), usuario: perfilUsuario }).openapi('Sessao');
