/**
 * Autenticação real (JWT) — substitui o antigo demoAuth.ts.
 *
 * A sessão continua com o mesmo formato que as telas já usavam (role, name, email, artisanId, ...),
 * agora acompanhada do token JWT emitido pela API. `readSession()` segue síncrono (lê o cache local),
 * então guards de rota e componentes não precisaram mudar.
 */
import { artesaoParaFront, type ArtesaoApi } from './mappers';
import { type ApiResult, lerToken, limparSessaoLocal, request, SESSAO_ALTERADA, SESSION_KEY } from './http';

export type UserRole = 'comprador' | 'artesao' | 'administrador';

export interface Sessao {
  token: string;
  role: UserRole;
  email: string;
  name: string;
  phone?: string;
  artisanId?: string;
  city?: string;
  state?: string;
  specialty?: string;
  bio?: string;
  imageUrl?: string;
  workshopImageUrl?: string;
  /** HU7: técnicas tradicionais que o artesão domina */
  techniques?: string[];
  /** HU7: polo regional de atuação */
  region?: string;
  /** HU8: situação do cadastro do artesão (só aparece ao público depois de APROVADO) */
  artisanStatus?: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  artisanStatusReason?: string;
}

type TipoApi = 'CONSUMIDOR' | 'ARTESAO' | 'ADMIN';
type PerfilApi = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  tipo: TipoApi;
  artesaoId: string | null;
  cadastroArtesao?: { status: 'PENDENTE' | 'APROVADO' | 'REJEITADO'; motivo: string | null } | null;
};

const ROLE_POR_TIPO: Record<TipoApi, UserRole> = { CONSUMIDOR: 'comprador', ARTESAO: 'artesao', ADMIN: 'administrador' };

const isBrowser = () => typeof window !== 'undefined';

/** Lê o `exp` do JWT (sem validar assinatura — quem valida é o servidor) para descartar sessões vencidas. */
function tokenExpirado(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function salvarSessao(sessao: Sessao) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessao));
  window.dispatchEvent(new Event(SESSAO_ALTERADA));
}

export function readSession(): Sessao | null {
  if (!isBrowser()) return null;
  try {
    const bruto = localStorage.getItem(SESSION_KEY);
    if (!bruto) return null;
    const sessao = JSON.parse(bruto) as Sessao;
    if (!sessao.token || tokenExpirado(sessao.token)) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return sessao;
  } catch {
    return null;
  }
}

/** Monta a sessão a partir do perfil da API (e, para artesão, do perfil do ateliê). */
async function montarSessao(token: string, usuario: PerfilApi): Promise<Sessao> {
  const sessao: Sessao = {
    token,
    role: ROLE_POR_TIPO[usuario.tipo],
    email: usuario.email,
    name: usuario.nome,
    phone: usuario.telefone ?? undefined,
    artisanId: usuario.artesaoId ?? undefined,
    artisanStatus: usuario.cadastroArtesao?.status,
    artisanStatusReason: usuario.cadastroArtesao?.motivo ?? undefined,
  };
  salvarSessao(sessao); // o token precisa estar salvo para a chamada autenticada abaixo

  if (sessao.role === 'artesao') {
    const perfil = await request<ArtesaoApi>('/artesao/perfil');
    if (perfil.success && perfil.data) {
      const a = artesaoParaFront(perfil.data);
      Object.assign(sessao, {
        city: a.cidade,
        state: a.estado,
        specialty: a.especialidade,
        bio: a.biografia,
        imageUrl: a.imagemUrl || undefined,
        workshopImageUrl: a.fotoAtelieUrl,
        techniques: a.tecnicasPrincipais ?? [],
        region: a.poloRegional,
      });
      salvarSessao(sessao);
    }
  }
  return sessao;
}

export async function signIn(email: string, senha: string, aceiteTermos = false): Promise<ApiResult<Sessao>> {
  const res = await request<{ token: string; usuario: PerfilApi }>('/auth/login', { method: 'POST', body: { email, senha, aceiteTermos } });
  if (!res.success || !res.data) return { ...res, data: null };
  return { success: true, data: await montarSessao(res.data.token, res.data.usuario), error: null };
}

export interface ArtisanRegistration {
  city: string;
  state: string;
  specialty: string;
}

export async function registerAccount(
  nome: string,
  email: string,
  senha: string,
  role: 'comprador' | 'artesao',
  artisan?: ArtisanRegistration,
  aceiteTermos = false,
): Promise<ApiResult<Sessao>> {
  const res = await request<{ token: string; usuario: PerfilApi }>('/auth/cadastro', {
    method: 'POST',
    body: {
      nome,
      email,
      senha,
      tipo: role === 'artesao' ? 'ARTESAO' : 'CONSUMIDOR',
      aceiteTermos,
      ...(role === 'artesao' && artisan ? { cidade: artisan.city, estado: artisan.state || undefined, especialidade: artisan.specialty } : {}),
    },
  });
  if (!res.success || !res.data) return { ...res, data: null };
  return { success: true, data: await montarSessao(res.data.token, res.data.usuario), error: null };
}

