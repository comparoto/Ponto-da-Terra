'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Alert, AlertIcon, Badge, Box, Button, Code, Flex, Heading, HStack, Image, Link, Spinner, Text, VStack, useClipboard } from '@chakra-ui/react';
import { Navbar } from '@/components/Navbar';
import { RoleGate } from '@/components/Portal';
import { brl, dataBr } from '@/components/ui';
import { useCarregar } from '@/hooks/useCarregar';
import { mensagemDeErro, urlImagem } from '@/services/http';
import { compraService } from '@/services/pedidoService';

const STATUS_COMPRA = {
  AGUARDANDO_PAGAMENTO: { texto: 'Aguardando pagamento', cor: 'yellow' },
  PAGA: { texto: 'Pagamento confirmado', cor: 'green' },
  CANCELADA: { texto: 'Cancelada', cor: 'red' },
} as const;

/**
 * Tempo restante até a expiração do PIX/boleto, atualizado a cada segundo.
 * Usa a diferença entre a hora do servidor e a do aparelho, para não depender
 * de o relógio do comprador estar certo.
 */
function useContagem(ate: string | null | undefined, diferencaRelogioMs = 0) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!ate) return null;
  const ms = Math.max(0, new Date(ate).getTime() - (agora + diferencaRelogioMs));
  const min = Math.floor(ms / 60_000);
  const seg = Math.floor((ms % 60_000) / 1000);
  return { ms, texto: `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}` };
}

