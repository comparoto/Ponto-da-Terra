import { monitorEventLoopDelay } from 'node:perf_hooks';
import type { RequestHandler } from 'express';

/**
 * Coleta de métricas de rede e de execução da API (painel de monitoramento do administrador).
 *
 * O que é MEDIDO de verdade (nada é simulado):
 *  - por requisição HTTP: duração (latência no servidor), status, bytes enviados e se a conexão foi interrompida
 *    pelo cliente antes da resposta (perda);
 *  - a partir delas: vazão (req/s e KB/s), percentis de latência (p50/p95/p99), jitter e taxas de erro/perda;
 *  - atraso do laço de eventos do Node (saturação da CPU) — ver `lagDoLacoDeEventos`.
 * As sondas de banco e Redis (RTT, jitter e perda) ficam em `modules/admin/monitoramento.service.ts`.
 *
 * Limite conhecido: as amostras ficam na memória da INSTÂNCIA. Em servidor tradicional/contêiner há uma só; em
 * funções serverless (Vercel) cada instância tem as suas e elas somem quando a instância é reciclada. O painel
 * mostra o identificador e o tempo de vida da instância que respondeu, para isso ficar explícito.
 */
export interface AmostraDeRequisicao {
  /** Instante do fim da requisição (ms desde 1970). */
  em: number;
  rota: string;
  metodo: string;
  status: number;
  duracaoMs: number;
  bytesEnviados: number;
  /** Conexão fechada antes de a resposta terminar. */
  interrompida: boolean;
}

export interface ResumoDeLatencia {
  total: number;
  /** Requisições por segundo, na janela. */
  requisicoesPorSegundo: number;
  /** Quilobytes enviados por segundo, na janela. */
  kbPorSegundo: number;
  latenciaMs: { media: number; p50: number; p95: number; p99: number; max: number };
  /** Jitter = média da diferença absoluta entre latências de requisições consecutivas (RFC 3550, sem suavização). */
  jitterMs: number;
  errosCliente: number;
  errosServidor: number;
  interrompidas: number;
  /** (5xx + interrompidas) / total, em %. É a "perda" observada pelo servidor. */
  taxaDeFalhaPct: number;
}

export interface PontoDaSerie {
  /** Início do intervalo (ms desde 1970). */
  em: number;
  requisicoes: number;
  p95Ms: number;
  falhas: number;
}

export interface RotaResumo {
  rota: string;
  requisicoes: number;
  p95Ms: number;
  falhas: number;
}

const arredondar = (x: number, casas = 2) => Math.round(x * 10 ** casas) / 10 ** casas;

/** Percentil pelo método do posto mais próximo (nearest-rank). `valores` NÃO precisa estar ordenado. */
export function percentil(valores: number[], p: number): number {
  if (valores.length === 0) return 0;
  const ordenado = [...valores].sort((a, b) => a - b);
  return ordenado[Math.min(ordenado.length - 1, Math.max(0, Math.ceil((p / 100) * ordenado.length) - 1))];
}

/** Média da diferença absoluta entre valores consecutivos (na ordem recebida). */
export function jitter(valores: number[]): number {
  if (valores.length < 2) return 0;
  let soma = 0;
  for (let i = 1; i < valores.length; i++) soma += Math.abs(valores[i] - valores[i - 1]);
  return soma / (valores.length - 1);
}

/** Resume uma lista de amostras (em ordem de chegada) observadas em `janelaMs`. */
export function resumir(amostras: AmostraDeRequisicao[], janelaMs: number): ResumoDeLatencia {
  const duracoes = amostras.map(a => a.duracaoMs);
  const total = amostras.length;
  const errosServidor = amostras.filter(a => a.status >= 500).length;
  const interrompidas = amostras.filter(a => a.interrompida).length;
  const segundos = Math.max(janelaMs / 1000, 1);
  return {
    total,
    requisicoesPorSegundo: arredondar(total / segundos),
    kbPorSegundo: arredondar(amostras.reduce((s, a) => s + a.bytesEnviados, 0) / 1024 / segundos),
    latenciaMs: {
      media: arredondar(total ? duracoes.reduce((s, d) => s + d, 0) / total : 0),
      p50: arredondar(percentil(duracoes, 50)),
      p95: arredondar(percentil(duracoes, 95)),
      p99: arredondar(percentil(duracoes, 99)),
      max: arredondar(total ? Math.max(...duracoes) : 0),
    },
    jitterMs: arredondar(jitter(duracoes)),
    errosCliente: amostras.filter(a => a.status >= 400 && a.status < 500).length,
    errosServidor,
    interrompidas,
    taxaDeFalhaPct: total ? arredondar(((errosServidor + interrompidas) / total) * 100) : 0,
  };
}

/** Agrupa as amostras em intervalos de `passoMs` (de `desde` até `ate`), para os gráficos do painel. */
export function serieTemporal(amostras: AmostraDeRequisicao[], desde: number, ate: number, passoMs: number): PontoDaSerie[] {
  const quantidade = Math.max(1, Math.ceil((ate - desde) / passoMs));
  const baldes: AmostraDeRequisicao[][] = Array.from({ length: quantidade }, () => []);
  for (const a of amostras) {
    const i = Math.min(quantidade - 1, Math.floor((a.em - desde) / passoMs));
    if (i >= 0) baldes[i].push(a);
  }
  return baldes.map((b, i) => ({
    em: desde + i * passoMs,
    requisicoes: b.length,
    p95Ms: arredondar(percentil(b.map(a => a.duracaoMs), 95)),
    falhas: b.filter(a => a.status >= 500 || a.interrompida).length,
  }));
}

