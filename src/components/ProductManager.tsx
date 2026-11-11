'use client';
import { useState } from 'react';
import { Box, Button, Flex, Heading, HStack, Input, Image, Select, SimpleGrid, Text, Textarea, VStack, Badge } from '@chakra-ui/react';
import { Peca } from '@/types';
import { produtoService } from '@/services/produtoService';
import { mensagemDeErro } from '@/services/http';
import { readSession } from '@/services/authService';
import { useCarregar } from '@/hooks/useCarregar';

const field = { bg: 'whiteAlpha.100', borderColor: 'whiteAlpha.300', color: 'white' };
const label = { color: 'white', fontSize: 'md', fontWeight: 'semibold', mb: 1 } as const;
const inputProps = { fontSize: 'md', minH: '48px', _placeholder: { color: 'whiteAlpha.700' }, ...field };

const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const defaultImage = 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80';

const STATUS: Record<string, { texto: string; cor: string }> = {
  PENDENTE: { texto: 'Em análise', cor: 'yellow' },
  ATIVO: { texto: 'Publicado', cor: 'green' },
  REJEITADO: { texto: 'Reprovado', cor: 'red' },
};

const formVazio = { nome: '', preco: '', estoque: '1', categoriaId: '', tecnica: '', poloOrigem: '', descricao: '' };

