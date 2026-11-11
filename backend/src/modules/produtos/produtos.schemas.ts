import { paginacaoQuery } from '../../shared/pagination';
import { z } from '../../shared/zod';

const textoObrigatorio = (mensagem: string, max = 120) =>
  z.string({ required_error: mensagem, invalid_type_error: mensagem }).trim().min(2, mensagem).max(max);

const preco = z
  .number({ required_error: 'Informe o preço', invalid_type_error: 'O preço deve ser um número' })
  .positive('O preço deve ser maior que zero')
  .max(1_000_000, 'Preço acima do permitido')
  .refine(v => Number.isInteger(Math.round(v * 100)) && Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Use no máximo 2 casas decimais')
  .openapi({ example: 85.0 });

const quantidadeEstoque = z
  .number({ required_error: 'Informe o estoque disponível', invalid_type_error: 'O estoque deve ser um número' })
  .int('O estoque deve ser um número inteiro')
  .min(0, 'O estoque não pode ser negativo')
  .max(100_000);

const camposProduto = {
  titulo: z
    .string({ required_error: 'Informe o título da peça', invalid_type_error: 'Informe o título da peça' })
    .trim()
    .min(3, 'O título deve ter no mínimo 3 caracteres')
    .max(120)
    .openapi({ example: 'Pote Tradicional de Barro com Tampa' }),
  descricao: z.string().trim().max(2000).optional(),
  // HU1 / TC09: técnica e polo de origem são obrigatórios
  tecnica: textoObrigatorio('Informe a técnica artesanal').openapi({ example: 'Barro' }),
  poloOrigem: textoObrigatorio('Informe o polo de origem').openapi({ example: 'Caruaru' }),
  preco,
  categoriaId: z.string().uuid('Categoria inválida').optional(),
  materiaisUtilizados: z.string().trim().max(300).optional(),
  dimensoes: z.string().trim().max(100).optional(),
  prontaEntrega: z.boolean().default(true),
  tempoProducaoDias: z.number().int().min(0).max(365).optional(),
  imagensUrls: z.array(z.string().url('URL de imagem inválida')).max(8).default([]),
};

export const criarProdutoBody = z
  .object({ ...camposProduto, estoque: quantidadeEstoque.openapi({ example: 5 }) })
  .openapi('CriarProduto');

export const atualizarProdutoBody = z
  .object(camposProduto)
  .partial()
  .refine(d => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar' })
  .openapi('AtualizarProduto');

export const estoqueBody = z.object({ quantidade: quantidadeEstoque }).openapi('AjusteEstoque');

export const idParam = z.object({ id: z.string().uuid('Identificador inválido') });

export const ORDENACOES = ['recentes', 'preco-asc', 'preco-desc', 'nome'] as const;

export const vitrineQuery = z.object({
  ...paginacaoQuery,
  busca: z.string().trim().max(100).optional().openapi({ description: 'Título, descrição, técnica, polo, nome ou cidade do artesão' }),
  categoria: z.string().trim().max(60).optional().openapi({ example: 'Cerâmica & Barro' }),
  tecnica: z.string().trim().max(60).optional().openapi({ example: 'Renda Renascença' }),
  polo: z.string().trim().max(60).optional().openapi({ example: 'Pesqueira' }),
  artesaoId: z.string().uuid().optional(),
  precoMin: z.coerce.number().min(0).optional(),
  precoMax: z.coerce.number().min(0).optional(),
  ordenacao: z.enum(ORDENACOES).default('recentes'),
});

export const meusProdutosQuery = z.object({
  ...paginacaoQuery,
  status: z.enum(['PENDENTE', 'ATIVO', 'REJEITADO']).optional(),
});

// ───── Schemas de resposta (Swagger) ─────

export const produtoResposta = z
  .object({
    id: z.string().uuid(),
    titulo: z.string(),
    descricao: z.string().nullable(),
    tecnica: z.string(),
    poloOrigem: z.string(),
    preco: z.number(),
    materiaisUtilizados: z.string().nullable(),
    dimensoes: z.string().nullable(),
    prontaEntrega: z.boolean(),
    tempoProducaoDias: z.number().nullable(),
    imagensUrls: z.array(z.string()),
    avaliacaoMedia: z.number(),
    estoque: z.number(),
    emEstoque: z.boolean(),
    categoria: z.object({ id: z.string(), nome: z.string() }).nullable(),
    artesao: z.object({ id: z.string(), nome: z.string(), cidade: z.string(), estado: z.string() }),
    criadoEm: z.string(),
  })
  .openapi('Produto');

export const produtoGestaoResposta = produtoResposta
  .extend({
    status: z.enum(['PENDENTE', 'ATIVO', 'REJEITADO']),
    justificativaCuradoria: z.string().nullable(),
    atualizadoEm: z.string(),
  })
  .openapi('ProdutoGestao');
