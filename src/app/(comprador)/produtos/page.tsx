'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import {
  Box,
  Flex,
  SimpleGrid,
  Text,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Button,
  HStack,
  VStack,
  Spinner,
  Icon,
  Badge,
  useDisclosure,
  Divider,
} from '@chakra-ui/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { ProductCard } from '@/components/ProductCard';
import { ProductModal } from '@/components/ProductModal';
import { Peca, Artesao, FiltrosProduto } from '@/types';
import { produtoService, CATEGORIAS } from '@/services/produtoService';
import { artesaoService } from '@/services/artesaoService';

const SearchIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </Icon>
);

const FilterResetIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </Icon>
);

const EmptyBoxIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </Icon>
);

function CatalogoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [pecas, setPecas] = useState<Peca[]>([]);
  const [artesaos, setArtesaos] = useState<Artesao[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados dos Filtros
  const [busca, setBusca] = useState(searchParams.get('q') || '');
  const [categoria, setCategoria] = useState(searchParams.get('categoria') || 'Todas');
  const [artesaoId, setArtesaoId] = useState('');
  const [faixaPreco, setFaixaPreco] = useState('todas');
  const [ordenacao, setOrdenacao] = useState<'recentes' | 'preco-asc' | 'preco-desc' | 'nome'>('recentes');

  // Modal de Detalhes
  const [pecaSelecionada, setPecaSelecionada] = useState<Peca | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Sincronizar parâmetro de busca da URL quando mudar
  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) setBusca(q);
    const cat = searchParams.get('categoria');
    if (cat !== null) setCategoria(cat);
  }, [searchParams]);

  // Carregamento inicial de dados
  useEffect(() => {
    Promise.all([produtoService.getProdutos(), artesaoService.getArtesaos()]).then(
      ([pecasData, artesaosData]) => {
        setPecas(pecasData);
        setArtesaos(artesaosData);
        setIsLoading(false);
      }
    );
  }, []);

  // Filtragem e ordenação computada
  const pecasFiltradas = useMemo(() => {
    let filtradas = [...pecas];

    // Busca textual
    if (busca.trim()) {
      const termo = busca.toLowerCase().trim();
      filtradas = filtradas.filter(
        p =>
          p.nome.toLowerCase().includes(termo) ||
          p.artesaoNome?.toLowerCase().includes(termo) ||
          p.categoria?.toLowerCase().includes(termo) ||
          p.artesaoCidade?.toLowerCase().includes(termo) ||
          p.material?.toLowerCase().includes(termo)
      );
    }

    // Categoria
    if (categoria && categoria !== 'Todas') {
      filtradas = filtradas.filter(p => p.categoria === categoria);
    }

    // Artesão
    if (artesaoId) {
      filtradas = filtradas.filter(p => p.artesaoId === artesaoId);
    }

    // Faixa de preço
    if (faixaPreco === 'ate-100') {
      filtradas = filtradas.filter(p => p.preco <= 100);
    } else if (faixaPreco === '100-200') {
      filtradas = filtradas.filter(p => p.preco > 100 && p.preco <= 200);
    } else if (faixaPreco === 'acima-200') {
      filtradas = filtradas.filter(p => p.preco > 200);
    }

    // Ordenação
    switch (ordenacao) {
      case 'preco-asc':
        filtradas.sort((a, b) => a.preco - b.preco);
        break;
      case 'preco-desc':
        filtradas.sort((a, b) => b.preco - a.preco);
        break;
      case 'nome':
        filtradas.sort((a, b) => a.nome.localeCompare(b.nome));
        break;
      case 'recentes':
      default:
        break;
    }

    return filtradas;
  }, [pecas, busca, categoria, artesaoId, faixaPreco, ordenacao]);

  const temFiltroAtivo =
    busca.trim() !== '' ||
    categoria !== 'Todas' ||
    artesaoId !== '' ||
    faixaPreco !== 'todas' ||
    ordenacao !== 'recentes';

  const resetarFiltros = () => {
    setBusca('');
    setCategoria('Todas');
    setArtesaoId('');
    setFaixaPreco('todas');
    setOrdenacao('recentes');
  };

  const handleCardSelect = (peca: Peca) => {
    setPecaSelecionada(peca);
    onOpen();
  };

  return (
    <Box
      minH="100vh"
      bgImage="url('/bg-vitrine.png')"
      bgSize="cover"
      bgPosition="center"
      bgAttachment="fixed"
      display="flex"
      flexDirection="column"
    >
      <Navbar />

      <Flex direction="column" flex="1" maxW="1320px" w="100%" mx="auto" px={{ base: 4, md: 8 }} py={8}>
        {/* Cabeçalho da Página */}
        <Box
          bg="blackAlpha.700"
          backdropFilter="blur(14px)"
          p={{ base: 6, md: 8 }}
          borderRadius="2xl"
          border="1px solid"
          borderColor="whiteAlpha.200"
          mb={8}
        >
          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify="space-between"
            align={{ base: 'flex-start', md: 'center' }}
            gap={4}
          >
            <Box>
              <Badge
                bg="terra.500"
                color="black"
                px={3}
                py={1}
                borderRadius="full"
                fontWeight="bold"
                fontSize="xs"
                mb={2}
              >
                CATÁLOGO DE PEÇAS
              </Badge>
              <Heading as="h1" size="2xl" fontFamily="heading" color="white" mb={2}>
                Obras & Peças Tradicionais
              </Heading>
              <Text fontSize="md" color="whiteAlpha.800" maxW="2xl">
                Navegue pelas criações autênticas dos artesãos pernambucanos. Cada peça carrega história, identidade regional e saberes passados de geração em geração.
              </Text>
            </Box>

            <Button
              variant="outline"
              borderColor="terra.500"
              color="terra.500"
              _hover={{ bg: 'terra.500', color: 'black' }}
              onClick={() => router.push('/vitrine')}
              size="md"
            >
              Voltar à Vitrine
            </Button>
          </Flex>

          <Divider borderColor="whiteAlpha.200" my={6} />

          {/* Barra de Filtros e Busca */}
          <Flex direction="column" gap={4}>
            <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4}>
              {/* Campo de Pesquisa */}
              <InputGroup size="md">
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="whiteAlpha.600" />
                </InputLeftElement>
                <Input
                  placeholder="Pesquisar por nome ou material..."
                  bg="whiteAlpha.200"
                  borderColor="whiteAlpha.300"
                  color="white"
                  borderRadius="lg"
                  _placeholder={{ color: 'whiteAlpha.600' }}
                  _focus={{ borderColor: 'terra.500', bg: 'whiteAlpha.300' }}
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                />
              </InputGroup>

              {/* Filtro por Artesão */}
              <Select
                size="md"
                bg="blackAlpha.700"
                borderColor="whiteAlpha.300"
                color="white"
                borderRadius="lg"
                _focus={{ borderColor: 'terra.500' }}
                value={artesaoId}
                onChange={e => setArtesaoId(e.target.value)}
              >
                <option value="" style={{ background: '#2C2724', color: '#fff' }}>
                  Todos os Artesãos
                </option>
                {artesaos.map(art => (
                  <option key={art.id} value={art.id} style={{ background: '#2C2724', color: '#fff' }}>
                    {art.nome} ({art.cidade})
                  </option>
                ))}
              </Select>

              {/* Filtro por Faixa de Preço */}
              <Select
                size="md"
                bg="blackAlpha.700"
                borderColor="whiteAlpha.300"
                color="white"
                borderRadius="lg"
                _focus={{ borderColor: 'terra.500' }}
                value={faixaPreco}
                onChange={e => setFaixaPreco(e.target.value)}
              >
                <option value="todas" style={{ background: '#2C2724', color: '#fff' }}>
                  Todas as faixas de preço
                </option>
                <option value="ate-100" style={{ background: '#2C2724', color: '#fff' }}>
                  Até R$ 100,00
                </option>
                <option value="100-200" style={{ background: '#2C2724', color: '#fff' }}>
                  R$ 100,00 a R$ 200,00
                </option>
                <option value="acima-200" style={{ background: '#2C2724', color: '#fff' }}>
                  Acima de R$ 200,00
                </option>
              </Select>

              {/* Ordenação */}
              <Select
                size="md"
                bg="blackAlpha.700"
                borderColor="whiteAlpha.300"
                color="white"
                borderRadius="lg"
                _focus={{ borderColor: 'terra.500' }}
                value={ordenacao}
                onChange={e => setOrdenacao(e.target.value as any)}
              >
                <option value="recentes" style={{ background: '#2C2724', color: '#fff' }}>
                  Ordenar: Mais Recentes
                </option>
                <option value="preco-asc" style={{ background: '#2C2724', color: '#fff' }}>
                  Menor Preço
                </option>
                <option value="preco-desc" style={{ background: '#2C2724', color: '#fff' }}>
                  Maior Preço
                </option>
                <option value="nome" style={{ background: '#2C2724', color: '#fff' }}>
                  Nome (A - Z)
                </option>
              </Select>
            </SimpleGrid>

            {/* Filtros em Pílulas de Categorias */}
            <Flex wrap="wrap" gap={2} align="center" pt={2}>
              <Text fontSize="xs" color="whiteAlpha.600" mr={1}>
                Categorias:
              </Text>
              {CATEGORIAS.map(cat => {
                const isActive = categoria === cat;
                return (
                  <Button
                    key={cat}
                    size="xs"
                    borderRadius="full"
                    bg={isActive ? 'terra.500' : 'whiteAlpha.200'}
                    color={isActive ? 'black' : 'white'}
                    _hover={{ bg: isActive ? 'terra.600' : 'whiteAlpha.400' }}
                    onClick={() => setCategoria(cat)}
                  >
                    {cat}
                  </Button>
                );
              })}

              {temFiltroAtivo && (
                <Button
                  size="xs"
                  variant="ghost"
                  color="terra.500"
                  leftIcon={<FilterResetIcon />}
                  _hover={{ bg: 'whiteAlpha.200' }}
                  onClick={resetarFiltros}
                  ml="auto"
                >
                  Limpar todos os filtros
                </Button>
              )}
            </Flex>
          </Flex>
        </Box>

        {/* Informações da Listagem (Contador) */}
        <Flex justify="space-between" align="center" mb={6} color="whiteAlpha.800">
          <Text fontSize="sm">
            Exibindo <Text as="span" fontWeight="bold" color="terra.500">{pecasFiltradas.length}</Text>{' '}
            {pecasFiltradas.length === 1 ? 'peça encontrada' : 'peças encontradas'}
            {categoria !== 'Todas' && ` na categoria "${categoria}"`}
            {busca.trim() && ` para "${busca}"`}
          </Text>
        </Flex>

        {/* Conteúdo / Grid de Produtos */}
        {isLoading ? (
          <Flex justify="center" align="center" py={20}>
            <Spinner size="xl" color="terra.500" thickness="4px" />
          </Flex>
        ) : pecasFiltradas.length === 0 ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            bg="blackAlpha.700"
            backdropFilter="blur(10px)"
            borderRadius="2xl"
            p={12}
            border="1px solid"
            borderColor="whiteAlpha.200"
            textAlign="center"
            gap={4}
          >
            <EmptyBoxIcon boxSize={16} color="terra.500" />
            <Heading size="md" fontFamily="heading" color="white">
              Nenhuma peça encontrada
            </Heading>
            <Text color="whiteAlpha.700" maxW="md" fontSize="sm">
              Não encontramos nenhum produto que coincida com os filtros selecionados. Tente ajustar os termos de busca ou redefinir os filtros.
            </Text>
            <Button
              bg="terra.500"
              color="black"
              _hover={{ bg: 'terra.600' }}
              size="sm"
              onClick={resetarFiltros}
              mt={2}
            >
              Ver todas as peças
            </Button>
          </Flex>
        ) : (
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
            {pecasFiltradas.map(peca => (
              <ProductCard key={peca.id} peca={peca} onSelect={handleCardSelect} />
            ))}
          </SimpleGrid>
        )}
      </Flex>

      {/* Modal de Detalhes do Produto */}
      <ProductModal peca={pecaSelecionada} isOpen={isOpen} onClose={onClose} />

      {/* Rodapé */}
      <Box borderTop="1px solid" borderColor="whiteAlpha.200" bg="blackAlpha.800" py={6} mt={16}>
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          align="center"
          maxW="1200px"
          mx="auto"
          px={8}
          gap={4}
        >
          <Text fontSize="sm" color="whiteAlpha.800">
            Ponto da Terra • Catálogo Oficial de Artesanato Pernambucano
          </Text>
          <Text fontSize="sm" color="whiteAlpha.600">
            © 2026 Todos os direitos reservados.
          </Text>
        </Flex>
      </Box>
    </Box>
  );
}

export default function ProdutosPage() {
  return (
    <Suspense
      fallback={
        <Flex minH="100vh" justify="center" align="center" bg="#171412">
          <Spinner size="xl" color="terra.500" thickness="4px" />
        </Flex>
      }
    >
      <CatalogoContent />
    </Suspense>
  );
}
