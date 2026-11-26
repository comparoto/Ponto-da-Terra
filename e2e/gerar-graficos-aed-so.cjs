// Gera os gráficos dos relatórios de AED e SO a partir dos JSON dos benchmarks (docs/aed/resultados e docs/so/resultados).
// Uso: cd e2e && node gerar-graficos-aed-so.cjs        (grava os PNGs ao lado dos JSON)
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const RAIZ = path.resolve(__dirname, '..');
const PASTA_AED = path.join(RAIZ, 'docs', 'aed', 'resultados');
const PASTA_SO = path.join(RAIZ, 'docs', 'so', 'resultados');
const ler = (pasta, nome) => JSON.parse(fs.readFileSync(path.join(pasta, nome), 'utf-8'));

const CORES = ['#8a8f98', '#2b7a4b', '#c2703d', '#3c6fb0'];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fmt = n => (Math.abs(n) >= 100 ? Math.round(n).toLocaleString('pt-BR') : String(Math.round(n * 100) / 100).replace('.', ','));

/** Gráfico de barras agrupadas. grupos: [{ rotulo, valores: [v1, v2...], extra? }], series: [{ nome, cor }] */
function barras({ titulo, subtitulo, eixoY, grupos, series, largura = 900, altura = 520, formato = fmt, inclinar = false }) {
  const m = { e: 80, d: 30, t: 90, b: inclinar ? 150 : 100 };
  const w = largura - m.e - m.d;
  const h = altura - m.t - m.b;
  const max = Math.max(...grupos.flatMap(g => g.valores.filter(v => v != null)), 0.0001) * 1.18;
  const y = v => m.t + h - (v / max) * h;
  const passo = w / grupos.length;
  const larg = Math.min(70, (passo * 0.8) / series.length);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" font-family="Segoe UI, Arial, sans-serif"><rect width="100%" height="100%" fill="white"/>`;
  svg += `<text x="${largura / 2}" y="30" text-anchor="middle" font-size="19" font-weight="700" fill="#1b1b3a">${esc(titulo)}</text>`;
  if (subtitulo) svg += `<text x="${largura / 2}" y="52" text-anchor="middle" font-size="13" fill="#555">${esc(subtitulo)}</text>`;
  for (let i = 0; i <= 5; i++) {
    const v = (max / 5) * i;
    svg += `<line x1="${m.e}" y1="${y(v)}" x2="${largura - m.d}" y2="${y(v)}" stroke="#e3e3e3"/><text x="${m.e - 8}" y="${y(v) + 4}" text-anchor="end" font-size="12" fill="#555">${fmt(v)}</text>`;
  }
  svg += `<text transform="translate(18 ${m.t + h / 2}) rotate(-90)" text-anchor="middle" font-size="13" fill="#333">${esc(eixoY)}</text>`;
  grupos.forEach((g, gi) => {
    const x0 = m.e + passo * gi + passo / 2 - (larg * series.length) / 2;
    g.valores.forEach((v, si) => {
      if (v == null) return;
      const x = x0 + larg * si;
      const vp = Math.max(v, 0); // valores negativos (ruído de medição) aparecem como barra vazia, com o número no rótulo
      svg += `<rect x="${x}" y="${y(vp)}" width="${larg - 4}" height="${Math.max(0, m.t + h - y(vp))}" fill="${series[si].cor}" rx="2"/><text x="${x + (larg - 4) / 2}" y="${y(vp) - 6}" text-anchor="middle" font-size="11" font-weight="600" fill="#222">${formato(v)}</text>`;
    });
    const cx = m.e + passo * gi + passo / 2;
    svg += inclinar
      ? `<text transform="translate(${cx + 6} ${m.t + h + 18}) rotate(-35)" text-anchor="end" font-size="12" fill="#222">${esc(g.rotulo)}</text>`
      : `<text x="${cx}" y="${m.t + h + 22}" text-anchor="middle" font-size="12" fill="#222">${esc(g.rotulo)}</text>`;
    if (g.extra) svg += `<text x="${m.e + passo * gi + passo / 2}" y="${m.t + h + 40}" text-anchor="middle" font-size="11" font-weight="700" fill="#2b7a4b">${esc(g.extra)}</text>`;
  });
  series.forEach((s, i) => {
    const x = m.e + i * 190;
    svg += `<rect x="${x}" y="${altura - 26}" width="14" height="14" fill="${s.cor}" rx="2"/><text x="${x + 20}" y="${altura - 14}" font-size="13" fill="#333">${esc(s.nome)}</text>`;
  });
  return svg + '</svg>';
}

