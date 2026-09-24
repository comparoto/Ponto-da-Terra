'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Drawer, DrawerBody, DrawerFooter, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton,
  Button, Flex, Text, Image, Box, IconButton, HStack, VStack, Icon
} from '@chakra-ui/react';
import { useCart } from '@/store/cartStore';

const TrashIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </Icon>
);

const EmptyBagIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </Icon>
);

export function CartDrawer() {
  const router = useRouter();
  const {
    items, isCartOpen, fecharCarrinho, removerDoCarrinho,
    atualizarQuantidade, valorTotal, totalItens, limparCarrinho,
  } = useCart();

  return (
    <Drawer isOpen={isCartOpen} placement="right" onClose={fecharCarrinho} size="md">
      <DrawerOverlay bg="blackAlpha.700" backdropFilter="blur(6px)" />
      <DrawerContent bg="#1C1816" color="white" borderLeft="1px solid" borderColor="whiteAlpha.300">
        <DrawerCloseButton color="white" />
        <DrawerHeader borderBottomWidth="1px" borderColor="whiteAlpha.200" fontFamily="heading">
          <Flex align="center" justify="space-between" pr={6}>
            <Text fontSize="xl">Sua Sacola</Text>
            {totalItens > 0 && (
              <Text fontSize="sm" fontWeight="normal" color="terra.500">
                {totalItens} {totalItens === 1 ? 'item' : 'itens'}
              </Text>
            )}
          </Flex>
        </DrawerHeader>

        <DrawerBody px={4} py={6}>
          {items.length === 0 ? (
            <Flex direction="column" align="center" justify="center" h="100%" gap={4} py={12}>
              <EmptyBagIcon boxSize={16} color="whiteAlpha.400" />
              <Text fontSize="lg" fontWeight="medium" color="whiteAlpha.800">Sua sacola está vazia</Text>
              <Text fontSize="sm" color="whiteAlpha.500" textAlign="center" maxW="260px">
                Explore os produtos de nossos mestres artesãos e adicione suas peças favoritas.
              </Text>
              <Button mt={2} size="sm" bg="terra.500" color="black" _hover={{ bg: 'terra.600' }} onClick={fecharCarrinho}>
                Continuar Comprando
              </Button>
            </Flex>
          ) : (
            <VStack spacing={4} align="stretch">
              {items.map(item => (
                <Flex key={item.peca.id} bg="whiteAlpha.100" p={3} borderRadius="lg" gap={3} align="center">
                  <Image src={item.peca.imagemUrl} alt={item.peca.nome} boxSize="70px" objectFit="cover" borderRadius="md" />
                  <Box flex="1">
                    <Text fontSize="sm" fontWeight="medium" noOfLines={1}>{item.peca.nome}</Text>
                    {item.peca.artesaoNome && <Text fontSize="xs" color="terra.500">{item.peca.artesaoNome}</Text>}
                    <Text fontSize="sm" fontWeight="bold" color="whiteAlpha.900" mt={1}>
                      R$ {item.peca.preco.toFixed(2).replace('.', ',')}
                    </Text>
                  </Box>
                  <VStack align="flex-end" spacing={1}>
                    <IconButton aria-label="Remover" icon={<TrashIcon />} size="xs" variant="ghost" color="red.300" _hover={{ bg: 'red.900' }} onClick={() => removerDoCarrinho(item.peca.id)} />
                    <HStack spacing={1}>
                      <Button size="xs" variant="outline" borderColor="terra.500" color="terra.500" _hover={{ bg: 'terra.500', color: 'black' }} onClick={() => atualizarQuantidade(item.peca.id, item.quantidade - 1)}>-</Button>
                      <Text fontSize="xs" fontWeight="bold" px={2} color="white">{item.quantidade}</Text>
                      <Button size="xs" variant="outline" borderColor="terra.500" color="terra.500" _hover={{ bg: 'terra.500', color: 'black' }} onClick={() => atualizarQuantidade(item.peca.id, item.quantidade + 1)}>+</Button>
                    </HStack>
                  </VStack>
                </Flex>
              ))}
              <Flex justify="flex-end" pt={2}>
                <Button variant="ghost" size="xs" color="whiteAlpha.600" _hover={{ color: 'red.300', bg: 'transparent' }} onClick={limparCarrinho}>Limpar sacola</Button>
              </Flex>
            </VStack>
          )}
        </DrawerBody>

        {items.length > 0 && (
          <DrawerFooter borderTopWidth="1px" borderColor="whiteAlpha.200" flexDirection="column" gap={3} bg="blackAlpha.400">
            <Flex justify="space-between" w="100%" align="center">
              <Text fontSize="md" color="whiteAlpha.800">Subtotal:</Text>
              <Text fontSize="xl" fontWeight="bold" color="terra.500">
                R$ {valorTotal.toFixed(2).replace('.', ',')}
              </Text>
            </Flex>
            <Button w="100%" bg="terra.500" color="black" _hover={{ bg: 'terra.600' }} fontWeight="bold" size="lg" onClick={() => {
              fecharCarrinho();
              router.push('/checkout');
            }}>
              Finalizar Pedido
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}