'use client';
import { useEffect, useState } from 'react';
import { Box, Flex, SimpleGrid, Text, Image, Heading, Spinner, IconButton, Icon, Button } from '@chakra-ui/react';
import { fakeApi } from '@/services/api';
import { Artesao, Peca } from '@/types';
import { Navbar } from '@/components/Navbar';
import { useCart } from '@/store/CartContext';

const FilterIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </Icon>
);

export default function VitrinePage() {
  const [artesaos, setArtesaos] = useState<Artesao[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { addToCart } = useCart();

  useEffect(() => {
    Promise.all([fakeApi.getArtesaos(), fakeApi.getPecas()]).then(([artesaosData, pecasData]) => {
      setArtesaos(artesaosData);
      setPecas(pecasData);
      setIsLoading(false);
    });
  }, []);

  return (
    <Box 
      minH="100vh" 
      bgImage="url('/bg-vitrine.png')" 
      bgSize="cover"
      bgPosition="center"
      bgAttachment="fixed"
      display="flex"
      flexDirection="column"
    >
      <Navbar />

      {isLoading ? (
        <Flex justify="center" align="center" flex="1">
          <Spinner size="xl" color="terra.500" />
        </Flex>
      ) : (
        <Flex direction="column" flex="1" justify="space-between">
          <Flex 
            direction={['column', 'column', 'row']} 
            p={8} 
            gap={8} 
            justify="center" 
            maxW="1200px" 
            w="100%"
            mx="auto"
            mt={8}
          >
            {/* PAINEL DE ARTESÃOS - Recuperado com as fotos redondas */}
            <Box 
              flex="1" 
              bg="blackAlpha.700" 
              p={6} 
              borderRadius="xl" 
              backdropFilter="blur(12px)"
              color="white"
            >
              <Flex justify="space-between" align="center" mb={8}>
                <Flex align="center" gap={3}>
                  <IconButton aria-label="Filtrar artesãos" icon={<FilterIcon />} size="md" bg="whiteAlpha.200" _hover={{ bg: "whiteAlpha.400" }} color="white" />
                  <Heading size="xl" fontFamily="heading" fontWeight="normal">Artesãos e Artesãs</Heading>
                </Flex>
                <Text fontSize="sm" color="whiteAlpha.800" cursor="pointer" _hover={{ color: "terra.500" }}>Ver mais</Text>
              </Flex>
              
              <SimpleGrid columns={2} spacingY={10} spacingX={4}>
                {artesaos.map(art => (
                  <Flex key={art.id} direction="column" align="center">
                    <Box p={1} borderRadius="full" border="3px solid" borderColor="terra.500" mb={3}>
                      <Image src={art.imagemUrl} boxSize="110px" borderRadius="full" objectFit="cover" />
                    </Box>
                    <Text fontSize="lg" fontWeight="medium" mb={1}>{art.nome}</Text>
                    <Text fontSize="sm" color="whiteAlpha.700">{art.cidade} - {art.estado}</Text>
                  </Flex>
                ))}
              </SimpleGrid>
            </Box>

            {/* PAINEL DE PEÇAS - Com o botão do Carrinho */}
            <Box 
              flex="1" 
              bg="blackAlpha.700" 
              p={6} 
              borderRadius="xl" 
              backdropFilter="blur(12px)"
              color="white"
            >
              <Flex justify="space-between" align="center" mb={8}>
                <Flex align="center" gap={3}>
                  <IconButton aria-label="Filtrar peças" icon={<FilterIcon />} size="md" bg="whiteAlpha.200" _hover={{ bg: "whiteAlpha.400" }} color="white" />
                  <Heading size="xl" fontFamily="heading" fontWeight="normal">Peças</Heading>
                </Flex>
                <Text fontSize="sm" color="whiteAlpha.800" cursor="pointer" _hover={{ color: "terra.500" }}>Ver mais</Text>
              </Flex>
              
              <SimpleGrid columns={2} spacing={6}>
                {pecas.map(peca => (
                  <Flex key={peca.id} direction="column" bg="whiteAlpha.300" p={4} borderRadius="lg" justify="space-between">
                    <Box>
                      <Image src={peca.imagemUrl} h="140px" w="100%" objectFit="cover" borderRadius="md" mb={4} />
                      <Text fontSize="sm" color="whiteAlpha.600" mb={1}>R$ {peca.preco.toFixed(2)}</Text>
                      <Text fontSize="md" fontWeight="medium" color="whiteAlpha.900" mb={4}>{peca.nome}</Text>
                    </Box>
                    <Button 
                      size="sm" 
                      w="100%" 
                      bg="whiteAlpha.200" 
                      color="white"
                      _hover={{ bg: 'terra.500', color: 'black' }}
                      onClick={() => addToCart(peca)}
                    >
                      Adicionar ao Carrinho
                    </Button>
                  </Flex>
                ))}
              </SimpleGrid>
            </Box>
          </Flex>

          <Text textAlign="center" fontSize="sm" color="whiteAlpha.600" py={4}>
            © Ponto da Terra 2026
          </Text>
        </Flex>
      )}
    </Box>
  );
}