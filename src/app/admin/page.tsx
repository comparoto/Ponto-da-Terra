'use client';
import { useState } from 'react';
import { Badge, Box, Button, Flex, Heading, HStack, Image, Input, Select, SimpleGrid, Spinner, Text, Textarea, VStack } from '@chakra-ui/react';
import { Navbar } from '@/components/Navbar';
import { OrderManager } from '@/components/OrderManager';
import { RoleGate } from '@/components/Portal';
import { ProductManager } from '@/components/ProductManager';
import { BarList, brl, CartaoMetrica, dataBr } from '@/components/ui';
import { useCarregar } from '@/hooks/useCarregar';
import { useSession } from '@/hooks/useSession';
import { curadoriaService } from '@/services/curadoriaService';
import { mensagemDeErro } from '@/services/http';
import { adminService, type CadastroArtesao, type UsuarioAdmin } from '@/services/interacaoService';
import type { Peca } from '@/types';

const field = { bg: 'whiteAlpha.100', borderColor: 'whiteAlpha.300', color: 'white' };
const opcoes = { '& option': { color: '#fff', backgroundColor: '#2C2724' } };
const MIN_JUSTIFICATIVA = 10;

// ───────────── HU9 · Dashboard ─────────────

const hoje = () => new Date().toISOString().slice(0, 10);
const diasAtras = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const inicioDoMes = () => `${hoje().slice(0, 8)}01`;

function Dashboard() {
  const [periodo, setPeriodo] = useState({ de: inicioDoMes(), ate: hoje() });
  const { dados: m, erro, carregando } = useCarregar(() => adminService.metricas(periodo.de, periodo.ate), [periodo.de, periodo.ate]);
  const atalho = (de: string) => setPeriodo({ de, ate: hoje() });

  return (
    <VStack align="stretch" spacing={5}>
      <Flex gap={2} wrap="wrap" align="center">
        <Button size="sm" {...(periodo.de === inicioDoMes() ? { bg: 'terra.500', color: 'black', _hover: { bg: 'terra.600' } } : { variant: 'outline' })} onClick={() => atalho(inicioDoMes())}>
          Mês atual
        </Button>
        <Button size="sm" variant="outline" onClick={() => atalho(diasAtras(30))}>
          Últimos 30 dias
        </Button>
        <Button size="sm" variant="outline" onClick={() => atalho(diasAtras(90))}>
          Últimos 90 dias
        </Button>
        <HStack>
          <Input type="date" size="sm" aria-label="Data inicial" value={periodo.de} max={periodo.ate} onChange={e => setPeriodo(p => ({ ...p, de: e.target.value }))} {...field} />
          <Text>até</Text>
          <Input type="date" size="sm" aria-label="Data final" value={periodo.ate} min={periodo.de} onChange={e => setPeriodo(p => ({ ...p, ate: e.target.value }))} {...field} />
        </HStack>
      </Flex>

      {carregando && !m ? (
        <Spinner color="terra.500" />
      ) : erro ? (
        <Text color="red.300">{erro}</Text>
      ) : m ? (
        <>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4}>
            <CartaoMetrica titulo="Receita bruta" valor={brl(m.receitaBruta)} detalhe={`ticket médio ${brl(m.ticketMedio)}`} />
            <CartaoMetrica titulo="Pedidos pagos" valor={m.pedidosPagos} />
            <CartaoMetrica titulo="Pedidos concluídos" valor={m.pedidosConcluidos} detalhe="entregues ao comprador" />
            <CartaoMetrica titulo="Novos artesãos" valor={m.novosArtesaos} />
          </SimpleGrid>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box p={5} bg="whiteAlpha.100" borderRadius="xl">
              <Heading size="sm" mb={3}>
                Receita por dia
              </Heading>
              <BarList itens={m.receitaPorDia.map(d => ({ rotulo: dataBr(d.dia), valor: d.receita }))} formatar={brl} />
            </Box>
            <Box p={5} bg="whiteAlpha.100" borderRadius="xl">
              <Heading size="sm" mb={3}>
                Artesãos mais ativos
              </Heading>
              <BarList itens={m.artesaosMaisAtivos.map(a => ({ rotulo: `${a.nome} (${a.pedidos} ped.)`, valor: a.receita }))} formatar={brl} />
            </Box>
            <Box p={5} bg="whiteAlpha.100" borderRadius="xl">
              <Heading size="sm" mb={3}>
                Peças mais vendidas
              </Heading>
              <BarList itens={m.pecasMaisVendidas.map(p => ({ rotulo: p.titulo, valor: p.quantidade }))} formatar={v => `${v} un.`} />
            </Box>
            <Box p={5} bg="whiteAlpha.100" borderRadius="xl">
              <Heading size="sm" mb={3}>
                Termos mais buscados na vitrine
              </Heading>
              <BarList itens={m.termosMaisBuscados.map(t => ({ rotulo: t.termo, valor: t.buscas }))} formatar={v => `${v} busca(s)`} vazio="Nenhuma busca registrada ainda." />
            </Box>
          </SimpleGrid>
          <Text fontSize="xs" color="whiteAlpha.700">
            Relatório gerado em {m.geradoEmMs} ms (consultas executadas em paralelo).
          </Text>
        </>
      ) : null}
    </VStack>
  );
}

