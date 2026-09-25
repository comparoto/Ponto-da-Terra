'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Box, Button, Divider, Flex, Heading, HStack, Input, Select, Stack, Text, Textarea, VStack } from '@chakra-ui/react';
import { deleteAccount, DemoSession, readSession, updateAccountProfile } from '@/services/demoAuth';
import { artesaoService } from '@/services/artesaoService';
import { Navbar } from '@/components/Navbar';
import { AREAS_ARTESANATO, ESTADOS_BRASILEIROS } from '@/data';

// cntralização de estilos para reaproveitamento nos inputs
const fieldStyles = { 
  color: 'white', 
  bg: '#332C28', 
  borderColor: '#99877A', 
  _placeholder: { color: '#C8BDB5', opacity: 1 }, 
  _focus: { borderColor: 'terra.500', boxShadow: '0 0 0 1px #D9B596' } 
};

export default function PerfilPage() {
  const router = useRouter();
  const [session, setSession] = useState<DemoSession | null>(null);
  const [message, setMessage] = useState('');

  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    const current = readSession();
    
    // protegendo a rota
    if (!current) { 
      router.replace('/login'); 
      return; 
    }
    
    setSession(current);
    setName(current.name);
    setCity(current.city || '');
    setState(current.state || '');
    setBio(current.bio || '');
    setImageUrl(current.imageUrl || '');


    const currentSpecialty = current.specialty || '';
    const isStandardSpecialty = AREAS_ARTESANATO.includes(currentSpecialty as typeof AREAS_ARTESANATO[number]);
    setSpecialty(isStandardSpecialty ? currentSpecialty : currentSpecialty ? 'Outro' : '');
    setCustomSpecialty(!isStandardSpecialty && currentSpecialty ? currentSpecialty : '');
    
    if (current.role === 'artesao' && current.artisanId) {
      const artisan = artesaoService.listarArtesaos().find(item => item.id === current.artisanId);
      if (artisan) {
        setCity(current.city || artisan.cidade);
        setState(current.state || artisan.estado);
        setBio(current.bio || artisan.biografia || '');
        setImageUrl(current.imageUrl || artisan.imagemUrl);
        
        const artisanSpecialty = current.specialty || artisan.especialidade || '';
        const isStandardArtisanSpecialty = AREAS_ARTESANATO.includes(artisanSpecialty as typeof AREAS_ARTESANATO[number]);
        setSpecialty(isStandardArtisanSpecialty ? artisanSpecialty : artisanSpecialty ? 'Outro' : '');
        setCustomSpecialty(!isStandardArtisanSpecialty && artisanSpecialty ? artisanSpecialty : '');
      }
    }
  }, [router]);


  // processa o upload da imagem e converte para Base64 (ideal para o localStorage atual)
  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMessage('Selecione um arquivo de imagem.'); return; }
    if (file.size > 1_500_000) { setMessage('A foto deve ter no máximo 1,5 MB.'); return; }
    
    const reader = new FileReader();
    reader.onload = () => { 
      if (typeof reader.result === 'string') { 
        setImageUrl(reader.result); 
        setMessage(''); 
      } 
    };
    reader.onerror = () => setMessage('Não foi possível carregar essa foto.');
    reader.readAsDataURL(file);
  }

  function saveProfile() {
    if (!session || !name.trim()) { setMessage('Informe seu nome.'); return; }
    
    const artisanSpecialty = specialty === 'Outro' ? customSpecialty.trim() : specialty.trim();
    
    if (session.role === 'artesao' && (!city.trim() || !state || !artisanSpecialty)) { 
      setMessage('Preencha cidade, estado e área de atuação.'); 
      return; 
    }
    
    const updated: DemoSession = { 
      ...session, 
      name: name.trim(), 
      imageUrl, 
      ...(session.role === 'artesao' ? { city: city.trim(), state, specialty: artisanSpecialty, bio: bio.trim() } : {}) 
    };
    
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
    <Box 
      minH="100vh" 
      bgImage="linear-gradient(rgba(23, 20, 18, 0.72), rgba(23, 20, 18, 0.47)), url('/bg-pedidos.png')"
      bgSize="cover"
      bgPosition="center"
      bgAttachment="fixed"
      color="white"
      display="flex"
      flexDirection="column"
    >
      <Navbar />
      <Box maxW="760px" mx="auto" p={{ base: 4, md: 8 }}>
        <Button variant="outline" color="white" borderColor="whiteAlpha.500" onClick={() => router.push('/home')}>
          Voltar à Home
        </Button>
        
        <VStack align="stretch" mt={8} p={{ base: 5, md: 8 }} bg="whiteAlpha.100" borderRadius="xl" spacing={5}>
          <Heading size="lg">Editar perfil</Heading>
          
          <HStack spacing={4}>
            <Avatar name={name} src={imageUrl || undefined} size="xl" />
            <Box>
              <Text fontWeight="semibold" mb={2}>Foto do perfil</Text>
              <Input type="file" accept="image/*" onChange={choosePhoto} aria-label="Escolher foto do perfil" {...fieldStyles} />
            </Box>
          </HStack>
    
          <Stack spacing={4}>
            <Box>
              <Text mb={1} fontWeight="semibold">Nome</Text>
              <Input value={name} onChange={event => setName(event.target.value)} placeholder="Seu nome" autoComplete="name" {...fieldStyles} />
            </Box>
            <Box>
              <Text mb={1} fontWeight="semibold">E-mail</Text>
              <Input value={session?.email || ''} isReadOnly {...fieldStyles} />
              <Text mt={1} fontSize="sm" color="whiteAlpha.700">O e-mail da conta não pode ser alterado aqui.</Text>
            </Box>
            
            {session?.role === 'artesao' && (
              <>
                <Heading size="md" color="terra.200" mt={2}>Perfil do artesão</Heading>
                <Box>
                  <Text mb={1} fontWeight="semibold">Cidade</Text>
                  <Input value={city} onChange={event => setCity(event.target.value)} placeholder="Cidade onde você trabalha" {...fieldStyles} />
                </Box>
                <Box>
                  <Text mb={1} fontWeight="semibold">Estado</Text>
                  <Select value={state} onChange={event => setState(event.target.value)} placeholder="Selecione seu estado" {...fieldStyles}>
                    {ESTADOS_BRASILEIROS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </Select>
                </Box>
                <Box>
                  <Text mb={1} fontWeight="semibold">Área de atuação</Text>
                  <Select value={specialty} onChange={event => setSpecialty(event.target.value)} placeholder="Selecione sua área" {...fieldStyles}>
                    {AREAS_ARTESANATO.map(area => <option key={area} value={area}>{area}</option>)}
                  </Select>
                </Box>
            
                {specialty === 'Outro' && (
                  <Input aria-label="Outra área de atuação" value={customSpecialty} onChange={event => setCustomSpecialty(event.target.value)} placeholder="Escreva sua área de atuação" {...fieldStyles} />
                )}
                <Box>
                  <Text mb={1} fontWeight="semibold">Conte um pouco sobre seu trabalho</Text>
                  <Textarea value={bio} onChange={event => setBio(event.target.value)} placeholder="Técnicas, materiais e história do seu artesanato" rows={4} {...fieldStyles} />
                </Box>
              </>
            )}
          </Stack>
          
          {message && <Text role="status" color="terra.200">{message}</Text>}
          
          <Flex justify="space-between" wrap="wrap" gap={3} mt={4}>
            <Button bg="terra.500" color="black" _hover={{ bg: 'terra.600' }} onClick={saveProfile}>Salvar alterações</Button>
            <Button variant="outline" color="red.200" borderColor="red.400" _hover={{ bg: 'red.700', color: 'white' }} onClick={removeProfile}>Excluir conta</Button>
          </Flex>
  
          <Divider borderColor="whiteAlpha.200" my={2} />
          <Flex gap={3} wrap="wrap" justify="flex-start">
            {session?.role === 'comprador' && (
              <Button variant="outline" onClick={() => router.push('/meus-pedidos')}>Meus pedidos</Button>
            )}
            {session && session.role !== 'comprador' && (
              <Button variant="outline" onClick={() => router.push(session.role === 'artesao' ? '/artesao' : '/admin')}>Abrir meu painel</Button>
            )}
          </Flex>

        </VStack>
      </Box>
    </Box>
  );
}