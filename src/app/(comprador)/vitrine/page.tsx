'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Flex,
  SimpleGrid,
  Text,
  Image,
  Heading,
  Spinner,
  IconButton,
  Icon,
  Button,
  Badge,
  HStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { ProductModal } from '@/components/ProductModal';
import { Artesao, Peca } from '@/types';
import { artesaoService } from '@/services/artesaoService';
import { produtoService, CATEGORIAS } from '@/services/produtoService';
import { useCart } from '@/store/cartStore';

const FilterIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </Icon>
);

const ArrowRightIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </Icon>
);

const ShoppingBagIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </Icon>
);

export default function VitrinePage() {
  const router = useRouter();
  const { adicionarAoCarrinho } = useCart();

  const [artesaos, setArtesaos] = useState<Artesao[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Artesão selecionado para filtro rápido
  const [artesaoSelecionado, setArtesaoSelecionado] = useState<string | null>(null);

  // Peça selecionada para o modal de detalhes
  const [pecaDetalhe, setPecaDetalhe] = useState<Peca | null>(null);
  const { isOpen: isModalOpen, onOpen: openModal, onClose: closeModal } = useDisclosure();

  // Modal com todos os artesãos
  const {
    isOpen: isArtesaosModalOpen,
    onOpen: openArtesaosModal,
    onClose: closeArtesaosModal,
  } = useDisclosure();

  useEffect(() => {
    Promise.all([artesaoService.getArtesaos(), produtoService.getProdutos()]).then(
      ([artesaosData, pecasData]) => {
        setArtesaos(artesaosData);
        setPecas(pecasData);
        setIsLoading(false);
      }
    );
  }, []);

  const handleSelectPeca = (peca: Peca) => {
    setPecaDetalhe(peca);
    openModal();
  };

  const handleFiltrarPorArtesao = (artId: string) => {
    if (artesaoSelecionado === artId) {
      setArtesaoSelecionado(null);
    } else {
      setArtesaoSelecionado(artId);
    }
  };

  // Peças filtradas ou limitadas para a exibição na Vitrine
  const pecasExibidas = artesaoSelecionado
    ? pecas.filter(p => p.artesaoId === artesaoSelecionado)
    : pecas.slice(0, 6);

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
        <Flex justify="center" align="center" flex="1" minH="60vh">
          <Spinner size="xl" color="terra.500" thickness="4px" />
        </Flex>
      ) : (
        <Flex direction="column" flex="1" justify="space-between">
          <Box maxW="1280px" w="100%" mx="auto" px={{ base: 4, md: 8 }} py={6}>
            {/* Banner Introdutório / Hero da Vitrine */}
            <Box
              bg="blackAlpha.700"
              backdropFilter="blur(14px)"
              borderRadius="2xl"
              p={{ base: 6, md: 8 }}
              border="1px solid"
              borderColor="whiteAlpha.200"
              mb={8}
            >
              <Flex
                direction={{ base: 'column', md: 'row' }}
                justify="space-between"
                align={{ base: 'flex-start', md: 'center' }}
                gap={6}
              >
                <Box maxW="xl">
                  <Badge
                    bg="terra.500"
                    color="black"
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontWeight="bold"
                    fontSize="xs"
                    mb={3}
                  >
                    ARTE & TRADIÇÃO PERNAMBUCANA
                  </Badge>
                  <Heading
                    as="h2"
                    size="xl"
                    fontFamily="heading"
                    fontWeight="normal"
                    color="white"
                    mb={3}
                    lineHeight="1.2"
                  >
                    Descubra o autêntico trabalho feito à mão pelos mestres de Pernambuco
                  </Heading>
                  <Text fontSize="md" color="whiteAlpha.800">
                    Obras exclusivas do Agreste ao Sertão: barro, cerâmica, renda renascença, xilogravura e cestaria tradicional.
                  </Text>
                </Box>

                <Button
                  rightIcon={<ArrowRightIcon />}
                  bg="terra.500"
                  color="black"
                  size="lg"
                  _hover={{ bg: 'terra.600', transform: 'translateX(4px)' }}
                  transition="all 0.2s"
                  onClick={() => router.push('/produtos')}
                  whiteSpace="normal"
                  textAlign="center"
                >
                  Ver Catálogo Completo
                </Button>
              </Flex>

              {/* Categorias Rápidas */}
              <Flex wrap="wrap" gap={2} mt={6} pt={4} borderTop="1px solid" borderColor="whiteAlpha.200">
                <Text fontSize="sm" color="whiteAlpha.600" alignSelf="center" mr={2}>
                  Categorias em alta:
                </Text>
                {CATEGORIAS.filter(c => c !== 'Todas').map(cat => (
                  <Button
                    key={cat}
                    size="xs"
                    variant="outline"
                    borderColor="whiteAlpha.300"
                    color="white"
                    borderRadius="full"
                    _hover={{ bg: 'terra.500', color: 'black', borderColor: 'terra.500' }}
                    onClick={() => router.push(`/produtos?categoria=${encodeURIComponent(cat)}`)}
                  >
                    {cat}
                  </Button>
                ))}
              </Flex>
            </Box>

            {/* SEÇÃO PRINCIPAL COM OS DOIS PAINÉIS ORIGINAIS (ARTESÃOS E PEÇAS) */}
            <Flex
              direction={{ base: 'column', lg: 'row' }}
              gap={8}
              justify="center"
              w="100%"
              alignItems="stretch"
            >
              {/* PAINEL DE ARTESÃOS */}
              <Box
                id="artistas"
                flex={{ base: '1', lg: '5' }}
                bg="blackAlpha.700"
                p={{ base: 5, md: 6 }}
                borderRadius="xl"
                backdropFilter="blur(12px)"
                border="1px solid"
                borderColor="whiteAlpha.200"
                color="white"
                display="flex"
                flexDirection="column"
              >
                <Flex justify="space-between" align="center" mb={6}>
                  <Flex align="center" gap={3}>
                    <IconButton
                      aria-label="Filtrar artesãos"
                      icon={<FilterIcon />}
                      size="md"
                      bg="whiteAlpha.200"
                      _hover={{ bg: 'whiteAlpha.400' }}
                      color="white"
                      onClick={openArtesaosModal}
                    />
                    <Heading size="xl" fontFamily="heading" fontWeight="normal">
                      Artesãos e Artesãs
                    </Heading>
                  </Flex>
                  <Text
                    fontSize="sm"
                    color="whiteAlpha.800"
                    cursor="pointer"
                    _hover={{ color: 'terra.500', textDecoration: 'underline' }}
                    onClick={openArtesaosModal}
                  >
                    Ver todos ({artesaos.length})
                  </Text>
                </Flex>

                {artesaoSelecionado && (
                  <Flex
                    bg="terra.500"
                    color="black"
                    px={3}
                    py={1.5}
                    borderRadius="md"
                    mb={4}
                    justify="space-between"
                    align="center"
                    fontSize="xs"
                    fontWeight="semibold"
                  >
                    <Text>
                      Filtrando por artesão: {artesaos.find(a => a.id === artesaoSelecionado)?.nome}
                    </Text>
                    <Button
                      size="xs"
                      variant="ghost"
                      color="black"
                      _hover={{ bg: 'blackAlpha.200' }}
                      onClick={() => setArtesaoSelecionado(null)}
                    >
                      Remover filtro
                    </Button>
                  </Flex>
                )}

                <SimpleGrid columns={{ base: 2, sm: 2 }} spacingY={8} spacingX={4} flex="1">
                  {artesaos.map(art => {
                    const isSelected = artesaoSelecionado === art.id;
                    return (
                      <Flex
                        key={art.id}
                        direction="column"
                        align="center"
                        cursor="pointer"
                        p={3}
                        borderRadius="lg"
                        transition="all 0.25s"
                        bg={isSelected ? 'whiteAlpha.200' : 'transparent'}
                        _hover={{ bg: 'whiteAlpha.200', transform: 'scale(1.02)' }}
                        onClick={() => handleFiltrarPorArtesao(art.id)}
                        role="group"
                      >
                        <Box
                          p={1}
                          borderRadius="full"
                          border="3px solid"
                          borderColor={isSelected ? 'terra.500' : 'terra.600'}
                          boxShadow={isSelected ? '0 0 14px rgba(217, 181, 150, 0.6)' : 'none'}
                          mb={3}
                        >
                          <Image
                            src={art.imagemUrl}
                            alt={art.nome}
                            boxSize={{ base: '90px', md: '110px' }}
                            borderRadius="full"
                            objectFit="cover"
                            fallbackSrc="https://cdn-icons-png.flaticon.com/512/12225/12225881.png"
                          />
                        </Box>
                        <Text
                          fontSize="md"
                          fontWeight="medium"
                          mb={1}
                          textAlign="center"
                          color={isSelected ? 'terra.500' : 'white'}
                        >
                          {art.nome}
                        </Text>
                        <Text fontSize="xs" color="whiteAlpha.700" textAlign="center">
                          {art.cidade} - {art.estado}
                        </Text>
                        {art.especialidade && (
                          <Badge
                            mt={1.5}
                            bg="blackAlpha.600"
                            color="terra.500"
                            border="1px solid"
                            borderColor="terra.500"
                            fontSize="2xs"
                            borderRadius="full"
                          >
                            {art.especialidade}
                          </Badge>
                        )}
                      </Flex>
                    );
                  })}
                </SimpleGrid>
              </Box>

              {/* PAINEL DE PEÇAS */}
              <Box
                flex={{ base: '1', lg: '7' }}
                bg="blackAlpha.700"
                p={{ base: 5, md: 6 }}
                borderRadius="xl"
                backdropFilter="blur(12px)"
                border="1px solid"
                borderColor="whiteAlpha.200"
                color="white"
                display="flex"
                flexDirection="column"
              >
                <Flex justify="space-between" align="center" mb={6}>
                  <Flex align="center" gap={3}>
                    <IconButton
                      aria-label="Filtrar peças"
                      icon={<FilterIcon />}
                      size="md"
                      bg="whiteAlpha.200"
                      _hover={{ bg: 'whiteAlpha.400' }}
                      color="white"
                      onClick={() => router.push('/produtos')}
                    />
                    <Heading size="xl" fontFamily="heading" fontWeight="normal">
                      Peças em Destaque
                    </Heading>
                  </Flex>
                  <Text
                    fontSize="sm"
                    color="whiteAlpha.800"
                    cursor="pointer"
                    _hover={{ color: 'terra.500', textDecoration: 'underline' }}
                    onClick={() => router.push('/produtos')}
                  >
                    Ver catálogo completo ({pecas.length})
                  </Text>
                </Flex>

                {pecasExibidas.length === 0 ? (
                  <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    p={8}
                    bg="whiteAlpha.100"
                    borderRadius="lg"
                  >
                    <Text fontSize="md" color="whiteAlpha.800" mb={2}>
                      Nenhuma peça encontrada para este artesão no momento.
                    </Text>
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="terra.500"
                      color="terra.500"
                      onClick={() => setArtesaoSelecionado(null)}
                    >
                      Limpar filtro
                    </Button>
                  </Flex>
                ) : (
                  <SimpleGrid columns={{ base: 1, sm: 2, md: 2, xl: 3 }} spacing={5} flex="1">
                    {pecasExibidas.map(peca => (
                      <Flex
                        key={peca.id}
                        direction="column"
                        bg="whiteAlpha.300"
                        p={3.5}
                        borderRadius="lg"
                        transition="all 0.25s"
                        _hover={{
                          bg: 'whiteAlpha.400',
                          transform: 'translateY(-3px)',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                        }}
                        position="relative"
                        role="group"
                      >
                        <Box
                          position="relative"
                          h="160px"
                          w="100%"
                          overflow="hidden"
                          borderRadius="md"
                          mb={3}
                          cursor="pointer"
                          onClick={() => handleSelectPeca(peca)}
                        >
                          <Image
                            src={peca.imagemUrl}
                            alt={peca.nome}
                            h="100%"
                            w="100%"
                            objectFit="cover"
                            transition="transform 0.3s"
                            _groupHover={{ transform: 'scale(1.05)' }}
                            fallbackSrc="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80"
                          />
                          {peca.categoria && (
                            <Badge
                              position="absolute"
                              top={2}
                              left={2}
                              bg="blackAlpha.800"
                              color="terra.500"
                              fontSize="2xs"
                              borderRadius="full"
                              px={2}
                              py={0.5}
                            >
                              {peca.categoria}
                            </Badge>
                          )}
                        </Box>

                        <Text
                          fontSize="sm"
                          fontWeight="bold"
                          color="terra.500"
                          mb={1}
                        >
                          R$ {peca.preco.toFixed(2).replace('.', ',')}
                        </Text>

                        <Text
                          fontSize="sm"
                          fontWeight="medium"
                          color="whiteAlpha.900"
                          noOfLines={1}
                          mb={3}
                          cursor="pointer"
                          _hover={{ color: 'terra.500' }}
                          onClick={() => handleSelectPeca(peca)}
                        >
                          {peca.nome}
                        </Text>

                        {/* Ações rápidas */}
                        <HStack spacing={2} mt="auto">
                          <Button
                            size="xs"
                            variant="outline"
                            borderColor="whiteAlpha.400"
                            color="white"
                            _hover={{ bg: 'whiteAlpha.200' }}
                            flex="1"
                            onClick={() => handleSelectPeca(peca)}
                          >
                            Detalhes
                          </Button>
                          <IconButton
                            aria-label="Adicionar à sacola"
                            icon={<ShoppingBagIcon />}
                            size="xs"
                            bg="terra.500"
                            color="black"
                            _hover={{ bg: 'terra.600' }}
                            onClick={() => adicionarAoCarrinho(peca, 1)}
                          />
                        </HStack>
                      </Flex>
                    ))}
                  </SimpleGrid>
                )}

                <Flex justify="center" mt={6} pt={4} borderTop="1px solid" borderColor="whiteAlpha.200">
                  <Button
                    bg="terra.500"
                    color="black"
                    _hover={{ bg: 'terra.600' }}
                    size="md"
                    rightIcon={<ArrowRightIcon />}
                    onClick={() => router.push('/produtos')}
                  >
                    Ver todas as {pecas.length} peças do acervo
                  </Button>
                </Flex>
              </Box>
            </Flex>
          </Box>

          {/* Rodapé Padrão */}
          <Box borderTop="1px solid" borderColor="whiteAlpha.200" bg="blackAlpha.800" py={6} mt={12}>
            <Flex
              direction={{ base: 'column', md: 'row' }}
              justify="space-between"
              align="center"
              maxW="1200px"
              mx="auto"
              px={8}
              gap={4}
            >
              <Flex align="center" gap={3}>
                <Image src="/logo.png" alt="Logo" h="30px" objectFit="contain" />
                <Text fontSize="sm" color="whiteAlpha.800">
                  Valorizando a cultura e os artesãos pernambucanos
                </Text>
              </Flex>
              <Text fontSize="sm" color="whiteAlpha.600">
                © Ponto da Terra 2026. Todos os direitos reservados.
              </Text>
            </Flex>
          </Box>
        </Flex>
      )}

      {/* Modal de Detalhes da Peça */}
      <ProductModal peca={pecaDetalhe} isOpen={isModalOpen} onClose={closeModal} />

      {/* Modal de Todos os Artesãos */}
      <Modal isOpen={isArtesaosModalOpen} onClose={closeArtesaosModal} size="xl" isCentered>
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(8px)" />
        <ModalContent bg="#1C1816" color="white" borderRadius="xl" border="1px solid" borderColor="whiteAlpha.300">
          <ModalHeader fontFamily="heading" borderBottomWidth="1px" borderColor="whiteAlpha.200">
            Nossos Artesãos e Artesãs
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={6}>
              {artesaos.map(art => (
                <Flex
                  key={art.id}
                  gap={4}
                  p={3}
                  bg="whiteAlpha.100"
                  borderRadius="lg"
                  cursor="pointer"
                  _hover={{ bg: 'whiteAlpha.200' }}
                  onClick={() => {
                    setArtesaoSelecionado(art.id);
                    closeArtesaosModal();
                  }}
                >
                  <Box p={0.5} borderRadius="full" border="2px solid" borderColor="terra.500" alignSelf="center">
                    <Image
                      src={art.imagemUrl}
                      boxSize="60px"
                      borderRadius="full"
                      objectFit="cover"
                      fallbackSrc="https://cdn-icons-png.flaticon.com/512/12225/12225881.png"
                    />
                  </Box>
                  <Box flex="1">
                    <Text fontWeight="semibold" fontSize="sm" color="terra.500">
                      {art.nome}
                    </Text>
                    <Text fontSize="xs" color="whiteAlpha.700" mb={1}>
                      {art.cidade} - {art.estado}
                    </Text>
                    <Text fontSize="xs" color="whiteAlpha.600" noOfLines={2}>
                      {art.biografia}
                    </Text>
                  </Box>
                </Flex>
              ))}
            </SimpleGrid>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}