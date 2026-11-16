import type { z } from 'zod';
import {
  avaliacaoCriadaResposta,
  avaliacoesProdutoResposta,
  cadastroArtesaoResposta,
  checklistResposta,
  compraResposta,
  eventoProcessadoResposta,
  indicadoresArtesaoResposta,
  mensagemEnviadaResposta,
  mensagemRecebidaResposta,
  metricasAdminResposta,
  pedidoResposta,
  usuarioAdminResposta,
} from '../src/docs/respostas';
import { api, bearer, CARTAO_OK, checkout, ciclo, ENDERECO, login, novoComprador, pagar, pecaAtiva, prisma, unico } from './helpers';

ciclo();

/**
 * Contrato das respostas: chama as rotas de verdade e compara o JSON recebido com os schemas
 * documentados no Swagger (src/docs/respostas.ts).
 *
 * O Zod descarta campos que o schema não conhece. Por isso, além de validar, o teste exige que a
 * resposta interpretada seja IGUAL à resposta real: um campo que o código devolve e a
 * documentação não cita (ou o contrário) faz o teste falhar.
 */
function conferir<S extends z.ZodTypeAny>(schema: S, dados: unknown, onde: string) {
  const r = schema.safeParse(dados);
  if (!r.success) throw new Error(`${onde}: a resposta não bate com a documentação: ${JSON.stringify(r.error.issues.slice(0, 3))}`);
  expect({ onde, interpretada: r.data }).toEqual({ onde, interpretada: dados }); // sem campos não documentados
}

const lista = (res: { status: number; body: { data: unknown } }, onde: string) => {
  expect({ onde, status: res.status }).toEqual({ onde, status: 200 });
  return res.body.data as unknown[];
};
const itensDe = (schema: z.ZodTypeAny, dados: unknown[], onde: string) => dados.forEach((d, i) => conferir(schema, d, `${onde}[${i}]`));