export class ColetorDeMetricas {
  private readonly buffer: (AmostraDeRequisicao | undefined)[];
  private proximo = 0;
  private gravadas = 0;
  readonly iniciadoEm = Date.now();

  /** @param capacidade quantas amostras recentes ficam guardadas (buffer circular: memória constante). */
  constructor(capacidade = 20_000) {
    this.buffer = new Array<AmostraDeRequisicao | undefined>(capacidade).fill(undefined);
  }

  /** Total de requisições medidas desde que a instância subiu (inclui as que já saíram do buffer). */
  get totalDesdeOInicio(): number {
    return this.gravadas;
  }

  registrar(amostra: AmostraDeRequisicao): void {
    this.buffer[this.proximo] = amostra;
    this.proximo = (this.proximo + 1) % this.buffer.length;
    this.gravadas++;
  }

  reiniciar(): void {
    this.buffer.fill(undefined);
    this.proximo = 0;
    this.gravadas = 0;
  }

  /** Amostras com `em >= desde`, da mais antiga para a mais nova. */
  desde(desde: number): AmostraDeRequisicao[] {
    const n = this.buffer.length;
    const lista: AmostraDeRequisicao[] = [];
    for (let k = 0; k < n; k++) {
      const a = this.buffer[(this.proximo + k) % n];
      if (a && a.em >= desde) lista.push(a);
    }
    return lista;
  }

  /** As rotas mais lentas (p95) da janela, com no mínimo `minimo` requisições. */
  rotasMaisLentas(amostras: AmostraDeRequisicao[], limite = 5, minimo = 1): RotaResumo[] {
    const porRota = new Map<string, AmostraDeRequisicao[]>();
    for (const a of amostras) porRota.set(a.rota, [...(porRota.get(a.rota) ?? []), a]);
    return [...porRota]
      .filter(([, v]) => v.length >= minimo)
      .map(([rota, v]) => ({
        rota,
        requisicoes: v.length,
        p95Ms: arredondar(percentil(v.map(a => a.duracaoMs), 95)),
        falhas: v.filter(a => a.status >= 500 || a.interrompida).length,
      }))
      .sort((a, b) => b.p95Ms - a.p95Ms)
      .slice(0, limite);
  }
}

export const coletor = new ColetorDeMetricas();

/** Rota "normalizada" (ex.: /api/produtos/:id) para não criar uma série por identificador. */
function nomeDaRota(req: Parameters<RequestHandler>[0]): string {
  const rota: unknown = req.route;
  const padrao = typeof rota === 'object' && rota !== null && 'path' in rota && typeof rota.path === 'string' ? rota.path : null;
  return padrao ? `${req.baseUrl}${padrao}` : 'não encontrada';
}

/** Middleware: mede cada requisição. A consulta ao próprio painel não entra na conta (evita medir o medidor). */
export const medirRequisicoes: RequestHandler = (req, res, next) => {
  const inicio = process.hrtime.bigint();
  let registrada = false;
  const registrar = (interrompida: boolean) => {
    if (registrada) return;
    registrada = true;
    const rota = nomeDaRota(req);
    if (rota.endsWith('/admin/monitoramento')) return;
    const comprimento = Number(res.getHeader('content-length'));
    coletor.registrar({
      em: Date.now(),
      rota,
      metodo: req.method,
      status: res.statusCode,
      duracaoMs: Number(process.hrtime.bigint() - inicio) / 1e6,
      bytesEnviados: Number.isFinite(comprimento) ? comprimento : 0,
      interrompida,
    });
  };
  res.on('finish', () => registrar(false));
  res.on('close', () => registrar(!res.writableFinished)); // 'close' sem 'finish': o cliente desistiu
  next();
};

// ───────────── Laço de eventos (saturação do processo) ─────────────
const histograma = monitorEventLoopDelay({ resolution: 20 });
histograma.enable();

/**
 * Em função serverless (Vercel) o processo fica CONGELADO entre uma requisição e outra, e o medidor do Node
 * conta esse tempo parado como atraso do laço de eventos (em produção apareceu 23.270 ms sem haver saturação).
 * Nesse ambiente a métrica não representa saturação, então o painel não a exibe (`null` = não disponível).
 */
export const emServerless = (): boolean => Boolean(process.env.VERCEL);

/** Atraso do laço de eventos desde a última leitura, em ms (p50/p99/max). Valores altos = processo saturado. */
export function lagDoLacoDeEventos(): { p50Ms: number; p99Ms: number; maxMs: number } {
  const ns = (v: number) => arredondar(Number.isNaN(v) ? 0 : v / 1e6);
  const r = { p50Ms: ns(histograma.percentile(50)), p99Ms: ns(histograma.percentile(99)), maxMs: ns(histograma.max) };
  histograma.reset();
  return r;
}
