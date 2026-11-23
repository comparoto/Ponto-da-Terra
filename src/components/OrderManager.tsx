'use client';
import { useState } from 'react';
import { Box, Button, Collapse, Flex, HStack, Input, Select, Spinner, Text, Textarea, VStack } from '@chakra-ui/react';
import { brl, dataBr, StatusPedidoBadge } from '@/components/ui';
import { useCarregar } from '@/hooks/useCarregar';
import { mensagemDeErro } from '@/services/http';
import { pedidoService, type FiltroPedidosAdmin, type Pedido } from '@/services/pedidoService';

const campo = { bg: 'whiteAlpha.100', borderColor: 'whiteAlpha.300', color: 'white' };

function Itens({ pedido }: { pedido: Pedido }) {
  return (
    <Text color="whiteAlpha.800" fontSize="sm">
      {pedido.itens.map(i => `${i.quantidade}x ${i.titulo}`).join(' · ')}
    </Text>
  );
}

/** HU13: pedidos recebidos pelo artesão, com atualização de status e rastreio obrigatório para postar. */
function PedidoArtesao({ pedido, onAtualizar }: { pedido: Pedido; onAtualizar: () => void }) {
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const end = pedido.entrega?.endereco;

  async function mudar(status: 'EM_PRODUCAO' | 'DESPACHADO' | 'ENTREGUE') {
    setErro('');
    if (status === 'DESPACHADO' && !codigo.trim()) {
      setErro('Informe o código de rastreio dos Correios antes de confirmar a postagem.');
      return;
    }
    setEnviando(true);
    const res = await pedidoService.atualizarStatus(pedido.id, status, status === 'DESPACHADO' ? codigo : undefined);
    setEnviando(false);
    if (!res.success) {
      setErro(mensagemDeErro(res));
      return;
    }
    onAtualizar();
  }

  const podePostar = pedido.status === 'PAGO' || pedido.status === 'EM_PRODUCAO';

  return (
    <Box bg="whiteAlpha.100" p={4} borderRadius="lg" border="1px solid" borderColor={pedido.atrasado ? 'red.400' : 'transparent'}>
      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={3}>
        <Box>
          <Text fontWeight="bold">
            {pedido.codigoCompra} · {brl(pedido.valorTotal)}
          </Text>
          <Text color="whiteAlpha.700" fontSize="sm">
            {pedido.comprador?.nome} · {dataBr(pedido.dataPedido, true)}
            {pedido.entrega?.dataPrevista && podePostar ? ` · entregar até ${dataBr(pedido.entrega.dataPrevista)}` : ''}
          </Text>
          <Itens pedido={pedido} />
          {end && (
            <Text color="whiteAlpha.600" fontSize="xs" mt={1}>
              Entrega: {end.rua}, {end.numero}
              {end.complemento ? ` (${end.complemento})` : ''} · {end.cidade}/{end.estado} · CEP {end.cep}
            </Text>
          )}
          {pedido.entrega?.codigoRastreio && (
            <Text fontSize="sm" mt={1}>
              Rastreio: <b>{pedido.entrega.codigoRastreio}</b>
            </Text>
          )}
        </Box>
        <StatusPedidoBadge status={pedido.status} atrasado={pedido.atrasado} />
      </Flex>

      {pedido.status === 'AGUARDANDO_PAGAMENTO' && (
        <Text mt={3} fontSize="sm" color="yellow.200">
          Aguardando a confirmação do pagamento. Não envie a peça ainda.
        </Text>
      )}

      {(podePostar || pedido.status === 'DESPACHADO') && (
        <Flex mt={3} gap={2} wrap="wrap" align="center">
          {pedido.status === 'PAGO' && (
            <Button size="sm" variant="outline" isLoading={enviando} onClick={() => mudar('EM_PRODUCAO')}>
              Iniciar produção
            </Button>
          )}
          {podePostar && (
            <>
              <Input size="sm" maxW="220px" placeholder="Código de rastreio (ex.: AA123456789BR)" aria-label="Código de rastreio" value={codigo} onChange={e => setCodigo(e.target.value)} {...campo} />
              <Button size="sm" bg="terra.500" color="black" isLoading={enviando} onClick={() => mudar('DESPACHADO')}>
                Marcar como postado
              </Button>
            </>
          )}
          {pedido.status === 'DESPACHADO' && (
            <Button size="sm" colorScheme="green" isLoading={enviando} onClick={() => mudar('ENTREGUE')}>
              Marcar como entregue
            </Button>
          )}
        </Flex>
      )}
      {erro && (
        <Text color="red.300" fontSize="sm" mt={2} role="alert">
          {erro}
        </Text>
      )}
    </Box>
  );
}

