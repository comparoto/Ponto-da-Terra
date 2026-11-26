/**
 * Benchmark do módulo AED: mede o tempo de cada operação em volumes crescentes de dados sintéticos e compara o
 * crescimento medido com a complexidade teórica (inclinação da reta no gráfico log-log).
 *
 * Uso:   cd backend && npm run benchmark:aed
 *        npm run benchmark:aed -- --rapido            (teste rápido de fumaça)
 *        npm run benchmark:aed -- --repeticoes=15
 *
 * Metodologia: dados sintéticos determinísticos (PRNG com semente fixa: mesmos dados em toda execução); aquecimento
 * descartado; N repetições por célula, reportando a MEDIANA (resistente a picos do coletor de lixo e do SO);
 * a inclinação é a regressão linear de log(tempo) × log(n): ≈0 → O(1); ≈1 → O(n); ≈2 → O(n²); log n fica entre 0 e 0,3.
 * Não depende de banco nem de rede.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, platform, release, totalmem } from 'node:os';
import { resolve } from 'node:path';
import {
  ArvoreBinariaBusca,
  EstoqueFefo,
  Fila,
  IndiceHash,
  ListaEncadeada,
  Pilha,
  buscaBinaria,
  buscaLinear,
} from '../src/aed';

const argumento = (nome: string) => process.argv.find(a => a.startsWith(`--${nome}=`))?.split('=')[1];
const RAPIDO = process.argv.includes('--rapido');
const REPETICOES = Number(argumento('repeticoes') ?? (RAPIDO ? 3 : 9));
const AQUECIMENTO = RAPIDO ? 1 : 2;
const PASTA_SAIDA = resolve(__dirname, '..', '..', argumento('saida') ?? 'docs/aed/resultados');

/** Volumes (n) das operações O(1)/O(log n)/O(n) e das O(n²) (que crescem muito mais rápido). */
const VOLUMES = RAPIDO ? [1_000, 10_000] : [1_000, 10_000, 100_000, 1_000_000];
const VOLUMES_QUADRATICOS = RAPIDO ? [500, 2_000] : [500, 1_000, 2_000, 4_000, 8_000, 16_000];
const VOLUMES_ARVORE_DEGENERADA = RAPIDO ? [500, 2_000] : [1_000, 2_000, 4_000, 8_000, 16_000];

// ───────────── Dados sintéticos determinísticos ─────────────
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
const codigo = (i: number) => `PT-${String(i).padStart(7, '0')}`;
/** Permutação embaralhada de 0..n-1 (Fisher–Yates com semente fixa). */
function permutacao(n: number, semente: number): number[] {
  const rand = gerador(semente);
  const v = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [v[i], v[j]] = [v[j], v[i]];
  }
  return v;
}
const crescente = (a: number, b: number) => a - b;

// ───────────── Estatística e medição ─────────────
const mediana = (v: number[]) => {
  const o = [...v].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};
/** Inclinação (b) da regressão log(y) = a + b·log(x). */
function inclinacao(pontos: { n: number; ms: number }[]): number {
  const xs = pontos.map(p => Math.log(p.n));
  const ys = pontos.map(p => Math.log(Math.max(p.ms, 1e-9)));
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
  const my = ys.reduce((s, y) => s + y, 0) / ys.length;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return den === 0 ? 0 : num / den;
}

interface Medicao {
  n: number;
  /** Mediana (ms) do tempo de UMA operação (a mediana dos tempos por operação em cada repetição). */
  msPorOperacao: number;
  /** Mediana (ms) do trabalho completo da repetição. */
  msTotal: number;
  operacoes: number;
}
interface Experimento {
  id: string;
  titulo: string;
  estrutura: string;
  teorica: string;
  /** Inclinação esperada no log-log do tempo POR OPERAÇÃO. */
  inclinacaoEsperada: number;
  medicoes: Medicao[];
  inclinacaoMedida: number;
}

