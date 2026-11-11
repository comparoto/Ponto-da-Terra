import { StatusCompra, StatusPedido, TipoEvento } from '@prisma/client';
import { comprasService } from '../src/modules/compras/compras.service';
import {
  api,
  bearer,
  CARTAO_OK,
  CARTAO_RECUSADO,
  checkout,
  ciclo,
  estoqueDe,
  novoComprador,
  pagar,
  pecaAtiva,
  prisma,
} from './helpers';

ciclo();

/** TC02 / HU11 — relatório de 09/11/2026: BLOQUEADO (não havia backend). */
describe('TC02 · Concorrência no checkout e consistência de estoque', () => {
  it('50 compradores ao mesmo tempo disputando 1 unidade: exatamente 1 × 201 e 49 × 400; estoque termina em 0', async () => {
    const peca = await pecaAtiva(1, 120);
    const compradores = await Promise.all(Array.from({ length: 50 }, (_, i) => novoComprador(`Concorrente ${i}`)));

    const respostas = await Promise.all(compradores.map(c => checkout(c.token, [{ produtoId: peca.id, quantidade: 1 }])));

    const sucesso = respostas.filter(r => r.status === 201);
    const esgotado = respostas.filter(r => r.status === 400);
    expect(sucesso).toHaveLength(1);
    expect(esgotado).toHaveLength(49);
    for (const r of esgotado) expect(r.body.error).toBe('Item esgotado durante a finalização');

    expect(await estoqueDe(peca.id)).toBe(0); // nunca negativo
    expect(await prisma.itemPedido.count({ where: { produtoId: peca.id } })).toBe(1);

    // HU12: exatamente 1 evento "Novo Pedido" publicado para essa peça
    const eventos = await prisma.eventoOutbox.findMany({ where: { tipo: TipoEvento.NOVO_PEDIDO } });
    expect(eventos.filter(e => (e.payload as { pedidoId: string }).pedidoId === sucesso[0].body.data.pedidos[0].id)).toHaveLength(1);
  });

  it('preços vêm do banco e o carrinho é dividido em um pedido por artesão, cada um com seu frete', async () => {
    const a = await pecaAtiva(5, 50, 'artesao@pontodaterra.com');
    const b = await pecaAtiva(5, 30, 'artesao2@pontodaterra.com');
    const { token } = await novoComprador();

    const res = await api()
      .post('/api/checkout')
      .set(bearer(token))
      .send({ itens: [{ produtoId: a.id, quantidade: 2, preco: 0.01 }, { produtoId: b.id, quantidade: 1 }], endereco: { cep: '50030-230', rua: 'Rua do Bom Jesus', numero: '10', cidade: 'Recife', estado: 'PE' } });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'AGUARDANDO_PAGAMENTO', valorProdutos: 130 });
    expect(res.body.data.pedidos).toHaveLength(2);
    const soma = res.body.data.pedidos.reduce((s: number, p: { valorTotal: number }) => s + p.valorTotal, 0);
    expect(res.body.data.valorTotal).toBeCloseTo(soma, 2);
    expect(await estoqueDe(a.id)).toBe(3);
  });

  it('comprador não-autenticado → 401; artesão → 403', async () => {
    const peca = await pecaAtiva(1);
    expect((await api().post('/api/checkout').send({})).status).toBe(401);
    const artesao = await api().post('/api/auth/login').send({ email: 'artesao@pontodaterra.com', senha: 'artesao123' });
    expect((await checkout(artesao.body.data.token, [{ produtoId: peca.id, quantidade: 1 }])).status).toBe(403);
  });
});

