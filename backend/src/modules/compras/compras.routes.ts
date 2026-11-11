import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { MetodoPagamento, TipoUsuario } from '@prisma/client';
import { env } from '../../config/env';
import { documentar } from '../../docs/registry';
import { ok } from '../../shared/api-result';
import { somente } from '../../shared/auth';
import { forbidden, unauthorized } from '../../shared/errors';
import { validate } from '../../shared/validate';
import { z } from '../../shared/zod';
import { UFS } from '../auth/auth.schemas';
import { comprasService } from './compras.service';
import { gerarPdfTexto } from './gateway-simulado';

export const comprasRoutes = Router();
const tags = ['Checkout e Pagamentos'];

const consumidorIdDe = (req: Express.Request) => {
  if (!req.user?.consumidorId) throw forbidden();
  return req.user.consumidorId;
};

const checkoutBody = z
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
    endereco: z.object({
      cep: z.string().trim().min(8, 'CEP inválido').max(9),
      rua: z.string().trim().min(2, 'Informe a rua').max(150),
      numero: z.string().trim().min(1, 'Informe o número').max(20),
      complemento: z.string().trim().max(80).optional(),
      bairro: z.string().trim().max(80).optional(),
      cidade: z.string().trim().min(2, 'Informe a cidade').max(80),
      estado: z.enum(UFS, { errorMap: () => ({ message: 'Informe a UF' }) }),
    }),
  })
  .openapi('Checkout');

const pagamentoBody = z
  .object({
    metodo: z.nativeEnum(MetodoPagamento),
    parcelas: z.number().int().min(1, 'Mínimo de 1 parcela').max(6, 'Máximo de 6 parcelas').default(1),
    cartao: z
      .object({
        numero: z.string().trim().min(1, 'Informe o número do cartão').max(25),
        validade: z.string().trim().min(1, 'Informe a validade').max(5),
        cvv: z.string().trim().min(1, 'Informe o CVV').max(4),
        titular: z.string().trim().min(1, 'Informe o titular').max(80),
      })
      .optional()
      .openapi({ description: 'Obrigatório para CARTAO. Teste: 4111111111111111 (aprovado) / 4000000000000002 (recusado)' }),
  })
  .openapi('Pagamento');

const codigoParam = z.object({ codigo: z.string().trim().min(3).max(40) });
const webhookBody = z.object({ codigoTransacao: z.string().min(3), status: z.literal('APROVADO') }).openapi('WebhookPagamento');
const compraResposta = z.any().openapi({ description: 'Compra com pedidos e pagamento' });

documentar({
  method: 'post',
  path: '/api/checkout',
  tags,
  summary: 'Finaliza a compra com reserva ATÔMICA do estoque (HU11 / TC02)',
  description:
    'Preços e frete vêm do banco. Cria uma compra dividida em um pedido por artesão, com status AGUARDANDO_PAGAMENTO. ' +
    'Estoque insuficiente (inclusive sob concorrência) → 400 "Item esgotado durante a finalização".',
  autenticado: true,
  request: { body: { content: { 'application/json': { schema: checkoutBody } } } },
  sucesso: { status: 201, descricao: 'Compra criada e estoque reservado', data: compraResposta },
  falhas: [400, 401, 403],
});
comprasRoutes.post('/checkout', ...somente(TipoUsuario.CONSUMIDOR), validate({ body: checkoutBody }), async (req, res) => {
  const { itens, endereco } = req.valid!.body as z.infer<typeof checkoutBody>;
  res.status(201).json(ok(await comprasService.checkout(consumidorIdDe(req), itens, endereco)));
});

documentar({
  method: 'get',
  path: '/api/compras/{codigo}',
  tags,
  summary: 'Detalhe da compra (pagamento e pedidos) — somente o próprio comprador',
  autenticado: true,
  request: { params: codigoParam },
  sucesso: { status: 200, descricao: 'Compra', data: compraResposta },
  falhas: [401, 403, 404],
});
comprasRoutes.get('/compras/:codigo', ...somente(TipoUsuario.CONSUMIDOR), validate({ params: codigoParam }), async (req, res) => {
  res.json(ok(await comprasService.detalhe(consumidorIdDe(req), req.valid!.params.codigo)));
});

