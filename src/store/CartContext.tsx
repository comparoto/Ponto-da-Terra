'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import { Peca } from '@/types';

interface CartItem {
  peca: Peca;
  quantidade: number;
}

interface CartContextData {
  items: CartItem[];
  addToCart: (peca: Peca) => void;
  removeFromCart: (pecaId: string) => void;
  clearCart: () => void; // NOVA FUNÇÃO AQUI
  total: number;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (peca: Peca) => {
    setItems(prev => {
      const exists = prev.find(item => item.peca.id === peca.id);
      if (exists) {
        return prev.map(item =>
          item.peca.id === peca.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      }
      return [...prev, { peca, quantidade: 1 }];
    });
  };

  const removeFromCart = (pecaId: string) => {
    setItems(prev => prev.filter(item => item.peca.id !== pecaId));
  };

  // Lógica para limpar tudo
  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((acc, item) => acc + (item.peca.preco * item.quantidade), 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);