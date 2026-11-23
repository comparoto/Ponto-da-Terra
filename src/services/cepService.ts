/** Endereço encontrado para um CEP (rua e bairro vêm vazios nos CEPs gerais de cidades pequenas). */
export type EnderecoCep = { rua: string; bairro: string; cidade: string; estado: string };

export const apenasDigitos = (cep: string) => cep.replace(/\D/g, '').slice(0, 8);

/** Formata enquanto a pessoa digita: 01310100 → 01310-100 */
export const mascararCep = (cep: string) => {
  const d = apenasDigitos(cep);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

async function buscarJson(url: string): Promise<Record<string, unknown> | null> {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), 5000);
  try {
    const r = await fetch(url, { signal: controle.signal });
    return r.ok ? ((await r.json()) as Record<string, unknown>) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(limite);
  }
}

const texto = (v: unknown) => (typeof v === 'string' ? v : '');

/**
 * Busca o endereço de um CEP nos serviços públicos ViaCEP e, se ele falhar, BrasilAPI.
 * Devolve null quando o CEP não existe ou os dois serviços estão fora do ar
 * (aí a pessoa preenche o endereço à mão; o frete continua sendo calculado pela API).
 */
export async function buscarCep(cep: string): Promise<EnderecoCep | null> {
  const d = apenasDigitos(cep);
  if (d.length !== 8) return null;

  const via = await buscarJson(`https://viacep.com.br/ws/${d}/json/`);
  if (via && !via.erro && via.localidade) {
    return { rua: texto(via.logradouro), bairro: texto(via.bairro), cidade: texto(via.localidade), estado: texto(via.uf) };
  }
  const brasil = await buscarJson(`https://brasilapi.com.br/api/cep/v1/${d}`);
  if (brasil && brasil.city) {
    return { rua: texto(brasil.street), bairro: texto(brasil.neighborhood), cidade: texto(brasil.city), estado: texto(brasil.state) };
  }
  return null;
}
