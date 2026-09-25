'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Heading, Input, Link, Select, Stack, Text } from '@chakra-ui/react';
import { registerAccount, signIn } from '@/services/demoAuth';
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

  function submit(event: React.SyntheticEvent) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      const artisanInfo = role === 'artesao'
        ? {
            city,
            state,
            specialty: specialty === 'Outro' ? customSpecialty : specialty
          }
        : undefined;

      const created = registerAccount(
        name,
        email,
        password,
        role,
        artisanInfo
      );

      if (!created) {
        setError(
          role === 'artesao'
            ? 'Confira o e-mail, a senha, a cidade, o estado e a área de atuação.'
            : 'Este e-mail já está cadastrado ou os dados estão incompletos. Use ao menos 6 caracteres na senha.'
        );
        return;
      }

      const session = signIn(role, email, password);

      if (!session) {
        setError(
          'A conta foi salva, mas não foi possível entrar. Tente fazer login com o mesmo perfil, e-mail e senha.'
        );
        return;
      }

      router.replace(role === 'artesao' ? '/artesao' : '/vitrine');
    } catch {
      setError(
        'Não foi possível salvar a conta neste navegador. Verifique as permissões de armazenamento e tente novamente.'
      );
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
