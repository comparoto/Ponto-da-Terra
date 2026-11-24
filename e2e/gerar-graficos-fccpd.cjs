// Gera os gráficos do relatório de FCCPD (Unidade 2) a partir dos JSON do benchmark de paralelismo.
// Uso: cd e2e && node gerar-graficos-fccpd.cjs   (lê docs/fccpd/resultados/, grava PNGs na mesma pasta)
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const PASTA = path.resolve(__dirname, '..', 'docs', 'fccpd', 'resultados');
const principal = JSON.parse(fs.readFileSync(path.join(PASTA, 'benchmark-paralelismo-ultimo.json'), 'utf-8'));
const arquivoCarga = fs.readdirSync(PASTA).filter(f => f.startsWith('benchmark-carga-') && f.endsWith('.json')).sort().pop();
const carga = arquivoCarga ? JSON.parse(fs.readFileSync(path.join(PASTA, arquivoCarga), 'utf-8')) : null;

const COR_SEQ = '#8a8f98';
const COR_CONC = '#2b7a4b';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fmt = n => (n >= 100 ? Math.round(n).toLocaleString('pt-BR') : String(n).replace('.', ','));

/** Gráfico de barras agrupadas. grupos: [{ rotulo, valores: [v1, v2], extra? }], séries: [{ nome, cor }] */
function barras({ titulo, subtitulo, eixoY, grupos, series, largura = 900, altura = 520, formato = fmt }) {
  const m = { e: 80, d: 30, t: 90, b: 90 };
  const w = largura - m.e - m.d;
  const h = altura - m.t - m.b;
  const max = Math.max(...grupos.flatMap(g => g.valores.filter(v => v != null))) * 1.18;
  const y = v => m.t + h - (v / max) * h;
  const passo = w / grupos.length;
  const larg = Math.min(70, (passo * 0.7) / series.length);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" font-family="Segoe UI, Arial, sans-serif"><rect width="100%" height="100%" fill="white"/>`;
  svg += `<text x="${largura / 2}" y="30" text-anchor="middle" font-size="19" font-weight="700" fill="#1b1b3a">${esc(titulo)}</text>`;
  if (subtitulo) svg += `<text x="${largura / 2}" y="52" text-anchor="middle" font-size="13" fill="#555">${esc(subtitulo)}</text>`;
  for (let i = 0; i <= 5; i++) {
    const v = (max / 5) * i;
    svg += `<line x1="${m.e}" y1="${y(v)}" x2="${largura - m.d}" y2="${y(v)}" stroke="#e3e3e3"/><text x="${m.e - 8}" y="${y(v) + 4}" text-anchor="end" font-size="12" fill="#555">${fmt(Math.round(v * 10) / 10)}</text>`;
  }
  svg += `<text transform="translate(18 ${m.t + h / 2}) rotate(-90)" text-anchor="middle" font-size="13" fill="#333">${esc(eixoY)}</text>`;
  grupos.forEach((g, gi) => {
    const x0 = m.e + passo * gi + passo / 2 - (larg * series.length) / 2;
    g.valores.forEach((v, si) => {
      if (v == null) return;
      const x = x0 + larg * si;
      svg += `<rect x="${x}" y="${y(v)}" width="${larg - 4}" height="${m.t + h - y(v)}" fill="${series[si].cor}" rx="2"/><text x="${x + (larg - 4) / 2}" y="${y(v) - 6}" text-anchor="middle" font-size="12" font-weight="600" fill="#222">${formato(v)}</text>`;
    });
    svg += `<text x="${m.e + passo * gi + passo / 2}" y="${m.t + h + 22}" text-anchor="middle" font-size="13" fill="#222">${esc(g.rotulo)}</text>`;
    if (g.extra) svg += `<text x="${m.e + passo * gi + passo / 2}" y="${m.t + h + 41}" text-anchor="middle" font-size="12" font-weight="700" fill="${COR_CONC}">${esc(g.extra)}</text>`;
  });
  series.forEach((s, i) => {
    const x = m.e + i * 200;
    svg += `<rect x="${x}" y="${altura - 26}" width="14" height="14" fill="${s.cor}" rx="2"/><text x="${x + 20}" y="${altura - 14}" font-size="13" fill="#333">${esc(s.nome)}</text>`;
  });
  return svg + '</svg>';
}

const graficos = [];

// 1) Tempo do dashboard (12 meses) por volume
const dash = principal.comparacoes.filter(c => c.relatorio === 'dashboardAdmin' && c.periodo === 'ano');
graficos.push({
  arquivo: 'grafico-1-tempo-por-volume.png',
  svg: barras({
    titulo: 'Dashboard do administrador: tempo por volume de dados',
    subtitulo: 'Mediana de 15 repetições, período de 12 meses (menor é melhor)',
    eixoY: 'tempo (ms)',
    series: [{ nome: 'Sequencial', cor: COR_SEQ }, { nome: 'Concorrente (padrão da API)', cor: COR_CONC }],
    grupos: dash.map(c => ({ rotulo: `${c.escala.pedidos.toLocaleString('pt-BR')} pedidos`, valores: [c.sequencialMs.mediana, c.concorrenteMs.mediana], extra: `speedup ${String(c.speedupMediana).replace('.', ',')}×` })),
  }),
});

