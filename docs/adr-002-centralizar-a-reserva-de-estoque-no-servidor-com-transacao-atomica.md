# ADR-002: Centralizar a reserva de estoque no servidor com transação atômica.

- **Status:** Proposta
- **Data:** 2026-11-22
- **Autor:** JOANNA LUCIANA MARIA DOS SANTOS FARIAS (jlmsf@cesar.school)
- **Turma:** Embarque (segundas)
- **Projeto:** Origem · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

O projeto, Origem da Terra, vende peças artesanais únicas, muitas com estoque único. A equipe é pequena, de estudantes que cursam outras disciplinas, com prazo de um semestre, hospedagem limitada e pagamento simulado. O requisito de FCCPD pede checkout sem race conditions, validado com 50 acessos simultâneos.

## Preocupações

Ausência de venda dupla, consistência do estoque, testabilidade, prazo, custo de infraestrutura.

## Decisão

A reserva de estoque é feita de forma síncrona no servidor, em uma transação com UPDATE condicional por peça. O banco arbitra a disputa e, mesmo se o código falhar, uma restrição CHECK impede o estoque negativo.

## Justificativa

No cenário de 50 compradores disputando a última peça, só uma decisão tomada em um único ponto garante exatamente 1 resposta 201 e 49 respostas 400, com estoque final 0. A autenticação na borda e a validação da entrada antes do banco reduzem o risco desse ponto único ser mal usado ou sobrecarregado.

## Consequências

O ganho é da ausência de vendas duplas e da notificação da "perda de disputa" antes do pagamento, um aviso de item esgotado durante a finalização. A perda é do servidor virar ponto único de contenção e de falha, cada compra paga a latência da transação, o limitador de login guarda estado em memória e não escala para várias instâncias sem troca por um armazenamento compartilhado.

## Alternativas consideradas

Orientado a Eventos para a reserva foi descartado pois a consistência eventual permitiria que duas compras da última peça fossem aceitas antes da falha ser detectada. Mantido só para as consequências da compra, como notificações e expiração de reservas, via outbox.

## Rastreabilidade

**Atributo de qualidade:** Confiabilidade · Ausência de falhas

**Cenário que originou a decisão:**

> Pico de acessos simultâneos, com a peça em estoque único, 50 compradores autenticados, cada um com um usuário distinto Finalizam a compra da mesma peça no mesmo instante O checkout e a reserva de estoque. O sistema Aceita uma única compra e recusa as demais antes do pagamento, informando que o item esgotou., Uma resposta 201 (Criado) e 49 respostas 400, estoque final igual a 0 e nenhum erro 5xx.

**Padrão arquitetural adotado:** Cliente-servidor

**Táticas empacotadas:** Centralizar regra e dado no servidor; Autenticar e autorizar na borda; Limitar a exposição da API

HU11, RN15, RN17, RN18, TC02. Módulos: backend/src/modules/compras/compras.service.ts (reservarEstoque, checkout), shared/auth.ts, shared/validate.ts, jobs/outbox.ts; migration com o CHECK do estoque.

## Verificação

- **Teste do cenário:** tests/checkout-pagamentos.test.ts, caso do TC02: 50 compradores disputando uma unidade, esperando exatamente 1 x 201 x 49 x 400 com a mensagem de item esgotado e estoque final 0. O teste de carga "tests/carga/checkout-concorrente.k6.js" repete o cenário com k6 e verifica as mesmas contagens e "http_req_duration" (p95) abaixo de 2s.

---

_Gerado pelo estudo dirigido de Arquitetura de Software · ADS020 · 2026.2._
