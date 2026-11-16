'use client';
import { useEffect, useState } from 'react';
import { Box, Button, Flex, Heading, HStack, Input, Image, Select, SimpleGrid, Text, VStack, Badge } from '@chakra-ui/react';
import { Peca } from '@/types';
import { produtoService } from '@/services/produtoService';
import { readSession } from '@/services/demoAuth';
import { useProductForm } from '@/hooks/useProductForm';

const field = { bg: 'whiteAlpha.100', borderColor: 'whiteAlpha.300', color: 'white' };

export function ProductManager({ artisanOnly = false }: { artisanOnly?: boolean }) {
  const session = readSession();
  const artisanId = session?.artisanId || '1';
  const [products, setProducts] = useState<Peca[]>([]);

  const refresh = () => produtoService.getProdutos().then(setProducts);
  useEffect(() => { void refresh(); }, []);

  const {
    defaultImage,
    name,
    setName,
    price,
    setPrice,
    category,
    setCategory,
    imageUrl,
    setImageUrl,
    message,
    setMessage,
    editingId,
    setEditingId,
    selectImage,
    add,
  } = useProductForm({
    products,
    artisanOnly,
    artisanId,
    sessionName: session?.name,
    onSaved: () => {
      void refresh();
    },
  });

  const list = artisanOnly
    ? products.filter(p => p.artesaoId === artisanId)
    : products.filter(p => (p as any).status !== 'pendente');

 function remove(id: string) { produtoService.excluirProduto(id); void refresh(); }

 return <VStack align="stretch" spacing={5}>
  {artisanOnly && (
    <Box bg="whiteAlpha.100" borderRadius="xl" p={{ base: 4, md: 5 }}>
    <Heading size="md" mb={4} color="white">Cadastrar peça</Heading>
    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
      <Box><Text color="white" fontSize="md" fontWeight="semibold" mb={1}>Nome do produto</Text><Input placeholder="Ex.: Vaso artesanal" value={name} onChange={e => setName(e.target.value)} fontSize="md" minH="48px" _placeholder={{ color: 'whiteAlpha.700' }} {...field}/></Box>
      <Box><Text color="white" fontSize="md" fontWeight="semibold" mb={1}>Preço (R$)</Text><Input placeholder="Ex.: 85,00" type="number" min="0.01" step="0.01" value={price} onChange={e => setPrice(e.target.value)} fontSize="md" minH="48px" _placeholder={{ color: 'whiteAlpha.700' }} {...field}/></Box>
      <Box><Text color="white" fontSize="md" fontWeight="semibold" mb={1}>Categoria</Text><Select value={category} onChange={e => setCategory(e.target.value)} fontSize="md" minH="48px" {...field}><option>Cerâmica & Barro</option><option>Escultura & Madeira</option><option>Renda & Têxtil</option><option>Cestaria & Palha</option><option>Xilogravura</option></Select></Box>
      <Box><Text color="white" fontSize="md" fontWeight="semibold" mb={1}>Foto do produto</Text><Input type="file" accept="image/*" onChange={e => selectImage(e.target.files?.[0])} fontSize="sm" minH="48px" pt={2} color="white" borderColor="whiteAlpha.400" aria-label="Selecionar foto do produto"/></Box>
    </SimpleGrid>
    <Flex mt={4} gap={4} align="center" wrap="wrap">
      <Image src={imageUrl} alt="Prévia da imagem do produto" boxSize="88px" objectFit="cover" borderRadius="md" border="1px solid" borderColor="whiteAlpha.400" fallbackSrc={defaultImage}/>
      <Text color="whiteAlpha.800" fontSize="sm">Prévia da foto. Formatos de imagem, até 1,5 MB.</Text>
    </Flex>
    <Button mt={4} bg="terra.500" color="black" fontSize="md" minH="48px" _hover={{ bg: 'terra.600' }} onClick={add}>{editingId ? 'Salvar alterações' : 'Adicionar peça'}</Button>
    {message && <Text mt={3} color="terra.200" fontSize="md" role="status">{message}</Text>}
    </Box>
  )}

  <Heading size="md" color="white">{artisanOnly ? 'Minhas peças' : 'Catálogo de peças aprovadas'}</Heading>
  {list.length ? list.map(p => <Flex key={p.id} bg="whiteAlpha.100" p={4} borderRadius="lg" align="center" justify="space-between" gap={3} wrap="wrap">
   <HStack spacing={4}>
    <Image src={p.imagemUrl} alt={p.nome} boxSize="64px" objectFit="cover" borderRadius="md" fallbackSrc={defaultImage}/>
    <Box>
      <HStack>
        <Text fontWeight="bold" color="white" fontSize="md">{p.nome}</Text>
        {artisanOnly && (p as any).status === 'pendente' && <Badge colorScheme="yellow">Em Análise</Badge>}
        {artisanOnly && (p as any).status === 'aprovado' && <Badge colorScheme="green">Publicado</Badge>}
      </HStack>
      <Text color="whiteAlpha.800" fontSize="sm">{p.categoria} · R$ {p.preco.toFixed(2).replace('.', ',')}</Text>
    </Box>
   </HStack>
   <HStack>
    {artisanOnly && <Button size="md" variant="outline" color="white" borderColor="whiteAlpha.500" _hover={{ bg: 'whiteAlpha.200', color: 'terra.500', borderColor: 'terra.500' }} onClick={() => { setEditingId(p.id); setName(p.nome); setPrice(String(p.preco)); setCategory(p.categoria || 'Cerâmica & Barro'); setImageUrl(p.imagemUrl || defaultImage); setMessage(''); }}>Editar</Button>}
    <Button size="md" color="red.200" borderColor="red.400" variant="outline" _hover={{ bg: 'red.600', color: 'white' }} onClick={() => remove(p.id)}>Excluir</Button>
   </HStack>
  </Flex>) : <Text color="whiteAlpha.800" fontSize="md">Nenhuma peça encontrada.</Text>}
 </VStack>;
}