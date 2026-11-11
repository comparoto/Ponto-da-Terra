/**
 * Cliente HTTP da API real (backend/). Substitui a antiga Fake API.
 *
 * Mantém o mesmo contrato ApiResult<T> que a Fake API já usava, para que componentes e store
 * não precisem mudar a forma de consumir os dados: sempre checar `success` antes de usar `data`.
 * Nunca lança exceção: falhas de rede viram { success: false, error }.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api').replace(/\/$/, '');

export type ErroCampo = { campo: string; mensagem: string };
export type PaginacaoMeta = { page: number; limit: number; totalItems: number; totalPages: number };

export type ApiResult<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: PaginacaoMeta;
  errors?: ErroCampo[];
  status?: number;
};

export const SESSION_KEY = 'ponto_da_terra_session_v2';
export const SESSAO_ALTERADA = 'ponto-da-terra-profile-updated';

const isBrowser = () => typeof window !== 'undefined';

export function lerToken(): string | null {
  if (!isBrowser()) return null;
  try {
    const bruto = localStorage.getItem(SESSION_KEY);
    return bruto ? (JSON.parse(bruto).token as string) ?? null : null;
  } catch {
    return null;
  }
}

export function limparSessaoLocal() {
  if (!isBrowser()) return;
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSAO_ALTERADA));
}

type Opcoes = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
  query?: Record<string, string | number | undefined | null>;
};

export async function request<T>(caminho: string, { method = 'GET', body, form, query }: Opcoes = {}): Promise<ApiResult<T>> {
  const url = new URL(`${API_URL}${caminho}`);
  for (const [chave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') url.searchParams.set(chave, String(valor));
  }

  const headers: Record<string, string> = {};
  const token = lerToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let resposta: Response;
  try {
    resposta = await fetch(url, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  } catch {
    return { success: false, data: null, error: 'Não foi possível conectar ao servidor. Verifique se a API está rodando.' };
  }

  let json: ApiResult<T>;
  try {
    json = await resposta.json();
  } catch {
    return { success: false, data: null, error: `Resposta inválida do servidor (HTTP ${resposta.status}).`, status: resposta.status };
  }

  // Sessão expirada ou revogada: descarta o token salvo para o usuário entrar de novo
  if (resposta.status === 401 && token) limparSessaoLocal();

  return { ...json, status: resposta.status };
}

/** Junta a mensagem principal com os erros por campo, para exibir ao usuário. */
export function mensagemDeErro(resultado: ApiResult<unknown>, padrao = 'Não foi possível concluir a operação.'): string {
  if (resultado.errors?.length) return resultado.errors.map(e => e.mensagem).join(' · ');
  return resultado.error ?? padrao;
}

/** URLs de imagens enviadas ao backend podem vir relativas (/uploads/...). */
export function urlImagem(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('/uploads')) return `${new URL(API_URL).origin}${url}`;
  return url;
}
