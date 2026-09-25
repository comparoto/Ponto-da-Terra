import { Artesao } from '@/types';
import { artesaoService } from '@/services/artesaoService';
import { produtoService } from '@/services/produtoService';

export type UserRole = 'comprador' | 'artesao' | 'administrador';

export interface DemoSession {
  role: UserRole;
  email: string;
  name: string;
  artisanId?: string;
  city?: string;
  state?: string;
  specialty?: string;
  bio?: string;
  imageUrl?: string;
}

interface DemoAccount extends DemoSession {
  password: string;
}

export const SESSION_KEY = 'ponto_da_terra_session';
const ACCOUNTS_KEY = 'ponto_da_terra_accounts_v1';
const PROFILE_OVERRIDES_KEY = 'ponto_da_terra_profile_overrides_v1';
const DELETED_ACCOUNTS_KEY = 'ponto_da_terra_deleted_accounts_v1';
const ORDERS_KEY = 'ponto_da_terra_orders_v1';

const DEFAULT_ACCOUNTS: DemoAccount[] = [
  { role: 'comprador', email: 'comprador@pontodaterra.com', password: 'comprador123', name: 'Comprador Demonstração' },
  { role: 'artesao', email: 'artesao@pontodaterra.com', password: 'artesao123', name: 'Artesão Demonstração', artisanId: '1' },
  { role: 'administrador', email: 'admin@pontodaterra.com', password: 'admin123', name: 'Administrador' },
];

const isBrowser = (): boolean => typeof window !== 'undefined';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const safeJsonParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const writeStorage = (key: string, value: unknown): void => {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
};

const readAccounts = (): DemoAccount[] => {
  if (!isBrowser()) return [];
  return safeJsonParse<DemoAccount[]>(localStorage.getItem(ACCOUNTS_KEY), []);
};

const readDeletedAccounts = (): string[] => {
  if (!isBrowser()) return [];
  return safeJsonParse<string[]>(localStorage.getItem(DELETED_ACCOUNTS_KEY), []);
};

const readProfileOverrides = (): Record<string, DemoSession> => {
  if (!isBrowser()) return {};
  return safeJsonParse<Record<string, DemoSession>>(localStorage.getItem(PROFILE_OVERRIDES_KEY), {});
};

const getAllAccounts = (): DemoAccount[] => [...DEFAULT_ACCOUNTS, ...readAccounts()];

export interface ArtisanRegistration {
  city: string;
  state: string;
  specialty: string;
}

export const registerAccount = (
  name: string,
  email: string,
  password: string,
  role: 'comprador' | 'artesao',
  artisan?: ArtisanRegistration,
): boolean => {
  const normalizedEmail = normalizeEmail(email);
  const cleanName = name.trim();

  if (
    !cleanName ||
    !normalizedEmail ||
    password.length < 6 ||
    (role === 'artesao' && (!artisan?.city?.trim() || !artisan.state || !artisan.specialty)) ||
    getAllAccounts().some(account => account.email === normalizedEmail)
  ) {
    return false;
  }

  const artisanId = role === 'artesao' ? `demo-artesao-${Date.now()}` : undefined;
  const account: DemoAccount = {
    name: cleanName,
    email: normalizedEmail,
    password,
    role,
    artisanId,
    city: artisan?.city.trim(),
    state: artisan?.state,
    specialty: artisan?.specialty,
  };

  const deleted = readDeletedAccounts().filter(item => item !== normalizedEmail);
  writeStorage(DELETED_ACCOUNTS_KEY, deleted);

  const accounts = [...readAccounts(), account];
  writeStorage(ACCOUNTS_KEY, accounts);

  if (artisanId && artisan) {
    const artisanProfile: Artesao = {
      id: artisanId,
      nome: cleanName,
      cidade: artisan.city.trim(),
      estado: artisan.state,
      especialidade: artisan.specialty,
      imagemUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80',
    };

    artesaoService.salvarArtesao(artisanProfile);
  }

  return true;
};

export const readSession = (): DemoSession | null => {
  if (!isBrowser()) return null;
  return safeJsonParse<DemoSession | null>(localStorage.getItem(SESSION_KEY), null);
};

