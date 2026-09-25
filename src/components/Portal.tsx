//verifica perfil para finalizar a compra

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Flex, Heading, Text } from '@chakra-ui/react';
import { DemoSession, readSession, UserRole } from '@/services/demoAuth';
                                                                                                     
export function RoleGate({ role, children }: { role: UserRole; children: React.ReactNode }) {
 const router = useRouter(); const [session, setSession] = useState<DemoSession | null>(null); const [ready, setReady] = useState(false);
 useEffect(() => { setSession(readSession()); setReady(true); }, []);
 useEffect(() => { if (!ready) return; if (!session) router.replace('/login'); else if (session.role !== role) router.replace(session.role === 'comprador' ? '/vitrine' : session.role === 'artesao' ? '/artesao' : '/admin'); }, [ready, session, role, router]);
 if (!ready || !session || session.role !== role) return <Flex minH="100vh" align="center" justify="center" bg="#171412"><Text color="terra.500">Verificando acesso...</Text></Flex>;
 return <>{children}</>;
}
export function PortalShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
 const router = useRouter(); const session = typeof window !== 'undefined' ? readSession() : null;
 return <Box minH="100vh" bg="#171412" color="white" p={{ base: 4, md: 8 }}><Flex maxW="1200px" mx="auto" justify="space-between" align="center" wrap="wrap" gap={4} mb={8}><Box><Text color="terra.500" fontSize="sm">PONTO DA TERRA · {session?.name}</Text><Heading mt={1}>{title}</Heading><Text color="whiteAlpha.700" mt={1}>{description}</Text></Box><Flex gap={2} wrap="wrap"><Button variant="outline" color="white" borderColor="whiteAlpha.500" _hover={{ bg: 'whiteAlpha.200', color: 'terra.500', borderColor: 'terra.500' }} onClick={() => router.push('/home')}>Home</Button><Button variant="outline" color="white" borderColor="whiteAlpha.500" _hover={{ bg: 'whiteAlpha.200', color: 'terra.500', borderColor: 'terra.500' }} onClick={() => router.push('/perfil')}>Meu perfil</Button><Button variant="outline" color="white" borderColor="whiteAlpha.500" _hover={{ bg: 'whiteAlpha.200', color: 'terra.500', borderColor: 'terra.500' }} onClick={() => { localStorage.removeItem('ponto_da_terra_session'); router.push('/login'); }}>Sair</Button></Flex></Flex><Box maxW="1200px" mx="auto">{children}</Box></Box>;
}

