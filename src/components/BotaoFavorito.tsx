'use client';
import { useRouter } from 'next/navigation';
import { IconButton, Tooltip } from '@chakra-ui/react';
import { useSession } from '@/hooks/useSession';
import { useFavoritos } from '@/store/favoritosStore';

/** Coração de favoritar. Visitante é levado ao login; artesão e admin não veem o botão. */
export function BotaoFavorito({ produtoId, tamanho = 'sm' }: { produtoId: string; tamanho?: 'sm' | 'md' }) {
  const router = useRouter();
  const session = useSession();
  const { ehFavorito, alternar } = useFavoritos();
  if (session && session.role !== 'comprador') return null;

  const marcado = ehFavorito(produtoId);
  const rotulo = marcado ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
  return (
    <Tooltip label={rotulo} hasArrow placement="top">
      <IconButton
        aria-label={rotulo}
        aria-pressed={marcado}
        icon={<span aria-hidden="true">{marcado ? '♥' : '♡'}</span>}
        size={tamanho}
        fontSize={tamanho === 'md' ? 'xl' : 'lg'}
        borderRadius="full"
        bg="blackAlpha.700"
        color={marcado ? 'red.300' : 'white'}
        _hover={{ bg: 'blackAlpha.800', color: 'red.300' }}
        onClick={e => {
          e.stopPropagation();
          if (!session) router.push('/login?perfil=comprador');
          else void alternar(produtoId);
        }}
      />
    </Tooltip>
  );
}
