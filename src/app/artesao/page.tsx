'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertIcon, Box, Button, Flex, Heading, Select, SimpleGrid, Spinner, Text, VStack } from '@chakra-ui/react';
import { Navbar } from '@/components/Navbar';
import { OrderManager } from '@/components/OrderManager';
import { RoleGate } from '@/components/Portal';
import { ProductManager } from '@/components/ProductManager';
import { BarList, brl, CartaoMetrica, dataBr } from '@/components/ui';
import { useCarregar } from '@/hooks/useCarregar';
import { useSession } from '@/hooks/useSession';
import { mensagemService, painelService } from '@/services/interacaoService';
import { ListaNotificacoes } from '@/components/Notificacoes';
import { atualizarSessaoDoServidor } from '@/services/authService';

const opcoes = { '& option': { color: '#fff', backgroundColor: '#2C2724' } };

/** HU14: dúvidas enviadas pelos compradores. */
function Mensagens() {
  const { dados: mensagens, erro, carregando } = useCarregar(() => mensagemService.recebidas());
  if (carregando) return <Spinner color="terra.500" />;
  if (erro) return <Text color="red.300">{erro}</Text>;
  if (!mensagens?.length) return <Text color="whiteAlpha.700">Nenhuma dúvida recebida ainda.</Text>;
  return (
    <VStack align="stretch" spacing={3}>
      {mensagens.map(m => (
        <Box key={m.id} p={4} bg="whiteAlpha.100" borderRadius="lg">
          <Text fontSize="sm" color="whiteAlpha.700">
            {m.comprador.nome} ({m.comprador.email}) · sobre <b>{m.produto.titulo}</b> · {dataBr(m.dataEnvio, true)}
          </Text>
          <Text mt={1}>{m.mensagem}</Text>
        </Box>
      ))}
    </VStack>
  );
}

/** HU18: indicadores de vendas do artesão. */
function Indicadores() {
  const [meses, setMeses] = useState(6);
  const de = (() => {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - meses + 1, 1);
    return d.toISOString().slice(0, 10);
  })();
  const { dados: ind, erro, carregando } = useCarregar(() => painelService.indicadores(de), [de]);

  return (
    <VStack align="stretch" spacing={5}>
      <Select maxW="220px" value={meses} onChange={e => setMeses(Number(e.target.value))} aria-label="Período" sx={opcoes} bg="whiteAlpha.100" borderColor="whiteAlpha.300">
        <option value={3}>Últimos 3 meses</option>
        <option value={6}>Últimos 6 meses</option>
        <option value={12}>Últimos 12 meses</option>
      </Select>
      {carregando && !ind ? (
        <Spinner color="terra.500" />
      ) : erro ? (
        <Text color="red.300">{erro}</Text>
      ) : ind ? (
        <>
          {ind.mensagem && (
            <Box p={4} bg="orange.900" borderRadius="md">
              <Text>{ind.mensagem}</Text>
            </Box>
          )}
          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
            <CartaoMetrica titulo="Faturamento no período" valor={brl(ind.faturamentoTotal)} />
            <CartaoMetrica titulo="Pedidos pagos" valor={ind.pedidosPagos} />
            <CartaoMetrica titulo="Taxa de conclusão" valor={`${ind.taxaConclusao}%`} detalhe={`${ind.pedidosConcluidos} entregue(s)`} />
          </SimpleGrid>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <Box p={5} bg="whiteAlpha.100" borderRadius="xl">
              <Heading size="sm" mb={3}>
                Faturamento por mês
              </Heading>
              <BarList itens={ind.faturamentoPorMes.map(m => ({ rotulo: m.mes, valor: m.receita }))} formatar={brl} />
            </Box>
            <Box p={5} bg="whiteAlpha.100" borderRadius="xl">
              <Heading size="sm" mb={3}>
                Peças mais vendidas
              </Heading>
              <BarList itens={ind.pecasMaisVendidas.map(p => ({ rotulo: p.titulo, valor: p.quantidade }))} formatar={v => `${v} un.`} />
            </Box>
            <Box p={5} bg="whiteAlpha.100" borderRadius="xl">
              <Heading size="sm" mb={3}>
                Pedidos por polo de origem
              </Heading>
              <BarList itens={ind.pedidosPorPolo.map(p => ({ rotulo: p.polo, valor: p.pedidos }))} formatar={v => `${v} pedido(s)`} />
            </Box>
          </SimpleGrid>
        </>
      ) : null}
    </VStack>
  );
}

