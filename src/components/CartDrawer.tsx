'use client';
import {
  Drawer, DrawerBody, DrawerFooter, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton,
  Button, Flex, Text, Image, IconButton, VStack, Box
} from '@chakra-ui/react';
import { useCart } from '@/store/CartContext';
import { useRouter } from 'next/navigation';

// Ícone de Lixo em SVG para remover itens
const TrashIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeFromCart, total } = useCart();
  const router = useRouter();

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
      <DrawerOverlay backdropFilter="blur(4px)" />
      <DrawerContent bg="gray.900" color="white">
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" borderColor="whiteAlpha.200">
          O seu Carrinho
        </DrawerHeader>

        <DrawerBody>
          {items.length === 0 ? (
            // Tratamento de Estado Vazio exigido na Avaliação
            <Flex direction="column" align="center" justify="center" h="100%" color="whiteAlpha.600">
              <Text fontSize="lg" mb={4}>O seu carrinho está vazio.</Text>
              <Button onClick={onClose} variant="outline" colorScheme="orange">
                Continuar a explorar
              </Button>
            </Flex>
          ) : (
            <VStack spacing={4} align="stretch" mt={4}>
              {items.map((item) => (
                <Flex key={item.peca.id} bg="whiteAlpha.100" p={3} borderRadius="md" align="center" justify="space-between">
                  <Flex align="center" gap={4}>
                    <Image src={item.peca.imagemUrl} boxSize="60px" objectFit="cover" borderRadius="sm" />
                    <Box>
                      <Text fontWeight="bold">{item.peca.nome}</Text>
                      <Text fontSize="sm" color="whiteAlpha.700">Qtd: {item.quantidade}</Text>
                      <Text color="terra.500">R$ {(item.peca.preco * item.quantidade).toFixed(2)}</Text>
                    </Box>
                  </Flex>
                  <IconButton 
                    aria-label="Remover item" 
                    icon={<TrashIcon />} 
                    colorScheme="red" 
                    variant="ghost" 
                    onClick={() => removeFromCart(item.peca.id)}
                  />
                </Flex>
              ))}
            </VStack>
          )}
        </DrawerBody>

        {items.length > 0 && (
          <DrawerFooter borderTopWidth="1px" borderColor="whiteAlpha.200" display="flex" flexDirection="column" gap={4}>
            <Flex w="100%" justify="space-between" fontWeight="bold" fontSize="lg">
              <Text>Total:</Text>
              <Text color="terra.500">R$ {total.toFixed(2)}</Text>
            </Flex>
                <Button 
                  w="100%" 
                  bg="terra.500" 
                  color="black" 
                  _hover={{ bg: 'terra.600' }}
                   onClick={() => {
                    onClose(); // Fecha a gaveta
                    router.push('/checkout'); // Vai para a página de checkout
                 }}
              >
                Finalizar Pedido
                </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}