'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Image,
  Text,
  Badge,
  Flex,
  Button,
  IconButton,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import { Peca } from '@/types';
import { useCart } from '@/store/cartStore';
import { readSession } from '@/services/demoAuth';

interface ProductCardProps {
  peca: Peca;
  onSelect?: (peca: Peca) => void;
}

const CartAddIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </Icon>
);

const EyeIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </Icon>
);

export function ProductCard({ peca, onSelect }: ProductCardProps) {
  const { adicionarAoCarrinho } = useCart();
  const [canBuy, setCanBuy] = useState(true);
  useEffect(() => { const session = readSession(); setCanBuy(!session || session.role === 'comprador'); }, []);

  return (
    <Box
      bg="blackAlpha.700"
      backdropFilter="blur(12px)"
      borderRadius="xl"
      overflow="hidden"
      border="1px solid"
      borderColor="whiteAlpha.200"
      transition="all 0.3s ease"
      _hover={{
        transform: 'translateY(-4px)',
        borderColor: 'terra.500',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.45)',
      }}
      display="flex"
      flexDirection="column"
      h="100%"
      position="relative"
      role="group"
    >
      {/* Contêiner da Imagem */}
      <Box position="relative" h="160px" w="100%" overflow="hidden" bg="blackAlpha.400">
        <Image
          src={peca.imagemUrl}
          alt={peca.nome}
          w="100%"
          h="100%"
          objectFit="cover"
          transition="transform 0.4s ease"
          _groupHover={{ transform: 'scale(1.06)' }}
          fallbackSrc="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80"
        />

        {/* Badge da Categoria */}
        {peca.categoria && (
          <Badge
            position="absolute"
            top={3}
            left={3}
            bg="blackAlpha.800"
            color="terra.500"
            border="1px solid"
            borderColor="terra.500"
            borderRadius="full"
            px={2.5}
            py={0.5}
            fontSize="xs"
            textTransform="none"
            backdropFilter="blur(4px)"
          >
            {peca.categoria}
          </Badge>
        )}

        {/* Botão de Ver Detalhes Rápido */}
        {onSelect && (
          <Tooltip label="Ver detalhes rápidos" placement="top" hasArrow>
            <IconButton
              aria-label="Ver detalhes da peça"
              icon={<EyeIcon />}
              size="sm"
              position="absolute"
              top={3}
              right={3}
              bg="blackAlpha.800"
              color="white"
              borderRadius="full"
              opacity={{ base: 1, md: 0 }}
              _groupHover={{ opacity: 1 }}
              transition="opacity 0.2s"
              _hover={{ bg: 'terra.500', color: 'black' }}
              onClick={() => onSelect(peca)}
            />
          </Tooltip>
        )}
      </Box>

      {/* Conteúdo do Card */}
      <Flex direction="column" p={3} flex="1" justify="space-between" gap={2}>
        <Box>
          {peca.artesaoNome && (
            <Text fontSize="xs" color="terra.500" fontWeight="medium" mb={1} noOfLines={1}>
              Por {peca.artesaoNome}
              {peca.artesaoCidade ? ` • ${peca.artesaoCidade}` : ''}
            </Text>
          )}

          <Text
            fontSize="md"
            fontWeight="medium"
            color="whiteAlpha.900"
            lineHeight="1.3"
            noOfLines={2}
            title={peca.nome}
            cursor="pointer"
            _hover={{ color: 'terra.500' }}
            onClick={() => onSelect && onSelect(peca)}
          >
            {peca.nome}
          </Text>
        </Box>

        {/* Preço e Ações */}
        <Flex align="center" justify="space-between" pt={2} borderTop="1px solid" borderColor="whiteAlpha.100">
          <Box>
            <Text fontSize="xs" color="whiteAlpha.600">
              Valor da peça
            </Text>
            <Text fontSize="lg" fontWeight="bold" color="terra.500">
              R$ {peca.preco.toFixed(2).replace('.', ',')}
            </Text>
          </Box>

          {canBuy ? (
            <Button size="sm" bg="terra.500" color="black" leftIcon={<CartAddIcon />} _hover={{ bg: 'terra.600', transform: 'scale(1.02)' }} _active={{ bg: 'terra.600' }} fontSize="xs" fontWeight="bold" borderRadius="md" px={3} onClick={() => adicionarAoCarrinho(peca, 1)}>
              Comprar
            </Button>
          ) : (
            <Text color="whiteAlpha.700" fontSize="xs" textAlign="right" maxW="100px">Compra exclusiva para compradores</Text>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}
