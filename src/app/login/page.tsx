'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Checkbox, Heading, Input, Link, Select, Stack, Text } from '@chakra-ui/react';
import { signIn, UserRole } from '@/services/demoAuth';

const profileEmailExample: Record<UserRole, string> = {
  comprador: 'comprador@pontodaterra.com',
  artesao: 'artesao@pontodaterra.com',
  administrador: 'admin@pontodaterra.com',
};
export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('comprador');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const selectedRole = new URLSearchParams(window.location.search).get('perfil') as UserRole | null; if (selectedRole === 'comprador' || selectedRole === 'artesao' || selectedRole === 'administrador') setRole(selectedRole); }, []);
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!acceptedTerms) {
      setError('Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.');
      return;
    }
    const session = signIn(role, email, password)
      ?? signIn('comprador', email, password)
      ?? signIn('artesao', email, password)
      ?? signIn('administrador', email, password);
    if (!session) {
      setError('Não encontrei uma conta com esse e-mail e senha. Confira os dados ou crie uma conta.');
      return;
    }
    localStorage.setItem('ponto_da_terra_terms_accepted_v1', new Date().toISOString());
    router.push(session.role === 'comprador' ? '/home' : session.role === 'artesao' ? '/artesao' : '/admin');
  }
  return <Box minH="100vh" display="grid" placeItems="center" bg="#171412" px={4}><Box as="form" onSubmit={submit} w="full" maxW="460px" p={8} bg="#2C2724" borderRadius="2xl" border="1px solid" borderColor="whiteAlpha.200"><Button type="button" variant="link" color="whiteAlpha.800" mb={4} alignSelf="flex-start" onClick={() => router.push('/home')}>← Voltar para Home</Button><Heading color="terra.500" mb={2}>Entrar no Ponto da Terra</Heading><Text color="#E8DFD7" mb={6}>Acesse sua área de comprador, artesão ou administrador.</Text><Stack spacing={4}><Select color="white" bg="whiteAlpha.100" borderColor="whiteAlpha.300" sx={{ "& option": { color: "#fff", backgroundColor: "#2C2724" } }} value={role} onChange={e => setRole(e.target.value as UserRole)} aria-label="Perfil de acesso"><option value="comprador">Comprador</option><option value="artesao">Artesão</option><option value="administrador">Administrador</option></Select><Input color="white" bg="whiteAlpha.100" borderColor="whiteAlpha.300" _placeholder={{ color: 'whiteAlpha.600' }} _focus={{ borderColor: 'terra.500', boxShadow: '0 0 0 1px #D9B596' }} type="email" placeholder={profileEmailExample[role]} value={email} onChange={e => setEmail(e.target.value)} required/><Input color="white" bg="whiteAlpha.100" borderColor="whiteAlpha.300" _placeholder={{ color: 'whiteAlpha.600' }} _focus={{ borderColor: 'terra.500', boxShadow: '0 0 0 1px #D9B596' }} type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required/>{error && <Text color="red.300">{error}</Text>}<Checkbox color="white" colorScheme="orange" alignItems="flex-start" isChecked={acceptedTerms} onChange={event => { setAcceptedTerms(event.target.checked); if (event.target.checked) setError(''); }}>
            <Text fontSize="sm" color="#E8DFD7">Li e aceito os <Link href="/termos" color="terra.500" textDecoration="underline">Termos de Uso</Link> e a <Link href="/termos#privacidade" color="terra.500" textDecoration="underline">Política de Privacidade</Link>.</Text>
          </Checkbox><Button type="submit" bg="terra.500" color="black">Entrar</Button><Link href="/cadastro" color="terra.500">Criar conta</Link><Link href="/vitrine" color="whiteAlpha.700">Continuar como visitante</Link></Stack></Box></Box>;
}