// ───────────── HU8 · Curadoria ─────────────

/** Aprovar publica a peça; reprovar exige motivo, NÃO apaga a peça e avisa o artesão (TC04). */
function ApprovalManager({ onChange }: { onChange: () => void }) {
  const { dados: pendentes, erro, carregando, recarregar } = useCarregar(() => curadoriaService.fila('PENDENTE'));
  const [reprovando, setReprovando] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [processando, setProcessando] = useState<string | null>(null);

  async function aprovar(peca: Peca) {
    setProcessando(peca.id);
    const res = await curadoriaService.aprovar(peca.id);
    setProcessando(null);
    setMensagem(res.success ? `"${peca.nome}" aprovada e publicada na vitrine. O artesão foi notificado.` : mensagemDeErro(res));
    recarregar();
    onChange();
  }

  async function confirmarReprovacao(peca: Peca) {
    if (justificativa.trim().length < MIN_JUSTIFICATIVA) {
      setMensagem(`Descreva o motivo da reprovação (mínimo de ${MIN_JUSTIFICATIVA} caracteres).`);
      return;
    }
    setProcessando(peca.id);
    const res = await curadoriaService.reprovar(peca.id, justificativa.trim());
    setProcessando(null);
    if (!res.success) {
      setMensagem(mensagemDeErro(res));
      return;
    }
    setMensagem(`"${peca.nome}" reprovada. O artesão recebeu o motivo e pode corrigir a peça.`);
    setReprovando(null);
    setJustificativa('');
    recarregar();
    onChange();
  }

  if (carregando) return <Text color="whiteAlpha.700">Carregando fila de curadoria...</Text>;

  return (
    <VStack align="stretch" spacing={4}>
      {(mensagem || erro) && (
        <Text color="terra.200" role="status">
          {mensagem || erro}
        </Text>
      )}
      {!pendentes?.length ? (
        <Text color="whiteAlpha.700">Não há peças aguardando aprovação no momento.</Text>
      ) : (
        <Heading size="md" color="white" mb={2}>
          Aguardando sua aprovação ({pendentes.length})
        </Heading>
      )}
      {pendentes?.map(p => (
        <Box key={p.id} bg="whiteAlpha.100" p={4} borderRadius="lg" border="1px solid" borderColor="yellow.600">
          <Flex align="center" justify="space-between" gap={3} wrap="wrap">
            <HStack spacing={4} align="flex-start">
              <Image src={p.imagemUrl} alt={p.nome} boxSize="64px" objectFit="cover" borderRadius="md" fallbackSrc="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80" />
              <Box>
                <Text fontWeight="bold" color="white">
                  {p.nome}
                </Text>
                <Text color="whiteAlpha.700" fontSize="sm">
                  Por: {p.artesaoNome} · {brl(p.preco)} · Estoque: {p.estoque ?? 0}
                </Text>
                <Text color="whiteAlpha.600" fontSize="sm">
                  Técnica: {p.tecnica} · Polo de origem: {p.poloOrigem}
                </Text>
                {p.descricao && (
                  <Text color="whiteAlpha.600" fontSize="sm" noOfLines={2}>
                    {p.descricao}
                  </Text>
                )}
              </Box>
            </HStack>
            <HStack>
              <Button size="sm" colorScheme="green" isLoading={processando === p.id && reprovando !== p.id} onClick={() => aprovar(p)}>
                Aprovar
              </Button>
              <Button
                size="sm"
                colorScheme="red"
                variant="outline"
                onClick={() => {
                  setReprovando(reprovando === p.id ? null : p.id);
                  setJustificativa('');
                }}
              >
                Reprovar
              </Button>
            </HStack>
          </Flex>
          {reprovando === p.id && (
            <Box mt={4}>
              <Text fontSize="sm" mb={1} fontWeight="semibold">
                Motivo da reprovação (será enviado ao artesão)
              </Text>
              <Textarea value={justificativa} onChange={e => setJustificativa(e.target.value)} placeholder="Ex.: Falta nitidez nas fotos" rows={2} {...field} />
              <HStack mt={2}>
                <Button size="sm" colorScheme="red" isLoading={processando === p.id} onClick={() => confirmarReprovacao(p)}>
                  Confirmar reprovação
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReprovando(null)}>
                  Cancelar
                </Button>
              </HStack>
            </Box>
          )}
        </Box>
      ))}
    </VStack>
  );
}

