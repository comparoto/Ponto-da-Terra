// E2E da fase 2: contato (HU14), pagamentos (TC15/TC16), fila (HU12), pedidos e rastreio (HU13/TC12), avaliação (HU17), admin (HU9/HU10/HU16) e orientação (HU15).
// Uso: cd e2e && npm install && npm test
// Requer a API, o worker e o frontend rodando (ver README da raiz) e o banco populado pelo seed.
// Variáveis opcionais: FRONT_URL (padrão http://localhost:3000), API_URL (padrão http://localhost:3333/api),
// BROWSER (canal do navegador instalado: msedge | chrome; padrão msedge), HEADLESS=false para ver o navegador.
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
/** Espera o elemento aparecer (até 15 s); devolve true/false em vez de lançar erro. */
const aparece = loc => loc.first().waitFor({ timeout: 15000 }).then(() => true, () => false);
const sair = page => page.evaluate(() => localStorage.removeItem('ponto_da_terra_session_v2'));

(async () => {
  // ── Preparação via API: peça nova (5 unidades) aprovada e um comprador novo ──
  const marca = Date.now();
  const titulo = `Peça de teste E2E ${marca}`;
  const emailComprador = `e2e-${marca}@teste.com`;
  const artesao = await tokenDe('artesao@pontodaterra.com', 'artesao123');
  const admin = await tokenDe('admin@pontodaterra.com', 'admin123');
  const peca = await chamar('/produtos', { token: artesao, method: 'POST', body: { titulo, tecnica: 'Barro', poloOrigem: 'Caruaru', preco: 100, estoque: 5, imagensUrls: ['https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400'] } });
  await chamar(`/admin/produtos/${peca.data.id}/aprovar`, { token: admin, method: 'POST' });
  await chamar('/auth/cadastro', { method: 'POST', body: { nome: 'Compradora E2E', email: emailComprador, senha: 'segredo1' } });

  const browser = await chromium.launch({ channel: process.env.BROWSER ?? 'msedge', headless: process.env.HEADLESS !== 'false' });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));

  try {
    // ── Comprador: contatar produtor (HU14) e adicionar à sacola ──
    await login(page, emailComprador, 'segredo1', '/home');
    await page.goto(`${FRONT}/produtos?q=${encodeURIComponent(titulo)}`);
    await page.getByText(titulo, { exact: true }).first().click();
    const modal = page.getByRole('dialog');
    await modal.getByRole('button', { name: 'Contatar produtor' }).click();
    await modal.getByRole('button', { name: 'Enviar' }).click();
    ok('HU14 · mensagem vazia é bloqueada', await modal.getByText('O campo de mensagem não pode ficar vazio').isVisible());
    await modal.getByLabel('Mensagem para o artesão').fill('Vocês fazem essa peça em tamanho maior?');
    await modal.getByRole('button', { name: 'Enviar' }).click();
    await modal.getByText(/Mensagem enviada/).waitFor({ timeout: 10000 });
    ok('HU14 · dúvida enviada ao artesão', true);
    await modal.getByRole('button', { name: /Adicionar à Sacola/ }).click();
    await page.getByRole('dialog').filter({ hasText: 'Sua Sacola' }).getByRole('button', { name: 'Finalizar Pedido' }).click();
    await page.waitForURL('**/checkout');

    // ── Checkout: endereço + cartão recusado (TC15) ──
    await page.getByLabel('CEP').fill('01310-100');
    await page.getByRole('button', { name: 'Calcular' }).click();
    await page.getByText(/Entrega para 01310-100/).waitFor({ timeout: 10000 });
    await page.getByLabel('Rua').fill('Av. Paulista');
    await page.getByLabel('Número', { exact: true }).fill('1000');
    await page.getByLabel('Cidade').fill('São Paulo');
    await page.getByLabel('UF').selectOption('SP');
    await page.getByText('Cartão de Crédito (até 6x sem juros)').click();
    await page.getByLabel('Número do cartão').fill('4000 0000 0000 0002');
    await page.getByLabel('Validade').fill('12/30');
    await page.getByLabel('CVV').fill('123');
    await page.getByLabel('Titular').fill('Compradora E2E');
    await page.getByRole('button', { name: 'Pagar e Concluir Pedido' }).click();
    const alerta = page.getByRole('alert').filter({ hasText: /recusado/ });
    await alerta.waitFor({ timeout: 15000 });
    ok('TC15 · cartão recusado mostra mensagem amigável', /saldo insuficiente/i.test(await alerta.textContent()));
    ok('TC15 · carrinho continua intacto após a recusa', await page.getByText(titulo).first().isVisible());

    // ── PIX com QR Code (TC16) ──
    await page.getByText('PIX (QR Code e copia e cola, válido por 30 minutos)').click();
    await page.getByRole('button', { name: 'Gerar PIX e Concluir Pedido' }).click();
    await page.waitForURL('**/compra/**', { timeout: 20000 });
    const codigoCompra = page.url().split('/compra/')[1];
    await page.getByAltText('QR Code do PIX').waitFor({ timeout: 10000 });
    ok('TC16 · QR Code e copia e cola exibidos', await page.getByRole('button', { name: 'Copiar código PIX' }).isVisible());
    ok('TC16 · contagem regressiva de expiração', /Expira em (29|30):/.test(await page.getByRole('timer').textContent()));
    await page.getByRole('button', { name: 'Simular pagamento aprovado' }).click();
    await page.getByText('Pedido confirmado!').waitFor({ timeout: 15000 });
    ok('TC16 · pagamento confirmado pelo gateway simulado', true, codigoCompra);

    // ── Artesão: notificação da fila (HU12), mensagem (HU14), status e rastreio (HU13) ──
    await sair(page);
    await login(page, 'artesao@pontodaterra.com', 'artesao123', '/artesao');
    await page.getByRole('button', { name: 'Notificações' }).click();
    await page.getByText(new RegExp(`${codigoCompra}`)).first().waitFor({ timeout: 15000 });
    ok('HU12 · artesão recebeu a notificação "Novo pedido" gerada pelo worker', await page.getByText('Novo pedido recebido').first().isVisible());
    await page.getByRole('button', { name: 'Mensagens' }).click();
    ok('HU14 · dúvida aparece no painel do artesão', await aparece(page.getByText('Vocês fazem essa peça em tamanho maior?')));
    await page.getByRole('button', { name: 'Pedidos' }).click();
    const cartao = page.locator('div').filter({ hasText: codigoCompra }).filter({ has: page.getByRole('button', { name: 'Iniciar produção' }) }).last();
    await cartao.getByRole('button', { name: 'Iniciar produção' }).click();
    const cartaoProd = page.locator('div').filter({ hasText: codigoCompra }).filter({ has: page.getByRole('button', { name: 'Marcar como postado' }) }).last();
    await cartaoProd.getByRole('button', { name: 'Marcar como postado' }).waitFor({ timeout: 10000 });
    await cartaoProd.getByRole('button', { name: 'Marcar como postado' }).click();
    ok('HU13 · postar sem código de rastreio é bloqueado', await page.getByText('Informe o código de rastreio dos Correios antes de confirmar a postagem.').isVisible());
    await cartaoProd.getByLabel('Código de rastreio').fill('AA123456789BR');
    await cartaoProd.getByRole('button', { name: 'Marcar como postado' }).click();
    await page.getByText('Rastreio:').filter({ hasText: 'AA123456789BR' }).first().waitFor({ timeout: 10000 });
    ok('HU13 · pedido postado com código de rastreio', true);
    await page.getByRole('button', { name: 'Indicadores' }).click();
    ok('HU18 · indicadores do artesão carregam', await aparece(page.getByText('Faturamento no período')));

    // ── Comprador: linha do tempo e rastreio (TC12), recebimento e avaliação (HU17) ──
    await sair(page);
    await login(page, emailComprador, 'segredo1', '/home');
    await page.goto(`${FRONT}/meus-pedidos`);
    await page.getByText('AA123456789BR').waitFor({ timeout: 15000 });
    ok('TC12 · comprador vê o código de rastreio e o link dos Correios', await page.getByRole('link', { name: 'Rastrear nos Correios' }).isVisible());
    ok('TC12 · linha do tempo com 4 etapas', (await page.getByRole('list', { name: 'Linha do tempo do pedido' }).getByRole('listitem').count()) === 4);
    await page.getByRole('button', { name: 'Confirmar recebimento' }).click();
    await page.getByRole('button', { name: 'Avaliar' }).waitFor({ timeout: 10000 });
    await page.getByRole('button', { name: 'Avaliar' }).click();
    await page.getByRole('radio', { name: '5 estrelas' }).click();
    await page.getByPlaceholder(/Conte sobre a qualidade/).fill('Peça linda e chegou bem embalada!');
    await page.getByRole('button', { name: 'Enviar avaliação' }).click();
    await page.getByText('✓ Avaliado').waitFor({ timeout: 10000 });
    ok('HU17 · avaliação registrada após a entrega', true);

    // ── Admin: indicadores (HU9), pedidos (HU10), suspensão (HU16) ──
    await sair(page);
    await login(page, 'admin@pontodaterra.com', 'admin123', '/admin');
    await page.getByText('Receita bruta').waitFor({ timeout: 15000 });
    ok('HU9 · dashboard com receita bruta e rankings', await page.getByText('Peças mais vendidas').isVisible());
    await page.getByRole('button', { name: 'Pedidos', exact: true }).click();
    ok('HU10 · admin vê o pedido com comprador e artesão', await aparece(page.getByText(new RegExp(codigoCompra + '.*em aberto'))));
    await page.getByRole('button', { name: 'Usuários' }).click();
    await page.getByLabel('Buscar usuário').fill(emailComprador);
    const linha = page.locator('div').filter({ hasText: emailComprador }).filter({ has: page.getByRole('button', { name: 'Suspender conta' }) }).last();
    await linha.getByRole('button', { name: 'Suspender conta' }).click({ timeout: 15000 });
    await page.getByPlaceholder(/Motivo formal da suspensão/).fill('Teste automatizado de suspensão de conta');
    await page.getByRole('button', { name: 'Confirmar suspensão' }).click();
    await page.getByRole('button', { name: 'Reativar conta' }).waitFor({ timeout: 10000 });
    ok('HU16 · conta suspensa pelo admin', (await page.getByText('SUSPENSO').count()) > 0);
    const bloqueado = await chamar('/auth/login', { method: 'POST', body: { email: emailComprador, senha: 'segredo1' } });
    ok('HU16 · conta suspensa não consegue entrar', bloqueado.error === 'Conta suspensa');
    await page.getByRole('button', { name: 'Reativar conta' }).click();
    await page.getByRole('button', { name: 'Suspender conta' }).first().waitFor({ timeout: 10000 });
    ok('HU16 · conta reativada', true);

    // ── Visitante: Central de orientação (HU15) ──
    await sair(page);
    await page.goto(`${FRONT}/orientacao`);
    await page.getByText('Como se legalizar').waitFor();
    await page.getByRole('checkbox', { name: 'CPF' }).check({ force: true });
    ok('HU15 · checklist calcula a prontidão', await page.getByText('Prontidão: 17%').isVisible());
    await page.getByLabel('Polo regional').selectOption('Sertão');
    ok('HU15 · filtro por polo mostra onde procurar atendimento', await page.getByText(/Petrolina/).isVisible());
  } catch (e) {
    ok('Execução do roteiro', false, String(e.message).split('\n')[0]);
    await page.screenshot({ path: path.join(SAIDA, 'falha-fase2.png'), fullPage: true }).catch(() => {});
  }

  ok('Nenhum erro de JavaScript nas páginas', erros.length === 0, erros.join(' | '));
  await browser.close();

  // Limpeza: a peça de teste tem pedido, então não pode ser apagada. Ela sai da vitrine (edição → PENDENTE)
  // e é reprovada, para não ficar na fila de curadoria do admin.
  await chamar(`/produtos/${peca.data.id}`, { token: artesao, method: 'PUT', body: { descricao: 'Peça criada pelo teste E2E.' } });
  await chamar(`/admin/produtos/${peca.data.id}/reprovar`, { token: admin, method: 'POST', body: { justificativa: 'Peça criada por teste automatizado (E2E).' } });

  const falhas = resultados.filter(r => !r.ok).length;
  console.log(`\n${resultados.length - falhas}/${resultados.length} verificações passaram`);
  process.exit(falhas ? 1 : 0);
})();