function CompraContent() {
  const { codigo } = useParams<{ codigo: string }>();
  const router = useRouter();
  const { dados: compra, erro, carregando, recarregar } = useCarregar(() => compraService.detalhe(codigo), [codigo]);
  const [simulando, setSimulando] = useState(false);
  const [erroAcao, setErroAcao] = useState('');
  const { onCopy, hasCopied } = useClipboard(compra?.pagamento?.pixCopiaECola ?? compra?.pagamento?.linhaDigitavel ?? '');
  const pendente = compra?.status === 'AGUARDANDO_PAGAMENTO';
  const contagem = useContagem(pendente && compra?.pagamento?.metodo === 'PIX' ? compra.pagamento.expiraEm : null, compra?.diferencaRelogioMs);

  // Enquanto o PIX/boleto estiver pendente, consulta o status a cada 4 s (o pagamento chega pelo webhook)
  useEffect(() => {
    if (!pendente) return;
    const t = setInterval(recarregar, 4000);
    return () => clearInterval(t);
  }, [pendente, recarregar]);

  async function simular() {
    setSimulando(true);
    setErroAcao('');
    const res = await compraService.simularPagamento(codigo);
    setSimulando(false);
    if (!res.success) setErroAcao(mensagemDeErro(res));
    recarregar();
  }

  if (carregando && !compra) {
    return (
      <Flex minH="60vh" align="center" justify="center">
        <Spinner color="terra.500" size="xl" />
      </Flex>
    );
  }
  if (erro || !compra) {
    return (
      <VStack py={20} spacing={4}>
        <Text color="red.300">{erro ?? 'Compra não encontrada.'}</Text>
        <Button onClick={() => router.push('/meus-pedidos')}>Ir para Meus Pedidos</Button>
      </VStack>
    );
  }

  const pg = compra.pagamento;
  const status = STATUS_COMPRA[compra.status];

  return (
    <Box maxW="820px" mx="auto" p={{ base: 4, md: 8 }}>
      <VStack align="stretch" spacing={6} bg="blackAlpha.700" p={{ base: 5, md: 8 }} borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200">
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
          <Box>
            <Text color="whiteAlpha.700" fontSize="sm">
              Compra {compra.codigo} · {dataBr(compra.criadoEm, true)}
            </Text>
            <Heading size="lg" fontFamily="heading">
              {compra.status === 'PAGA' ? 'Pedido confirmado!' : compra.status === 'CANCELADA' ? 'Compra cancelada' : 'Falta pouco: conclua o pagamento'}
            </Heading>
          </Box>
          <Badge colorScheme={status.cor} variant="solid" px={3} py={1} borderRadius="md" fontSize="sm">
            {status.texto}
          </Badge>
        </Flex>

        {pg?.metodo === 'PIX' && pendente && (
          <Flex direction={{ base: 'column', md: 'row' }} gap={6} align="center">
            {pg.pixQrCode && <Image src={pg.pixQrCode} alt="QR Code do PIX" boxSize="220px" bg="white" p={2} borderRadius="md" />}
            <VStack align="stretch" flex="1" spacing={3}>
              <Text>Escaneie o QR Code no app do seu banco ou use o código &quot;copia e cola&quot;:</Text>
              <Code p={3} borderRadius="md" fontSize="xs" whiteSpace="pre-wrap" wordBreak="break-all" bg="whiteAlpha.200" color="white">
                {pg.pixCopiaECola}
              </Code>
              <Button onClick={onCopy} variant="outline">
                {hasCopied ? 'Código copiado!' : 'Copiar código PIX'}
              </Button>
              {contagem && (
                <Text color={contagem.ms < 5 * 60_000 ? 'orange.200' : 'whiteAlpha.800'} role="timer">
                  Expira em {contagem.texto}. Depois disso a reserva das peças é liberada.
                </Text>
              )}
            </VStack>
          </Flex>
        )}

        {pg?.metodo === 'BOLETO' && pendente && (
          <VStack align="stretch" spacing={3}>
            <Text>
              Vencimento: <b>{dataBr(pg.expiraEm)}</b> (3 dias úteis)
            </Text>
            <Code p={3} borderRadius="md" bg="whiteAlpha.200" color="white" wordBreak="break-all">
              {pg.linhaDigitavel}
            </Code>
            <HStack wrap="wrap">
              <Button onClick={onCopy} variant="outline">
                {hasCopied ? 'Linha copiada!' : 'Copiar linha digitável'}
              </Button>
              {pg.boletoUrl && (
                <Button as={Link} href={urlImagem(pg.boletoUrl)} isExternal bg="terra.500" color="black" _hover={{ bg: 'terra.600', textDecoration: 'none' }}>
                  Baixar boleto (PDF)
                </Button>
              )}
            </HStack>
          </VStack>
        )}

        {pendente && pg && (
          <Box p={4} bg="whiteAlpha.100" borderRadius="md">
            <Text fontSize="sm" color="whiteAlpha.700" mb={2}>
              Ambiente de demonstração: o pagamento é simulado. A confirmação chega automaticamente pelo webhook do gateway; para testar, simule abaixo.
            </Text>
            <Button size="sm" colorScheme="green" onClick={simular} isLoading={simulando}>
              Simular pagamento aprovado
            </Button>
            {erroAcao && (
              <Text color="red.300" mt={2}>
                {erroAcao}
              </Text>
            )}
          </Box>
        )}

        {compra.status === 'PAGA' && (
          <Alert status="success" borderRadius="md" bg="green.900" color="white">
            <AlertIcon />
            {pg?.metodo === 'CARTAO'
              ? `Pagamento aprovado no cartão final ${pg.cartaoFinal} em ${pg.parcelas}x de ${brl(pg.valorParcela)}.`
              : 'Pagamento confirmado.'}{' '}
            Os artesãos já foram avisados e vão preparar suas peças.
          </Alert>
        )}
        {compra.status === 'CANCELADA' && (
          <Alert status="warning" borderRadius="md" bg="orange.900" color="white">
            <AlertIcon />
            {pg?.status === 'EXPIRADO' ? 'O prazo de pagamento expirou e as peças voltaram para a vitrine.' : 'A compra foi cancelada e nenhum valor foi cobrado.'}
          </Alert>
        )}

        <Box>
          <Heading size="sm" mb={3}>
            {compra.pedidos.length > 1 ? `${compra.pedidos.length} pedidos (um por artesão)` : 'Itens'}
          </Heading>
          <VStack align="stretch" spacing={2}>
            {compra.pedidos.map(p => (
              <Box key={p.id} p={3} bg="whiteAlpha.100" borderRadius="md">
                <Text fontSize="sm" color="terra.500" fontWeight="semibold">
                  {p.artesao.nome}
                </Text>
                {p.itens.map(i => (
                  <Flex key={i.produtoId} justify="space-between" fontSize="sm">
                    <Text>
                      {i.quantidade}x {i.titulo}
                    </Text>
                    <Text>{brl(i.precoUnitario * i.quantidade)}</Text>
                  </Flex>
                ))}
              </Box>
            ))}
          </VStack>
          <Flex justify="space-between" mt={3} fontWeight="bold" color="terra.500">
            <Text>Total (com frete de {brl(compra.valorFrete)})</Text>
            <Text>{brl(compra.valorTotal)}</Text>
          </Flex>
        </Box>

        <Button variant="outline" onClick={() => router.push('/meus-pedidos')}>
          Acompanhar em Meus Pedidos
        </Button>
      </VStack>
    </Box>
  );
}

export default function CompraPage() {
  return (
    <RoleGate role="comprador">
      <Box minH="100vh" bgImage="linear-gradient(rgba(23, 20, 18, 0.8), rgba(23, 20, 18, 0.6)), url('/bg-pedidos.png')" bgSize="cover" bgAttachment="fixed" color="white">
        <Navbar />
        <CompraContent />
      </Box>
    </RoleGate>
  );
}
