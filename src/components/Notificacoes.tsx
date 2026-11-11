'use client';
import { Badge, Box, Button, Flex, HStack, Spinner, Text, VStack } from '@chakra-ui/react';
import { dataBr } from '@/components/ui';
import { useCarregar } from '@/hooks/useCarregar';
import { notificacaoService, type Notificacao } from '@/services/interacaoService';
import { SESSAO_ALTERADA } from '@/services/http';

const TEXTO_EVENTO: Record<string, string> = {
  NOVO_PEDIDO: 'Novo pedido recebido',
  PRODUTO_APROVADO: 'Peça aprovada',
  PRODUTO_REJEITADO: 'Peça reprovada',
  NOVA_MENSAGEM: 'Nova dúvida de comprador',
  PEDIDO_ATUALIZADO: 'Pedido atualizado',
  CADASTRO_APROVADO: 'Cadastro aprovado',
  CADASTRO_REJEITADO: 'Cadastro precisa de ajustes',
};

function descrever(n: Notificacao): string {
  const p = n.payload as Record<string, string | string[] | number | undefined>;
  if (n.tipoEvento === 'NOVO_PEDIDO') return `${p.codigoCompra} · ${Array.isArray(p.itens) ? p.itens.join(', ') : ''}`;
  if (n.tipoEvento === 'PRODUTO_REJEITADO') return `"${p.titulo}" — motivo: ${p.justificativa}`;
  if (n.tipoEvento === 'PRODUTO_APROVADO') return `"${p.titulo}" já está na vitrine.`;
  if (n.tipoEvento === 'NOVA_MENSAGEM') return `${p.comprador} sobre "${p.titulo}": ${p.trecho}`;
  const extra = [p.codigoCompra, p.codigoRastreio ? `rastreio ${p.codigoRastreio}` : null].filter(Boolean).join(' · ');
  return [p.mensagem, extra].filter(Boolean).join(' — ');
}

/** Avisa a barra superior para atualizar o contador de não lidas. */
const avisarMudanca = () => window.dispatchEvent(new Event(SESSAO_ALTERADA));

/** Lista de notificações do usuário logado (artesão, comprador ou admin). */
export function ListaNotificacoes() {
  const { dados: notificacoes, erro, carregando, recarregar } = useCarregar(() => notificacaoService.listar());
  if (carregando) return <Spinner color="terra.500" />;
  if (erro) return <Text color="red.300">{erro}</Text>;
  if (!notificacoes?.length) return <Text color="whiteAlpha.700">Nenhuma notificação por enquanto.</Text>;

  const temNaoLidas = notificacoes.some(n => !n.lida);
  return (
    <VStack align="stretch" spacing={2}>
      {temNaoLidas && (
        <Button
          size="sm"
          alignSelf="flex-end"
          variant="ghost"
          onClick={() =>
            void notificacaoService.marcarTodasLidas().then(() => {
              recarregar();
              avisarMudanca();
            })
          }
        >
          Marcar todas como lidas
        </Button>
      )}
      {notificacoes.map(n => (
        <Flex
          key={n.id}
          p={3}
          bg={n.lida ? 'whiteAlpha.50' : 'whiteAlpha.200'}
          borderRadius="md"
          justify="space-between"
          align="center"
          gap={3}
          border="1px solid"
          borderColor={n.lida ? 'transparent' : 'terra.500'}
        >
          <Box>
            <HStack>
              <Text fontWeight="semibold">{TEXTO_EVENTO[n.tipoEvento] ?? n.tipoEvento}</Text>
              {!n.lida && <Badge colorScheme="orange">nova</Badge>}
            </HStack>
            <Text fontSize="sm" color="whiteAlpha.800">
              {descrever(n)}
            </Text>
            <Text fontSize="xs" color="whiteAlpha.600">
              {dataBr(n.dataEnvio, true)}
            </Text>
          </Box>
          {!n.lida && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() =>
                void notificacaoService.marcarLida(n.id).then(() => {
                  recarregar();
                  avisarMudanca();
                })
              }
            >
              Marcar como lida
            </Button>
          )}
        </Flex>
      ))}
    </VStack>
  );
}
