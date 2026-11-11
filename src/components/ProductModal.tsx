'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, Image, Box, Flex, Heading, Text, Badge, Button, HStack, IconButton, Divider, Textarea, VStack } from '@chakra-ui/react';
import { Peca } from '@/types';
import { MSG_LIMITE_ESTOQUE, useCart } from '@/store/cartStore';
import { CheckIcon, Estrelas, ShoppingBagIcon as CartAddIcon, dataBr } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import NextLink from 'next/link';
import { BotaoFavorito } from '@/components/BotaoFavorito';
import { mensagemDeErro } from '@/services/http';
import { avaliacaoService, mensagemService, type ResumoAvaliacoes } from '@/services/interacaoService';

interface ProductModalProps {
  peca: Peca | null;
  isOpen: boolean;
  onClose: () => void;
}

/** HU17: média e últimas avaliações da peça. */
function Avaliacoes({ produtoId }: { produtoId: string }) {
  const [resumo, setResumo] = useState<ResumoAvaliacoes | null>(null);
  useEffect(() => {
    let ativo = true;
    void avaliacaoService.doProduto(produtoId).then(r => {
      if (ativo && r.success) setResumo(r.data);
    });
    return () => {
      ativo = false;
    };
  }, [produtoId]);

  if (!resumo) return null;
  if (!resumo.total) return <Text fontSize="xs" color="whiteAlpha.600">Esta peça ainda não tem avaliações.</Text>;
  return (
    <Box>
      <HStack mb={2}>
        <Estrelas nota={resumo.media} tamanho="sm" />
        <Text fontSize="sm" color="whiteAlpha.800">
          {resumo.media.toFixed(1)} · {resumo.total} avaliação(ões) de compradores verificados
        </Text>
      </HStack>
      <VStack align="stretch" spacing={2} maxH="120px" overflowY="auto">
        {resumo.avaliacoes.slice(0, 5).map(a => (
          <Box key={a.id} fontSize="xs" bg="whiteAlpha.100" p={2} borderRadius="md">
            <Text>
              <Estrelas nota={a.nota} tamanho="sm" /> · {a.autor} · {dataBr(a.data)}
            </Text>
            {a.comentario && <Text color="whiteAlpha.800">{a.comentario}</Text>}
          </Box>
        ))}
      </VStack>
    </Box>
  );
}

/** HU14: dúvida enviada direto ao artesão. */
function ContatarProdutor({ produtoId }: { produtoId: string }) {
  const router = useRouter();
  const session = useSession();
  const [aberto, setAberto] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [retorno, setRetorno] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!mensagem.trim()) {
      setRetorno({ ok: false, texto: 'O campo de mensagem não pode ficar vazio' });
      return;
    }
    setEnviando(true);
    const res = await mensagemService.enviar(produtoId, mensagem);
    setEnviando(false);
    if (!res.success) {
      setRetorno({ ok: false, texto: mensagemDeErro(res) });
      return;
    }
    setMensagem('');
    setRetorno({ ok: true, texto: 'Mensagem enviada! O artesão foi avisado no painel dele.' });
  }

  if (session && session.role !== 'comprador') return null;
  if (!aberto) {
    return (
      <Button size="sm" variant="outline" mt={3} w="100%" onClick={() => (session ? setAberto(true) : router.push('/login?perfil=comprador'))}>
        Contatar produtor
      </Button>
    );
  }
  return (
    <Box mt={3}>
      <Textarea size="sm" rows={3} placeholder="Ex.: Vocês fazem essa peça em outro tamanho? Qual o prazo de confecção?" value={mensagem} onChange={e => setMensagem(e.target.value)} bg="whiteAlpha.100" aria-label="Mensagem para o artesão" />
      {retorno && (
        <Text fontSize="sm" mt={1} color={retorno.ok ? 'green.300' : 'red.300'} role={retorno.ok ? 'status' : 'alert'}>
          {retorno.texto}
        </Text>
      )}
      <HStack mt={2}>
        <Button size="sm" bg="terra.500" color="black" isLoading={enviando} onClick={enviar}>
          Enviar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAberto(false)}>
          Fechar
        </Button>
      </HStack>
    </Box>
  );
}

