/**
 * Benchmark de paralelismo (FCCPD, Unidade 2): relatórios do administrador e do artesão,
 * execução SEQUENCIAL x CONCORRENTE das mesmas consultas (a mesma lógica de negócio, só muda o modo).
 *
 * Uso:   cd backend && npm run benchmark:paralelismo
 *        npm run benchmark:paralelismo -- --rapido                  (teste rápido de fumaça)
 *        npm run benchmark:paralelismo -- --escalas=20000,100000 --repeticoes=20
 *
 * Segurança (ver benchmark-ambiente.ts): o script SÓ roda em um banco cujo nome termina em "_bench" (padrão: pontodaterra_bench, no
 * PostgreSQL do Docker local). Ele apaga e recria os dados desse banco. Nunca aponte para dev ou produção.
 * Para criar o banco:  docker exec ponto-da-terra-postgres psql -U pdt -d pontodaterra -c "CREATE DATABASE pontodaterra_bench"
 *                      e aplicar as migrations com DATABASE_URL apontando para ele (veja docs/md/RELATORIO_FCCPD_U2.md).
 *
 * Metodologia (resumo): dados sintéticos determinísticos (mesmo conteúdo em toda execução); aquecimento descartado;
 * N repetições por célula; ordem dos modos alternada a cada repetição; equivalência dos resultados conferida a cada
 * repetição; sobreposição das consultas medida no cliente (início/fim de cada uma) e no servidor (pg_stat_activity).
 */
import { NOME_BANCO, URL_BANCO } from './benchmark-ambiente'; // PRIMEIRO: valida o banco e define o ambiente
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, platform, release, totalmem } from 'node:os';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { Client } from 'pg';
import { prisma } from '../src/config/prisma';
import { closeRedis, getRedis, waitRedisReady } from '../src/config/redis';
import { relatoriosService } from '../src/modules/relatorios/relatorios.service';
import { picoDeSobreposicao, type IntervaloTarefa, type ModoExecucao } from '../src/shared/execucao';

// ───────────── Argumentos e trava de segurança (antes de importar a aplicação) ─────────────
const argumento = (nome: string) => process.argv.find(a => a.startsWith(`--${nome}=`))?.split('=')[1];
const tem = (nome: string) => process.argv.includes(`--${nome}`);
const numeros = (nome: string, padrao: number[]) => argumento(nome)?.split(',').map(Number) ?? padrao;

const RAPIDO = tem('rapido');
const ESCALAS = numeros('escalas', RAPIDO ? [20_000] : [20_000, 100_000, 300_000]);
const REPETICOES = Number(argumento('repeticoes') ?? (RAPIDO ? 5 : 15));
const AQUECIMENTO = Number(argumento('aquecimento') ?? 3);
const POOLS = numeros('pool-sweep', RAPIDO ? [] : [1, 2, 4, 10]);
const CLIENTES = numeros('clientes', RAPIDO ? [] : [1, 4, 10]);
const DURACAO_CARGA_MS = Number(argumento('duracao-carga') ?? 8) * 1000;
const FASE = argumento('fase') ?? 'completa'; // "completa" ou "pool" (usada pelos processos filhos do pool-sweep)
const PASTA_SAIDA = resolve(__dirname, '..', '..', argumento('saida') ?? 'docs/fccpd/resultados');

// ───────────── Estatística ─────────────
const media = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
const ordenado = (v: number[]) => [...v].sort((a, b) => a - b);
const mediana = (v: number[]) => {
  const o = ordenado(v);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};
const percentil = (v: number[], p: number) => ordenado(v)[Math.min(v.length - 1, Math.ceil((p / 100) * v.length) - 1)];
const desvio = (v: number[]) => {
  const m = media(v);
  return Math.sqrt(media(v.map(x => (x - m) ** 2)));
};
const arred = (x: number, casas = 1) => Math.round(x * 10 ** casas) / 10 ** casas;

type Resumo = { media: number; mediana: number; p95: number; min: number; max: number; desvio: number };
const resumir = (v: number[]): Resumo => ({ media: arred(media(v)), mediana: arred(mediana(v)), p95: arred(percentil(v, 95)), min: arred(Math.min(...v)), max: arred(Math.max(...v)), desvio: arred(desvio(v)) });

// ───────────── Geração dos dados (determinística) ─────────────
const N_ARTESAOS = 200;
const N_PRODUTOS = 4000;
const N_CONSUMIDORES = 5000;
const h = (expr: string) => `abs(hashtext(${expr})::bigint)`;

