// Evidências do painel de monitoramento (SO · Unidade 2): telas e prova de que só o administrador acessa.
// Uso: cd e2e && FRONT_URL=http://localhost:3100 API_URL=http://localhost:3334/api node so-evidencias-monitoramento.cjs
//      Em produção (somente leitura): EVIDENCIA_SUFIXO=-producao FRONT_URL=https://ponto-da-terra-eight.vercel.app API_URL=https://ponto-da-terra-api.vercel.app/api node so-evidencias-monitoramento.cjs
// Precisa do site e da API no ar, com o seed aplicado. Grava PNGs em docs/so/evidencias/.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const FRONT = process.env.FRONT_URL ?? 'http://localhost:3100';
const API = process.env.API_URL ?? 'http://localhost:3334/api';
const SUFIXO = process.env.EVIDENCIA_SUFIXO ?? ''; // ex.: -producao, para não sobrescrever as capturas locais
const SAIDA = path.resolve(__dirname, '..', 'docs', 'so', 'evidencias');
fs.mkdirSync(SAIDA, { recursive: true });

const resultados = [];
const ok = (nome, passou, detalhe = '') => {
  resultados.push({ nome, passou, detalhe });
  console.log(`${passou ? 'OK  ' : 'FALHA'} ${nome}${detalhe ? ' · ' + detalhe : ''}`);
};

async function entrar(page, email, senha, perfil) {
  await page.goto(`${FRONT}/login?perfil=${perfil}`);
  await page.locator('input[type=email]').fill(email);
  await page.getByPlaceholder('Senha').fill(senha);
  const termo = page.getByRole('checkbox');
  if (await termo.count()) await termo.check({ force: true });
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 30000 });
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER ?? 'msedge', headless: true });

  // 1) API: 401 sem token e 403 para comprador e artesão
  const semToken = await fetch(`${API}/admin/monitoramento`);
  ok('API: sem token → 401', semToken.status === 401, `status ${semToken.status}`);
  for (const [email, senha, nome] of [['comprador@pontodaterra.com', 'comprador123', 'comprador'], ['artesao@pontodaterra.com', 'artesao123', 'artesão']]) {
    const login = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) })).json();
    const r = await fetch(`${API}/admin/monitoramento`, { headers: { Authorization: `Bearer ${login.data.token}` } });
    ok(`API: ${nome} → 403`, r.status === 403, `status ${r.status}`);
  }

  // 2) Navegador: administrador vê o painel; comprador é redirecionado
  const ctxComprador = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pc = await ctxComprador.newPage();
  await entrar(pc, 'comprador@pontodaterra.com', 'comprador123', 'comprador');
  await pc.goto(`${FRONT}/admin/monitoramento`);
  await pc.waitForURL(url => !url.pathname.startsWith('/admin'), { timeout: 60000 }).catch(() => {});
  ok('Tela: comprador acessando /admin/monitoramento é redirecionado', !new URL(pc.url()).pathname.startsWith('/admin'), `foi para ${new URL(pc.url()).pathname}`);
  await ctxComprador.close();

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1500 } });
  const page = await ctx.newPage();
  await entrar(page, 'admin@pontodaterra.com', 'admin123', 'administrador');

  // gera tráfego real para o painel ter o que mostrar (leituras públicas)
  for (let i = 0; i < 60; i++) {
    await fetch(`${API}/produtos?limit=12`);
    if (i % 6 === 0) await fetch(`${API}/frete?cep=01001000`);
    if (i % 15 === 0) await fetch(`${API}/rota-que-nao-existe`);
  }

  await page.goto(`${FRONT}/admin`);
  await page.waitForTimeout(1500);
  const link = page.getByRole('link', { name: 'Monitoramento' });
  ok('Tela: o painel administrativo tem o link "Monitoramento"', (await link.count()) > 0);
  await link.first().click();
  await page.waitForURL('**/admin/monitoramento');
  await page.getByText('Monitoramento de rede').waitFor({ timeout: 30000 });
  await page.getByText('Latência p95', { exact: true }).waitFor({ timeout: 60000 });
  ok('Tela: o painel carrega as métricas reais', (await page.getByText('Latência p95', { exact: true }).count()) > 0);
  await page.getByRole('button', { name: 'Medir agora' }).click();
  await page.getByText('RTT mediano').nth(1).waitFor({ timeout: 60000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SAIDA, `monitoramento-painel${SUFIXO}.png`), fullPage: true });
  ok('Tela: sondagem do navegador (RTT, jitter e perda) funciona', (await page.getByText('Sua conexão com a API').count()) > 0);

  await page.setViewportSize({ width: 390, height: 900 });
  await page.waitForTimeout(500);
  const larguraDoc = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.screenshot({ path: path.join(SAIDA, `monitoramento-painel-celular${SUFIXO}.png`), fullPage: true });
  ok('Tela: no celular (390 px) não há rolagem horizontal da página', larguraDoc <= 392, `scrollWidth ${larguraDoc}`);

  await browser.close();
  fs.writeFileSync(path.join(SAIDA, `monitoramento-resultado${SUFIXO}.json`), JSON.stringify({ geradoEm: new Date().toISOString(), front: FRONT, api: API, resultados }, null, 2));
  const falhas = resultados.filter(r => !r.passou).length;
  console.log(`\n${resultados.length - falhas}/${resultados.length} verificações OK`);
  process.exit(falhas ? 1 : 0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
