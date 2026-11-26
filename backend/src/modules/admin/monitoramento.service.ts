import { loadavg } from 'node:os';
import { prisma } from '../../config/prisma';
import { getRedis, waitRedisReady } from '../../config/redis';
import { coletor, jitter, lagDoLacoDeEventos, percentil, resumir, serieTemporal, type PontoDaSerie, type ResumoDeLatencia, type RotaResumo } from '../../shared/metricas';

export interface ResultadoDeSonda {
  alvo: 'banco' | 'redis';
  disponivel: boolean;
  /** Tentativas feitas e quantas falharam (perda). */
  tentativas: number;
  falhas: number;
  perdaPct: number;
  rttMs: { min: number; mediana: number; p95: number; max: number };
  jitterMs: number;
}

export interface Monitoramento {
  geradoEm: string;
  janelaSegundos: number;
  instancia: { pid: number; ativaHaSegundos: number; ambiente: string; requisicoesMedidasDesdeOInicio: number };
  rede: ResumoDeLatencia;
  serie: PontoDaSerie[];
  rotasMaisLentas: RotaResumo[];
  dependencias: ResultadoDeSonda[];
  processo: { memoriaRssMb: number; memoriaHeapMb: number; cpuUsuarioMs: number; cpuSistemaMs: number; cargaMedia1min: number; lacoDeEventos: { p50Ms: number; p99Ms: number; maxMs: number } };
  filaDeEventos: { pendentes: number; maisAntigoHaSegundos: number | null };
}

const arredondar = (x: number, casas = 2) => Math.round(x * 10 ** casas) / 10 ** casas;
const SONDAS = 5;

/** Mede `SONDAS` idas e voltas ao alvo, em sequência: RTT (min/mediana/p95/max), jitter e perda. */
export async function sondar(alvo: 'banco' | 'redis', operacao: () => Promise<unknown>, tentativas = SONDAS): Promise<ResultadoDeSonda> {
  const rtts: number[] = [];
  let falhas = 0;
  for (let i = 0; i < tentativas; i++) {
    const t0 = performance.now();
    try {
      await operacao();
      rtts.push(performance.now() - t0);
    } catch {
      falhas++;
    }
  }
  return {
    alvo,
    disponivel: rtts.length > 0,
    tentativas,
    falhas,
    perdaPct: arredondar((falhas / tentativas) * 100),
    rttMs: {
      min: arredondar(rtts.length ? Math.min(...rtts) : 0),
      mediana: arredondar(percentil(rtts, 50)),
      p95: arredondar(percentil(rtts, 95)),
      max: arredondar(rtts.length ? Math.max(...rtts) : 0),
    },
    jitterMs: arredondar(jitter(rtts)),
  };
}

async function sondarRedis(): Promise<ResultadoDeSonda> {
  await waitRedisReady(1500);
  const redis = getRedis();
  return sondar('redis', async () => {
    if (!redis) throw new Error('Redis indisponível');
    return redis.ping();
  });
}

export const monitoramentoService = {
  async coletar(janelaSegundos: number): Promise<Monitoramento> {
    const agora = Date.now();
    const janelaMs = janelaSegundos * 1000;
    const amostras = coletor.desde(agora - janelaMs);
    // passo escolhido para a série ter ~30 pontos
    const passoMs = Math.max(1000, Math.round(janelaMs / 30 / 1000) * 1000);

    const [banco, redis, pendentes, maisAntigo] = await Promise.all([
      sondar('banco', () => prisma.$queryRaw`SELECT 1`),
      sondarRedis(),
      prisma.eventoOutbox.count({ where: { publicadoEm: null } }),
      prisma.eventoOutbox.findFirst({ where: { publicadoEm: null }, orderBy: { criadoEm: 'asc' }, select: { criadoEm: true } }),
    ]);

    const memoria = process.memoryUsage();
    const cpu = process.cpuUsage();
    return {
      geradoEm: new Date(agora).toISOString(),
      janelaSegundos,
      instancia: {
        pid: process.pid,
        ativaHaSegundos: Math.round((agora - coletor.iniciadoEm) / 1000),
        ambiente: process.env.VERCEL ? 'vercel (função serverless)' : 'servidor tradicional',
        requisicoesMedidasDesdeOInicio: coletor.totalDesdeOInicio,
      },
      rede: resumir(amostras, Math.min(janelaMs, Math.max(1000, agora - coletor.iniciadoEm))),
      serie: serieTemporal(amostras, agora - janelaMs, agora, passoMs),
      rotasMaisLentas: coletor.rotasMaisLentas(amostras),
      dependencias: [banco, redis],
      processo: {
        memoriaRssMb: arredondar(memoria.rss / 1024 / 1024),
        memoriaHeapMb: arredondar(memoria.heapUsed / 1024 / 1024),
        cpuUsuarioMs: Math.round(cpu.user / 1000),
        cpuSistemaMs: Math.round(cpu.system / 1000),
        cargaMedia1min: arredondar(loadavg()[0]),
        lacoDeEventos: lagDoLacoDeEventos(),
      },
      filaDeEventos: { pendentes, maisAntigoHaSegundos: maisAntigo ? Math.round((agora - maisAntigo.criadoEm.getTime()) / 1000) : null },
    };
  },
};
