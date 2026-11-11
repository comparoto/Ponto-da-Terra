import { TipoEvento } from '@prisma/client';
import { origemPermitida } from '../src/app';
import { ajustarUrlBanco } from '../src/config/prisma';
import { api, bearer, checkout, ciclo, novoComprador, pecaAtiva, prisma } from './helpers';

ciclo();

/** Configurações usadas na implantação na Vercel (modo serverless). */
describe('Implantação na Vercel', () => {
  it('CORS aceita a lista configurada e curingas de preview, e recusa o resto', () => {
    const f = origemPermitida('http://localhost:3000, https://ponto-da-terra-*.vercel.app, https://pontodaterra.com.br');
    const casos: [string | undefined, boolean][] = [
      ['http://localhost:3000', true],
      ['https://ponto-da-terra-git-main-equipe.vercel.app', true],
      ['https://ponto-da-terra-abc123.vercel.app', true],
      ['https://pontodaterra.com.br', true],
      ['https://malicioso.vercel.app', false],
      ['https://ponto-da-terra-x.vercel.app.evil.com', false],
      ['https://ponto-da-terra-a.b.vercel.app', false],
      ['http://localhost:3001', false],
      [undefined, true], // chamadas sem Origin (servidor a servidor, ex.: QStash)
    ];
    for (const [origem, esperado] of casos) f(origem, (_e, ok) => expect([origem, ok]).toEqual([origem, esperado]));
  });

  it('URL do pooler do Neon ganha pgbouncer=true; demais URLs ficam iguais', () => {
    expect(ajustarUrlBanco('postgresql://u:s@ep-abc-pooler.sa-east-1.aws.neon.tech/db?sslmode=require')).toContain('pgbouncer=true');
    expect(ajustarUrlBanco('postgresql://u:s@ep-abc.sa-east-1.aws.neon.tech/db?sslmode=require')).not.toContain('pgbouncer');
    expect(ajustarUrlBanco('postgresql://u:s@ep-abc-pooler.neon.tech/db?pgbouncer=false')).toContain('pgbouncer=false');
  });
});

describe('Rotas internas de fila (/api/jobs/*)', () => {
  const segredo = process.env.CRON_SECRET!;

  it('sem autorização → 401 (não podem ser chamadas pelo navegador)', async () => {
    expect((await api().post('/api/jobs/expirar-reservas')).status).toBe(401);
    expect((await api().post('/api/jobs/evento').send({ id: 'x', tipo: 'NOVO_PEDIDO', payload: {} })).status).toBe(401);
    expect((await api().get('/api/jobs/outbox-relay').set(bearer('segredo-errado'))).status).toBe(401);
    expect((await api().post('/api/jobs/evento').set('Upstash-Signature', 'assinatura.falsa.qualquer').send({})).status).toBe(401);
  });

  it('Vercel Cron (Bearer CRON_SECRET) roda a expiração de reservas', async () => {
    const res = await api().get('/api/jobs/expirar-reservas').set(bearer(segredo));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('canceladas');
  });

  it('relay + processamento do evento: o NOVO_PEDIDO vira notificação do artesão', async () => {
    const peca = await pecaAtiva(1, 40);
    const comprador = await novoComprador();
    const c = await checkout(comprador.token, [{ produtoId: peca.id, quantidade: 1 }]);
    const pedidoId = c.body.data.pedidos[0].id;

    // Sem QStash configurado, o relay processa os eventos diretamente
    const relay = await api().post('/api/jobs/outbox-relay').set(bearer(segredo));
    expect(relay.status).toBe(200);
    expect(relay.body.data.publicados).toBeGreaterThanOrEqual(1);

    const notificacao = await prisma.notificacaoLog.findFirst({ where: { tipoEvento: TipoEvento.NOVO_PEDIDO, pedidoId } });
    expect(notificacao).toMatchObject({ enviadoComSucesso: true });

    // Rota que o QStash chama para cada evento (aqui autorizada pelo segredo do cron)
    const evento = { id: notificacao!.eventoId!, tipo: 'NOVO_PEDIDO', payload: { pedidoId, artesaoId: notificacao!.artesaoId } };
    const reprocessado = await api().post('/api/jobs/evento').set(bearer(segredo)).send(evento);
    expect(reprocessado.status).toBe(200);
    expect(reprocessado.body.data).toMatchObject({ reenviado: false }); // idempotente
    expect(await prisma.notificacaoLog.count({ where: { eventoId: evento.id } })).toBe(1);
  });
});
