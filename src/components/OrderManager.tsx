'use client';
import { useEffect, useState } from 'react';
import { Box, Flex, HStack, Select, Text, VStack } from '@chakra-ui/react';
import { DemoOrder, readOrders, saveOrders, readSession } from '@/services/demoAuth';

export function OrderManager({ artisanOnly = false }: { artisanOnly?: boolean }) {
 const [orders, setOrders] = useState<DemoOrder[]>([]); 
 
 const refresh = () => {
    const all = readOrders();
    setOrders(artisanOnly ? all.filter(o => o.items.some(i => i.artisanId === (readSession()?.artisanId || '1'))) : all);
 }; 
 
 useEffect(() => { refresh(); }, []);
 
 function setStatus(id: string, status: DemoOrder['status']) {
    saveOrders(readOrders().map(o => o.id === id ? { ...o, status } : o));
    refresh();
 }
 
 if (!orders.length) return <Text color="whiteAlpha.700">Ainda não há pedidos registrados nesta demonstração.</Text>;
 
 return <VStack align="stretch" spacing={3}>
    {orders.map(o => <Flex key={o.id} bg="whiteAlpha.100" p={4} borderRadius="lg" justify="space-between" align="center" wrap="wrap" gap={3}>
      <Box>
        <Text fontWeight="bold">{o.id} · R$ {o.total.toFixed(2)}</Text>
        <Text color="whiteAlpha.700">{o.owner} · {new Date(o.date).toLocaleDateString('pt-BR')} · {o.items.map(i => `${i.name} (${i.quantity})`).join(', ')}</Text>
      </Box>
      <HStack>
        <Text>{o.status}</Text>
        <Select size="sm" value={o.status} onChange={e => setStatus(o.id, e.target.value as DemoOrder['status'])} aria-label="Atualizar status" w="145px">
          <option>Processando</option>
          <option>Enviado</option>
          <option>Entregue</option>
          <option>Cancelado</option>
        </Select>
      </HStack>
    </Flex>)}
  </VStack>;
}