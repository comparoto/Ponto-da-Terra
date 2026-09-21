'use client';

import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

export function Provider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // No servidor (SSR), renderiza apenas os filhos sem injetar estilos do Chakra
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ChakraProvider value={defaultSystem}>
      {children}
    </ChakraProvider>
  );
}