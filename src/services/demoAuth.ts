import { Artesao } from '@/types';
import { artesaoService } from '@/services/artesaoService';
import { produtoService } from '@/services/produtoService';
export type UserRole = 'comprador' | 'artesao' | 'administrador';
export interface DemoSession { role: UserRole; email: string; name: string; artisanId?: string; city?: string; state?: string; specialty?: string; bio?: string; imageUrl?: string }
interface DemoAccount extends DemoSession { password: string }
export const SESSION_KEY = 'ponto_da_terra_session';
const ACCOUNTS_KEY = 'ponto_da_terra_accounts_v1';
const PROFILE_OVERRIDES_KEY = 'ponto_da_terra_profile_overrides_v1';
const DELETED_ACCOUNTS_KEY = 'ponto_da_terra_deleted_accounts_v1';
const defaults: DemoAccount[] = [
 { role: 'comprador', email: 'comprador@pontodaterra.com', password: 'comprador123', name: 'Comprador Demonstração' },
 { role: 'artesao', email: 'artesao@pontodaterra.com', password: 'artesao123', name: 'Artesão Demonstração', artisanId: '1' },
 { role: 'administrador', email: 'admin@pontodaterra.com', password: 'admin123', name: 'Administrador' },
];
const readAccounts = (): DemoAccount[] => {
 if (typeof window === 'undefined') return [];
 try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]') as DemoAccount[]; } catch { return []; }
};
export interface ArtisanRegistration { city: string; state: string; specialty: string }
export const registerAccount = (name: string, email: string, password: string, role: 'comprador' | 'artesao', artisan?: ArtisanRegistration): boolean => {
 const normalized = email.trim().toLowerCase();
 if (!name.trim() || !normalized || password.length < 6 || (role === 'artesao' && (!artisan?.city.trim() || !artisan.state || !artisan.specialty)) || [...defaults, ...readAccounts()].some(a => a.email === normalized)) return false;
 const artisanId = role === 'artesao' ? `demo-artesao-${Date.now()}` : undefined;
 const account: DemoAccount = { name: name.trim(), email: normalized, password, role, artisanId, city: artisan?.city.trim(), state: artisan?.state, specialty: artisan?.specialty };
 let deleted: string[] = [];
 try { deleted = JSON.parse(localStorage.getItem(DELETED_ACCOUNTS_KEY) || '[]') as string[]; } catch {}
 localStorage.setItem(DELETED_ACCOUNTS_KEY, JSON.stringify(deleted.filter(item => item !== normalized)));
 localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...readAccounts(), account]));
 if (artisanId) {
  const artisanProfile: Artesao = { id: artisanId, nome: name.trim(), cidade: artisan!.city.trim(), estado: artisan!.state, especialidade: artisan!.specialty, imagemUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80' };
  artesaoService.salvarArtesao(artisanProfile);
 }
 return true;
};
export const readSession = (): DemoSession | null => {
 if (typeof window === 'undefined') return null;
 try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as DemoSession | null; } catch { return null; }
};
export const signOut = () => { if (typeof window !== 'undefined') localStorage.removeItem(SESSION_KEY); };
export const signIn = (role: UserRole, email: string, password: string): DemoSession | null => {
 const normalized = email.trim().toLowerCase();
 let deleted: string[] = [];
 try { deleted = JSON.parse(localStorage.getItem(DELETED_ACCOUNTS_KEY) || '[]') as string[]; } catch {}
 if (deleted.includes(normalized)) return null;
 const account = [...defaults, ...readAccounts()].find(a => a.role === role && a.email === normalized && a.password === password);
 if (!account) return null;
 let overrides: Record<string, DemoSession> = {};
 try { overrides = JSON.parse(localStorage.getItem(PROFILE_OVERRIDES_KEY) || '{}') as Record<string, DemoSession>; } catch {}
 const override = overrides[normalized];
 const session: DemoSession = {
  role: account.role, email: account.email, name: override?.name || account.name, artisanId: account.artisanId,
  city: override?.city || account.city, state: override?.state || account.state, specialty: override?.specialty || account.specialty,
  bio: override?.bio, imageUrl: override?.imageUrl,
 };
 localStorage.setItem(SESSION_KEY, JSON.stringify(session));
 return session;
};
export const updateAccountProfile = (profile: DemoSession): void => {
 const email = profile.email.trim().toLowerCase();
 const accounts = readAccounts();
 const accountIndex = accounts.findIndex(account => account.email === email);
 if (accountIndex >= 0) {
  accounts[accountIndex] = { ...accounts[accountIndex], ...profile };
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
 }
 let overrides: Record<string, DemoSession> = {};
 try { overrides = JSON.parse(localStorage.getItem(PROFILE_OVERRIDES_KEY) || '{}') as Record<string, DemoSession>; } catch {}
 overrides[email] = profile;
 localStorage.setItem(PROFILE_OVERRIDES_KEY, JSON.stringify(overrides));
 localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
 window.dispatchEvent(new Event('ponto-da-terra-profile-updated'));
 if (profile.role === 'artesao' && profile.artisanId) {
  const current = artesaoService.listarArtesaos().find(item => item.id === profile.artisanId);
  artesaoService.salvarArtesao({ id: profile.artisanId, nome: profile.name, cidade: profile.city || '', estado: profile.state || '', especialidade: profile.specialty || 'Artesanato', biografia: profile.bio, imagemUrl: profile.imageUrl || current?.imagemUrl || '' });
  produtoService.listarProdutosSincrono().filter(product => product.artesaoId === profile.artisanId).forEach(product => produtoService.salvarProduto({ ...product, artesaoNome: profile.name, artesaoCidade: [profile.city, profile.state].filter(Boolean).join(' - ') }));
 }
};
export const deleteAccount = (profile: DemoSession): void => {
 const email = profile.email.trim().toLowerCase();
 localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(readAccounts().filter(account => account.email !== email)));
 let deleted: string[] = [];
 try { deleted = JSON.parse(localStorage.getItem(DELETED_ACCOUNTS_KEY) || '[]') as string[]; } catch {}
 if (!deleted.includes(email)) deleted.push(email);
 localStorage.setItem(DELETED_ACCOUNTS_KEY, JSON.stringify(deleted));
 let overrides: Record<string, DemoSession> = {};
 try { overrides = JSON.parse(localStorage.getItem(PROFILE_OVERRIDES_KEY) || '{}') as Record<string, DemoSession>; } catch {}
 delete overrides[email];
 localStorage.setItem(PROFILE_OVERRIDES_KEY, JSON.stringify(overrides));
 if (profile.role === 'artesao' && profile.artisanId) {
  artesaoService.excluirArtesao(profile.artisanId);
  produtoService.listarProdutosSincrono().filter(product => product.artesaoId === profile.artisanId).forEach(product => produtoService.excluirProduto(product.id));
 }
 if (profile.role === 'comprador') saveOrders(readOrders().filter(order => order.owner.toLowerCase() !== email));
 signOut();
};
export interface DemoOrder {
 id: string; owner: string; date: string; status: 'Processando' | 'Enviado' | 'Entregue' | 'Cancelado';
 total: number; items: { name: string; quantity: number; price: number; image: string; artisanId?: string }[];
}
const ORDERS_KEY = 'ponto_da_terra_orders_v1';
export const readOrders = (): DemoOrder[] => {
 if (typeof window === 'undefined') return [];
 try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]') as DemoOrder[]; } catch { return []; }
};
export const saveOrders = (orders: DemoOrder[]) => { if (typeof window !== 'undefined') localStorage.setItem(ORDERS_KEY, JSON.stringify(orders)); };
