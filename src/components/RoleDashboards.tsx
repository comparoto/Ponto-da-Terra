'use client';
import { useEffect, useState } from 'react';
import { Box, Button, Flex, Heading, HStack, Input, Image, Select, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { Peca } from '@/types';
import { produtoService } from '@/services/produtoService';
import { DemoOrder, readOrders, saveOrders, readSession } from '@/services/demoAuth';
import { Artesao } from '@/types';
import { artesaoService } from '@/services/artesaoService';
const field = { bg: 'whiteAlpha.100', borderColor: 'whiteAlpha.300', color: 'white' };
function ProductManager({ artisanOnly = false }: { artisanOnly?: boolean }) {
 const session = readSession();
 const artisanId = session?.artisanId || '1';
 const defaultImage = 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80';
 const [products, setProducts] = useState<Peca[]>([]);
 const [name, setName] = useState('');
 const [price, setPrice] = useState('');
 const [category, setCategory] = useState('Cerâmica & Barro');
 const [imageUrl, setImageUrl] = useState(defaultImage);
 const [message, setMessage] = useState('');
 const [editingId, setEditingId] = useState<string | null>(null);
 const refresh = () => produtoService.getProdutos().then(setProducts);
 useEffect(() => { void refresh(); }, []);
 const list = artisanOnly ? products.filter(p => p.artesaoId === artisanId) : products;

 function selectImage(file?: File) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { setMessage('Escolha um arquivo de imagem.'); return; }
  if (file.size > 1_500_000) { setMessage('A imagem deve ter no máximo 1,5 MB.'); return; }
  const reader = new FileReader();
  reader.onload = () => {
   if (typeof reader.result === 'string') { setImageUrl(reader.result); setMessage('Imagem pronta para salvar.'); }
  };
  reader.onerror = () => setMessage('Não foi possível abrir essa imagem. Tente outro arquivo.');
  reader.readAsDataURL(file);
 }

 function add() {
  if (!name.trim() || Number(price) <= 0) { setMessage('Informe o nome da peça e um preço maior que zero.'); return; }
  const existing = products.find(p => p.id === editingId);
  produtoService.salvarProduto({
   id: editingId || `demo-${Date.now()}`,
   nome: name.trim(),
   preco: Number(price),
   categoria: category,
   artesaoId: artisanOnly ? artisanId : existing?.artesaoId || artisanId,
   artesaoNome: artisanOnly ? session?.name || 'Artesão Demonstração' : existing?.artesaoNome || 'Artesão Demonstração',
   artesaoCidade: existing?.artesaoCidade || 'Caruaru - PE',
   imagemUrl: imageUrl,
   descricao: existing?.descricao || 'Peça cadastrada no painel de demonstração.',
   emEstoque: true,
  });
  setEditingId(null); setName(''); setPrice(''); setCategory('Cerâmica & Barro'); setImageUrl(defaultImage);
  setMessage('Peça salva com sucesso.'); void refresh();
 }

 function remove(id: string) { produtoService.excluirProduto(id); void refresh(); }

 return <VStack align="stretch" spacing={5}>
  <Box bg="whiteAlpha.100" borderRadius="xl" p={{ base: 4, md: 5 }}>
   <Heading size="md" mb={4} color="white">Cadastrar peça</Heading>
   <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
    <Box><Text color="white" fontSize="md" fontWeight="semibold" mb={1}>Nome do produto</Text><Input placeholder="Ex.: Vaso artesanal" value={name} onChange={e => setName(e.target.value)} fontSize="md" minH="48px" _placeholder={{ color: 'whiteAlpha.700' }} {...field}/></Box>
    <Box><Text color="white" fontSize="md" fontWeight="semibold" mb={1}>Preço (R$)</Text><Input placeholder="Ex.: 85,00" type="number" min="0.01" step="0.01" value={price} onChange={e => setPrice(e.target.value)} fontSize="md" minH="48px" _placeholder={{ color: 'whiteAlpha.700' }} {...field}/></Box>
    <Box><Text color="white" fontSize="md" fontWeight="semibold" mb={1}>Categoria</Text><Select value={category} onChange={e => setCategory(e.target.value)} fontSize="md" minH="48px" {...field}><option>Cerâmica & Barro</option><option>Escultura & Madeira</option><option>Renda & Têxtil</option><option>Cestaria & Palha</option><option>Xilogravura</option></Select></Box>
    <Box><Text color="white" fontSize="md" fontWeight="semibold" mb={1}>Foto do produto</Text><Input type="file" accept="image/*" onChange={e => selectImage(e.target.files?.[0])} fontSize="sm" minH="48px" pt={2} color="white" borderColor="whiteAlpha.400" aria-label="Selecionar foto do produto"/></Box>
   </SimpleGrid>
   <Flex mt={4} gap={4} align="center" wrap="wrap">
    <Image src={imageUrl} alt="Prévia da imagem do produto" boxSize="88px" objectFit="cover" borderRadius="md" border="1px solid" borderColor="whiteAlpha.400" fallbackSrc={defaultImage}/>
    <Text color="whiteAlpha.800" fontSize="sm">Prévia da foto. Formatos de imagem, até 1,5 MB.</Text>
   </Flex>
   <Button mt={4} bg="terra.500" color="black" fontSize="md" minH="48px" _hover={{ bg: 'terra.600' }} onClick={add}>{editingId ? 'Salvar alterações' : 'Adicionar peça'}</Button>
   {message && <Text mt={3} color="terra.200" fontSize="md" role="status">{message}</Text>}
  </Box>
  <Heading size="md" color="white">{artisanOnly ? 'Minhas peças' : 'Catálogo de peças'}</Heading>
  {list.length ? list.map(p => <Flex key={p.id} bg="whiteAlpha.100" p={4} borderRadius="lg" align="center" justify="space-between" gap={3} wrap="wrap">
   <HStack spacing={4}><Image src={p.imagemUrl} alt={p.nome} boxSize="64px" objectFit="cover" borderRadius="md" fallbackSrc={defaultImage}/><Box><Text fontWeight="bold" color="white" fontSize="md">{p.nome}</Text><Text color="whiteAlpha.800" fontSize="sm">{p.categoria} · R$ {p.preco.toFixed(2).replace('.', ',')}</Text></Box></HStack>
   <HStack><Button size="md" variant="outline" color="white" borderColor="whiteAlpha.500" _hover={{ bg: 'whiteAlpha.200', color: 'terra.500', borderColor: 'terra.500' }} onClick={() => { setEditingId(p.id); setName(p.nome); setPrice(String(p.preco)); setCategory(p.categoria || 'Cerâmica & Barro'); setImageUrl(p.imagemUrl || defaultImage); setMessage(''); }}>Editar</Button><Button size="md" color="red.200" borderColor="red.400" variant="outline" _hover={{ bg: 'red.600', color: 'white' }} onClick={() => remove(p.id)}>Excluir</Button></HStack>
  </Flex>) : <Text color="whiteAlpha.800" fontSize="md">Nenhuma peça cadastrada.</Text>}
 </VStack>;
}
function OrderManager({ artisanOnly = false }: { artisanOnly?: boolean }) {
 const [orders, setOrders] = useState<DemoOrder[]>([]); const refresh=()=>{const all=readOrders();setOrders(artisanOnly?all.filter(o=>o.items.some(i=>i.artisanId===(readSession()?.artisanId || '1'))):all);}; useEffect(()=>{refresh();},[]);
 function setStatus(id:string,status:DemoOrder['status']){saveOrders(readOrders().map(o=>o.id===id?{...o,status}:o));refresh();}
 if (!orders.length) return <Text color="whiteAlpha.700">Ainda não há pedidos registrados nesta demonstração.</Text>;
 return <VStack align="stretch" spacing={3}>{orders.map(o=><Flex key={o.id} bg="whiteAlpha.100" p={4} borderRadius="lg" justify="space-between" align="center" wrap="wrap" gap={3}><Box><Text fontWeight="bold">{o.id} · R$ {o.total.toFixed(2)}</Text><Text color="whiteAlpha.700">{o.owner} · {new Date(o.date).toLocaleDateString('pt-BR')} · {o.items.map(i=>`${i.name} (${i.quantity})`).join(', ')}</Text></Box><HStack><Text>{o.status}</Text><Select size="sm" value={o.status} onChange={e=>setStatus(o.id,e.target.value as DemoOrder['status'])} aria-label="Atualizar status" w="145px"><option>Processando</option><option>Enviado</option><option>Entregue</option><option>Cancelado</option></Select></HStack></Flex>)}</VStack>;
}
export function ArtisanDashboard(){const [tab,setTab]=useState('products');return <VStack align="stretch" spacing={5}><Flex gap={3}><Button onClick={()=>setTab('products')} colorScheme={tab==='products'?'orange':'gray'}>Minhas peças</Button><Button onClick={()=>setTab('orders')} colorScheme={tab==='orders'?'orange':'gray'}>Pedidos</Button></Flex>{tab==='products'?<ProductManager artisanOnly/>:<OrderManager artisanOnly/>}</VStack>;}
function ArtisanManager(){
 const [artisans,setArtisans]=useState<Artesao[]>([]);const [name,setName]=useState('');const [city,setCity]=useState('');const [specialty,setSpecialty]=useState('');
 const refresh=()=>artesaoService.getArtesaos().then(setArtisans);useEffect(()=>{void refresh();},[]);
 function add(){if(!name.trim()||!city.trim())return;artesaoService.salvarArtesao({id:`admin-${Date.now()}`,nome:name.trim(),cidade:city.trim(),estado:'PE',especialidade:specialty.trim()||'Artesanato',imagemUrl:'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80'});setName('');setCity('');setSpecialty('');void refresh();}
 return <VStack align="stretch" spacing={4}><Box p={5} bg="whiteAlpha.100" borderRadius="xl"><Heading size="md" mb={4}>Cadastrar artesão</Heading><SimpleGrid columns={{base:1,md:4}} spacing={3}><Input placeholder="Nome" value={name} onChange={e=>setName(e.target.value)} {...field}/><Input placeholder="Cidade" value={city} onChange={e=>setCity(e.target.value)} {...field}/><Input placeholder="Especialidade" value={specialty} onChange={e=>setSpecialty(e.target.value)} {...field}/><Button bg="terra.500" color="black" onClick={add}>Cadastrar</Button></SimpleGrid></Box>{artisans.map(a=><Flex key={a.id} justify="space-between" align="center" p={4} bg="whiteAlpha.100" borderRadius="lg"><Box><Text fontWeight="bold">{a.nome}</Text><Text color="whiteAlpha.700">{a.cidade}, {a.estado} · {a.especialidade}</Text></Box>{a.id.startsWith('admin-')&&<Button size="sm" colorScheme="red" variant="outline" onClick={()=>{artesaoService.excluirArtesao(a.id);void refresh();}}>Remover</Button>}</Flex>)}</VStack>;
}export function AdminDashboard(){const [tab,setTab]=useState('overview');const [count,setCount]=useState({products:0,orders:0});useEffect(()=>{void produtoService.getProdutos().then(p=>setCount({products:p.length,orders:readOrders().length}));},[]);return <VStack align="stretch" spacing={5}><Flex gap={3} wrap="wrap">{[['overview','Resumo'],['products','Produtos'],['artisans','Artesãos'],['orders','Pedidos']].map(([id,label])=><Button key={id} onClick={()=>setTab(id)} colorScheme={tab===id?'orange':'gray'}>{label}</Button>)}</Flex>{tab==='overview'&&<SimpleGrid columns={{base:1,md:3}} spacing={4}><Box p={6} bg="whiteAlpha.100" borderRadius="xl"><Text>Produtos</Text><Heading color="terra.500">{count.products}</Heading></Box><Box p={6} bg="whiteAlpha.100" borderRadius="xl"><Text>Pedidos</Text><Heading color="terra.500">{count.orders}</Heading></Box><Box p={6} bg="whiteAlpha.100" borderRadius="xl"><Text>Perfis de demonstração</Text><Heading color="terra.500">3</Heading></Box><Text gridColumn={{md:'span 3'}} color="whiteAlpha.600">Os cadastros desta versão ficam neste navegador.</Text></SimpleGrid>}{tab==='products'&&<ProductManager/>}{tab==='orders'&&<OrderManager/>}{tab==='artisans'&&<ArtisanManager/>}</VStack>;}




