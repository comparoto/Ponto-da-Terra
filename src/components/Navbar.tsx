'use client';

import React, { useState } from 'react';
import {Flex,HStack,Text,Input,InputGroup,InputLeftElement,Image,Icon,IconButton,Badge,Button,Menu,MenuButton,MenuList,MenuItem,Box,useDisclosure,Drawer,DrawerBody,DrawerCloseButton,DrawerContent,DrawerHeader,DrawerOverlay,VStack, type IconProps } from '@chakra-ui/react';
import { ContatoModal } from './ContatoModal';
import { useRouter } from 'next/navigation';
import { useCart } from '@/store/cartStore';
import { CartDrawer } from './CartDrawer';
import { signOut } from '@/services/authService';
import { useSession } from '@/hooks/useSession';
import { useCarregar } from '@/hooks/useCarregar';
import { notificacaoService } from '@/services/interacaoService';
import { BellIcon } from '@/components/ui';

const SearchIcon = (props: IconProps) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </Icon>
);

const ShoppingBagIcon = (props: IconProps) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </Icon>
);

const MenuIcon = (props: IconProps) => (
  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export function Navbar({ onArtisansClick, onLogoClick }: { onArtisansClick?: () => void; onLogoClick?: () => void }) {
  const router = useRouter();
  const { totalItens, abrirCarrinho, limparCarrinho } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const account = useSession();
  const contato = useDisclosure();
  const menuCelular = useDisclosure();
  // Links principais: na barra (tablet/computador) e na gaveta do menu (celular)
  const links: { rotulo: string; acao: () => void }[] = [
    { rotulo: 'Home', acao: () => router.push('/home') },
    { rotulo: 'Vitrine', acao: () => router.push('/vitrine') },
    { rotulo: 'Peças & Catálogo', acao: () => router.push('/produtos') },
    { rotulo: 'Artesãos', acao: () => (onArtisansClick ? onArtisansClick() : router.push('/vitrine#artistas')) },
    { rotulo: 'Para artesãos', acao: () => router.push('/orientacao') },
    { rotulo: 'Contato', acao: contato.onOpen },
  ];
  // Contador de notificações não lidas (recarrega quando a sessão muda ou uma notificação é lida)
  const naoLidas = useCarregar(() => (account ? notificacaoService.naoLidas() : Promise.resolve({ success: true, data: [], error: null })), [account?.token]);
  const totalNaoLidas = account ? (naoLidas.meta?.totalItems ?? 0) : 0;
  React.useEffect(() => {
    const recarregar = () => naoLidas.recarregar();
    window.addEventListener('ponto-da-terra-profile-updated', recarregar);
    return () => window.removeEventListener('ponto-da-terra-profile-updated', recarregar);
  }, [naoLidas]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      router.push(`/produtos?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <>
      <Flex
        w="100%"
        px={{ base: 4, md: 8 }}
        py={4}
        align="center"
        justify="space-between"
        bg="blackAlpha.700"
        color="white"
        backdropFilter="blur(10px)"
        position="sticky"
        top={0}
        zIndex={100}
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
      >
        <IconButton
          aria-label="Abrir menu"
          icon={<MenuIcon boxSize={6} />}
          display={{ base: 'flex', md: 'none' }}
          variant="ghost"
          color="white"
          _hover={{ bg: 'whiteAlpha.200' }}
          mr={2}
          onClick={menuCelular.onOpen}
        />
        <Flex
          align="center"
          cursor="pointer"
          onClick={() => onLogoClick ? onLogoClick() : router.push('/home')}
          transition="opacity 0.2s"
          _hover={{ opacity: 0.85 }}
        >
          <Image src="/logo.png" alt="Logo Ponto da Terra" h="40px" objectFit="contain" />
        </Flex>

        <HStack spacing={{ base: 4, lg: 8 }} fontSize="md" display={{ base: 'none', md: 'flex' }}>
          {links.map(l => (
            <Text key={l.rotulo} as="button" type="button" cursor="pointer" transition="color 0.2s" _hover={{ color: 'terra.500' }} onClick={l.acao}>
              {l.rotulo}
            </Text>
          ))}
        </HStack>

        <InputGroup w={{ base: '160px', sm: '220px', md: '260px' }} size="md">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="whiteAlpha.600" />
          </InputLeftElement>
          <Input
            placeholder="Pesquisar peças..."
            bg="whiteAlpha.300"
            border="none"
            borderRadius="full"
            _placeholder={{ color: 'whiteAlpha.600' }}
            _focus={{ bg: 'whiteAlpha.400', boxShadow: '0 0 0 1px #D9B596' }}
            color="white"
            px={10}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch}
          />
        </InputGroup>

        <HStack spacing={{ base: 2, md: 5 }}>

          {account && (
            <Box position="relative">
              <IconButton
                aria-label={totalNaoLidas ? `Notificações (${totalNaoLidas} não lidas)` : 'Notificações'}
                icon={<BellIcon />}
                bg="whiteAlpha.200"
                color="white"
                _hover={{ bg: 'terra.500', color: 'black' }}
                borderRadius="full"
                size="md"
                onClick={() => router.push('/notificacoes')}
              />
              {totalNaoLidas > 0 && (
                <Badge position="absolute" top="-4px" right="-4px" bg="red.700" color="white" borderRadius="full" minW="20px" h="20px" display="flex" alignItems="center" justifyContent="center" fontSize="xs" border="2px solid" borderColor="#1C1816">
                  {totalNaoLidas > 9 ? '9+' : totalNaoLidas}
                </Badge>
              )}
            </Box>
          )}
          {account ? (
            <Menu>
              <MenuButton as={Button} size="sm" variant="outline" borderColor="terra.500" color="terra.500">
                {account.name || 'Minha conta'}
              </MenuButton>
              <MenuList bg="#2C2724" color="white" borderColor="whiteAlpha.300" zIndex={200}>
                <MenuItem bg="#2C2724" _hover={{ bg: 'whiteAlpha.200' }} onClick={() => router.push('/perfil')}>Meu perfil</MenuItem>
                {account.role === 'comprador' && <MenuItem bg="#2C2724" _hover={{ bg: 'whiteAlpha.200' }} onClick={() => router.push('/meus-pedidos')}>Meus pedidos</MenuItem>}
                {account.role === 'comprador' && <MenuItem bg="#2C2724" _hover={{ bg: 'whiteAlpha.200' }} onClick={() => router.push('/favoritos')}>Meus favoritos</MenuItem>}
                <MenuItem bg="#2C2724" _hover={{ bg: 'whiteAlpha.200' }} onClick={() => router.push('/notificacoes')}>Notificações{totalNaoLidas ? ` (${totalNaoLidas})` : ''}</MenuItem>
                {account.role !== 'comprador' && <MenuItem bg="#2C2724" _hover={{ bg: 'whiteAlpha.200' }} onClick={() => router.push(account.role === 'artesao' ? '/artesao' : '/admin')}>Meu painel</MenuItem>}
                <MenuItem bg="#2C2724" color="red.300" _hover={{ bg: 'whiteAlpha.200' }} onClick={async () => { await signOut(); limparCarrinho(); router.replace('/vitrine'); }}>Sair da conta</MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <Button size="sm" variant="outline" borderColor="terra.500" color="terra.500" onClick={() => router.push('/login')}>Fazer login</Button>
          )}
          {(!account || account.role === 'comprador') && (
          <Box position="relative">
            <IconButton
              aria-label="Abrir sacola de compras"
              icon={<ShoppingBagIcon />}
              bg="whiteAlpha.200"
              color="white"
              _hover={{ bg: 'terra.500', color: 'black' }}
              borderRadius="full"
              size="md"
              onClick={abrirCarrinho}
            />
            {totalItens > 0 && (
              <Badge
                position="absolute"
                top="-4px"
                right="-4px"
                bg="terra.500"
                color="black"
                borderRadius="full"
                boxSize="20px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="xs"
                fontWeight="bold"
                border="2px solid"
                borderColor="#1C1816"
              >
                {totalItens}
              </Badge>
            )}
          </Box>
          )}
        </HStack>
      </Flex>

      {(!account || account.role === 'comprador') && <CartDrawer />}
      <ContatoModal isOpen={contato.isOpen} onClose={contato.onClose} />
      <Drawer isOpen={menuCelular.isOpen} onClose={menuCelular.onClose} placement="left">
        <DrawerOverlay bg="blackAlpha.700" />
        <DrawerContent bg="#1F1B19" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottom="1px solid" borderColor="whiteAlpha.200">
            <Image src="/logo.png" alt="Ponto da Terra" h="36px" objectFit="contain" />
          </DrawerHeader>
          <DrawerBody py={4}>
            <VStack align="stretch" spacing={1}>
              {links.map(l => (
                <Button
                  key={l.rotulo}
                  variant="ghost"
                  justifyContent="flex-start"
                  color="white"
                  fontWeight="normal"
                  size="lg"
                  _hover={{ bg: 'whiteAlpha.100', color: 'terra.500' }}
                  onClick={() => {
                    menuCelular.onClose();
                    l.acao();
                  }}
                >
                  {l.rotulo}
                </Button>
              ))}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

