// Gera as imagens (PNG) do diagrama de classes a partir dos blocos Mermaid de docs/md/DIAGRAMA_DE_CLASSES.md.
// O arquivo .md é gerado do schema (cd backend && npm run docs:diagrama); aqui ele só é desenhado.
// Uso: cd e2e && node gerar-imagens-diagrama.cjs   (precisa de internet: baixa o Mermaid de um CDN)
// Saída: docs/diagramas/*.png (fundo salmão, caixas claras, como no diagrama da 1ª unidade).
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright-core');

const RAIZ = path.resolve(__dirname, '..');
const MD = path.join(RAIZ, 'docs', 'md', 'DIAGRAMA_DE_CLASSES.md');
const SAIDA = path.join(RAIZ, 'docs', 'diagramas');
const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js';
const FUNDO = '#ffdfcf';

const slug = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Lê os blocos: cada "## Título" seguido de um bloco ```mermaid
const md = fs.readFileSync(MD, 'utf-8').replace(/\r\n/g, '\n');
const blocos = [];
for (const secao of md.split(/^## /m).slice(1)) {
  const titulo = secao.split('\n')[0].trim();
  const m = /```mermaid\n([\s\S]*?)```/.exec(secao);
  if (m) blocos.push({ titulo, codigo: m[1] });
}
if (!blocos.length) throw new Error('Nenhum bloco mermaid encontrado em ' + MD);
fs.mkdirSync(SAIDA, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER ?? 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  await page.setContent(`<html><body style="margin:0;background:${FUNDO}"><div id="alvo" style="display:inline-block;padding:40px"></div></body></html>`);
  await page.addScriptTag({ url: MERMAID });
  await page.evaluate(fundo => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      maxTextSize: 1000000,
      theme: 'base',
      class: { useMaxWidth: false },
      themeVariables: {
        background: fundo,
        primaryColor: '#ffffff',
        primaryBorderColor: '#1b1b3a',
        primaryTextColor: '#1b1b3a',
        secondaryColor: '#ffffff',
        tertiaryColor: '#ffffff',
        lineColor: '#111111',
        textColor: '#1b1b3a',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '15px',
      },
    });
  }, FUNDO);

  for (const [i, { titulo, codigo }] of blocos.entries()) {
    const svg = await page.evaluate(async ({ codigo, i }) => {
      const r = await mermaid.render('d' + i, codigo);
      document.getElementById('alvo').innerHTML = r.svg;
      return true;
    }, { codigo, i });
    if (!svg) throw new Error('Falha ao desenhar ' + titulo);
    const tam = await page.evaluate(() => {
      const el = document.querySelector('#alvo svg');
      // O Mermaid devolve largura 100%: fixa o tamanho natural pelo viewBox
      const vb = el.viewBox.baseVal;
      el.setAttribute('width', String(Math.ceil(vb.width)));
      el.setAttribute('height', String(Math.ceil(vb.height)));
      el.style.maxWidth = 'none';
      return { w: Math.ceil(vb.width) + 80, h: Math.ceil(vb.height) + 80 };
    });
    await page.setViewportSize({ width: Math.min(tam.w, 8000), height: Math.min(tam.h, 8000) });
    // limita a imagem a ~12.000 px no maior lado
    const escala = Math.max(1, Math.min(3, 12000 / Math.max(tam.w, tam.h)));
    const ctx = page.context();
    const alvo = page.locator('#alvo');
    const arquivo = path.join(SAIDA, `${String(i + 1).padStart(2, '0')}-${slug(titulo)}.png`);
    await alvo.screenshot({ path: arquivo, scale: 'device' });
    console.log(`${path.relative(RAIZ, arquivo)}  (${tam.w}x${tam.h} px lógicos, escala do dispositivo 2)`);
    void escala; void ctx;
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
