'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Flex, Heading, HStack, Input, Image, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { Navbar } from '@/components/Navbar';
import { readSession, readOrders } from '@/services/demoAuth';
import { Peca, Artesao } from '@/types';
import { produtoService } from '@/services/produtoService';
import { artesaoService } from '@/services/artesaoService';
import { ProductManager } from '@/components/ProductManager';
import { OrderManager } from '@/components/OrderManager';

const field = { bg: 'whiteAlpha.100', borderColor: 'whiteAlpha.300', color: 'white' };

function ApprovalManager() {
  const [pendentes, setPendentes] = useState<Peca[]>([]);
  
  const refresh = () => produtoService.getProdutos().then(res => {
    setPendentes(res.filter(p => (p as any).status === 'pendente'));
  });
  
  useEffect(() => { void refresh(); }, []);

  function aprovar(peca: Peca) {
    produtoService.salvarProduto({ ...peca, status: 'aprovado' } as any);
    void refresh();
  }

  function rejeitar(id: string) {
    produtoService.excluirProduto(id);
    void refresh();
  }

  if (!pendentes.length) return <Text color="whiteAlpha.700">Não há novas solicitações de artesãos no momento.</Text>;

  return (
    <VStack align="stretch" spacing={4}>
      <Heading size="md" color="white" mb={2}>Aguardando sua aprovação</Heading>
      {pendentes.map(p => (
        <Flex key={p.id} bg="whiteAlpha.100" p={4} borderRadius="lg" align="center" justify="space-between" gap={3} wrap="wrap" border="1px solid" borderColor="yellow.600">
          <HStack spacing={4}>
            <Image src={p.imagemUrl} boxSize="64px" objectFit="cover" borderRadius="md" fallbackSrc="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80"/>
            <Box>
              <Text fontWeight="bold" color="white">{p.nome}</Text>
              <Text color="whiteAlpha.700" fontSize="sm">Por: {p.artesaoNome} · R$ {p.preco.toFixed(2)}</Text>
            </Box>
          </HStack>
          <HStack>
            <Button size="sm" colorScheme="green" onClick={() => aprovar(p)}>Aprovar</Button>
            <Button size="sm" colorScheme="red" variant="outline" onClick={() => rejeitar(p.id)}>Rejeitar</Button>
          </HStack>
        </Flex>
      ))}
    </VStack>
  );
}

function ArtisanManager() {
 const [artisans, setArtisans] = useState<Artesao[]>([]);
 const [name, setName] = useState(''); const [city, setCity] = useState(''); const [specialty, setSpecialty] = useState('');
 const refresh = () => artesaoService.getArtesaos().then(setArtisans);
 useEffect(() => { void refresh(); }, []);
 
 function add() {
    if(!name.trim()||!city.trim()) return;
    artesaoService.salvarArtesao({id:`admin-${Date.now()}`, nome:name.trim(), cidade:city.trim(), estado:'PE', especialidade:specialty.trim()||'Artesanato', imagemUrl:'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80'});
    setName(''); setCity(''); setSpecialty(''); void refresh();
 }
 
 return <VStack align="stretch" spacing={4}>
    <Box p={5} bg="whiteAlpha.100" borderRadius="xl">
        <Heading size="md" mb={4}>Cadastrar artesão</Heading>
        <SimpleGrid columns={{base:1,md:4}} spacing={3}>
            <Input placeholder="Nome" value={name} onChange={e=>setName(e.target.value)} {...field}/>
            <Input placeholder="Cidade" value={city} onChange={e=>setCity(e.target.value)} {...field}/>
            <Input placeholder="Especialidade" value={specialty} onChange={e=>setSpecialty(e.target.value)} {...field}/>
            <Button bg="terra.500" color="black" onClick={add}>Cadastrar</Button>
        </SimpleGrid>
    </Box>
    {artisans.map(a => <Flex key={a.id} justify="space-between" align="center" p={4} bg="whiteAlpha.100" borderRadius="lg">
        <Box>
            <Text fontWeight="bold">{a.nome}</Text>
            <Text color="whiteAlpha.700">{a.cidade}, {a.estado} · {a.especialidade}</Text>
        </Box>
        {a.id.startsWith('admin-') && <Button size="sm" colorScheme="red" variant="outline" onClick={() => {artesaoService.excluirArtesao(a.id); void refresh();}}>Remover</Button>}
    </Flex>)}
  </VStack>;
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState('overview');
  const [count, setCount] = useState({ products: 0, orders: 0 });
  const [sessionName, setSessionName] = useState('');

  useEffect(() => {
    const session = readSession();
    if (!session || session.role !== 'administrador') {
      router.replace('/login?perfil=administrador');
      return;
    }
    setSessionName(session.name);
    void produtoService.getProdutos().then(p => setCount({ products: p.length, orders: readOrders().length }));
  }, [router]);
  
  return (
    <Box minH="100vh" bg="#171412" color="white">
      <Navbar />
      <Box maxW="1100px" mx="auto" p={{ base: 4, md: 8 }}>
        <Box mb={8}>
          <Text color="terra.500" fontSize="sm" fontWeight="bold" textTransform="uppercase">
            Administração · {sessionName}
          </Text>
          <Heading size="xl" mt={1}>Painel Administrativo</Heading>
          <Text color="whiteAlpha.700" mt={2}>Visão geral e gerenciamento da plataforma.</Text>
        </Box>

        <VStack align="stretch" spacing={5}>
            <Flex gap={3} wrap="wrap" borderBottom="1px solid" borderColor="whiteAlpha.200" pb={4}>
            {[
                ['overview', 'Resumo'],
                ['approvals', 'Aprovações'], 
                ['products', 'Catálogo'],
                ['artisans', 'Artesãos'],
                ['orders', 'Pedidos do Site']
            ].map(([id, label]) =>
                <Button key={id} onClick={() => setTab(id)} colorScheme={tab === id ? 'orange' : 'gray'} variant={tab === id ? 'solid' : 'ghost'}>{label}</Button>
            )}
            </Flex>
        
        {tab === 'overview' && <SimpleGrid columns={{base:1,md:3}} spacing={4}>
            <Box p={6} bg="whiteAlpha.100" borderRadius="xl"><Text>Produtos Ativos</Text><Heading color="terra.500">{count.products}</Heading></Box>
            <Box p={6} bg="whiteAlpha.100" borderRadius="xl"><Text>Pedidos</Text><Heading color="terra.500">{count.orders}</Heading></Box>
            <Box p={6} bg="whiteAlpha.100" borderRadius="xl"><Text>Perfis de demonstração</Text><Heading color="terra.500">3</Heading></Box>
        </SimpleGrid>}
        
        {tab === 'approvals' && <ApprovalManager />}
        {tab === 'products' && <ProductManager />}
        {tab === 'orders' && <OrderManager />}
        {tab === 'artisans' && <ArtisanManager />}
        </VStack>
      </Box>
    </Box>
  );
}