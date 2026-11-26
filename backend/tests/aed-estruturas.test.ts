import {
  ArvoreBinariaBusca,
  Fila,
  FilaDePrioridade,
  IndiceHash,
  ListaEncadeada,
  Pilha,
  buscaBinaria,
  buscaLinear,
  hashFnv1a,
  limiteInferior,
} from '../src/aed';

/** Gerador pseudoaleatório com semente fixa (mulberry32): os testes aleatórios são reproduzíveis. */
function gerador(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const inteiro = (rand: () => number, max: number) => Math.floor(rand() * max);
const crescente = (a: number, b: number) => a - b;

describe('ListaEncadeada', () => {
  it('insere no início e no fim, mantém tamanho, cabeça e cauda', () => {
    const l = new ListaEncadeada<number>();
    expect(l.vazia).toBe(true);
    expect(l.removerPrimeiro()).toBeUndefined();
    l.inserirNoFim(2);
    l.inserirNoInicio(1);
    l.inserirNoFim(3);
    expect(l.paraArray()).toEqual([1, 2, 3]);
    expect([l.tamanho, l.primeiro(), l.ultimo()]).toEqual([3, 1, 3]);
  });

  it('inserção ordenada mantém a lista crescente, inclusive no início, no meio e no fim', () => {
    const l = new ListaEncadeada<number>();
    for (const n of [5, 1, 9, 3, 7, 0, 10, 4]) l.inserirOrdenado(n, crescente);
    expect(l.paraArray()).toEqual([0, 1, 3, 4, 5, 7, 9, 10]);
    expect([l.primeiro(), l.ultimo()]).toEqual([0, 10]);
  });

  it('inserção ordenada é ESTÁVEL: valores iguais ficam na ordem de chegada', () => {
    const l = new ListaEncadeada<{ chave: number; id: string }>();
    const porChave = (a: { chave: number }, b: { chave: number }) => a.chave - b.chave;
    for (const [chave, id] of [[2, 'a'], [1, 'b'], [2, 'c'], [1, 'd'], [2, 'e']] as const) l.inserirOrdenado({ chave, id }, porChave);
    expect(l.paraArray().map(x => x.id)).toEqual(['b', 'd', 'a', 'c', 'e']);
  });

  it('remover por predicado ajusta cabeça, meio e cauda; remover o último deixa a cauda correta', () => {
    const l = new ListaEncadeada<number>();
    [1, 2, 3, 4].forEach(n => l.inserirNoFim(n));
    expect(l.remover(n => n === 1)).toBe(1); // cabeça
    expect(l.remover(n => n === 3)).toBe(3); // meio
    expect(l.remover(n => n === 4)).toBe(4); // cauda
    expect(l.remover(n => n === 99)).toBeUndefined();
    expect(l.paraArray()).toEqual([2]);
    l.inserirNoFim(5); // depende de a cauda ter sido atualizada
    expect(l.paraArray()).toEqual([2, 5]);
    expect(l.buscar(n => n > 2)).toBe(5);
    l.removerPrimeiro();
    l.removerPrimeiro();
    expect(l.vazia).toBe(true);
    l.inserirNoFim(7);
    expect(l.paraArray()).toEqual([7]);
  });

  it('em 5.000 operações aleatórias, equivale a um array ordenado', () => {
    const rand = gerador(1);
    const l = new ListaEncadeada<number>();
    const referencia: number[] = [];
    for (let i = 0; i < 5000; i++) {
      if (rand() < 0.7 || referencia.length === 0) {
        const n = inteiro(rand, 1000);
        l.inserirOrdenado(n, crescente);
        referencia.push(n);
        referencia.sort(crescente);
      } else {
        expect(l.removerPrimeiro()).toBe(referencia.shift());
      }
    }
    expect(l.paraArray()).toEqual(referencia);
    expect(l.tamanho).toBe(referencia.length);
  });
});

describe('Fila e FilaDePrioridade', () => {
  it('a fila respeita FIFO, cresce além da capacidade inicial e dá a volta no buffer', () => {
    const f = new Fila<number>(2);
    expect(f.desenfileirar()).toBeUndefined();
    expect(f.espiar()).toBeUndefined();
    const esperado: number[] = [];
    let proximo = 0;
    for (let rodada = 0; rodada < 50; rodada++) {
      for (let i = 0; i < 5; i++) {
        f.enfileirar(proximo);
        esperado.push(proximo++);
      }
      for (let i = 0; i < 3; i++) expect(f.desenfileirar()).toBe(esperado.shift());
    }
    expect(f.tamanho).toBe(esperado.length);
    while (!f.vazia) expect(f.desenfileirar()).toBe(esperado.shift());
    expect(esperado).toHaveLength(0);
  });

  it('a capacidade inicial inválida é recusada', () => {
    expect(() => new Fila<number>(0)).toThrow(RangeError);
    expect(() => new IndiceHash<number>(-1)).toThrow(RangeError);
  });

  it('a fila de prioridade devolve primeiro o mais urgente, e a ordem de chegada desempata', () => {
    const f = new FilaDePrioridade<{ p: number; id: string }>((a, b) => a.p - b.p);
    for (const [p, id] of [[3, 'a'], [1, 'b'], [2, 'c'], [1, 'd'], [3, 'e']] as const) f.enfileirar({ p, id });
    expect(f.espiar()?.id).toBe('b');
    const saida: string[] = [];
    for (let x = f.desenfileirar(); x; x = f.desenfileirar()) saida.push(x.id);
    expect(saida).toEqual(['b', 'd', 'c', 'a', 'e']);
  });
});

describe('Pilha', () => {
  it('desempilha na ordem inversa e trata a pilha vazia', () => {
    const p = new Pilha<string>();
    expect(p.desempilhar()).toBeUndefined();
    expect(p.topo()).toBeUndefined();
    ['a', 'b', 'c'].forEach(x => p.empilhar(x));
    expect(p.topo()).toBe('c');
    expect(p.paraArray()).toEqual(['c', 'b', 'a']);
    expect([p.desempilhar(), p.desempilhar(), p.desempilhar(), p.vazia]).toEqual(['c', 'b', 'a', true]);
  });
});

describe('IndiceHash', () => {
  it('define, obtém, substitui e remove', () => {
    const h = new IndiceHash<number>();
    h.definir('PT-001', 1);
    h.definir('PT-002', 2);
    h.definir('PT-001', 10); // substitui
    expect([h.obter('PT-001'), h.obter('PT-002'), h.obter('PT-999')]).toEqual([10, 2, undefined]);
    expect([h.tamanho, h.tem('PT-002'), h.remover('PT-002'), h.remover('PT-002'), h.tamanho]).toEqual([2, true, true, false, 1]);
  });

  it('a função hash é determinística e distingue códigos parecidos', () => {
    expect(hashFnv1a('PT-001')).toBe(hashFnv1a('PT-001'));
    expect(hashFnv1a('PT-001')).not.toBe(hashFnv1a('PT-002'));
    expect(hashFnv1a('')).toBe(0x811c9dc5);
  });

  it('redimensiona mantendo o fator de carga e todas as chaves acessíveis', () => {
    const h = new IndiceHash<number>(2);
    for (let i = 0; i < 1000; i++) h.definir(`PT-${i}`, i);
    const e = h.estatisticas();
    expect(e.elementos).toBe(1000);
    expect(e.fatorDeCarga).toBeLessThanOrEqual(0.75);
    expect(e.baldes).toBeGreaterThan(1000 / 0.75 - 1);
    for (let i = 0; i < 1000; i++) expect(h.obter(`PT-${i}`)).toBe(i);
  });

  it('com uma tabela pequena e fixa de baldes, as colisões continuam resolvidas corretamente', () => {
    const h = new IndiceHash<number>(1); // um único balde: toda chave colide, até o primeiro redimensionamento
    h.definir('a', 1);
    h.definir('b', 2);
    expect(h.obter('a')).toBe(1);
    expect(h.obter('b')).toBe(2);
    expect(h.estatisticas().elementos).toBe(2);
  });

  it('em 20.000 operações aleatórias, equivale ao Map do JavaScript', () => {
    const rand = gerador(2);
    const h = new IndiceHash<number>();
    const referencia = new Map<string, number>();
    for (let i = 0; i < 20000; i++) {
      const chave = `PT-${inteiro(rand, 800)}`;
      const acao = rand();
      if (acao < 0.5) {
        h.definir(chave, i);
        referencia.set(chave, i);
      } else if (acao < 0.7) {
        expect(h.remover(chave)).toBe(referencia.delete(chave));
      } else {
        expect(h.obter(chave)).toBe(referencia.get(chave));
      }
    }
    expect(h.tamanho).toBe(referencia.size);
    expect(new Map(h.entradas())).toEqual(referencia);
  });
});

describe('ArvoreBinariaBusca', () => {
  it('insere, busca, substitui e percorre em ordem', () => {
    const t = new ArvoreBinariaBusca<number, string>(crescente);
    expect(t.menor()).toBeUndefined();
    expect(t.altura()).toBe(0);
    for (const n of [50, 30, 70, 20, 40, 60, 80]) t.inserir(n, `v${n}`);
    t.inserir(40, 'novo'); // substitui
    expect([t.tamanho, t.buscar(40), t.buscar(99)]).toEqual([7, 'novo', undefined]);
    expect([...t.emOrdem()].map(([k]) => k)).toEqual([20, 30, 40, 50, 60, 70, 80]);
    expect([t.menor()?.chave, t.maior()?.chave, t.altura()]).toEqual([20, 80, 3]);
  });

  it('remove folha, nó com um filho, nó com dois filhos e a raiz', () => {
    const t = new ArvoreBinariaBusca<number, number>(crescente);
    for (const n of [50, 30, 70, 20, 40, 60, 80, 65]) t.inserir(n, n);
    expect(t.remover(20)).toBe(true); // folha
    expect(t.remover(60)).toBe(true); // um filho (65)
    expect(t.remover(70)).toBe(true); // dois filhos
    expect(t.remover(50)).toBe(true); // raiz
    expect(t.remover(1000)).toBe(false);
    expect([...t.emOrdem()].map(([k]) => k)).toEqual([30, 40, 65, 80]);
    expect(t.tamanho).toBe(4);
    for (const n of [30, 40, 65, 80]) expect(t.remover(n)).toBe(true);
    expect([t.tamanho, t.altura()]).toEqual([0, 0]);
  });

  it('com chaves inseridas em ordem a árvore degenera em uma lista (altura = n); aleatórias ficam equilibradas', () => {
    const ordenada = new ArvoreBinariaBusca<number, number>(crescente);
    for (let i = 0; i < 2000; i++) ordenada.inserir(i, i);
    expect(ordenada.altura()).toBe(2000);

    const rand = gerador(3);
    const aleatoria = new ArvoreBinariaBusca<number, number>(crescente);
    for (let i = 0; i < 2000; i++) aleatoria.inserir(rand(), i);
    expect(aleatoria.altura()).toBeLessThan(40); // ≈ 2·log₂(2000) ≈ 22
  });

  it('em 10.000 operações aleatórias, equivale a um array ordenado de chaves únicas', () => {
    const rand = gerador(4);
    const t = new ArvoreBinariaBusca<number, number>(crescente);
    const referencia = new Map<number, number>();
    for (let i = 0; i < 10000; i++) {
      const chave = inteiro(rand, 600);
      if (rand() < 0.6) {
        t.inserir(chave, i);
        referencia.set(chave, i);
      } else {
        expect(t.remover(chave)).toBe(referencia.delete(chave));
      }
    }
    expect(t.tamanho).toBe(referencia.size);
    expect([...t.emOrdem()]).toEqual([...referencia].sort((a, b) => a[0] - b[0]));
  });
});

describe('buscaLinear e buscaBinaria', () => {
  it('acham elementos e devolvem -1 quando não existem (incluindo arrays vazios)', () => {
    const itens = [2, 4, 6, 8, 10];
    expect(buscaLinear(itens, n => n === 8)).toBe(3);
    expect(buscaLinear(itens, n => n === 5)).toBe(-1);
    expect(buscaBinaria(itens, 8, (a, b) => a - b)).toBe(3);
    expect(buscaBinaria(itens, 2, (a, b) => a - b)).toBe(0);
    expect(buscaBinaria(itens, 10, (a, b) => a - b)).toBe(4);
    expect(buscaBinaria(itens, 5, (a, b) => a - b)).toBe(-1);
    expect(buscaBinaria([], 1, (a: number, b: number) => a - b)).toBe(-1);
  });

  it('a busca binária concorda com a linear em arrays aleatórios ordenados', () => {
    const rand = gerador(5);
    for (let rodada = 0; rodada < 50; rodada++) {
      const itens = Array.from({ length: inteiro(rand, 300) }, () => inteiro(rand, 1000)).sort(crescente);
      for (let k = 0; k < 40; k++) {
        const alvo = inteiro(rand, 1000);
        const binaria = buscaBinaria(itens, alvo, (a, b) => a - b);
        const existe = buscaLinear(itens, n => n === alvo) >= 0;
        expect(binaria >= 0).toBe(existe);
        if (binaria >= 0) expect(itens[binaria]).toBe(alvo);
      }
    }
  });

  it('o limite inferior dá o ponto de inserção que mantém a ordem', () => {
    const itens = [1, 3, 3, 5, 9];
    expect(limiteInferior(itens, 0, crescente)).toBe(0);
    expect(limiteInferior(itens, 3, crescente)).toBe(1);
    expect(limiteInferior(itens, 4, crescente)).toBe(3);
    expect(limiteInferior(itens, 10, crescente)).toBe(5);
    expect(limiteInferior([], 1, crescente)).toBe(0);
  });
});
