'use client';
import { Box, Heading, Text, Button, Flex, Stack, Image } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';

export default function WelcomePage() {
  const router = useRouter();

  return (
    <Flex
      minH="100vh"
      align="center"
      px={[4, 8, 16]}
      bgImage="url('/bg-welcome.png')"
      bgSize="cover"
      bgPosition="center"
      position="relative"
    >
      <Box position="absolute" top={0} left={0} right={0} bottom={0} bg="blackAlpha.600" zIndex={0} />
      
      <Box zIndex={1} color="white" maxW="3xl" p={8}>
        {/* Flex para colocar o Título e o Logótipo lado a lado */}
        <Flex align="flex-end" gap={6} mb={4}>
          <Heading as="h1" size="3xl" fontFamily="heading" lineHeight="1.2">
            BEM-VINDO AO<br />PONTO DA TERRA
          </Heading>
          
          {/* Adicione a imagem do logótipo na pasta public/ com o nome logo.png */}
          <Image 
            src="/logo.png" 
            alt="Logótipo Ponto da Terra" 
            boxSize="100px" // Ajuste este valor para o tamanho ideal (ex: 80px, 120px)
            objectFit="contain" 
            mb={2} // Margem inferior ligeira para alinhar bem com o texto
          />
        </Flex>
        
        {/* Tamanho da fonte aumentado de "lg" para "xl" */}
        <Text fontSize="xl" mb={8} color="whiteAlpha.900" maxW="lg">
          Encontre diversos artesãos, peças e histórias em um só lugar!
        </Text>
        
        <Stack direction={["column", "row"]} spacing={4}>
          <Button 
            variant="outline" 
            color="white" 
            borderColor="whiteAlpha.600"
            _hover={{ bg: 'whiteAlpha.200' }}
            w="150px"
            onClick={() => router.push('/login')}
          >
            Login
          </Button>
          <Button 
            bg="terra.500" 
            color="black"
            _hover={{ bg: 'terra.600' }}
            w="150px"
            onClick={() => router.push('/vitrine')}
          >
            Acesse o site
          </Button>
        </Stack>
      </Box>
    </Flex>
  );
}