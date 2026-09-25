'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import { Navbar } from '@/components/Navbar';
import { readSession } from '@/services/demoAuth';
import { ProductManager } from '@/components/ProductManager';
import { OrderManager } from '@/components/OrderManager';

export default function ArtesaoPage() {
  const router = useRouter();
  const [tab, setTab] = useState('products');
  const [sessionName, setSessionName] = useState('');

  useEffect(() => {
    const session = readSession();

    if (!session || session.role !== 'artesao') {
      router.replace('/login?perfil=artesao');
      return;
    }

    setSessionName(session.name);
  }, [router]);

  const isProductsTab = tab === 'products';

  return (
    <Box
      minH="100vh"
      bgImage="linear-gradient(rgba(23, 20, 18, 0.72), rgba(23, 20, 18, 0.47)), url('/bg-vitrine.png')"
      bgSize="cover"
      bgPosition="center"
      bgAttachment="fixed"
      display="flex"
      flexDirection="column"
    >
      <Navbar />

      <Box maxW="1100px" mx="auto" p={{ base: 4, md: 8 }}>
        <Box mb={8}>
          <Text
            color="terra.500"
            fontSize="sm"
            fontWeight="bold"
            textTransform="uppercase"
          >
            Ponto da Terra · {sessionName}
          </Text>

          <Heading size="xl" mt={1}>
            Área do artesão
          </Heading>

          <Text color="whiteAlpha.700" mt={2}>
            Gerencie suas peças, estoque e pedidos.
          </Text>
        </Box>

        <VStack align="stretch" spacing={5}>
          <Flex
            gap={3}
            borderBottom="1px solid"
            borderColor="whiteAlpha.200"
            pb={4}
          >
            <Button
              onClick={() => setTab('products')}
              colorScheme={isProductsTab ? 'orange' : 'gray'}
              variant={isProductsTab ? 'solid' : 'ghost'}
            >
              Minhas peças
            </Button>

            <Button
              onClick={() => setTab('orders')}
              colorScheme={!isProductsTab ? 'orange' : 'gray'}
              variant={!isProductsTab ? 'solid' : 'ghost'}
            >
              Pedidos
            </Button>
          </Flex>

          {isProductsTab ? (
            <ProductManager artisanOnly />
          ) : (
            <OrderManager artisanOnly />
          )}
        </VStack>
      </Box>
    </Box>
  );
}