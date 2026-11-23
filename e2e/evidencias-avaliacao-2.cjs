// Coleta as evidências da Avaliação 2 (recomendação e assíncrono) e salva capturas em docs/evidencias/.
// Uso: cd e2e && FRONT_URL=http://localhost:3002 node evidencias-avaliacao-2.cjs
// Pré-requisitos: API, worker de filas e site rodando (ver README da raiz).
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright-core');

const FRONT = process.env.FRONT_URL ?? 'http://localhost:3000';
const API = process.env.API_URL ?? 'http://localhost:3333/api';
const PASTA = path.resolve(__dirname, '..', 'docs', 'evidencias');
fs.mkdirSync(PASTA, { recursive: true });

const chamar = async (caminho, { token, method = 'GET', body } = {}) => {
  const r = await fetch(API + caminho, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
};
const logar = async (email, senha) => (await chamar('/auth/login', { method: 'POST', body: { email, senha } })).data.token;
const entrarNaTela = async (page, email, senha) => {
  await page.goto(`${FRONT}/login`);
  await page.locator('input[type=email]').fill(email);
  await page.getByPlaceholder('Senha').fill(senha);
  await page.getByRole('checkbox').check({ force: true });
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 20000 });
};
const dormir = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER ?? 'msedge', headless: true });
  const saida = {};

  // ───────── Recomendação ─────────
  {
    const catalogo = (await chamar('/produtos?limit=50')).data.filter(p => !p.titulo.startsWith('Peça única'));
    const porTecnica = new Map();
    for (const p of catalogo) porTecnica.set(p.tecnica, [...(porTecnica.get(p.tecnica) ?? []), p]);
    const grupo = [...porTecnica.values()].filter(g => g.length >= 3).sort((a, b) => b.length - a.length)[0] ?? catalogo.slice(0, 3);
    const visto = grupo[0];
    saida.recomendacao = { visto: { titulo: visto.titulo, tecnica: visto.tecnica, polo: visto.poloOrigem }, mesmaTecnica: grupo.slice(1).map(p => p.titulo) };

    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();
    await entrarNaTela(page, 'comprador@pontodaterra.com', 'comprador123');

    await page.goto(`${FRONT}/home`);
    await page.waitForSelector('text=Feitas para você', { timeout: 20000 }).catch(() => {});
    const antes = await page.locator('h2:has-text("Feitas para você")').count();
    saida.recomendacao.secaoAntesDeVer = antes > 0;
    if (antes > 0) await page.locator('h2:has-text("Feitas para você")').locator('xpath=../..').screenshot({ path: path.join(PASTA, 'recomendacao-1-antes.png') });

    await page.goto(`${FRONT}/produtos`);
    await page.waitForSelector(`[title="${visto.titulo}"]`, { timeout: 20000 });
    await page.locator(`[title="${visto.titulo}"]`).first().click();
    await page.getByRole('dialog').waitFor({ timeout: 15000 });
    await dormir(800);
    await page.screenshot({ path: path.join(PASTA, 'recomendacao-2-peca-visualizada.png') });
    await page.keyboard.press('Escape');

    saida.recomendacao.historico = await page.evaluate(() => JSON.parse(localStorage.getItem('ponto-da-terra:pecas-visualizadas') ?? '[]'));
    await page.goto(`${FRONT}/home`);
    await page.waitForSelector('text=Feitas para você', { timeout: 20000 });
    await dormir(800);
    const secao = page.locator('h2:has-text("Feitas para você")').locator('xpath=../..');
    saida.recomendacao.recomendadas = await secao.locator('[title]').evaluateAll(els => els.map(e => e.getAttribute('title')));
    await secao.scrollIntoViewIfNeeded();
    await secao.screenshot({ path: path.join(PASTA, 'recomendacao-3-depois.png') });
    await ctx.close();
  }

  // ───────── Assíncrono: compra → outbox → worker → notificação ─────────
  if (process.env.SOMENTE !== 'recomendacao') {
    const tokenArtesao = await logar('artesao@pontodaterra.com', 'artesao123');
    const meus = (await chamar('/artesao/produtos?limit=50', { token: tokenArtesao })).data;
    const alvo = meus.filter(p => p.status === 'ATIVO' && (p.estoque?.quantidadeDisponivel ?? p.estoque ?? 0) >= 3)[0];
    if (!alvo) throw new Error('Sem peça do artesão de demonstração com estoque >= 3');
    const antesNotificacoes = (await chamar('/notificacoes?limit=50', { token: tokenArtesao })).data ?? [];

    const tokenComprador = await logar('comprador@pontodaterra.com', 'comprador123');
    const compra = await chamar('/checkout', { method: 'POST', token: tokenComprador, body: { itens: [{ produtoId: alvo.id, quantidade: 1 }], endereco: { cep: '50030-230', rua: 'Rua da Aurora', numero: '100', cidade: 'Recife', estado: 'PE' } } });
    const codigo = compra.data?.codigo ?? compra.data?.compra?.codigo;
    const pg = await chamar(`/compras/${codigo}/pagamento`, { method: 'POST', token: tokenComprador, body: { metodo: 'PIX', parcelas: 1 } });
    saida.assincrono = { produto: alvo.titulo, compraCodigo: codigo, checkoutOk: Boolean(compra.success), pagamentoPixOk: Boolean(pg.success), notificacoesAntes: antesNotificacoes.length };
    await dormir(6000); // tempo para o relay publicar o evento e o worker processar
    const depois = (await chamar('/notificacoes?limit=50', { token: tokenArtesao })).data ?? [];
    saida.assincrono.notificacoesDepois = depois.length;
    saida.assincrono.ultimaNotificacao = depois[0] ?? null;

    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();
    await entrarNaTela(page, 'artesao@pontodaterra.com', 'artesao123');
    await page.goto(`${FRONT}/notificacoes`);
    await dormir(2500);
    await page.screenshot({ path: path.join(PASTA, 'assincrono-notificacao-do-artesao.png'), clip: { x: 0, y: 0, width: 1366, height: 330 } });
    await ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify(saida, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
