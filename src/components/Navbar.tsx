'use client';
import { Flex, HStack, Text, Input, InputGroup, InputLeftElement, Image, Icon, useDisclosure, Box } from '@chakra-ui/react';
import { useCart } from '@/store/CartContext';
import { CartDrawer } from './CartDrawer'; // Importamos o Drawer que criámos

// Ícone de Lupa
const SearchIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </Icon>
);

// Ícone de Carrinho de Compras
const CartIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
  </Icon>
);

export function Navbar() {
  // Controle de abrir/fechar da gaveta
  const { isOpen, onOpen, onClose } = useDisclosure();
  // Puxar os itens do contexto
  const { items } = useCart();
  
  // Calcular a quantidade total de itens (somando a quantidade de cada um)
  const cartCount = items.reduce((acc, item) => acc + item.quantidade, 0);

  return (
    <>
      <Flex 
        w="100%" 
        px={8} 
        py={4} 
        align="center" 
        justify="space-between" 
        bg="blackAlpha.700" 
        color="white"
        backdropFilter="blur(10px)"
      >
        <Image src="/logo.png" alt="Logo" h="40px" objectFit="contain" />
        
        <HStack spacing={8} fontSize="md">
          <Text cursor="pointer" _hover={{ color: 'terra.500' }}>Sobre</Text>
          <Text cursor="pointer" _hover={{ color: 'terra.500' }}>Artistas</Text>
          <Text cursor="pointer" _hover={{ color: 'terra.500' }}>Peças</Text>
        </HStack>

        <InputGroup w="250px" size="md">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="whiteAlpha.600" />
          </InputLeftElement>
          <Input 
            placeholder="Pesquisar" 
            bg="whiteAlpha.300" 
            border="none" 
            borderRadius="full"
            _placeholder={{ color: 'whiteAlpha.600' }}
            color="white"
            px={10}
          />
        </InputGroup>

        <HStack spacing={6} fontSize="md">
          <Text cursor="pointer" _hover={{ color: 'terra.500' }}>Contato</Text>
          
          {/* Botão do Carrinho */}
          <Flex align="center" cursor="pointer" onClick={onOpen} _hover={{ color: 'terra.500' }} transition="0.2s">
            <CartIcon boxSize={5} mr={2} />
            <Text>Carrinho</Text>
            {cartCount > 0 && (
              <Box ml={2} bg="terra.500" color="black" px={2} py={0.5} borderRadius="full" fontSize="xs" fontWeight="bold">
                {cartCount}
              </Box>
            )}
          </Flex>
        </HStack>
      </Flex>

      {/* Renderizamos o Drawer fora do Flex para não quebrar o layout */}
      <CartDrawer isOpen={isOpen} onClose={onClose} />
    </>
  );
}