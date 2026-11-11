/* eslint-disable */
// Teste de carga e concorrência do checkout (TC02 / FCCPD) com k6 — https://k6.io
//
// Cenário: 1 peça com exatamente 1 unidade e 50 compradores enviando POST /api/checkout
// ao mesmo tempo. Resultado esperado: exatamente 1 × 201 e 49 × 400 ("Item esgotado durante
// a finalização"); estoque final = 0 (nunca negativo).
//
// Uso (com a API rodando e o banco populado pelo seed):
//   k6 run tests/carga/checkout-concorrente.k6.js
//   k6 run -e API=https://sua-api.onrender.com/api -e VUS=100 tests/carga/checkout-concorrente.k6.js
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const API = __ENV.API || 'http://localhost:3333/api';
const VUS = Number(__ENV.VUS || 50);

const vendas = new Counter('checkout_sucesso');
const esgotados = new Counter('checkout_esgotado');
const inesperados = new Counter('checkout_inesperado');

export const options = {
  scenarios: {
    // Todos os VUs disparam UMA vez, praticamente no mesmo instante
    corrida: { executor: 'per-vu-iterations', vus: VUS, iterations: 1, maxDuration: '60s' },
  },
  thresholds: {
    checkout_sucesso: ['count==1'],
    checkout_esgotado: [`count==${VUS - 1}`],
    checkout_inesperado: ['count==0'],
    http_req_duration: ['p(95)<2000'],
  },
};

const json = { headers: { 'Content-Type': 'application/json' } };
const auth = token => ({ headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
const login = (email, senha) => http.post(`${API}/auth/login`, JSON.stringify({ email, senha }), json).json('data.token');

export function setup() {
  const artesao = login('artesao@pontodaterra.com', 'artesao123');
  const admin = login('admin@pontodaterra.com', 'admin123');

  // Peça nova com 1 unidade, aprovada pelo admin
  const peca = http
    .post(
      `${API}/produtos`,
      JSON.stringify({ titulo: `Peça única (carga ${Date.now()})`, tecnica: 'Barro', poloOrigem: 'Caruaru', preco: 150, estoque: 1, imagensUrls: ['https://exemplo.com/peca.jpg'] }),
      auth(artesao),
    )
    .json('data.id');
  http.post(`${API}/admin/produtos/${peca}/aprovar`, null, auth(admin));

  // 50 compradores distintos
  const tokens = [];
  const rodada = Date.now();
  for (let i = 0; i < VUS; i++) {
    const r = http.post(`${API}/auth/cadastro`, JSON.stringify({ nome: `Comprador carga ${i}`, email: `carga-${rodada}-${i}@teste.com`, senha: 'segredo1' }), json);
    tokens.push(r.json('data.token'));
  }
  return { peca, tokens, artesao };
}

export default function (dados) {
  const token = dados.tokens[__VU - 1];
  const res = http.post(
    `${API}/checkout`,
    JSON.stringify({
      itens: [{ produtoId: dados.peca, quantidade: 1 }],
      endereco: { cep: '01310-100', rua: 'Av. Paulista', numero: '1000', cidade: 'São Paulo', estado: 'SP' },
    }),
    auth(token),
  );

  if (res.status === 201) vendas.add(1);
  else if (res.status === 400 && res.json('error') === 'Item esgotado durante a finalização') esgotados.add(1);
  else inesperados.add(1);

  check(res, { 'status é 201 ou 400': r => r.status === 201 || r.status === 400 });
}

export function teardown(dados) {
  const peca = http.get(`${API}/artesao/produtos/${dados.peca}`, auth(dados.artesao)).json('data');
  console.log(`Estoque final da peça: ${peca.estoque} (esperado: 0)`);
  check(peca, { 'estoque final é 0 (sem overselling)': p => p.estoque === 0 });
}
