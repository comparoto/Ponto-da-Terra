'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Code, Flex, Heading, HStack, Image, Link, Spinner, Text, Textarea, VStack, useToast } from '@chakra-ui/react';
import { Navbar } from '@/components/Navbar';
import { RoleGate } from '@/components/Portal';
import { brl, dataBr, LinhaDoTempo, SeletorEstrelas, StatusPedidoBadge } from '@/components/ui';
import { useCarregar } from '@/hooks/useCarregar';
import { mensagemDeErro } from '@/services/http';
import { avaliacaoService } from '@/services/interacaoService';
import { pedidoService, type Pedido } from '@/services/pedidoService';

/** HU17: avaliação de um item recebido. */
function AvaliarItem({ produtoId, titulo, onAvaliado }: { produtoId: string; titulo: string; onAvaliado: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function enviar() {
    if (!nota) {
      setErro('Escolha uma nota de 1 a 5 estrelas.');
      return;
    }
    setEnviando(true);
    const res = await avaliacaoService.avaliar(produtoId, nota, comentario.trim());
    setEnviando(false);
    if (!res.success) {
      setErro(mensagemDeErro(res));
      return;
    }
    onAvaliado();
  }

  if (!aberto) {
    return (
      <Button size="xs" variant="outline" borderColor="terra.500" color="terra.500" onClick={() => setAberto(true)}>
        Avaliar
      </Button>
    );
  }
  return (
    <Box mt={2} p={3} bg="whiteAlpha.100" borderRadius="md" w="100%">
      <Text fontSize="sm" mb={1}>
        Como foi a sua experiência com &quot;{titulo}&quot;?
      </Text>
      <SeletorEstrelas valor={nota} onChange={setNota} />
      <Textarea mt={2} size="sm" rows={2} placeholder="Conte sobre a qualidade da peça e do atendimento (opcional)" value={comentario} onChange={e => setComentario(e.target.value)} bg="whiteAlpha.100" />
      {erro && (
        <Text color="red.300" fontSize="sm" mt={1} role="alert">
          {erro}
        </Text>
      )}
      <HStack mt={2}>
        <Button size="sm" bg="terra.500" color="black" isLoading={enviando} onClick={enviar}>
          Enviar avaliação
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </HStack>
    </Box>
  );
}

function CartaoPedido({ pedido, onAtualizar }: { pedido: Pedido; onAtualizar: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const cancelado = pedido.status === 'CANCELADO';

  async function confirmarRecebimento() {
    setConfirmando(true);
    const res = await pedidoService.confirmarRecebimento(pedido.id);
    setConfirmando(false);
    toast({ title: res.success ? 'Recebimento confirmado! Que tal avaliar a peça?' : mensagemDeErro(res), status: res.success ? 'success' : 'error', duration: 3500, isClosable: true });
    onAtualizar();
  }

  return (
    <Box bg="blackAlpha.700" p={{ base: 4, md: 6 }} borderRadius="xl" border="1px solid" borderColor={pedido.atrasado ? 'red.400' : 'whiteAlpha.200'}>
      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={3} mb={4}>
        <Box>
          <Text fontSize="sm" color="whiteAlpha.700">
            {pedido.codigoCompra} · {dataBr(pedido.dataPedido, true)}
          </Text>
          <Text fontWeight="bold" color="terra.500">
            Ateliê de {pedido.artesao.nome} · {pedido.artesao.cidade}/{pedido.artesao.estado}
          </Text>
        </Box>
        <StatusPedidoBadge status={pedido.status} atrasado={pedido.atrasado} />
      </Flex>

      {!cancelado && pedido.status !== 'AGUARDANDO_PAGAMENTO' && (
        <Box mb={4}>
          <LinhaDoTempo etapas={pedido.linhaDoTempo} />
        </Box>
      )}

      {pedido.status === 'AGUARDANDO_PAGAMENTO' && (
        <Flex align="center" justify="space-between" bg="whiteAlpha.100" p={3} borderRadius="md" mb={4} wrap="wrap" gap={2}>
          <Text fontSize="sm">O pagamento desta compra ainda não foi confirmado.</Text>
          <Button size="sm" bg="terra.500" color="black" onClick={() => router.push(`/compra/${pedido.codigoCompra}`)}>
            Ver pagamento
          </Button>
        </Flex>
      )}

      {pedido.entrega?.codigoRastreio && (
        <Flex align="center" gap={3} wrap="wrap" bg="whiteAlpha.100" p={3} borderRadius="md" mb={4}>
          <Text fontSize="sm">Código de rastreio ({pedido.entrega.transportadora}):</Text>
          <Code colorScheme="orange" fontSize="sm">
            {pedido.entrega.codigoRastreio}
          </Code>
          {pedido.entrega.urlRastreio && (
            <Link href={pedido.entrega.urlRastreio} isExternal color="terra.500" fontSize="sm" textDecoration="underline">
              Rastrear nos Correios
            </Link>
          )}
        </Flex>
      )}

      <VStack align="stretch" spacing={3}>
        {pedido.itens.map(item => (
          <Flex key={item.produtoId} align="center" justify="space-between" gap={3} wrap="wrap">
            <HStack spacing={3}>
              <Image src={item.imagemUrl ?? ''} alt={item.titulo} boxSize="48px" objectFit="cover" borderRadius="md" fallbackSrc="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=100&q=60" />
              <Box>
                <Text fontWeight="medium">{item.titulo}</Text>
                <Text fontSize="sm" color="whiteAlpha.700">
                  {item.quantidade}x {brl(item.precoUnitario)}
                </Text>
              </Box>
            </HStack>
            {pedido.status === 'ENTREGUE' &&
              (item.avaliado ? (
                <Text fontSize="sm" color="green.300">
                  ✓ Avaliado
                </Text>
              ) : (
                <AvaliarItem produtoId={item.produtoId} titulo={item.titulo} onAvaliado={onAtualizar} />
              ))}
          </Flex>
        ))}
      </VStack>

      <Flex justify="space-between" align="center" mt={4} pt={3} borderTop="1px solid" borderColor="whiteAlpha.200" wrap="wrap" gap={3}>
        <Text fontSize="sm" color="whiteAlpha.700">
          Frete {brl(pedido.valorFrete)}
          {pedido.entrega?.dataPrevista && !cancelado && pedido.status !== 'ENTREGUE' ? ` · previsão ${dataBr(pedido.entrega.dataPrevista)}` : ''}
        </Text>
        <HStack>
          {pedido.status === 'DESPACHADO' && (
            <Button size="sm" colorScheme="green" isLoading={confirmando} onClick={confirmarRecebimento}>
              Confirmar recebimento
            </Button>
          )}
          <Text fontWeight="bold" color="terra.500" fontSize="lg">
            {brl(pedido.valorTotal)}
          </Text>
        </HStack>
      </Flex>
    </Box>
  );
}

function MeusPedidosContent() {
  const router = useRouter();
  const { dados: pedidos, erro, carregando, recarregar } = useCarregar(() => pedidoService.meus());

  return (
    <Box maxW="900px" mx="auto" p={{ base: 4, md: 8 }}>
      <Heading mb={2} fontFamily="heading">
        Meus Pedidos
      </Heading>
      <Text color="whiteAlpha.700" mb={6}>
        Acompanhe a produção, o envio e a entrega de cada peça.
      </Text>

      {carregando ? (
        <Flex justify="center" py={10}>
          <Spinner color="terra.500" size="xl" />
        </Flex>
      ) : erro ? (
        <Text color="red.300">{erro}</Text>
      ) : !pedidos?.length ? (
        <VStack bg="blackAlpha.600" p={10} borderRadius="xl" spacing={4}>
          <Text>Você ainda não fez nenhum pedido.</Text>
          <Button bg="terra.500" color="black" onClick={() => router.push('/vitrine')}>
            Explorar a vitrine
          </Button>
        </VStack>
      ) : (
        <VStack spacing={5} align="stretch">
          {pedidos.map(p => (
            <CartaoPedido key={p.id} pedido={p} onAtualizar={recarregar} />
          ))}
        </VStack>
      )}
    </Box>
  );
}

export default function MeusPedidosPage() {
  return (
    <RoleGate role="comprador">
      <Box minH="100vh" bgImage="linear-gradient(rgba(23, 20, 18, 0.72), rgba(23, 20, 18, 0.47)), url('/bg-pedidos.png')" bgSize="cover" bgPosition="center" bgAttachment="fixed" color="white">
        <Navbar />
        <MeusPedidosContent />
      </Box>
    </RoleGate>
  );
}
