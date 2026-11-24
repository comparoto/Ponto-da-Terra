import { randomUUID } from 'node:crypto';
import { StatusPedido } from '@prisma/client';
import { relatoriosService, type Periodo } from '../src/modules/relatorios/relatorios.service';
import { executarGrupo, picoDeSobreposicao, type IntervaloTarefa } from '../src/shared/execucao';
import { ciclo, ENDERECO, novoComprador, pecaAtiva, prisma } from './helpers';

/**
 * FCCPD (Unidade 2): o relatório concorrente (padrão) e o sequencial têm de produzir o MESMO resultado.
 * Também comprovam, com o início e o fim de cada consulta, que no modo sequencial nunca há duas consultas
 * ao mesmo tempo e que no modo concorrente todas estão em andamento simultaneamente.
 */
ciclo();

const dormir = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
type Dashboard = Awaited<ReturnType<typeof relatoriosService.dashboardAdmin>>;
/** Remove o campo de medição de tempo, que naturalmente muda entre execuções. */
const semTempo = ({ geradoEmMs: _tempo, ...resto }: Dashboard): Omit<Dashboard, 'geradoEmMs'> => resto;

describe('executarGrupo (abstração dos modos)', () => {
  const tarefas = () => ({
    a: async () => (await dormir(40), 'A'),
    b: async () => (await dormir(40), 'B'),
    c: async () => (await dormir(40), 'C'),
    d: async () => (await dormir(40), 'D'),
    e: async () => (await dormir(40), 'E'),
  });

  async function medir(modo: 'sequencial' | 'concorrente') {
    const intervalos: IntervaloTarefa[] = [];
    const inicio = performance.now();
    const resultados = await executarGrupo(tarefas(), { modo, observar: i => intervalos.push(i) });
    return { resultados, intervalos, totalMs: performance.now() - inicio };
  }

  it('os dois modos devolvem os mesmos resultados, com os mesmos nomes', async () => {
    const seq = await medir('sequencial');
    const conc = await medir('concorrente');
    expect(seq.resultados).toEqual({ a: 'A', b: 'B', c: 'C', d: 'D', e: 'E' });
    expect(conc.resultados).toEqual(seq.resultados);
  });

  it('sequencial: cada tarefa só começa depois que a anterior terminou (nenhuma sobreposição)', async () => {
    const { intervalos } = await medir('sequencial');
    expect(picoDeSobreposicao(intervalos)).toBe(1);
    const ordenados = [...intervalos].sort((x, y) => x.inicioMs - y.inicioMs);
    expect(ordenados.map(i => i.nome)).toEqual(['a', 'b', 'c', 'd', 'e']);
    for (let i = 1; i < ordenados.length; i++) expect(ordenados[i].inicioMs).toBeGreaterThanOrEqual(ordenados[i - 1].fimMs);
  });

  it('concorrente: todas as tarefas ficam em andamento ao mesmo tempo e o total é muito menor que a soma', async () => {
    const seq = await medir('sequencial');
    const conc = await medir('concorrente');
    expect(picoDeSobreposicao(conc.intervalos)).toBe(5);
    expect(conc.totalMs).toBeLessThan(seq.totalMs / 2);
  });

  it('o padrão é concorrente, e um erro em uma tarefa rejeita o grupo nos dois modos', async () => {
    const intervalos: IntervaloTarefa[] = [];
    await executarGrupo(tarefas(), { observar: i => intervalos.push(i) });
    expect(picoDeSobreposicao(intervalos)).toBe(5);

    const falha = { ok: async () => 1, ruim: async () => Promise.reject(new Error('falhou')) };
    await expect(executarGrupo(falha, { modo: 'sequencial' })).rejects.toThrow('falhou');
    await expect(executarGrupo(falha, { modo: 'concorrente' })).rejects.toThrow('falhou');
  });
});

