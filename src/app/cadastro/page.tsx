'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Checkbox, Heading, Input, Link, Select, Stack, Text } from '@chakra-ui/react';
import { registerAccount } from '@/services/authService';
import { mensagemDeErro } from '@/services/http';
import { AREAS_ARTESANATO, ESTADOS_BRASILEIROS } from '@/data';

type AccountRole = 'comprador' | 'artesao';

const fieldStyles = {
  color: "#FFFFFF",
  bg: "#332C28",
  borderColor: "#99877A",
  _placeholder: { color: "#C8BDB5", opacity: 1 },
  _focus: { borderColor: "terra.500", boxShadow: "0 0 0 1px #D9B596" }
};

export default function CadastroPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AccountRole>('comprador');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function submit(event: React.SyntheticEvent) {
    event.preventDefault();
    setError('');
    if (!acceptedTerms) {
      setError('Você precisa aceitar os Termos de Uso e a Política de Privacidade para criar a conta.');
      return;
    }
    setSaving(true);

    try {
      const artisanInfo = role === 'artesao'
        ? {
            city,
            state,
            specialty: specialty === 'Outro' ? customSpecialty : specialty
          }
        : undefined;

      // A API cria a conta e já devolve a sessão autenticada (JWT)
      const resultado = await registerAccount(name.trim(), email, password, role, artisanInfo, true);

      if (!resultado.success) {
        setError(mensagemDeErro(resultado, 'Não foi possível criar a conta. Confira os dados e tente novamente.'));
        return;
      }

      router.replace(role === 'artesao' ? '/artesao' : '/vitrine');
    } finally {
      setSaving(false);
    }
  }

  const accountRoles = [
    { value: 'comprador', label: 'Comprador' },
    { value: 'artesao', label: 'Artesão' },
  ];

  return (
    <Box 
      minH="100vh" 
      bgImage="linear-gradient(rgba(23, 20, 18, 0.72), rgba(23, 20, 18, 0.47)), url('/bg-pedidos.png')"
      bgSize="cover"
      bgPosition="center"
      bgAttachment="fixed"
      color="white"
      display="grid"
      flexDirection="column"
      placeItems="center" 
    >
      <Box
        as="form"
        onSubmit={submit}
        w="full"
        maxW="460px"
        p={8}
        bg="#2C2724"
        borderRadius="2xl"
        border="1px solid"
        borderColor="whiteAlpha.200"
      >
        <Button
          type="button"
          variant="link"
          color="whiteAlpha.800"
          mb={4}
          onClick={() => router.push('/home')}
        >
          ← Voltar para Home
        </Button>

        <Heading color="terra.500" mb={2}>
          Criar conta
        </Heading>

        <Text color="#E8DFD7" mb={6}>
          Crie sua conta de comprador ou artesão.
        </Text>

        <Stack spacing={4}>
          <Input
            placeholder="Nome completo"
            value={name}
            onChange={event => setName(event.target.value)}
            autoComplete="name"
            required
            {...fieldStyles}
          />

          <Input
            placeholder="E-mail (ex.: voce@exemplo.com)"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            required
            {...fieldStyles}
          />

          <Input
            placeholder="Senha (mínimo 6 caracteres)"
            type="password"
            minLength={6}
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            {...fieldStyles}
          />

          <Select
            sx={{
              "& option": {
                color: "#FFFFFF",
                backgroundColor: "#332C28"
              }
            }}
            value={role}
            onChange={event =>
              setRole(event.target.value as AccountRole)
            }
            aria-label="Tipo de conta"
            {...fieldStyles}
          >
            {accountRoles.map(account => (
              <option key={account.value} value={account.value}>
                {account.label}
              </option>
            ))}
          </Select>

          {role === 'artesao' && (
            <>
              <Text
                color="terra.200"
                fontWeight="semibold"
                fontSize="md"
                mt={2}
              >
                Informações do artesão
              </Text>

              <Input
                placeholder="Cidade onde você trabalha"
                value={city}
                onChange={event => setCity(event.target.value)}
                autoComplete="address-level2"
                required
                {...fieldStyles}
              />

              <Select
                sx={{
                  "& option": {
                    color: "#FFFFFF",
                    backgroundColor: "#332C28"
                  }
                }}
                placeholder="Selecione seu estado"
                value={state}
                onChange={event => setState(event.target.value)}
                aria-label="Estado"
                required
                {...fieldStyles}
              >
                {ESTADOS_BRASILEIROS.map(uf => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </Select>

              <Select
                sx={{
                  "& option": {
                    color: "#FFFFFF",
                    backgroundColor: "#332C28"
                  }
                }}
                placeholder="Área do artesanato"
                value={specialty}
                onChange={event => setSpecialty(event.target.value)}
                aria-label="Área de atuação"
                required
                {...fieldStyles}
              >
                {AREAS_ARTESANATO.map(area => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </Select>

              {specialty === 'Outro' && (
                <Input
                  placeholder="Escreva sua área de atuação"
                  value={customSpecialty}
                  onChange={event =>
                    setCustomSpecialty(event.target.value)
                  }
                  required
                  {...fieldStyles}
                />
              )}
            </>
          )}

          <Checkbox colorScheme="orange" alignItems="flex-start" isChecked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)}>
            <Text fontSize="sm" color="#E8DFD7" mt="-1px">
              Li e aceito os <Link href="/termos" color="terra.500" textDecoration="underline">Termos de Uso</Link> e a{' '}
              <Link href="/termos#privacidade" color="terra.500" textDecoration="underline">Política de Privacidade</Link>.
            </Text>
          </Checkbox>
          {role === 'artesao' && (
            <Text fontSize="sm" color="whiteAlpha.700">
              Novos ateliês passam por uma aprovação rápida da curadoria antes de aparecer na vitrine.
            </Text>
          )}

          {error && (
            <Text role="alert" color="#FF9B9B">
              {error}
            </Text>
          )}

          <Button
            type="submit"
            bg="terra.500"
            color="black"
            isLoading={saving}
            mt={2}
            _hover={{ bg: 'terra.600' }}
          >
            Cadastrar e entrar
          </Button>

          <Link
            href="/login"
            color="terra.500"
            textAlign="center"
            pt={2}
          >
            Já tenho uma conta
          </Link>
        </Stack>
      </Box>
    </Box>
  );
}