/** TC15 / HU5 — relatório: BLOQUEADO (o checkout só tinha um botão "Cartão de Crédito"). */
describe('TC15 · Pagamento com cartão', () => {
  it('cartão aprovado em 3x → compra PAGA, pedidos PAGO, parcelas registradas', async () => {
    const peca = await pecaAtiva(3, 90);
    const { token } = await novoComprador();
    const c = await checkout(token, [{ produtoId: peca.id, quantidade: 1 }]);

    const res = await pagar(token, c.body.data.codigo, { metodo: 'CARTAO', parcelas: 3, cartao: CARTAO_OK });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PAGA');
    expect(res.body.data.pagamento).toMatchObject({ metodo: 'CARTAO', status: 'APROVADO', parcelas: 3, cartaoFinal: '1111' });
    expect(res.body.data.pedidos[0].status).toBe('PAGO');
    expect(JSON.stringify(res.body)).not.toContain('4111111111111111'); // número do cartão não é armazenado
  });

  it('cartão recusado → 402 com mensagem amigável; estoque devolvido e compra cancelada', async () => {
    const peca = await pecaAtiva(2, 90);
    const { token } = await novoComprador();
    const c = await checkout(token, [{ produtoId: peca.id, quantidade: 2 }]);
    expect(await estoqueDe(peca.id)).toBe(0);

    const res = await pagar(token, c.body.data.codigo, { metodo: 'CARTAO', parcelas: 1, cartao: CARTAO_RECUSADO });

    expect(res.status).toBe(402);
    expect(res.body.error).toMatch(/recusado.*saldo insuficiente.*carrinho foi mantido/i);
    expect(await estoqueDe(peca.id)).toBe(2); // não debitou em definitivo
    const compra = await prisma.compra.findUniqueOrThrow({ where: { codigo: c.body.data.codigo }, include: { pedidos: true } });
    expect(compra.status).toBe(StatusCompra.CANCELADA);
    expect(compra.pedidos[0].status).toBe(StatusPedido.CANCELADO);
  });

  it('dados de cartão inválidos → 400 por campo; parcelas acima de 6 → 400', async () => {
    const peca = await pecaAtiva(1);
    const { token } = await novoComprador();
    const c = await checkout(token, [{ produtoId: peca.id, quantidade: 1 }]);

    const ruim = await pagar(token, c.body.data.codigo, { metodo: 'CARTAO', cartao: { numero: '1234 5678', validade: '13/20', cvv: '1', titular: 'A' } });
    expect(ruim.status).toBe(400);
    expect(ruim.body.errors.map((e: { campo: string }) => e.campo).sort()).toEqual(['cartao.cvv', 'cartao.numero', 'cartao.titular', 'cartao.validade']);

    const parcelas = await pagar(token, c.body.data.codigo, { metodo: 'CARTAO', parcelas: 7, cartao: CARTAO_OK });
    expect(parcelas.status).toBe(400);
  });

  it('outro comprador não pode pagar nem ver a compra → 404', async () => {
    const peca = await pecaAtiva(1);
    const dono = await novoComprador();
    const intruso = await novoComprador();
    const c = await checkout(dono.token, [{ produtoId: peca.id, quantidade: 1 }]);

    expect((await api().get(`/api/compras/${c.body.data.codigo}`).set(bearer(intruso.token))).status).toBe(404);
    expect((await pagar(intruso.token, c.body.data.codigo, { metodo: 'PIX' })).status).toBe(404);
  });
});

