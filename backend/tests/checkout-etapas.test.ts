import { randomUUID } from 'node:crypto';
import { StatusPedido, TipoEvento } from '@prisma/client';
import { api, bearer, checkout, ciclo, ENDERECO, estoqueDe, novoComprador, pecaAtiva, prisma } from './helpers';

/**
 * Testes de CARACTERIZAÇÃO do checkout (HU11), escritos ANTES da refatoração de `comprasService.checkout`
 * (Long Method → Extract Function). Eles fixam o comportamento observável de cada etapa do método:
 * consolidação dos itens, validação, reserva, agrupamento por artesão, frete, persistência e eventos.
 * Ver docs/REFATORACAO_CHECKOUT_LONG_METHOD.md.
 */
ciclo();

const checkoutCom = (token: string, itens: { produtoId: string; quantidade: number }[], endereco = ENDERECO) =>
  api().post('/api/checkout').set(bearer(token)).send({ itens, endereco });

describe('Checkout · consolidação dos itens', () => {
  it('o mesmo produto repetido no carrinho vira UM item com a soma das quantidades', async () => {
    const peca = await pecaAtiva(5, 40);
    const { token } = await novoComprador();

    const res = await checkout(token, [{ produtoId: peca.id, quantidade: 1 }, { produtoId: peca.id, quantidade: 2 }]);

    expect(res.status).toBe(201);
    expect(res.body.data.pedidos).toHaveLength(1);
    expect(res.body.data.pedidos[0].itens).toEqual([{ produtoId: peca.id, titulo: peca.titulo, quantidade: 3, precoUnitario: 40 }]);
    expect(res.body.data.valorProdutos).toBe(120);
    expect(await estoqueDe(peca.id)).toBe(2);
  });
});

describe('Checkout · validação e reserva (erros apontam a posição original do item)', () => {
  it('peça inexistente → 400 "Carrinho contém itens inválidos" com o índice do item; nada é reservado', async () => {
    const valida = await pecaAtiva(3);
    const { token } = await novoComprador();

    const res = await checkout(token, [{ produtoId: valida.id, quantidade: 1 }, { produtoId: randomUUID(), quantidade: 1 }]);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Carrinho contém itens inválidos');
    expect(res.body.errors).toEqual([{ campo: 'itens.1.produtoId', mensagem: 'Peça indisponível ou inexistente' }]);
    expect(await estoqueDe(valida.id)).toBe(3);
  });

  it('item esgotado → 400 com campo e título da peça; a reserva dos outros itens é desfeita', async () => {
    const comEstoque = await pecaAtiva(5);
    const esgotada = await pecaAtiva(1);
    const { token } = await novoComprador();

    const res = await checkout(token, [{ produtoId: comEstoque.id, quantidade: 2 }, { produtoId: esgotada.id, quantidade: 2 }]);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Item esgotado durante a finalização');
    expect(res.body.errors).toEqual([{ campo: 'itens.1.quantidade', mensagem: `${esgotada.titulo}: Item esgotado durante a finalização` }]);
    expect(await estoqueDe(comEstoque.id)).toBe(5);
    expect(await estoqueDe(esgotada.id)).toBe(1);
  });

  it('CEP fictício (00000-000) → 400 "CEP inválido"; o estoque já reservado é devolvido pelo rollback', async () => {
    const peca = await pecaAtiva(2);
    const { token, consumidorId } = await novoComprador();

    const res = await checkoutCom(token, [{ produtoId: peca.id, quantidade: 1 }], { ...ENDERECO, cep: '00000-000' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('CEP inválido');
    expect(await estoqueDe(peca.id)).toBe(2);
    expect(await prisma.compra.count({ where: { consumidorId } })).toBe(0);
    expect(await prisma.endereco.count({ where: { consumidorId } })).toBe(0);
  });
});

describe('Checkout · divisão por artesão, frete, persistência e eventos', () => {
  it('um pedido por artesão, com frete próprio, entrega prevista, histórico e evento NOVO_PEDIDO', async () => {
    // CEP 01310-100 → Sudeste: R$ 24,90 + R$ 3,00 por item adicional, 7 dias úteis
    const severino = await pecaAtiva(5, 50, 'artesao@pontodaterra.com');
    const ana = await pecaAtiva(5, 30, 'artesao2@pontodaterra.com');
    const { token, consumidorId } = await novoComprador();

    const res = await checkout(token, [{ produtoId: ana.id, quantidade: 1 }, { produtoId: severino.id, quantidade: 2 }]);

    expect(res.status).toBe(201);
    const compra = res.body.data;
    expect(compra).toMatchObject({ status: 'AGUARDANDO_PAGAMENTO', valorProdutos: 130, valorFrete: 52.8, valorTotal: 182.8 });
    expect(compra.endereco).toMatchObject({ cep: '01310-100', cidade: 'São Paulo', estado: 'SP' });

    const porArtesao = new Map(compra.pedidos.map((p: { artesao: { id: string } }) => [p.artesao.id, p]));
    expect(porArtesao.get(severino.artesaoId)).toMatchObject({ valorProdutos: 100, valorFrete: 27.9, valorTotal: 127.9, status: 'AGUARDANDO_PAGAMENTO' });
    expect(porArtesao.get(ana.artesaoId)).toMatchObject({ valorProdutos: 30, valorFrete: 24.9, valorTotal: 54.9, status: 'AGUARDANDO_PAGAMENTO' });

    // Endereço gravado uma única vez e ligado às entregas de todos os pedidos
    const enderecos = await prisma.endereco.findMany({ where: { consumidorId } });
    expect(enderecos).toHaveLength(1);
    const pedidos = await prisma.pedido.findMany({
      where: { compra: { codigo: compra.codigo } },
      include: { entrega: true, historico: true },
    });
    expect(pedidos).toHaveLength(2);
    for (const p of pedidos) {
      expect(p.entrega?.enderecoId).toBe(enderecos[0].id);
      expect(p.entrega?.dataPrevista?.getTime()).toBeGreaterThan(Date.now());
      expect(p.historico.map(h => h.status)).toEqual([StatusPedido.AGUARDANDO_PAGAMENTO]);
    }

    // HU12: um evento NOVO_PEDIDO por pedido, com o resumo dos itens
    const eventos = await prisma.eventoOutbox.findMany({ where: { tipo: TipoEvento.NOVO_PEDIDO } });
    const daCompra = eventos.map(e => e.payload as { codigoCompra: string; pedidoId: string; valorTotal: number; itens: string[] }).filter(e => e.codigoCompra === compra.codigo);
    expect(daCompra).toHaveLength(2);
    const eventoSeverino = daCompra.find(e => e.pedidoId === (porArtesao.get(severino.artesaoId) as { id: string }).id);
    expect(eventoSeverino).toMatchObject({ valorTotal: 127.9, itens: [`2x ${severino.titulo}`] });
  });
});
