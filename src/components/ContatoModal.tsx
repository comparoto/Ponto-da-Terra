'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Select,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import { useSession } from '@/hooks/useSession';

const EMAIL = 'contato@pontodaterra.com.br';

const ASSUNTOS = ['Dúvida sobre um pedido', 'Quero vender minhas peças', 'Problema no site', 'Sugestão ou elogio', 'Outro assunto'];

const campo = {
  bg: 'whiteAlpha.100',
  border: '1px solid',
  borderColor: 'whiteAlpha.300',
  color: 'white',
  _placeholder: { color: 'whiteAlpha.500' },
  _focus: { borderColor: 'terra.500', boxShadow: '0 0 0 1px #D9B596' },
};

/** Atalhos para as dúvidas mais comuns, antes de escrever um e-mail */
const ATALHOS = [
  { titulo: 'Acompanhar um pedido', texto: 'Status, código de rastreio e confirmação de entrega', destino: '/meus-pedidos', icone: '📦' },
  { titulo: 'Quero vender aqui', texto: 'Como se formalizar e cadastrar o seu ateliê', destino: '/orientacao', icone: '🏺' },
  { titulo: 'Falar com um artesão', texto: 'Abra a peça e use "Contatar produtor"', destino: '/produtos', icone: '💬' },
  { titulo: 'Termos e privacidade', texto: 'Trocas, pagamentos e uso dos seus dados', destino: '/termos', icone: '📄' },
];

export function ContatoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const session = useSession();
  const [assunto, setAssunto] = useState(ASSUNTOS[0]);
  const [mensagem, setMensagem] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [semMensagem, setSemMensagem] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      /* navegador sem permissão de área de transferência: o e-mail continua visível para copiar à mão */
    }
  };

  const linkEmail = () => {
    const assinatura = session ? `\n\n— ${session.name} (${session.email})` : '';
    const corpo = `${mensagem.trim()}${assinatura}`;
    return `mailto:${EMAIL}?subject=${encodeURIComponent(`[Ponto da Terra] ${assunto}`)}&body=${encodeURIComponent(corpo)}`;
  };

  const ir = (destino: string) => {
    onClose();
    router.push(destino);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(6px)" />
      <ModalContent bg="#1F1B19" color="white" border="1px solid" borderColor="whiteAlpha.200" borderRadius="2xl" overflow="hidden" mx={4}>
        <ModalCloseButton color="whiteAlpha.800" top={4} right={4} />

        {/* Cabeçalho */}
        <Box px={{ base: 6, md: 8 }} pt={8} pb={6} bgGradient="linear(to-br, #3A2E26, #1F1B19)" borderBottom="1px solid" borderColor="whiteAlpha.100">
          <Text color="terra.500" fontSize="xs" fontWeight="bold" letterSpacing="widest" textTransform="uppercase">
            Contato
          </Text>
          <Heading fontFamily="heading" size="lg" mt={1}>
            Fale com a gente
          </Heading>
          <Text color="whiteAlpha.700" mt={2} maxW="520px">
            Estamos aqui para ajudar compradores e artesãos. Escolha um atalho abaixo ou escreva para a nossa equipe.
          </Text>
        </Box>

        <ModalBody px={{ base: 6, md: 8 }} py={6}>
          <VStack align="stretch" spacing={7}>
            {/* E-mail */}
            <Flex
              align={{ base: 'stretch', sm: 'center' }}
              direction={{ base: 'column', sm: 'row' }}
              gap={4}
              p={4}
              borderRadius="xl"
              bg="whiteAlpha.100"
              border="1px solid"
              borderColor="whiteAlpha.200"
            >
              <Flex align="center" justify="center" boxSize="48px" borderRadius="full" bg="terra.500" color="black" fontSize="xl" flexShrink={0} aria-hidden>
                ✉
              </Flex>
              <Box flex="1" minW={0}>
                <Text fontSize="sm" color="whiteAlpha.600">
                  E-mail de atendimento
                </Text>
                <Text fontWeight="bold" fontSize="lg" wordBreak="break-all">
                  {EMAIL}
                </Text>
              </Box>
              <Button size="sm" variant="outline" borderColor="terra.500" color="terra.500" _hover={{ bg: 'whiteAlpha.100' }} onClick={copiar} aria-live="polite">
                {copiado ? '✓ Copiado' : 'Copiar'}
              </Button>
            </Flex>

            {/* Mensagem rápida */}
            <Box>
              <Heading size="sm" mb={3}>
                Envie sua mensagem
              </Heading>
              <VStack align="stretch" spacing={3}>
                <Select aria-label="Assunto" value={assunto} onChange={e => setAssunto(e.target.value)} sx={{ '& option': { color: '#fff', backgroundColor: '#2C2724' } }} {...campo}>
                  {ASSUNTOS.map(a => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
                <Textarea
                  aria-label="Mensagem"
                  placeholder="Conte como podemos ajudar. Se for sobre um pedido, inclua o código (ex.: PT-…)."
                  rows={4}
                  value={mensagem}
                  onChange={e => {
                    setMensagem(e.target.value);
                    setSemMensagem(false);
                  }}
                  {...campo}
                />
                <HStack justify="space-between" flexWrap="wrap" gap={2}>
                  {semMensagem ? (
                    <Text fontSize="sm" color="orange.200" role="alert">
                      Escreva sua mensagem antes de enviar.
                    </Text>
                  ) : (
                    <Text fontSize="xs" color="whiteAlpha.700">
                      Abre o seu aplicativo de e-mail com a mensagem pronta.
                    </Text>
                  )}
                  <Button
                    as="a"
                    href={linkEmail()}
                    bg="terra.500"
                    color="black"
                    _hover={{ bg: 'terra.600' }}
                    onClick={e => {
                      if (!mensagem.trim()) {
                        e.preventDefault();
                        setSemMensagem(true);
                      }
                    }}
                  >
                    Enviar por e-mail
                  </Button>
                </HStack>
              </VStack>
            </Box>

            {/* Atalhos */}
            <Box>
              <Heading size="sm" mb={3}>
                Talvez a resposta já esteja aqui
              </Heading>
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                {ATALHOS.map(a => (
                  <Flex
                    key={a.titulo}
                    as="button"
                    type="button"
                    onClick={() => ir(a.destino)}
                    textAlign="left"
                    gap={3}
                    p={3}
                    borderRadius="lg"
                    bg="whiteAlpha.50"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    transition="all 0.2s"
                    _hover={{ borderColor: 'terra.500', bg: 'whiteAlpha.100', transform: 'translateY(-1px)' }}
                  >
                    <Text fontSize="xl" aria-hidden>
                      {a.icone}
                    </Text>
                    <Box>
                      <Text fontWeight="semibold">{a.titulo}</Text>
                      <Text fontSize="sm" color="whiteAlpha.700">
                        {a.texto}
                      </Text>
                    </Box>
                  </Flex>
                ))}
              </SimpleGrid>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
