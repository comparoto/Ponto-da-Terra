'use client';
import { useState } from 'react';
import { Box, Button, Heading, Input, SimpleGrid, Text } from '@chakra-ui/react';
import { alterarSenha } from '@/services/authService';
import { mensagemDeErro } from '@/services/http';

const campos = {
  color: 'white',
  bg: 'whiteAlpha.100',
  borderColor: 'whiteAlpha.300',
  _placeholder: { color: 'whiteAlpha.600' },
  _focus: { borderColor: 'terra.500', boxShadow: '0 0 0 1px #D9B596' },
};

/** Troca de senha no perfil: pede a atual e a nova duas vezes. */
export function AlterarSenha() {
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [repetida, setRepetida] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  async function salvar() {
    setErro('');
    setSucesso('');
    if (nova.length < 6) return setErro('A nova senha deve ter no mínimo 6 caracteres.');
    if (nova !== repetida) return setErro('As duas senhas novas não são iguais.');
    setSalvando(true);
    const res = await alterarSenha(atual, nova);
    setSalvando(false);
    if (!res.success) return setErro(res.errors?.[0]?.mensagem ?? mensagemDeErro(res));
    setAtual('');
    setNova('');
    setRepetida('');
    setAberto(false);
    setSucesso('Senha alterada. Você continua conectado aqui; nos outros aparelhos será preciso entrar de novo.');
  }

  return (
    <Box>
      <Heading size="md" color="terra.100" mb={2}>
        Senha
      </Heading>
      {sucesso && (
        <Text role="status" color="green.200" mb={2}>
          {sucesso}
        </Text>
      )}
      {!aberto ? (
        <Button variant="outline" color="white" borderColor="whiteAlpha.500" onClick={() => setAberto(true)}>
          Alterar senha
        </Button>
      ) : (
        <Box>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
            <Input type="password" aria-label="Senha atual" placeholder="Senha atual" autoComplete="current-password" value={atual} onChange={e => setAtual(e.target.value)} {...campos} />
            <Input type="password" aria-label="Nova senha" placeholder="Nova senha" autoComplete="new-password" value={nova} onChange={e => setNova(e.target.value)} {...campos} />
            <Input type="password" aria-label="Repita a nova senha" placeholder="Repita a nova senha" autoComplete="new-password" value={repetida} onChange={e => setRepetida(e.target.value)} {...campos} />
          </SimpleGrid>
          {erro && (
            <Text color="red.300" mt={2} role="alert">
              {erro}
            </Text>
          )}
          <Button mt={3} mr={3} bg="terra.500" color="black" _hover={{ bg: 'terra.600' }} isLoading={salvando} onClick={salvar}>
            Salvar nova senha
          </Button>
          <Button mt={3} variant="ghost" color="whiteAlpha.800" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
        </Box>
      )}
    </Box>
  );
}