export const signOut = (): void => {
  if (!isBrowser()) return;
  localStorage.removeItem(SESSION_KEY);
};

export const signIn = (role: UserRole, email: string, password: string): DemoSession | null => {
  const normalizedEmail = normalizeEmail(email);
  const deleted = readDeletedAccounts();

  if (deleted.includes(normalizedEmail)) return null;

  const account = getAllAccounts().find(
    item => item.role === role && item.email === normalizedEmail && item.password === password,
  );

  if (!account) return null;

  const overrides = readProfileOverrides();
  const override = overrides[normalizedEmail];

  const session: DemoSession = {
    role: account.role,
    email: account.email,
    name: override?.name || account.name,
    artisanId: account.artisanId,
    city: override?.city || account.city,
    state: override?.state || account.state,
    specialty: override?.specialty || account.specialty,
    bio: override?.bio ?? account.bio,
    imageUrl: override?.imageUrl ?? account.imageUrl,
  };

  writeStorage(SESSION_KEY, session);
  return session;
};

export const updateAccountProfile = (profile: DemoSession): void => {
  if (!isBrowser()) return;

  const email = normalizeEmail(profile.email);
  const accounts = readAccounts();
  const accountIndex = accounts.findIndex(account => account.email === email);

  if (accountIndex >= 0) {
    accounts[accountIndex] = { ...accounts[accountIndex], ...profile };
    writeStorage(ACCOUNTS_KEY, accounts);
  }

  const overrides = readProfileOverrides();
  overrides[email] = profile;
  writeStorage(PROFILE_OVERRIDES_KEY, overrides);
  writeStorage(SESSION_KEY, profile);

  window.dispatchEvent(new Event('ponto-da-terra-profile-updated'));

  if (profile.role === 'artesao' && profile.artisanId) {
    const current = artesaoService.listarArtesaos().find(item => item.id === profile.artisanId);

    artesaoService.salvarArtesao({
      id: profile.artisanId,
      nome: profile.name,
      cidade: profile.city || '',
      estado: profile.state || '',
      especialidade: profile.specialty || 'Artesanato',
      biografia: profile.bio,
      imagemUrl: profile.imageUrl || current?.imagemUrl || '',
    });

    produtoService
      .listarProdutosSincrono()
      .filter(product => product.artesaoId === profile.artisanId)
      .forEach(product =>
        produtoService.salvarProduto({
          ...product,
          artesaoNome: profile.name,
          artesaoCidade: [profile.city, profile.state].filter(Boolean).join(' - '),
        }),
      );
  }
};

export const deleteAccount = (profile: DemoSession): void => {
  if (!isBrowser()) return;

  const email = normalizeEmail(profile.email);
  const remainingAccounts = readAccounts().filter(account => account.email !== email);
  writeStorage(ACCOUNTS_KEY, remainingAccounts);

  const deleted = readDeletedAccounts();
  if (!deleted.includes(email)) {
    deleted.push(email);
  }
  writeStorage(DELETED_ACCOUNTS_KEY, deleted);

  const overrides = readProfileOverrides();
  delete overrides[email];
  writeStorage(PROFILE_OVERRIDES_KEY, overrides);

  if (profile.role === 'artesao' && profile.artisanId) {
    artesaoService.excluirArtesao(profile.artisanId);
    produtoService
      .listarProdutosSincrono()
      .filter(product => product.artesaoId === profile.artisanId)
      .forEach(product => produtoService.excluirProduto(product.id));
  }

  if (profile.role === 'comprador') {
    saveOrders(readOrders().filter(order => order.owner.toLowerCase() !== email));
  }

  signOut();
};

export interface DemoOrder {
  id: string;
  owner: string;
  date: string;
  status: 'Processando' | 'Enviado' | 'Entregue' | 'Cancelado';
  total: number;
  items: { name: string; quantity: number; price: number; image: string; artisanId?: string }[];
}

export const readOrders = (): DemoOrder[] => {
  if (!isBrowser()) return [];
  return safeJsonParse<DemoOrder[]>(localStorage.getItem(ORDERS_KEY), []);
};

export const saveOrders = (orders: DemoOrder[]): void => {
  if (!isBrowser()) return;
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
};
