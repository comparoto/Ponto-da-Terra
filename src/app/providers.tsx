'use client';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { CartProvider } from '@/store/CartContext';

const theme = extendTheme({
  colors: {
    terra: {
      50: '#f5eee8',
      100: '#e6d3c3',
      500: '#D9B596', // Cor principal dos botões e textos de destaque
      600: '#c29f82',
      900: '#2C2724', // Fundo escuro
    },
  },
  fonts: {
    heading: `'Georgia', serif`, // Fonte serifada para os títulos
    body: `'Inter', sans-serif`,
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider theme={theme}>
      <CartProvider>
        {children}
      </CartProvider>
    </ChakraProvider>
  );
}