const sqlEntidades = [
  `INSERT INTO "Usuario" ("id","nome","email","senhaHash","tipo","status","tokenVersion") SELECT md5('uart'||g), 'Artesão bench '||g, 'bench-art-'||g||'@bench.local', 'x', 'ARTESAO'::"TipoUsuario", 'ATIVO'::"StatusUsuario", 0 FROM generate_series(1, ${N_ARTESAOS}) g ON CONFLICT DO NOTHING`,
  `INSERT INTO "Usuario" ("id","nome","email","senhaHash","tipo","status","tokenVersion") SELECT md5('ucons'||g), 'Comprador bench '||g, 'bench-cons-'||g||'@bench.local', 'x', 'CONSUMIDOR'::"TipoUsuario", 'ATIVO'::"StatusUsuario", 0 FROM generate_series(1, ${N_CONSUMIDORES}) g ON CONFLICT DO NOTHING`,
  `INSERT INTO "Artesao" ("id","usuarioId","nomeAtelie","cidade","statusCadastro","dataCadastro") SELECT md5('artesao'||g), md5('uart'||g), 'Ateliê bench '||g, 'Caruaru', 'APROVADO'::"StatusCadastroArtesao", TIMESTAMP '2025-12-01' + (g % 300) * INTERVAL '1 day' FROM generate_series(1, ${N_ARTESAOS}) g ON CONFLICT DO NOTHING`,
  `INSERT INTO "Consumidor" ("id","usuarioId") SELECT md5('cons'||g), md5('ucons'||g) FROM generate_series(1, ${N_CONSUMIDORES}) g ON CONFLICT DO NOTHING`,
  `INSERT INTO "Endereco" ("id","consumidorId","cep","rua","numero","cidade","estado") SELECT md5('end'||g), md5('cons'||g), '50000-000', 'Rua Bench', '1', 'Recife', 'PE' FROM generate_series(1, ${N_CONSUMIDORES}) g ON CONFLICT DO NOTHING`,
  `INSERT INTO "Produto" ("id","artesaoId","titulo","tecnica","poloOrigem","preco","imagensUrls","status","atualizadoEm") SELECT md5('prod'||g), md5('artesao'||(((g - 1) % ${N_ARTESAOS}) + 1)), 'Peça bench '||g, 'Barro', 'Caruaru', 10 + (g % 190), ARRAY[]::text[], 'ATIVO'::"StatusProduto", now() FROM generate_series(1, ${N_PRODUTOS}) g ON CONFLICT DO NOTHING`,
];

const baseDoPedido = (de: number, ate: number) =>
  `SELECT i, 1 + ${h("'c'||i")} % ${N_CONSUMIDORES} AS c, 1 + ${h("'a'||i")} % ${N_ARTESAOS} AS a,
          (1000 + ${h("'v'||i")} % 49000) / 100.0 AS valor,
          TIMESTAMP '2025-12-01' + (${h("'d'||i")} % 31536000) * INTERVAL '1 second' AS data,
          ${h("'s'||i")} % 100 AS r
   FROM generate_series(${de}, ${ate}) i`;

const sqlLote = (de: number, ate: number) => [
  `INSERT INTO "Compra" ("id","codigo","consumidorId","enderecoId","valorProdutos","valorFrete","valorTotal","status","reservaExpiraEm","criadoEm")
   SELECT md5('cmp'||i), 'BENCH-'||i, md5('cons'||c), md5('end'||c), valor, 0, valor, 'PAGA'::"StatusCompra", data, data FROM (${baseDoPedido(de, ate)}) t ON CONFLICT DO NOTHING`,
  `INSERT INTO "Pedido" ("id","compraId","consumidorId","artesaoId","dataPedido","valorProdutos","valorFrete","valorTotal","status")
   SELECT md5('ped'||i), md5('cmp'||i), md5('cons'||c), md5('artesao'||a), data, valor, 0, valor,
          (CASE WHEN r < 5 THEN 'AGUARDANDO_PAGAMENTO' WHEN r < 10 THEN 'CANCELADO' WHEN r < 25 THEN 'PAGO' WHEN r < 40 THEN 'EM_PRODUCAO' WHEN r < 55 THEN 'DESPACHADO' ELSE 'ENTREGUE' END)::"StatusPedido"
   FROM (${baseDoPedido(de, ate)}) t ON CONFLICT DO NOTHING`,
  `INSERT INTO "ItemPedido" ("id","pedidoId","produtoId","artesaoId","tituloProduto","quantidade","precoUnitario")
   SELECT md5('item'||i||'-'||k), md5('ped'||i), md5('prod'||(a + ${N_ARTESAOS} * (${h("'p'||i||k")} % ${N_PRODUTOS / N_ARTESAOS}))), md5('artesao'||a),
          'Peça bench '||(a + ${N_ARTESAOS} * (${h("'p'||i||k")} % ${N_PRODUTOS / N_ARTESAOS})), 1 + ${h("'q'||i||k")} % 5, 10 + ${h("'u'||i||k")} % 190
   FROM (${baseDoPedido(de, ate)}) t CROSS JOIN generate_series(1, 3) k ON CONFLICT DO NOTHING`,
];

