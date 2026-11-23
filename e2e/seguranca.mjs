// Testes de segurança "caixa-preta" contra a API em execução: JWT forjado, escalada de privilégio,
// mass assignment, SQL injection, IDOR, webhook sem segredo, corpo gigante, cabeçalhos, CORS,
// vazamento de erro, enumeração de usuários, força bruta no login e upload disfarçado.
// Uso: cd e2e && npm run test:seguranca   (API_URL opcional, padrão http://localhost:3333/api)
import { createHmac } from 'node:crypto';

const API = process.env.API_URL ?? 'http://localhost:3333/api';
const res = [];
const ok = (nome, cond, detalhe = '') => {
  res.push(!!cond);
  console.log(`${cond ? 'PASSOU' : 'FALHOU'} · ${nome}${detalhe ? ' — ' + detalhe : ''}`);
};
const chamar = async (caminho, { token, method = 'GET', body, headers = {}, bruto } = {}) => {
  const r = await fetch(API + caminho, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: bruto ?? (body ? JSON.stringify(body) : undefined),
  });
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json, headers: r.headers };
};
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');

const login = async (email, senha) => (await chamar('/auth/login', { method: 'POST', body: { email, senha } })).json.data;
const comprador = await login('comprador@pontodaterra.com', 'comprador123');
const admin = await login('admin@pontodaterra.com', 'admin123');