/**
 * Mede `executar` (que devolve quantas operações fez). `preparar` roda fora da medição (monta a estrutura).
 * Evita que a otimização do motor elimine o trabalho guardando o resultado em `sorvedouro`.
 */
let sorvedouro = 0;
function medir<T>(n: number, preparar: () => T, executar: (estado: T) => number): Medicao {
  const porOperacao: number[] = [];
  const totais: number[] = [];
  let operacoes = 0;
  for (let r = 0; r < AQUECIMENTO + REPETICOES; r++) {
    const estado = preparar();
    const t0 = performance.now();
    operacoes = executar(estado);
    const ms = performance.now() - t0;
    if (r >= AQUECIMENTO) {
      totais.push(ms);
      porOperacao.push(ms / operacoes);
    }
  }
  return { n, msPorOperacao: mediana(porOperacao), msTotal: mediana(totais), operacoes };
}

function experimento(
  id: string,
  titulo: string,
  estrutura: string,
  teorica: string,
  inclinacaoEsperada: number,
  volumes: number[],
  fabrica: (n: number) => { preparar: () => unknown; executar: (estado: never) => number },
): Experimento {
  const medicoes = volumes.map(n => {
    const { preparar, executar } = fabrica(n);
    return medir(n, preparar, executar as (estado: unknown) => number);
  });
  const e: Experimento = {
    id,
    titulo,
    estrutura,
    teorica,
    inclinacaoEsperada,
    medicoes,
    inclinacaoMedida: inclinacao(medicoes.map(m => ({ n: m.n, ms: m.msPorOperacao }))),
  };
  const linha = medicoes.map(m => `${m.n}: ${(m.msPorOperacao * 1000).toFixed(3)}µs`).join(' | ');
  console.log(`${id.padEnd(30)} ${teorica.padEnd(10)} inclinação ${e.inclinacaoMedida.toFixed(2).padStart(5)}  ${linha}`);
  return e;
}

// ───────────── Experimentos ─────────────
const CONSULTAS = 2_000; // quantas buscas por repetição (para o tempo ser mensurável)

function consultasAleatorias(n: number): number[] {
  const rand = gerador(99);
  return Array.from({ length: CONSULTAS }, () => Math.floor(rand() * n));
}

const experimentos: Experimento[] = [];
console.log(`AED benchmark — repetições: ${REPETICOES} (+${AQUECIMENTO} de aquecimento), mediana por célula\n`);

