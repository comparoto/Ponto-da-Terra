'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Flex, Heading, SimpleGrid, Spinner, Text, VStack, useDisclosure } from '@chakra-ui/react';
import { Navbar } from '@/components/Navbar';
import { RoleGate } from '@/components/Portal';
import { ProductCard } from '@/components/ProductCard';
import { ProductModal } from '@/components/ProductModal';
import { useCarregar } from '@/hooks/useCarregar';
import { favoritoService } from '@/services/interacaoService';
import { useFavoritos } from '@/store/favoritosStore';
import type { Peca } from '@/types';

function FavoritosContent() {
  const router = useRouter();
  const { total } = useFavoritos();
  // Recarrega a lista quando um coração é desmarcado nesta página
  const { dados: pecas, erro, carregando } = useCarregar(() => favoritoService.listar(), [total]);
  const [pecaSelecionada, setPecaSelecionada] = useState<Peca | null>(null);
  const modal = useDisclosure();

  return (
    <Box maxW="1200px" mx="auto" p={{ base: 4, md: 8 }}>
      <Heading fontFamily="heading" mb={2}>
        Meus favoritos
      </Heading>
      <Text color="whiteAlpha.700" mb={6}>
        As peças que você salvou ficam guardadas na sua conta, em qualquer aparelho.
      </Text>
      {carregando && !pecas ? (
        <Flex justify="center" py={10}>
          <Spinner color="terra.500" size="xl" />
        </Flex>
      ) : erro ? (
        <Text color="red.300">{erro}</Text>
      ) : !pecas?.length ? (
        <VStack bg="blackAlpha.600" p={10} borderRadius="xl" spacing={4}>
          <Text>Você ainda não favoritou nenhuma peça. Toque no ♡ das peças que gostar.</Text>
          <Button bg="terra.500" color="black" onClick={() => router.push('/produtos')}>
            Ver o catálogo
          </Button>
        </VStack>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
          {pecas.map(p => (
            <ProductCard
              key={p.id}
              peca={p}
              onSelect={peca => {
                setPecaSelecionada(peca);
                modal.onOpen();
              }}
            />
          ))}
        </SimpleGrid>
      )}
      <ProductModal peca={pecaSelecionada} isOpen={modal.isOpen} onClose={modal.onClose} />
    </Box>
  );
}

export default function FavoritosPage() {
  return (
    <RoleGate role="comprador">
      <Box minH="100vh" bgImage="linear-gradient(rgba(23, 20, 18, 0.82), rgba(23, 20, 18, 0.7)), url('/bg-vitrine.png')" bgSize="cover" bgAttachment="fixed" color="white">
        <Navbar />
        <FavoritosContent />
      </Box>
    </RoleGate>
  );
}
