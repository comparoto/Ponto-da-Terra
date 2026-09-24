'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Peca, ItemCarrinho } from '@/types';

interface CartContextType {
  items: ItemCarrinho[];
  adicionarAoCarrinho: (peca: Peca, quantidade?: number) => void;
  removerDoCarrinho: (pecaId: string) => void;
  atualizarQuantidade: (pecaId: string, quantidade: number) => void;
  limparCarrinho: () => void;
  totalItens: number;
  valorTotal: number;
  isCartOpen: boolean;
  abrirCarrinho: () => void;
  fecharCarrinho: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'ponto_da_terra_cart_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ItemCarrinho[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch {} finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {}
    }
  }, [items, isLoaded]);

  const adicionarAoCarrinho = (peca: Peca, quantidade = 1) => {
    setItems(prev => {
      const index = prev.findIndex(item => item.peca.id === peca.id);
      if (index >= 0) {
        const novo = [...prev];
        novo[index] = { ...novo[index], quantidade: novo[index].quantidade + quantidade };
        return novo;
      }
      return [...prev, { peca, quantidade }];
    });
    setIsCartOpen(true);
  };

  const removerDoCarrinho = (pecaId: string) => {
    setItems(prev => prev.filter(item => item.peca.id !== pecaId));
  };

  const atualizarQuantidade = (pecaId: string, quantidade: number) => {
    if (quantidade <= 0) {
      removerDoCarrinho(pecaId);
      return;
    }
    setItems(prev =>
      prev.map(item => (item.peca.id === pecaId ? { ...item, quantidade } : item))
    );
  };

  const limparCarrinho = () => setItems([]);
  const abrirCarrinho = () => setIsCartOpen(true);
  const fecharCarrinho = () => setIsCartOpen(false);

  const totalItens = items.reduce((acc, curr) => acc + curr.quantidade, 0);
  const valorTotal = items.reduce((acc, curr) => acc + curr.peca.preco * curr.quantidade, 0);

  return (
    <CartContext.Provider value={{
      items, adicionarAoCarrinho, removerDoCarrinho, atualizarQuantidade,
      limparCarrinho, totalItens, valorTotal, isCartOpen, abrirCarrinho, fecharCarrinho
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart deve ser usado dentro de um CartProvider');
  return context;
}