documentar({
  method: 'post',
  path: '/api/compras/{codigo}/pagamento',
  tags,
  summary: 'Paga a compra: PIX (QR + copia e cola, 30 min), cartão (1x a 6x, síncrono) ou boleto (3 dias úteis) — HU5',
  description: 'Cartão recusado → 402, a compra é cancelada e o estoque devolvido (o carrinho do comprador continua intacto).',
  autenticado: true,
  request: { params: codigoParam, body: { content: { 'application/json': { schema: pagamentoBody } } } },
  sucesso: { status: 201, descricao: 'Pagamento iniciado/aprovado', data: compraResposta },
  falhas: [400, 401, 403, 404, 409],
});
comprasRoutes.post('/compras/:codigo/pagamento', ...somente(TipoUsuario.CONSUMIDOR), validate({ params: codigoParam, body: pagamentoBody }), async (req, res) => {
  const { metodo, parcelas, cartao } = req.valid!.body as z.infer<typeof pagamentoBody>;
  res.status(201).json(ok(await comprasService.pagar(consumidorIdDe(req), req.valid!.params.codigo, metodo, parcelas, cartao)));
});

documentar({
  method: 'post',
  path: '/api/compras/{codigo}/simular-pagamento',
  tags,
  summary: 'Simula o pagamento do PIX/boleto (gateway simulado — ambiente de demonstração)',
  autenticado: true,
  request: { params: codigoParam },
  sucesso: { status: 200, descricao: 'Pagamento confirmado', data: compraResposta },
  falhas: [400, 401, 403, 404],
});
comprasRoutes.post('/compras/:codigo/simular-pagamento', ...somente(TipoUsuario.CONSUMIDOR), validate({ params: codigoParam }), async (req, res) => {
  res.json(ok(await comprasService.simularPagamento(consumidorIdDe(req), req.valid!.params.codigo)));
});

documentar({
  method: 'post',
  path: '/api/pagamentos/webhook',
  tags,
  summary: 'Callback do gateway (simulado) confirmando o pagamento — idempotente (TC16)',
  description: 'Exige o header `x-webhook-secret`. Callbacks repetidos ou simultâneos são processados uma única vez.',
  request: { body: { content: { 'application/json': { schema: webhookBody } } } },
  sucesso: { status: 200, descricao: 'Processado', data: z.object({ processado: z.boolean(), jaProcessado: z.boolean() }) },
  falhas: [400, 401, 404],
});
comprasRoutes.post('/pagamentos/webhook', validate({ body: webhookBody }), async (req, res) => {
  const recebido = Buffer.from(String(req.headers['x-webhook-secret'] ?? ''));
  const esperado = Buffer.from(env.WEBHOOK_SECRET);
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) throw unauthorized('Assinatura do webhook inválida');
  res.json(ok(await comprasService.confirmarPagamento(req.valid!.body.codigoTransacao)));
});

documentar({
  method: 'get',
  path: '/api/pagamentos/{codigoTransacao}/boleto.pdf',
  tags,
  summary: 'PDF do boleto simulado (link enviado ao comprador)',
  request: { params: z.object({ codigoTransacao: z.string() }) },
  sucesso: { status: 200, descricao: 'PDF' },
  falhas: [404],
});
comprasRoutes.get('/pagamentos/:codigoTransacao/boleto.pdf', async (req, res) => {
  const { pagamento, valor } = await comprasService.boletoPdf(String(req.params.codigoTransacao));
  const pdf = gerarPdfTexto([
    'PONTO DA TERRA - BOLETO SIMULADO (SEM VALOR BANCÁRIO)',
    '',
    `Compra: ${pagamento.compra.codigo}`,
    `Pagador: ${pagamento.compra.consumidor.usuario.nome}`,
    `Valor: R$ ${valor.toFixed(2).replace('.', ',')}`,
    `Vencimento: ${pagamento.expiraEm?.toLocaleDateString('pt-BR') ?? '-'}`,
    '',
    'Linha digitável:',
    pagamento.linhaDigitavel ?? '',
    '',
    'Documento gerado para fins acadêmicos (Projeto Integrador - CESAR School).',
  ]);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="boleto-${pagamento.compra.codigo}.pdf"`);
  res.send(pdf);
});