// ───────────── Programa principal ─────────────
type Chamada = (modo: ModoExecucao, observar: (i: IntervaloTarefa) => void) => Promise<unknown>;

// Conexões do Docker/WSL podem ser derrubadas de forma esporádica (ECONNRESET). Uma chamada interrompida é repetida
// (no máximo 3 tentativas) e a contagem vai para o resultado, para a limitação ficar registrada e não escondida.
let retentativas = 0;
const transitorio = (e: unknown) => /ECONNRESET|Connection terminated|EPIPE/i.test(e instanceof Error ? `${e.message} ${String(e.cause ?? '')}` : String(e));
async function comRetentativa<T>(fn: () => Promise<T>): Promise<T> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await fn();
    } catch (e) {
      if (!transitorio(e) || tentativa >= 3) throw e;
      retentativas++;
      console.warn(`  ! conexão interrompida; repetindo a chamada (retentativa ${retentativas})`);
      await new Promise(r => setTimeout(r, 500));
    }
  }
}
const semTempo = (v: unknown): unknown => {
  const copia: unknown = JSON.parse(JSON.stringify(v));
  if (copia && typeof copia === 'object' && 'geradoEmMs' in copia) delete (copia as Record<string, unknown>).geradoEmMs;
  return copia;
};

async function main() {
  await waitRedisReady();

  const idArtesao = `${await prisma.$queryRaw<{ id: string }[]>`SELECT md5('artesao'||1) AS id`.then(r => r[0].id)}`;
  const PERIODOS = {
    ano: { de: new Date('2025-12-01T00:00:00.000Z'), ate: new Date('2026-12-01T00:00:00.000Z') },
    mes: { de: new Date('2026-06-01T00:00:00.000Z'), ate: new Date('2026-06-30T23:59:59.999Z') },
  } as const;
  type NomePeriodo = keyof typeof PERIODOS;

  const chamadas = (periodo: NomePeriodo): Record<string, Chamada> => ({
    dashboardAdmin: (modo, observar) => relatoriosService.dashboardAdmin(PERIODOS[periodo], { modo, observar }),
    indicadoresArtesao: (modo, observar) => relatoriosService.indicadoresArtesao(idArtesao, PERIODOS[periodo], { modo, observar }),
  });

  // --- preparação do banco de dados ---
  async function contar() {
    const [r] = await prisma.$queryRaw<{ pedidos: number; itens: number }[]>`SELECT (SELECT count(*) FROM "Pedido")::int AS pedidos, (SELECT count(*) FROM "ItemPedido")::int AS itens`;
    return r;
  }
  async function preparar(escala: number) {
    let { pedidos } = await contar();
    if (pedidos > escala) {
      await prisma.$executeRawUnsafe('TRUNCATE "ItemPedido","Pedido","Compra","Endereco","Produto","Consumidor","Artesao","Usuario" CASCADE');
      pedidos = 0;
    }
    for (const sql of sqlEntidades) await comRetentativa(() => prisma.$executeRawUnsafe(sql));
    const LOTE = 50_000;
    for (let de = pedidos + 1; de <= escala; de += LOTE) {
      const ate = Math.min(escala, de + LOTE - 1);
      for (const sql of sqlLote(de, ate)) await comRetentativa(() => prisma.$executeRawUnsafe(sql));
    }
    await prisma.$executeRawUnsafe('ANALYZE');
    const redis = getRedis();
    if (redis) {
      await redis.del('busca:termos');
      for (let i = 1; i <= 60; i++) await redis.zadd('busca:termos', i, `termo bench ${i}`);
    }
    return contar();
  }

  // --- sonda do servidor: quantos backends ativos o PostgreSQL tem enquanto o relatório roda ---
  async function sondarServidor(executar: () => Promise<unknown>) {
    const sonda = new Client({ connectionString: URL_BANCO.replace(/\?schema=.*$/, '') });
    await sonda.connect();
    let parar = false;
    let pico = 0;
    let amostras = 0;
    const laco = (async () => {
      while (!parar) {
        const r = await sonda.query<{ n: number }>(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND state = 'active' AND pid <> pg_backend_pid()`);
        pico = Math.max(pico, r.rows[0].n);
        amostras++;
      }
    })();
    await executar();
    parar = true;
    await laco;
    await sonda.end();
    return { picoBackendsAtivos: pico, amostras };
  }

  // --- comparação sequencial x concorrente de uma chamada ---
  async function comparar(chamada: Chamada) {
    const nada = () => undefined;
    for (let i = 0; i < AQUECIMENTO; i++) {
      await comRetentativa(() => chamada('sequencial', nada));
      await comRetentativa(() => chamada('concorrente', nada));
    }
    const tempos: Record<ModoExecucao, number[]> = { sequencial: [], concorrente: [] };
    const porTarefa: Record<ModoExecucao, Map<string, number[]>> = { sequencial: new Map(), concorrente: new Map() };
    const picoCliente: Record<ModoExecucao, number> = { sequencial: 0, concorrente: 0 };
    let divergencias = 0;
    for (let r = 0; r < REPETICOES; r++) {
      const ordem: ModoExecucao[] = r % 2 === 0 ? ['sequencial', 'concorrente'] : ['concorrente', 'sequencial'];
      const saidas = {} as Record<ModoExecucao, unknown>;
      for (const modo of ordem) {
        const intervalos: IntervaloTarefa[] = [];
        const t0 = performance.now();
        saidas[modo] = semTempo(await comRetentativa(() => chamada(modo, i => intervalos.push(i))));
        tempos[modo].push(performance.now() - t0);
        picoCliente[modo] = Math.max(picoCliente[modo], picoDeSobreposicao(intervalos));
        for (const i of intervalos) porTarefa[modo].set(i.nome, [...(porTarefa[modo].get(i.nome) ?? []), i.fimMs - i.inicioMs]);
      }
      if (!isDeepStrictEqual(saidas.sequencial, saidas.concorrente)) divergencias++;
    }
    const servidor = {
      sequencial: await comRetentativa(() => sondarServidor(() => chamada('sequencial', nada))),
      concorrente: await comRetentativa(() => sondarServidor(() => chamada('concorrente', nada))),
    };
    const seq = resumir(tempos.sequencial);
    const conc = resumir(tempos.concorrente);
    const mediasTarefas = (modo: ModoExecucao) => Object.fromEntries([...porTarefa[modo]].map(([nome, v]) => [nome, arred(mediana(v))]));
    return {
      repeticoes: REPETICOES,
      aquecimento: AQUECIMENTO,
      sequencialMs: seq,
      concorrenteMs: conc,
      speedupMediana: arred(seq.mediana / conc.mediana, 2),
      speedupMedia: arred(seq.media / conc.media, 2),
      reducaoPercentualMediana: arred(((seq.mediana - conc.mediana) / seq.mediana) * 100),
      throughputRelatoriosPorSegundo: { sequencial: arred(1000 / seq.mediana, 2), concorrente: arred(1000 / conc.mediana, 2) },
      divergenciasDeResultado: divergencias,
      sobreposicaoPicoCliente: picoCliente,
      sobreposicaoPicoServidor: { sequencial: servidor.sequencial.picoBackendsAtivos, concorrente: servidor.concorrente.picoBackendsAtivos },
      medianaPorConsultaMs: { sequencial: mediasTarefas('sequencial'), concorrente: mediasTarefas('concorrente') },
      somaDasConsultasMs: arred(Object.values(mediasTarefas('sequencial')).reduce((s, x) => s + x, 0)),
      maiorConsultaMs: arred(Math.max(...Object.values(mediasTarefas('sequencial')))),
      temposBrutosMs: { sequencial: tempos.sequencial.map(x => arred(x, 2)), concorrente: tempos.concorrente.map(x => arred(x, 2)) },
    };
  }

  // --- carga com vários clientes simultâneos (efeito da disputa pelo pool de conexões) ---
  async function carga(modo: ModoExecucao, clientes: number) {
    const chamada = chamadas('ano').dashboardAdmin;
    const nada = () => undefined;
    for (let i = 0; i < 2; i++) await comRetentativa(() => chamada(modo, nada)); // aquecimento
    const latencias: number[] = [];
    let erros = 0;
    const fim = performance.now() + DURACAO_CARGA_MS;
    const inicio = performance.now();
    await Promise.all(
      Array.from({ length: clientes }, async () => {
        while (performance.now() < fim) {
          const t0 = performance.now();
          try {
            await comRetentativa(() => chamada(modo, nada));
            latencias.push(performance.now() - t0);
          } catch {
            erros++; // sob carga o banco pode recusar consultas (ex.: memória compartilhada); contamos e seguimos
          }
        }
      }),
    );
    const duracaoS = (performance.now() - inicio) / 1000;
    return {
      modo,
      clientes,
      relatorios: latencias.length,
      erros,
      relatoriosPorSegundo: arred(latencias.length / duracaoS, 2),
      latenciaMedianaMs: latencias.length ? arred(mediana(latencias)) : null,
      latenciaP95Ms: latencias.length ? arred(percentil(latencias, 95)) : null,
    };
  }

  // --- ambiente ---
  async function ambiente() {
    const [{ v }] = await prisma.$queryRaw<{ v: string }[]>`SELECT version() AS v`;
    const ajustes = await prisma.$queryRaw<{ name: string; setting: string }[]>`SELECT name, setting FROM pg_settings WHERE name IN ('max_connections','shared_buffers','work_mem','max_parallel_workers_per_gather','max_worker_processes')`;
    let docker = 'indisponível';
    try {
      docker = execFileSync('docker', ['info', '--format', 'CPUs={{.NCPU}} memoria={{.MemTotal}} servidor={{.ServerVersion}}'], { encoding: 'utf-8' }).trim();
    } catch {
      /* Docker CLI não encontrado: segue sem a informação */
    }
    return {
      dataExecucao: new Date().toISOString(),
      sistema: `${platform()} ${release()}`,
      processador: `${cpus()[0].model} (${cpus().length} threads)`,
      memoriaTotalGB: arred(totalmem() / 1024 ** 3),
      node: process.version,
      docker,
      postgres: v.split(' on ')[0],
      ajustesPostgres: Object.fromEntries(ajustes.map(a => [a.name, a.setting])),
      poolDeConexoesPorInstancia: Number(process.env.DB_POOL_MAX) || 10,
      banco: NOME_BANCO,
      redis: 'Redis 7 (Docker), db 2',
    };
  }

  const escalaMaior = Math.max(...ESCALAS);

  // ─── fase "pool": roda só a comparação do dashboard na maior escala com o pool atual (processos filhos) ───
  if (FASE === 'pool') {
    await preparar(escalaMaior);
    const r = await comparar(chamadas('ano').dashboardAdmin);
    console.log(`RESULTADO_POOL ${JSON.stringify({ pool: Number(process.env.DB_POOL_MAX) || 10, retentativas, ...r })}`);
    await prisma.$disconnect();
    await closeRedis();
    return;
  }

  // ─── fase "carga": só a etapa de vários clientes simultâneos, com duração configurável (--duracao-carga=30) ───
  if (FASE === 'carga') {
    await preparar(escalaMaior);
    const cargas: unknown[] = [];
    for (const clientes of CLIENTES.length ? CLIENTES : [1, 4, 10]) for (const modo of ['sequencial', 'concorrente'] as const) cargas.push(await carga(modo, clientes));
    mkdirSync(PASTA_SAIDA, { recursive: true });
    const arquivoCarga = resolve(PASTA_SAIDA, `benchmark-carga-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    writeFileSync(arquivoCarga, JSON.stringify({ metodologia: { duracaoPorCelulaS: DURACAO_CARGA_MS / 1000, pedidos: escalaMaior, retentativasPorConexaoInterrompida: retentativas }, ambiente: await ambiente(), cargaComVariosClientes: cargas }, null, 2), 'utf-8');
    console.table(cargas);
    console.log(`Resultados salvos em ${arquivoCarga}`);
    await prisma.$disconnect();
    await closeRedis();
    return;
  }

  const saida: Record<string, unknown> = { metodologia: { repeticoes: REPETICOES, aquecimento: AQUECIMENTO, escalas: ESCALAS, ordem: 'alternada a cada repetição', equivalencia: 'conferida a cada repetição (ignorando geradoEmMs)' }, ambiente: await ambiente(), comparacoes: [] as unknown[] };
  const comparacoes = saida.comparacoes as unknown[];

  // ─── saída: gravada após cada etapa, para uma falha tardia não perder o que já foi medido ───
  const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
  const arquivo = resolve(PASTA_SAIDA, `benchmark-paralelismo-${carimbo}.json`);
  const gravar = () => {
    (saida.metodologia as Record<string, unknown>).retentativasPorConexaoInterrompida = retentativas;
    mkdirSync(PASTA_SAIDA, { recursive: true });
    const json = JSON.stringify(saida, null, 2);
    writeFileSync(arquivo, json, 'utf-8');
    writeFileSync(resolve(PASTA_SAIDA, 'benchmark-paralelismo-ultimo.json'), json, 'utf-8');
    const linhas = (comparacoes as Record<string, unknown>[]).map(c => {
      const e = c.escala as { pedidos: number };
      const sq = c.sequencialMs as Resumo;
      const cc = c.concorrenteMs as Resumo;
      return `${e.pedidos},${String(c.periodo)},${String(c.relatorio)},${sq.mediana},${cc.mediana},${sq.media},${cc.media},${sq.p95},${cc.p95},${String(c.speedupMediana)},${String(c.reducaoPercentualMediana)}`;
    });
    writeFileSync(resolve(PASTA_SAIDA, 'benchmark-paralelismo-resumo.csv'), ['pedidos,periodo,relatorio,seq_mediana_ms,conc_mediana_ms,seq_media_ms,conc_media_ms,seq_p95_ms,conc_p95_ms,speedup,reducao_pct', ...linhas].join('\n'), 'utf-8');
  };

  for (const escala of ESCALAS) {
    console.log(`\n▶ Preparando ${escala.toLocaleString('pt-BR')} pedidos...`);
    const volume = await preparar(escala);
    for (const periodo of ['ano', 'mes'] as const) {
      for (const [relatorio, chamada] of Object.entries(chamadas(periodo))) {
        console.log(`  · ${relatorio} · período ${periodo} (${REPETICOES} repetições)`);
        comparacoes.push({ escala: { pedidos: volume.pedidos, itens: volume.itens }, periodo, relatorio, ...(await comparar(chamada)) });
        gravar();
      }
    }
  }

  if (POOLS.length) {
    console.log('\n▶ Efeito do tamanho do pool de conexões (processos separados)');
    const varredura: unknown[] = [];
    for (const pool of POOLS) {
      const comando = `npx tsx scripts/benchmark-paralelismo.ts --fase=pool --escalas=${escalaMaior} --repeticoes=${REPETICOES} --aquecimento=${AQUECIMENTO}`;
      const texto = execFileSync(comando, { shell: true, encoding: 'utf-8', cwd: resolve(__dirname, '..'), env: { ...process.env, DB_POOL_MAX: String(pool) }, maxBuffer: 64 * 1024 * 1024 });
      const linha = texto.split('\n').find(l => l.startsWith('RESULTADO_POOL '));
      if (!linha) throw new Error(`Pool ${pool}: o processo filho não devolveu resultado`);
      const parsed: unknown = JSON.parse(linha.slice('RESULTADO_POOL '.length));
      varredura.push(parsed);
      console.log(`  · pool ${pool}: concluído`);
    }
    saida.varreduraDePool = varredura;
    gravar();
  }

  if (CLIENTES.length) {
    console.log('\n▶ Carga com vários clientes simultâneos (dashboard, período ano)');
    const cargas: unknown[] = [];
    for (const clientes of CLIENTES) for (const modo of ['sequencial', 'concorrente'] as const) cargas.push(await carga(modo, clientes));
    saida.cargaComVariosClientes = cargas;
    gravar();
  }

  gravar();

  console.log('\n══ Resumo (medianas, ms) ══');
  console.table(
    (comparacoes as Record<string, unknown>[]).map(c => ({
      pedidos: (c.escala as { pedidos: number }).pedidos,
      periodo: c.periodo,
      relatorio: c.relatorio,
      sequencial: (c.sequencialMs as Resumo).mediana,
      concorrente: (c.concorrenteMs as Resumo).mediana,
      speedup: c.speedupMediana,
      'redução %': c.reducaoPercentualMediana,
      'pico servidor': (c.sobreposicaoPicoServidor as Record<string, number>).concorrente,
      divergências: c.divergenciasDeResultado,
    })),
  );
  console.log(`\nResultados salvos em ${arquivo}`);

  await prisma.$disconnect();
  await closeRedis();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
