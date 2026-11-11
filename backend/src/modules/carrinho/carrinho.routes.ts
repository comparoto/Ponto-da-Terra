import { Router } from 'express';
import { documentar } from '../../docs/registry';
import { ok } from '../../shared/api-result';
import { validate } from '../../shared/validate';
import { z } from '../../shared/zod';
import { calcularCarrinho } from './carrinho.service';
import { calculadoraFrete } from './frete';

export const carrinhoRoutes = Router();
const tags = ['Carrinho e Frete'];

const cep = z.string().trim().openapi({ example: '01310-100' });

// Campos extras (ex.: "preco", "subtotal") são aceitos e DESCARTADOS (z.object remove chaves desconhecidas) — TC08
const calcularBody = z
  .object({
    itens: z
      .array(
        z.object({
          produtoId: z.string().uuid('Identificador de produto inválido'),
          quantidade: z.number().int('Quantidade deve ser inteira').min(1, 'Quantidade mínima é 1').max(100),
        }),
      )
      .min(1, 'O carrinho está vazio')
      .max(50),
    cep: cep.optional(),
  })
  .openapi('CalcularCarrinho');

const calculoResposta = z
  .object({
    itens: z.array(
      z.object({
        produtoId: z.string(),
        titulo: z.string(),
        imagemUrl: z.string().nullable(),
        artesaoId: z.string(),
        precoUnitario: z.number(),
        quantidade: z.number(),
        subtotal: z.number(),
        estoqueDisponivel: z.number(),
      }),
    ),
    quantidadeItens: z.number(),
    totalLiquido: z.number().openapi({ description: 'Soma dos produtos com preços do banco', example: 130 }),
    frete: z.object({ cep: z.string(), valor: z.number(), prazoDias: z.number(), regiao: z.string(), simulado: z.boolean() }).nullable(),
    totalGeral: z.number(),
  })
  .openapi('CalculoCarrinho');

const freteQuery = z.object({ cep, quantidade: z.coerce.number().int().min(1).max(100).default(1) });

documentar({
  method: 'post',
  path: '/api/carrinho/calcular',
  tags,
  summary: 'Calcula subtotal, frete e total com preços do banco (ignora valores enviados pelo frontend)',
  description: 'TC08 / TC14. Quantidade acima do estoque → 400 "Limite de estoque atingido para esta peça".',
  request: { body: { content: { 'application/json': { schema: calcularBody } } } },
  sucesso: { status: 200, descricao: 'Cálculo do carrinho', data: calculoResposta },
  falhas: [400],
});
carrinhoRoutes.post('/carrinho/calcular', validate({ body: calcularBody }), async (req, res) => {
  const { itens, cep: cepDestino } = req.valid!.body as z.infer<typeof calcularBody>;
  res.json(ok(await calcularCarrinho(itens, cepDestino)));
});

documentar({
  method: 'get',
  path: '/api/frete',
  tags,
  summary: 'Cota o frete (simulado) por CEP de destino',
  request: { query: freteQuery },
  sucesso: {
    status: 200,
    descricao: 'Valor e prazo',
    data: z.object({ cep: z.string(), valor: z.number(), prazoDias: z.number(), regiao: z.string(), simulado: z.boolean() }),
  },
  falhas: [400],
});
carrinhoRoutes.get('/frete', validate({ query: freteQuery }), (req, res) => {
  const { cep: cepDestino, quantidade } = req.valid!.query as z.infer<typeof freteQuery>;
  res.json(ok(calculadoraFrete.calcular(cepDestino, quantidade)));
});
