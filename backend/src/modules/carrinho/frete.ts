import { badRequest } from '../../shared/errors';

/**
 * Cálculo de frete (HU4 / TC14) — padrão Strategy.
 *
 * O Notion restringe o escopo a serviços SIMULADOS (sem integração real), então a implementação
 * padrão calcula por região do CEP de destino (origem: Pernambuco). Para usar a API dos Correios,
 * basta criar outra classe que implemente `CalculadoraFrete` e trocá-la em `calculadoraFrete`.
 */
export type CotacaoFrete = { cep: string; valor: number; prazoDias: number; regiao: string; simulado: boolean };

export interface CalculadoraFrete {
  calcular(cep: string, quantidadeItens: number): CotacaoFrete;
}

const CEP_REGEX = /^(\d{5})-?(\d{3})$/;

export function normalizarCep(cep: string): string {
  const m = CEP_REGEX.exec(cep.trim());
  // Rejeita formato inválido e CEPs "fictícios" com todos os dígitos iguais (ex.: 00000-000)
  if (!m || /^(\d)\1{7}$/.test(m[1] + m[2])) throw badRequest('CEP inválido', [{ campo: 'cep', mensagem: 'CEP inválido' }]);
  return `${m[1]}-${m[2]}`;
}

/** Tabela por faixa de CEP (1º dígito) a partir de PE. Valores em R$ e prazo em dias úteis. */
const TABELA: { faixa: string; regiao: string; base: number; porItemAdicional: number; prazoDias: number }[] = [
  { faixa: '5', regiao: 'PE, AL, PB e RN', base: 12.9, porItemAdicional: 2, prazoDias: 3 },
  { faixa: '4', regiao: 'BA e SE', base: 18.9, porItemAdicional: 2.5, prazoDias: 5 },
  { faixa: '6', regiao: 'CE, PI, MA e Norte', base: 19.9, porItemAdicional: 2.5, prazoDias: 6 },
  { faixa: '0123', regiao: 'Sudeste', base: 24.9, porItemAdicional: 3, prazoDias: 7 },
  { faixa: '7', regiao: 'Centro-Oeste e Norte', base: 27.9, porItemAdicional: 3, prazoDias: 8 },
  { faixa: '89', regiao: 'Sul', base: 29.9, porItemAdicional: 3.5, prazoDias: 9 },
];

export class FreteSimuladoPorRegiao implements CalculadoraFrete {
  calcular(cep: string, quantidadeItens: number): CotacaoFrete {
    const normalizado = normalizarCep(cep);
    const linha = TABELA.find(l => l.faixa.includes(normalizado[0]))!;
    const adicionais = Math.max(0, quantidadeItens - 1);
    const valor = Math.round((linha.base + adicionais * linha.porItemAdicional) * 100) / 100;
    return { cep: normalizado, valor, prazoDias: linha.prazoDias, regiao: linha.regiao, simulado: true };
  }
}

export const calculadoraFrete: CalculadoraFrete = new FreteSimuladoPorRegiao();

export type CotacaoConsolidada = CotacaoFrete & { envios: number; porArtesao: { artesaoId: string; valor: number; prazoDias: number }[] };

/**
 * Cada artesão envia a sua parte da compra, então o frete é cotado por artesão
 * (unidades daquele artesão) e somado. O prazo da compra é o maior dos prazos.
 */
export function cotarPorArtesao(cep: string, unidadesPorArtesao: Map<string, number>): CotacaoConsolidada {
  const porArtesao = [...unidadesPorArtesao.entries()].map(([artesaoId, unidades]) => {
    const c = calculadoraFrete.calcular(cep, unidades);
    return { artesaoId, valor: c.valor, prazoDias: c.prazoDias, cep: c.cep, regiao: c.regiao };
  });
  const base = calculadoraFrete.calcular(cep, 1); // valida o CEP mesmo com carrinho vazio
  const valor = Math.round(porArtesao.reduce((s, p) => s + p.valor, 0) * 100) / 100;
  return {
    cep: base.cep,
    regiao: base.regiao,
    simulado: true,
    valor,
    prazoDias: Math.max(base.prazoDias, ...porArtesao.map(p => p.prazoDias)),
    envios: porArtesao.length,
    porArtesao: porArtesao.map(({ artesaoId, valor: v, prazoDias }) => ({ artesaoId, valor: v, prazoDias })),
  };
}
