'use client';
import { Badge, Box, Button, Flex, HStack, Icon, type IconProps, Text, VStack } from '@chakra-ui/react';
import { COR_STATUS, ROTULO_STATUS, type EtapaLinhaDoTempo, type StatusPedido } from '@/services/pedidoService';

// ───────────── Ícones (traço, 24x24) ─────────────

const icone = (d: string | string[]) =>
  function IconeSvg(props: IconProps) {
    return (
      <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
        {(Array.isArray(d) ? d : [d]).map(p => (
          <path key={p} strokeLinecap="round" strokeLinejoin="round" d={p} />
        ))}
      </Icon>
    );
  };

export const SearchIcon = icone('M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z');
export const ShoppingBagIcon = icone('M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z');
export const FilterIcon = icone(
  'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
);
export const ArrowRightIcon = icone('M14 5l7 7m0 0l-7 7m7-7H3');
export const TrashIcon = icone(
  'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
);
export const CheckIcon = icone('M5 13l4 4L19 7');
export const EyeIcon = icone([
  'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
]);
export const BellIcon = icone('M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9');

// ───────────── Formatação ─────────────

export const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
export const dataBr = (iso: string | null | undefined, comHora = false) =>
  iso ? new Date(iso).toLocaleString('pt-BR', comHora ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' }) : '—';

// ───────────── Status do pedido ─────────────

export function StatusPedidoBadge({ status, atrasado }: { status: StatusPedido; atrasado?: boolean }) {
  return (
    <HStack spacing={1}>
      <Badge bg={`${COR_STATUS[status]}.700`} color="white" px={2} py={1} borderRadius="md">
        {ROTULO_STATUS[status]}
      </Badge>
      {atrasado && (
        <Badge colorScheme="red" px={2} py={1} borderRadius="md">
          Atrasado
        </Badge>
      )}
    </HStack>
  );
}

/** Linha do tempo do pedido (HU6): Pagamento Confirmado → Em Produção → Despachado → Entregue. */
export function LinhaDoTempo({ etapas }: { etapas: EtapaLinhaDoTempo[] }) {
  return (
    <Flex gap={0} direction={{ base: 'column', md: 'row' }} w="100%" role="list" aria-label="Linha do tempo do pedido">
      {etapas.map((e, i) => (
        <Flex key={e.etapa} role="listitem" flex="1" direction={{ base: 'row', md: 'column' }} align={{ base: 'center', md: 'flex-start' }} gap={2} position="relative">
          <HStack w="100%" spacing={0}>
            <Box
              boxSize="22px"
              borderRadius="full"
              flexShrink={0}
              bg={e.concluida ? 'terra.500' : 'whiteAlpha.300'}
              border="3px solid"
              borderColor={e.atual ? 'white' : 'transparent'}
              aria-current={e.atual ? 'step' : undefined}
            />
            {i < etapas.length - 1 && <Box display={{ base: 'none', md: 'block' }} flex="1" h="3px" bg={etapas[i + 1].concluida ? 'terra.500' : 'whiteAlpha.300'} />}
          </HStack>
          <Box pr={2}>
            <Text fontSize="sm" fontWeight={e.atual ? 'bold' : 'medium'} color={e.concluida ? 'white' : 'whiteAlpha.600'}>
              {e.etapa}
            </Text>
            <Text fontSize="xs" color="whiteAlpha.600">
              {e.data ? dataBr(e.data, true) : e.concluida ? '✓' : 'Pendente'}
            </Text>
          </Box>
        </Flex>
      ))}
    </Flex>
  );
}

// ───────────── Avaliação ─────────────

export function Estrelas({ nota, tamanho = 'md' }: { nota: number; tamanho?: 'sm' | 'md' }) {
  return (
    <Text as="span" color="terra.500" fontSize={tamanho} aria-label={`${nota.toFixed(1)} de 5 estrelas`} letterSpacing="1px">
      {[1, 2, 3, 4, 5].map(n => (n <= Math.round(nota) ? '★' : '☆')).join('')}
    </Text>
  );
}

export function SeletorEstrelas({ valor, onChange }: { valor: number; onChange: (n: number) => void }) {
  return (
    <HStack spacing={1} role="radiogroup" aria-label="Nota de 1 a 5">
      {[1, 2, 3, 4, 5].map(n => (
        <Button
          key={n}
          size="sm"
          variant="ghost"
          px={1}
          fontSize="2xl"
          color={n <= valor ? 'terra.500' : 'whiteAlpha.500'}
          role="radio"
          aria-checked={n === valor}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
        >
          {n <= valor ? '★' : '☆'}
        </Button>
      ))}
    </HStack>
  );
}

// ───────────── Gráfico de barras simples (sem biblioteca) ─────────────

export function BarList({ itens, formatar = v => String(v), vazio = 'Sem dados no período.' }: { itens: { rotulo: string; valor: number }[]; formatar?: (v: number) => string; vazio?: string }) {
  const maximo = Math.max(...itens.map(i => i.valor), 0);
  if (!itens.length || maximo === 0) return <Text color="whiteAlpha.600" fontSize="sm">{vazio}</Text>;
  return (
    <VStack align="stretch" spacing={2}>
      {itens.map(i => (
        <Box key={i.rotulo}>
          <Flex justify="space-between" fontSize="sm" mb={1} gap={2}>
            <Text noOfLines={1}>{i.rotulo}</Text>
            <Text color="terra.500" fontWeight="semibold" flexShrink={0}>
              {formatar(i.valor)}
            </Text>
          </Flex>
          <Box h="8px" bg="whiteAlpha.200" borderRadius="full" overflow="hidden">
            <Box h="100%" w={`${(i.valor / maximo) * 100}%`} bg="terra.500" borderRadius="full" />
          </Box>
        </Box>
      ))}
    </VStack>
  );
}

export function CartaoMetrica({ titulo, valor, detalhe }: { titulo: string; valor: string | number; detalhe?: string }) {
  return (
    <Box p={5} bg="whiteAlpha.100" borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200">
      <Text color="whiteAlpha.800" fontSize="sm">
        {titulo}
      </Text>
      <Text color="terra.500" fontSize="2xl" fontWeight="bold" fontFamily="heading">
        {valor}
      </Text>
      {detalhe && (
        <Text color="whiteAlpha.600" fontSize="xs">
          {detalhe}
        </Text>
      )}
    </Box>
  );
}
