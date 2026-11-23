'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, AlertIcon, Button, Input, Link, Stack, Text } from '@chakra-ui/react';
import { CartaoAutenticacao, camposAutenticacao } from '@/components/CartaoAutenticacao';
import { redefinirSenha } from '@/services/authService';
import { mensagemDeErro } from '@/services/http';

function RedefinirSenhaConteudo() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState('');

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    if (senha.length < 6) return setErro('A senha deve ter no mínimo 6 caracteres.');
    if (senha !== confirmacao) return setErro('As duas senhas não são iguais.');
    setSalvando(true);
    const res = await redefinirSenha(token, senha);
    setSalvando(false);
    if (!res.success) return setErro(mensagemDeErro(res));
    setConcluido(true);
  }

  if (!token) {
    return (
      <CartaoAutenticacao titulo="Link incompleto" subtitulo="Abra o link exatamente como chegou no seu e-mail, ou peça um novo.">
        <Button as={Link} href="/esqueci-senha" bg="terra.500" color="black" w="full" _hover={{ bg: 'terra.600', textDecoration: 'none' }}>
          Pedir um novo link
        </Button>
      </CartaoAutenticacao>
    );
  }

  return (
    <CartaoAutenticacao titulo="Criar nova senha" subtitulo="Escolha uma senha com pelo menos 6 caracteres. Por segurança, você sairá da conta em todos os aparelhos." onSubmit={salvar}>
      {concluido ? (
        <Stack spacing={4}>
          <Alert status="success" borderRadius="md" bg="green.800" color="white" role="status">
            <AlertIcon color="green.200" />
            Senha alterada! Agora é só entrar com a nova senha.
          </Alert>
          <Button bg="terra.500" color="black" _hover={{ bg: 'terra.600' }} onClick={() => router.push('/login')}>
            Ir para o login
          </Button>
        </Stack>
      ) : (
        <Stack spacing={4}>
          <Input type="password" aria-label="Nova senha" placeholder="Nova senha" autoComplete="new-password" value={senha} onChange={e => setSenha(e.target.value)} required {...camposAutenticacao} />
          <Input type="password" aria-label="Repita a nova senha" placeholder="Repita a nova senha" autoComplete="new-password" value={confirmacao} onChange={e => setConfirmacao(e.target.value)} required {...camposAutenticacao} />
          {erro && (
            <Text color="red.300" role="alert">
              {erro}{' '}
              {/expirado/.test(erro) && (
                <Link href="/esqueci-senha" color="terra.500" textDecoration="underline">
                  Pedir novo link
                </Link>
              )}
            </Text>
          )}
          <Button type="submit" bg="terra.500" color="black" _hover={{ bg: 'terra.600' }} isLoading={salvando}>
            Salvar nova senha
          </Button>
        </Stack>
      )}
    </CartaoAutenticacao>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <RedefinirSenhaConteudo />
    </Suspense>
  );
}
