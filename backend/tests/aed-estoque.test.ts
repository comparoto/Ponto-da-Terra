import { EstoqueFefo, EstoqueInsuficienteError, ProcessadorDePedidos, type Lote, type Pedido } from '../src/aed';

const dia = (n: number) => new Date(Date.UTC(2026, 0, n));
const lote = (id: string, quantidade: number, validade: Date | null, codigoProduto = 'PT-001'): Lote => ({ id, codigoProduto, quantidade, validade });

describe('EstoqueFefo: saída por validade (o que vence primeiro sai primeiro)', () => {
  it('mantém os lotes em ordem de validade, com os lotes sem validade por último', () => {
    const e = new EstoqueFefo();
    e.entrada(lote('c', 5, dia(30)));
    e.entrada(lote('sem', 5, null));
    e.entrada(lote('a', 5, dia(10)));
    e.entrada(lote('b', 5, dia(20)));
    expect(e.consultar('PT-001').lotes.map(l => l.id)).toEqual(['a', 'b', 'c', 'sem']);
    expect(e.consultar('PT-001').quantidadeTotal).toBe(20);
  });

  it('a saída consome primeiro o lote que vence antes e passa para o próximo quando ele acaba', () => {
    const e = new EstoqueFefo();
    e.entrada(lote('a', 4, dia(10)));
    e.entrada(lote('b', 6, dia(20)));
    const r = e.saida('PT-001', 7);
    expect(r.alocacoes).toEqual([{ loteId: 'a', quantidade: 4 }, { loteId: 'b', quantidade: 3 }]);
    const depois = e.consultar('PT-001');
    expect(depois.lotes.map(l => [l.id, l.quantidade])).toEqual([['b', 3]]);
    expect(depois.quantidadeTotal).toBe(3);
  });

  it('se o estoque não basta, recusa e NÃO altera nada', () => {
    const e = new EstoqueFefo();
    e.entrada(lote('a', 3, dia(10)));
    expect(() => e.saida('PT-001', 4)).toThrow(EstoqueInsuficienteError);
    expect(() => e.saida('PT-XXX', 1)).toThrow(EstoqueInsuficienteError);
    expect(e.consultar('PT-001').quantidadeTotal).toBe(3);
    expect(e.operacoesNoHistorico).toBe(1); // só a entrada: a saída recusada não entra no histórico
  });

  it('valida as quantidades', () => {
    const e = new EstoqueFefo();
    expect(() => e.entrada(lote('a', 0, null))).toThrow(RangeError);
    expect(() => e.entrada(lote('a', 1.5, null))).toThrow(RangeError);
    e.entrada(lote('a', 5, null));
    expect(() => e.saida('PT-001', 0)).toThrow(RangeError);
    expect(() => e.saida('PT-001', -2)).toThrow(RangeError);
  });

  it('separa produtos diferentes pelo índice de código', () => {
    const e = new EstoqueFefo();
    e.entrada(lote('a', 5, dia(10), 'PT-001'));
    e.entrada(lote('b', 9, dia(5), 'PT-002'));
    e.saida('PT-002', 4);
    expect([e.consultar('PT-001').quantidadeTotal, e.consultar('PT-002').quantidadeTotal]).toEqual([5, 5]);
    expect(e.codigos().sort()).toEqual(['PT-001', 'PT-002']);
  });
});

