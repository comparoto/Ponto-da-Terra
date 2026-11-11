// E2E: menu no celular, "Esqueci minha senha", troca de senha no perfil e otimização das fotos pela fila.
// Cria uma conta de artesão de teste e a exclui no final (não deixa rastros no banco).
// Uso: cd e2e && node conta-e-midia.cjs (mesmas variáveis dos outros roteiros: FRONT_URL, API_URL, BROWSER, HEADLESS).
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
  return { status: r.status, ...(await r.json()) };
}
const aparece = (loc, timeout = 15000) => loc.first().waitFor({ timeout }).then(() => true, () => false);
const esperar = ms => new Promise(r => setTimeout(r, ms));

// PNG 1200 x 900 gerado em memória (cores lisas) — o worker deve convertê-lo em WebP
function pngGrande() {
  const zlib = require('node:zlib');
  const w = 1200, h = 900;
  const linha = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) linha.set([180, 110 + (x % 50), 60], 1 + x * 3);
  const bruto = Buffer.concat(Array.from({ length: h }, () => linha));
  const crc = buf => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const b of buf) r = t[(r ^ b) & 0xff] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const bloco = (tipo, dados) => { const len = Buffer.alloc(4); len.writeUInt32BE(dados.length); const td = Buffer.concat([Buffer.from(tipo), dados]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), bloco('IHDR', ihdr), bloco('IDAT', zlib.deflateSync(bruto)), bloco('IEND', Buffer.alloc(0))]);
}

(async () => {
  const marca = Date.now();
  const email = `conta-e2e-${marca}@teste.com`;
  let senha = 'segredo1';
  const cadastro = await chamar('/auth/cadastro', { method: 'POST', body: { nome: 'Ateliê Mídia E2E', email, senha, tipo: 'ARTESAO', cidade: 'Caruaru', estado: 'PE', especialidade: 'Cerâmica e barro', aceiteTermos: true } });
  let token = cadastro.data.token;

  const browser = await chromium.launch({ channel: process.env.BROWSER ?? 'msedge', headless: process.env.HEADLESS !== 'false' });
  const erros = [];
  try {
    // ── Menu no celular ──
    const cel = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true });
    cel.on('pageerror', e => erros.push(e.message));
    await cel.goto(`${FRONT}/home`);
    await cel.getByRole('button', { name: 'Abrir menu' }).click();
    const gaveta = cel.getByRole('dialog');
    ok('Menu no celular abre com os links', await aparece(gaveta.getByRole('button', { name: 'Peças & Catálogo' })));
    await gaveta.getByRole('button', { name: 'Contato' }).click();
    ok('Menu no celular leva ao Contato', await aparece(cel.getByText('Fale com a gente')));
    await cel.close();

    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    page.on('pageerror', e => erros.push(e.message));

    // ── Esqueci minha senha ──
    await page.goto(`${FRONT}/login`);
    await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
    await page.waitForURL('**/esqueci-senha');
    await page.getByLabel('E-mail').fill(email);
    await page.getByRole('button', { name: 'Enviar link' }).click();
    ok('Esqueci minha senha confirma o envio do link', await aparece(page.getByText(/o link já está a caminho/)));
    await page.goto(`${FRONT}/redefinir-senha?token=${'x'.repeat(43)}`);
    await page.getByLabel('Nova senha', { exact: true }).fill('outraSenha1');
    await page.getByLabel('Repita a nova senha').fill('outraSenha1');
    await page.getByRole('button', { name: 'Salvar nova senha' }).click();
    ok('Link inválido é recusado e oferece pedir outro', await aparece(page.getByRole('link', { name: 'Pedir novo link' })));

    // ── Alterar senha no perfil ──
    await page.goto(`${FRONT}/login`);
    await page.locator('input[type=email]').fill(email);
    await page.getByPlaceholder('Senha').fill(senha);
    await page.getByRole('checkbox').check({ force: true });
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('**/artesao', { timeout: 20000 });
    await page.goto(`${FRONT}/perfil`);
    await page.getByRole('button', { name: 'Alterar senha' }).click();
    await page.getByLabel('Senha atual').fill(senha);
    await page.getByLabel('Nova senha', { exact: true }).fill('trocada123');
    await page.getByLabel('Repita a nova senha').fill('trocada123');
    await page.getByRole('button', { name: 'Salvar nova senha' }).click();
    ok('Perfil troca a senha e mantém a pessoa conectada', await aparece(page.getByText(/Senha alterada/)));
    const antiga = await chamar('/auth/login', { method: 'POST', body: { email, senha } });
    senha = 'trocada123';
    const nova = await chamar('/auth/login', { method: 'POST', body: { email, senha } });
    ok('Senha antiga deixa de funcionar e a nova entra', antiga.status === 401 && nova.success);
    token = nova.data.token;

    // ── Foto otimizada pela fila ──
    const form = new FormData();
    form.append('foto', new Blob([pngGrande()], { type: 'image/png' }), 'oficina.png');
    const envio = await fetch(`${API}/artesao/perfil/fotos?tipo=atelie`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }).then(r => r.json());
    const original = envio.data?.fotoAtelieUrl ?? '';
    let atual = original;
    for (let i = 0; i < 20 && !atual.endsWith('.webp'); i++) {
      await esperar(1500);
      atual = (await chamar('/artesao/perfil', { token })).data?.fotoAtelieUrl ?? '';
    }
    ok('Fila converte a foto enviada para WebP', original.endsWith('.png') && atual.endsWith('.webp'), atual);
    if (atual.endsWith('.webp')) {
      const [a, b] = await Promise.all([fetch(original).then(r => r.status), fetch(atual).then(r => r.status)]);
      ok('Original apagado e versão otimizada disponível', a === 404 && b === 200, `original ${a} · webp ${b}`);
    }
  } catch (e) {
    ok('Execução do roteiro', false, String(e.message).split('\n')[0]);
  }

  ok('Nenhum erro de JavaScript nas páginas', erros.length === 0, erros.join(' | '));
  await browser.close();

  // Limpeza: a conta de teste não tem pedidos, então é excluída de verdade
  const login = await chamar('/auth/login', { method: 'POST', body: { email, senha } });
  if (login.success) await chamar('/me', { token: login.data.token, method: 'DELETE' });
  const sobrou = await chamar('/auth/login', { method: 'POST', body: { email, senha } });
  ok('Limpeza · conta de teste excluída', !sobrou.success);

  const falhas = resultados.filter(r => !r.ok).length;
  console.log(`\n${resultados.length - falhas}/${resultados.length} verificações passaram`);
  process.exit(falhas ? 1 : 0);
})();