/** Encerra a sessão no servidor (invalida o token) e localmente. */
export async function signOut(): Promise<void> {
  if (lerToken()) await request('/auth/logout', { method: 'POST' });
  limparSessaoLocal();
}

export interface AtualizacaoPerfil {
  name: string;
  city?: string;
  state?: string;
  specialty?: string;
  bio?: string;
  techniques?: string[];
  region?: string;
}

/** Atualiza nome (todos) e dados do ateliê (artesão). Reflete na página pública imediatamente. */
export async function updateAccountProfile(dados: AtualizacaoPerfil): Promise<ApiResult<Sessao>> {
  const atual = readSession();
  if (!atual) return { success: false, data: null, error: 'Sessão expirada. Entre novamente.' };

  const me = await request<PerfilApi>('/me', { method: 'PUT', body: { nome: dados.name } });
  if (!me.success) return { ...me, data: null };

  const atualizada: Sessao = { ...atual, name: dados.name };
  if (atual.role === 'artesao') {
    const perfil = await request<ArtesaoApi>('/artesao/perfil', {
      method: 'PUT',
      body: {
        cidade: dados.city,
        estado: dados.state,
        especialidade: dados.specialty,
        biografia: dados.bio?.trim() ? dados.bio.trim() : null,
        tecnicasPrincipais: dados.techniques ?? [],
        poloRegional: dados.region?.trim() ? dados.region.trim() : null,
      },
    });
    if (!perfil.success) return { ...perfil, data: null };
    Object.assign(atualizada, { city: dados.city, state: dados.state, specialty: dados.specialty, bio: dados.bio, techniques: dados.techniques ?? [], region: dados.region });
  }

  salvarSessao(atualizada);
  return { success: true, data: atualizada, error: null };
}

/** Envia a foto de perfil ou da oficina do artesão (JPG/PNG até 5 MB — validado no servidor). */
export async function uploadArtisanPhoto(arquivo: File, tipo: 'perfil' | 'atelie'): Promise<ApiResult<Sessao>> {
  const form = new FormData();
  form.append('foto', arquivo);
  const res = await request<ArtesaoApi>('/artesao/perfil/fotos', { method: 'POST', form, query: { tipo } });
  if (!res.success || !res.data) return { ...res, data: null };

  const a = artesaoParaFront(res.data);
  const atualizada = { ...readSession()!, imageUrl: a.imagemUrl || undefined, workshopImageUrl: a.fotoAtelieUrl };
  salvarSessao(atualizada);
  return { success: true, data: atualizada, error: null };
}

export async function deleteAccount(): Promise<ApiResult<null>> {
  const res = await request<null>('/me', { method: 'DELETE' });
  if (res.success) limparSessaoLocal();
  return res;
}

/** Atualiza a sessão com o perfil atual do servidor (ex.: o admin aprovou o cadastro do artesão). */
export async function atualizarSessaoDoServidor(): Promise<Sessao | null> {
  const atual = readSession();
  if (!atual) return null;
  const me = await request<PerfilApi>('/me');
  if (!me.success || !me.data) return atual;
  const nova: Sessao = {
    ...atual,
    name: me.data.nome,
    artisanStatus: me.data.cadastroArtesao?.status,
    artisanStatusReason: me.data.cadastroArtesao?.motivo ?? undefined,
  };
  if (JSON.stringify(nova) !== JSON.stringify(atual)) salvarSessao(nova);
  return nova;
}

/** Troca a senha de quem está logado; o servidor devolve um token novo (as outras sessões caem). */
export async function alterarSenha(senhaAtual: string, novaSenha: string): Promise<ApiResult<null>> {
  const res = await request<{ token: string; usuario: PerfilApi }>('/me/senha', { method: 'PUT', body: { senhaAtual, novaSenha } });
  if (!res.success || !res.data) return { ...res, data: null };
  const atual = readSession();
  if (atual) salvarSessao({ ...atual, token: res.data.token });
  return { success: true, data: null, error: null };
}

/** "Esqueci minha senha": o servidor envia o link por e-mail (a resposta é a mesma exista ou não a conta). */
export const pedirLinkDeSenha = (email: string) => request<{ mensagem: string }>('/auth/esqueci-senha', { method: 'POST', body: { email } });

/** Cria a nova senha com o token do link recebido por e-mail. */
export const redefinirSenha = (token: string, novaSenha: string) => request<null>('/auth/redefinir-senha', { method: 'POST', body: { token, novaSenha } });