// 1) Busca de um produto pelo código: 4 técnicas, mesmos dados
experimentos.push(
  experimento('busca-linear', 'Busca linear em array', 'Array + varredura', 'O(n)', 1, VOLUMES.filter(n => n <= 100_000), n => {
    const itens = permutacao(n, 1).map(codigo);
    const alvos = consultasAleatorias(n).slice(0, 200).map(codigo);
    return {
      preparar: () => itens,
      executar: (v: string[]) => {
        for (const a of alvos) sorvedouro += buscaLinear(v, x => x === a);
        return alvos.length;
      },
    };
  }),
  experimento('busca-binaria', 'Busca binária em array ordenado', 'Array ordenado', 'O(log n)', 0.1, VOLUMES, n => {
    const itens = Array.from({ length: n }, (_, i) => codigo(i));
    const alvos = consultasAleatorias(n).map(codigo);
    return {
      preparar: () => itens,
      executar: (v: string[]) => {
        for (const a of alvos) sorvedouro += buscaBinaria(v, a, (x, y) => (x < y ? -1 : x > y ? 1 : 0));
        return alvos.length;
      },
    };
  }),
  experimento('indice-hash-obter', 'Busca por índice hash (código do produto)', 'IndiceHash', 'O(1)', 0, VOLUMES, n => {
    const h = new IndiceHash<number>();
    for (const i of permutacao(n, 2)) h.definir(codigo(i), i);
    const alvos = consultasAleatorias(n).map(codigo);
    return {
      preparar: () => h,
      executar: (idx: IndiceHash<number>) => {
        for (const a of alvos) sorvedouro += idx.obter(a) ?? 0;
        return alvos.length;
      },
    };
  }),
  experimento('bst-buscar-aleatoria', 'Busca em BST (chaves em ordem aleatória)', 'ArvoreBinariaBusca', 'O(log n)', 0.1, VOLUMES.filter(n => n <= 100_000), n => {
    const t = new ArvoreBinariaBusca<number, number>(crescente);
    for (const i of permutacao(n, 3)) t.inserir(i, i);
    const alvos = consultasAleatorias(n);
    return {
      preparar: () => t,
      executar: (arvore: ArvoreBinariaBusca<number, number>) => {
        for (const a of alvos) sorvedouro += arvore.buscar(a) ?? 0;
        return alvos.length;
      },
    };
  }),
  experimento('bst-buscar-degenerada', 'Busca em BST (chaves inseridas em ordem: árvore vira lista)', 'ArvoreBinariaBusca', 'O(n)', 1, VOLUMES_ARVORE_DEGENERADA, n => {
    const t = new ArvoreBinariaBusca<number, number>(crescente);
    for (let i = 0; i < n; i++) t.inserir(i, i);
    const alvos = consultasAleatorias(n).slice(0, 500);
    return {
      preparar: () => t,
      executar: (arvore: ArvoreBinariaBusca<number, number>) => {
        for (const a of alvos) sorvedouro += arvore.buscar(a) ?? 0;
        return alvos.length;
      },
    };
  }),
);

// 2) Inserção em estruturas
experimentos.push(
  experimento('hash-inserir', 'Inserção no índice hash (média amortizada)', 'IndiceHash', 'O(1)', 0, VOLUMES.filter(n => n <= 100_000), n => {
    const chaves = permutacao(n, 4).map(codigo);
    return {
      preparar: () => new IndiceHash<number>(),
      executar: (h: IndiceHash<number>) => {
        chaves.forEach((c, i) => h.definir(c, i));
        sorvedouro += h.tamanho;
        return chaves.length;
      },
    };
  }),
  experimento('bst-inserir-aleatoria', 'Inserção na BST (ordem aleatória)', 'ArvoreBinariaBusca', 'O(log n)', 0.1, VOLUMES.filter(n => n <= 100_000), n => {
    const chaves = permutacao(n, 5);
    return {
      preparar: () => new ArvoreBinariaBusca<number, number>(crescente),
      executar: (t: ArvoreBinariaBusca<number, number>) => {
        for (const c of chaves) t.inserir(c, c);
        sorvedouro += t.tamanho;
        return chaves.length;
      },
    };
  }),
  experimento('lista-inserir-ordenado-aleatorio', 'Inserção ordenada na lista (ordem aleatória)', 'ListaEncadeada', 'O(n)', 1, VOLUMES_QUADRATICOS, n => {
    const chaves = permutacao(n, 6);
    return {
      preparar: () => new ListaEncadeada<number>(),
      executar: (l: ListaEncadeada<number>) => {
        for (const c of chaves) l.inserirOrdenado(c, crescente);
        sorvedouro += l.tamanho;
        return chaves.length;
      },
    };
  }),
  experimento('lista-inserir-ordenado-crescente', 'Inserção ordenada na lista (já em ordem: melhor caso)', 'ListaEncadeada', 'O(1)', 0, VOLUMES, n => ({
    preparar: () => new ListaEncadeada<number>(),
    executar: (l: ListaEncadeada<number>) => {
      for (let i = 0; i < n; i++) l.inserirOrdenado(i, crescente);
      sorvedouro += l.tamanho;
      return n;
    },
  })),
);

