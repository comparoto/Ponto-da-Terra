'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Peca, ItemCarrinho } from '@/types';
import { readSession } from '@/services/authService';
import { useSession } from '@/hooks/useSession';
import { carrinhoSalvoService } from '@/services/interacaoService';

export const MSG_LIMITE_ESTOQUE = 'Limite de estoque atingido para esta peça';

interface CartContextType {
  items: ItemCarrinho[];
  /** Retorna false (e não altera nada) se a quantidade ultrapassar o estoque. */
  adicionarAoCarrinho: (peca: Peca, quantidade?: number) => boolean;
  removerDoCarrinho: (pecaId: string) => void;
  atualizarQuantidade: (pecaId: string, quantidade: number) => boolean;
  limparCarrinho: () => void;
  quantidadeNoCarrinho: (pecaId: string) => number;
  /** Verdadeiro quando a quantidade no carrinho já chegou ao estoque disponível (HU4 / TC14). */
  limiteAtingido: (peca: Peca) => boolean;
  totalItens: number;
  /** Estimativa exibida na sacola; o valor oficial é calculado pelo servidor no checkout (TC08). */
  valorTotal: number;
  isCartOpen: boolean;
  abrirCarrinho: () => void;
  fecharCarrinho: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// v2: os ids agora são os UUIDs do banco; carrinhos antigos (ids do mock) são descartados
const STORAGE_KEY = 'ponto_da_terra_cart_v2';

const estoqueDe = (peca: Peca) => (typeof peca.estoque === 'number' ? peca.estoque : Infinity);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ItemCarrinho[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // O carrinho fica no localStorage, que só existe no navegador. Ler aqui (depois de montar)
  // mantém o primeiro render igual ao HTML do servidor e evita erro de hidratação.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronização única com armazenamento externo
      if (saved) setItems(JSON.parse(saved));
    } catch {
      /* carrinho corrompido: começa vazio */
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* armazenamento indisponível */
    }
  }, [items, isLoaded]);

  // Carrinho do comprador logado também fica salvo no servidor: ao entrar, junta o que estava no
  // aparelho com o que estava na conta (respeitando o estoque) e, depois, salva cada alteração.
  const session = useSession();
  const tokenComprador = session?.role === 'comprador' ? session.token : null;
  const sincronizado = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !tokenComprador || sincronizado.current === tokenComprador) return;
    let ativo = true;
    void carrinhoSalvoService.ler().then(res => {
      if (!ativo) return;
      if (res.success && res.data) {
        const remotos = res.data;
        setItems(locais => {
          const juntos = new Map(locais.map(i => [i.peca.id, i]));
          for (const r of remotos) {
            const atual = juntos.get(r.peca.id);
            const quantidade = Math.min(Math.max(atual?.quantidade ?? 0, r.quantidade), estoqueDe(r.peca));
            if (quantidade > 0) juntos.set(r.peca.id, { peca: r.peca, quantidade });
          }
          return [...juntos.values()];
        });
      }
      sincronizado.current = tokenComprador;
    });
    return () => {
      ativo = false;
    };
  }, [isLoaded, tokenComprador]);

  useEffect(() => {
    if (!tokenComprador) {
      sincronizado.current = null;
      return;
    }
    if (sincronizado.current !== tokenComprador) return;
    const t = setTimeout(() => {
      void carrinhoSalvoService.salvar(items.map(i => ({ produtoId: i.peca.id, quantidade: i.quantidade })));
    }, 600);
    return () => clearTimeout(t);
  }, [items, tokenComprador]);

  const quantidadeNoCarrinho = (pecaId: string) => items.find(i => i.peca.id === pecaId)?.quantidade ?? 0;
  const limiteAtingido = (peca: Peca) => quantidadeNoCarrinho(peca.id) >= estoqueDe(peca);

  const adicionarAoCarrinho = (peca: Peca, quantidade = 1) => {
    const session = readSession();
    if (session && session.role !== 'comprador') return false;
    if (quantidadeNoCarrinho(peca.id) + quantidade > estoqueDe(peca)) return false;

    setItems(prev => {
      const index = prev.findIndex(item => item.peca.id === peca.id);
      if (index >= 0) {
        const novo = [...prev];
        novo[index] = { peca, quantidade: novo[index].quantidade + quantidade };
        return novo;
      }
      return [...prev, { peca, quantidade }];
    });
    setIsCartOpen(true);
    return true;
  };

  const removerDoCarrinho = (pecaId: string) => {
    setItems(prev => prev.filter(item => item.peca.id !== pecaId));
  };

  const atualizarQuantidade = (pecaId: string, quantidade: number) => {
    if (quantidade <= 0) {
      removerDoCarrinho(pecaId);
      return true;
    }
    const item = items.find(i => i.peca.id === pecaId);
    if (item && quantidade > estoqueDe(item.peca)) return false;
    setItems(prev => prev.map(i => (i.peca.id === pecaId ? { ...i, quantidade } : i)));
    return true;
  };

  const limparCarrinho = () => setItems([]);
  const abrirCarrinho = () => setIsCartOpen(true);
  const fecharCarrinho = () => setIsCartOpen(false);

  const totalItens = items.reduce((acc, curr) => acc + curr.quantidade, 0);
  const valorTotal = items.reduce((acc, curr) => acc + curr.peca.preco * curr.quantidade, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        adicionarAoCarrinho,
        removerDoCarrinho,
        atualizarQuantidade,
        limparCarrinho,
        quantidadeNoCarrinho,
        limiteAtingido,
        totalItens,
        valorTotal,
        isCartOpen,
        abrirCarrinho,
        fecharCarrinho,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart deve ser usado dentro de um CartProvider');
  return context;
}
