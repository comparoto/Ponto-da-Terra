// E2E das funcionalidades que completam a integração: aceite dos Termos no cadastro, aprovação de novos
// artesãos (HU8), perfil público do artesão (HU3), favoritos, carrinho salvo na conta, notificações e
// inativação de conta (HU16).
// Uso: cd e2e && npm install && node pontas-soltas.cjs (mesmas variáveis de fase2.cjs: FRONT_URL, API_URL, BROWSER, HEADLESS).
const path = require('node:path');
const { chromium } = require('playwright-core');
const SAIDA = path.join(__dirname, 'resultados');
require('node:fs').mkdirSync(SAIDA, { recursive: true });
const FRONT = process.env.FRONT_URL ?? 'http://localhost:3000';
const API = process.env.API_URL ?? 'http://localhost:3333/api';

const resultados = [];
const ok = (nome, cond, detalhe = '') => {
  resultados.push({ nome, ok: !!cond });
  console.log(`${cond ? 'PASSOU' : 'FALHOU'} · ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

async function chamar(caminho, { token, method = 'GET', body } = {}) {
  const r = await fetch(API + caminho, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}
const tokenDe = async (email, senha) => (await chamar('/auth/login', { method: 'POST', body: { email, senha } })).data.token;

async function login(page, email, senha, destino) {
  await page.goto(`${FRONT}/login`);
  await page.locator('input[type=email]').fill(email);
  await page.getByPlaceholder('Senha').fill(senha);
  await page.getByRole('checkbox').check({ force: true });
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(`**${destino}`, { timeout: 20000 });
}
const aparece = (loc, timeout = 15000) => loc.first().waitFor({ timeout }).then(() => true, () => false);
const sair = page => page.evaluate(() => localStorage.removeItem('ponto_da_terra_session_v2'));

(async () => {
  const marca = Date.now();
  const emailArtesao = `artesao-e2e-${marca}@teste.com`;
  const emailComprador = `comprador-e2e-${marca}@teste.com`;
  const admin = await tokenDe('admin@pontodaterra.com', 'admin123');
  await chamar('/auth/cadastro', { method: 'POST', body: { nome: 'Comprador Favoritos E2E', email: emailComprador, senha: 'segredo1', aceiteTermos: true } });
  // Uma peça da vitrine para favoritar e colocar na sacola
  const vitrine = await chamar('/produtos?limit=20');
  const peca = vitrine.data.find(p => p.estoque > 1) ?? vitrine.data[0];

  const browser = await chromium.launch({ channel: process.env.BROWSER ?? 'msedge', headless: process.env.HEADLESS !== 'false' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));

  try {
    // ── Cadastro de artesão: Termos obrigatórios e aviso de análise (HU8) ──
    await page.goto(`${FRONT}/cadastro`);
    await page.getByPlaceholder('Nome completo').fill('Ateliê Teste E2E');
    await page.getByPlaceholder(/E-mail/).fill(emailArtesao);
    await page.getByPlaceholder(/Senha/).fill('segredo1');
    await page.getByLabel('Tipo de conta').selectOption('artesao');
    await page.getByPlaceholder('Cidade onde você trabalha').fill('Caruaru');
    await page.getByLabel('Estado').selectOption('PE');
    await page.getByLabel('Área de atuação').selectOption({ index: 1 });
    await page.locator('button[type=submit]').click();
    ok('Termos · cadastro sem aceite é bloqueado', await aparece(page.getByText(/precisa aceitar os Termos/), 5000));
    await page.getByRole('checkbox').check({ force: true });
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/artesao', { timeout: 20000 });
    ok('HU8 · artesão novo vê o aviso de cadastro em análise', await aparece(page.getByText(/Seu cadastro está em análise/)));
    const perfilArtesao = await chamar('/me', { token: await tokenDe(emailArtesao, 'segredo1') });
    ok('Termos · data do aceite registrada no servidor', Boolean(perfilArtesao.data?.termosAceitosEm));

    // Artesão pendente não aparece publicamente
    const pendentes = await chamar('/admin/cadastros?status=PENDENTE', { token: admin });
    const cadastro = pendentes.data.find(c => c.email === emailArtesao);
    ok('HU8 · cadastro entra na fila do admin', Boolean(cadastro));
    const antes = await fetch(`${API}/artesaos/${cadastro?.artesaoId}`);
    ok('HU8 · perfil pendente não é público', antes.status === 404);

    // ── Admin aprova o cadastro pela tela ──
    await sair(page);
    await login(page, 'admin@pontodaterra.com', 'admin123', '/admin');
    await page.getByRole('button', { name: /^Aprovações/ }).click();
    const card = page.locator('div').filter({ hasText: emailArtesao }).filter({ has: page.getByRole('button', { name: 'Aprovar cadastro' }) }).last();
    await card.getByRole('button', { name: 'Aprovar cadastro' }).click({ timeout: 15000 });
    ok('HU8 · admin aprova o novo artesão', await aparece(page.getByText(/Cadastro de Ateliê Teste E2E aprovado/)));

    // ── Perfil público do artesão (HU3) ──
    await page.goto(`${FRONT}/artesaos/${cadastro.artesaoId}`);
    ok('HU3 · perfil público do artesão aprovado', await aparece(page.getByRole('heading', { name: 'Ateliê Teste E2E' })));
    await page.goto(`${FRONT}/artesaos/${peca.artesao.id}`);
    ok('HU3 · perfil mostra as peças do artesão', await aparece(page.getByText(peca.titulo)));

    // ── Artesão recebe a notificação da aprovação ──
    await sair(page);
    await login(page, emailArtesao, 'segredo1', '/artesao');
    ok('HU8 · aviso some depois da aprovação', !(await aparece(page.getByText(/Seu cadastro está em análise/), 4000)));
    await page.goto(`${FRONT}/notificacoes`);
    const notificou = await aparece(page.getByText('Cadastro aprovado'), 30000);
    ok('Notificações · artesão é avisado da aprovação', notificou);
    if (notificou) {
      await page.getByRole('button', { name: 'Marcar todas como lidas' }).click();
      await page.waitForTimeout(1500);
      const naoLidas = await chamar('/notificacoes?naoLidas=true&limit=1', { token: await tokenDe(emailArtesao, 'segredo1') });
      ok('Notificações · marcar todas como lidas', (naoLidas.meta?.totalItems ?? naoLidas.data?.length) === 0);
    }

    // ── Comprador: favoritos e carrinho salvo na conta ──
    await sair(page);
    await login(page, emailComprador, 'segredo1', '/home');
    await page.goto(`${FRONT}/produtos?q=${encodeURIComponent(peca.titulo)}`);
    await page.getByRole('button', { name: 'Adicionar aos favoritos' }).first().click({ timeout: 15000 });
    await page.getByRole('button', { name: 'Remover dos favoritos' }).first().waitFor({ timeout: 10000 });
    await page.goto(`${FRONT}/favoritos`);
    ok('Favoritos · peça aparece em "Meus favoritos"', await aparece(page.getByText(peca.titulo)));

    await page.getByText(peca.titulo, { exact: true }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: /Adicionar à Sacola/ }).click();
    await page.waitForTimeout(1500); // o carrinho é salvo na conta com um pequeno atraso
    const salvo = await chamar('/carrinho', { token: await tokenDe(emailComprador, 'segredo1') });
    ok('Carrinho · itens salvos na conta', salvo.data?.itens?.some(i => i.produto.id === peca.id));

    // Sai (o carrinho do aparelho é limpo) e entra de novo: a sacola volta do servidor
    await page.evaluate(() => {
      localStorage.removeItem('ponto_da_terra_session_v2');
      localStorage.removeItem('ponto_da_terra_cart_v2');
    });
    await login(page, emailComprador, 'segredo1', '/home');
    await page.waitForTimeout(2000);
    const carrinhoLocal = await page.evaluate(() => JSON.parse(localStorage.getItem('ponto_da_terra_cart_v2') ?? '[]'));
    ok('Carrinho · sacola restaurada ao entrar de novo', carrinhoLocal.some(i => i.peca.id === peca.id));

    // ── Admin inativa a conta do comprador (HU16) ──
    await sair(page);
    await login(page, 'admin@pontodaterra.com', 'admin123', '/admin');
    await page.getByRole('button', { name: 'Usuários' }).click();
    await page.getByLabel('Buscar usuário').fill(emailComprador);
    const linha = page.locator('div').filter({ hasText: emailComprador }).filter({ has: page.getByRole('button', { name: 'Inativar conta' }) }).last();
    await linha.getByRole('button', { name: 'Inativar conta' }).click({ timeout: 15000 });
    await page.getByRole('button', { name: 'Reativar conta' }).waitFor({ timeout: 10000 });
    const bloqueado = await chamar('/auth/login', { method: 'POST', body: { email: emailComprador, senha: 'segredo1' } });
    ok('HU16 · conta inativada não consegue entrar', bloqueado.error === 'Conta inativa');

    // ── Termos atualizados ──
    await page.goto(`${FRONT}/termos`);
    ok('Termos · texto cita favoritos e carrinho na conta', await aparece(page.getByText(/favoritos/i)));
  } catch (e) {
    ok('Execução do roteiro', false, String(e.message).split('\n')[0]);
    await page.screenshot({ path: path.join(SAIDA, 'falha-pontas-soltas.png'), fullPage: true }).catch(() => {});
  }

  ok('Nenhum erro de JavaScript nas páginas', erros.length === 0, erros.join(' | '));
  await browser.close();
  const falhas = resultados.filter(r => !r.ok).length;
  console.log(`\n${resultados.length - falhas}/${resultados.length} verificações passaram`);
  process.exit(falhas ? 1 : 0);
})();
