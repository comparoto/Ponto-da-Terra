'use client';
import { useRouter } from 'next/navigation';
import { Box, Button, Container, Heading, Link, List, ListItem, Text, VStack } from '@chakra-ui/react';

export default function TermosPage() {
  const router = useRouter();
  return (
    <Box minH="100vh" bg="#171412" color="white" py={10}>
      <Container maxW="3xl">
        <VStack align="stretch" spacing={6}>
          <Box><Text color="terra.500" mb={2}>PONTO DA TERRA</Text><Heading>Termos de Uso e Privacidade</Heading><Text color="#E8DFD7" mt={3}>Resumo das condições desta versão demonstrativa do site.</Text></Box>
          <Box><Heading size="md" mb={2}>Uso da plataforma</Heading><Text color="#E8DFD7">O site permite conhecer peças artesanais, adicionar itens ao carrinho e acompanhar pedidos de demonstração. Valores, fretes e pagamentos exibidos não processam uma compra real.</Text></Box>
          <Box id="privacidade"><Heading size="md" mb={2}>Privacidade e dados</Heading><List spacing={2} color="#E8DFD7" styleType="disc" pl={5}><ListItem>Contas, perfis, peças e fotos ficam armazenados no servidor da plataforma. As senhas são guardadas apenas de forma criptografada (hash).</ListItem><ListItem>O navegador guarda localmente a sessão de acesso e o carrinho. Nesta etapa, os pedidos também ficam no navegador, e limpar os dados do site pode apagá-los.</ListItem><ListItem>Esta é uma versão acadêmica de demonstração: não use senhas que você usa em outros serviços.</ListItem></List></Box>
          <Text color="#C8BDB5" fontSize="sm">Este texto descreve a demonstração e precisa ser revisado antes de publicar o site como serviço comercial.</Text>
          <Link href="/login" color="terra.500" textDecoration="underline">Voltar ao login</Link>
          <Button alignSelf="flex-start" variant="outline" color="white" onClick={() => router.back()}>Voltar</Button>
        </VStack>
      </Container>
    </Box>
  );
}
