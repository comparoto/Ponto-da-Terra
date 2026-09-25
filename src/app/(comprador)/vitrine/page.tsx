'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Flex, SimpleGrid, Text, Image, Heading, Spinner,IconButton, Icon, Button, Badge, HStack, useDisclosure,Input, Select,} from '@chakra-ui/react';
import { Navbar } from '@/components/Navbar';
import { ProductModal } from '@/components/ProductModal';
import { Artesao, Peca } from '@/types';
import { fakeApi } from '@/services/api';
import { CATEGORIAS } from '@/services/produtoService';
import { useCart } from '@/store/cartStore';


const FilterIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </Icon>
);

const ArrowRightIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </Icon>
);

const ShoppingBagIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </Icon>
);

const regiaoPorCidade: Record<string, string> = {
  Caruaru: 'Agreste', Bezerros: 'Agreste', Pesqueira: 'Agreste',
  Petrolina: 'Sertão', Tracunhaem: 'Zona da Mata', Goiana: 'Zona da Mata',
};

const obterRegiao = (cidade: string) => 
  regiaoPorCidade[cidade.normalize('NFD').replace(/[\u0300-\u036f]/g, '')] || 'Outras';

const selectStyles = {
  bg: "#2C2724", 
  borderColor: "whiteAlpha.300", 
  color: "white", 
  sx: { '& option': { backgroundColor: '#2C2724', color: '#fff' } }
};

