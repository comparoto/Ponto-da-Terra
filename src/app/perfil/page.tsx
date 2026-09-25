'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Box, Button, Flex, Heading, HStack, Input, Select, Stack, Text, Textarea, VStack } from '@chakra-ui/react';
import { deleteAccount, DemoSession, readSession, updateAccountProfile } from '@/services/demoAuth';
import { artesaoService } from '@/services/artesaoService';
import { Navbar } from '@/components/Navbar';

const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const areasArtesanato = ['Cerâmica e barro','Escultura e madeira','Renda e têxtil','Cestaria e palha','Xilogravura','Joalheria e acessórios','Pintura e artes visuais','Outro'];
const fieldStyles = { color: 'white', bg: '#332C28', borderColor: '#99877A', _placeholder: { color: '#C8BDB5', opacity: 1 }, _focus: { borderColor: 'terra.500', boxShadow: '0 0 0 1px #D9B596' } };

export default function PerfilPage() {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [bio, setBio] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const current = readSession();
    if (!current) { router.replace('/login'); return; }
    setSession(current);
    setName(current.name);
    setCity(current.city || '');
    setState(current.state || '');
    setSpecialty(current.specialty && areasArtesanato.includes(current.specialty) ? current.specialty : current.specialty ? 'Outro' : '');
    setCustomSpecialty(current.specialty && !areasArtesanato.includes(current.specialty) ? current.specialty : '');
    setBio(current.bio || '');
    setImageUrl(current.imageUrl || '');
    if (current.role === 'artesao' && current.artisanId) {
      const artisan = artesaoService.listarArtesaos().find(item => item.id === current.artisanId);
      if (artisan) {
        setCity(current.city || artisan.cidade);
        setState(current.state || artisan.estado);
        const artisanSpecialty = current.specialty || artisan.especialidade || '';
        setSpecialty(areasArtesanato.includes(artisanSpecialty) ? artisanSpecialty : artisanSpecialty ? 'Outro' : '');
        setCustomSpecialty(artisanSpecialty && !areasArtesanato.includes(artisanSpecialty) ? artisanSpecialty : '');
        setBio(current.bio || artisan.biografia || '');
        setImageUrl(current.imageUrl || artisan.imagemUrl);
      }
    }
  }, [router]);

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMessage('Selecione um arquivo de imagem.'); return; }
    if (file.size > 1_500_000) { setMessage('A foto deve ter no máximo 1,5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') { setImageUrl(reader.result); setMessage(''); } };
    reader.onerror = () => setMessage('Não foi possível carregar essa foto.');
    reader.readAsDataURL(file);
  }

  function saveProfile() {
    if (!session || !name.trim()) { setMessage('Informe seu nome.'); return; }
    const artisanSpecialty = specialty === 'Outro' ? customSpecialty.trim() : specialty.trim();
    if (session.role === 'artesao' && (!city.trim() || !state || !artisanSpecialty)) { setMessage('Preencha cidade, estado e área de atuação.'); return; }
    const updated: DemoSession = { ...session, name: name.trim(), imageUrl, ...(session.role === 'artesao' ? { city: city.trim(), state, specialty: artisanSpecialty, bio: bio.trim() } : {}) };
    try {
      updateAccountProfile(updated);
      setSession(updated);
      setMessage('Perfil atualizado com sucesso.');
    } catch {
      setMessage('Não foi possível salvar as alterações neste navegador.');
    }
  }

  function removeProfile() {
    if (!session || !window.confirm('Tem certeza que deseja excluir sua conta? Essa ação encerra sua sessão e não pode ser desfeita.')) return;
    deleteAccount(session);
    router.replace('/home');
  }

  return (
    <Box minH="100vh" bg="#171412" color="white">
      <Navbar />
      <Box maxW="760px" mx="auto" p={{ base: 4, md: 8 }}>
        <Button variant="outline" color="white" borderColor="whiteAlpha.500" onClick={() => router.push('/home')}>Voltar à Home</Button>
        <VStack align="stretch" mt={8} p={{ base: 5, md: 8 }} bg="whiteAlpha.100" borderRadius="xl" spacing={5}>
          <Heading size="lg">Editar perfil</Heading>
          <HStack spacing={4}>
            <Avatar name={name} src={imageUrl || undefined} size="xl" />
            <Box><Text fontWeight="semibold" mb={2}>Foto do perfil</Text><Input type="file" accept="image/*" onChange={choosePhoto} aria-label="Escolher foto do perfil" {...fieldStyles} /></Box>
          </HStack>
          <Stack spacing={4}>
            <Box><Text mb={1} fontWeight="semibold">Nome</Text><Input value={name} onChange={event => setName(event.target.value)} placeholder="Seu nome" autoComplete="name" {...fieldStyles} /></Box>
            <Box><Text mb={1} fontWeight="semibold">E-mail</Text><Input value={session?.email || ''} isReadOnly {...fieldStyles} /><Text mt={1} fontSize="sm" color="whiteAlpha.700">O e-mail da conta não pode ser alterado aqui.</Text></Box>
            {session?.role === 'artesao' && <>
              <Heading size="md" color="terra.200">Perfil do artesão</Heading>
              <Box><Text mb={1} fontWeight="semibold">Cidade</Text><Input value={city} onChange={event => setCity(event.target.value)} placeholder="Cidade onde você trabalha" {...fieldStyles} /></Box>
              <Box><Text mb={1} fontWeight="semibold">Estado</Text><Select value={state} onChange={event => setState(event.target.value)} placeholder="Selecione seu estado" {...fieldStyles}>{estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}</Select></Box>
              <Box><Text mb={1} fontWeight="semibold">Área de atuação</Text><Select value={specialty} onChange={event => setSpecialty(event.target.value)} placeholder="Selecione sua área" {...fieldStyles}>{areasArtesanato.map(area => <option key={area} value={area}>{area}</option>)}</Select></Box>
              {specialty === 'Outro' && <Input aria-label="Outra área de atuação" value={customSpecialty} onChange={event => setCustomSpecialty(event.target.value)} placeholder="Escreva sua área de atuação" {...fieldStyles} />}
              <Box><Text mb={1} fontWeight="semibold">Conte um pouco sobre seu trabalho</Text><Textarea value={bio} onChange={event => setBio(event.target.value)} placeholder="Técnicas, materiais e história do seu artesanato" rows={4} {...fieldStyles} /></Box>
            </>}
          </Stack>
          {message && <Text role="status" color="terra.200">{message}</Text>}
          <Flex justify="space-between" wrap="wrap" gap={3}>
            <Button bg="terra.500" color="black" _hover={{ bg: 'terra.600' }} onClick={saveProfile}>Salvar alterações</Button>
            <Button variant="outline" color="red.200" borderColor="red.400" _hover={{ bg: 'red.700', color: 'white' }} onClick={removeProfile}>Excluir conta</Button>
          </Flex>
          {session?.role === 'comprador' && <Button variant="outline" onClick={() => router.push('/meus-pedidos')}>Meus pedidos</Button>}
          {session && session.role !== 'comprador' && <Button variant="outline" onClick={() => router.push(session.role === 'artesao' ? '/artesao' : '/admin')}>Abrir meu painel</Button>}
        </VStack>
      </Box>
    </Box>
  );
}
