'use client';
import { Flex, HStack, Text, Input, InputGroup, InputLeftElement, Image, Icon } from '@chakra-ui/react';

const SearchIcon = (props: any) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </Icon>
);

export function Navbar() {
  return (
    <Flex 
      w="100%" 
      px={8} 
      py={4} 
      align="center" 
      justify="space-between" 
      bg="blackAlpha.700" 
      color="white"
      backdropFilter="blur(10px)"
    >
      <Image src="/logo.png" alt="Logo" h="40px" objectFit="contain" />
      
      {/* Fonte aumentada de sm para md */}
      <HStack spacing={8} fontSize="md">
        <Text cursor="pointer" _hover={{ color: 'terra.500' }}>Sobre</Text>
        <Text cursor="pointer" _hover={{ color: 'terra.500' }}>Artistas</Text>
        <Text cursor="pointer" _hover={{ color: 'terra.500' }}>Peças</Text>
      </HStack>

      <InputGroup w="250px" size="md">
        <InputLeftElement pointerEvents="none">
          <SearchIcon color="whiteAlpha.600" />
        </InputLeftElement>
        <Input 
          placeholder="Pesquisar" 
          bg="whiteAlpha.300" 
          border="none" 
          borderRadius="full"
          _placeholder={{ color: 'whiteAlpha.600' }}
          color="white"
          px={10}
        />
      </InputGroup>

      {/* Fonte aumentada de sm para md */}
      <HStack spacing={6} fontSize="md">
        <Text cursor="pointer" _hover={{ color: 'terra.500' }}>Contato</Text>
        <Text cursor="pointer" _hover={{ color: 'terra.500' }}>Perguntas Frequentes</Text>
      </HStack>
    </Flex>
  );
}