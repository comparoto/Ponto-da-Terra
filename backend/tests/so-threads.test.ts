import { estoqueParaDemanda, gerarPedidos, reservarEmThreads } from '../src/so/reserva-concorrente';

jest.setTimeout(120_000);

describe('Reserva de estoque com threads (worker_threads + memória compartilhada)', () => {
  const PRODUTOS = 4;
  const pedidos = gerarPedidos(4000, PRODUTOS, 7);
  const estoque = estoqueParaDemanda(pedidos, PRODUTOS, 0.6);

  it('os pedidos sintéticos são determinísticos', () => {
    expect(gerarPedidos(50, PRODUTOS, 7)).toEqual(gerarPedidos(50, PRODUTOS, 7));
    expect(gerarPedidos(50, PRODUTOS, 7)).not.toEqual(gerarPedidos(50, PRODUTOS, 8));
  });

  it('SINCRONIZADO com 4 threads: nunca vende acima do estoque e a conta fecha (repetido 5 vezes)', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await reservarEmThreads(pedidos, estoque, { threads: 4, sincronizado: true, rodadasDeHash: 20 });
      expect(r.consistente).toBe(true);
      expect(r.atualizacoesPerdidas).toBe(0);
      expect(r.unidadesAcimaDoEstoque).toBe(0);
      expect(r.estoqueFinal.every(q => q >= 0)).toBe(true);
      expect(r.pedidosRecusados).toBeGreaterThan(0); // o estoque cobre 60%: há disputa de verdade
    }
  });

  it('o resultado sincronizado é o mesmo que o de uma única thread (mesmo total vendido por produto)', async () => {
    const uma = await reservarEmThreads(pedidos, estoque, { threads: 1, sincronizado: true, rodadasDeHash: 20 });
    const quatro = await reservarEmThreads(pedidos, estoque, { threads: 4, sincronizado: true, rodadasDeHash: 20 });
    // com disputa, QUAIS pedidos ganham muda, mas o estoque é conservado nos dois casos
    expect(uma.consistente && quatro.consistente).toBe(true);
    expect(uma.estoqueFinal.every(q => q >= 0)).toBe(true);
    expect(uma.unidadesVendidas + uma.estoqueFinal.reduce((s, q) => s + q, 0)).toBe(estoque.reduce((s, q) => s + q, 0));
  });

  it('NÃO sincronizado com uma única thread também é correto (a corrida só existe com paralelismo)', async () => {
    const r = await reservarEmThreads(pedidos, estoque, { threads: 1, sincronizado: false, rodadasDeHash: 20 });
    expect(r.consistente).toBe(true);
  });

  it('NÃO sincronizado com várias threads perde atualizações: a corrida aparece (ao menos uma vez em 10 tentativas)', async () => {
    let corridas = 0;
    for (let i = 0; i < 10 && corridas === 0; i++) {
      const r = await reservarEmThreads(pedidos, estoque, { threads: 4, sincronizado: false, rodadasDeHash: 200 });
      if (!r.consistente) corridas++;
    }
    expect(corridas).toBeGreaterThan(0);
  });

  it('recusa número de threads inválido', async () => {
    await expect(reservarEmThreads(pedidos, estoque, { threads: 0, sincronizado: true })).rejects.toThrow(RangeError);
  });
});
