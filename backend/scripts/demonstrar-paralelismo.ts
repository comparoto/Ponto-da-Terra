/**
 * Demonstração para a apresentação (FCCPD, Unidade 2): executa UM dashboard do administrador em cada modo e
 * desenha a linha do tempo real das 8 consultas, mostrando que no sequencial elas vêm uma depois da outra e no
 * concorrente se sobrepõem.
 *
 * Uso:  cd backend && npm run demo:paralelismo           (usa o banco do benchmark, pontodaterra_bench)
 * Pré-requisito: o benchmark já ter criado os dados (npm run benchmark:paralelismo), com Docker e Redis no ar.
 */
import './benchmark-ambiente'; // PRIMEIRO: valida o banco (_bench) e define o ambiente isolado
import { prisma } from '../src/config/prisma';
import { closeRedis, waitRedisReady } from '../src/config/redis';
import { relatoriosService } from '../src/modules/relatorios/relatorios.service';
import { picoDeSobreposicao, type IntervaloTarefa, type ModoExecucao } from '../src/shared/execucao';

const PERIODO = { de: new Date('2025-12-01T00:00:00.000Z'), ate: new Date('2026-12-01T00:00:00.000Z') };
const LARGURA = 60; // colunas do gráfico de barras no terminal

async function executar(modo: ModoExecucao) {
  const intervalos: IntervaloTarefa[] = [];
  const t0 = performance.now();
  await relatoriosService.dashboardAdmin(PERIODO, { modo, observar: i => intervalos.push(i) });
  const total = performance.now() - t0;
  return { intervalos, total };
}

function desenhar(titulo: string, intervalos: IntervaloTarefa[], total: number) {
  const base = Math.min(...intervalos.map(i => i.inicioMs));
  const fim = Math.max(...intervalos.map(i => i.fimMs));
  const escala = LARGURA / (fim - base);
  console.log(`\n${titulo}`);
  console.log(`${'consulta'.padEnd(15)} ${'início'.padStart(8)} ${'fim'.padStart(8)} ${'duração'.padStart(8)}  linha do tempo`);
  for (const i of [...intervalos].sort((a, b) => a.inicioMs - b.inicioMs)) {
    const ini = Math.round((i.inicioMs - base) * escala);
    const tam = Math.max(1, Math.round((i.fimMs - i.inicioMs) * escala));
    console.log(`${i.nome.padEnd(15)} ${(i.inicioMs - base).toFixed(0).padStart(6)}ms ${(i.fimMs - base).toFixed(0).padStart(6)}ms ${(i.fimMs - i.inicioMs).toFixed(0).padStart(6)}ms  ${' '.repeat(ini)}${'█'.repeat(tam)}`);
  }
  console.log(`tempo total: ${total.toFixed(0)} ms · pico de consultas ao mesmo tempo: ${picoDeSobreposicao(intervalos)}`);
}

async function main() {
  await waitRedisReady();
  const [{ n }] = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "Pedido"`;
  if (n === 0) throw new Error('O banco do benchmark está vazio. Rode antes: npm run benchmark:paralelismo -- --rapido');
  console.log(`Banco ${n.toLocaleString('pt-BR')} pedidos · período de 12 meses · pool de ${Number(process.env.DB_POOL_MAX) || 10} conexões`);

  // aquecimento (cache do banco e conexões do pool)
  await executar('sequencial');
  await executar('concorrente');

  const seq = await executar('sequencial');
  desenhar('MODO SEQUENCIAL: cada consulta só começa quando a anterior termina', seq.intervalos, seq.total);
  const conc = await executar('concorrente');
  desenhar('MODO CONCORRENTE (padrão da API): as 8 consultas são disparadas ao mesmo tempo', conc.intervalos, conc.total);
  console.log(`\nspeedup desta execução: ${(seq.total / conc.total).toFixed(2)}x · redução do tempo: ${(((seq.total - conc.total) / seq.total) * 100).toFixed(1)}%`);

  await prisma.$disconnect();
  await closeRedis();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