describe('Contrato · administração', () => {
  it('usuários: lista, suspender, inativar e reativar', async () => {
    const admin = (await login('admin')).token;
    itensDe(usuarioAdminResposta, lista(await api().get('/api/admin/usuarios?limit=20').set(bearer(admin)), 'GET /admin/usuarios'), 'usuários');

    const alvo = await novoComprador();
    const motivo = { motivo: 'Motivo com mais de dez caracteres' };
    for (const [rota, corpo] of [['suspender', motivo], ['reativar', undefined], ['inativar', {}], ['reativar', undefined]] as const) {
      const res = await api().post(`/api/admin/usuarios/${alvo.usuario.id}/${rota}`).set(bearer(admin)).send(corpo);
      expect(res.status).toBe(200);
      conferir(usuarioAdminResposta, res.body.data, `POST /admin/usuarios/:id/${rota}`);
    }
  });

  it('cadastros de artesãos: fila, aprovar e reprovar', async () => {
    const admin = (await login('admin')).token;
    const cadastrar = () =>
      api()
        .post('/api/auth/cadastro')
        .send({ nome: 'Artesã de Contrato', email: `${unico('contrato').replace(/\W/g, '')}@teste.com`, senha: 'segredo1', tipo: 'ARTESAO', cidade: 'Olinda', estado: 'PE', especialidade: 'Barro' });
    const a = (await cadastrar()).body.data.usuario.artesaoId;
    const b = (await cadastrar()).body.data.usuario.artesaoId;

    const fila = lista(await api().get('/api/admin/cadastros').set(bearer(admin)), 'GET /admin/cadastros');
    expect(fila.length).toBeGreaterThanOrEqual(2);
    itensDe(cadastroArtesaoResposta, fila, 'cadastros');

    const aprovado = await api().post(`/api/admin/artesaos/${a}/aprovar-cadastro`).set(bearer(admin));
    conferir(cadastroArtesaoResposta, aprovado.body.data, 'aprovar-cadastro');
    const reprovado = await api().post(`/api/admin/artesaos/${b}/reprovar-cadastro`).set(bearer(admin)).send({ motivo: 'Fotos não comprovam a técnica artesanal' });
    conferir(cadastroArtesaoResposta, reprovado.body.data, 'reprovar-cadastro');
  });

  it('métricas do painel do admin', async () => {
    const admin = (await login('admin')).token;
    // uma venda e uma busca, para as listas virem preenchidas
    const peca = await pecaAtiva(3, 80);
    const comprador = await novoComprador();
    const c = await checkout(comprador.token, [{ produtoId: peca.id, quantidade: 1 }]);
    await pagar(comprador.token, c.body.data.codigo, { metodo: 'CARTAO', parcelas: 1, cartao: CARTAO_OK });
    await api().get('/api/produtos?q=contrato');

    const res = await api().get('/api/admin/dashboard/metricas').set(bearer(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.artesaosMaisAtivos.length).toBeGreaterThan(0);
    conferir(metricasAdminResposta, res.body.data, 'GET /admin/dashboard/metricas');
  });
});

describe('Contrato · painel do artesão', () => {
  it('indicadores (com e sem vendas) e checklist', async () => {
    const artesao = (await login('artesao')).token;
    conferir(indicadoresArtesaoResposta, (await api().get('/api/artesao/indicadores').set(bearer(artesao))).body.data, 'GET /artesao/indicadores');

    const semVendas = await api()
      .post('/api/auth/cadastro')
      .send({ nome: 'Sem Vendas', email: `${unico('semvendas').replace(/\W/g, '')}@teste.com`, senha: 'segredo1', tipo: 'ARTESAO', cidade: 'Olinda', estado: 'PE', especialidade: 'Barro' });
    const res = await api().get('/api/artesao/indicadores').set(bearer(semVendas.body.data.token));
    expect(res.body.data.mensagem).toEqual(expect.any(String)); // mensagem preenchida quando não há vendas
    conferir(indicadoresArtesaoResposta, res.body.data, 'indicadores sem vendas');

    conferir(checklistResposta, (await api().get('/api/artesao/checklist').set(bearer(artesao))).body.data, 'GET /artesao/checklist');
    const salvo = await api().put('/api/artesao/checklist').set(bearer(artesao)).send({ itensConcluidos: ['rg', 'cpf'] });
    expect(salvo.body.data.percentualConclusao).toBe(33);
    conferir(checklistResposta, salvo.body.data, 'PUT /artesao/checklist');
  });
});

describe('Contrato · compra, pagamento, pedidos, avaliação e mensagens', () => {
  it('percorre o caminho inteiro: mensagem, checkout, PIX, boleto, despacho, entrega, avaliação e intervenção', async () => {
    const peca = await pecaAtiva(10, 120);
    const comprador = await novoComprador();
    const artesao = (await login('artesao')).token;
    const admin = (await login('admin')).token;

    // Mensagem ao produtor
    const msg = await api().post(`/api/produtos/${peca.id}/mensagens`).set(bearer(comprador.token)).send({ mensagem: 'Vocês fazem em tamanho maior?' });
    expect(msg.status).toBe(201);
    conferir(mensagemEnviadaResposta, msg.body.data, 'POST /produtos/:id/mensagens');
    const recebidas = lista(await api().get('/api/artesao/mensagens').set(bearer(artesao)), 'GET /artesao/mensagens');
    expect(recebidas.length).toBeGreaterThan(0);
    itensDe(mensagemRecebidaResposta, recebidas, 'mensagens');

    // Compra: criada, com PIX e consulta
    const c = await checkout(comprador.token, [{ produtoId: peca.id, quantidade: 1 }]);
    expect(c.status).toBe(201);
    conferir(compraResposta, c.body.data, 'POST /checkout');
    const codigo = c.body.data.codigo as string;
    const pix = await pagar(comprador.token, codigo, { metodo: 'PIX' });
    expect(pix.body.data.pagamento.pixQrCode).toEqual(expect.any(String));
    conferir(compraResposta, pix.body.data, 'POST /compras/:codigo/pagamento (PIX)');
    conferir(compraResposta, (await api().get(`/api/compras/${codigo}`).set(bearer(comprador.token))).body.data, 'GET /compras/:codigo');
    const paga = await api().post(`/api/compras/${codigo}/simular-pagamento`).set(bearer(comprador.token));
    expect(paga.body.data.status).toBe('PAGA');
    conferir(compraResposta, paga.body.data, 'POST /compras/:codigo/simular-pagamento');

    // Boleto: a resposta documentada é o PDF
    const c2 = await checkout(comprador.token, [{ produtoId: peca.id, quantidade: 1 }]);
    const boleto = await pagar(comprador.token, c2.body.data.codigo, { metodo: 'BOLETO' });
    conferir(compraResposta, boleto.body.data, 'POST /compras/:codigo/pagamento (boleto)');
    // A URL é absoluta quando PUBLIC_URL está definida e relativa quando não está (como no CI)
    const pdf = await api().get(new URL(boleto.body.data.pagamento.boletoUrl, 'http://localhost').pathname);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toMatch(/application\/pdf/);

    // Cartão: aprovado
    const c3 = await checkout(comprador.token, [{ produtoId: peca.id, quantidade: 1 }]);
    const cartao = await pagar(comprador.token, c3.body.data.codigo, { metodo: 'CARTAO', parcelas: 2, cartao: CARTAO_OK });
    conferir(compraResposta, cartao.body.data, 'POST /compras/:codigo/pagamento (cartão)');

    // Pedidos: visão do artesão (com comprador), do comprador (com "avaliado") e do admin (com intervenções)
    const pedidoId = c.body.data.pedidos[0].id as string;
    const despachado = await api().patch(`/api/artesao/pedidos/${pedidoId}/status`).set(bearer(artesao)).send({ status: 'DESPACHADO', codigoRastreio: 'AA123456789BR' });
    expect(despachado.status).toBe(200);
    conferir(pedidoResposta, despachado.body.data, 'PATCH /artesao/pedidos/:id/status');
    const entregue = await api().post(`/api/pedidos/${pedidoId}/confirmar-recebimento`).set(bearer(comprador.token));
    expect(entregue.status).toBe(200);
    conferir(pedidoResposta, entregue.body.data, 'POST /pedidos/:id/confirmar-recebimento');

    const detalhe = await api().get(`/api/pedidos/${pedidoId}`).set(bearer(comprador.token));
    expect(detalhe.body.data.itens[0]).toHaveProperty('avaliado');
    conferir(pedidoResposta, detalhe.body.data, 'GET /pedidos/:id (comprador)');
    itensDe(pedidoResposta, lista(await api().get('/api/comprador/pedidos').set(bearer(comprador.token)), 'GET /comprador/pedidos'), 'pedidos do comprador');
    itensDe(pedidoResposta, lista(await api().get('/api/artesao/pedidos').set(bearer(artesao)), 'GET /artesao/pedidos'), 'pedidos do artesão');
    itensDe(pedidoResposta, lista(await api().get('/api/admin/pedidos').set(bearer(admin)), 'GET /admin/pedidos'), 'pedidos do admin');

    const intervencao = await api().post(`/api/admin/pedidos/${pedidoId}/intervencoes`).set(bearer(admin)).send({ nota: 'Contato com o comprador sobre a entrega' });
    expect(intervencao.status).toBe(201);
    expect(intervencao.body.data.intervencoes).toHaveLength(1);
    conferir(pedidoResposta, intervencao.body.data, 'POST /admin/pedidos/:id/intervencoes');

    // Avaliação
    const nota = await api().post('/api/avaliacoes').set(bearer(comprador.token)).send({ produtoId: peca.id, nota: 5, comentario: 'Peça linda!' });
    expect(nota.status).toBe(201);
    conferir(avaliacaoCriadaResposta, nota.body.data, 'POST /avaliacoes');
    const avaliacoes = await api().get(`/api/produtos/${peca.id}/avaliacoes`);
    expect(avaliacoes.body.data.avaliacoes).toHaveLength(1);
    conferir(avaliacoesProdutoResposta, avaliacoes.body.data, 'GET /produtos/:id/avaliacoes');
  });

  it('endereço do checkout segue o mesmo formato da compra', async () => {
    const peca = await pecaAtiva(2, 70);
    const comprador = await novoComprador();
    const c = await checkout(comprador.token, [{ produtoId: peca.id, quantidade: 1 }]);
    expect(c.body.data.endereco).toMatchObject({ cep: ENDERECO.cep, rua: ENDERECO.rua, cidade: ENDERECO.cidade, estado: ENDERECO.estado });
    expect(await prisma.compra.count({ where: { codigo: c.body.data.codigo } })).toBe(1);
  });
});

describe('Contrato · fila', () => {
  it('evento processado (otimização de foto que não existe mais) devolve o resultado documentado', async () => {
    const evento = {
      id: 'evento-de-contrato',
      tipo: 'IMAGEM_ENVIADA',
      payload: { url: 'http://localhost/uploads/produtos/inexistente.jpg', pasta: 'produtos', alvo: { tipo: 'produto', produtoId: '00000000-0000-4000-8000-000000000000' } },
    };
    const res = await api().post('/api/jobs/evento').set(bearer(process.env.CRON_SECRET!)).send(evento);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ processada: false });
    conferir(eventoProcessadoResposta, res.body.data, 'POST /jobs/evento');
  });
});
