'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Box, Button, Divider, Flex, Heading, HStack, Image, Input, Select, Stack, Text, Textarea, VStack } from '@chakra-ui/react';
import { deleteAccount, Sessao, updateAccountProfile, uploadArtisanPhoto } from '@/services/authService';
import { useHidratado, useSession } from '@/hooks/useSession';
import { mensagemDeErro } from '@/services/http';
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

// Mesmas regras do servidor (HU7 / TC10): somente JPG ou PNG de até 5 MB
const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const TIPOS_ACEITOS = ['image/jpeg', 'image/png'];

function validarFoto(file: File): string | null {
  if (!TIPOS_ACEITOS.includes(file.type)) return 'Formato não suportado. Envie uma imagem JPG ou PNG de até 5 MB.';
  if (file.size > TAMANHO_MAXIMO) return 'A imagem deve ter no máximo 5 MB.';
  return null;
}

export default function PerfilPage() {
  const router = useRouter();
  const hidratado = useHidratado();
  const sessaoAtual = useSession();

  // protegendo a rota
  useEffect(() => {
    if (hidratado && !sessaoAtual) router.replace('/login');
  }, [hidratado, sessaoAtual, router]);

  if (!hidratado || !sessaoAtual) return null;
  // O formulário é inicializado a partir da sessão; a key reinicia o formulário se a conta mudar
  return <PerfilForm key={sessaoAtual.email} inicial={sessaoAtual} />;
}

