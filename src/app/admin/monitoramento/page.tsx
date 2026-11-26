'use client';
import { useCallback, useEffect, useState } from 'react';
import NextLink from 'next/link';
import { Badge, Box, Button, Flex, Heading, SimpleGrid, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr, VStack } from '@chakra-ui/react';
import { Navbar } from '@/components/Navbar';
import { RoleGate } from '@/components/Portal';
import { BarList, CartaoMetrica } from '@/components/ui';
import { useCarregar } from '@/hooks/useCarregar';
import { monitoramentoService, type SondagemDoNavegador, type SondaApi } from '@/services/monitoramentoService';

const JANELAS: [number, string][] = [
  [300, '5 min'],
  [900, '15 min'],
  [3600, '1 h'],
];
const ATUALIZACAO_MS = 10_000;

/** Gráfico de linha mínimo em SVG (sem biblioteca): série de valores no tempo. */
function Sparkline({ valores, titulo, cor = '#D9A066', unidade = '' }: { valores: number[]; titulo: string; cor?: string; unidade?: string }) {
  const largura = 300;
  const altura = 64;
  const maximo = Math.max(...valores, 1);
  const pontos = valores.map((v, i) => `${valores.length > 1 ? (i / (valores.length - 1)) * largura : 0},${altura - 4 - (v / maximo) * (altura - 8)}`).join(' ');
  const ultimo = valores.length ? valores[valores.length - 1] : 0;
  return (
    <Box p={4} bg="whiteAlpha.100" borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200">
      <Flex justify="space-between" align="baseline">
        <Text fontSize="sm" color="whiteAlpha.800">
          {titulo}
        </Text>
        <Text fontSize="xs" color="whiteAlpha.600">
          pico {maximo.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
          {unidade}
        </Text>
      </Flex>
      <svg viewBox={`0 0 ${largura} ${altura}`} width="100%" height={altura} role="img" aria-label={`${titulo}: último valor ${ultimo}${unidade}, pico ${maximo}${unidade}`}>
        <line x1="0" y1={altura - 4} x2={largura} y2={altura - 4} stroke="#ffffff33" strokeWidth="1" />
        {valores.some(v => v > 0) && <polyline points={pontos} fill="none" stroke={cor} strokeWidth="2" strokeLinejoin="round" />}
      </svg>
    </Box>
  );
}

const num = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const ms = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ms`;
const duracao = (s: number) => (s < 120 ? `${s} s` : s < 7200 ? `${Math.round(s / 60)} min` : `${Math.round(s / 3600)} h`);

function LinhaSonda({ s }: { s: SondaApi }) {
  return (
    <Tr>
      <Td>
        {s.alvo === 'banco' ? 'PostgreSQL' : 'Redis'} <Badge colorScheme={s.disponivel ? 'green' : 'red'}>{s.disponivel ? 'no ar' : 'fora do ar'}</Badge>
      </Td>
      <Td isNumeric>{ms(s.rttMs.mediana)}</Td>
      <Td isNumeric>{ms(s.rttMs.p95)}</Td>
      <Td isNumeric>{ms(s.jitterMs)}</Td>
      <Td isNumeric>
        {s.perdaPct}% ({s.falhas}/{s.tentativas})
      </Td>
    </Tr>
  );
}

function Painel() {
  const [janela, setJanela] = useState(300);
  const [automatico, setAutomatico] = useState(true);
  const { dados: m, erro, carregando, recarregar } = useCarregar(() => monitoramentoService.coletar(janela), [janela]);
  const [sondagem, setSondagem] = useState<SondagemDoNavegador | null>(null);
  const [sondando, setSondando] = useState(false);

  useEffect(() => {
    if (!automatico) return;
    const id = setInterval(recarregar, ATUALIZACAO_MS);
    return () => clearInterval(id);
  }, [automatico, recarregar]);

  const sondarConexao = useCallback(async () => {
    setSondando(true);
    setSondagem(await monitoramentoService.sondar());
    setSondando(false);
  }, []);

  return (
    <Box maxW="1100px" mx="auto" p={{ base: 4, md: 8 }}>
      <Box mb={6}>
        <Text color="terra.500" fontSize="sm" fontWeight="bold" textTransform="uppercase">
          Administração · Observabilidade
        </Text>
        <Heading size="xl" mt={1}>
          Monitoramento de rede
        </Heading>
        <Text color="whiteAlpha.700" mt={2}>
          Métricas reais medidas pela API: latência, vazão, jitter e perda das requisições, e o tempo de ida e volta até o banco e o Redis.
        </Text>
      </Box>

      <VStack align="stretch" spacing={5}>
        <Flex gap={3} wrap="wrap" align="center" borderBottom="1px solid" borderColor="whiteAlpha.200" pb={4}>
          <Button as={NextLink} href="/admin" variant="ghost" size="sm">
            ← Painel administrativo
          </Button>
          {JANELAS.map(([s, rotulo]) => (
            <Button key={s} size="sm" onClick={() => setJanela(s)} aria-pressed={janela === s} {...(janela === s ? { bg: 'terra.500', color: 'black', _hover: { bg: 'terra.600' } } : { variant: 'outline' })}>
              {rotulo}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => setAutomatico(a => !a)} aria-pressed={automatico}>
            {automatico ? `Atualizando a cada ${ATUALIZACAO_MS / 1000} s` : 'Atualização pausada'}
          </Button>
          <Button size="sm" variant="outline" onClick={recarregar}>
            Atualizar agora
          </Button>
        </Flex>

        {carregando && !m ? (
          <Spinner color="terra.500" />
        ) : erro ? (
          <Text color="red.300" role="alert">
            {erro}
          </Text>
        ) : m ? (
          <>
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4}>
              <CartaoMetrica titulo="Vazão" valor={`${num(m.rede.requisicoesPorSegundo)} req/s`} detalhe={`${num(m.rede.kbPorSegundo)} KB/s enviados · ${m.rede.total} requisições na janela`} />
              <CartaoMetrica titulo="Latência p95" valor={ms(m.rede.latenciaMs.p95)} detalhe={`p50 ${ms(m.rede.latenciaMs.p50)} · p99 ${ms(m.rede.latenciaMs.p99)}`} />
              <CartaoMetrica titulo="Jitter" valor={ms(m.rede.jitterMs)} detalhe="variação entre requisições consecutivas" />
              <CartaoMetrica titulo="Falhas (perda)" valor={`${num(m.rede.taxaDeFalhaPct)}%`} detalhe={`${m.rede.errosServidor} erros 5xx · ${m.rede.interrompidas} interrompidas · ${m.rede.errosCliente} erros 4xx`} />
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Sparkline titulo="Latência p95 por intervalo" valores={m.serie.map(p => p.p95Ms)} unidade=" ms" />
              <Sparkline titulo="Requisições por intervalo" valores={m.serie.map(p => p.requisicoes)} cor="#7FB77E" />
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Box p={5} bg="whiteAlpha.100" borderRadius="xl">
                <Heading size="sm" mb={3}>
                  Rotas mais lentas (p95)
                </Heading>
                <BarList itens={m.rotasMaisLentas.map(r => ({ rotulo: `${r.rota} (${r.requisicoes})`, valor: r.p95Ms }))} formatar={ms} vazio="Sem requisições na janela." />
              </Box>
              <Box p={5} bg="whiteAlpha.100" borderRadius="xl" overflowX="auto">
                <Heading size="sm" mb={3}>
                  Dependências (sonda de {m.dependencias[0]?.tentativas ?? 0} idas e voltas)
                </Heading>
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th color="whiteAlpha.700">Serviço</Th>
                      <Th isNumeric color="whiteAlpha.700">RTT mediano</Th>
                      <Th isNumeric color="whiteAlpha.700">RTT p95</Th>
                      <Th isNumeric color="whiteAlpha.700">Jitter</Th>
                      <Th isNumeric color="whiteAlpha.700">Perda</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {m.dependencias.map(s => (
                      <LinhaSonda key={s.alvo} s={s} />
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4}>
              <CartaoMetrica titulo="Laço de eventos (p99)" valor={ms(m.processo.lacoDeEventos.p99Ms)} detalhe={`máx ${ms(m.processo.lacoDeEventos.maxMs)} · alto = processo saturado`} />
              <CartaoMetrica titulo="Memória (RSS)" valor={`${num(m.processo.memoriaRssMb)} MB`} detalhe={`heap ${num(m.processo.memoriaHeapMb)} MB`} />
              <CartaoMetrica titulo="Eventos na fila (outbox)" valor={m.filaDeEventos.pendentes} detalhe={m.filaDeEventos.maisAntigoHaSegundos === null ? 'nenhum pendente' : `o mais antigo espera há ${duracao(m.filaDeEventos.maisAntigoHaSegundos)}`} />
              <CartaoMetrica titulo="Instância" valor={duracao(m.instancia.ativaHaSegundos)} detalhe={`${m.instancia.ambiente} · pid ${m.instancia.pid}`} />
            </SimpleGrid>

            <Box p={5} bg="whiteAlpha.100" borderRadius="xl">
              <Flex justify="space-between" align="center" wrap="wrap" gap={3} mb={3}>
                <Box>
                  <Heading size="sm">Sua conexão com a API</Heading>
                  <Text fontSize="sm" color="whiteAlpha.700">
                    10 chamadas a /health feitas pelo seu navegador: mede a rede real entre você e a API (inclui TLS e o processamento do /health).
                  </Text>
                </Box>
                <Button size="sm" bg="terra.500" color="black" _hover={{ bg: 'terra.600' }} onClick={sondarConexao} isLoading={sondando} loadingText="Medindo...">
                  Medir agora
                </Button>
              </Flex>
              {sondagem ? (
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                  <CartaoMetrica titulo="RTT mediano" valor={ms(sondagem.rttMs.mediana)} detalhe={`mín ${ms(sondagem.rttMs.min)} · máx ${ms(sondagem.rttMs.max)}`} />
                  <CartaoMetrica titulo="RTT p95" valor={ms(sondagem.rttMs.p95)} />
                  <CartaoMetrica titulo="Jitter" valor={ms(sondagem.jitterMs)} />
                  <CartaoMetrica titulo="Perda" valor={`${sondagem.perdaPct}%`} detalhe={`${sondagem.falhas} de ${sondagem.tentativas} sem resposta`} />
                </SimpleGrid>
              ) : (
                <Text fontSize="sm" color="whiteAlpha.600">
                  Ainda não medido nesta sessão.
                </Text>
              )}
            </Box>

            <Text fontSize="xs" color="whiteAlpha.600">
              Atualizado em {new Date(m.geradoEm).toLocaleTimeString('pt-BR')}. As requisições ficam na memória da instância que respondeu: em serverless (Vercel), cada instância tem as suas e elas
              zeram quando a instância é reciclada; as sondas ao banco e ao Redis são feitas na hora, a cada consulta.
            </Text>
          </>
        ) : null}
      </VStack>
    </Box>
  );
}

export default function MonitoramentoPage() {
  return (
    <RoleGate role="administrador">
      <Box minH="100vh" bg="#171412" color="white">
        <Navbar />
        <Painel />
      </Box>
    </RoleGate>
  );
}
