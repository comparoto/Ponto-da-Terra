'use client';
import { useState } from 'react';
import { Box, Flex, Heading, Text, VStack, HStack, Button, Input, Divider, Radio, RadioGroup, useToast, Image } from '@chakra-ui/react';
import { useCart } from '@/store/cartStore'; 
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { readOrders, readSession, saveOrders } from '@/services/demoAuth';
import { RoleGate } from '@/components/Portal';

function CheckoutContent() {
  const { items = [], valorTotal, limparCarrinho } = useCart();
  const router = useRouter();
  const toast = useToast();
  
  const [frete, setFrete] = useState(0);
  const [cep, setCep] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('pix');
  const [isCalculando, setIsCalculando] = useState(false);

  const totalGeral = (valorTotal || 0) + frete;

  const simularFrete = () => {
    setIsCalculando(true);
    setTimeout(() => {
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
    const session = readSession();
    if (!session || session.role !== 'comprador') { router.push('/login?perfil=comprador'); return; }
    if (!items.length) { toast({ title: 'Seu carrinho está vazio.', status: 'warning', duration: 3000, isClosable: true }); return; }
    const order = {
      id: `PT-${Date.now()}`, owner: session.email, date: new Date().toISOString(), status: 'Processando' as const,
      total: totalGeral,
      items: items.map(item => ({ name: item.peca.nome, quantity: item.quantidade, price: item.peca.preco, image: item.peca.imagemUrl, artisanId: item.peca.artesaoId })),
    };
    saveOrders([order, ...readOrders()]);
    limparCarrinho();
    toast({ title: 'Pedido realizado com sucesso!', description: 'Você pode acompanhar o pedido na sua conta.', status: 'success', duration: 3500, isClosable: true });
    router.push('/meus-pedidos');
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
                <Text color="terra.500">R$ {(item.peca.preco * item.quantidade).toFixed(2).replace('.', ',')}</Text>
              </Flex>
            ))}
          </VStack>
        </Box>

        {/*coluna da direita*/}
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
              <Text>R$ {valorTotal.toFixed(2).replace('.', ',')}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text color="whiteAlpha.700">Frete:</Text>
              <Text>R$ {frete.toFixed(2).replace('.', ',')}</Text>
            </Flex>
            <Flex justify="space-between" fontWeight="bold" fontSize="xl" mt={2} color="terra.500">
              <Text>Total a Pagar:</Text>
              <Text>R$ {totalGeral.toFixed(2).replace('.', ',')}</Text>
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

export default function CheckoutPage() {
  return <RoleGate role="comprador"><CheckoutContent /></RoleGate>;
}
