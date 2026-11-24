// Gera o PDF do relatório de FCCPD (Unidade 2) a partir de docs/md/RELATORIO_FCCPD_U2.md, com as imagens.
// Uso: cd e2e && node gerar-pdf-fccpd.cjs   (precisa de internet: baixa o `marked`, versão fixa, de um CDN)
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright-core');

const RAIZ = path.resolve(__dirname, '..');
const MD = path.join(RAIZ, 'docs', 'md', 'RELATORIO_FCCPD_U2.md');
const SAIDA = path.join(RAIZ, 'docs', 'fccpd', 'Relatorio-FCCPD-Unidade-2.pdf');
const markdown = fs.readFileSync(MD, 'utf-8');

const CSS = `
  @page { size: A4; margin: 16mm 14mm 18mm 14mm; }
  body { font-family: "Segoe UI", Arial, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #1d1d1d; }
  h1 { font-size: 20pt; border-bottom: 2px solid #8b5a3c; padding-bottom: 6px; color: #5a3a24; }
  h2 { font-size: 14pt; color: #5a3a24; margin-top: 22px; border-bottom: 1px solid #e0d2c8; padding-bottom: 3px; break-after: avoid; }
  h3 { font-size: 11.5pt; break-after: avoid; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0 12px; font-size: 9pt; break-inside: avoid; }
  th { background: #8b5a3c; color: #fff; text-align: left; padding: 5px 7px; }
  td { border-bottom: 1px solid #e3e3e3; padding: 4px 7px; vertical-align: top; }
  tr:nth-child(even) td { background: #faf6f3; }
  code { background: #f3eee9; padding: 1px 4px; border-radius: 3px; font-size: 9pt; }
  pre { background: #f3eee9; padding: 8px 10px; border-radius: 4px; font-size: 8.5pt; white-space: pre-wrap; break-inside: avoid; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 4px solid #c9a98f; margin: 8px 0; padding: 4px 12px; background: #faf6f3; color: #444; }
  img { max-width: 100%; display: block; margin: 10px auto; break-inside: avoid; }
  a { color: #2b5aa8; text-decoration: none; }
`;

(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER ?? 'msedge', headless: true });
  const page = await browser.newPage();
  const base = pathToFileURL(path.dirname(MD) + path.sep).href; // para as imagens relativas (../fccpd/...) funcionarem
  // Página temporária em arquivo (e não setContent): só assim o navegador carrega as imagens locais
  const temporario = path.join(os.tmpdir(), 'relatorio-fccpd-u2.html');
  fs.writeFileSync(temporario, `<html><head><meta charset="utf-8"><base href="${base}"><style>${CSS}</style></head><body><div id="conteudo"></div></body></html>`, 'utf-8');
  await page.goto(pathToFileURL(temporario).href);
  await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js' });
  await page.evaluate(md => {
    document.getElementById('conteudo').innerHTML = marked.parse(md, { gfm: true });
  }, markdown);
  await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0), null, { timeout: 30000 });
  await page.pdf({
    path: SAIDA,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#888;font-family:Segoe UI,Arial">Origem: Ponto da Terra · FCCPD Unidade 2 · página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
    margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
  });
  const bytes = fs.readFileSync(SAIDA);
  const paginas = (bytes.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`PDF gerado: ${SAIDA} · ${(bytes.length / 1024).toFixed(0)} KB · ${paginas} páginas`);
  await browser.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