// 1) JWT forjado com alg "none" e papel ADMIN
const semAssinatura = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: comprador.usuario.id, tipo: 'ADMIN', tv: 0 })}.`;
// 401 = recusado pela API; 403 = barrado antes, pelo firewall da plataforma (ex.: Vercel)
const algNone = (await chamar('/admin/curadoria', { token: semAssinatura })).status;
ok('JWT com alg "none" é rejeitado', algNone === 401 || algNone === 403, `HTTP ${algNone}`);

// 2) JWT do comprador com o papel trocado para ADMIN (assinatura inválida)
const [h, p, s] = comprador.token.split('.');
const payload = JSON.parse(Buffer.from(p, 'base64url'));
const adulterado = `${h}.${b64({ ...payload, tipo: 'ADMIN' })}.${s}`;
ok('JWT com payload adulterado (tipo → ADMIN) é rejeitado', (await chamar('/admin/curadoria', { token: adulterado })).status === 401);

// 3) JWT assinado com segredo "chutado"
const chute = (() => {
  const cab = b64({ alg: 'HS256', typ: 'JWT' }), corpo = b64({ ...payload, tipo: 'ADMIN' });
  return `${cab}.${corpo}.${createHmac('sha256', 'secret').update(`${cab}.${corpo}`).digest('base64url')}`;
})();
ok('JWT assinado com segredo comum ("secret") é rejeitado', (await chamar('/admin/curadoria', { token: chute })).status === 401);

// 4) Escalada de privilégio pelo cadastro (tentando virar ADMIN)
const esc = await chamar('/auth/cadastro', { method: 'POST', body: { nome: 'Hacker', email: `hacker${Date.now()}@teste.com`, senha: 'segredo1', tipo: 'ADMIN' } });
ok('Cadastro não permite criar conta ADMIN', esc.status === 400, `HTTP ${esc.status}`);

// 5) Mass assignment no PUT /me (tipo/status)
const ma = await chamar('/me', { token: comprador.token, method: 'PUT', body: { nome: 'Comprador Demonstração', tipo: 'ADMIN', status: 'ATIVO' } });
ok('PUT /me recusa campos extras (mass assignment)', ma.status === 400);

// 6) SQL injection na busca e em parâmetros
const sqli = await chamar(`/produtos?busca=${encodeURIComponent("' OR 1=1; DROP TABLE \"Produto\"; --")}`);
ok('SQL injection na busca não quebra nem vaza dados', sqli.status === 200 && sqli.json.meta.totalItems === 0);
const sqliId = await chamar(`/produtos/${encodeURIComponent("1' OR '1'='1")}`);
ok('SQL injection no id é barrada pela validação (400)', sqliId.status === 400);
ok('Tabela de produtos continua íntegra', (await chamar('/produtos?limit=1')).json.meta.totalItems > 0);

// 7) Preço negativo / estoque manipulado pelo cliente
const precoNeg = await chamar('/carrinho/calcular', { method: 'POST', body: { itens: [{ produtoId: '00000000-0000-4000-8000-000000000000', quantidade: -5 }] } });
ok('Quantidade negativa no carrinho é recusada', precoNeg.status === 400);

// 8) IDOR em compras de outra pessoa
const compraAlheia = await chamar('/compras/PT-INEXISTENTE-0000', { token: comprador.token });
ok('Compra inexistente/alheia retorna 404 sem dados', compraAlheia.status === 404 && compraAlheia.json.data === null);

// 9) Webhook sem segredo
ok('Webhook de pagamento sem segredo é rejeitado', (await chamar('/pagamentos/webhook', { method: 'POST', body: { codigoTransacao: 'TX-1', status: 'APROVADO' } })).status === 401);

// 10) Corpo enorme (DoS simples)
const grande = await chamar('/auth/login', { method: 'POST', bruto: JSON.stringify({ email: 'a@a.com', senha: 'x'.repeat(2_000_000) }) });
ok('Corpo acima de 1 MB é recusado (413)', grande.status === 413);

// 11) Cabeçalhos de segurança (helmet) e CORS
const h1 = (await chamar('/health')).headers;
ok('Cabeçalhos de segurança presentes (helmet)', h1.get('x-content-type-options') === 'nosniff' && !!h1.get('content-security-policy'));
ok('Cabeçalho X-Powered-By removido', !h1.get('x-powered-by'));
const cors = await fetch(API + '/health', { headers: { Origin: 'https://site-malicioso.com' } });
ok('CORS não libera origens desconhecidas', cors.headers.get('access-control-allow-origin') !== 'https://site-malicioso.com');

// 12) Erros não vazam stack trace / detalhes internos
const malformado = await chamar('/auth/login', { method: 'POST', bruto: '{"email":' });
ok('Erro de JSON não expõe stack trace', malformado.status === 400 && !JSON.stringify(malformado.json).includes('at '));

// 13) Senha nunca aparece nas respostas
const me = await chamar('/me', { token: comprador.token });
ok('Perfil não expõe hash de senha', !JSON.stringify(me.json).toLowerCase().includes('senha'));

// 14) Enumeração de usuários no login
const inexistente = await chamar('/auth/login', { method: 'POST', body: { email: 'naoexiste@x.com', senha: 'qualquer1' } });
const senhaErrada = await chamar('/auth/login', { method: 'POST', body: { email: 'comprador@pontodaterra.com', senha: 'errada123' } });
ok('Login não revela se o e-mail existe', inexistente.json.error === senhaErrada.json.error);

// 15) Força bruta no login (sem limite de tentativas)
const alvo = `alvo-${Date.now()}@teste.com`;
const tentativas = [];
for (let i = 0; i < 30; i++) tentativas.push(await chamar('/auth/login', { method: 'POST', body: { email: alvo, senha: 'errada123' } }));
const bloqueadas = tentativas.filter(t => t.status === 429).length;
ok('Força bruta no login é limitada (rate limit)', bloqueadas > 0, `${bloqueadas}/30 tentativas bloqueadas`);

// 16) Upload de arquivo disfarçado (HTML com extensão .png)
const form = new FormData();
form.append('foto', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'xss.png');
const artesao = await login('artesao@pontodaterra.com', 'artesao123');
const up = await fetch(API + '/artesao/perfil/fotos', { method: 'POST', headers: { Authorization: `Bearer ${artesao.token}` }, body: form });
ok('Upload de HTML disfarçado de PNG é recusado', up.status === 400);

void admin;
const falhas = res.filter(r => !r).length;
console.log(`\n${res.length - falhas}/${res.length} verificações passaram`);
