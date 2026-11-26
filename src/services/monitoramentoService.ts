/**
 * Painel de monitoramento do administrador (SO · Unidade 2): métricas de rede e de execução da API.
 * A rota GET /admin/monitoramento só responde a administradores (403 para os demais perfis).
 */
import { API_URL, type ApiResult, request } from './http';

export type SondaApi = {
  alvo: 'banco' | 'redis';
  disponivel: boolean;
  tentativas: number;
  falhas: number;
  perdaPct: number;
  rttMs: { min: number; mediana: number; p95: number; max: number };
  jitterMs: number;
};

export type MonitoramentoApi = {
  geradoEm: string;
  janelaSegundos: number;
  instancia: { pid: number; ativaHaSegundos: number; ambiente: string; requisicoesMedidasDesdeOInicio: number };
  rede: {
    total: number;
    requisicoesPorSegundo: number;
    kbPorSegundo: number;
    latenciaMs: { media: number; p50: number; p95: number; p99: number; max: number };
    jitterMs: number;
    errosCliente: number;
    errosServidor: number;
    interrompidas: number;
    taxaDeFalhaPct: number;
  };
  serie: { em: number; requisicoes: number; p95Ms: number; falhas: number }[];
  rotasMaisLentas: { rota: string; requisicoes: number; p95Ms: number; falhas: number }[];
  dependencias: SondaApi[];
  processo: {
    memoriaRssMb: number;
    memoriaHeapMb: number;
    cpuUsuarioMs: number;
    cpuSistemaMs: number;
    cargaMedia1min: number;
    /** `null` em função serverless: o processo congela entre requisições e a medição não representa saturação. */
    lacoDeEventos: { p50Ms: number; p99Ms: number; maxMs: number } | null;
  };
  filaDeEventos: { pendentes: number; maisAntigoHaSegundos: number | null };
};

/** Resultado da sondagem feita pelo navegador do administrador até a API (a rede REAL entre os dois). */
export type SondagemDoNavegador = {
  tentativas: number;
  falhas: number;
  perdaPct: number;
  rttMs: { min: number; mediana: number; p95: number; max: number };
  jitterMs: number;
};

const arredondar = (x: number, casas = 1) => Math.round(x * 10 ** casas) / 10 ** casas;

/** Estatísticas de uma lista de RTTs (ms) e do número de falhas. Função pura (testável). */
export function estatisticasDeSondagem(rtts: number[], tentativas: number): SondagemDoNavegador {
  const ordenado = [...rtts].sort((a, b) => a - b);
  const pos = (p: number) => ordenado[Math.min(ordenado.length - 1, Math.max(0, Math.ceil((p / 100) * ordenado.length) - 1))] ?? 0;
  let somaDiferencas = 0;
  for (let i = 1; i < rtts.length; i++) somaDiferencas += Math.abs(rtts[i] - rtts[i - 1]);
  const falhas = tentativas - rtts.length;
  return {
    tentativas,
    falhas,
    perdaPct: tentativas ? arredondar((falhas / tentativas) * 100) : 0,
    rttMs: { min: arredondar(ordenado[0] ?? 0), mediana: arredondar(pos(50)), p95: arredondar(pos(95)), max: arredondar(ordenado[ordenado.length - 1] ?? 0) },
    jitterMs: rtts.length > 1 ? arredondar(somaDiferencas / (rtts.length - 1)) : 0,
  };
}

export const monitoramentoService = {
  coletar: (janelaSegundos: number): Promise<ApiResult<MonitoramentoApi>> => request<MonitoramentoApi>('/admin/monitoramento', { query: { janela: janelaSegundos } }),

  /**
   * Faz `tentativas` chamadas GET /health em sequência e mede o tempo de cada ida e volta no navegador
   * (inclui a rede, o TLS e o processamento do /health). Sem resposta em `limiteMs` conta como perda.
   */
  async sondar(tentativas = 10, limiteMs = 4000): Promise<SondagemDoNavegador> {
    const rtts: number[] = [];
    for (let i = 0; i < tentativas; i++) {
      const controle = new AbortController();
      const temporizador = setTimeout(() => controle.abort(), limiteMs);
      const inicio = performance.now();
      try {
        const res = await fetch(`${API_URL}/health`, { cache: 'no-store', signal: controle.signal });
        await res.text();
        if (res.ok) rtts.push(performance.now() - inicio);
      } catch {
        // timeout ou falha de rede: conta como perda
      } finally {
        clearTimeout(temporizador);
      }
    }
    return estatisticasDeSondagem(rtts, tentativas);
  },
};
