'use client';
import { useState } from 'react';
import { Box, Flex, Heading, Text, VStack, HStack, Button, Input, Divider, Radio, RadioGroup, useToast, Image } from '@chakra-ui/react';
import { useCart } from '@/store/CartContext';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const router = useRouter();
  const toast = useToast();
  
  const [frete, setFrete] = useState(0);
  const [cep, setCep] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('pix');
  const [isCalculando, setIsCalculando] = useState(false);

  const totalGeral = total + frete;

  const simularFrete = () => {
    setIsCalculando(true);
    setTimeout(() => {
      // Simulação: se o CEP estiver preenchido, cobra 15 reais
      setFrete(15.00);
      setIsCalculando(false);
      toast({
        title: 'Frete calculado!',
        description: 'Entrega em até 5 dias úteis.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }, 1000);
  };

  const finalizarCompra = () => {
    // Aqui no futuro será feita a chamada à API real (POST /pedidos)
    clearCart();
    toast({
      title: 'Pedido realizado com sucesso!',
      description: 'Vamos redirecioná-lo para os seus pedidos.',
      status: 'success',
      duration: 4000,
      isClosable: true,
    });
    
    // Redireciona para a home (ou futuramente para /meus-pedidos)
    setTimeout(() => {
      router.push('/meus-pedidos');
    }, 2000);
  };

  return (
    <Box minH="100vh" bg="gray.900" color="white">
      <Navbar />
      
      <Flex direction={['column', 'column', 'row']} maxW="1200px" mx="auto" p={8} gap={10} mt={8}>
        
        {/* COLUNA ESQUERDA: Resumo dos Itens */}
        <Box flex="1" bg="blackAlpha.500" p={6} borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200">
          <Heading size="lg" mb={6} fontFamily="heading">Resumo do Pedido</Heading>
          <VStack spacing={4} align="stretch">
            {items.map(item => (
              <Flex key={item.peca.id} justify="space-between" align="center" bg="whiteAlpha.100" p={3} borderRadius="md">
                <HStack spacing={4}>
                  <Image src={item.peca.imagemUrl} boxSize="50px" objectFit="cover" borderRadius="sm" />
                  <Box>
                    <Text fontWeight="bold">{item.peca.nome}</Text>
                    <Text fontSize="sm" color="whiteAlpha.600">Qtd: {item.quantidade}</Text>
                  </Box>
                </HStack>
                <Text color="terra.500">R$ {(item.peca.preco * item.quantidade).toFixed(2)}</Text>
              </Flex>
            ))}
          </VStack>
        </Box>

        {/* COLUNA DIREITA: Entrega, Pagamento e Totais */}
        <Box flex="1" bg="blackAlpha.500" p={6} borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200">
          
          <Heading size="md" mb={4}>Cálculo de Frete</Heading>
          <HStack mb={6}>
            <Input 
              placeholder="Digite o seu CEP" 
              value={cep} 
              onChange={(e) => setCep(e.target.value)}
              bg="whiteAlpha.200" 
              border="none"
            />
            <Button 
              onClick={simularFrete} 
              isLoading={isCalculando} 
              colorScheme="gray" 
              variant="outline"
              isDisabled={!cep}
            >
              Calcular
            </Button>
          </HStack>

          <Divider borderColor="whiteAlpha.200" my={6} />

          <Heading size="md" mb={4}>Forma de Pagamento</Heading>
          <RadioGroup onChange={setMetodoPagamento} value={metodoPagamento} mb={6}>
            <VStack align="stretch" spacing={3}>
              <Radio value="pix" colorScheme="orange">PIX (Aprovação imediata)</Radio>
              <Radio value="cartao" colorScheme="orange">Cartão de Crédito</Radio>
              <Radio value="boleto" colorScheme="orange">Boleto Bancário</Radio>
            </VStack>
          </RadioGroup>

          <Divider borderColor="whiteAlpha.200" my={6} />

          <VStack spacing={2} align="stretch" mb={8} fontSize="lg">
            <Flex justify="space-between">
              <Text color="whiteAlpha.700">Subtotal:</Text>
              <Text>R$ {total.toFixed(2)}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text color="whiteAlpha.700">Frete:</Text>
              <Text>R$ {frete.toFixed(2)}</Text>
            </Flex>
            <Flex justify="space-between" fontWeight="bold" fontSize="xl" mt={2} color="terra.500">
              <Text>Total a Pagar:</Text>
              <Text>R$ {totalGeral.toFixed(2)}</Text>
            </Flex>
          </VStack>

          <Button 
            w="100%" 
            size="lg" 
            bg="terra.500" 
            color="black" 
            _hover={{ bg: 'terra.600' }}
            onClick={finalizarCompra}
          >
            Confirmar Pedido
          </Button>
        </Box>
      </Flex>
    </Box>
  );
}