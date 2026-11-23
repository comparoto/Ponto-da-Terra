// Gera o diagrama de casos de uso (SVG e PNG) do Ponto da Terra, atualizado com o que foi implementado.
// O layout é fixo (um bloco por ator, casos em colunas, atores externos à direita), para as linhas não se cruzarem.
// Uso: cd e2e && node gerar-diagrama-casos-de-uso.cjs   (não precisa de internet)
// Saída em docs/diagramas/: casos-de-uso.png/.svg (limpo) e casos-de-uso-com-novidades-destacadas.png (novos em verde).
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright-core');

const RAIZ = path.resolve(__dirname, '..');
const SAIDA = path.join(RAIZ, 'docs', 'diagramas');
const LINHA = 72; // altura de cada linha da grade
const COLUNAS = [500, 1040, 1500, 1910]; // centro (x) de cada coluna de casos
const X_ATOR = 110;
const X_EXTERNO = 2300;

// ───────────── Modelo ─────────────
// c = coluna (0..3), l = linha dentro do bloco (aceita fracionária); novo = não estava no diagrama da 1ª unidade
const BLOCOS = [
  {
    ator: 'Comprador',
    casos: {
      c1: { t: 'C1. Cadastrar-se', c: 0, l: 0 },
      c2: { t: 'C2. Fazer login', c: 0, l: 1 },
      c3: { t: 'C3. Alterar ou recuperar senha', c: 0, l: 2, novo: true },
      c4: { t: 'C4. Visualizar vitrines', c: 0, l: 3 },
      c5: { t: 'C5. Ver recomendações\n(Feitas para você)', c: 0, l: 4, novo: true },
      c6: { t: 'C6. Buscar e filtrar produtos', c: 0, l: 5 },
      c8: { t: 'C8. Contatar artesão', c: 0, l: 6 },
      c9: { t: 'C9. Favoritar peça', c: 0, l: 7, novo: true },
      c10: { t: 'C10. Acessar perfil do artesão', c: 0, l: 8, novo: true },
      c7: { t: 'C7. Visualizar detalhes do produto', c: 1, l: 6.5 },
      c11: { t: 'C11. Adicionar ao carrinho', c: 2, l: 6.5 },
      c12: { t: 'C12. Consultar frete e prazo', c: 3, l: 6.5 },
      c13: { t: 'C13. Finalizar compra', c: 0, l: 10 },
      c15: { t: 'C14.1 Pagar com PIX', c: 0, l: 11 },
      c16: { t: 'C14.2 Pagar com cartão', c: 0, l: 12 },
      c17: { t: 'C14.3 Pagar com boleto', c: 0, l: 13 },
      c14: { t: 'C14. Escolher forma de pagamento', c: 1, l: 12 },
      c18: { t: 'C15. Acompanhar pedido', c: 0, l: 14 },
      c19: { t: 'C16. Avaliar produto e artesão', c: 0, l: 15 },
      c20: { t: 'C17. Ver notificações', c: 0, l: 16, novo: true },
    },
    associacoes: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c13', 'c18', 'c19', 'c20'],
  },
  {
    ator: 'Artesão',
    casos: {
      a1: { t: 'A1. Cadastrar-se como artesão\n(aprovação do administrador)', c: 0, l: 0, novo: true },
      a2: { t: 'A2. Fazer login', c: 0, l: 1 },
      a3: { t: 'A3. Alterar ou recuperar senha', c: 0, l: 2, novo: true },
      a4: { t: 'A4. Gerenciar perfil do ateliê', c: 0, l: 3, novo: true },
      a5: { t: 'A5. Gerenciar catálogo de produtos', c: 0, l: 4 },
      a51: { t: 'A5.1 Cadastrar/Editar produto', c: 1, l: 4 },
      a6: { t: 'A6. Gerenciar estoque', c: 0, l: 5 },
      a7: { t: 'A7. Visualizar pedidos recebidos', c: 0, l: 6 },
      a8: { t: 'A8. Atualizar status do pedido', c: 1, l: 6 },
      a81: { t: 'A8.1 Informar código de rastreio', c: 2, l: 6 },
      a9: { t: 'A9. Receber notificações de vendas', c: 0, l: 7 },
      a10: { t: 'A10. Visualizar indicadores de vendas', c: 0, l: 8, novo: true },
      a11: { t: 'A11. Acessar Central de Orientação', c: 0, l: 9 },
    },
    associacoes: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a9', 'a10', 'a11'],
  },
  {
    ator: 'Administrador',
    casos: {
      m1: { t: 'AD1. Fazer login', c: 0, l: 0 },
      m2: { t: 'AD2. Alterar ou recuperar senha', c: 0, l: 1, novo: true },
      m3: { t: 'AD3. Moderar catálogo', c: 0, l: 2 },
      m31: { t: 'AD3.1 Aprovar/Reprovar produto', c: 1, l: 2 },
      m4: { t: 'AD4. Aprovar/Reprovar cadastro\nde artesão', c: 0, l: 3, novo: true },
      m5: { t: 'AD5. Gerenciar usuários\n(suspender, inativar, reativar)', c: 0, l: 4 },
      m6: { t: 'AD6. Acompanhar todos os pedidos', c: 0, l: 5 },
      m7: { t: 'AD7. Registrar intervenção em pedidos', c: 0, l: 6 },
      m8: { t: 'AD8. Visualizar dashboard geral', c: 0, l: 7 },
    },
    associacoes: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'],
  },
];
// [base, incluído] e [extensão, base]
const INCLUDES = [['c6', 'c7'], ['c7', 'c11'], ['c11', 'c12'], ['c13', 'c14'], ['a7', 'a8'], ['a8', 'a81']];
const EXTENDS = [['c8', 'c7'], ['c9', 'c7'], ['c10', 'c7'], ['c15', 'c14'], ['c16', 'c14'], ['c17', 'c14'], ['a51', 'a5'], ['m31', 'm3']];
// caso -> ator externo
// (o ator Frete aparece duas vezes, uma em cada bloco, para as linhas não se cruzarem)
const EXTERNAS = [['c12', 'frete'], ['a81', 'frete2'], ['c14', 'gateway'], ['a9', 'notificacao']];

