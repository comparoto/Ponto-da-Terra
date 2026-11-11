'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge, Box, Button, Flex, Heading, HStack, Image, SimpleGrid, Spinner, Text, VStack, Wrap, WrapItem, useDisclosure } from '@chakra-ui/react';
import { Navbar } from '@/components/Navbar';
import { ProductCard } from '@/components/ProductCard';
import { ProductModal } from '@/components/ProductModal';
import { Estrelas } from '@/components/ui';
import { useCarregar } from '@/hooks/useCarregar';
import { artesaoService } from '@/services/artesaoService';
import type { Peca } from '@/types';

/** HU3 / TC11: perfil público do artesão — biografia, fotos do ateliê, polo, técnicas e peças ativas. */
export default function PerfilArtesaoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { dados: artesao, erro, carregando } = useCarregar(() => artesaoService.getArtesaoById(id), [id]);
  const [pecaSelecionada, setPecaSelecionada] = useState<Peca | null>(null);
  const modal = useDisclosure();

  return (
    <Box minH="100vh" bgImage="linear-gradient(rgba(23, 20, 18, 0.82), rgba(23, 20, 18, 0.7)), url('/bg-vitrine.png')" bgSize="cover" bgAttachment="fixed" color="white">
      <Navbar />
      <Box maxW="1200px" mx="auto" p={{ base: 4, md: 8 }}>
        {carregando ? (
          <Flex justify="center" py={20}>
            <Spinner color="terra.500" size="xl" />
          </Flex>
        ) : erro || !artesao ? (
          <VStack py={20} spacing={4}>
            <Text>{erro ?? 'Artesão não encontrado.'}</Text>
            <Button onClick={() => router.push('/vitrine')}>Voltar à vitrine</Button>
          </VStack>
        ) : (
          <>
            <Box borderRadius="2xl" overflow="hidden" bg="blackAlpha.700" border="1px solid" borderColor="whiteAlpha.200" mb={8}>
              {artesao.fotoAtelieUrl && <Image src={artesao.fotoAtelieUrl} alt={`Oficina de ${artesao.nome}`} w="100%" h={{ base: '160px', md: '240px' }} objectFit="cover" />}
              <Flex direction={{ base: 'column', md: 'row' }} gap={6} p={{ base: 5, md: 8 }} align={{ base: 'center', md: 'flex-start' }}>
                <Image
                  src={artesao.imagemUrl}
                  alt={artesao.nome}
                  boxSize={{ base: '120px', md: '150px' }}
                  borderRadius="full"
                  objectFit="cover"
                  border="4px solid"
                  borderColor="terra.500"
                  mt={artesao.fotoAtelieUrl ? { md: '-80px' } : 0}
                  bg="#2C2724"
                  fallbackSrc="https://cdn-icons-png.flaticon.com/512/12225/12225881.png"
                />
                <Box flex="1" textAlign={{ base: 'center', md: 'left' }}>
                  <Text color="terra.500" fontSize="sm" fontWeight="bold" textTransform="uppercase">
                    {artesao.nomeAtelie ?? 'Ateliê'}
                  </Text>
                  <Heading size="xl" fontFamily="heading">
                    {artesao.nome}
                  </Heading>
                  <Text color="whiteAlpha.800" mt={1}>
                    {artesao.cidade} - {artesao.estado}
                    {artesao.poloRegional ? ` · Polo ${artesao.poloRegional}` : ''}
                  </Text>
                  {artesao.avaliacaoMedia ? (
                    <HStack mt={2} justify={{ base: 'center', md: 'flex-start' }}>
                      <Estrelas nota={artesao.avaliacaoMedia} />
                      <Text fontSize="sm" color="whiteAlpha.700">
                        {artesao.avaliacaoMedia.toFixed(1)} de 5
                      </Text>
                    </HStack>
                  ) : null}
                  {(artesao.tecnicasPrincipais?.length ?? 0) > 0 && (
                    <Wrap mt={3} justify={{ base: 'center', md: 'flex-start' }}>
                      {artesao.tecnicasPrincipais!.map(t => (
                        <WrapItem key={t}>
                          <Badge colorScheme="orange" variant="outline" px={2} py={1} borderRadius="full">
                            {t}
                          </Badge>
                        </WrapItem>
                      ))}
                    </Wrap>
                  )}
                  {/* TC11: sem biografia, a seção some sem quebrar o layout */}
                  {artesao.biografia && (
                    <Text mt={4} color="#E8DFD7" lineHeight="1.7" maxW="760px">
                      {artesao.biografia}
                    </Text>
                  )}
                </Box>
              </Flex>
            </Box>

            <Heading size="lg" mb={4} fontFamily="heading">
              Peças de {artesao.nome.split(' ')[0]} ({artesao.produtos.length})
            </Heading>
            {artesao.produtos.length ? (
              <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
                {artesao.produtos.map(p => (
                  <ProductCard
                    key={p.id}
                    peca={p}
                    onSelect={peca => {
                      setPecaSelecionada(peca);
                      modal.onOpen();
                    }}
                  />
                ))}
              </SimpleGrid>
            ) : (
              <Text color="whiteAlpha.700">Este artesão ainda não tem peças publicadas.</Text>
            )}
          </>
        )}
      </Box>
      <ProductModal peca={pecaSelecionada} isOpen={modal.isOpen} onClose={modal.onClose} />
    </Box>
  );
}