/** TC16 / HU5 — relatório: BLOQUEADO (QR e "copia e cola" não existiam). */
describe('TC16 · PIX com webhook e expiração', () => {
  const webhook = (codigoTransacao: string, segredo = process.env.WEBHOOK_SECRET!) =>
    api().post('/api/pagamentos/webhook').set('x-webhook-secret', segredo).send({ codigoTransacao, status: 'APROVADO' });

  it('gera QR Code e "copia e cola" com expiração de 30 min; pedido fica aguardando pagamento', async () => {
    const peca = await pecaAtiva(1, 75);
    const { token } = await novoComprador();
    const c = await checkout(token, [{ produtoId: peca.id, quantidade: 1 }]);

    const res = await pagar(token, c.body.data.codigo, { metodo: 'PIX' });

    expect(res.status).toBe(201);
    const pg = res.body.data.pagamento;
    expect(pg).toMatchObject({ metodo: 'PIX', status: 'PENDENTE' });
    expect(pg.pixQrCode).toMatch(/^data:image\/png;base64,/);
    expect(pg.pixCopiaECola).toMatch(/^000201.*br\.gov\.bcb\.pix.*6304[0-9A-F]{4}$/);
    const minutos = (new Date(pg.expiraEm).getTime() - Date.now()) / 60_000;
    expect(minutos).toBeGreaterThan(29);
    expect(minutos).toBeLessThanOrEqual(30);
    expect(res.body.data.status).toBe('AGUARDANDO_PAGAMENTO');
  });

  it('dois callbacks simultâneos: processado UMA vez, sem baixa dupla de estoque', async () => {
    const peca = await pecaAtiva(3, 75);
    const { token } = await novoComprador();
    const c = await checkout(token, [{ produtoId: peca.id, quantidade: 1 }]);
    const pix = await pagar(token, c.body.data.codigo, { metodo: 'PIX' });
    const tx = pix.body.data.pagamento.codigoTransacao;

    const inicio = Date.now();
    const [r1, r2] = await Promise.all([webhook(tx), webhook(tx)]);
    expect(Date.now() - inicio).toBeLessThan(2000);

    const processados = [r1, r2].map(r => r.body.data);
    expect(processados.filter(p => p.processado)).toHaveLength(1);
    expect(processados.filter(p => p.jaProcessado)).toHaveLength(1);

    const compra = await prisma.compra.findUniqueOrThrow({ where: { codigo: c.body.data.codigo }, include: { pedidos: { include: { historico: true } } } });
    expect(compra.status).toBe(StatusCompra.PAGA);
    expect(compra.pedidos[0].historico.filter(h => h.status === StatusPedido.PAGO)).toHaveLength(1);
    expect(await estoqueDe(peca.id)).toBe(2); // baixado só uma vez (na reserva)
  });

  it('webhook sem o segredo correto → 401', async () => {
    expect((await webhook('TX-qualquer', 'segredo-errado')).status).toBe(401);
  });

  it('PIX não pago após a expiração: compra cancelada e estoque devolvido', async () => {
    const peca = await pecaAtiva(1, 75);
    const { token } = await novoComprador();
    const c = await checkout(token, [{ produtoId: peca.id, quantidade: 1 }]);
    await pagar(token, c.body.data.codigo, { metodo: 'PIX' });
    expect(await estoqueDe(peca.id)).toBe(0);

    // Simula a passagem de 30 minutos
    await prisma.compra.update({ where: { codigo: c.body.data.codigo }, data: { reservaExpiraEm: new Date(Date.now() - 1000) } });
    await prisma.pagamento.updateMany({ where: { compra: { codigo: c.body.data.codigo } }, data: { expiraEm: new Date(Date.now() - 1000) } });

    expect(await comprasService.expirarReservas()).toBeGreaterThanOrEqual(1);
    expect(await estoqueDe(peca.id)).toBe(1);
    const compra = await prisma.compra.findUniqueOrThrow({ where: { codigo: c.body.data.codigo }, include: { pagamento: true } });
    expect(compra.status).toBe(StatusCompra.CANCELADA);
    expect(compra.pagamento!.status).toBe('EXPIRADO');

    // Um callback atrasado não "ressuscita" a compra
    const tarde = await webhook(compra.pagamento!.codigoTransacao);
    expect(tarde.status).toBe(400);
    expect(tarde.body.error).toBe('Pagamento expirado');
  });

  it('simular pagamento (botão da tela de demonstração) confirma o PIX', async () => {
    const peca = await pecaAtiva(1, 75);
    const { token } = await novoComprador();
    const c = await checkout(token, [{ produtoId: peca.id, quantidade: 1 }]);
    await pagar(token, c.body.data.codigo, { metodo: 'PIX' });
    const res = await api().post(`/api/compras/${c.body.data.codigo}/simular-pagamento`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PAGA');
  });
});

describe('HU5 · Boleto', () => {
  it('gera linha digitável, vencimento em 3 dias úteis e PDF para download', async () => {
    const peca = await pecaAtiva(1, 75);
    const { token } = await novoComprador();
    const c = await checkout(token, [{ produtoId: peca.id, quantidade: 1 }]);

    const res = await pagar(token, c.body.data.codigo, { metodo: 'BOLETO' });
    expect(res.status).toBe(201);
    const pg = res.body.data.pagamento;
    expect(pg.linhaDigitavel).toMatch(/^\d{5}\.\d{5} \d{5}\.\d{6} \d{5}\.\d{6} \d \d{14}$/);
    const vencimento = new Date(pg.expiraEm);
    expect([0, 6]).not.toContain(vencimento.getDay()); // nunca cai no fim de semana

    const pdf = await api().get(new URL(pg.boletoUrl, 'http://x').pathname);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(pdf.body.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('não é possível iniciar dois pagamentos para a mesma compra → 409', async () => {
    const peca = await pecaAtiva(1, 75);
    const { token } = await novoComprador();
    const c = await checkout(token, [{ produtoId: peca.id, quantidade: 1 }]);
    await pagar(token, c.body.data.codigo, { metodo: 'BOLETO' });
    expect((await pagar(token, c.body.data.codigo, { metodo: 'PIX' })).status).toBe(409);
  });
});
