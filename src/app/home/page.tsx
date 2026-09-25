'use client';
import { useRouter } from 'next/navigation';
import { Badge, Box, Button, Flex, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { Navbar } from '@/components/Navbar';
import { ProductCard } from '@/components/ProductCard';
import { PECAS_DATA } from '@/services/produtoService';

const destaques = [
  { titulo: 'Feito à mão', texto: 'Peças criadas por artesãos que mantêm vivas técnicas e saberes tradicionais.' },
  { titulo: 'De Pernambuco', texto: 'Conheça histórias e trabalhos de diferentes regiões do nosso estado.' },
  { titulo: 'Compra consciente', texto: 'Descubra criações autorais e encontre uma peça com significado.' },
];

export default function HomePage() {
  const router = useRouter();
  return (
    <Box
      minH="100vh"
      bgImage="linear-gradient(rgba(23, 20, 18, 0.72), rgba(23, 20, 18, 0.82)), url('/bg-vitrine.png')"
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
            {destaques.map(item => <Box key={item.titulo} p={5} borderRadius="xl" bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"><Heading size="sm" color="terra.500" mb={2}>{item.titulo}</Heading><Text color="#E8DFD7">{item.texto}</Text></Box>)}
          </SimpleGrid>
        </Box>
      </Box>
      <Box maxW="1200px" mx="auto" px={{ base: 4, md: 8 }} py={12}>
        <Flex justify="space-between" align="center" gap={4} mb={6} wrap="wrap">
          <Box><Heading size="lg">Peças em destaque</Heading><Text color="#E8DFD7" mt={2}>Uma amostra do que você encontra na vitrine.</Text></Box>
          <Button variant="outline" color="white" onClick={() => router.push('/vitrine')}>Ver todas</Button>
        </Flex>
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={5}>
          {PECAS_DATA.slice(0, 4).map(peca => <ProductCard key={peca.id} peca={peca} />)}
        </SimpleGrid>
      </Box>
    </Box>
  );
}