describe('EstoqueFefo: histórico em pilha (desfazer)', () => {
  const foto = (e: EstoqueFefo, codigos: string[]) => codigos.map(c => e.consultar(c));

  it('desfazer uma saída devolve exatamente o estado anterior (lotes esgotados e lote parcial)', () => {
    const e = new EstoqueFefo();
    e.entrada(lote('a', 4, dia(10)));
    e.entrada(lote('b', 6, dia(20)));
    e.entrada(lote('c', 8, dia(30)));
    const antes = foto(e, ['PT-001']);
    e.saida('PT-001', 12); // esgota a e b, tira 2 de c
    expect(e.consultar('PT-001').lotes.map(l => [l.id, l.quantidade])).toEqual([['c', 6]]);
    const operacao = e.desfazer();
    expect(operacao?.tipo).toBe('saida');
    expect(foto(e, ['PT-001'])).toEqual(antes);
  });

  it('desfazer uma entrada remove o lote', () => {
    const e = new EstoqueFefo();
    e.entrada(lote('a', 4, dia(10)));
    e.entrada(lote('b', 6, dia(5)));
    expect(e.desfazer()?.tipo).toBe('entrada');
    expect(e.consultar('PT-001').lotes.map(l => l.id)).toEqual(['a']);
  });

  it('desfaz em ordem inversa (pilha) até esvaziar o histórico e o estoque', () => {
    const e = new EstoqueFefo();
    const estados = [foto(e, ['PT-001'])];
    e.entrada(lote('a', 10, dia(10)));
    estados.push(foto(e, ['PT-001']));
    e.saida('PT-001', 4);
    estados.push(foto(e, ['PT-001']));
    e.entrada(lote('b', 5, dia(5)));
    estados.push(foto(e, ['PT-001']));
    e.saida('PT-001', 9);
    expect(e.operacoesNoHistorico).toBe(4);

    for (let i = estados.length - 1; i >= 0; i--) {
      expect(foto(e, ['PT-001'])).toEqual(i === estados.length - 1 ? foto(e, ['PT-001']) : estados[i + 1]);
      e.desfazer();
      expect(foto(e, ['PT-001'])).toEqual(estados[i]);
    }
    expect(e.operacoesNoHistorico).toBe(0);
    expect(e.desfazer()).toBeUndefined();
    expect(e.consultar('PT-001').quantidadeTotal).toBe(0);
  });
});

describe('ProcessadorDePedidos: fila por prioridade', () => {
  const pedido = (id: string, quantidade: number, prioridade: number): Pedido => ({ id, codigoProduto: 'PT-001', quantidade, prioridade });

  it('atende primeiro o pedido mais urgente; entre iguais, o que chegou antes', () => {
    const e = new EstoqueFefo();
    e.entrada(lote('a', 100, dia(10)));
    const fila = new ProcessadorDePedidos();
    fila.enfileirar(pedido('p3', 1, 3));
    fila.enfileirar(pedido('p1a', 1, 1));
    fila.enfileirar(pedido('p2', 1, 2));
    fila.enfileirar(pedido('p1b', 1, 1));
    expect(fila.proximo()?.id).toBe('p1a');
    expect(fila.processarTodos(e).map(r => r.pedido.id)).toEqual(['p1a', 'p1b', 'p2', 'p3']);
    expect(fila.pendentes).toBe(0);
  });

  it('com estoque escasso, o pedido urgente leva o estoque e o de baixa prioridade é recusado', () => {
    const e = new EstoqueFefo();
    e.entrada(lote('a', 5, dia(10)));
    const fila = new ProcessadorDePedidos();
    fila.enfileirar(pedido('baixa', 5, 3)); // chegou primeiro, mas é menos urgente
    fila.enfileirar(pedido('alta', 5, 1));
    const [primeiro, segundo] = fila.processarTodos(e);
    expect([primeiro.pedido.id, primeiro.status]).toEqual(['alta', 'atendido']);
    expect([segundo.pedido.id, segundo.status]).toEqual(['baixa', 'recusado']);
    expect(segundo.motivo).toContain('Estoque insuficiente');
    expect(e.consultar('PT-001').quantidadeTotal).toBe(0);
  });

  it('recusa prioridade inválida e devolve undefined quando a fila está vazia', () => {
    const fila = new ProcessadorDePedidos();
    expect(() => fila.enfileirar(pedido('x', 1, 0))).toThrow(RangeError);
    expect(fila.processarProximo(new EstoqueFefo())).toBeUndefined();
  });
});