export function ProductManager({ artisanOnly = false }: { artisanOnly?: boolean }) {
  // Lista e categorias vêm da API (o componente só é exibido no cliente, dentro do RoleGate)
  const lista = useCarregar(() => (artisanOnly ? produtoService.listarMinhas() : produtoService.getProdutos()), [artisanOnly]);
  const categoriasApi = useCarregar(() => (artisanOnly ? produtoService.getCategorias() : Promise.resolve({ success: true, data: [], error: null })), [artisanOnly]);
  const products: Peca[] = lista.dados ?? [];
  const categorias = categoriasApi.dados ?? [];
  // Polo de origem já vem preenchido com a cidade do ateliê
  const [form, setForm] = useState(() => ({ ...formVazio, poloOrigem: artisanOnly ? readSession()?.city ?? '' : '' }));
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState(defaultImage);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const avisar = (texto: string, erro = false) => { setMessage(texto); setIsError(erro); };

  const refresh = lista.recarregar;

  const set = (campo: keyof typeof formVazio) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [campo]: e.target.value }));

  function selectImage(file?: File) {
    if (!file) return;
    // Mesmas regras do servidor (TC10): só JPG/PNG até 5 MB
    if (!['image/jpeg', 'image/png'].includes(file.type)) { avisar('Formato não suportado. Envie uma imagem JPG ou PNG de até 5 MB.', true); return; }
    if (file.size > TAMANHO_MAXIMO) { avisar('A imagem deve ter no máximo 5 MB.', true); return; }
    setFoto(file);
    setPreview(URL.createObjectURL(file));
    avisar('Imagem pronta para enviar.');
  }

  function limpar() {
    setEditingId(null);
    setForm({ ...formVazio, poloOrigem: readSession()?.city || '' });
    setFoto(null);
    setPreview(defaultImage);
  }

  async function salvar() {
    // Validação rápida na tela; a validação oficial é feita pela API (TC05/TC09)
    const faltando = [
      !form.nome.trim() && 'nome da peça',
      !(Number(form.preco) > 0) && 'preço maior que zero',
      !form.tecnica.trim() && 'técnica artesanal',
      !form.poloOrigem.trim() && 'polo de origem',
      !(Number.isInteger(Number(form.estoque)) && Number(form.estoque) >= 0) && 'estoque (0 ou mais)',
      !editingId && !foto && 'foto da peça',
    ].filter(Boolean);
    if (faltando.length) { avisar(`Preencha: ${faltando.join(', ')}.`, true); return; }

    const dados = {
      nome: form.nome.trim(),
      preco: Math.round(Number(form.preco) * 100) / 100,
      categoriaId: form.categoriaId || undefined,
      tecnica: form.tecnica.trim(),
      poloOrigem: form.poloOrigem.trim(),
      descricao: form.descricao.trim() || undefined,
    };

    setSaving(true);
    const res = editingId
      ? await produtoService.atualizar(editingId, dados, Number(form.estoque), foto ?? undefined)
      : await produtoService.criar(dados, Number(form.estoque), foto ?? undefined);
    setSaving(false);

    if (!res.success) { avisar(mensagemDeErro(res), true); return; }
    limpar();
    avisar(editingId ? 'Alterações salvas. A peça voltou para análise do administrador.' : 'Peça enviada para aprovação do administrador!');
    refresh();
  }

  function editar(p: Peca) {
    setEditingId(p.id);
    setForm({
      nome: p.nome,
      preco: String(p.preco),
      estoque: String(p.estoque ?? 0),
      categoriaId: p.categoriaId ?? '',
      tecnica: p.tecnica ?? '',
      poloOrigem: p.poloOrigem ?? '',
      descricao: p.descricao ?? '',
    });
    setFoto(null);
    setPreview(p.imagemUrl || defaultImage);
    avisar('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(id: string) {
    if (!window.confirm('Excluir esta peça?')) return;
    const res = await produtoService.excluir(id);
    if (!res.success) { avisar(mensagemDeErro(res), true); return; }
    if (editingId === id) limpar();
    refresh();
  }

  return <VStack align="stretch" spacing={5}>
    {artisanOnly && (
      <Box bg="whiteAlpha.100" borderRadius="xl" p={{ base: 4, md: 5 }}>
        <Heading size="md" mb={4} color="white">{editingId ? 'Editar peça' : 'Cadastrar peça'}</Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Box><Text {...label}>Nome da peça *</Text><Input aria-label="Nome da peça" placeholder="Ex.: Vaso artesanal" value={form.nome} onChange={set('nome')} {...inputProps}/></Box>
          <Box><Text {...label}>Preço (R$) *</Text><Input aria-label="Preço em reais" placeholder="Ex.: 85.00" type="number" min="0.01" step="0.01" value={form.preco} onChange={set('preco')} {...inputProps}/></Box>
          <Box><Text {...label}>Técnica artesanal *</Text><Input aria-label="Técnica artesanal" placeholder="Ex.: Barro, Renda Renascença" value={form.tecnica} onChange={set('tecnica')} {...inputProps}/></Box>
          <Box><Text {...label}>Polo de origem *</Text><Input aria-label="Polo de origem" placeholder="Ex.: Caruaru, Pesqueira" value={form.poloOrigem} onChange={set('poloOrigem')} {...inputProps}/></Box>
          <Box><Text {...label}>Estoque disponível *</Text><Input aria-label="Estoque disponível" type="number" min="0" step="1" value={form.estoque} onChange={set('estoque')} {...inputProps}/></Box>
          <Box>
            <Text {...label}>Categoria</Text>
            <Select aria-label="Categoria" placeholder="Selecione" value={form.categoriaId} onChange={set('categoriaId')} fontSize="md" minH="48px" sx={{ '& option': { color: '#fff', backgroundColor: '#2C2724' } }} {...field}>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </Box>
          <Box gridColumn={{ md: 'span 2' }}><Text {...label}>Descrição</Text><Textarea aria-label="Descrição" placeholder="História, materiais e cuidados com a peça" value={form.descricao} onChange={set('descricao')} rows={3} {...field}/></Box>
          <Box><Text {...label}>Foto da peça {editingId ? '(opcional: substitui a atual)' : '*'}</Text><Input type="file" accept="image/jpeg,image/png" onChange={e => selectImage(e.target.files?.[0])} fontSize="sm" minH="48px" pt={2} color="white" borderColor="whiteAlpha.400" aria-label="Selecionar foto do produto"/></Box>
        </SimpleGrid>
        <Flex mt={4} gap={4} align="center" wrap="wrap">
          <Image src={preview} alt="Prévia da imagem do produto" boxSize="88px" objectFit="cover" borderRadius="md" border="1px solid" borderColor="whiteAlpha.400" fallbackSrc={defaultImage}/>
          <Text color="whiteAlpha.800" fontSize="sm">Prévia da foto. JPG ou PNG, até 5 MB. Toda peça nova ou editada passa pela curadoria antes de aparecer na vitrine.</Text>
        </Flex>
        <HStack mt={4}>
          <Button bg="terra.500" color="black" fontSize="md" minH="48px" _hover={{ bg: 'terra.600' }} onClick={salvar} isLoading={saving}>{editingId ? 'Salvar alterações' : 'Adicionar peça'}</Button>
          {editingId && <Button variant="ghost" onClick={limpar}>Cancelar edição</Button>}
        </HStack>
        {message && <Text mt={3} color={isError ? 'red.200' : 'terra.100'} fontSize="md" role={isError ? 'alert' : 'status'}>{message}</Text>}
      </Box>
    )}

    {!artisanOnly && message && <Text color={isError ? 'red.200' : 'terra.100'} role="alert">{message}</Text>}

    {lista.erro && <Text color="red.200" role="alert">{lista.erro}</Text>}

    <Heading size="md" color="white">{artisanOnly ? 'Minhas peças' : 'Catálogo de peças aprovadas'}</Heading>
    {products.length ? products.map(p => <Flex key={p.id} bg="whiteAlpha.100" p={4} borderRadius="lg" align="center" justify="space-between" gap={3} wrap="wrap">
      <HStack spacing={4} align="flex-start">
        <Image src={p.imagemUrl} alt={p.nome} boxSize="64px" objectFit="cover" borderRadius="md" fallbackSrc={defaultImage}/>
        <Box>
          <HStack wrap="wrap">
            <Text fontWeight="bold" color="white" fontSize="md">{p.nome}</Text>
            {artisanOnly && p.status && <Badge colorScheme={STATUS[p.status].cor}>{STATUS[p.status].texto}</Badge>}
          </HStack>
          <Text color="whiteAlpha.800" fontSize="sm">
            {[p.categoria, p.tecnica, p.poloOrigem].filter(Boolean).join(' · ')} · R$ {p.preco.toFixed(2).replace('.', ',')} · Estoque: {p.estoque ?? 0}
          </Text>
          {!artisanOnly && p.artesaoNome && <Text color="whiteAlpha.600" fontSize="sm">Por {p.artesaoNome}</Text>}
          {artisanOnly && p.status === 'REJEITADO' && p.justificativaCuradoria && (
            <Text color="red.200" fontSize="sm" mt={1}>Motivo da reprovação: {p.justificativaCuradoria}</Text>
          )}
        </Box>
      </HStack>
      <HStack>
        {artisanOnly && <Button size="md" variant="outline" color="white" borderColor="whiteAlpha.500" _hover={{ bg: 'whiteAlpha.200', color: 'terra.500', borderColor: 'terra.500' }} onClick={() => editar(p)}>Editar</Button>}
        <Button size="md" color="red.200" borderColor="red.400" variant="outline" _hover={{ bg: 'red.600', color: 'white' }} onClick={() => remove(p.id)}>Excluir</Button>
      </HStack>
    </Flex>) : <Text color="whiteAlpha.800" fontSize="md">Nenhuma peça encontrada.</Text>}
  </VStack>;
}
