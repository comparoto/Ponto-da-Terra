'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Flex, Heading, Text, Input, Button, VStack,
  FormControl, FormLabel, Image, Tabs, TabList, Tab,
  useToast, InputGroup, InputRightElement, IconButton, Icon
} from '@chakra-ui/react';

// Ícones personalizados para ver/ocultar a palavra-passe
const EyeIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </Icon>
);

const EyeOffIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 011.528-3.321M15 12a3 3 0 00-3-3m-4.5 4.5a3 3 0 00-3-3M3 3l18 18" />
  </Icon>
);

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [tipoPerfil, setTipoPerfil] = useState(0); // 0 = Comprador, 1 = Artesão, 2 = Admin
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simula um tempo de carregamento para a API
    setTimeout(() => {
      setIsLoading(false);
      
      toast({
        title: 'Bem-vindo(a) de volta!',
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'top',
      });

      // Redirecionamento com base na aba escolhida
      if (tipoPerfil === 0) {
        router.push('/vitrine');
      } else if (tipoPerfil === 1) {
        router.push('/artesao');
      } else if (tipoPerfil === 2) {
        router.push('/admin');
      }
    }, 1500);
  };

  return (
    <Box 
      minH="100vh" 
      bgImage="url('/bg-vitrine.png')" // Reutilizamos o fundo para manter a identidade visual
      bgSize="cover"
      bgPosition="center"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
    >
      <Box 
        w="100%" 
        maxW="450px" 
        bg="blackAlpha.800" 
        backdropFilter="blur(16px)" 
        p={8} 
        borderRadius="2xl" 
        border="1px solid" 
        borderColor="whiteAlpha.200"
        boxShadow="2xl"
      >
        <Flex direction="column" align="center" mb={8}>
          <Image src="/logo.png" alt="Ponto da Terra Logo" h="60px" mb={4} />
          <Heading size="md" color="white" fontFamily="heading" textAlign="center">
            Acesse sua conta
          </Heading>
          <Text color="whiteAlpha.600" fontSize="sm" mt={2}>
            Escolha o seu perfil para continuar
          </Text>
        </Flex>

        {/* Sistema de Abas para escolher o tipo de Login */}
        <Tabs isFitted variant="enclosed" onChange={(index) => setTipoPerfil(index)} mb={8}>
          <TabList mb="1em" borderColor="whiteAlpha.200">
            <Tab _selected={{ color: 'terra.500', borderColor: 'terra.500', borderBottomColor: 'transparent' }} color="whiteAlpha.600" fontWeight="medium">
              Comprador
            </Tab>
            <Tab _selected={{ color: 'terra.500', borderColor: 'terra.500', borderBottomColor: 'transparent' }} color="whiteAlpha.600" fontWeight="medium">
              Artesão
            </Tab>
            <Tab _selected={{ color: 'terra.500', borderColor: 'terra.500', borderBottomColor: 'transparent' }} color="whiteAlpha.600" fontWeight="medium">
              Admin
            </Tab>
          </TabList>
        </Tabs>

        <form onSubmit={handleLogin}>
          <VStack spacing={5} align="stretch">
            <FormControl isRequired>
              <FormLabel color="whiteAlpha.900" fontSize="sm">E-mail</FormLabel>
              <Input 
                type="email" 
                placeholder="Introduza o seu e-mail" 
                bg="whiteAlpha.100" 
                border="1px solid"
                borderColor="whiteAlpha.300"
                color="white"
                _hover={{ borderColor: 'terra.500' }}
                _focus={{ borderColor: 'terra.500', boxShadow: '0 0 0 1px #D97742' }}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel color="whiteAlpha.900" fontSize="sm">Senha</FormLabel>
              <InputGroup>
                <Input 
                  type={mostrarSenha ? 'text' : 'password'} 
                  placeholder="Introduza a sua palavra-passe" 
                  bg="whiteAlpha.100" 
                  border="1px solid"
                  borderColor="whiteAlpha.300"
                  color="white"
                  _hover={{ borderColor: 'terra.500' }}
                  _focus={{ borderColor: 'terra.500', boxShadow: '0 0 0 1px #D97742' }}
                />
                <InputRightElement>
                  <IconButton
                    aria-label={mostrarSenha ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                    icon={mostrarSenha ? <EyeOffIcon /> : <EyeIcon />}
                    variant="ghost"
                    color="whiteAlpha.600"
                    _hover={{ bg: 'transparent', color: 'terra.500' }}
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <Flex justify="flex-end">
              <Text fontSize="xs" color="terra.500" cursor="pointer" _hover={{ textDecoration: 'underline' }}>
                Esqueceu da senha?
              </Text>
            </Flex>

            <Button 
              type="submit" 
              w="100%" 
              size="lg" 
              bg="terra.500" 
              color="black" 
              _hover={{ bg: 'terra.600' }}
              isLoading={isLoading}
              loadingText="Fazendo login..."
              mt={4}
            >
              Entrar
            </Button>
          </VStack>
        </form>

        <Flex justify="center" mt={8}>
          <Text fontSize="sm" color="whiteAlpha.600">
            Ainda não tem conta?{' '}
            <Text as="span" color="terra.500" cursor="pointer" fontWeight="bold" _hover={{ textDecoration: 'underline' }}>
              Registre-se
            </Text>
          </Text>
        </Flex>
      </Box>
    </Box>
  );
}