function PerfilForm({ inicial }: { inicial: Sessao }) {
  const router = useRouter();
  const [session, setSession] = useState<Sessao>(inicial);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'perfil' | 'atelie' | null>(null);

  const especialidadeInicial = inicial.specialty || '';
  const especialidadePadrao = AREAS_ARTESANATO.includes(especialidadeInicial as (typeof AREAS_ARTESANATO)[number]);

  const [name, setName] = useState(inicial.name);
  const [city, setCity] = useState(inicial.city || '');
  const [state, setState] = useState(inicial.state || '');
  const [specialty, setSpecialty] = useState(especialidadePadrao ? especialidadeInicial : especialidadeInicial ? 'Outro' : '');
  const [customSpecialty, setCustomSpecialty] = useState(!especialidadePadrao ? especialidadeInicial : '');
  const [bio, setBio] = useState(inicial.bio || '');
  const [techniques, setTechniques] = useState((inicial.techniques ?? []).join(', '));
  const [region, setRegion] = useState(inicial.region || '');

  // Envia a foto direto para o servidor, que valida formato e tamanho de novo
  async function choosePhoto(event: ChangeEvent<HTMLInputElement>, tipo: 'perfil' | 'atelie') {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const erro = validarFoto(file);
    if (erro) { setMessage(erro); return; }

    setUploading(tipo);
    const resultado = await uploadArtisanPhoto(file, tipo);
    setUploading(null);

    if (!resultado.success || !resultado.data) { setMessage(mensagemDeErro(resultado)); return; }
    setSession(resultado.data);
    setMessage(tipo === 'perfil' ? 'Foto de perfil atualizada.' : 'Foto da oficina atualizada.');
  }

  async function saveProfile() {
    if (!session || !name.trim()) { setMessage('Informe seu nome.'); return; }

    const artisanSpecialty = specialty === 'Outro' ? customSpecialty.trim() : specialty.trim();

    if (session.role === 'artesao' && (!city.trim() || !state || !artisanSpecialty)) {
      setMessage('Preencha cidade, estado e área de atuação.');
      return;
    }

    setSaving(true);
    const resultado = await updateAccountProfile({
      name: name.trim(),
      ...(session.role === 'artesao'
        ? {
            city: city.trim(),
            state,
            specialty: artisanSpecialty,
            bio: bio.trim(),
            techniques: techniques.split(',').map(t => t.trim()).filter(Boolean),
            region: region.trim(),
          }
        : {}),
    });
    setSaving(false);

    if (!resultado.success || !resultado.data) {
      setMessage(mensagemDeErro(resultado, 'Não foi possível salvar as alterações.'));
      return;
    }
    setSession(resultado.data);
    setMessage('Perfil atualizado com sucesso.');
  }

  async function removeProfile() {
    if (!session || !window.confirm('Tem certeza que deseja excluir sua conta? Essa ação encerra sua sessão e não pode ser desfeita.')) return;
    const resultado = await deleteAccount();
    if (!resultado.success) { setMessage(mensagemDeErro(resultado, 'Não foi possível excluir a conta.')); return; }
    router.replace('/home');
  }

  const isArtisan = session?.role === 'artesao';

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

          <HStack spacing={4} align="center">
            <Avatar name={name} src={session?.imageUrl || undefined} size="xl" />
            {isArtisan ? (
              <Box>
                <Text fontWeight="semibold" mb={2}>Foto do perfil</Text>
                <Input type="file" accept="image/jpeg,image/png" onChange={e => choosePhoto(e, 'perfil')} isDisabled={uploading !== null} aria-label="Escolher foto do perfil" {...fieldStyles} />
                <Text mt={1} fontSize="sm" color="whiteAlpha.700">{uploading === 'perfil' ? 'Enviando...' : 'JPG ou PNG, até 5 MB.'}</Text>
              </Box>
            ) : (
              <Text color="whiteAlpha.700" fontSize="sm">Sua conta de comprador usa as iniciais do nome como avatar.</Text>
            )}
          </HStack>

          {isArtisan && (
            <HStack spacing={4} align="center">
              <Image src={session?.workshopImageUrl} alt="Foto da oficina" boxSize="96px" objectFit="cover" borderRadius="md" bg="whiteAlpha.200" fallback={<Box boxSize="96px" borderRadius="md" bg="whiteAlpha.200" />} />
              <Box>
                <Text fontWeight="semibold" mb={2}>Foto da oficina</Text>
                <Input type="file" accept="image/jpeg,image/png" onChange={e => choosePhoto(e, 'atelie')} isDisabled={uploading !== null} aria-label="Escolher foto da oficina" {...fieldStyles} />
                <Text mt={1} fontSize="sm" color="whiteAlpha.700">{uploading === 'atelie' ? 'Enviando...' : 'Aparece no cabeçalho do seu ateliê público.'}</Text>
              </Box>
            </HStack>
          )}

          <Stack spacing={4}>
            <Box>
              <Text mb={1} fontWeight="semibold">Nome</Text>
              <Input aria-label="Nome" value={name} onChange={event => setName(event.target.value)} placeholder="Seu nome" autoComplete="name" {...fieldStyles} />
            </Box>
            <Box>
              <Text mb={1} fontWeight="semibold">E-mail</Text>
              <Input aria-label="E-mail" value={session?.email || ''} isReadOnly {...fieldStyles} />
              <Text mt={1} fontSize="sm" color="whiteAlpha.700">O e-mail da conta não pode ser alterado aqui.</Text>
            </Box>

            {isArtisan && (
              <>
                <Heading size="md" color="terra.200" mt={2}>Perfil do artesão</Heading>
                <Box>
                  <Text mb={1} fontWeight="semibold">Cidade</Text>
                  <Input aria-label="Cidade" value={city} onChange={event => setCity(event.target.value)} placeholder="Cidade onde você trabalha" {...fieldStyles} />
                </Box>
                <Box>
                  <Text mb={1} fontWeight="semibold">Estado</Text>
                  <Select aria-label="Estado" value={state} onChange={event => setState(event.target.value)} placeholder="Selecione seu estado" {...fieldStyles}>
                    {ESTADOS_BRASILEIROS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </Select>
                </Box>
                <Box>
                  <Text mb={1} fontWeight="semibold">Área de atuação</Text>
                  <Select aria-label="Área de atuação" value={specialty} onChange={event => setSpecialty(event.target.value)} placeholder="Selecione sua área" {...fieldStyles}>
                    {AREAS_ARTESANATO.map(area => <option key={area} value={area}>{area}</option>)}
                  </Select>
                </Box>

                {specialty === 'Outro' && (
                  <Input aria-label="Outra área de atuação" value={customSpecialty} onChange={event => setCustomSpecialty(event.target.value)} placeholder="Escreva sua área de atuação" {...fieldStyles} />
                )}
                <Box>
                  <Text mb={1} fontWeight="semibold">Técnicas tradicionais que você domina</Text>
                  <Input aria-label="Técnicas que você domina" value={techniques} onChange={event => setTechniques(event.target.value)} placeholder="Ex.: barro, renda renascença, xilogravura (separe por vírgulas)" {...fieldStyles} />
                </Box>
                <Box>
                  <Text mb={1} fontWeight="semibold">Polo regional de atuação</Text>
                  <Input aria-label="Polo regional" value={region} onChange={event => setRegion(event.target.value)} placeholder="Ex.: Alto do Moura, Agreste, Zona da Mata" {...fieldStyles} />
                </Box>
                <Box>
                  <Text mb={1} fontWeight="semibold">Conte um pouco sobre seu trabalho</Text>
                  <Textarea aria-label="Sobre o seu trabalho" value={bio} onChange={event => setBio(event.target.value)} placeholder="Técnicas, materiais e história do seu artesanato" rows={4} {...fieldStyles} />
                </Box>
              </>
            )}
          </Stack>

          {message && <Text role="status" color="terra.200">{message}</Text>}

          <Flex justify="space-between" wrap="wrap" gap={3} mt={4}>
            <Button bg="terra.500" color="black" _hover={{ bg: 'terra.600' }} onClick={saveProfile} isLoading={saving}>Salvar alterações</Button>
            {session?.role !== 'administrador' && (
              <Button variant="outline" color="red.200" borderColor="red.400" _hover={{ bg: 'red.700', color: 'white' }} onClick={removeProfile}>Excluir conta</Button>
            )}
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
