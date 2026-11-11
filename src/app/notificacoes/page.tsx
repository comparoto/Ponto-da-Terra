'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Heading, Text } from '@chakra-ui/react';
import { Navbar } from '@/components/Navbar';
import { ListaNotificacoes } from '@/components/Notificacoes';
import { useHidratado, useSession } from '@/hooks/useSession';

/** Notificações de qualquer perfil logado: pagamento confirmado, pedido postado, peça aprovada etc. */
export default function NotificacoesPage() {
  const router = useRouter();
  const hidratado = useHidratado();
  const session = useSession();

  useEffect(() => {
    if (hidratado && !session) router.replace('/login');
  }, [hidratado, session, router]);

  return (
    <Box minH="100vh" bg="#171412" color="white">
      <Navbar />
      <Box maxW="820px" mx="auto" p={{ base: 4, md: 8 }}>
        <Heading fontFamily="heading" mb={2}>
          Notificações
        </Heading>
        <Text color="whiteAlpha.700" mb={6}>
          Avisos sobre seus pedidos, pagamentos e peças.
        </Text>
        {hidratado && session && <ListaNotificacoes />}
      </Box>
    </Box>
  );
}