// ───────────── Layout ─────────────
const ESPACO_BLOCOS = 56;
let y0 = 80;
const posicao = {}; // id -> { x, y, rx, ry, t, novo }
const atores = []; // { nome, x, y }
const largura = linhas => Math.max(...linhas.map(l => l.length)) * 7.6 + 48;
for (const bloco of BLOCOS) {
  const linhas = Math.max(...Object.values(bloco.casos).map(c => c.l)) + 1;
  for (const [id, c] of Object.entries(bloco.casos)) {
    const partes = c.t.split('\n');
    // a coluna dos casos ligados ao ator tem largura única: as linhas chegam todas à mesma borda esquerda
    const rx = c.c === 0 ? 195 : largura(partes) / 2;
    posicao[id] = { x: COLUNAS[c.c], y: y0 + c.l * LINHA, rx, ry: 12 + partes.length * 10, t: partes, novo: !!c.novo };
  }
  atores.push({ nome: bloco.ator, x: X_ATOR, y: y0 + ((linhas - 1) * LINHA) / 2 });
  bloco.fim = y0 + (linhas - 1) * LINHA;
  y0 = bloco.fim + LINHA + ESPACO_BLOCOS;
}
const yBlocoArt = BLOCOS[1];
const yPor = id => posicao[id].y;
const externos = {
  frete: { nome: 'Serviços de\nFrete/Correios', x: X_EXTERNO, y: yPor('c12') },
  frete2: { nome: 'Serviços de\nFrete/Correios', x: X_EXTERNO, y: yPor('a81') - 48 },
  gateway: { nome: 'Gateway de\nPagamento', x: X_EXTERNO, y: yPor('c14') },
  notificacao: { nome: 'Serviço de\nNotificação', x: X_EXTERNO, y: yPor('a9') + 48 },
};
const alturaTotal = y0 - ESPACO_BLOCOS + 60;
const LARGURA = X_EXTERNO + 130;
const SISTEMA = { x: 250, y: 24, w: 2090 - 250, h: alturaTotal - 24 - 40 };

// ───────────── SVG ─────────────
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// ponto da borda da elipse (cx,cy,rx,ry) na direção de (tx,ty)
function borda(e, tx, ty) {
  const dx = tx - e.x, dy = ty - e.y;
  const k = 1 / Math.sqrt((dx * dx) / (e.rx * e.rx) + (dy * dy) / (e.ry * e.ry));
  return { x: e.x + dx * k, y: e.y + dy * k };
}
const boneco = (a) => {
  const topo = a.y - 52, s = 'stroke="#111" stroke-width="1.8" fill="none" stroke-linecap="round"';
  const linhas = a.nome.split('\n');
  return `<g><circle cx="${a.x}" cy="${topo + 10}" r="10" ${s}/>
    <line x1="${a.x}" y1="${topo + 20}" x2="${a.x}" y2="${topo + 46}" ${s}/>
    <line x1="${a.x - 17}" y1="${topo + 30}" x2="${a.x + 17}" y2="${topo + 30}" ${s}/>
    <line x1="${a.x}" y1="${topo + 46}" x2="${a.x - 14}" y2="${topo + 68}" ${s}/>
    <line x1="${a.x}" y1="${topo + 46}" x2="${a.x + 14}" y2="${topo + 68}" ${s}/>
    ${linhas.map((l, i) => `<text x="${a.x}" y="${topo + 90 + i * 17}" text-anchor="middle" font-size="15" font-weight="600">${esc(l)}</text>`).join('')}</g>`;
};