export default function VitrinePage() {
  const router = useRouter();
  const { adicionarAoCarrinho } = useCart();


  const [artesaos, setArtesaos] = useState<Artesao[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mostrarTelaArtesaos, setMostrarTelaArtesaos] = useState(false);
  const [artesaoSelecionado, setArtesaoSelecionado] = useState<string | null>(null);
  

  const [pecaDetalhe, setPecaDetalhe] = useState<Peca | null>(null);
  const { isOpen: isModalOpen, onOpen: openModal, onClose: closeModal } = useDisclosure();

  const [buscaPeca, setBuscaPeca] = useState('');
  const [categoriaPeca, setCategoriaPeca] = useState('Todas');
  const [regiaoPeca, setRegiaoPeca] = useState('Todas');
  const [faixaPrecoPeca, setFaixaPrecoPeca] = useState('Todas');
  const [artesaoPeca, setArtesaoPeca] = useState('Todos');
  
  const [buscaArtesao, setBuscaArtesao] = useState('');
  const [regiaoArtesao, setRegiaoArtesao] = useState('Todas');
  const [especialidadeArtesao, setEspecialidadeArtesao] = useState('Todas');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [artesaosResult, pecasResult] = await Promise.all([
          fakeApi.getArtesaos(),
          fakeApi.getPecas(),
        ]);

        if (!artesaosResult.success || !pecasResult.success) {
          setError(artesaosResult.error || pecasResult.error || 'Não foi possível carregar os dados desta vitrine.');
          setArtesaos([]);
          setPecas([]);
          return;
        }

        setArtesaos(artesaosResult.data ?? []);
        setPecas(pecasResult.data ?? []);
      } catch {
        setError('Não foi possível carregar a vitrine. Tente novamente em instantes.');
        setArtesaos([]);
        setPecas([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);
  
  const handleSelectPeca = (peca: Peca) => {
    setPecaDetalhe(peca);
    openModal();
  };

  const handleFiltrarPorArtesao = (artId: string) => {
    setArtesaoSelecionado(prev => prev === artId ? null : artId);
  };

  const regioesArtesaos = [...new Set(artesaos.map(a => obterRegiao(a.cidade)))];
  const especialidadesArtesaos = [...new Set(artesaos.map(a => a.especialidade).filter((e): e is string => Boolean(e)))];
  
  const termoArtesao = buscaArtesao.trim().toLocaleLowerCase('pt-BR');
  const artesaosFiltrados = artesaos.filter(art => {
    const correspondeBusca = !termoArtesao || [art.nome, art.cidade, art.especialidade || '']
      .some(valor => valor.toLocaleLowerCase('pt-BR').includes(termoArtesao));
    const correspondeRegiao = regiaoArtesao === 'Todas' || obterRegiao(art.cidade) === regiaoArtesao;
    const correspondeEspecialidade = especialidadeArtesao === 'Todas' || art.especialidade === especialidadeArtesao;
    return correspondeBusca && correspondeRegiao && correspondeEspecialidade;
  });

  const pecasFiltradas = pecas.filter(peca => {
    const artesao = artesaos.find(a => a.id === peca.artesaoId);
    const nomeArtesao = artesao?.nome || peca.artesaoNome || '';
    const cidade = (artesao?.cidade || peca.artesaoCidade || '').split(' - ')[0];
    const regiao = obterRegiao(cidade);
    const termo = buscaPeca.trim().toLocaleLowerCase('pt-BR');
    
    const correspondeBusca = !termo || [peca.nome, peca.material || '', nomeArtesao]
      .some(v => v.toLocaleLowerCase('pt-BR').includes(termo));
    const correspondeCategoria = categoriaPeca === 'Todas' || peca.categoria === categoriaPeca;
    const correspondeRegiao = regiaoPeca === 'Todas' || regiao === regiaoPeca;
    const correspondeArtesao = artesaoPeca === 'Todos' || peca.artesaoId === artesaoPeca;
    const correspondeSelecaoRapida = !artesaoSelecionado || peca.artesaoId === artesaoSelecionado;
    
    let correspondePreco = true;
    if (faixaPrecoPeca === 'ate100') correspondePreco = peca.preco <= 100;
    else if (faixaPrecoPeca === '100a200') correspondePreco = peca.preco > 100 && peca.preco <= 200;
    else if (faixaPrecoPeca === 'acima200') correspondePreco = peca.preco > 200;

    return correspondeBusca && correspondeCategoria && correspondeRegiao && correspondeArtesao && correspondePreco && correspondeSelecaoRapida;
  });

  const temFiltroPeca = Boolean(buscaPeca || categoriaPeca !== 'Todas' || regiaoPeca !== 'Todas' || faixaPrecoPeca !== 'Todas' || artesaoPeca !== 'Todos' || artesaoSelecionado);
  const pecasExibidas = temFiltroPeca ? pecasFiltradas : pecasFiltradas.slice(0, 6);

  const telaArtesaos = (
    <Box maxW="1280px" w="100%" mx="auto" px={{ base: 4, md: 8 }} py={8} flex="1">
      <Flex justify="space-between" align="center" wrap="wrap" gap={4} mb={6}>
        <Box>
          <Badge bg="terra.500" color="black" px={3} py={1} borderRadius="full" fontSize="xs" mb={2}>ARTESANATO PERNAMBUCANO</Badge>
          <Heading color="white" fontFamily="heading" fontWeight="normal">Artesãos e Artesãs</Heading>
          <Text color="whiteAlpha.700" mt={2}>Conheça os mestres e mestras por trás de cada criação.</Text>
        </Box>
        <Button variant="outline" borderColor="terra.500" color="terra.500" _hover={{ bg: 'terra.500', color: 'black' }} onClick={() => setMostrarTelaArtesaos(false)}>
          Voltar à Vitrine
        </Button>
      </Flex>
      
      <Flex direction={{ base: 'column', md: 'row' }} gap={3} mb={6} p={4} bg="blackAlpha.700" borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200">
        <Input placeholder="Buscar por nome, cidade ou especialidade" value={buscaArtesao} onChange={e => setBuscaArtesao(e.target.value)} bg="whiteAlpha.100" borderColor="whiteAlpha.300" color="white" _placeholder={{ color: 'whiteAlpha.600' }} aria-label="Buscar artesãos" />
        <Select value={regiaoArtesao} onChange={e => setRegiaoArtesao(e.target.value)} aria-label="Filtrar artesãos por região" {...selectStyles}>
          <option value="Todas">Todas as regiões</option>
          {regioesArtesaos.map(regiao => <option key={regiao} value={regiao}>{regiao}</option>)}
        </Select>
        <Select value={especialidadeArtesao} onChange={e => setEspecialidadeArtesao(e.target.value)} aria-label="Filtrar artesãos por especialidade" {...selectStyles}>
          <option value="Todas">Todas as especialidades</option>
          {especialidadesArtesaos.map(especialidade => <option key={especialidade} value={especialidade}>{especialidade}</option>)}
        </Select>
      </Flex>
      
      {artesaosFiltrados.length === 0 ? (
        <Text color="whiteAlpha.700" textAlign="center" py={12}>Nenhum artesão encontrado com esses filtros.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={6}>
          {artesaosFiltrados.map(art => (
            <Flex key={art.id} direction={{ base: 'column', sm: 'row' }} gap={4} p={5} bg="blackAlpha.700" color="white" borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200" align="center">
              <Image src={art.imagemUrl} alt={art.nome} boxSize="96px" borderRadius="full" objectFit="cover" fallbackSrc="https://cdn-icons-png.flaticon.com/512/12225/12225881.png" />
              <Box flex="1" textAlign={{ base: 'center', sm: 'left' }}>
                <Heading size="sm" color="terra.500" mb={1}>{art.nome}</Heading>
                <Text fontSize="sm" color="whiteAlpha.800">{art.cidade} - {art.estado} · {obterRegiao(art.cidade)}</Text>
                {art.especialidade && <Badge mt={2} color="terra.500" bg="whiteAlpha.100">{art.especialidade}</Badge>}
                {art.biografia && <Text fontSize="sm" color="whiteAlpha.700" mt={2}>{art.biografia}</Text>}
              </Box>
            </Flex>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );

  return (
    <Box
          minH="100vh"
          bgImage="linear-gradient(rgba(23, 20, 18, 0.72), rgba(23, 20, 18, 0.47)), url('/bg-vitrine.png')"
          bgSize="cover"
          bgPosition="center"
          bgAttachment="fixed"
          display="flex"
          flexDirection="column"
        >
      <Navbar onArtisansClick={() => setMostrarTelaArtesaos(true)} onLogoClick={() => setMostrarTelaArtesaos(false)} />

      {mostrarTelaArtesaos ? telaArtesaos : isLoading ? (
        <Flex justify="center" align="center" flex="1" minH="60vh">
          <Spinner size="xl" color="terra.500" thickness="4px" />
        </Flex>
      ) : error ? (
        <Flex justify="center" align="center" flex="1" minH="60vh" px={4}>
          <Box bg="blackAlpha.700" borderRadius="xl" p={8} textAlign="center" border="1px solid" borderColor="whiteAlpha.200">
            <Text color="terra.500" fontWeight="bold" mb={2}>Não foi possível carregar a vitrine</Text>
            <Text color="whiteAlpha.800">{error}</Text>
          </Box>
        </Flex>
      ) : (
        <Flex direction="column" flex="1" justify="space-between">
          <Box maxW="1280px" w="100%" mx="auto" px={{ base: 4, md: 8 }} py={6}>
            
            <Box bg="blackAlpha.700" backdropFilter="blur(14px)" borderRadius="2xl" p={{ base: 6, md: 8 }} border="1px solid" borderColor="whiteAlpha.200" mb={8}>
              <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'flex-start', md: 'center' }} gap={6}>
                <Box maxW="xl">
                  <Badge bg="terra.500" color="black" px={3} py={1} borderRadius="full" fontWeight="bold" fontSize="xs" mb={3}>
                    ARTE & TRADIÇÃO PERNAMBUCANA
                  </Badge>
                  <Heading as="h2" size="xl" fontFamily="heading" fontWeight="normal" color="white" mb={3} lineHeight="1.2">
                    Descubra o autêntico trabalho feito à mão pelos mestres de Pernambuco
                  </Heading>
                  <Text fontSize="md" color="whiteAlpha.800">
                    Obras exclusivas do Agreste ao Sertão: barro, cerâmica, renda renascença, xilogravura e cestaria tradicional.
                  </Text>
                </Box>
                <Button rightIcon={<ArrowRightIcon />} bg="terra.500" color="black" size="lg" _hover={{ bg: 'terra.600', transform: 'translateX(4px)' }} transition="all 0.2s" onClick={() => router.push('/produtos')} whiteSpace="normal" textAlign="center">
                  Ver Catálogo Completo
                </Button>
              </Flex>

              <SimpleGrid columns={{ base: 1, sm: 2, lg: 5 }} spacing={3} mt={6}>
                <Input placeholder="Buscar peças, material ou artesão" value={buscaPeca} onChange={e => setBuscaPeca(e.target.value)} bg="whiteAlpha.100" borderColor="whiteAlpha.300" color="white" _placeholder={{ color: 'whiteAlpha.600' }} aria-label="Buscar peças" />
                <Select value={categoriaPeca} onChange={e => setCategoriaPeca(e.target.value)} aria-label="Filtrar peças por categoria" {...selectStyles}>
                  {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </Select>
                <Select value={regiaoPeca} onChange={e => setRegiaoPeca(e.target.value)} aria-label="Filtrar peças por região" {...selectStyles}>
                  <option value="Todas">Todas as regiões</option>
                  {regioesArtesaos.map(regiao => <option key={regiao} value={regiao}>{regiao}</option>)}
                </Select>
                <Select value={artesaoPeca} onChange={e => setArtesaoPeca(e.target.value)} aria-label="Filtrar peças por artesão" {...selectStyles}>
                  <option value="Todos">Todos os artesãos</option>
                  {artesaos.map(art => <option key={art.id} value={art.id}>{art.nome}</option>)}
                </Select>
                <Select value={faixaPrecoPeca} onChange={e => setFaixaPrecoPeca(e.target.value)} aria-label="Filtrar peças por faixa de preço" {...selectStyles}>
                  <option value="Todas">Todas as faixas de preço</option>
                  <option value="ate100">Até R$ 100</option>
                  <option value="100a200">R$ 100 a R$ 200</option>
                  <option value="acima200">Acima de R$ 200</option>
                </Select>
              </SimpleGrid>

              <Flex wrap="wrap" gap={2} mt={6} pt={4} borderTop="1px solid" borderColor="whiteAlpha.200">
                <Text fontSize="sm" color="whiteAlpha.600" alignSelf="center" mr={2}>Categorias em alta:</Text>
                {CATEGORIAS.filter(c => c !== 'Todas').map(cat => (
                  <Button key={cat} size="xs" variant="outline" borderColor="whiteAlpha.300" color="white" borderRadius="full" _hover={{ bg: 'terra.500', color: 'black', borderColor: 'terra.500' }} onClick={() => setCategoriaPeca(cat)}>
                    {cat}
                  </Button>
                ))}
              </Flex>
            </Box>

            <Flex direction={{ base: 'column', lg: 'row' }} gap={8} justify="center" w="100%" alignItems="stretch">
              
              <Box id="artistas" flex={{ base: '1', lg: '5' }} bg="blackAlpha.700" p={{ base: 5, md: 6 }} borderRadius="xl" backdropFilter="blur(12px)" border="1px solid" borderColor="whiteAlpha.200" color="white" display="flex" flexDirection="column">
                <Flex justify="space-between" align="center" mb={6}>
                  <Flex align="center" gap={3}>
                    <IconButton aria-label="Filtrar artesãos" icon={<FilterIcon />} size="md" bg="whiteAlpha.200" _hover={{ bg: 'whiteAlpha.400' }} color="white" onClick={() => setMostrarTelaArtesaos(true)} />
                    <Heading size="xl" fontFamily="heading" fontWeight="normal">Artesãos e Artesãs</Heading>
                  </Flex>
                  <Text fontSize="sm" color="whiteAlpha.800" cursor="pointer" _hover={{ color: 'terra.500', textDecoration: 'underline' }} onClick={() => setMostrarTelaArtesaos(true)}>
                    Ver todos ({artesaos.length})
                  </Text>
                </Flex>

                {artesaoSelecionado && (
                  <Flex bg="terra.500" color="black" px={3} py={1.5} borderRadius="md" mb={4} justify="space-between" align="center" fontSize="xs" fontWeight="semibold">
                    <Text>Filtrando por artesão: {artesaos.find(a => a.id === artesaoSelecionado)?.nome}</Text>
                    <Button size="xs" variant="ghost" color="black" _hover={{ bg: 'blackAlpha.200' }} onClick={() => setArtesaoSelecionado(null)}>Remover filtro</Button>
                  </Flex>
                )}

                <SimpleGrid columns={{ base: 2, sm: 2 }} spacingY={8} spacingX={4} flex="1">
                  {artesaos.map(art => {
                    const isSelected = artesaoSelecionado === art.id;
                    return (
                      <Flex key={art.id} direction="column" align="center" cursor="pointer" p={3} borderRadius="lg" transition="all 0.25s" bg={isSelected ? 'whiteAlpha.200' : 'transparent'} _hover={{ bg: 'whiteAlpha.200', transform: 'scale(1.02)' }} onClick={() => handleFiltrarPorArtesao(art.id)} role="group">
                        <Box p={1} borderRadius="full" border="3px solid" borderColor={isSelected ? 'terra.500' : 'terra.600'} boxShadow={isSelected ? '0 0 14px rgba(217, 181, 150, 0.6)' : 'none'} mb={3}>
                          <Image src={art.imagemUrl} alt={art.nome} boxSize={{ base: '90px', md: '110px' }} borderRadius="full" objectFit="cover" fallbackSrc="https://cdn-icons-png.flaticon.com/512/12225/12225881.png" />
                        </Box>
                        <Text fontSize="md" fontWeight="medium" mb={1} textAlign="center" color={isSelected ? 'terra.500' : 'white'}>{art.nome}</Text>
                        <Text fontSize="xs" color="whiteAlpha.700" textAlign="center">{art.cidade} - {art.estado}</Text>
                        {art.especialidade && <Badge mt={1.5} bg="blackAlpha.600" color="terra.500" border="1px solid" borderColor="terra.500" fontSize="2xs" borderRadius="full">{art.especialidade}</Badge>}
                      </Flex>
                    );
                  })}
                </SimpleGrid>
              </Box>

              <Box flex={{ base: '1', lg: '7' }} bg="blackAlpha.700" p={{ base: 5, md: 6 }} borderRadius="xl" backdropFilter="blur(12px)" border="1px solid" borderColor="whiteAlpha.200" color="white" display="flex" flexDirection="column">
                <Flex justify="space-between" align="center" mb={6}>
                  <Flex align="center" gap={3}>
                    <IconButton aria-label="Filtrar peças" icon={<FilterIcon />} size="md" bg="whiteAlpha.200" _hover={{ bg: 'whiteAlpha.400' }} color="white" onClick={() => router.push('/produtos')} />
                    <Heading size="xl" fontFamily="heading" fontWeight="normal">Peças em Destaque</Heading>
                  </Flex>
                  <Text fontSize="sm" color="whiteAlpha.800" cursor="pointer" _hover={{ color: 'terra.500', textDecoration: 'underline' }} onClick={() => router.push('/produtos')}>
                    Ver catálogo completo ({pecas.length})
                  </Text>
                </Flex>

                {pecasExibidas.length === 0 ? (
                  <Flex direction="column" align="center" justify="center" p={8} bg="whiteAlpha.100" borderRadius="lg">
                    <Text fontSize="md" color="whiteAlpha.800" mb={2}>Nenhuma peça encontrada para este artesão no momento.</Text>
                    <Button size="sm" variant="outline" borderColor="terra.500" color="terra.500" onClick={() => setArtesaoSelecionado(null)}>Limpar filtro</Button>
                  </Flex>
                ) : (
                  <SimpleGrid columns={{ base: 1, sm: 2, md: 2, xl: 3 }} spacing={5}>
                    {pecasExibidas.map(peca => (
                      <Flex key={peca.id} direction="column" bg="whiteAlpha.300" p={3.5} borderRadius="lg" transition="all 0.25s" _hover={{ bg: 'whiteAlpha.400', transform: 'translateY(-3px)', boxShadow: '0 8px 20px rgba(0,0,0,0.4)' }} position="relative" alignSelf="start" role="group">
                        <Box position="relative" h="160px" w="100%" overflow="hidden" borderRadius="md" mb={3} cursor="pointer" onClick={() => handleSelectPeca(peca)}>
                          <Image src={peca.imagemUrl} alt={peca.nome} h="100%" w="100%" objectFit="cover" transition="transform 0.3s" _groupHover={{ transform: 'scale(1.05)' }} fallbackSrc="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80" />
                          {peca.categoria && <Badge position="absolute" top={2} left={2} bg="blackAlpha.800" color="terra.500" fontSize="2xs" borderRadius="full" px={2} py={0.5}>{peca.categoria}</Badge>}
                        </Box>

                        <Text fontSize="sm" fontWeight="bold" color="terra.500" mb={1}>R$ {peca.preco.toFixed(2).replace('.', ',')}</Text>
                        <Text fontSize="sm" fontWeight="medium" color="whiteAlpha.900" noOfLines={1} mb={3} cursor="pointer" _hover={{ color: 'terra.500' }} onClick={() => handleSelectPeca(peca)}>{peca.nome}</Text>

                        <HStack spacing={2}>
                          <Button size="xs" variant="outline" borderColor="whiteAlpha.400" color="white" _hover={{ bg: 'whiteAlpha.200' }} flex="1" onClick={() => handleSelectPeca(peca)}>Detalhes</Button>
                          <IconButton aria-label="Adicionar à sacola" icon={<ShoppingBagIcon />} size="xs" bg="terra.500" color="black" _hover={{ bg: 'terra.600' }} onClick={() => adicionarAoCarrinho(peca, 1)} />
                        </HStack>
                      </Flex>
                    ))}
                  </SimpleGrid>
                )}

                <Flex justify="center" mt={6} pt={4} borderTop="1px solid" borderColor="whiteAlpha.200">
                  <Button bg="terra.500" color="black" _hover={{ bg: 'terra.600' }} size="md" rightIcon={<ArrowRightIcon />} onClick={() => router.push('/produtos')}>
                    Ver todas as {pecas.length} peças do acervo
                  </Button>
                </Flex>
              </Box>
            </Flex>
          </Box>

          <Box borderTop="1px solid" borderColor="whiteAlpha.200" bg="blackAlpha.800" py={6} mt={12}>
            <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align="center" maxW="1200px" mx="auto" px={8} gap={4}>
              <Flex align="center" gap={3}>
                <Image src="/logo.png" alt="Logo" h="30px" objectFit="contain" />
                <Text fontSize="sm" color="whiteAlpha.800">Valorizando a cultura e os artesãos pernambucanos</Text>
              </Flex>
              <Text fontSize="sm" color="whiteAlpha.600">© Ponto da Terra 2026. Todos os direitos reservados.</Text>
            </Flex>
          </Box>
        </Flex>
      )}

      <ProductModal peca={pecaDetalhe} isOpen={isModalOpen} onClose={closeModal} />
    </Box>
  );
}