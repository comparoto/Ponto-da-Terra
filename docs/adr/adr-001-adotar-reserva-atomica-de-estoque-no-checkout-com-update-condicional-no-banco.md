# ADR-001: Adotar reserva atômica de estoque no checkout com UPDATE condicional no banco

- **Status:** Aceita
- **Data:** 2026-11-21
- **Autor:** PEDRO HENRIQUE DA SILVA MARROCOS (phsm3@cesar.school)
- **Turma:** Embarque (segundas)
- **Projeto:** Origem · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

O Origem vende peças artesanais que muitas vezes têm só 1 ou 2 unidades, e vários compradores podem finalizar a mesma peça ao mesmo tempo. A equipe é pequena, o prazo é de um semestre e a stack já está acordada: Express, Prisma e PostgreSQL. As regras RN17 e RN18 exigem que o estoque nunca fique negativo e que a recusa seja "Item esgotado durante a finalização".

## Preocupações

confiabilidade, consistência do estoque, concorrência, testabilidade, desempenho, prazo

## Decisão

O checkout baixa o estoque de cada item com um UPDATE condicional (só subtrai se a quantidade disponível for suficiente), em ordem de id, dentro de uma única transação do Prisma. Se algum item não puder ser reservado, a transação inteira é desfeita e a resposta é 400. Uma restrição CHECK no banco impede estoque negativo como segunda barreira.

## Justificativa

O banco verifica e baixa o estoque numa única operação atômica. Por isso, das 50 compras simultâneas só uma consegue a última unidade, e as outras 49 recebem a recusa na hora, sem estoque negativo. A espera por linha dura milissegundos, dentro da meta de 95% das respostas em até 2 s, e a solução não exige nenhuma infraestrutura nova.

## Consequências

Ganha-se o fim da venda duplicada, com resposta imediata e clara ao comprador e sem infraestrutura extra. Perde-se em três pontos. Compras da mesma peça ficam em fila no banco, o que vira gargalo numa peça muito disputada. A regra fica acoplada ao SQL e passa a exigir testes com banco real. E toda operação que mexe em estoque (compra, cancelamento, expiração) precisa seguir a ordem por id para evitar deadlock.

## Alternativas consideradas

Lock otimista pelo campo versao: previsto no diagrama de classes, mas descartado porque gera mais conflitos e novas tentativas sob alta disputa.

SELECT FOR UPDATE seguido de UPDATE: descartado porque faz duas idas ao banco e segura o lock por mais tempo.

Reserva orientada a eventos ou saga: descartada porque o estoque atrasado abre uma janela para venda duplicada.

Lock em memória ou no Redis: descartado porque não funciona com várias instâncias e cria mais um ponto de falha.

## Rastreabilidade

**Atributo de qualidade:** Confiabilidade · Ausência de falhas

**Cenário que originou a decisão:**

> Em operação normal, num pico de acesso concentrado no mesmo segundo, 50 compradores diferentes finalizam ao mesmo tempo a compra da mesma peça, que tem apenas 1 unidade em estoque no serviço de checkout e na reserva de estoque (banco de dados). O sistema reserva a peça para um único comprador e recusa os demais com a mensagem "Item esgotado durante a finalização", sem deixar o estoque negativo, exatamente 1 compra confirmada e 49 recusadas, estoque final igual a 0 e nenhum erro inesperado, com 95% das respostas em até 2 segundos.

**Padrão arquitetural adotado:** Camadas

**Táticas empacotadas:** Encapsular responsabilidades por faixa; Restringir dependências a uma direção; Usar intermediário entre camadas

HU11 (Reservar produto de baixo estoque), RN17, RN18, TC02. Módulo: backend/src/modules/compras/compras.service.ts (reservarEstoque, checkout, cancelarCompra, expirarReservas). Migration com a restrição estoque_nao_negativo.

## Verificação

- **Teste do cenário:** O teste de carga backend/tests/carga/checkout-concorrente.k6.js põe 50 usuários simultâneos para comprar 1 unidade. Ele exige exatamente 1 resposta 201, 49 respostas 400 ("Item esgotado durante a finalização"), 0 respostas inesperadas e p95 abaixo de 2 s. O TC02 em backend/tests/checkout-pagamentos.test.ts também cobre o cenário. O resultado registrado em RELATORIO_TESTES.md foi 1 venda, 49 recusas, 0 inesperadas e estoque final 0.

---

_Gerado pelo estudo dirigido de Arquitetura de Software · ADS020 · 2026.2._