function montarSvg(destacar) {
  const out = [];
  const altura = alturaTotal + (destacar ? 90 : 0);
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${LARGURA}" height="${altura}" viewBox="0 0 ${LARGURA} ${altura}" font-family="Segoe UI, Arial, sans-serif">`);
  out.push('<defs><marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9" fill="none" stroke="#222" stroke-width="1.4"/></marker></defs>');
  out.push(`<rect width="100%" height="100%" fill="white"/>`);
  out.push(`<rect x="${SISTEMA.x}" y="${SISTEMA.y}" width="${SISTEMA.w}" height="${SISTEMA.h}" fill="none" stroke="#777" stroke-width="1.4"/>`);
  out.push(`<text x="${SISTEMA.x + SISTEMA.w / 2}" y="${SISTEMA.y + 24}" text-anchor="middle" font-size="18" font-weight="700">PONTO DA TERRA</text>`);

  const seg = (a, b, estilo, rotulo, seta = true) => {
    const p1 = borda(a, b.x, b.y), p2 = borda(b, a.x, a.y);
    out.push(`<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="#222" stroke-width="1.3" ${estilo} ${seta ? 'marker-end="url(#seta)"' : ''}/>`);
    if (rotulo) {
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      out.push(`<rect x="${(mx - 34).toFixed(1)}" y="${(my - 18).toFixed(1)}" width="68" height="16" fill="white" opacity="0.92"/>`);
      out.push(`<text x="${mx.toFixed(1)}" y="${(my - 6).toFixed(1)}" text-anchor="middle" font-size="12" fill="#333">${rotulo}</text>`);
    }
  };
  // associações (ator -> caso): o "elipse" do ator é um ponto
  BLOCOS.forEach((bloco, i) => {
    const ator = atores[i];
    const pontoAtor = { x: ator.x + 22, y: ator.y - 8, rx: 1, ry: 1 };
    for (const id of bloco.associacoes) {
      // a linha chega ao ponto mais à esquerda da elipse, sem atravessar as vizinhas
      const e = posicao[id];
      out.push(`<line x1="${pontoAtor.x}" y1="${pontoAtor.y}" x2="${e.x - e.rx}" y2="${e.y}" stroke="#222" stroke-width="1.3" marker-end="url(#seta)"/>`);
    }
  });
  for (const [b, i] of INCLUDES) seg(posicao[b], posicao[i], 'stroke-dasharray="7 5"', '«include»');
  for (const [e, b] of EXTENDS) seg(posicao[e], posicao[b], 'stroke-dasharray="7 5"', '«extend»');
  for (const [c, a] of EXTERNAS) seg(posicao[c], { x: externos[a].x - 24, y: externos[a].y - 8, rx: 1, ry: 1 }, '', null, false);

  // elipses
  for (const p of Object.values(posicao)) {
    const novo = destacar && p.novo;
    out.push(`<ellipse cx="${p.x}" cy="${p.y}" rx="${p.rx.toFixed(1)}" ry="${p.ry}" fill="${novo ? '#c8ecc8' : '#f0f0f0'}" stroke="${novo ? '#2e7d32' : '#555'}" stroke-width="${novo ? 1.6 : 1.2}"/>`);
    const ini = p.y - ((p.t.length - 1) * 8) + 4.5;
    p.t.forEach((l, i) => out.push(`<text x="${p.x}" y="${(ini + i * 16).toFixed(1)}" text-anchor="middle" font-size="14" fill="#111">${esc(l)}</text>`));
  }
  for (const a of atores) out.push(boneco(a));
  for (const a of Object.values(externos)) out.push(boneco(a));

  if (destacar) {
    const y = alturaTotal + 10;
    out.push(`<ellipse cx="320" cy="${y + 14}" rx="40" ry="15" fill="#c8ecc8" stroke="#2e7d32" stroke-width="1.6"/><text x="376" y="${y + 19}" font-size="15">Caso de uso novo, implementado depois do diagrama da 1ª unidade</text>`);
    out.push(`<ellipse cx="320" cy="${y + 54}" rx="40" ry="15" fill="#f0f0f0" stroke="#555" stroke-width="1.2"/><text x="376" y="${y + 59}" font-size="15">Caso de uso que já estava no diagrama da 1ª unidade</text>`);
  }
  out.push('</svg>');
  return out.join('\n');
}

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.BROWSER ?? 'msedge', headless: true });
  for (const [arquivo, destacar] of [['casos-de-uso', false], ['casos-de-uso-com-novidades-destacadas', true]]) {
    const svg = montarSvg(destacar);
    if (!destacar) fs.writeFileSync(path.join(SAIDA, arquivo + '.svg'), svg, 'utf-8');
    const altura = alturaTotal + (destacar ? 90 : 0);
    const page = await browser.newPage({ viewport: { width: LARGURA, height: altura }, deviceScaleFactor: 2 });
    await page.setContent(`<html><body style="margin:0;background:white">${svg}</body></html>`);
    const png = path.join(SAIDA, arquivo + '.png');
    await page.screenshot({ path: png, clip: { x: 0, y: 0, width: LARGURA, height: altura } });
    await page.close();
    console.log(`${path.relative(RAIZ, png)}  (${LARGURA}x${altura} px)`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