// ───────────── HU8 · Cadastros de novos artesãos ─────────────

function CadastroPendente({ c, onDecidido }: { c: CadastroArtesao; onDecidido: (msg: string) => void }) {
  const [reprovando, setReprovando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function decidir(aprovar: boolean) {
    if (!aprovar && motivo.trim().length < MIN_JUSTIFICATIVA) {
      setErro(`Descreva o motivo (mínimo de ${MIN_JUSTIFICATIVA} caracteres).`);
      return;
    }
    setSalvando(true);
    const res = aprovar ? await adminService.aprovarCadastro(c.artesaoId) : await adminService.reprovarCadastro(c.artesaoId, motivo.trim());
    setSalvando(false);
    if (!res.success) {
      setErro(mensagemDeErro(res));
      return;
    }
    onDecidido(aprovar ? `Cadastro de ${c.nome} aprovado: o perfil já aparece na vitrine.` : `Cadastro de ${c.nome} reprovado. O artesão recebeu o motivo.`);
  }

  return (
    <Box bg="whiteAlpha.100" p={4} borderRadius="lg" border="1px solid" borderColor="blue.400">
      <Flex justify="space-between" align="center" gap={3} wrap="wrap">
        <Box>
          <Text fontWeight="bold">{c.nome}</Text>
          <Text color="whiteAlpha.700" fontSize="sm">
            {c.email} · {c.cidade}/{c.estado} · {c.especialidade ?? 'Artesanato'} · {c.pecasCadastradas} peça(s) cadastrada(s) · desde {dataBr(c.dataCadastro)}
          </Text>
          {c.biografia && (
            <Text color="whiteAlpha.600" fontSize="sm" noOfLines={2}>
              {c.biografia}
            </Text>
          )}
        </Box>
        <HStack>
          <Button size="sm" colorScheme="green" isLoading={salvando && !reprovando} onClick={() => decidir(true)}>
            Aprovar cadastro
          </Button>
          <Button size="sm" colorScheme="red" variant="outline" onClick={() => setReprovando(r => !r)}>
            Reprovar
          </Button>
        </HStack>
      </Flex>
      {reprovando && (
        <Box mt={3}>
          <Textarea size="sm" rows={2} placeholder="Motivo (ex.: fotos não comprovam a técnica artesanal)" value={motivo} onChange={e => setMotivo(e.target.value)} {...field} />
          <Button size="sm" mt={2} colorScheme="red" isLoading={salvando} onClick={() => decidir(false)}>
            Confirmar reprovação do cadastro
          </Button>
        </Box>
      )}
      {erro && (
        <Text color="red.300" fontSize="sm" mt={2} role="alert">
          {erro}
        </Text>
      )}
    </Box>
  );
}

function CadastrosPendentes({ onChange }: { onChange: () => void }) {
  const { dados: cadastros, recarregar } = useCarregar(() => adminService.cadastrosPendentes());
  const [mensagem, setMensagem] = useState('');
  if (!cadastros?.length && !mensagem) return null;
  return (
    <VStack align="stretch" spacing={3} mb={6}>
      <Heading size="md">Novos artesãos aguardando aprovação ({cadastros?.length ?? 0})</Heading>
      {mensagem && (
        <Text color="terra.200" role="status">
          {mensagem}
        </Text>
      )}
      {cadastros?.map(c => (
        <CadastroPendente
          key={c.artesaoId}
          c={c}
          onDecidido={msg => {
            setMensagem(msg);
            recarregar();
            onChange();
          }}
        />
      ))}
    </VStack>
  );
}

// ───────────── HU16 · Usuários ─────────────

const COR_STATUS_USUARIO = { ATIVO: 'green', INATIVO: 'gray', SUSPENSO: 'red' } as const;
const ROTULO_TIPO = { ADMIN: 'Administrador', ARTESAO: 'Artesão', CONSUMIDOR: 'Comprador' } as const;

function LinhaUsuario({ u, onAtualizar }: { u: UsuarioAdmin; onAtualizar: () => void }) {
  const [suspendendo, setSuspendendo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function executar(acao: () => ReturnType<typeof adminService.reativar>) {
    setSalvando(true);
    const res = await acao();
    setSalvando(false);
    if (!res.success) {
      setErro(mensagemDeErro(res));
      return;
    }
    setSuspendendo(false);
    setMotivo('');
    setErro('');
    onAtualizar();
  }

  return (
    <Box p={4} bg="whiteAlpha.100" borderRadius="lg">
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <Box>
          <HStack>
            <Text fontWeight="bold">{u.nome}</Text>
            <Badge colorScheme={COR_STATUS_USUARIO[u.status]}>{u.status}</Badge>
            {u.statusCadastro && u.statusCadastro !== 'APROVADO' && <Badge colorScheme={u.statusCadastro === 'PENDENTE' ? 'blue' : 'orange'}>cadastro {u.statusCadastro.toLowerCase()}</Badge>}
          </HStack>
          <Text color="whiteAlpha.700" fontSize="sm">
            {u.email} · {ROTULO_TIPO[u.tipo]} · desde {dataBr(u.dataCadastro)}
            {u.tipo === 'ARTESAO' ? ` · ${u.produtosAtivos} peça(s) publicada(s)` : ''}
          </Text>
          {u.motivoSuspensao && (
            <Text color="red.200" fontSize="sm">
              Motivo: {u.motivoSuspensao}
            </Text>
          )}
        </Box>
        {u.tipo !== 'ADMIN' &&
          (u.status !== 'ATIVO' ? (
            <Button size="sm" colorScheme="green" variant="outline" isLoading={salvando} onClick={() => executar(() => adminService.reativar(u.id))}>
              Reativar conta
            </Button>
          ) : (
            <HStack>
              <Button size="sm" variant="outline" isLoading={salvando && !suspendendo} onClick={() => executar(() => adminService.inativar(u.id, 'Inativada pela administração'))}>
                Inativar conta
              </Button>
              <Button size="sm" colorScheme="red" variant="outline" onClick={() => setSuspendendo(s => !s)}>
                Suspender conta
              </Button>
            </HStack>
          ))}
      </Flex>
      {suspendendo && (
        <Box mt={3}>
          <Textarea size="sm" rows={2} placeholder="Motivo formal da suspensão (ex.: venda de peças industrializadas como artesanais)" value={motivo} onChange={e => setMotivo(e.target.value)} {...field} />
          <Text fontSize="xs" color="whiteAlpha.600" mt={1}>
            A suspensão encerra as sessões ativas imediatamente e oculta as peças do artesão na vitrine.
          </Text>
          <HStack mt={2}>
            <Button size="sm" colorScheme="red" isLoading={salvando} onClick={() => executar(() => adminService.suspender(u.id, motivo))}>
              Confirmar suspensão
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSuspendendo(false)}>
              Cancelar
            </Button>
          </HStack>
        </Box>
      )}
      {erro && (
        <Text color="red.300" fontSize="sm" mt={2} role="alert">
          {erro}
        </Text>
      )}
    </Box>
  );
}

function UserManager() {
  const [filtros, setFiltros] = useState({ tipo: '', status: '', busca: '' });
  const { dados: usuarios, erro, carregando, recarregar } = useCarregar(() => adminService.usuarios(filtros), [filtros.tipo, filtros.status, filtros.busca]);

  return (
    <VStack align="stretch" spacing={3}>
      <Flex gap={3} wrap="wrap">
        <Input maxW="260px" placeholder="Buscar por nome ou e-mail" aria-label="Buscar usuário" value={filtros.busca} onChange={e => setFiltros(f => ({ ...f, busca: e.target.value }))} {...field} />
        <Select maxW="200px" aria-label="Tipo de conta" value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))} sx={opcoes} {...field}>
          <option value="">Todos os perfis</option>
          <option value="CONSUMIDOR">Compradores</option>
          <option value="ARTESAO">Artesãos</option>
          <option value="ADMIN">Administradores</option>
        </Select>
        <Select maxW="200px" aria-label="Situação" value={filtros.status} onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))} sx={opcoes} {...field}>
          <option value="">Todas as situações</option>
          <option value="ATIVO">Ativos</option>
          <option value="SUSPENSO">Suspensos</option>
          <option value="INATIVO">Inativos</option>
        </Select>
      </Flex>
      {carregando ? <Spinner color="terra.500" /> : erro ? <Text color="red.300">{erro}</Text> : usuarios?.map(u => <LinhaUsuario key={u.id} u={u} onAtualizar={recarregar} />)}
    </VStack>
  );
}

