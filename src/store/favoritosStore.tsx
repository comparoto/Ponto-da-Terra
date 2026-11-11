'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { favoritoService } from '@/services/interacaoService';

interface FavoritosContextType {
  /** O comprador logado pode favoritar (visitantes são levados ao login) */
  disponivel: boolean;
  ehFavorito: (produtoId: string) => boolean;
  /** Alterna o favorito; devolve false se a API recusar */
  alternar: (produtoId: string) => Promise<boolean>;
  total: number;
}

const FavoritosContext = createContext<FavoritosContextType | undefined>(undefined);

/** Favoritos do comprador, guardados no servidor (diagrama de classes: Consumidor "salva" Favorito). */
export function FavoritosProvider({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const token = session?.role === 'comprador' ? session.token : null;
  // Os ids ficam associados ao token de quem os carregou: trocar de conta descarta a lista anterior
  const [estado, setEstado] = useState<{ token: string | null; ids: Set<string> }>({ token: null, ids: new Set() });
  const ids = useMemo(() => (estado.token === token && token ? estado.ids : new Set<string>()), [estado, token]);

  useEffect(() => {
    if (!token) return;
    let ativo = true;
    void favoritoService.listar().then(res => {
      if (ativo && res.success) setEstado({ token, ids: new Set((res.data ?? []).map(p => p.id)) });
    });
    return () => {
      ativo = false;
    };
  }, [token]);

  const alternar = useCallback(
    async (produtoId: string) => {
      if (!token) return false;
      const marcado = ids.has(produtoId);
      const atualizar = (fn: (s: Set<string>) => void) =>
        setEstado(atual => {
          const novo = new Set(atual.token === token ? atual.ids : []);
          fn(novo);
          return { token, ids: novo };
        });
      atualizar(s => (marcado ? s.delete(produtoId) : s.add(produtoId))); // atualização otimista
      const res = marcado ? await favoritoService.remover(produtoId) : await favoritoService.adicionar(produtoId);
      if (!res.success) atualizar(s => (marcado ? s.add(produtoId) : s.delete(produtoId))); // desfaz
      return res.success;
    },
    [token, ids],
  );

  return (
    <FavoritosContext.Provider value={{ disponivel: Boolean(token), ehFavorito: id => ids.has(id), alternar, total: ids.size }}>
      {children}
    </FavoritosContext.Provider>
  );
}

export function useFavoritos() {
  const ctx = useContext(FavoritosContext);
  if (!ctx) throw new Error('useFavoritos deve ser usado dentro de um FavoritosProvider');
  return ctx;
}
