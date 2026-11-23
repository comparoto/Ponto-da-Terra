'use client';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Heading, Text } from '@chakra-ui/react';

export const camposAutenticacao = {
  color: 'white',
  bg: 'whiteAlpha.100',
  borderColor: 'whiteAlpha.300',
  _placeholder: { color: 'whiteAlpha.600' },
  _focus: { borderColor: 'terra.500', boxShadow: '0 0 0 1px #D9B596' },
};

/** Moldura das telas de conta (recuperar e redefinir senha), no mesmo visual da tela de login. */
export function CartaoAutenticacao({ titulo, subtitulo, children, onSubmit }: { titulo: string; subtitulo: string; children: ReactNode; onSubmit?: (e: React.FormEvent) => void }) {
  const router = useRouter();
  return (
    <Box
      minH="100vh"
      bgImage="linear-gradient(rgba(23, 20, 18, 0.72), rgba(23, 20, 18, 0.47)), url('/bg-pedidos.png')"
      bgSize="cover"
      bgPosition="center"
      bgAttachment="fixed"
      color="white"
      display="grid"
      placeItems="center"
      px={4}
    >
      <Box as="form" onSubmit={onSubmit} w="full" maxW="460px" p={8} bg="#2c2724e6" borderRadius="2xl" border="1px solid" borderColor="whiteAlpha.200">
        <Button type="button" variant="link" color="whiteAlpha.800" mb={4} onClick={() => router.push('/login')}>
          ← Voltar para o login
        </Button>
        <Heading color="terra.500" mb={2} size="lg">
          {titulo}
        </Heading>
        <Text color="#E8DFD7" mb={6}>
          {subtitulo}
        </Text>
        {children}
      </Box>
    </Box>
  );
}
