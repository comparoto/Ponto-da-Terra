// Evidências de comunicação entre os componentes (FCCPD, Unidade 2). Imprime resultados reais; não grava segredos.
// Uso: cd e2e && FRONT_URL=http://localhost:3002 API_URL=http://localhost:3333/api node fccpd-evidencias.cjs
// Pré-requisitos: PostgreSQL e Redis (Docker), API, worker e site rodando (veja o README da raiz).
const { chromium } = require('playwright-core');

const FRONT = process.env.FRONT_URL ?? 'http://localhost:3002';
const API = process.env.API_URL ?? 'http://localhost:3333/api';
const dormir = ms => new Promise(r => setTimeout(r, ms));
const titulo = t => console.log(`\n=== ${t} ===`);

async function chamar(caminho, { token, method = 'GET', body } = {}) {
  const r = await fetch(API + caminho, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, cache: r.headers.get('x-cache'), json: await r.json() };
}

(async () => {
  titulo('1. Backend em funcionamento (GET /api/health: API, banco e Redis)');
  const saude = await chamar('/health');
  console.log(`HTTP ${saude.status}`, JSON.stringify(saude.json.data));

  titulo('2. Backend → Redis: o cache da vitrine (cabeçalho X-Cache)');
  for (const q of ['limit=12&ordenacao=preco-desc&precoMin=0.01', 'limit=12&ordenacao=preco-desc&precoMin=0.01']) {
    const r = await chamar(`/produtos?${q}`);
    console.log(`GET /api/produtos?${q} → HTTP ${r.status} · X-Cache: ${r.cache} · ${r.json.data.length} peças`);
  }

  titulo('3. Backend → PostgreSQL: dados lidos e gravados (compra pela API)');
  const login = await chamar('/auth/login', { method: 'POST', body: { email: 'comprador@pontodaterra.com', senha: 'comprador123' } });
  const token = login.json.data.token;
  console.log(`POST /api/auth/login → HTTP ${login.status} (perfil: ${login.json.data.usuario.tipo})`);
  const vitrine = (await chamar('/produtos?limit=50')).json.data;
  const peca = vitrine.find(p => p.titulo.includes('Moringa'));
  const compra = await chamar('/checkout', { token, method: 'POST', body: { itens: [{ produtoId: peca.id, quantidade: 1 }], endereco: { cep: '50030-230', rua: 'Rua da Aurora', numero: '100', cidade: 'Recife', estado: 'PE' } } });
  const codigo = compra.json.data.codigo;
  console.log(`POST /api/checkout → HTTP ${compra.status} · compra ${codigo} · pedidos: ${compra.json.data.pedidos.length}`);
  const pg = await chamar(`/compras/${codigo}/pagamento`, { token, method: 'POST', body: { metodo: 'PIX', parcelas: 1 } });
  console.log(`POST /api/compras/${codigo}/pagamento (PIX) → HTTP ${pg.status}`);
  console.log(`CODIGO_COMPRA=${codigo}`);

  titulo('4. Frontend → Backend: chamadas HTTP feitas pelo navegador ao abrir a vitrine');
  const browser = await chromium.launch({ channel: process.env.BROWSER ?? 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const chamadasApi = [];
  page.on('response', r => {
    const u = new URL(r.url());
    if (r.url().startsWith(API)) chamadasApi.push(`${r.request().method()} ${u.pathname}${u.search ? '?…' : ''} → HTTP ${r.status()}`);
  });
  await page.goto(`${FRONT}/vitrine`, { waitUntil: 'networkidle' });
  await dormir(1000);
  console.log(`Página aberta: ${FRONT}/vitrine`);
  for (const c of [...new Set(chamadasApi)]) console.log(`  ${c}`);
  await browser.close();

  titulo('5. Aguardando o worker (fila) processar o evento do novo pedido');
  await dormir(6000);
  const notif = await chamar('/auth/login', { method: 'POST', body: { email: 'artesao@pontodaterra.com', senha: 'artesao123' } });
  const lista = await chamar('/notificacoes?limit=5', { token: notif.json.data.token });
  const nova = (lista.json.data ?? []).find(n => n.payload && n.payload.codigoCompra === codigo);
  console.log(nova ? `Notificação do artesão criada pelo worker: tipo=${nova.tipoEvento}, compra=${nova.payload.codigoCompra}` : 'Notificação ainda não encontrada');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