describe('Relatórios · equivalência entre o modo sequencial e o concorrente', () => {
  const periodo: Periodo = { de: new Date('2020-01-01T00:00:00.000Z'), ate: new Date('2020-12-31T23:59:59.999Z') };
  const criados = { itens: [] as string[], pedidos: [] as string[], compras: [] as string[], enderecos: [] as string[] };
  let artesao1: string;
  let artesao2: string;

  beforeAll(async () => {
    const { consumidorId } = await novoComprador('Comprador Relatórios');
    const [p1, p2] = [await pecaAtiva(5, 100), await pecaAtiva(5, 50)];
    const p3 = await pecaAtiva(5, 200, 'artesao2@pontodaterra.com');
    artesao1 = p1.artesaoId;
    artesao2 = p3.artesaoId;

    const endereco = await prisma.endereco.create({ data: { consumidorId, ...ENDERECO } });
    criados.enderecos.push(endereco.id);

    async function pedido(artesaoId: string, dataPedido: string, status: StatusPedido, valor: number, itens: { produtoId: string; titulo: string; quantidade: number; preco: number }[]) {
      const compra = await prisma.compra.create({
        data: { codigo: `REL-${randomUUID().slice(0, 8)}`, consumidorId, enderecoId: endereco.id, valorProdutos: valor, valorFrete: 0, valorTotal: valor, reservaExpiraEm: new Date(dataPedido) },
      });
      const criado = await prisma.pedido.create({
        data: { compraId: compra.id, consumidorId, artesaoId, dataPedido: new Date(dataPedido), valorProdutos: valor, valorFrete: 0, valorTotal: valor, status },
      });
      criados.compras.push(compra.id);
      criados.pedidos.push(criado.id);
      for (const i of itens) {
        const item = await prisma.itemPedido.create({
          data: { pedidoId: criado.id, produtoId: i.produtoId, artesaoId, tituloProduto: i.titulo, quantidade: i.quantidade, precoUnitario: i.preco },
        });
        criados.itens.push(item.id);
      }
    }

    // Os dois artesãos faturam o mesmo (R$ 200) e duas peças vendem a mesma quantidade (5): empates que
    // só ficam determinísticos por causa do desempate explícito (id) nos rankings.
    await pedido(artesao1, '2020-03-10T12:00:00Z', StatusPedido.PAGO, 100, [{ produtoId: p1.id, titulo: p1.titulo, quantidade: 1, preco: 100 }]);
    await pedido(artesao1, '2020-04-15T12:00:00Z', StatusPedido.ENTREGUE, 100, [{ produtoId: p2.id, titulo: p2.titulo, quantidade: 5, preco: 20 }]);
    await pedido(artesao2, '2020-04-20T12:00:00Z', StatusPedido.EM_PRODUCAO, 200, [{ produtoId: p3.id, titulo: p3.titulo, quantidade: 5, preco: 40 }]);
    await pedido(artesao2, '2020-05-02T12:00:00Z', StatusPedido.CANCELADO, 999, [{ produtoId: p3.id, titulo: p3.titulo, quantidade: 9, preco: 111 }]);
    await pedido(artesao1, '2020-06-30T12:00:00Z', StatusPedido.DESPACHADO, 50, [{ produtoId: p1.id, titulo: p1.titulo, quantidade: 4, preco: 12.5 }]);
  });

  afterAll(async () => {
    await prisma.itemPedido.deleteMany({ where: { id: { in: criados.itens } } });
    await prisma.pedido.deleteMany({ where: { id: { in: criados.pedidos } } });
    await prisma.compra.deleteMany({ where: { id: { in: criados.compras } } });
    await prisma.endereco.deleteMany({ where: { id: { in: criados.enderecos } } });
  });

  it('dashboard do administrador: os dois modos devolvem exatamente o mesmo conteúdo (ignorando o tempo medido)', async () => {
    // alterna a ordem para que nenhum modo se beneficie sempre do cache do banco
    const rodadas = [] as { seq: ReturnType<typeof semTempo>; conc: ReturnType<typeof semTempo> }[];
    for (const primeiro of ['sequencial', 'concorrente', 'sequencial', 'concorrente'] as const) {
      const [a, b] = primeiro === 'sequencial' ? (['sequencial', 'concorrente'] as const) : (['concorrente', 'sequencial'] as const);
      const ra = semTempo(await relatoriosService.dashboardAdmin(periodo, { modo: a }));
      const rb = semTempo(await relatoriosService.dashboardAdmin(periodo, { modo: b }));
      rodadas.push(a === 'sequencial' ? { seq: ra, conc: rb } : { seq: rb, conc: ra });
    }
    for (const { seq, conc } of rodadas) expect(conc).toEqual(seq);

    const r = rodadas[0].seq;
    expect(r.receitaBruta).toBe(450); // 100 + 100 + 200 + 50 (o pedido cancelado não conta)
    expect(r.pedidosPagos).toBe(4);
    expect(r.pedidosConcluidos).toBe(1);
    expect(r.pedidosPorStatus).toEqual({ PAGO: 1, ENTREGUE: 1, EM_PRODUCAO: 1, CANCELADO: 1, DESPACHADO: 1 });
    // artesão 1 faturou 250; artesão 2, 200
    expect(r.artesaosMaisAtivos.map(a => [a.artesaoId, a.receita])).toEqual([
      [artesao1, 250],
      [artesao2, 200],
    ]);
  });

  it('empates nos rankings têm ordem determinística (por id) em qualquer modo', async () => {
    const maisVendidas = async (modo: 'sequencial' | 'concorrente') => (await relatoriosService.dashboardAdmin(periodo, { modo })).pecasMaisVendidas.map(p => [p.produtoId, p.quantidade]);
    const seq = await maisVendidas('sequencial');
    const conc = await maisVendidas('concorrente');
    expect(conc).toEqual(seq);
    // a peça de 5 unidades e a de 5 unidades (tie) ficam em ordem crescente de id
    const empatadas = seq.filter(([, q]) => q === 5).map(([id]) => id as string);
    expect(empatadas).toEqual([...empatadas].sort());
  });

  it('dashboard: sequencial não tem consultas sobrepostas; concorrente dispara as 8 ao mesmo tempo', async () => {
    const seq: IntervaloTarefa[] = [];
    const conc: IntervaloTarefa[] = [];
    await relatoriosService.dashboardAdmin(periodo, { modo: 'sequencial', observar: i => seq.push(i) });
    await relatoriosService.dashboardAdmin(periodo, { modo: 'concorrente', observar: i => conc.push(i) });

    expect(seq).toHaveLength(8);
    expect(conc).toHaveLength(8);
    expect(picoDeSobreposicao(seq)).toBe(1);
    expect(picoDeSobreposicao(conc)).toBe(8);
    const ordenados = [...seq].sort((a, b) => a.inicioMs - b.inicioMs);
    for (let i = 1; i < ordenados.length; i++) expect(ordenados[i].inicioMs).toBeGreaterThanOrEqual(ordenados[i - 1].fimMs);
  });

  it('indicadores do artesão: equivalentes nos dois modos e com 5 consultas em grupo', async () => {
    for (const id of [artesao1, artesao2]) {
      const seq: IntervaloTarefa[] = [];
      const conc: IntervaloTarefa[] = [];
      const a = await relatoriosService.indicadoresArtesao(id, periodo, { modo: 'sequencial', observar: i => seq.push(i) });
      const b = await relatoriosService.indicadoresArtesao(id, periodo, { modo: 'concorrente', observar: i => conc.push(i) });
      expect(b).toEqual(a);
      expect(picoDeSobreposicao(seq)).toBe(1);
      expect(picoDeSobreposicao(conc)).toBe(5);
    }
    const resultado = await relatoriosService.indicadoresArtesao(artesao1, periodo);
    expect(resultado.faturamentoTotal).toBe(250);
    expect(resultado.pedidosPagos).toBe(3);
    expect(resultado.faturamentoPorMes.map(m => m.mes).slice(0, 6)).toEqual(['2020-01', '2020-02', '2020-03', '2020-04', '2020-05', '2020-06']);
  });

  it('sem opções, o resultado é o mesmo do modo concorrente (o comportamento da API não muda)', async () => {
    const padrao = semTempo(await relatoriosService.dashboardAdmin(periodo));
    const conc = semTempo(await relatoriosService.dashboardAdmin(periodo, { modo: 'concorrente' }));
    expect(padrao).toEqual(conc);
  });
});
