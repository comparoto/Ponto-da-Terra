'use client';
import { useMemo, useSyncExternalStore } from 'react';
import { readSession, type Sessao } from '@/services/authService';
import { SESSAO_ALTERADA, SESSION_KEY } from '@/services/http';

/**
 * Sessão do usuário como "store externo" (localStorage), lida com useSyncExternalStore:
 * atualiza sozinha quando a sessão muda (login, logout, edição de perfil, outra aba)
 * e não precisa de setState dentro de useEffect.
 */
function assinar(aoMudar: () => void) {
  const porChave = (e: StorageEvent) => {
    if (e.key === SESSION_KEY) aoMudar();
  };
  window.addEventListener('storage', porChave);
  window.addEventListener(SESSAO_ALTERADA, aoMudar);
  return () => {
    window.removeEventListener('storage', porChave);
    window.removeEventListener(SESSAO_ALTERADA, aoMudar);
  };
}

// O snapshot é a string bruta: estável entre leituras, então não causa re-render à toa
const lerBruto = () => (typeof window === 'undefined' ? null : localStorage.getItem(SESSION_KEY));

export function useSession(): Sessao | null {
  const bruto = useSyncExternalStore(assinar, lerBruto, () => null);
  // readSession também descarta tokens vencidos
  return useMemo(() => (bruto ? readSession() : null), [bruto]);
}

const nada = () => () => {};

/** false no servidor e durante a hidratação; true depois. Evita redirecionar antes de ler a sessão. */
export function useHidratado(): boolean {
  return useSyncExternalStore(
    nada,
    () => true,
    () => false,
  );
}