// 3) Fila e pilha
experimentos.push(
  experimento('fila-enfileirar-desenfileirar', 'Fila circular: enfileirar + desenfileirar', 'Fila', 'O(1)', 0, VOLUMES, n => ({
    preparar: () => new Fila<number>(),
    executar: (f: Fila<number>) => {
      for (let i = 0; i < n; i++) f.enfileirar(i);
      for (let i = 0; i < n; i++) sorvedouro += f.desenfileirar() ?? 0;
      return 2 * n;
    },
  })),
  experimento('array-shift-como-fila', 'Referência: Array.shift() usado como fila', 'Array', 'O(n)', 1, VOLUMES.filter(n => n <= 100_000), n => ({
    preparar: () => Array.from({ length: n }, (_, i) => i),
    executar: (a: number[]) => {
      const retiradas = Math.min(n, 2_000);
      for (let i = 0; i < retiradas; i++) sorvedouro += a.shift() ?? 0;
      return retiradas;
    },
  })),
  experimento('pilha-empilhar-desempilhar', 'Pilha: empilhar + desempilhar', 'Pilha', 'O(1)', 0, VOLUMES, n => ({
    preparar: () => new Pilha<number>(),
    executar: (p: Pilha<number>) => {
      for (let i = 0; i < n; i++) p.empilhar(i);
      for (let i = 0; i < n; i++) sorvedouro += p.desempilhar() ?? 0;
      return 2 * n;
    },
  })),
);

// 4) Estoque FEFO: o caso de uso integrado (n = quantidade de produtos; cada produto com 5 lotes)
experimentos.push(
  experimento('estoque-saida-fefo', 'Estoque FEFO: saída por código (n produtos, 5 lotes cada)', 'EstoqueFefo', 'O(1)', 0, VOLUMES.filter(n => n <= 100_000), n => {
    const rand = gerador(7);
    const alvos = consultasAleatorias(n).map(codigo);
    return {
      preparar: () => {
        const e = new EstoqueFefo();
        for (let i = 0; i < n; i++) {
          for (let l = 0; l < 5; l++) {
            e.entrada({ id: `L${i}-${l}`, codigoProduto: codigo(i), quantidade: 1_000_000, validade: new Date(Date.UTC(2027, 0, 1 + Math.floor(rand() * 365))) });
          }
        }
        return e;
      },
      executar: (e: EstoqueFefo) => {
        for (const a of alvos) sorvedouro += e.saida(a, 1).alocacoes.length;
        return alvos.length;
      },
    };
  }),
);

// ───────────── Saída ─────────────
const resumo = {
  geradoEm: new Date().toISOString(),
  ambiente: {
    node: process.version,
    plataforma: `${platform()} ${release()}`,
    cpu: cpus()[0]?.model ?? 'desconhecida',
    nucleos: cpus().length,
    memoriaGB: Math.round(totalmem() / 1024 ** 3),
  },
  parametros: { repeticoes: REPETICOES, aquecimento: AQUECIMENTO, volumes: VOLUMES, volumesQuadraticos: VOLUMES_QUADRATICOS, volumesArvoreDegenerada: VOLUMES_ARVORE_DEGENERADA },
  experimentos,
};

mkdirSync(PASTA_SAIDA, { recursive: true });
writeFileSync(resolve(PASTA_SAIDA, 'benchmark-aed-ultimo.json'), JSON.stringify(resumo, null, 2));
const csv = [
  'experimento,teorica,inclinacao_esperada,inclinacao_medida,n,ms_por_operacao,ms_total,operacoes',
  ...experimentos.flatMap(e =>
    e.medicoes.map(m =>
      [e.id, e.teorica, e.inclinacaoEsperada, e.inclinacaoMedida.toFixed(3), m.n, m.msPorOperacao.toFixed(6), m.msTotal.toFixed(3), m.operacoes].join(','),
    ),
  ),
].join('\n');
writeFileSync(resolve(PASTA_SAIDA, 'benchmark-aed-resumo.csv'), csv + '\n');
console.log(`\nResultados em ${PASTA_SAIDA} (sorvedouro=${sorvedouro > 0 ? 'ok' : 'zero'})`);
