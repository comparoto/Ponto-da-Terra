'use client';
import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Checkbox,
  Heading,
  Link,
  ListItem,
  OrderedList,
  Progress,
  Select,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import { Navbar } from '@/components/Navbar';
import { useSession } from '@/hooks/useSession';
import { ITENS_CHECKLIST, LINKS_OFICIAIS, POLOS, TRILHAS } from '@/data/orientacao';
import { mensagemDeErro } from '@/services/http';
import { painelService } from '@/services/interacaoService';

const CHAVE_LOCAL = 'ponto_da_terra_checklist_v1';

function lerChecklistLocal(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_LOCAL) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/**
 * HU15 cenário 3: checklist de documentos com percentual de prontidão.
 * Artesão logado → salvo no perfil (API). Visitante → salvo no navegador.
 */
function Checklist() {
  const session = useSession();
  const ehArtesao = session?.role === 'artesao';
  const [marcados, setMarcados] = useState<string[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let ativo = true;
    const carregar = ehArtesao ? painelService.checklist().then(r => (r.success && r.data ? r.data.itensConcluidos : [])) : Promise.resolve(lerChecklistLocal());
    void carregar.then(itens => {
      if (ativo) setMarcados(itens);
    });
    return () => {
      ativo = false;
    };
  }, [ehArtesao]);

  async function alternar(id: string) {
    const novos = marcados.includes(id) ? marcados.filter(i => i !== id) : [...marcados, id];
    setMarcados(novos);
    if (ehArtesao) {
      const res = await painelService.salvarChecklist(novos);
      setStatus(res.success ? 'Progresso salvo no seu perfil.' : mensagemDeErro(res));
    } else {
      localStorage.setItem(CHAVE_LOCAL, JSON.stringify(novos));
      setStatus('Progresso salvo neste navegador. Entre como artesão para salvar no seu perfil.');
    }
  }

  const percentual = Math.round((marcados.length / ITENS_CHECKLIST.length) * 100);

  return (
    <Box p={6} bg="whiteAlpha.100" borderRadius="xl">
      <Heading size="md" mb={2}>
        Checklist: o que você já tem?
      </Heading>
      <Text color="whiteAlpha.700" fontSize="sm" mb={4}>
        Marque os documentos e materiais que já estão prontos para dar entrada no processo oficial.
      </Text>
      <VStack align="stretch" spacing={3}>
        {ITENS_CHECKLIST.map(item => (
          <Checkbox key={item.id} colorScheme="orange" isChecked={marcados.includes(item.id)} onChange={() => void alternar(item.id)}>
            {item.rotulo}
          </Checkbox>
        ))}
      </VStack>
      <Box mt={5}>
        <Text fontWeight="bold" mb={1}>
          Prontidão: {percentual}%
        </Text>
        <Progress value={percentual} colorScheme="orange" borderRadius="full" aria-label={`Prontidão ${percentual}%`} />
        {status && (
          <Text fontSize="xs" color="whiteAlpha.600" mt={2} role="status">
            {status}
          </Text>
        )}
      </Box>
    </Box>
  );
}

export default function OrientacaoPage() {
  const [polo, setPolo] = useState(POLOS[1].polo);
  const selecionado = POLOS.find(p => p.polo === polo)!;

  return (
    <Box minH="100vh" bg="#171412" color="white">
      <Navbar />
      <Box maxW="1000px" mx="auto" p={{ base: 4, md: 8 }}>
        <Text color="terra.500" fontSize="sm" fontWeight="bold" textTransform="uppercase">
          Espaço do Artesão
        </Text>
        <Heading size="xl" mt={1} fontFamily="heading">
          Como se legalizar
        </Heading>
        <Text color="#E8DFD7" mt={3} mb={8}>
          Um passo a passo para tirar a Carteira Nacional do Artesão, formalizar seu trabalho como MEI e vender com segurança. As informações abaixo são de
          referência: confirme sempre nos canais oficiais.
        </Text>

        <Accordion allowMultiple defaultIndex={[0]} mb={8}>
          {TRILHAS.map(t => (
            <AccordionItem key={t.id} borderColor="whiteAlpha.200">
              <AccordionButton py={4} _hover={{ bg: 'whiteAlpha.100' }}>
                <Heading size="sm" flex="1" textAlign="left">
                  {t.titulo}
                </Heading>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={5}>
                <OrderedList spacing={2} color="#E8DFD7">
                  {t.passos.map(p => (
                    <ListItem key={p}>{p}</ListItem>
                  ))}
                </OrderedList>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <Box p={6} bg="whiteAlpha.100" borderRadius="xl">
            <Heading size="md" mb={2}>
              Onde procurar atendimento
            </Heading>
            <Select value={polo} onChange={e => setPolo(e.target.value)} aria-label="Polo regional" mb={4} bg="whiteAlpha.100" sx={{ '& option': { color: '#fff', backgroundColor: '#2C2724' } }}>
              {POLOS.map(p => (
                <option key={p.polo} value={p.polo}>
                  {p.polo}
                </option>
              ))}
            </Select>
            <Text fontSize="sm" color="whiteAlpha.700">
              Cidades: {selecionado.cidades.join(', ')}
            </Text>
            <Text mt={2}>{selecionado.ondeProcurar}</Text>
            <Heading size="sm" mt={5} mb={2}>
              Links oficiais
            </Heading>
            <VStack align="stretch" spacing={1}>
              {LINKS_OFICIAIS.map(l => (
                <Link key={l.url} href={l.url} isExternal color="terra.500" textDecoration="underline">
                  {l.rotulo}
                </Link>
              ))}
            </VStack>
          </Box>
          <Checklist />
        </SimpleGrid>
      </Box>
    </Box>
  );
}