const graficos = [];

// ───────────── AED ─────────────
if (fs.existsSync(path.join(PASTA_AED, 'benchmark-aed-ultimo.json'))) {
  const aed = ler(PASTA_AED, 'benchmark-aed-ultimo.json');
  const exp = id => aed.experimentos.find(e => e.id === id);
  const us = (id, n) => {
    const m = exp(id)?.medicoes.find(x => x.n === n);
    return m ? Math.round(m.msPorOperacao * 1000 * 1000) / 1000 : null; // µs por operação
  };
  const volumes = [1000, 10000, 100000];
  graficos.push({
    arquivo: 'grafico-1-busca-por-codigo.png',
    svg: barras({
      titulo: 'Achar um produto pelo código: tempo por busca',
      subtitulo: 'Mediana por volume de produtos (menor é melhor); o hash e a árvore ficam quase planos, a linear cresce com n',
      eixoY: 'microssegundos por busca (µs)',
      largura: 1000,
      series: [
        { nome: 'Linear (array)', cor: CORES[0] },
        { nome: 'Binária (ordenado)', cor: CORES[3] },
        { nome: 'Índice hash', cor: CORES[1] },
        { nome: 'BST (aleatória)', cor: CORES[2] },
      ],
      grupos: volumes.map(n => ({ rotulo: `${n.toLocaleString('pt-BR')} produtos`, valores: [us('busca-linear', n), us('busca-binaria', n), us('indice-hash-obter', n), us('bst-buscar-aleatoria', n)] })),
    }),
  });

  const ordenado = exp('lista-inserir-ordenado-aleatorio');
  if (ordenado) {
    graficos.push({
      arquivo: 'grafico-2-insercao-ordenada.png',
      svg: barras({
        titulo: 'Inserção ordenada na lista encadeada (ordem aleatória)',
        subtitulo: 'Custo POR inserção cresce com o tamanho da lista: O(n) por inserção, O(n²) para montar tudo',
        eixoY: 'microssegundos por inserção (µs)',
        series: [{ nome: 'Lista encadeada, inserção ordenada', cor: CORES[2] }],
        grupos: ordenado.medicoes.map(m => ({ rotulo: `n = ${m.n.toLocaleString('pt-BR')}`, valores: [Math.round(m.msPorOperacao * 1000 * 1000) / 1000] })),
      }),
    });
  }

  const alvos = aed.experimentos.filter(e => e.inclinacaoEsperada != null);
  graficos.push({
    arquivo: 'grafico-3-inclinacao-medida.png',
    svg: barras({
      titulo: 'Complexidade medida × teórica (inclinação no gráfico log-log)',
      subtitulo: '0 ≈ O(1) · 0,1 ≈ O(log n) · 1 ≈ O(n) · 2 ≈ O(n²). Valores acima do esperado em O(1)/O(log n) vêm do cache da CPU.',
      eixoY: 'inclinação',
      largura: 1300,
      altura: 640,
      inclinar: true,
      series: [{ nome: 'Esperada', cor: CORES[0] }, { nome: 'Medida', cor: CORES[1] }],
      grupos: alvos.map(e => ({ rotulo: e.id, valores: [e.inclinacaoEsperada, Math.round(e.inclinacaoMedida * 100) / 100] })),
      formato: v => String(Math.round(v * 100) / 100).replace('.', ','),
    }),
  });
}

