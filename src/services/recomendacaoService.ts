import type { Peca } from '@/types';

const CHAVE_HISTORICO = 'ponto-da-terra:pecas-visualizadas';
const EVENTO_HISTORICO = 'ponto-da-terra:peca-visualizada';
const LIMITE_HISTORICO = 20;

const HISTORICO_VAZIO = '[]';

/** Texto bruto guardado no navegador. Serve de "snapshot" estável para useSyncExternalStore. */
export function lerHistoricoBruto(): string {
  if (typeof window === 'undefined') return HISTORICO_VAZIO;
  try {
    return window.localStorage.getItem(CHAVE_HISTORICO) ?? HISTORICO_VAZIO;
  } catch {
    return HISTORICO_VAZIO;
  }
}

/** Valor usado no servidor e durante a hidratação: o servidor não conhece o histórico do navegador. */
export const historicoVazioNoServidor = (): string => HISTORICO_VAZIO;

export function interpretarHistorico(bruto: string): string[] {
  try {
    const salvo: unknown = JSON.parse(bruto);
    return Array.isArray(salvo) ? salvo.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export const lerHistoricoVisualizacao = (): string[] => interpretarHistorico(lerHistoricoBruto());

export function registrarVisualizacao(produtoId: string): void {
  if (typeof window === 'undefined') return;
  const historico = [produtoId, ...lerHistoricoVisualizacao().filter(id => id !== produtoId)].slice(0, LIMITE_HISTORICO);
  window.localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico));
  window.dispatchEvent(new Event(EVENTO_HISTORICO));
}

export function observarHistorico(callback: () => void): () => void {
  window.addEventListener(EVENTO_HISTORICO, callback);
  return () => window.removeEventListener(EVENTO_HISTORICO, callback);
}

export function recomendarPecas(
  pecas: Peca[],
  historicoIds: string[],
  favoritosIds: string[],
  destaquesIds: string[],
  limite = 4,
): Peca[] {
  const porId = new Map(pecas.map(peca => [peca.id, peca]));
  const seeds = [
    ...historicoIds.map((id, index) => ({ peca: porId.get(id), peso: Math.max(1, 4 - index * 0.3) })),
    ...favoritosIds.map(id => ({ peca: porId.get(id), peso: 1.5 })),
  ].filter((seed): seed is { peca: Peca; peso: number } => Boolean(seed.peca));
  const excluidos = new Set([...historicoIds, ...favoritosIds, ...destaquesIds]);

  const relacionadas = pecas
    .filter(peca => !excluidos.has(peca.id))
    .map((peca, ordem) => ({
      peca,
      ordem,
      pontuacao: seeds.reduce((total, seed) => {
        const origem = seed.peca;
        return total + seed.peso * (
          Number(Boolean(origem.categoria && origem.categoria === peca.categoria)) * 4 +
          Number(Boolean(origem.tecnica && origem.tecnica === peca.tecnica)) * 3 +
          Number(Boolean(origem.poloOrigem && origem.poloOrigem === peca.poloOrigem)) * 2 +
          Number(Boolean(origem.artesaoId && origem.artesaoId === peca.artesaoId))
        );
      }, 0),
    }))
    .sort((a, b) => b.pontuacao - a.pontuacao || a.ordem - b.ordem);

  const comAfinidade = relacionadas.filter(item => item.pontuacao > 0);
  return (comAfinidade.length ? comAfinidade : relacionadas).slice(0, limite).map(item => item.peca);
}