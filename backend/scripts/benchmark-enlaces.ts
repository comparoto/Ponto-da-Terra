/**
 * Decomposição do caminho de rede (SO, Unidade 2): em cada requisição HTTPS com conexão NOVA, separa o tempo em
 * DNS, conexão TCP, handshake TLS, espera pelo servidor e download.
 *
 * Uso:   cd backend && npm run benchmark:enlaces -- --alvo=https://ponto-da-terra-api.vercel.app/api
 *        npm run benchmark:enlaces -- --alvo=... --amostras=30
 *
 * Por que serve para a topologia:
 *  - o tempo de conexão TCP é, aproximadamente, 1 RTT entre o cliente e o primeiro ponto que atende a conexão
 *    (o ponto de presença da CDN, que termina o TCP e o TLS);
 *  - o tempo de "espera" cobre o caminho dali até a função da API, o processamento, as idas ao banco/Redis e a volta.
 * Assim dá para dizer quanto da latência é o enlace de acesso e quanto é o caminho interno do provedor.
 *
 * Só faz GET de leitura, com 300 ms entre as requisições. Cada requisição abre uma conexão nova (sem keep-alive).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { request } from 'node:https';
import { cpus, platform, release } from 'node:os';
import { resolve } from 'node:path';

const argumento = (nome: string) => process.argv.find(a => a.startsWith(`--${nome}=`))?.split('=')[1];
const ALVO = (argumento('alvo') ?? 'https://ponto-da-terra-api.vercel.app/api').replace(/\/$/, '');
const AMOSTRAS = Number(argumento('amostras') ?? 30);
const ROTULO = argumento('rotulo') ?? 'producao';
const PASTA_SAIDA = resolve(__dirname, '..', '..', argumento('saida') ?? 'docs/so/resultados');
const CAMINHOS = [
  { id: 'health', caminho: '/health' },
  { id: 'frete', caminho: '/frete?cep=01001000' },
];

interface Amostra {
  dnsMs: number;
  tcpMs: number;
  tlsMs: number;
  esperaMs: number;
  downloadMs: number;
  totalMs: number;
  regiao: string;
}

const arred = (x: number) => Math.round(x * 10) / 10;
const ordenado = (v: number[]) => [...v].sort((a, b) => a - b);
const mediana = (v: number[]) => {
  const o = ordenado(v);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};
const percentil = (v: number[], p: number) => ordenado(v)[Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1))];

function medirUma(url: string): Promise<Amostra> {
  return new Promise((resolver, rejeitar) => {
    const t0 = performance.now();
    let tLookup = t0;
    let tConnect = t0;
    let tSecure = t0;
    const req = request(url, { agent: false, headers: { 'Accept-Encoding': 'identity', Connection: 'close' }, timeout: 15000 }, res => {
      const tPrimeiroByte = performance.now();
      res.resume();
      res.on('end', () => {
        const fim = performance.now();
        const regiaoBruta = res.headers['x-vercel-id'];
        resolver({
          dnsMs: tLookup - t0,
          tcpMs: tConnect - tLookup,
          tlsMs: tSecure - tConnect,
          esperaMs: tPrimeiroByte - tSecure,
          downloadMs: fim - tPrimeiroByte,
          totalMs: fim - t0,
          regiao: typeof regiaoBruta === 'string' ? regiaoBruta.split('::').slice(0, 2).join('→') : 'desconhecida',
        });
      });
    });
    req.on('socket', socket => {
      socket.on('lookup', () => (tLookup = performance.now()));
      socket.on('connect', () => (tConnect = performance.now()));
      socket.on('secureConnect', () => (tSecure = performance.now()));
    });
    req.on('timeout', () => req.destroy(new Error('tempo esgotado')));
    req.on('error', rejeitar);
    req.end();
  });
}

const resumo = (v: number[]) => ({ min: arred(Math.min(...v)), mediana: arred(mediana(v)), p95: arred(percentil(v, 95)), max: arred(Math.max(...v)) });

async function principal() {
  console.log(`Alvo: ${ALVO} · ${AMOSTRAS} conexões novas por caminho\n`);
  const resultados = [];
  for (const c of CAMINHOS) {
    const amostras: Amostra[] = [];
    let falhas = 0;
    await medirUma(`${ALVO}${c.caminho}`).catch(() => undefined); // descarta a primeira (função fria)
    for (let i = 0; i < AMOSTRAS; i++) {
      try {
        amostras.push(await medirUma(`${ALVO}${c.caminho}`));
      } catch {
        falhas++;
      }
      await new Promise(r => setTimeout(r, 300));
    }
    const regioes = [...new Set(amostras.map(a => a.regiao))];
    const r = {
      caminho: c.id,
      amostras: amostras.length,
      falhas,
      regioes,
      dnsMs: resumo(amostras.map(a => a.dnsMs)),
      tcpMs: resumo(amostras.map(a => a.tcpMs)),
      tlsMs: resumo(amostras.map(a => a.tlsMs)),
      esperaMs: resumo(amostras.map(a => a.esperaMs)),
      downloadMs: resumo(amostras.map(a => a.downloadMs)),
      totalMs: resumo(amostras.map(a => a.totalMs)),
    };
    resultados.push(r);
    console.log(
      `${c.id.padEnd(7)} DNS ${r.dnsMs.mediana} · TCP ${r.tcpMs.mediana} · TLS ${r.tlsMs.mediana} · espera ${r.esperaMs.mediana} · download ${r.downloadMs.mediana} · total ${r.totalMs.mediana} ms (medianas) · regiões ${regioes.join(', ')} · falhas ${falhas}`,
    );
  }
  mkdirSync(PASTA_SAIDA, { recursive: true });
  writeFileSync(
    resolve(PASTA_SAIDA, `benchmark-enlaces-${ROTULO}.json`),
    JSON.stringify({ geradoEm: new Date().toISOString(), alvo: ALVO, cliente: { node: process.version, plataforma: `${platform()} ${release()}`, cpu: cpus()[0]?.model ?? 'desconhecida' }, parametros: { amostras: AMOSTRAS, conexaoNovaPorRequisicao: true, descartadaPrimeira: true }, resultados }, null, 2),
  );
  console.log(`\nResultados em ${PASTA_SAIDA}`);
}

principal().catch(e => {
  console.error(e);
  process.exit(1);
});
