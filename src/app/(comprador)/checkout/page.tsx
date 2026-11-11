'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  HStack,
  Image,
  Input,
  Radio,
  RadioGroup,
  Select,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useCart } from '@/store/cartStore';
import { Navbar } from '@/components/Navbar';
import { RoleGate } from '@/components/Portal';
import { brl } from '@/components/ui';
import { ESTADOS_BRASILEIROS } from '@/data';
import { carrinhoService, type CalculoCarrinho } from '@/services/carrinhoService';
import { mensagemDeErro } from '@/services/http';
import { compraService, type MetodoPagamento } from '@/services/pedidoService';
import { apenasDigitos, buscarCep, mascararCep } from '@/services/cepService';

const campo = { bg: 'whiteAlpha.200', border: 'none', _placeholder: { color: 'whiteAlpha.600' } };

type FormEndereco = { cep: string; rua: string; numero: string; complemento: string; bairro: string; cidade: string; estado: string };
const enderecoVazio: FormEndereco = { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' };

function CheckoutContent() {
  const { items = [], limparCarrinho } = useCart();
  const router = useRouter();
  const toast = useToast();

  // Valores oficiais calculados pelo servidor com os preços do banco (TC08)
  const [calculo, setCalculo] = useState<CalculoCarrinho | null>(null);
  const [erroCarrinho, setErroCarrinho] = useState('');
  const [endereco, setEndereco] = useState<FormEndereco>(enderecoVazio);
  const [erroCep, setErroCep] = useState('');
  // Busca do endereço pelo CEP (ViaCEP / BrasilAPI)
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [avisoCep, setAvisoCep] = useState<'' | 'encontrado' | 'nao-encontrado'>('');
  const ultimoCep = useRef('');
  const numeroRef = useRef<HTMLInputElement>(null);
  const ruaRef = useRef<HTMLInputElement>(null);
  const [metodo, setMetodo] = useState<MetodoPagamento>('PIX');
  const [cartao, setCartao] = useState({ numero: '', validade: '', cvv: '', titular: '' });
  const [parcelas, setParcelas] = useState(1);
  const [isCalculando, setIsCalculando] = useState(false);
  const [isFinalizando, setIsFinalizando] = useState(false);
  const [erroFinal, setErroFinal] = useState('');
  // Compra já criada (estoque reservado) aguardando um pagamento válido — evita reservar de novo
  const [pendente, setPendente] = useState<{ codigo: string; assinatura: string } | null>(null);

  const assinatura = JSON.stringify(items.map(i => [i.peca.id, i.quantidade]));

  // Recalcula no servidor sempre que o carrinho muda
  useEffect(() => {
    if (!items.length) return;
    void carrinhoService.calcular(items, calculo?.frete?.cep).then(res => {
      if (res.success && res.data) {
        setCalculo(res.data);
        setErroCarrinho('');
      } else {
        setCalculo(null);
        setErroCarrinho(mensagemDeErro(res, 'Não foi possível calcular o carrinho.'));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const set = (chave: keyof FormEndereco) => (e: { target: { value: string } }) => setEndereco(atual => ({ ...atual, [chave]: e.target.value }));

  const calcularFrete = async (cep = endereco.cep) => {
    setIsCalculando(true);
    setErroCep('');
    const res = await carrinhoService.calcular(items, cep);
    setIsCalculando(false);
    if (!res.success || !res.data) {
      setErroCep(res.errors?.find(e => e.campo === 'cep')?.mensagem ?? mensagemDeErro(res)); // TC14: CEP inválido
      return;
    }
    setCalculo(res.data);
    const f = res.data.frete!;
    toast({
      title: 'Frete calculado!',
      description: `${brl(f.valor)} · entrega em até ${f.prazoDias} dias úteis (${f.regiao}).`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  /** CEP completo: preenche rua, bairro, cidade e UF e já calcula o frete */
  const preencherPeloCep = async (cep: string) => {
    ultimoCep.current = cep;
    setBuscandoCep(true);
    setAvisoCep('');
    const [achado] = await Promise.all([buscarCep(cep), calcularFrete(cep)]);
    if (ultimoCep.current !== cep) return; // a pessoa já digitou outro CEP
    setBuscandoCep(false);
    if (!achado) {
      setAvisoCep('nao-encontrado');
      return;
    }
    setEndereco(atual => ({
      ...atual,
      rua: achado.rua || atual.rua,
      bairro: achado.bairro || atual.bairro,
      cidade: achado.cidade,
      estado: achado.estado,
    }));
    setAvisoCep('encontrado');
    // Cursor vai direto para o que falta preencher
    (achado.rua ? numeroRef : ruaRef).current?.focus();
  };

  const finalizarCompra = async () => {
    setErroFinal('');
    if (!items.length) return;
    if (!calculo?.frete) {
      setErroFinal('Calcule o frete antes de confirmar.');
      return;
    }
    const faltando = (['rua', 'numero', 'cidade', 'estado'] as const).filter(c => !endereco[c].trim());
    if (faltando.length) {
      setErroFinal('Preencha o endereço de entrega: rua, número, cidade e UF.');
      return;
    }

    setIsFinalizando(true);
    try {
      // 1) Reserva atômica do estoque (HU11) — reaproveita a compra se o carrinho não mudou
      let codigo = pendente?.assinatura === assinatura ? pendente.codigo : null;
      if (!codigo) {
        const compra = await compraService.checkout(
          items.map(i => ({ produtoId: i.peca.id, quantidade: i.quantidade })),
          { ...endereco, cep: calculo.frete.cep, complemento: endereco.complemento || undefined, bairro: endereco.bairro || undefined },
        );
        if (!compra.success || !compra.data) {
          setErroFinal(mensagemDeErro(compra, 'Não foi possível finalizar a compra.'));
          return;
        }
        codigo = compra.data.codigo;
        setPendente({ codigo, assinatura });
      }

      // 2) Pagamento (HU5)
      const pagamento = await compraService.pagar(codigo, metodo, metodo === 'CARTAO' ? parcelas : 1, metodo === 'CARTAO' ? cartao : undefined);
      if (!pagamento.success || !pagamento.data) {
        if (pagamento.status === 402) setPendente(null); // cartão recusado: compra cancelada e estoque devolvido
        setErroFinal(mensagemDeErro(pagamento, 'Não foi possível processar o pagamento.'));
        return; // o carrinho fica intacto (HU5 cenário 4)
      }

      limparCarrinho();
      router.push(`/compra/${codigo}`);
    } finally {
      setIsFinalizando(false);
    }
  };

  const calculoAtual = items.length ? calculo : null;
  const subtotal = calculoAtual?.totalLiquido ?? 0;
  const frete = calculoAtual?.frete?.valor ?? 0;
  const totalGeral = calculoAtual?.totalGeral ?? 0;

  if (!items.length) {
    return (
      <Box minH="100vh" bg="#171412" color="white">
        <Navbar />
        <VStack py={24} spacing={4}>
          <Heading size="lg">Sua sacola está vazia</Heading>
          <Button bg="terra.500" color="black" onClick={() => router.push('/vitrine')}>
            Explorar a vitrine
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bgImage="url('/bg-pedidos.png')" bgSize="cover" bgPosition="center" bgAttachment="fixed" color="white" display="flex" flexDirection="column">
      <Navbar />

      <Flex direction={{ base: 'column', lg: 'row' }} maxW="1200px" w="100%" mx="auto" p={{ base: 4, md: 8 }} gap={8} mt={4}>
        <Box flex="1" bg="blackAlpha.600" p={6} borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200" alignSelf="flex-start" w="100%">
          <Heading size="lg" mb={6} fontFamily="heading">
            Resumo do Pedido
          </Heading>
          {erroCarrinho && (
            <Alert status="error" mb={4} borderRadius="md" bg="red.900" color="white">
              <AlertIcon />
              {erroCarrinho}
            </Alert>
          )}
          <VStack spacing={3} align="stretch">
            {items.map(item => {
              const linha = calculoAtual?.itens.find(i => i.produtoId === item.peca.id);
              return (
                <Flex key={item.peca.id} justify="space-between" align="center" bg="whiteAlpha.100" p={3} borderRadius="md" gap={3}>
                  <HStack spacing={4}>
                    <Image src={item.peca.imagemUrl} alt={item.peca.nome} boxSize="50px" objectFit="cover" borderRadius="sm" />
                    <Box>
                      <Text fontWeight="bold">{item.peca.nome}</Text>
                      <Text fontSize="sm" color="whiteAlpha.600">
                        Qtd: {item.quantidade}
                        {linha ? ` · ${brl(linha.precoUnitario)} cada` : ''}
                        {item.peca.artesaoNome ? ` · ${item.peca.artesaoNome}` : ''}
                      </Text>
                    </Box>
                  </HStack>
                  <Text color="terra.500" flexShrink={0}>
                    {linha ? brl(linha.subtotal) : '—'}
                  </Text>
                </Flex>
              );
            })}
          </VStack>

          <VStack spacing={2} align="stretch" mt={6} fontSize="lg">
            <Flex justify="space-between">
              <Text color="whiteAlpha.700">Subtotal:</Text>
              <Text>{brl(subtotal)}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text color="whiteAlpha.700">Frete{calculoAtual?.frete && 'envios' in calculoAtual.frete && Number(calculoAtual.frete.envios) > 1 ? ` (${calculoAtual.frete.envios} envios)` : ''}:</Text>
              <Text>{calculoAtual?.frete ? brl(frete) : 'informe o CEP'}</Text>
            </Flex>
            <Flex justify="space-between" fontWeight="bold" fontSize="xl" mt={2} color="terra.500">
              <Text>Total a Pagar:</Text>
              <Text>{brl(totalGeral)}</Text>
            </Flex>
            {metodo === 'CARTAO' && parcelas > 1 && (
              <Text textAlign="right" fontSize="sm" color="whiteAlpha.700">
                {parcelas}x de {brl(totalGeral / parcelas)} sem juros
              </Text>
            )}
            <Text fontSize="xs" color="whiteAlpha.500">
              Valores calculados pelo servidor com os preços atuais do catálogo. Cada artesão envia a sua parte com frete próprio.
            </Text>
          </VStack>
        </Box>

        <Box flex="1" bg="blackAlpha.600" p={6} borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200" w="100%">
          <Heading size="md" mb={4}>
            Endereço de entrega
          </Heading>
          <HStack mb={erroCep ? 2 : 4} align="flex-start">
            <Input
              placeholder="CEP (ex.: 01310-100)"
              aria-label="CEP"
              inputMode="numeric"
              autoComplete="postal-code"
              value={endereco.cep}
              onChange={e => {
                const cep = mascararCep(e.target.value);
                setEndereco(atual => ({ ...atual, cep }));
                setErroCep('');
                setAvisoCep('');
                if (apenasDigitos(cep).length === 8 && cep !== ultimoCep.current) void preencherPeloCep(cep);
                else if (apenasDigitos(cep).length < 8) {
                  ultimoCep.current = '';
                  setBuscandoCep(false);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && endereco.cep) void calcularFrete();
              }}
              maxLength={9}
              isInvalid={Boolean(erroCep)}
              {...campo}
            />
            <Button onClick={() => calcularFrete()} isLoading={isCalculando} variant="outline" isDisabled={!endereco.cep}>
              Calcular
            </Button>
          </HStack>
          {erroCep && (
            <Text color="red.300" mb={4} role="alert">
              {erroCep}
            </Text>
          )}
          {buscandoCep && (
            <HStack color="whiteAlpha.700" fontSize="sm" mb={3} role="status">
              <Spinner size="xs" color="terra.500" />
              <Text>Buscando o endereço…</Text>
            </HStack>
          )}
          {!buscandoCep && avisoCep === 'encontrado' && (
            <Text color="green.200" fontSize="sm" mb={3} role="status">
              ✓ Endereço preenchido pelo CEP. Confira e informe o número.
            </Text>
          )}
          {!buscandoCep && avisoCep === 'nao-encontrado' && !erroCep && (
            <Text color="orange.200" fontSize="sm" mb={3} role="status">
              Não encontramos esse CEP na base dos Correios. Preencha o endereço abaixo.
            </Text>
          )}
          {calculoAtual?.frete && (
            <Text color="whiteAlpha.700" fontSize="sm" mb={4}>
              Entrega para {calculoAtual.frete.cep} ({calculoAtual.frete.regiao}): até {calculoAtual.frete.prazoDias} dias úteis.
            </Text>
          )}
          <SimpleGrid columns={{ base: 1, sm: 6 }} spacing={3}>
            <Input ref={ruaRef} gridColumn={{ sm: 'span 4' }} placeholder="Rua / avenida" aria-label="Rua" autoComplete="address-line1" value={endereco.rua} onChange={set('rua')} {...campo} />
            <Input ref={numeroRef} gridColumn={{ sm: 'span 2' }} placeholder="Número" aria-label="Número" value={endereco.numero} onChange={set('numero')} {...campo} />
            <Input gridColumn={{ sm: 'span 3' }} placeholder="Complemento (opcional)" aria-label="Complemento" value={endereco.complemento} onChange={set('complemento')} {...campo} />
            <Input gridColumn={{ sm: 'span 3' }} placeholder="Bairro (opcional)" aria-label="Bairro" value={endereco.bairro} onChange={set('bairro')} {...campo} />
            <Input gridColumn={{ sm: 'span 4' }} placeholder="Cidade" aria-label="Cidade" value={endereco.cidade} onChange={set('cidade')} {...campo} />
            <Select gridColumn={{ sm: 'span 2' }} placeholder="UF" aria-label="UF" value={endereco.estado} onChange={set('estado')} sx={{ '& option': { color: '#fff', backgroundColor: '#2C2724' } }} {...campo}>
              {ESTADOS_BRASILEIROS.map(uf => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </Select>
          </SimpleGrid>

          <Divider borderColor="whiteAlpha.200" my={6} />

          <Heading size="md" mb={4}>
            Forma de Pagamento
          </Heading>
          <RadioGroup onChange={v => setMetodo(v as MetodoPagamento)} value={metodo} mb={4}>
            <VStack align="stretch" spacing={3}>
              <Radio value="PIX" colorScheme="orange">
                PIX (QR Code e copia e cola, válido por 30 minutos)
              </Radio>
              <Radio value="CARTAO" colorScheme="orange">
                Cartão de Crédito (até 6x sem juros)
              </Radio>
              <Radio value="BOLETO" colorScheme="orange">
                Boleto Bancário (vence em 3 dias úteis)
              </Radio>
            </VStack>
          </RadioGroup>

          {metodo === 'CARTAO' && (
            <SimpleGrid columns={{ base: 1, sm: 4 }} spacing={3} mb={2}>
              <Input gridColumn={{ sm: 'span 4' }} placeholder="Número do cartão" aria-label="Número do cartão" inputMode="numeric" autoComplete="cc-number" value={cartao.numero} onChange={e => setCartao(c => ({ ...c, numero: e.target.value }))} {...campo} />
              <Input gridColumn={{ sm: 'span 2' }} placeholder="Validade (MM/AA)" aria-label="Validade" autoComplete="cc-exp" maxLength={5} value={cartao.validade} onChange={e => setCartao(c => ({ ...c, validade: e.target.value }))} {...campo} />
              <Input gridColumn={{ sm: 'span 2' }} placeholder="CVV" aria-label="CVV" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={cartao.cvv} onChange={e => setCartao(c => ({ ...c, cvv: e.target.value }))} {...campo} />
              <Input gridColumn={{ sm: 'span 4' }} placeholder="Nome impresso no cartão" aria-label="Titular" autoComplete="cc-name" value={cartao.titular} onChange={e => setCartao(c => ({ ...c, titular: e.target.value }))} {...campo} />
              <Select gridColumn={{ sm: 'span 4' }} aria-label="Parcelas" value={parcelas} onChange={e => setParcelas(Number(e.target.value))} sx={{ '& option': { color: '#fff', backgroundColor: '#2C2724' } }} {...campo}>
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>
                    {n}x de {brl(totalGeral / n)} sem juros
                  </option>
                ))}
              </Select>
              <Text gridColumn={{ sm: 'span 4' }} fontSize="xs" color="whiteAlpha.500">
                Pagamento simulado (ambiente acadêmico). Cartão de teste aprovado: 4111 1111 1111 1111 · recusado: 4000 0000 0000 0002.
              </Text>
            </SimpleGrid>
          )}

          {erroFinal && (
            <Alert status="error" my={4} borderRadius="md" bg="red.900" color="white" role="alert">
              <AlertIcon />
              {erroFinal}
            </Alert>
          )}

          <Button w="100%" size="lg" mt={4} bg="terra.500" color="black" _hover={{ bg: 'terra.600' }} onClick={finalizarCompra} isLoading={isFinalizando} isDisabled={!calculoAtual || Boolean(erroCarrinho)}>
            {metodo === 'PIX' ? 'Gerar PIX e Concluir Pedido' : metodo === 'BOLETO' ? 'Gerar Boleto e Concluir Pedido' : 'Pagar e Concluir Pedido'}
          </Button>
        </Box>
      </Flex>
    </Box>
  );
}

export default function CheckoutPage() {
  return (
    <RoleGate role="comprador">
      <CheckoutContent />
    </RoleGate>
  );
}
