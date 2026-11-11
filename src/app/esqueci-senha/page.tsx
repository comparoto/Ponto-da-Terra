'use client';
import { useState } from 'react';
import { Alert, AlertIcon, Button, Input, Stack, Text } from '@chakra-ui/react';
import { CartaoAutenticacao, camposAutenticacao } from '@/components/CartaoAutenticacao';
import { pedirLinkDeSenha } from '@/services/authService';
import { mensagemDeErro } from '@/services/http';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    const res = await pedirLinkDeSenha(email.trim());
    setEnviando(false);
    if (!res.success) {
      setErro(mensagemDeErro(res));
      return;
    }
    setEnviado(true);
  }

  return (
    <CartaoAutenticacao titulo="Esqueci minha senha" subtitulo="Informe o e-mail da sua conta e enviaremos um link para você criar uma nova senha." onSubmit={enviar}>
      {enviado ? (
        <Stack spacing={4}>
          <Alert status="success" borderRadius="md" bg="green.800" color="white" role="status">
            <AlertIcon color="green.200" />
            Se houver uma conta com esse e-mail, o link já está a caminho. Ele vale por 1 hora.
          </Alert>
          <Text color="whiteAlpha.800" fontSize="sm">
            Não chegou? Confira a caixa de spam ou peça de novo em alguns minutos.
          </Text>
          <Button variant="outline" color="white" borderColor="whiteAlpha.500" onClick={() => setEnviado(false)}>
            Enviar de novo
          </Button>
        </Stack>
      ) : (
        <Stack spacing={4}>
          <Input type="email" aria-label="E-mail" placeholder="voce@exemplo.com" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required {...camposAutenticacao} />
          {erro && (
            <Text color="red.300" role="alert">
              {erro}
            </Text>
          )}
          <Button type="submit" bg="terra.500" color="black" _hover={{ bg: 'terra.600' }} isLoading={enviando}>
            Enviar link
          </Button>
        </Stack>
      )}
    </CartaoAutenticacao>
  );
}
