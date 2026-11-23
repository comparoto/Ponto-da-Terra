# ADR-001: Concentrar a reserva atômica de estoque na camada de serviço do checkout

- **Status:** Aceita
- **Data:** 2026-11-23
- **Autor:** MARIA LUIZA ALVES ANDRADE (mlaa@cesar.school)
- **Turma:** Embarque (segundas)
- **Projeto:** Origem · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

O Origem vende peças artesanais, muitas únicas ou com 1 a 3 unidades. A equipe é pequena, de estudantes com outras disciplinas em paralelo, e o prazo é de um semestre. A stack (Next.js, Express, Prisma, PostgreSQL) e o modelo de dados já foram acordados com Desenvolvimento Web e Banco de Dados, e não há orçamento de infraestrutura (Vercel e Neon em planos gratuitos). A API pode rodar em várias instâncias serverless, então nenhum controle em memória serve para evitar venda duplicada.

## Preocupações

confiabilidade, consistência do estoque, testabilidade, prazo, custo de infraestrutura, simplicidade de manutenção.

## Decisão

Adotar Camadas (rotas → serviços → acesso a dados) e concentrar toda reserva de estoque em um único serviço, reservarEstoque, que executa um UPDATE condicional dentro de uma transação do PostgreSQL. Uma restrição CHECK no banco impede estoque negativo como segunda barreira.

## Justificativa

No cenário, 50 compradores disputam 1 unidade ao mesmo tempo. A atomicidade vem da transação no banco, que serializa as escritas na mesma linha, e funciona com qualquer número de instâncias. Camadas garante que essa regra viva em um único ponto, que pode ser testado e revisado, sem que rotas ou telas contornem a reserva. Usa a stack já acordada, não exige infraestrutura nova e cabe no prazo e no tamanho da equipe.

## Consequências

Vantagens: garantia de não vender acima do estoque, regra localizada e fácil de testar, nenhuma infraestrutura extra.

Desvantagens: o PostgreSQL vira o ponto de serialização, o que pode limitar a escala em picos muito altos. A garantia depende de disciplina: se alguém alterar estoque fora do serviço, o padrão não impede, só testes e revisão de código. Reservas abandonadas prendem estoque até expirarem (30 min). O serviço fica acoplado ao Prisma e ao PostgreSQL, e os testes precisam de um banco real. Se um item do carrinho esgota, a compra inteira é desfeita.

## Alternativas consideradas

Orientado a Eventos para decidir o estoque: a resposta seria eventual, e o cenário exige resposta imediata e correta. Eventos ficam só para notificações e e-mails.

CQRS: separar leitura e escrita traz consistência eventual e mais complexidade. O cache Redis já atende a leitura da vitrine.

Portas e Adaptadores: criaria interfaces para um banco que não vai mudar, em uma equipe pequena e com prazo curto.

Microkernel: não há necessidade de extensões carregáveis.

Contador de estoque no Redis: criaria duas fontes da verdade, que podem divergir.

## Rastreabilidade

**Atributo de qualidade:** Confiabilidade · Ausência de falhas

**Cenário que originou a decisão:**

> Em pico de acesso, com a API em produção e possivelmente mais de uma instância rodando, 50 compradores autenticados finalizam a compra (checkout) ao mesmo tempo da mesma peça, que tem apenas 1 unidade em estoque no módulo de checkout da API e na tabela de estoque do PostgreSQL. O sistema confirma uma única compra e recusa as demais com a mensagem "Item esgotado durante a finalização", sem criar pedido nem descontar estoque, exatamente 1 resposta 201 e 49 respostas 400, estoque final igual a 0 (nunca negativo), nenhum erro 5xx e p95 abaixo de 2 segundos.

**Padrão arquitetural adotado:** Camadas

**Táticas empacotadas:** Encapsular responsabilidades por faixa; Restringir dependências a uma direção; Usar intermediário entre camadas

Módulo backend/src/modules/compras/compras.service.ts (função reservarEstoque); migration estoque_nao_negativo; HU11; casos de teste TC02, TC15 e TC16.

## Verificação

- **Teste do cenário:** backend/tests/checkout-pagamentos.test.ts (TC02): 50 checkouts simultâneos para 1 unidade, esperando 1 resposta 201, 49 respostas 400 e estoque final 0. Complementado pelo teste de carga backend/tests/carga/checkout-concorrente.k6.js, com os mesmos critérios e p95 abaixo de 2 s, e executado no CI contra PostgreSQL 16.

---

_Gerado pelo estudo dirigido de Arquitetura de Software · ADS020 · 2026.2._