// 2) Speedup de todos os relatórios e volumes
const rels = [...new Set(principal.comparacoes.map(c => `${c.relatorio === 'dashboardAdmin' ? 'Dashboard' : 'Indicadores'} · ${c.periodo === 'ano' ? '12 meses' : '1 mês'}`))];
const escalas = [...new Set(principal.comparacoes.map(c => c.escala.pedidos))];
graficos.push({
  arquivo: 'grafico-2-speedup.png',
  svg: barras({
    titulo: 'Speedup (sequencial ÷ concorrente) por relatório e volume',
    subtitulo: 'Mediana de 15 repetições; 1,0 = sem ganho',
    eixoY: 'speedup (vezes)',
    largura: 1000,
    series: escalas.map((e, i) => ({ nome: `${e.toLocaleString('pt-BR')} pedidos`, cor: ['#9ec5a8', '#4f9d6b', '#1d5a38'][i % 3] })),
    grupos: rels.map(r => ({
      rotulo: r,
      valores: escalas.map(e => principal.comparacoes.find(c => `${c.relatorio === 'dashboardAdmin' ? 'Dashboard' : 'Indicadores'} · ${c.periodo === 'ano' ? '12 meses' : '1 mês'}` === r && c.escala.pedidos === e)?.speedupMediana ?? null),
    })),
    formato: v => String(v).replace('.', ','),
  }),
});

// 3) Efeito do pool
if (principal.varreduraDePool) {
  graficos.push({
    arquivo: 'grafico-3-pool-de-conexoes.png',
    svg: barras({
      titulo: 'Efeito do tamanho do pool de conexões no ganho',
      subtitulo: 'Dashboard (12 meses) com 300 mil pedidos; 15 repetições por pool',
      eixoY: 'speedup (vezes)',
      series: [{ nome: 'Speedup (sequencial ÷ concorrente)', cor: COR_CONC }],
      grupos: principal.varreduraDePool.map(p => ({ rotulo: `pool = ${p.pool}`, valores: [p.speedupMediana], extra: `conc. ${fmt(p.concorrenteMs.mediana)} ms · seq. ${fmt(p.sequencialMs.mediana)} ms` })),
      formato: v => String(v).replace('.', ','),
      largura: 820,
    }),
  });
}

// 4) Carga com vários clientes
if (carga) {
  const por = n => carga.cargaComVariosClientes.filter(c => c.clientes === n);
  const clientes = [...new Set(carga.cargaComVariosClientes.map(c => c.clientes))];
  graficos.push({
    arquivo: 'grafico-4-carga-vazao.png',
    svg: barras({
      titulo: 'Vazão com vários clientes simultâneos',
      subtitulo: `Dashboard (12 meses), ${fmt(carga.metodologia.pedidos)} pedidos, ${carga.metodologia.duracaoPorCelulaS} s por célula, 1 execução (maior é melhor)`,
      eixoY: 'relatórios por segundo',
      series: [{ nome: 'Sequencial', cor: COR_SEQ }, { nome: 'Concorrente', cor: COR_CONC }],
      grupos: clientes.map(n => ({ rotulo: `${n} cliente${n > 1 ? 's' : ''}`, valores: ['sequencial', 'concorrente'].map(m => por(n).find(c => c.modo === m)?.relatoriosPorSegundo ?? null) })),
      formato: v => String(v).replace('.', ','),
    }),
  });
  graficos.push({
    arquivo: 'grafico-5-carga-latencia-p95.png',
    svg: barras({
      titulo: 'Latência p95 com vários clientes simultâneos',
      subtitulo: `Mesma execução: dashboard (12 meses), ${fmt(carga.metodologia.pedidos)} pedidos (menor é melhor)`,
      eixoY: 'p95 (ms)',
      series: [{ nome: 'Sequencial', cor: COR_SEQ }, { nome: 'Concorrente', cor: COR_CONC }],
      grupos: clientes.map(n => ({ rotulo: `${n} cliente${n > 1 ? 's' : ''}`, valores: ['sequencial', 'concorrente'].map(m => por(n).find(c => c.modo === m)?.latenciaP95Ms ?? null) })),
    }),
  });
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER ?? 'msedge', headless: true });
  for (const g of graficos) {
    const page = await browser.newPage({ deviceScaleFactor: 2 });
    await page.setContent(`<html><body style="margin:0;background:white">${g.svg}</body></html>`);
    const el = await page.locator('svg').first();
    await el.screenshot({ path: path.join(PASTA, g.arquivo) });
    await page.close();
    console.log('gerado', g.arquivo);
  }
  await browser.close();
})();
