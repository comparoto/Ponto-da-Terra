import { api, bearer, ciclo, login } from './helpers';
import { ColetorDeMetricas, coletor, jitter, percentil, resumir, serieTemporal, type AmostraDeRequisicao } from '../src/shared/metricas';
import { sondar } from '../src/modules/admin/monitoramento.service';

ciclo();

const amostra = (duracaoMs: number, extra: Partial<AmostraDeRequisicao> = {}): AmostraDeRequisicao => ({
  em: 1_000_000,
  rota: '/api/x',
  metodo: 'GET',
  status: 200,
  duracaoMs,
  bytesEnviados: 1024,
  interrompida: false,
  ...extra,
});

describe('Métricas: cálculo (funções puras)', () => {
  it('percentil pelo posto mais próximo, sem alterar a lista original', () => {
    const v = [50, 10, 40, 20, 30];
    expect([percentil(v, 50), percentil(v, 95), percentil(v, 100), percentil(v, 1)]).toEqual([30, 50, 50, 10]);
    expect(v).toEqual([50, 10, 40, 20, 30]);
    expect(percentil([], 95)).toBe(0);
  });

  it('jitter = média da diferença absoluta entre valores consecutivos', () => {
    expect(jitter([10, 20, 10, 40])).toBeCloseTo((10 + 10 + 30) / 3);
    expect(jitter([5, 5, 5])).toBe(0);
    expect(jitter([7])).toBe(0);
  });

  it('resumo: vazão, percentis, erros, interrompidas e taxa de falha', () => {
    const amostras = [
      ...Array.from({ length: 90 }, (_, i) => amostra(10 + (i % 5))), // 90 respostas rápidas
      amostra(300, { status: 500 }),
      amostra(5, { status: 404 }),
      amostra(8, { status: 404 }),
      amostra(0, { status: 200, interrompida: true, bytesEnviados: 0 }),
      amostra(900, { status: 502 }),
    ];
    const r = resumir(amostras, 10_000); // janela de 10 s
    expect(r.total).toBe(95);
    expect(r.requisicoesPorSegundo).toBeCloseTo(9.5, 1);
    expect(r.errosCliente).toBe(2);
    expect(r.errosServidor).toBe(2);
    expect(r.interrompidas).toBe(1);
    expect(r.taxaDeFalhaPct).toBeCloseTo((3 / 95) * 100, 1);
    expect(r.latenciaMs.max).toBe(900);
    expect(r.latenciaMs.p50).toBeLessThanOrEqual(14);
    expect(r.kbPorSegundo).toBeGreaterThan(0);
  });

  it('resumo de janela vazia não divide por zero', () => {
    expect(resumir([], 60_000)).toMatchObject({ total: 0, requisicoesPorSegundo: 0, taxaDeFalhaPct: 0, jitterMs: 0 });
  });

  it('série temporal: distribui as amostras em intervalos de tempo', () => {
    const base = 1_000_000;
    const serie = serieTemporal(
      [amostra(10, { em: base + 100 }), amostra(20, { em: base + 200 }), amostra(30, { em: base + 1500, status: 500 })],
      base,
      base + 3000,
      1000,
    );
    expect(serie.map(p => p.requisicoes)).toEqual([2, 1, 0]);
    expect(serie[1].falhas).toBe(1);
    expect(serie[0].p95Ms).toBe(20);
  });
});

describe('ColetorDeMetricas: buffer circular', () => {
  it('guarda só as últimas N amostras, em ordem, e conta o total', () => {
    const c = new ColetorDeMetricas(3);
    for (let i = 1; i <= 5; i++) c.registrar(amostra(i, { em: i }));
    expect(c.desde(0).map(a => a.duracaoMs)).toEqual([3, 4, 5]);
    expect(c.desde(4).map(a => a.duracaoMs)).toEqual([4, 5]);
    expect(c.totalDesdeOInicio).toBe(5);
    c.reiniciar();
    expect(c.desde(0)).toEqual([]);
  });

  it('lista as rotas mais lentas por p95', () => {
    const c = new ColetorDeMetricas(10);
    [10, 12, 11].forEach(d => c.registrar(amostra(d, { rota: '/rapida', em: 1 })));
    [200, 300].forEach(d => c.registrar(amostra(d, { rota: '/lenta', em: 1 })));
    expect(c.rotasMaisLentas(c.desde(0), 1)[0]).toMatchObject({ rota: '/lenta', requisicoes: 2, p95Ms: 300 });
  });
});

