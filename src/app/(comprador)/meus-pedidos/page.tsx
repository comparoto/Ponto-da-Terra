'use client';
import { useState, useEffect } from 'react';
import { Box, Flex, Heading, Text, VStack, HStack, Badge, Divider, Image, Spinner, Avatar } from '@chakra-ui/react';
import { Navbar } from '@/components/Navbar';

// Tipagem para simular os dados vindos da API
interface PedidoItem {
  nome: string;
  quantidade: number;
  preco: number;
  imagemUrl: string;
}

interface Pedido {
  id: string;
  data: string;
  status: 'Processando' | 'Enviado' | 'Entregue';
  total: number;
  itens: PedidoItem[];
}

export default function MeusPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulação de chamada à Fake API para os pedidos do comprador
  useEffect(() => {
    setTimeout(() => {
      setPedidos([
        {
          id: 'PT-2026-9081',
          data: '24 de Setembro de 2026',
          status: 'Processando',
          total: 185.00,
          itens: [
            { nome: 'Pote de barro tradicional', quantidade: 2, preco: 85.00, imagemUrl: '/bg-welcome.jpg' }
          ]
        },
        {
          id: 'PT-2026-7742',
          data: '10 de Agosto de 2026',
          status: 'Entregue',
          total: 45.00,
          itens: [
            { nome: 'Escultura de Leão em Argila', quantidade: 1, preco: 45.00, imagemUrl: '/bg-vitrine.jpg' }
          ]
        }
      ]);
      setIsLoading(false);
    }, 1500); // Simula 1.5s de carregamento
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Processando': return 'orange';
      case 'Enviado': return 'blue';
      case 'Entregue': return 'green';
      default: return 'gray';
    }
  };

 return (
    <Box 
      minH="100vh" 
      bgImage="url('/bg-pedidos.png')" 
      bgSize="cover"
      bgPosition="center"
      bgAttachment="fixed"
      color="white"
      display="flex"
      flexDirection="column"
    >
      <Navbar />
      <Flex direction={['column', 'column', 'row']} maxW="1200px" mx="auto" p={8} gap={10} mt={8}>
        
        {/* COLUNA ESQUERDA: Perfil do Comprador */}
        <Box w={["100%", "100%", "300px"]} bg="blackAlpha.500" p={6} borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200" h="fit-content">
          <Flex direction="column" align="center" mb={6}>
            <Avatar size="2xl" name="Juliana Comparoto" bg="terra.500" color="black" mb={4} />
            <Heading size="md" fontFamily="heading">Juliana Comparoto</Heading>
            <Text color="whiteAlpha.600" fontSize="sm">juliana@exemplo.com</Text>
          </Flex>
          
          <Divider borderColor="whiteAlpha.200" mb={4} />
          
          <VStack align="stretch" spacing={2}>
            <Box bg="whiteAlpha.200" p={3} borderRadius="md" cursor="pointer" borderLeft="4px solid" borderColor="terra.500">
              <Text fontWeight="medium" color="terra.500">Meus Pedidos</Text>
            </Box>
            <Box _hover={{ bg: 'whiteAlpha.100' }} p={3} borderRadius="md" cursor="pointer">
              <Text color="whiteAlpha.800">Dados Pessoais</Text>
            </Box>
            <Box _hover={{ bg: 'whiteAlpha.100' }} p={3} borderRadius="md" cursor="pointer">
              <Text color="whiteAlpha.800">Endereços</Text>
            </Box>
          </VStack>
        </Box>

        {/* COLUNA DIREITA: Lista de Pedidos */}
        <Box flex="1" bg="blackAlpha.500" p={6} borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200">
          <Heading size="lg" mb={6} fontFamily="heading">Histórico de Pedidos</Heading>

          {isLoading ? (
            <Flex justify="center" align="center" py={10}>
              <Spinner size="xl" color="terra.500" />
            </Flex>
          ) : pedidos.length === 0 ? (
            <Text color="whiteAlpha.600">Ainda não realizou nenhuma compra.</Text>
          ) : (
            <VStack spacing={6} align="stretch">
              {pedidos.map((pedido) => (
                <Box key={pedido.id} bg="whiteAlpha.100" p={5} borderRadius="lg" border="1px solid" borderColor="whiteAlpha.200">
                  
                  {/* Cabeçalho do Pedido */}
                  <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={4}>
                    <HStack spacing={6}>
                      <Box>
                        <Text fontSize="xs" color="whiteAlpha.600">Nº DO PEDIDO</Text>
                        <Text fontWeight="bold">{pedido.id}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="whiteAlpha.600">DATA DA COMPRA</Text>
                        <Text fontWeight="bold">{pedido.data}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="whiteAlpha.600">TOTAL</Text>
                        <Text fontWeight="bold" color="terra.500">R$ {pedido.total.toFixed(2)}</Text>
                      </Box>
                    </HStack>
                    <Badge colorScheme={getStatusColor(pedido.status)} px={3} py={1} borderRadius="full">
                      {pedido.status}
                    </Badge>
                  </Flex>

                  <Divider borderColor="whiteAlpha.200" mb={4} />

                  {/* Lista de Itens do Pedido */}
                  <VStack align="stretch" spacing={3}>
                    {pedido.itens.map((item, index) => (
                      <Flex key={index} align="center" gap={4}>
                        <Image src={item.imagemUrl} boxSize="60px" objectFit="cover" borderRadius="md" />
                        <Box flex="1">
                          <Text fontWeight="medium">{item.nome}</Text>
                          <Text fontSize="sm" color="whiteAlpha.600">Qtd: {item.quantidade} | R$ {item.preco.toFixed(2)} un.</Text>
                        </Box>
                        <Text fontWeight="bold">R$ {(item.quantidade * item.preco).toFixed(2)}</Text>
                      </Flex>
                    ))}
                  </VStack>
                </Box>
              ))}
            </VStack>
          )}
        </Box>
      </Flex>
    </Box>
  );
}