/** HU10: acompanhamento operacional pelo admin, com filtros e notas de intervenção. */
function PedidoAdmin({ pedido, onAtualizar }: { pedido: Pedido; onAtualizar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [nota, setNota] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function registrar() {
    setSalvando(true);
    const res = await pedidoService.registrarIntervencao(pedido.id, nota);
    setSalvando(false);
    if (!res.success) {
      setErro(mensagemDeErro(res));
      return;
    }
    setNota('');
    setErro('');
    onAtualizar();
  }

  return (
    <Box bg="whiteAlpha.100" p={4} borderRadius="lg" border="1px solid" borderColor={pedido.atrasado ? 'red.400' : 'transparent'}>
      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={3}>
        <Box>
          <Text fontWeight="bold">
            {pedido.codigoCompra} · {brl(pedido.valorTotal)} · {pedido.diasEmAberto} dia(s) em aberto
          </Text>
          <Text color="whiteAlpha.700" fontSize="sm">
            Comprador: {pedido.comprador?.nome} ({pedido.comprador?.email}) · Artesão: {pedido.artesao.nome}
          </Text>
          <Itens pedido={pedido} />
        </Box>
        <VStack align="flex-end" spacing={2}>
          <StatusPedidoBadge status={pedido.status} atrasado={pedido.atrasado} />
          <Button size="xs" variant="ghost" onClick={() => setAberto(a => !a)}>
            {aberto ? 'Fechar' : `Intervenções (${pedido.intervencoes?.length ?? 0})`}
          </Button>
        </VStack>
      </Flex>
      <Collapse in={aberto} animateOpacity>
        <VStack align="stretch" mt={3} spacing={2}>
          {pedido.intervencoes?.map(n => (
            <Box key={n.id} p={2} bg="blackAlpha.400" borderRadius="md">
              <Text fontSize="xs" color="whiteAlpha.600">
                {dataBr(n.criadoEm, true)}
              </Text>
              <Text fontSize="sm">{n.nota}</Text>
            </Box>
          ))}
          <Textarea size="sm" rows={2} placeholder="Nota interna (ex.: comprador relatou atraso; artesão contatado)" value={nota} onChange={e => setNota(e.target.value)} {...campo} />
          {erro && (
            <Text color="red.300" fontSize="sm">
              {erro}
            </Text>
          )}
          <Button size="sm" alignSelf="flex-start" bg="terra.500" color="black" isLoading={salvando} onClick={registrar}>
            Registrar intervenção
          </Button>
        </VStack>
      </Collapse>
    </Box>
  );
}

const FILTROS: [FiltroPedidosAdmin, string][] = [
  ['', 'Todos'],
  ['AGUARDANDO_PAGAMENTO', 'Aguardando pagamento'],
  ['AGUARDANDO_ENVIO', 'Aguardando envio'],
  ['ATRASADO', 'Atrasados'],
  ['DESPACHADO', 'Postados'],
  ['ENTREGUE', 'Entregues'],
  ['CANCELADO', 'Cancelados'],
];

export function OrderManager({ artisanOnly = false }: { artisanOnly?: boolean }) {
  const [filtro, setFiltro] = useState<FiltroPedidosAdmin>('');
  const { dados: pedidos, erro, carregando, recarregar } = useCarregar(() => (artisanOnly ? pedidoService.doArtesao() : pedidoService.todos(filtro)), [artisanOnly, filtro]);

  return (
    <VStack align="stretch" spacing={3}>
      {!artisanOnly && (
        <Select maxW="260px" value={filtro} onChange={e => setFiltro(e.target.value as FiltroPedidosAdmin)} aria-label="Filtrar pedidos" sx={{ '& option': { color: '#fff', backgroundColor: '#2C2724' } }} {...campo}>
          {FILTROS.map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Select>
      )}
      {carregando ? (
        <Spinner color="terra.500" />
      ) : erro ? (
        <Text color="red.300">{erro}</Text>
      ) : !pedidos?.length ? (
        <Text color="whiteAlpha.700">{artisanOnly ? 'Você ainda não recebeu pedidos.' : 'Nenhum pedido encontrado com esse filtro.'}</Text>
      ) : (
        pedidos.map(p => (artisanOnly ? <PedidoArtesao key={p.id} pedido={p} onAtualizar={recarregar} /> : <PedidoAdmin key={p.id} pedido={p} onAtualizar={recarregar} />))
      )}
      <HStack>
        <Button size="sm" variant="ghost" onClick={recarregar}>
          Atualizar lista
        </Button>
      </HStack>
    </VStack>
  );
}
