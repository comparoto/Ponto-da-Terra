'use client';

import React, { useState } from 'react';
import {
  Flex,
  HStack,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Image,
  Icon,
  IconButton,
  Badge,
  Box,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/store/cartStore';
import { CartDrawer } from './CartDrawer';

const SearchIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </Icon>
);

const ShoppingBagIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </Icon>
);

export function Navbar() {
  const router = useRouter();
  const { totalItens, abrirCarrinho } = useCart();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      router.push(`/produtos?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <>
      <Flex
        w="100%"
        px={{ base: 4, md: 8 }}
        py={4}
        align="center"
        justify="space-between"
        bg="blackAlpha.700"
        color="white"
        backdropFilter="blur(10px)"
        position="sticky"
        top={0}
        zIndex={100}
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
      >
        {/* Logo clicável */}
        <Flex
          align="center"
          cursor="pointer"
          onClick={() => router.push('/vitrine')}
          transition="opacity 0.2s"
          _hover={{ opacity: 0.85 }}
        >
          <Image src="/logo.png" alt="Logo Ponto da Terra" h="40px" objectFit="contain" />
        </Flex>

        {/* Links Principais */}
        <HStack spacing={{ base: 4, lg: 8 }} fontSize="md" display={{ base: 'none', md: 'flex' }}>
          <Text
            cursor="pointer"
            transition="color 0.2s"
            _hover={{ color: 'terra.500' }}
            onClick={() => router.push('/vitrine')}
          >
            Vitrine
          </Text>
          <Text
            cursor="pointer"
            transition="color 0.2s"
            _hover={{ color: 'terra.500' }}
            onClick={() => router.push('/produtos')}
          >
            Peças & Catálogo
          </Text>
          <Text
            cursor="pointer"
            transition="color 0.2s"
            _hover={{ color: 'terra.500' }}
            onClick={() => {
              router.push('/vitrine#artistas');
            }}
          >
            Artesãos
          </Text>
        </HStack>

        {/* Campo de Busca */}
        <InputGroup w={{ base: '160px', sm: '220px', md: '260px' }} size="md">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="whiteAlpha.600" />
          </InputLeftElement>
          <Input
            placeholder="Pesquisar peças..."
            bg="whiteAlpha.300"
            border="none"
            borderRadius="full"
            _placeholder={{ color: 'whiteAlpha.600' }}
            _focus={{ bg: 'whiteAlpha.400', boxShadow: '0 0 0 1px #D9B596' }}
            color="white"
            px={10}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch}
          />
        </InputGroup>

        {/* Links secundários + Botão do Carrinho */}
        <HStack spacing={{ base: 2, md: 5 }}>
          <HStack spacing={6} fontSize="md" display={{ base: 'none', lg: 'flex' }}>
            <Text
              cursor="pointer"
              transition="color 0.2s"
              _hover={{ color: 'terra.500' }}
              onClick={() => alert('Em breve: página sobre a história do artesanato de Pernambuco!')}
            >
              Sobre
            </Text>
            <Text
              cursor="pointer"
              transition="color 0.2s"
              _hover={{ color: 'terra.500' }}
              onClick={() => alert('Dúvidas? Entre em contato pelo e-mail contato@pontodaterra.com.br')}
            >
              Contato
            </Text>
          </HStack>

          {/* Botão de Sacola / Carrinho com Contador */}
          <Box position="relative">
            <IconButton
              aria-label="Abrir sacola de compras"
              icon={<ShoppingBagIcon />}
              bg="whiteAlpha.200"
              color="white"
              _hover={{ bg: 'terra.500', color: 'black' }}
              borderRadius="full"
              size="md"
              onClick={abrirCarrinho}
            />
            {totalItens > 0 && (
              <Badge
                position="absolute"
                top="-4px"
                right="-4px"
                bg="terra.500"
                color="black"
                borderRadius="full"
                boxSize="20px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="xs"
                fontWeight="bold"
                border="2px solid"
                borderColor="#1C1816"
              >
                {totalItens}
              </Badge>
            )}
          </Box>
        </HStack>
      </Flex>

      {/* Gaveta do Carrinho */}
      <CartDrawer />
    </>
  );
}