export function ProductModal({ peca, isOpen, onClose }: ProductModalProps) {
  const [quantidade, setQuantidade] = useState(1);
  const [adicionado, setAdicionado] = useState(false);
  const { adicionarAoCarrinho, quantidadeNoCarrinho } = useCart();
  const session = useSession();
  const canBuy = !session || session.role === 'comprador';
  // Ao trocar de peça, a quantidade volta para 1 (ajuste de estado durante a renderização, sem efeito)
  const [pecaAtualId, setPecaAtualId] = useState(peca?.id);
  if (peca?.id !== pecaAtualId) {
    setPecaAtualId(peca?.id);
    setQuantidade(1);
  }

  if (!peca) return null;

  // Quanto ainda pode ser adicionado, considerando o que já está na sacola (HU4 / TC14)
  const disponivel = Math.max(0, (peca.estoque ?? Infinity) - quantidadeNoCarrinho(peca.id));

  const handleAddToCart = () => {
    if (!adicionarAoCarrinho(peca, quantidade)) return;
    setAdicionado(true);
    setTimeout(() => {
      setAdicionado(false);
      onClose();
    }, 800);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered>
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(8px)" />
      <ModalContent
        bg="#1C1816"
        color="white"
        borderRadius="2xl"
        border="1px solid"
        borderColor="whiteAlpha.300"
        overflow="hidden"
        p={0}
      >
        <ModalCloseButton color="white" zIndex={10} top={4} right={4} />

        <ModalBody p={0}>
          <Flex direction={{ base: 'column', md: 'row' }}>
            <Box w={{ base: '100%', md: '50%' }} h={{ base: '260px', md: '440px' }} position="relative">
              <Image
                src={peca.imagemUrl}
                alt={peca.nome}
                w="100%"
                h="100%"
                objectFit="cover"
              />
              {peca.categoria && (
                <Badge
                  position="absolute"
                  top={4}
                  left={4}
                  bg="blackAlpha.800"
                  color="terra.500"
                  border="1px solid"
                  borderColor="terra.500"
                  borderRadius="full"
                  px={3}
                  py={1}
                  fontSize="xs"
                >
                  {peca.categoria}
                </Badge>
              )}
            </Box>

            <Flex
              direction="column"
              w={{ base: '100%', md: '50%' }}
              p={6}
              justify="space-between"
            >
              <Box>
                {peca.artesaoNome && (
                  <Text fontSize="sm" color="terra.500" fontWeight="medium" mb={1}>
                    Artesão:{' '}
                    {peca.artesaoId ? (
                      <Text as={NextLink} href={`/artesaos/${peca.artesaoId}`} textDecoration="underline" _hover={{ color: 'terra.600' }}>
                        {peca.artesaoNome}
                      </Text>
                    ) : (
                      peca.artesaoNome
                    )}
                    {peca.artesaoCidade ? ` (${peca.artesaoCidade})` : ''}
                  </Text>
                )}

                <Flex justify="space-between" align="flex-start" gap={3} mb={3}>
                  <Heading as="h3" size="lg" fontFamily="heading" lineHeight="1.2">
                    {peca.nome}
                  </Heading>
                  <BotaoFavorito produtoId={peca.id} tamanho="md" />
                </Flex>

                <Text fontSize="2xl" fontWeight="bold" color="terra.500" mb={4}>
                  R$ {peca.preco.toFixed(2).replace('.', ',')}
                </Text>

                <Text fontSize="sm" color="whiteAlpha.800" mb={4} lineHeight="1.6">
                  {peca.descricao || 'Peça artesanal exclusiva produzida com saberes tradicionais da cultura pernambucana.'}
                </Text>

                <Divider borderColor="whiteAlpha.200" mb={4} />

                {peca.dimensoes && (
                  <Flex justify="space-between" fontSize="xs" color="whiteAlpha.700" mb={1.5}>
                    <Text fontWeight="semibold">Dimensões:</Text>
                    <Text>{peca.dimensoes}</Text>
                  </Flex>
                )}

                {peca.material && (
                  <Flex justify="space-between" fontSize="xs" color="whiteAlpha.700" mb={1.5}>
                    <Text fontWeight="semibold">Material:</Text>
                    <Text>{peca.material}</Text>
                  </Flex>
                )}

                {peca.tecnica && (
                  <Flex justify="space-between" fontSize="xs" color="whiteAlpha.700" mb={1.5}>
                    <Text fontWeight="semibold">Técnica:</Text>
                    <Text>{peca.tecnica}</Text>
                  </Flex>
                )}

                {peca.poloOrigem && (
                  <Flex justify="space-between" fontSize="xs" color="whiteAlpha.700" mb={1.5}>
                    <Text fontWeight="semibold">Polo de origem:</Text>
                    <Text>{peca.poloOrigem}</Text>
                  </Flex>
                )}

                {typeof peca.estoque === 'number' && (
                  <Flex justify="space-between" fontSize="xs" color="whiteAlpha.700" mb={3}>
                    <Text fontWeight="semibold">Disponível:</Text>
                    <Text>{peca.estoque > 0 ? `${peca.estoque} unidade${peca.estoque > 1 ? 's' : ''}` : 'Esgotada'}</Text>
                  </Flex>
                )}
              </Box>

              <Avaliacoes produtoId={peca.id} />

              {canBuy ? (
              <Box mt={4} pt={4} borderTop="1px solid" borderColor="whiteAlpha.200">
                <Flex align="center" justify="space-between" mb={4}>
                  <Text fontSize="sm" color="whiteAlpha.800">
                    Quantidade:
                  </Text>
                  <HStack spacing={2}>
                    <IconButton
                      aria-label="Diminuir"
                      icon={<Text as="span" fontSize="xl" fontWeight="bold" lineHeight="1">-</Text>}
                      size="md"
                      variant="solid"
                      bg="terra.500"
                      border="1px solid"
                      borderColor="terra.500"
                      color="black"
                      fontSize="xl"
                      fontWeight="bold"
                      _hover={{ bg: 'terra.600', transform: 'scale(1.05)' }}
                      onClick={() => setQuantidade(prev => Math.max(1, prev - 1))}
                    />
                    <Text fontWeight="bold" px={2} minW="24px" textAlign="center">
                      {quantidade}
                    </Text>
                    <IconButton
                      aria-label="Aumentar"
                      icon={<Text as="span" fontSize="xl" fontWeight="bold" lineHeight="1">+</Text>}
                      size="md"
                      variant="solid"
                      bg="terra.500"
                      border="1px solid"
                      borderColor="terra.500"
                      color="black"
                      fontSize="xl"
                      fontWeight="bold"
                      _hover={{ bg: 'terra.600', transform: 'scale(1.05)' }}
                      isDisabled={quantidade >= disponivel}
                      onClick={() => setQuantidade(prev => Math.min(prev + 1, disponivel))}
                    />
                  </HStack>
                </Flex>

                {disponivel > 0 && quantidade >= disponivel && (
                  <Text fontSize="sm" color="orange.200" mb={3} role="status">{MSG_LIMITE_ESTOQUE}</Text>
                )}

                {disponivel <= 0 ? (
                  <Button w="100%" size="lg" minH="56px" isDisabled>
                    {peca.emEstoque === false ? 'Peça esgotada' : MSG_LIMITE_ESTOQUE}
                  </Button>
                ) : (
                <Button
                  w="100%"
                  bg={adicionado ? 'green.500' : 'terra.500'}
                  color={adicionado ? 'white' : 'black'}
                  _hover={{ bg: adicionado ? 'green.600' : 'terra.600' }}
                  leftIcon={adicionado ? <CheckIcon /> : <CartAddIcon />}
                  fontWeight="bold"
                  size="lg"
                  minH="56px"
                  borderRadius="lg"
                  boxShadow="0 6px 18px rgba(217, 181, 150, 0.28)"
                  _active={{ transform: 'scale(0.98)' }}
                  onClick={handleAddToCart}
                >
                  {adicionado ? 'Adicionado com sucesso!' : `Adicionar à Sacola • R$ ${(peca.preco * quantidade).toFixed(2).replace('.', ',')}`}
                </Button>
                )}
                <ContatarProdutor produtoId={peca.id} />
              </Box>
              ) : (
                <Text mt={4} pt={4} borderTop="1px solid" borderColor="whiteAlpha.200" color="whiteAlpha.700" fontSize="sm">
                  Compras disponíveis apenas para contas de comprador.
                </Text>
              )}
            </Flex>
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
