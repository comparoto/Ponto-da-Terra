'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Box, Button, Flex, Heading, HStack, Select, SimpleGrid, Spinner, Text, VStack } from '@chakra-ui/react';
import { Navbar } from '@/components/Navbar';
import { OrderManager } from '@/components/OrderManager';
import { RoleGate } from '@/components/Portal';
import { ProductManager } from '@/components/ProductManager';
import { BarList, brl, CartaoMetrica, dataBr } from '@/components/ui';
import { useCarregar } from '@/hooks/useCarregar';
import { useSession } from '@/hooks/useSession';
import { mensagemService, notificacaoService, painelService, type Notificacao } from '@/services/interacaoService';

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

const TEXTO_EVENTO: Record<string, string> = {
  NOVO_PEDIDO: 'Novo pedido recebido',
  PRODUTO_APROVADO: 'Peça aprovada',
  PRODUTO_REJEITADO: 'Peça reprovada',
  NOVA_MENSAGEM: 'Nova dúvida de comprador',
  PEDIDO_ATUALIZADO: 'Pedido atualizado',
};

function descrever(n: Notificacao): string {
  const p = n.payload as Record<string, string | string[] | number | undefined>;
  if (n.tipoEvento === 'NOVO_PEDIDO') return `${p.codigoCompra} · ${Array.isArray(p.itens) ? p.itens.join(', ') : ''}`;
  if (n.tipoEvento === 'PRODUTO_REJEITADO') return `"${p.titulo}" — motivo: ${p.justificativa}`;
  if (n.tipoEvento === 'PRODUTO_APROVADO') return `"${p.titulo}" já está na vitrine.`;
  if (n.tipoEvento === 'NOVA_MENSAGEM') return `${p.comprador} sobre "${p.titulo}": ${p.trecho}`;
  return String(p.mensagem ?? '');
}

/** Notificações geradas pela fila (HU8, HU12, HU14). */
function Notificacoes() {
  const { dados: notificacoes, erro, carregando, recarregar } = useCarregar(() => notificacaoService.listar());
  if (carregando) return <Spinner color="terra.500" />;
  if (erro) return <Text color="red.300">{erro}</Text>;
  if (!notificacoes?.length) return <Text color="whiteAlpha.700">Nenhuma notificação.</Text>;
  return (
    <VStack align="stretch" spacing={2}>
      {notificacoes.map(n => (
        <Flex key={n.id} p={3} bg={n.lida ? 'whiteAlpha.50' : 'whiteAlpha.200'} borderRadius="md" justify="space-between" align="center" gap={3} border="1px solid" borderColor={n.lida ? 'transparent' : 'terra.500'}>
          <Box>
            <HStack>
              <Text fontWeight="semibold">{TEXTO_EVENTO[n.tipoEvento] ?? n.tipoEvento}</Text>
              {!n.lida && <Badge colorScheme="orange">nova</Badge>}
            </HStack>
            <Text fontSize="sm" color="whiteAlpha.800">
              {descrever(n)}
            </Text>
            <Text fontSize="xs" color="whiteAlpha.500">
              {dataBr(n.dataEnvio, true)}
            </Text>
          </Box>
          {!n.lida && (
            <Button size="xs" variant="ghost" onClick={() => void notificacaoService.marcarLida(n.id).then(recarregar)}>
              Marcar como lida
            </Button>
          )}
        </Flex>
      ))}
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
        {tab === 'notifications' && <Notificacoes />}
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
