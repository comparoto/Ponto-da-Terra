// E2E dos casos que dependem da tela: TC03 (filtro sem resultado, no celular e no computador),
// TC10 (limite de upload e GIF no perfil, foto da oficina) e TC11 (perfil público pela foto, pelo nome e pelo detalhe da peça).
// Cria uma conta de artesão de teste e a exclui no final (não deixa rastros no banco).
// Uso: cd e2e && node casos-de-tela.cjs (mesmas variáveis dos outros roteiros: FRONT_URL, API_URL, BROWSER, HEADLESS).
const { chromium } = require('playwright-core');
const FRONT = process.env.FRONT_URL ?? 'http://localhost:3000';
const API = process.env.API_URL ?? 'http://localhost:3333/api';
const resultados = [];
const ok = (nome, cond, detalhe = '') => {
  resultados.push(!!cond);
  console.log(`${cond ? 'PASSOU' : 'FALHOU'} · ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};
const aparece = (loc, t = 10000) => loc.first().waitFor({ timeout: t }).then(() => true, () => false);
const chamar = async (caminho, { token, method = 'GET', body } = {}) => {
  const r = await fetch(API + caminho, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
};

(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER ?? 'msedge', headless: process.env.HEADLESS !== 'false' });

  // ── TC03: vitrine responsiva, filtro sem correspondência ──
  for (const [nome, largura, altura] of [['celular', 375, 812], ['computador', 1366, 900]]) {
    const page = await browser.newPage({ viewport: { width: largura, height: altura } });
    const erros = [];
    page.on('pageerror', e => erros.push(e.message));
    await page.goto(`${FRONT}/produtos`);
    await page.getByPlaceholder(/Pesquisar por nome/).fill('zzzz-sem-resultado-xyz');
    ok(`TC03 · ${nome}: mensagem "Nenhuma peça encontrada"`, await aparece(page.getByText('Nenhuma peça encontrada')));
    ok(`TC03 · ${nome}: contador mostra 0 peças`, await aparece(page.getByText(/Exibindo 0 peças/)));
    const rolagem = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    ok(`TC03 · ${nome}: sem rolagem horizontal`, !rolagem);
    await page.getByRole('button', { name: 'Ver todas as peças' }).click();
    ok(`TC03 · ${nome}: "Ver todas as peças" restaura o catálogo`, await aparece(page.getByText(/Exibindo \d+ peça/).filter({ hasNotText: 'Exibindo 0' })));
    ok(`TC03 · ${nome}: sem erro de JavaScript`, erros.length === 0, erros.join(' | '));
    await page.close();
  }

  // ── TC11: perfil público, pelo nome e pela foto ──
  {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.goto(`${FRONT}/vitrine`);
    const primeiro = (await chamar('/artesaos?limit=1')).data[0];
    await page.getByRole('img', { name: primeiro.nome, exact: true }).first().click();
    ok('TC11 · vitrine: clicar na FOTO do artesão mostra as peças dele', await aparece(page.getByText(`Filtrando por artesão: ${primeiro.nome}`)));
    await page.getByRole('button', { name: 'Remover filtro' }).click();
    await page.locator('p', { hasText: new RegExp('^' + primeiro.nome + '$') }).first().click(); // só o texto visível do card (a lista de filtro tem uma opção escondida com o mesmo nome)
    ok('TC11 · vitrine: clicar no NOME do artesão mostra as peças dele', await aparece(page.getByText(`Filtrando por artesão: ${primeiro.nome}`)));
    await page.getByRole('link', { name: 'Ver perfil' }).first().click();
    await page.waitForURL('**/artesaos/**', { timeout: 10000 }).catch(() => {});
    ok('TC11 · vitrine: "Ver perfil" abre a página pública do artesão', /\/artesaos\//.test(page.url()));
    ok('TC11 · página pública mostra o nome do artesão e as peças dele', (await aparece(page.getByRole('heading', { name: new RegExp(primeiro.nome.split(' ')[0]) }))) && (await aparece(page.getByText(/Peças de /))));
    // pelo detalhe da peça
    await page.goto(`${FRONT}/produtos`);
    await page.locator('p, h2, h3').filter({ hasText: /./ }).first().waitFor({ timeout: 10000 }).catch(() => {});
    const peca = (await chamar('/produtos?limit=1')).data[0];
    await page.getByText(peca.titulo, { exact: true }).first().click();
    const dialogo = page.getByRole('dialog');
    await dialogo.getByRole('link', { name: peca.artesao.nome }).click();
    await page.waitForURL(`**/artesaos/${peca.artesao.id}`, { timeout: 10000 }).catch(() => {});
    ok('TC11 · detalhe da peça: o nome do artesão leva ao perfil público', page.url().endsWith(`/artesaos/${peca.artesao.id}`));
    await page.close();
  }

  // ── TC10: atualização do perfil e upload de fotos (conta de artesão descartável) ──
  {
    const email = `tc10-${Date.now()}@teste.com`;
    const cad = await chamar('/auth/cadastro', { method: 'POST', body: { nome: 'Artesã Teste TC10', email, senha: 'segredo1', tipo: 'ARTESAO', cidade: 'Olinda', estado: 'PE', especialidade: 'Barro', aceiteTermos: true } });
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.goto(`${FRONT}/login`);
    await page.locator('input[type=email]').fill(email);
    await page.getByPlaceholder('Senha').fill('segredo1');
    await page.getByRole('checkbox').check({ force: true });
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('**/artesao', { timeout: 20000 });
    await page.goto(`${FRONT}/perfil`);
    ok('TC10 · perfil tem os dois campos de foto (perfil e oficina)', (await aparece(page.getByLabel('Escolher foto do perfil'))) && (await aparece(page.getByLabel('Escolher foto da oficina'))));

    const gif = { name: 'foto.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a\u0001\u0000\u0001\u0000', 'latin1') };
    await page.getByLabel('Escolher foto do perfil').setInputFiles(gif);
    ok('TC10 · GIF é recusado na tela com mensagem de formato', await aparece(page.getByText(/Formato não suportado/)));

    const grande = Buffer.alloc(Math.floor(5.1 * 1024 * 1024));
    grande[0] = 0xff; grande[1] = 0xd8; grande[2] = 0xff;
    await page.getByLabel('Escolher foto do perfil').setInputFiles({ name: 'grande.jpg', mimeType: 'image/jpeg', buffer: grande });
    ok('TC10 · JPG acima de 5 MB é recusado na tela com mensagem do limite', await aparece(page.getByText(/no máximo 5 MB/)));

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await page.getByLabel('Escolher foto da oficina').setInputFiles({ name: 'oficina.png', mimeType: 'image/png', buffer: png });
    let salvou = false;
    for (let i = 0; i < 20 && !salvou; i++) {
      await new Promise(r => setTimeout(r, 750));
      const perfil = await chamar('/artesao/perfil', { token: cad.data.token });
      salvou = Boolean(perfil.data?.fotoAtelieUrl);
    }
    ok('TC10 · foto da oficina (PNG pequeno) é aceita e gravada no perfil', salvou);

    // limpeza: a conta de teste não tem pedidos, então é excluída de verdade
    const login = await chamar('/auth/login', { method: 'POST', body: { email, senha: 'segredo1' } });
    if (login.success) await chamar('/me', { token: login.data.token, method: 'DELETE' });
    const sobrou = await chamar('/auth/login', { method: 'POST', body: { email, senha: 'segredo1' } });
    ok('Limpeza · conta de teste excluída', !sobrou.success);
    await page.close();
  }

  await browser.close();
  const falhas = resultados.filter(r => !r).length;
  console.log(`\n${resultados.length - falhas}/${resultados.length} verificações passaram`);
  process.exit(falhas ? 1 : 0);
})();
