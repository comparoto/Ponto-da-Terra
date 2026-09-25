'use client';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { CartProvider } from '@/store/cartStore';

export const theme = extendTheme({
  colors: {
    terra: {
      50: '#f5eee8',
      100: '#e6d3c3',
      500: '#D9B596',
      600: '#c29f82',
      900: '#2C2724',
    },
  },
  fonts: {
    heading: `'Georgia', serif`,
    body: `'Inter', sans-serif`,
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 600,
        _focusVisible: { boxShadow: '0 0 0 3px rgba(217, 181, 150, 0.65)' },
      },
      variants: {
        outline: {
          color: '#F7F2EE',
          borderColor: '#B9AAA0',
          bg: 'transparent',
          _hover: { bg: 'whiteAlpha.200', borderColor: 'terra.500', color: 'terra.500' },
          _active: { bg: 'whiteAlpha.300' },
        },
        ghost: {
          color: '#F7F2EE',
          _hover: { bg: 'whiteAlpha.200' },
          _active: { bg: 'whiteAlpha.300' },
        },
      },
    },
  },
  styles: {
    global: {
      body: {
        bg: '#171412',
        color: 'white',
      },
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider theme={theme}>
      <CartProvider>{children}</CartProvider>
    </ChakraProvider>
  );
}
