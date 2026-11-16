'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Box, Button, Flex, Heading, SimpleGrid, Spinner, Text, useDisclosure, VStack } from '@chakra-ui/react';
import { Navbar } from '@/components/Navbar';
import { ProductCard } from '@/components/ProductCard';
import { ProductModal } from '@/components/ProductModal';
import { produtoService } from '@/services/produtoService';
import type { Peca } from '@/types';
import { DESTAQUES } from '@/data';
import { lerHistoricoVisualizacao, observarHistorico, recomendarPecas } from '@/services/recomendacaoService';
import { useFavoritos } from '@/store/favoritosStore';

export default function HomePage() {
  const router = useRouter();
  const [catalogo, setCatalogo] = useState<Peca[] | null>(null);
  const destaques = catalogo?.slice(0, 4) ?? null;
  const [historicoIds, setHistoricoIds] = useState<string[]>(() => lerHistoricoVisualizacao());
  const [pecaSelecionada, setPecaSelecionada] = useState<Peca | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const favoritos = useFavoritos();

  useEffect(() => {
    void produtoService.getProdutos().then(res => setCatalogo(res.success ? (res.data ?? []) : []));
  }, []);

  useEffect(() => {
    return observarHistorico(() => setHistoricoIds(lerHistoricoVisualizacao()));
  }, []);

  const recomendadas = useMemo(() => {
    if (!catalogo) return [];
    const favoritosIds = catalogo.filter(peca => favoritos.ehFavorito(peca.id)).map(peca => peca.id);
    return recomendarPecas(catalogo, historicoIds, favoritosIds, destaques?.map(peca => peca.id) ?? []);
  }, [catalogo, destaques, favoritos, historicoIds]);

  const abrirDetalhe = (peca: Peca) => {
    setPecaSelecionada(peca);
    onOpen();
  };

  return (
    <Box
      minH="100vh"
      bgImage="linear-gradient(rgba(23, 20, 18, 0.72), rgba(23, 20, 18, 0.47)), url('/bg-vitrine.png')"
      bgSize="cover"
      bgPosition="center"
      bgAttachment="fixed"
      color="white"
    >
      <Navbar />
      <Box as="main" px={{ base: 4, md: 8 }} pt={{ base: 12, md: 20 }} pb={16}>
        <Box maxW="1200px" mx="auto">
          <Flex direction={{ base: 'column', md: 'row' }} align="center" justify="space-between" gap={10}>
            <VStack align="flex-start" spacing={5} maxW="650px">
              <Badge color="terra.500" bg="whiteAlpha.100" px={3} py={1} borderRadius="full">ARTE E TRADIÇÃO PERNAMBUCANA</Badge>
              <Heading as="h1" size={{ base: '2xl', md: '4xl' }} lineHeight="1.15">Histórias feitas à mão. Peças feitas para durar.</Heading>
              <Text fontSize={{ base: 'md', md: 'lg' }} color="#E8DFD7">Explore o artesanato de Pernambuco, conheça quem cria cada peça e encontre algo único para sua casa.</Text>
              <Flex gap={3} wrap="wrap">
                <Button bg="terra.500" color="black" _hover={{ bg: 'terra.600' }} onClick={() => router.push('/vitrine')}>Explorar a vitrine</Button>
                <Button variant="outline" color="white" onClick={() => router.push('/produtos')}>Ver catálogo completo</Button>
              </Flex>
            </VStack>
            <Box w="full" maxW="420px" p={6} borderRadius="2xl" bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200">
              <Text color="terra.500" fontSize="sm" mb={2}>PONTO DA TERRA</Text>
              <Heading size="md" mb={3}>Do Agreste ao Sertão</Heading>
              <Text color="#E8DFD7">Cerâmica, madeira, renda, palha e xilogravura reunidas em um só lugar.</Text>
            </Box>
          </Flex>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={{ base: 12, md: 20 }}>
            {DESTAQUES.map(item => <Box key={item.titulo} p={5} borderRadius="xl" bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"><Heading size="sm" color="terra.500" mb={2}>{item.titulo}</Heading><Text color="#E8DFD7">{item.texto}</Text></Box>)}
          </SimpleGrid>
        </Box>
      </Box>
      <Box maxW="1200px" mx="auto" px={{ base: 4, md: 8 }} py={12}>
        <Flex justify="space-between" align="center" gap={4} mb={6} wrap="wrap">
          <Box><Heading size="lg">Peças em destaque</Heading><Text color="#E8DFD7" mt={2}>Uma amostra do que você encontra na vitrine.</Text></Box>
          <Button variant="outline" color="white" onClick={() => router.push('/vitrine')}>Ver todas</Button>
        </Flex>
        {destaques === null ? (
          <Flex justify="center" py={10}><Spinner color="terra.500" /></Flex>
        ) : destaques.length ? (
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={5}>
            {destaques.map(peca => <ProductCard key={peca.id} peca={peca} />)}
          </SimpleGrid>
        ) : (
          <Text color="#E8DFD7">Não foi possível carregar as peças agora. Tente novamente em instantes.</Text>
        )}
      </Box>
      {destaques?.length && recomendadas.length > 0 && (
        <Box maxW="1200px" mx="auto" w="100%" px={{ base: 4, md: 8 }} pb={16}>
          <Flex justify="space-between" align="center" gap={4} mb={6} wrap="wrap">
            <Heading size="lg">Feitas para você</Heading>
            <Button variant="outline" color="white" onClick={() => router.push('/produtos')}>Explorar catálogo</Button>
          </Flex>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={5}>
            {recomendadas.map(peca => <ProductCard key={peca.id} peca={peca} onSelect={abrirDetalhe} />)}
          </SimpleGrid>
        </Box>
      )}
      <ProductModal peca={pecaSelecionada} isOpen={isOpen} onClose={onClose} />
    </Box>
  );
}