// ───────────── Página ─────────────

function AdminContent() {
  const session = useSession();
  const [tab, setTab] = useState('overview');
  const { dados: pendentes, recarregar: recarregarPendentes } = useCarregar(() => curadoriaService.fila('PENDENTE'));
  const { dados: cadastros, recarregar: recarregarCadastros } = useCarregar(() => adminService.cadastrosPendentes());
  const totalAprovacoes = (pendentes?.length ?? 0) + (cadastros?.length ?? 0);

  return (
    <Box maxW="1100px" mx="auto" p={{ base: 4, md: 8 }}>
      <Box mb={8}>
        <Text color="terra.500" fontSize="sm" fontWeight="bold" textTransform="uppercase">
          Administração · {session?.name}
        </Text>
        <Heading size="xl" mt={1}>
          Painel Administrativo
        </Heading>
        <Text color="whiteAlpha.700" mt={2}>
          Indicadores, curadoria, usuários e pedidos da plataforma.
        </Text>
      </Box>

      <VStack align="stretch" spacing={5}>
        <Flex gap={3} wrap="wrap" borderBottom="1px solid" borderColor="whiteAlpha.200" pb={4}>
          {[
            ['overview', 'Indicadores'],
            ['approvals', `Aprovações${totalAprovacoes ? ` (${totalAprovacoes})` : ''}`],
            ['products', 'Catálogo'],
            ['users', 'Usuários'],
            ['orders', 'Pedidos'],
          ].map(([id, label]) => (
            <Button key={id} onClick={() => setTab(id)} {...(tab === id ? { bg: 'terra.500', color: 'black', _hover: { bg: 'terra.600' } } : { variant: 'ghost' })} aria-pressed={tab === id}>
              {label}
            </Button>
          ))}
        </Flex>

        {tab === 'overview' && <Dashboard />}
        {tab === 'approvals' && (
          <>
            <CadastrosPendentes onChange={recarregarCadastros} />
            <ApprovalManager onChange={recarregarPendentes} />
          </>
        )}
        {tab === 'products' && <ProductManager />}
        {tab === 'users' && <UserManager />}
        {tab === 'orders' && <OrderManager />}
      </VStack>
    </Box>
  );
}

export default function AdminPage() {
  return (
    <RoleGate role="administrador">
      <Box minH="100vh" bg="#171412" color="white">
        <Navbar />
        <AdminContent />
      </Box>
    </RoleGate>
  );
}
