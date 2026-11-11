'use client';
// Proteção de rotas no frontend. A proteção que vale é a do servidor (JWT + perfil em cada rota da API — TC01);
// aqui só se evita mostrar telas que o usuário não pode usar.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Flex, Heading, Text } from '@chakra-ui/react';
import { signOut, type UserRole } from '@/services/authService';
import { useHidratado, useSession } from '@/hooks/useSession';

const PAINEL: Record<UserRole, string> = { comprador: '/vitrine', artesao: '/artesao', administrador: '/admin' };

export function RoleGate({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const router = useRouter();
  const hidratado = useHidratado();
  const session = useSession();

  useEffect(() => {
    if (!hidratado) return;
    if (!session) router.replace(`/login?perfil=${role}`);
    else if (session.role !== role) router.replace(PAINEL[session.role]);
  }, [hidratado, session, role, router]);

  if (!hidratado || !session || session.role !== role) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="#171412">
        <Text color="terra.500">Verificando acesso...</Text>
      </Flex>
    );
  }
  return <>{children}</>;
}

export function PortalShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const router = useRouter();
  const session = useSession();
  const botao = { variant: 'outline', color: 'white', borderColor: 'whiteAlpha.500', _hover: { bg: 'whiteAlpha.200', color: 'terra.500', borderColor: 'terra.500' } } as const;
  return (
    <Box minH="100vh" bg="#171412" color="white" p={{ base: 4, md: 8 }}>
      <Flex maxW="1200px" mx="auto" justify="space-between" align="center" wrap="wrap" gap={4} mb={8}>
        <Box>
          <Text color="terra.500" fontSize="sm">
            PONTO DA TERRA · {session?.name}
          </Text>
          <Heading mt={1}>{title}</Heading>
          <Text color="whiteAlpha.700" mt={1}>
            {description}
          </Text>
        </Box>
        <Flex gap={2} wrap="wrap">
          <Button {...botao} onClick={() => router.push('/home')}>
            Home
          </Button>
          <Button {...botao} onClick={() => router.push('/perfil')}>
            Meu perfil
          </Button>
          <Button
            {...botao}
            onClick={async () => {
              await signOut();
              router.push('/login');
            }}
          >
            Sair
          </Button>
        </Flex>
      </Flex>
      <Box maxW="1200px" mx="auto">
        {children}
      </Box>
    </Box>
  );
}