// ───────────── SO: threads ─────────────
if (fs.existsSync(path.join(PASTA_SO, 'benchmark-threads-ultimo.json'))) {
  const t = ler(PASTA_SO, 'benchmark-threads-ultimo.json');
  graficos.push({
    arquivo: 'grafico-4-threads-speedup.png',
    svg: barras({
      titulo: 'Reserva de estoque em threads: ganho de tempo (speedup)',
      subtitulo: `${t.parametros.pedidos.toLocaleString('pt-BR')} pedidos, mediana de ${t.parametros.repeticoes} repetições, máquina com ${t.ambiente.nucleos} núcleos (maior é melhor)`,
      eixoY: 'speedup (vezes)',
      series: [{ nome: 'Ideal (linear)', cor: CORES[0] }, { nome: 'Medido', cor: CORES[1] }],
      grupos: t.escalonamento.map(e => ({ rotulo: `${e.threads} thread${e.threads > 1 ? 's' : ''}`, valores: [e.threads, e.speedup], extra: `${fmt(e.medianaMs)} ms · efic. ${String(e.eficiencia).replace('.', ',')}` })),
    }),
  });
  const c = t.corrida;
  graficos.push({
    arquivo: 'grafico-5-condicao-de-corrida.png',
    svg: barras({
      titulo: 'Condição de corrida: com e sem sincronização',
      subtitulo: `${c.threads} threads, ${c.semSincronizacao.execucoes} execuções de cada versão sobre os mesmos pedidos`,
      eixoY: 'execuções com estoque inconsistente',
      series: [{ nome: 'Execuções inconsistentes', cor: CORES[2] }],
      grupos: [
        { rotulo: 'Sem sincronização', valores: [c.semSincronizacao.inconsistentes], extra: `${fmt(c.semSincronizacao.atualizacoesPerdidasMediana)} un. com baixa perdida (mediana)` },
        { rotulo: 'Com compare-and-swap', valores: [c.comSincronizacao.inconsistentes], extra: `${fmt(c.comSincronizacao.atualizacoesPerdidasMediana)} un. com baixa perdida` },
      ],
      largura: 820,
    }),
  });
}

// ───────────── SO: rede ─────────────
const ambientes = [['local', 'Local (sem rede)'], ['conteiner', 'Contêiner Docker'], ['producao', 'Produção (Vercel)']].filter(([id]) => fs.existsSync(path.join(PASTA_SO, `benchmark-rede-${id}.json`)));
if (ambientes.length) {
  const dados = ambientes.map(([id, nome]) => ({ nome, ...ler(PASTA_SO, `benchmark-rede-${id}.json`) }));
  const endpoints = dados[0].sequencial.map(s => s.endpoint);
  graficos.push({
    arquivo: 'grafico-6-latencia-p95.png',
    svg: barras({
      titulo: 'Latência p95 por endpoint e ambiente',
      subtitulo: 'Requisições sequenciais de leitura medidas no cliente (menor é melhor). Requisito de negócio do frete: p95 ≤ 300 ms',
      eixoY: 'p95 (ms)',
      largura: 1000,
      series: dados.map((d, i) => ({ nome: d.nome, cor: CORES[i] })),
      grupos: endpoints.map(e => ({ rotulo: e, valores: dados.map(d => d.sequencial.find(s => s.endpoint === e)?.latenciaMs.p95 ?? null) })),
    }),
  });
  graficos.push({
    arquivo: 'grafico-7-jitter.png',
    svg: barras({
      titulo: 'Jitter por endpoint e ambiente',
      subtitulo: 'Média da diferença entre latências consecutivas (menor é melhor)',
      eixoY: 'jitter (ms)',
      largura: 1000,
      series: dados.map((d, i) => ({ nome: d.nome, cor: CORES[i] })),
      grupos: endpoints.map(e => ({ rotulo: e, valores: dados.map(d => d.sequencial.find(s => s.endpoint === e)?.jitterMs ?? null) })),
    }),
  });
  const maxNiveis = Math.max(...dados.map(d => d.sobCarga.length));
  graficos.push({
    arquivo: 'grafico-8-vazao.png',
    svg: barras({
      titulo: 'Vazão da vitrine com conexões simultâneas',
      subtitulo: 'Respostas válidas por segundo; produção limitada a no máximo 10 conexões (maior é melhor)',
      eixoY: 'requisições por segundo',
      largura: 1000,
      series: dados.map((d, i) => ({ nome: d.nome, cor: CORES[i] })),
      grupos: Array.from({ length: maxNiveis }, (_, i) => ({
        rotulo: dados.map(d => d.sobCarga[i]?.conexoes).filter(Boolean).join(' / ') + ' conexões',
        valores: dados.map(d => d.sobCarga[i]?.vazaoReqPorSeg ?? null),
      })),
    }),
  });
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER ?? 'msedge', headless: true });
  for (const g of graficos) {
    const pasta = g.arquivo.match(/grafico-[123]-/) ? PASTA_AED : PASTA_SO;
    const page = await browser.newPage({ deviceScaleFactor: 2 });
    await page.setContent(`<html><body style="margin:0;background:white">${g.svg}</body></html>`);
    await page.locator('svg').first().screenshot({ path: path.join(pasta, g.arquivo) });
    await page.close();
    console.log('gerado', path.relative(RAIZ, path.join(pasta, g.arquivo)));
  }
  await browser.close();
})();
