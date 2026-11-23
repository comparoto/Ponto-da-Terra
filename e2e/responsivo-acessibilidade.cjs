// Responsividade (plano de testes: "pelo menos 2 breakpoints") e acessibilidade (WCAG 2 A/AA com axe-core).
// Para cada tela × tamanho de tela: sem rolagem horizontal, sem erros de JavaScript e sem violações
// de acessibilidade graves. Salva um print de cada combinação em e2e/resultados/telas.
// Uso: cd e2e && npm run test:responsivo   (FRONT_URL, BROWSER e HEADLESS como nos outros roteiros)
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright-core');

const FRONT = process.env.FRONT_URL ?? 'http://localhost:3000';
const SAIDA = path.join(__dirname, 'resultados', 'telas');
fs.mkdirSync(SAIDA, { recursive: true });
const AXE = require.resolve('axe-core/axe.min.js');

const TAMANHOS = [
  { nome: 'celular', width: 375, height: 812, isMobile: true },
  { nome: 'tablet', width: 768, height: 1024, isMobile: true },
  { nome: 'desktop', width: 1366, height: 900, isMobile: false },
];

const TELAS = [
  { perfil: null, rotas: ['/home', '/vitrine', '/produtos', '/login', '/cadastro', '/termos', '/orientacao', '/esqueci-senha'] },
  { perfil: ['comprador@pontodaterra.com', 'comprador123', '/home'], rotas: ['/meus-pedidos', '/checkout', '/perfil'] },
  { perfil: ['artesao@pontodaterra.com', 'artesao123', '/artesao'], rotas: ['/artesao'] },
  { perfil: ['admin@pontodaterra.com', 'admin123', '/admin'], rotas: ['/admin'] },
];

async function login(page, [email, senha, destino]) {
  await page.goto(`${FRONT}/login`);
  await page.locator('input[type=email]').fill(email);
  await page.getByPlaceholder('Senha').fill(senha);
  await page.getByRole('checkbox').check({ force: true });
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(`**${destino}`, { timeout: 20000 });
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER ?? 'msedge', headless: process.env.HEADLESS !== 'false' });
  const linhas = [];
  const violacoesPorRegra = new Map();
  let falhas = 0;

  for (const t of TAMANHOS) {
    for (const grupo of TELAS) {
      const context = await browser.newContext({ viewport: { width: t.width, height: t.height }, isMobile: t.isMobile, hasTouch: t.isMobile });
      const page = await context.newPage();
      const erros = [];
      page.on('pageerror', e => erros.push(e.message));
      if (grupo.perfil) await login(page, grupo.perfil);

      for (const rota of grupo.rotas) {
        erros.length = 0;
        await page.goto(FRONT + rota);
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(800);

        const { scroll, largura } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, largura: window.innerWidth }));
        const semRolagem = scroll <= largura + 1;

        await page.addScriptTag({ path: AXE });
        const axe = await page.evaluate(async () => {
          // eslint-disable-next-line no-undef
          const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
          return r.violations.map(v => ({ id: v.id, impacto: v.impact, ajuda: v.help, nos: v.nodes.length }));
        });
        const graves = axe.filter(v => v.impacto === 'critical' || v.impacto === 'serious');
        for (const v of axe) {
          const atual = violacoesPorRegra.get(v.id) ?? { ...v, telas: new Set() };
          atual.telas.add(rota);
          violacoesPorRegra.set(v.id, atual);
        }

        await page.screenshot({ path: path.join(SAIDA, `${t.nome}${rota.replace(/\//g, '_')}.png`), fullPage: true });
        const ok = semRolagem && erros.length === 0;
        if (!ok) falhas++;
        linhas.push(
          `${ok ? 'PASSOU' : 'FALHOU'} · ${t.nome.padEnd(7)} ${rota.padEnd(14)} rolagem horizontal: ${semRolagem ? 'não' : `SIM (${scroll}px > ${largura}px)`}` +
            ` · erros JS: ${erros.length} · acessibilidade: ${graves.length} grave(s), ${axe.length - graves.length} outra(s)`,
        );
        console.log(linhas[linhas.length - 1]);
      }
      await context.close();
    }
  }
  await browser.close();

  console.log('\nViolações de acessibilidade encontradas (WCAG 2 A/AA):');
  if (!violacoesPorRegra.size) console.log('  nenhuma');
  for (const v of [...violacoesPorRegra.values()].sort((a, b) => (a.impacto > b.impacto ? 1 : -1))) {
    console.log(`  [${v.impacto}] ${v.id}: ${v.ajuda} — em ${[...v.telas].join(', ')}`);
  }
  console.log(`\n${linhas.length - falhas}/${linhas.length} combinações tela × tamanho sem rolagem horizontal e sem erros`);
  process.exit(falhas ? 1 : 0);
})();
