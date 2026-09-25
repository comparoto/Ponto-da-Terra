'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Box, Button, Flex, Heading, Image, Spinner, Text, VStack } from '@chakra-ui/react';
import { Navbar } from '@/components/Navbar';
import { DemoOrder, readOrders, readSession } from '@/services/demoAuth';

export default function MeusPedidosPage() {
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const session = readSession();
    
    if (!session || session.role !== 'comprador') {
      router.replace('/login?perfil=comprador');
      return;
    }
    
    setOrders(readOrders().filter(order => order.owner === session.email));
    setLoading(false);
  }, [router]);

  return (
        <Box 
      minH="100vh" 
      bgImage="linear-gradient(rgba(23, 20, 18, 0.72), rgba(23, 20, 18, 0.47)), url('/bg-pedidos.png')"
      bgSize="cover"
      bgPosition="center"
      bgAttachment="fixed"
      color="white"
      display="flex"
      flexDirection="column"
    >
      <Navbar />
      <Box maxW="1100px" mx="auto" p={{ base: 4, md: 8 }}>
        <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
          <Box>
            <Heading>Meus pedidos</Heading>
            <Text color="whiteAlpha.700" mt={2}>
              Acompanhe o andamento das suas compras.
            </Text>
          </Box>
          <Button colorScheme="orange" onClick={() => router.push('/vitrine')}>
            Continuar comprando
          </Button>
        </Flex>

        {loading ? (
          <Flex justify="center" py={12}>
            <Spinner color="terra.500" size="xl" />
          </Flex>
        ) : orders.length === 0 ? (
          <Box p={8} bg="whiteAlpha.100" borderRadius="xl">
            <Text>Você ainda não tem pedidos.</Text>
            <Button mt={4} onClick={() => router.push('/produtos')}>
              Explorar catálogo
            </Button>
          </Box>
        ) : (
          <VStack align="stretch" spacing={4}>
            {orders.map(order => (
              <Box key={order.id} p={5} bg="whiteAlpha.100" borderRadius="xl">
                <Flex justify="space-between" wrap="wrap" gap={3} mb={4}>
                  <Box>
                    <Text fontWeight="bold">Pedido {order.id}</Text>
                    <Text color="whiteAlpha.700">
                      {new Date(order.date).toLocaleDateString('pt-BR')}
                    </Text>
                  </Box>
                  <Badge 
                    colorScheme={
                      order.status === 'Entregue' ? 'green' : 
                      order.status === 'Enviado' ? 'blue' : 
                      order.status === 'Cancelado' ? 'red' : 
                      'orange'
                    } 
                    p={2}
                  >
                    {order.status}
                  </Badge>
                </Flex>
                
                {order.items.map((item, index) => (
                  <Flex key={`${order.id}-${index}`} align="center" gap={4} py={2}>
                    <Image 
                      src={item.image} 
                      alt={item.name} 
                      boxSize="56px" 
                      objectFit="cover" 
                      borderRadius="md" 
                    />
                    <Text flex="1">{item.name} · {item.quantity} un.</Text>
                    <Text>
                      R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                    </Text>
                  </Flex>
                ))}
                
                <Text textAlign="right" fontWeight="bold" color="terra.500" mt={3}>
                  Total: R$ {order.total.toFixed(2).replace('.', ',')}
                </Text>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
    </Box>
  );
}