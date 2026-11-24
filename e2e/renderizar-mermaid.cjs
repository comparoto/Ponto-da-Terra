// Renderiza um arquivo Mermaid (.mmd) em PNG e SVG. Serve também para VALIDAR a sintaxe: se o diagrama
// tiver erro, o script falha. Precisa de internet (baixa o Mermaid, versão fixa, de um CDN).
// Uso: cd e2e && node renderizar-mermaid.cjs ../docs/fccpd/arquitetura.mmd ../docs/fccpd/arquitetura
//      (gera arquitetura.png e arquitetura.svg)
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const [entrada, saidaBase] = process.argv.slice(2);
if (!entrada || !saidaBase) {
  console.error('Uso: node renderizar-mermaid.cjs <entrada.mmd> <saida sem extensão>');
  process.exit(1);
}
const codigo = fs.readFileSync(path.resolve(entrada), 'utf-8');

(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER ?? 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  await page.setContent('<html><body style="margin:0;background:white"><div id="alvo" style="display:inline-block;padding:24px;background:white"></div></body></html>');
  await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js' });
  const resultado = await page.evaluate(async cod => {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'default', flowchart: { useMaxWidth: false, htmlLabels: true }, sequence: { useMaxWidth: false } });
    try {
      await mermaid.parse(cod);
      const r = await mermaid.render('d1', cod);
      document.getElementById('alvo').innerHTML = r.svg;
      const svg = document.querySelector('#alvo svg');
      const vb = svg.viewBox.baseVal;
      svg.setAttribute('width', String(Math.ceil(vb.width)));
      svg.setAttribute('height', String(Math.ceil(vb.height)));
      svg.style.maxWidth = 'none';
      return { ok: true, w: Math.ceil(vb.width) + 48, h: Math.ceil(vb.height) + 48, svg: r.svg };
    } catch (e) {
      return { ok: false, erro: String(e && e.message ? e.message : e) };
    }
  }, codigo);
  if (!resultado.ok) {
    console.error('Mermaid inválido:', resultado.erro);
    await browser.close();
    process.exit(1);
  }
  await page.setViewportSize({ width: Math.min(resultado.w, 8000), height: Math.min(resultado.h, 8000) });
  await page.locator('#alvo').screenshot({ path: path.resolve(saidaBase + '.png') });
  fs.writeFileSync(path.resolve(saidaBase + '.svg'), resultado.svg, 'utf-8');
  console.log(`OK: ${saidaBase}.png (${resultado.w}x${resultado.h}) e .svg`);
  await browser.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
