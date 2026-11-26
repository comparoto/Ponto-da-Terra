/**
 * Coleta o painel de monitoramento (GET /api/admin/monitoramento) várias vezes e resume o que ele mede:
 * RTT, jitter e perda das sondas ao PostgreSQL e ao Redis, e o tempo de resposta da própria consulta ao painel.
 *
 * Uso:   cd backend && npm run monitoramento:coletar -- --alvo=https://ponto-da-terra-api.vercel.app/api \
 *            --email=admin@pontodaterra.com --senha=admin123 --rotulo=producao
 *        (--leituras=15 --intervalo=3 controlam o número de leituras e a pausa, em segundos)
 *
 * Somente leitura: faz um login e GETs do painel. Não grava a senha nem o token em lugar nenhum.
 * O que isto mede de verdade: as sondas rodam DENTRO da API; em produção, portanto, mostram o RTT entre a função da
 * Vercel e o banco/Redis (e não entre o seu computador e eles).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argumento = (nome: string) => process.argv.find(a => a.startsWith(`--${nome}=`))?.split('=')[1];
const ALVO = (argumento('alvo') ?? 'http://localhost:3333/api').replace(/\/$/, '');
const EMAIL = argumento('email') ?? 'admin@pontodaterra.com';
const SENHA = argumento('senha') ?? 'admin123';
const ROTULO = argumento('rotulo') ?? 'local';
const LEITURAS = Number(argumento('leituras') ?? 15);
const INTERVALO_S = Number(argumento('intervalo') ?? 3);
const PASTA_SAIDA = resolve(__dirname, '..', '..', argumento('saida') ?? 'docs/so/resultados');

interface Sonda {
  alvo: 'banco' | 'redis';
  disponivel: boolean;
  rttMs: { mediana: number; p95: number };
  jitterMs: number;
  perdaPct: number;
}
interface RespostaPainel {
  data: {
    instancia: { pid: number; ativaHaSegundos: number; ambiente: string };
    dependencias: Sonda[];
    processo: { lacoDeEventos: { p99Ms: number }; memoriaRssMb: number };
    filaDeEventos: { pendentes: number };
  } | null;
}

const arred = (x: number, c = 2) => Math.round(x * 10 ** c) / 10 ** c;
const ordenado = (v: number[]) => [...v].sort((a, b) => a - b);
const mediana = (v: number[]) => {
  const o = ordenado(v);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};
const resumo = (v: number[]) => (v.length ? { min: arred(Math.min(...v)), mediana: arred(mediana(v)), max: arred(Math.max(...v)) } : { min: 0, mediana: 0, max: 0 });

async function principal() {
  const login = await fetch(`${ALVO}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, senha: SENHA }) });
  const corpo = (await login.json()) as { data?: { token?: string } };
  const token = corpo.data?.token;
  if (!token) throw new Error(`Login falhou (HTTP ${login.status})`);
  console.log(`Alvo: ${ALVO} (${ROTULO}) · ${LEITURAS} leituras, ${INTERVALO_S}s entre elas\n`);

  const banco: number[] = [];
  const redis: number[] = [];
  const jitterBanco: number[] = [];
  const jitterRedis: number[] = [];
  const respostaMs: number[] = [];
  const lacoP99: number[] = [];
  const instancias = new Set<string>();
  let perdas = 0;
  let falhasDaConsulta = 0;
  let ambiente = '';
  let filaPendentes = 0;

  for (let i = 0; i < LEITURAS; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${ALVO}/admin/monitoramento?janela=300`, { headers: { Authorization: `Bearer ${token}` } });
      const json = (await res.json()) as RespostaPainel;
      respostaMs.push(performance.now() - t0);
      if (!res.ok || !json.data) {
        falhasDaConsulta++;
      } else {
        const d = json.data;
        ambiente = d.instancia.ambiente;
        instancias.add(String(d.instancia.pid));
        filaPendentes = d.filaDeEventos.pendentes;
        lacoP99.push(d.processo.lacoDeEventos.p99Ms);
        for (const s of d.dependencias) {
          if (s.alvo === 'banco') (banco.push(s.rttMs.mediana), jitterBanco.push(s.jitterMs));
          else (redis.push(s.rttMs.mediana), jitterRedis.push(s.jitterMs));
          perdas += s.perdaPct > 0 ? 1 : 0;
        }
      }
    } catch {
      falhasDaConsulta++;
    }
    if (i < LEITURAS - 1) await new Promise(r => setTimeout(r, INTERVALO_S * 1000));
  }

  const resultado = {
    geradoEm: new Date().toISOString(),
    rotulo: ROTULO,
    alvo: ALVO,
    ambienteInformadoPelaApi: ambiente,
    parametros: { leituras: LEITURAS, intervaloS: INTERVALO_S, sondasPorLeitura: 5 },
    instanciasDistintas: instancias.size,
    falhasDaConsulta,
    leiturasComPerdaNasSondas: perdas,
    bancoRttMedianoMs: resumo(banco),
    bancoJitterMs: resumo(jitterBanco),
    redisRttMedianoMs: resumo(redis),
    redisJitterMs: resumo(jitterRedis),
    tempoDeRespostaDaConsultaAoPainelMs: { ...resumo(respostaMs), p95: arred(ordenado(respostaMs)[Math.min(respostaMs.length - 1, Math.ceil(0.95 * respostaMs.length) - 1)] ?? 0) },
    lacoDeEventosP99Ms: resumo(lacoP99),
    eventosPendentesNaUltimaLeitura: filaPendentes,
  };
  console.log(JSON.stringify(resultado, null, 2));
  mkdirSync(PASTA_SAIDA, { recursive: true });
  writeFileSync(resolve(PASTA_SAIDA, `monitoramento-${ROTULO}.json`), JSON.stringify(resultado, null, 2));
  console.log(`\nResultados em ${PASTA_SAIDA}/monitoramento-${ROTULO}.json`);
}

principal().catch(e => {
  console.error(e);
  process.exit(1);
});