describe('Sonda de dependência: RTT, jitter e perda', () => {
  it('conta falhas como perda e calcula o RTT só das respostas', async () => {
    let chamadas = 0;
    const r = await sondar('banco', async () => {
      chamadas++;
      if (chamadas % 5 === 0) throw new Error('timeout'); // 1 em 5 falha
    }, 10);
    expect(r).toMatchObject({ alvo: 'banco', tentativas: 10, falhas: 2, perdaPct: 20, disponivel: true });
    expect(r.rttMs.max).toBeGreaterThanOrEqual(r.rttMs.min);
  });

  it('alvo fora do ar: indisponível, 100% de perda', async () => {
    const r = await sondar('redis', () => Promise.reject(new Error('fora')), 3);
    expect(r).toMatchObject({ disponivel: false, perdaPct: 100, falhas: 3 });
  });
});

describe('GET /api/admin/monitoramento (somente administrador)', () => {
  it('sem token → 401', async () => {
    expect((await api().get('/api/admin/monitoramento')).status).toBe(401);
  });

  it('comprador e artesão → 403', async () => {
    for (const conta of ['comprador', 'artesao'] as const) {
      const { token } = await login(conta);
      expect((await api().get('/api/admin/monitoramento').set(bearer(token))).status).toBe(403);
    }
  });

  it('administrador → 200 com métricas reais medidas das requisições anteriores', async () => {
    coletor.reiniciar();
    await api().get('/api/health');
    await api().get('/api/health');
    await api().get('/api/rota-que-nao-existe'); // 404
    const { token } = await login('admin');

    const res = await api().get('/api/admin/monitoramento?janela=300').set(bearer(token));
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.janelaSegundos).toBe(300);
    // health ×2 + 404 + login do admin (a chamada ao painel não se conta)
    expect(d.rede.total).toBeGreaterThanOrEqual(4);
    expect(d.rede.errosCliente).toBeGreaterThanOrEqual(1);
    expect(d.rede.latenciaMs.p95).toBeGreaterThan(0);
    expect(d.rede.latenciaMs.p50).toBeLessThanOrEqual(d.rede.latenciaMs.p99);
    expect(d.rotasMaisLentas.length).toBeGreaterThan(0);
    expect(d.dependencias.map((x: { alvo: string }) => x.alvo)).toEqual(['banco', 'redis']);
    expect(d.dependencias[0]).toMatchObject({ alvo: 'banco', disponivel: true, perdaPct: 0 });
    expect(d.processo.memoriaRssMb).toBeGreaterThan(0);
    expect(d.filaDeEventos.pendentes).toEqual(expect.any(Number));
    expect(d.serie.length).toBeGreaterThan(0);
  });

  it('laço de eventos: medido em servidor tradicional e indisponível (null) em serverless', async () => {
    const { token } = await login('admin');
    const antes = process.env.VERCEL;
    try {
      delete process.env.VERCEL;
      const tradicional = await api().get('/api/admin/monitoramento').set(bearer(token));
      expect(tradicional.body.data.instancia.ambiente).toBe('servidor tradicional');
      expect(tradicional.body.data.processo.lacoDeEventos).toMatchObject({ p99Ms: expect.any(Number), maxMs: expect.any(Number) });

      process.env.VERCEL = '1';
      const serverless = await api().get('/api/admin/monitoramento').set(bearer(token));
      expect(serverless.body.data.instancia.ambiente).toBe('vercel (função serverless)');
      expect(serverless.body.data.processo.lacoDeEventos).toBeNull();
    } finally {
      if (antes === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = antes;
    }
  });

  it('a própria consulta ao painel não entra nas amostras', async () => {
    coletor.reiniciar();
    const { token } = await login('admin');
    const antes = coletor.totalDesdeOInicio;
    await api().get('/api/admin/monitoramento').set(bearer(token));
    expect(coletor.totalDesdeOInicio).toBe(antes);
  });

  it('janela inválida → 400', async () => {
    const { token } = await login('admin');
    expect((await api().get('/api/admin/monitoramento?janela=5').set(bearer(token))).status).toBe(400);
    expect((await api().get('/api/admin/monitoramento?janela=999999').set(bearer(token))).status).toBe(400);
  });
});