const ABAS = [
  ['products', 'Minhas peças'],
  ['orders', 'Pedidos'],
  ['messages', 'Mensagens'],
  ['insights', 'Indicadores'],
  ['notifications', 'Notificações'],
] as const;

function ArtesaoContent() {
  const router = useRouter();
  const session = useSession();
  const [tab, setTab] = useState<(typeof ABAS)[number][0]>('products');

  // Busca a situação atual do cadastro (o admin pode ter aprovado depois do login)
  useEffect(() => {
    void atualizarSessaoDoServidor();
  }, []);

  return (
    <Box maxW="1100px" w="100%" mx="auto" p={{ base: 4, md: 8 }}>
      <Flex mb={8} justify="space-between" align="flex-end" wrap="wrap" gap={4}>
        <Box>
          <Text color="terra.500" fontSize="sm" fontWeight="bold" textTransform="uppercase">
            Ponto da Terra · {session?.name}
          </Text>
          <Heading size="xl" mt={1}>
            Área do artesão
          </Heading>
          <Text color="whiteAlpha.700" mt={2}>
            Gerencie suas peças, estoque, pedidos e mensagens.
          </Text>
        </Box>
        <Button variant="outline" onClick={() => router.push('/orientacao')}>
          Central de orientação (Carteira do Artesão e MEI)
        </Button>
      </Flex>

      {session?.artisanStatus === 'PENDENTE' && (
        <Alert status="info" mb={6} borderRadius="md" bg="blue.900" color="white">
          <AlertIcon />
          Seu cadastro está em análise pela curadoria. Você já pode cadastrar peças: elas e o seu perfil aparecem na vitrine assim que o cadastro for aprovado.
        </Alert>
      )}
      {session?.artisanStatus === 'REJEITADO' && (
        <Alert status="warning" mb={6} borderRadius="md" bg="orange.900" color="white">
          <AlertIcon />
          Seu cadastro precisa de ajustes{session.artisanStatusReason ? `: ${session.artisanStatusReason}` : '.'} Atualize seu perfil e fale com a curadoria pelo contato do site.
        </Alert>
      )}

      <VStack align="stretch" spacing={5}>
        <Flex gap={3} wrap="wrap" borderBottom="1px solid" borderColor="whiteAlpha.200" pb={4}>
          {ABAS.map(([id, rotulo]) => (
            <Button key={id} onClick={() => setTab(id)} {...(tab === id ? { bg: 'terra.500', color: 'black', _hover: { bg: 'terra.600' } } : { variant: 'ghost' })} aria-pressed={tab === id}>
              {rotulo}
            </Button>
          ))}
        </Flex>
        {tab === 'products' && <ProductManager artisanOnly />}
        {tab === 'orders' && <OrderManager artisanOnly />}
        {tab === 'messages' && <Mensagens />}
        {tab === 'insights' && <Indicadores />}
        {tab === 'notifications' && <ListaNotificacoes />}
      </VStack>
    </Box>
  );
}

export default function ArtesaoPage() {
  return (
    <RoleGate role="artesao">
      <Box minH="100vh" bgImage="linear-gradient(rgba(23, 20, 18, 0.72), rgba(23, 20, 18, 0.47)), url('/bg-vitrine.png')" bgSize="cover" bgPosition="center" bgAttachment="fixed" color="white" display="flex" flexDirection="column">
        <Navbar />
        <ArtesaoContent />
      </Box>
    </RoleGate>
  );
}
