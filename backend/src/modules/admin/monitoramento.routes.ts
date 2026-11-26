import { Router } from 'express';
import { TipoUsuario } from '@prisma/client';
import { documentar } from '../../docs/registry';
import { ok } from '../../shared/api-result';
import { somente } from '../../shared/auth';
import { entrada, validate } from '../../shared/validate';
import { z } from '../../shared/zod';
import { monitoramentoService } from './monitoramento.service';

/** Painel de monitoramento: SOMENTE administrador (JWT validado no servidor; qualquer outro perfil recebe 403). */
export const monitoramentoRoutes = Router();

const query = z.object({
  janela: z.coerce.number().int().min(60, 'A janela mínima é de 60 segundos').max(3600, 'A janela máxima é de 3600 segundos').default(300),
});

const latencia = z.object({ media: z.number(), p50: z.number(), p95: z.number(), p99: z.number(), max: z.number() });
const sonda = z.object({
  alvo: z.enum(['banco', 'redis']),
  disponivel: z.boolean(),
  tentativas: z.number(),
  falhas: z.number(),
  perdaPct: z.number(),
  rttMs: z.object({ min: z.number(), mediana: z.number(), p95: z.number(), max: z.number() }),
  jitterMs: z.number(),
});
const respostaMonitoramento = z
  .object({
    geradoEm: z.string(),
    janelaSegundos: z.number(),
    instancia: z.object({ pid: z.number(), ativaHaSegundos: z.number(), ambiente: z.string(), requisicoesMedidasDesdeOInicio: z.number() }),
    rede: z.object({
      total: z.number(),
      requisicoesPorSegundo: z.number(),
      kbPorSegundo: z.number(),
      latenciaMs: latencia,
      jitterMs: z.number(),
      errosCliente: z.number(),
      errosServidor: z.number(),
      interrompidas: z.number(),
      taxaDeFalhaPct: z.number(),
    }),
    serie: z.array(z.object({ em: z.number(), requisicoes: z.number(), p95Ms: z.number(), falhas: z.number() })),
    rotasMaisLentas: z.array(z.object({ rota: z.string(), requisicoes: z.number(), p95Ms: z.number(), falhas: z.number() })),
    dependencias: z.array(sonda),
    processo: z.object({
      memoriaRssMb: z.number(),
      memoriaHeapMb: z.number(),
      cpuUsuarioMs: z.number(),
      cpuSistemaMs: z.number(),
      cargaMedia1min: z.number(),
      lacoDeEventos: z.object({ p50Ms: z.number(), p99Ms: z.number(), maxMs: z.number() }),
    }),
    filaDeEventos: z.object({ pendentes: z.number(), maisAntigoHaSegundos: z.number().nullable() }),
  })
  .openapi('Monitoramento');

documentar({
  method: 'get',
  path: '/api/admin/monitoramento',
  tags: ['Admin · Monitoramento'],
  summary: 'Métricas de rede e de execução da API (latência, vazão, jitter, perda, RTT do banco e do Redis)',
  description:
    'Métricas reais medidas pela própria API: percentis de latência, vazão, jitter e falhas das requisições recentes, RTT/jitter/perda de sondas ao PostgreSQL e ao Redis, saturação do processo e fila de eventos pendentes. ' +
    'As amostras ficam na memória da instância (em serverless, cada instância tem as suas).',
  autenticado: true,
  request: { query },
  sucesso: { status: 200, descricao: 'Métricas da janela pedida', data: respostaMonitoramento },
  falhas: [400, 401, 403],
});
monitoramentoRoutes.get('/admin/monitoramento', ...somente(TipoUsuario.ADMIN), validate({ query }), async (req, res) => {
  const { janela } = entrada(req, 'query', query);
  res.json(ok(await monitoramentoService.coletar(janela)));
});
