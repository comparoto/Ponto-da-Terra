'use client';

import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Image,
  Box,
  Flex,
  Heading,
  Text,
  Badge,
  Button,
  HStack,
  IconButton,
  Divider,
  Icon,
} from '@chakra-ui/react';
import { Peca } from '@/types';
import { useCart } from '@/store/cartStore';

interface ProductModalProps {
  peca: Peca | null;
  isOpen: boolean;
  onClose: () => void;
}

const CartAddIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </Icon>
);

const CheckIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </Icon>
);

export function ProductModal({ peca, isOpen, onClose }: ProductModalProps) {
  const [quantidade, setQuantidade] = useState(1);
  const [adicionado, setAdicionado] = useState(false);
  const { adicionarAoCarrinho } = useCart();

  if (!peca) return null;

  const handleAddToCart = () => {
    adicionarAoCarrinho(peca, quantidade);
    setAdicionado(true);
    setTimeout(() => {
      setAdicionado(false);
      onClose();
    }, 800);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered>
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(8px)" />
      <ModalContent
        bg="#1C1816"
        color="white"
        borderRadius="2xl"
        border="1px solid"
        borderColor="whiteAlpha.300"
        overflow="hidden"
        p={0}
      >
        <ModalCloseButton color="white" zIndex={10} top={4} right={4} />

        <ModalBody p={0}>
          <Flex direction={{ base: 'column', md: 'row' }}>
            {/* Foto da Peça */}
            <Box w={{ base: '100%', md: '50%' }} h={{ base: '260px', md: '440px' }} position="relative">
              <Image
                src={peca.imagemUrl}
                alt={peca.nome}
                w="100%"
                h="100%"
                objectFit="cover"
              />
              {peca.categoria && (
                <Badge
                  position="absolute"
                  top={4}
                  left={4}
                  bg="blackAlpha.800"
                  color="terra.500"
                  border="1px solid"
                  borderColor="terra.500"
                  borderRadius="full"
                  px={3}
                  py={1}
                  fontSize="xs"
                >
                  {peca.categoria}
                </Badge>
              )}
            </Box>

            {/* Informações da Peça */}
            <Flex
              direction="column"
              w={{ base: '100%', md: '50%' }}
              p={6}
              justify="space-between"
            >
              <Box>
                {peca.artesaoNome && (
                  <Text fontSize="sm" color="terra.500" fontWeight="medium" mb={1}>
                    Artesão: {peca.artesaoNome}
                    {peca.artesaoCidade ? ` (${peca.artesaoCidade})` : ''}
                  </Text>
                )}

                <Heading as="h3" size="lg" fontFamily="heading" mb={3} lineHeight="1.2">
                  {peca.nome}
                </Heading>

                <Text fontSize="2xl" fontWeight="bold" color="terra.500" mb={4}>
                  R$ {peca.preco.toFixed(2).replace('.', ',')}
                </Text>

                <Text fontSize="sm" color="whiteAlpha.800" mb={4} lineHeight="1.6">
                  {peca.descricao || 'Peça artesanal exclusiva produzida com saberes tradicionais da cultura pernambucana.'}
                </Text>

                <Divider borderColor="whiteAlpha.200" mb={4} />

                {peca.dimensoes && (
                  <Flex justify="space-between" fontSize="xs" color="whiteAlpha.700" mb={1.5}>
                    <Text fontWeight="semibold">Dimensões:</Text>
                    <Text>{peca.dimensoes}</Text>
                  </Flex>
                )}

                {peca.material && (
                  <Flex justify="space-between" fontSize="xs" color="whiteAlpha.700" mb={3}>
                    <Text fontWeight="semibold">Material:</Text>
                    <Text>{peca.material}</Text>
                  </Flex>
                )}
              </Box>

              {/* Controles de Quantidade e Compra */}
              <Box mt={4} pt={4} borderTop="1px solid" borderColor="whiteAlpha.200">
                <Flex align="center" justify="space-between" mb={4}>
                  <Text fontSize="sm" color="whiteAlpha.800">
                    Quantidade:
                  </Text>
                  <HStack spacing={2}>
                    <IconButton
                      aria-label="Diminuir"
                      size="sm"
                      variant="outline"
                      borderColor="whiteAlpha.300"
                      color="white"
                      _hover={{ bg: 'whiteAlpha.200' }}
                      onClick={() => setQuantidade(prev => Math.max(1, prev - 1))}
                    >
                      -
                    </IconButton>
                    <Text fontWeight="bold" px={2} minW="24px" textAlign="center">
                      {quantidade}
                    </Text>
                    <IconButton
                      aria-label="Aumentar"
                      size="sm"
                      variant="outline"
                      borderColor="whiteAlpha.300"
                      color="white"
                      _hover={{ bg: 'whiteAlpha.200' }}
                      onClick={() => setQuantidade(prev => prev + 1)}
                    >
                      +
                    </IconButton>
                  </HStack>
                </Flex>

                <Button
                  w="100%"
                  bg={adicionado ? 'green.500' : 'terra.500'}
                  color={adicionado ? 'white' : 'black'}
                  _hover={{ bg: adicionado ? 'green.600' : 'terra.600' }}
                  leftIcon={adicionado ? <CheckIcon /> : <CartAddIcon />}
                  fontWeight="bold"
                  size="md"
                  onClick={handleAddToCart}
                >
                  {adicionado ? 'Adicionado com sucesso!' : `Adicionar à Sacola • R$ ${(peca.preco * quantidade).toFixed(2).replace('.', ',')}`}
                </Button>
              </Box>
            </Flex>
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
