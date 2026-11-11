// E2E da integração frontend ↔ API: vitrine, curadoria (TC04), cadastro de peça (TC09), estoque (TC14) e subtotal no servidor (TC08).
// Uso: cd e2e && npm install && npm test
// Requer a API, o worker e o frontend rodando (ver README da raiz) e o banco populado pelo seed.
// Variáveis opcionais: FRONT_URL (padrão http://localhost:3000), API_URL (padrão http://localhost:3333/api),
// BROWSER (canal do navegador instalado: msedge | chrome; padrão msedge), HEADLESS=false para ver o navegador.
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright-core');
const SAIDA = path.join(__dirname, 'resultados');
require('node:fs').mkdirSync(SAIDA, { recursive: true });
const FRONT = process.env.FRONT_URL ?? 'http://localhost:3000';
const API = process.env.API_URL ?? 'http://localhost:3333/api';

const resultados = [];
const ok = (nome, cond, detalhe = '') => {
  resultados.push({ nome, ok: !!cond, detalhe });
  console.log(`${cond ? 'PASSOU' : 'FALHOU'} · ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};

// PNG 1x1 válido para o upload
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const caminhoPng = path.join(SAIDA, 'peca.png');
fs.writeFileSync(caminhoPng, png);

async function login(page, email, senha, destino) {
  await page.goto(`${FRONT}/login`);
  await page.locator('input[type=email]').fill(email);
  await page.getByPlaceholder('Senha').fill(senha);
  await page.getByRole('checkbox').check({ force: true });
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(`**${destino}`, { timeout: 20000 });
}

async function sair(page) {
  await page.evaluate(() => localStorage.removeItem('ponto_da_terra_session_v2'));
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER ?? 'msedge', headless: process.env.HEADLESS !== 'false' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errosConsole = [];
  page.on('pageerror', e => errosConsole.push(e.message));
  const tituloPeca = `Peça E2E ${Date.now()}`;

  try {
    // ── Vitrine lê da API e não mostra peças pendentes (TC04) ──
    await page.goto(`${FRONT}/vitrine`);
    await page.getByText(/Ver catálogo completo \(\d+\)/).waitFor({ timeout: 30000 });
    ok('Vitrine carrega as peças aprovadas do banco via API', true, await page.getByText(/Ver catálogo completo/).textContent());
    await page.goto(`${FRONT}/produtos`);
    await page.getByText('Pote Tradicional de Barro com Tampa').first().waitFor({ timeout: 30000 });
    ok('Catálogo completo lista as peças da API', true);
    ok('Peça PENDENTE do seed não aparece na vitrine', (await page.getByText('Bumba Meu Boi em Barro Pintado').count()) === 0);

    // ── Artesão cadastra peça com técnica, polo, estoque e foto (TC09) ──
    await login(page, 'artesao@pontodaterra.com', 'artesao123', '/artesao');
    ok('Login de artesão pela API redireciona para /artesao', true);

    await page.getByRole('button', { name: 'Adicionar peça' }).click();
    const erroForm = await page.getByRole('alert').first().textContent();
    ok('Formulário vazio é bloqueado e lista os campos obrigatórios (polo vem preenchido com a cidade do ateliê)', /técnica artesanal/.test(erroForm) && /foto da peça/.test(erroForm), erroForm);

    await page.getByPlaceholder('Ex.: Vaso artesanal').fill(tituloPeca);
    await page.getByPlaceholder('Ex.: 85.00').fill('120.50');
    await page.getByPlaceholder('Ex.: Barro, Renda Renascença').fill('Barro');
    await page.getByPlaceholder('Ex.: Caruaru, Pesqueira').fill('Caruaru');
    await page.locator('input[type=number][step="1"]').fill('3');
    await page.getByLabel('Selecionar foto do produto').setInputFiles(caminhoPng);
    await page.getByRole('button', { name: 'Adicionar peça' }).click();
    await page.getByText('Peça enviada para aprovação do administrador!').waitFor({ timeout: 15000 });
    const linha = page.locator('div').filter({ hasText: tituloPeca }).filter({ hasText: 'Em análise' }).last();
    ok('Peça criada aparece em "Minhas peças" como "Em análise"', await linha.waitFor({ timeout: 15000 }).then(() => true, () => false));

    // ── Admin reprova com motivo obrigatório (TC04) ──
    await sair(page);
    await login(page, 'admin@pontodaterra.com', 'admin123', '/admin');
    await page.getByRole('button', { name: /Aprovações/ }).click();
    const cartao = page.locator('div').filter({ hasText: tituloPeca }).filter({ has: page.getByRole('button', { name: 'Reprovar' }) }).last();
    await cartao.getByRole('button', { name: 'Reprovar' }).click();
    await page.getByRole('button', { name: 'Confirmar reprovação' }).click();
    ok('Reprovar sem motivo é bloqueado', await page.getByText(/mínimo de 10 caracteres/).isVisible());
    await page.getByPlaceholder('Ex.: Falta nitidez nas fotos').fill('Falta nitidez nas fotos da peça');
    await page.getByRole('button', { name: 'Confirmar reprovação' }).click();
    await page.getByText(/reprovada\. O artesão recebeu o motivo/).waitFor({ timeout: 15000 });
    await page.reload();
    await page.getByRole('button', { name: /Aprovações/ }).click();
    await page.getByText('Bumba Meu Boi em Barro Pintado').waitFor({ timeout: 15000 });
    ok('Reprovação com motivo concluída e a peça sai da fila', (await page.getByText(tituloPeca).count()) === 0);

    // ── Artesão vê a peça REPROVADA (não apagada) com o motivo ──
    await sair(page);
    await login(page, 'artesao@pontodaterra.com', 'artesao123', '/artesao');
    await page.getByText(tituloPeca).waitFor({ timeout: 15000 });
    ok('Peça reprovada continua no painel do artesão (não foi apagada)', true);
    const linhaReprovada = page.locator('div').filter({ hasText: tituloPeca }).filter({ hasText: 'Reprovado' }).filter({ hasText: 'Motivo da reprovação: Falta nitidez nas fotos da peça' }).last();
    ok('Artesão vê o status "Reprovado" e o motivo', await linhaReprovada.isVisible());

    // ── Comprador: limite de estoque (TC14) ──
    await sair(page);
    await login(page, 'comprador@pontodaterra.com', 'comprador123', '/home');
    await page.goto(`${FRONT}/produtos`);
    await page.getByText('Pote Tradicional de Barro com Tampa').first().click();
    const modal = page.getByRole('dialog');
    await modal.waitFor();
    ok('Modal mostra o estoque vindo da API (1 unidade)', await modal.getByText('1 unidade').isVisible());
    ok('Botão "+" fica desabilitado no limite do estoque', await modal.getByRole('button', { name: 'Aumentar' }).isDisabled());
    ok('Mensagem "Limite de estoque atingido para esta peça" exibida', await modal.getByText('Limite de estoque atingido para esta peça').isVisible());
    await modal.getByRole('button', { name: /Adicionar à Sacola/ }).click();
    const sacola = page.getByRole('dialog').filter({ hasText: 'Sua Sacola' });
    await sacola.waitFor({ timeout: 10000 });
    ok('Na sacola o "+" também fica bloqueado', await sacola.getByRole('button', { name: 'Aumentar quantidade' }).isDisabled());

    // ── Checkout: subtotal do servidor ignora preço adulterado (TC08) e CEP validado (TC14) ──
    await page.evaluate(() => {
      const chave = 'ponto_da_terra_cart_v2';
      const carrinho = JSON.parse(localStorage.getItem(chave));
      carrinho[0].peca.preco = 0.01; // adulteração no navegador
      localStorage.setItem(chave, JSON.stringify(carrinho));
    });
    await page.goto(`${FRONT}/checkout`);
    await page.getByText('R$ 85,00').first().waitFor({ timeout: 15000 });
    ok('Checkout mostra R$ 85,00 do servidor mesmo com preço adulterado para R$ 0,01', (await page.getByText('R$ 0,01').count()) === 0);

    await page.getByLabel('CEP').fill('00000-000');
    await page.getByRole('button', { name: 'Calcular' }).click();
    ok('CEP 00000-000 é recusado com "CEP inválido"', await page.getByRole('alert').filter({ hasText: 'CEP inválido' }).first().waitFor({ timeout: 10000 }).then(() => true, () => false));

    await page.getByLabel('CEP').fill('01310-100');
    await page.getByRole('button', { name: 'Calcular' }).click();
    await page.getByText(/Entrega para 01310-100/).waitFor({ timeout: 10000 });
    ok('CEP válido calcula frete por região com prazo', true, await page.getByText(/Entrega para 01310-100/).textContent());
    await page.evaluate(() => localStorage.removeItem('ponto_da_terra_cart_v2'));
  } catch (e) {
    ok('Execução do roteiro', false, e.message.split('\n')[0]);
    await page.screenshot({ path: path.join(SAIDA, 'falha.png'), fullPage: true }).catch(() => {});
  }

  try {
    await sair(page);
    await login(page, 'artesao@pontodaterra.com', 'artesao123', '/artesao');
    const removidas = await page.evaluate(async api => {
      const token = JSON.parse(localStorage.getItem('ponto_da_terra_session_v2')).token;
      const h = { Authorization: `Bearer ${token}` };
      const lista = await (await fetch(`${api}/artesao/produtos?limit=50`, { headers: h })).json();
      const teste = lista.data.filter(p => p.titulo.startsWith('Peça E2E'));
      for (const p of teste) await fetch(`${api}/produtos/${p.id}`, { method: 'DELETE', headers: h });
      localStorage.removeItem('ponto_da_terra_orders_v2');
      return teste.length;
    }, API);
    console.log(`(limpeza: ${removidas} peça(s) de teste removida(s) do banco de desenvolvimento)`);
  } catch (e) {
    console.log('(limpeza falhou: ' + String(e.message).slice(0, 160) + ')');
  }

  ok('Nenhum erro de JavaScript nas páginas', errosConsole.length === 0, errosConsole.join(' | '));
  await browser.close();
  const falhas = resultados.filter(r => !r.ok).length;
  console.log(`\n${resultados.length - falhas}/${resultados.length} verificações passaram`);
  process.exit(falhas ? 1 : 0);
})();
