# Requisitos do Backend: Origem / Ponto da Terra

> Documento de consolidação para revisão da equipe antes de iniciar a implementação do backend.
> Gerado em 11/11/2026 a partir de todas as fontes públicas do projeto. Itens marcados **[DECIDIR]** precisam de decisão da equipe.

## Sumário

1. [Fontes consultadas](#1-fontes-consultadas)
2. [Requisitos obrigatórios por disciplina](#2-requisitos-obrigatórios-por-disciplina)
3. [Histórias de usuário que impactam o backend](#3-histórias-de-usuário-que-impactam-o-backend)
4. [Regras de negócio](#4-regras-de-negócio)
5. [Contradições entre documentos e propostas de resolução](#5-contradições-entre-documentos-e-propostas-de-resolução)
6. [Arquitetura proposta](#6-arquitetura-proposta)
7. [Contrato de resposta da API](#7-contrato-de-resposta-da-api)
8. [Endpoints](#8-endpoints)
9. [Schema do banco (Prisma)](#9-schema-do-banco-prisma)
10. [Máquinas de estado](#10-máquinas-de-estado)
11. [Checkout concorrente: algoritmo](#11-checkout-concorrente-algoritmo)
12. [Fila assíncrona e worker](#12-fila-assíncrona-e-worker)
13. [Migração do frontend (Fake API → API real)](#13-migração-do-frontend-fake-api--api-real)
14. [Rastreabilidade HU → Endpoint → Caso de teste](#14-rastreabilidade-hu--endpoint--caso-de-teste)
15. [Ordem de implementação sugerida](#15-ordem-de-implementação-sugerida)
16. [Decisões pendentes](#16-decisões-pendentes)
17. [Melhorias a partir do Relatório de Execução de Testes](#17-melhorias-a-partir-do-relatório-de-execução-de-testes-09112026)

---

## 1. Fontes consultadas

| Fonte | Conteúdo relevante |
|---|---|
| README.md (GitHub) | Status atual, contrato `ApiResult<T>`, Fake API |
| [Notion: Projeto Integrador](https://app.notion.com/p/Projeto-Integrador-3c996fcfd27080df9bf3ef635f5bdf99) | Exigências de cada disciplina para o backend |
| [Trello: Backlog](https://trello.com/b/KZIZUnYE/ponto-da-terra) | 18 HUs com critérios de aceite (BDD) e prioridade MoSCoW |
| [Plano de Testes v3](https://docs.google.com/document/d/1g6MABX9mCtVXfg0vxMLuS0kMjwttT4BClnToPovFeB8) | 16 cenários (TS01–TS16) e 16 casos de teste (TC01–TC16) com status HTTP esperados |
| [Diagrama de Classes](https://drive.google.com/file/d/1B3XJBb0NO-GSV3IqV8fT050-bVJqG5ad) | 18 entidades e enums de status |
| [Diagrama de Casos de Uso](https://drive.google.com/file/d/1j8Ej2N5DjwcfHfw6MvURt_CsS5oYxgQL) | Atores: Comprador, Artesão, Administrador, Serviço de Frete/Correios, Gateway de Pagamento, Serviço de Notificação |
| Documento_Substituicao_Fake_API_Backend_Real.pdf | Endpoints iniciais, processo de migração em 9 passos |
| Documentacao_Fake_API.pdf | Contrato `ApiResult<T>` e camada `services/` |
| Código atual (`src/`) | Funcionalidades já existentes no frontend sobre `localStorage` |

**Não consultados:** branches diferentes de `main`, ZIP do `TesteDeStress` (Java), slides do Canva e screencast.

---

## 2. Requisitos obrigatórios por disciplina

Fonte: Notion. São exigências de avaliação e não dependem de prioridade do backlog.

### Desenvolvimento Web
- [ ] API **RESTful** com endpoints para os recursos principais (produtos, usuários, pedidos).
- [ ] **Documentação das rotas com Swagger/OpenAPI.**
- [ ] **Status codes HTTP** adequados para sucesso e falha.
- [ ] **Cache** em pontos críticos (ex.: catálogo).
- [ ] **Sistema de autenticação.**
- [ ] Integração ponta a ponta com **banco de dados, IA e filas**. **[DECIDIR]**: o que é "IA" aqui (ver §16).
- [ ] **Deploy público** da versão final, demonstrando o fluxo busca → carrinho → pedido.
- [ ] Frontend consumindo a **API real** (fim da Fake API).
- Restrição: **pagamento simulado**, sem integração com gateway real. Dados sintéticos.

### Fund. de Computação Concorrente, Paralela e Distribuída (FCCPD)
- [ ] **Controle de concorrência** (locks / transações) no checkout e na baixa de estoque, sem race conditions.
- [ ] **Filas** desacopladas do fluxo síncrono (notificações, processamento de imagens).
- [ ] **Separação de módulos/serviços** e **processamento paralelo** em relatórios ou rotinas pesadas.
- [ ] Scripts simulando **dezenas de acessos simultâneos** (o plano de testes usa 50), diagrama da arquitetura distribuída e **relatório de benchmark**.

### Requisitos, Projeto de Software e Validação
- [ ] Diagrama de componentes/camadas, com decisões justificadas por **SOLID, GRASP e GoF**.
- [ ] Automação de testes (TDD/BDD/ATDD). Ferramentas previstas: **Jest, Postman, Cypress, k6 ou JMeter**.
- [ ] Relatório de cobertura dos fluxos críticos (checkout, cadastro) e relatório de refatoração.
- Ambiente de homologação com **URL pública**, **banco relacional real** e **worker da fila ativo**.

---

## 3. Histórias de usuário que impactam o backend

| HU | Título | Prioridade | Trello | Impacto no backend |
|---|---|---|---|---|
| HU1 | Gestão e cadastro de peças | MUST | Concluído | CRUD de produto com título, descrição, **técnica**, **polo de origem**, fotos, preço, estoque |
| HU2 | Filtrar busca em vitrine | MUST | Concluído | Filtros por técnica e polo (combináveis) |
| HU3 | Acessar informações do produtor | MUST | Concluído | Perfil público do artesão com peças **ativas** |
| HU4 | Consultar frete | MUST | Concluído | Cálculo de frete por CEP (simulado); limite do carrinho pelo estoque |
| HU5 | Escolher forma de pagamento | MUST | Concluído | PIX, cartão (1x a 6x) e boleto, todos simulados |
| HU6 | Visualizar e acompanhar compras | MUST | Concluído | Linha do tempo do pedido e código de rastreio |
| HU7 | Gestão do perfil do ateliê | MUST | Concluído | Bio, técnicas, polo, upload de foto (JPG/PNG ≤ 5 MB) |
| HU8 | Curadoria e aprovação de catálogo | MUST | Concluído | Peças: Pendente → Ativo / Rejeitado com justificativa e notificação. Novos artesãos: cadastro `PENDENTE` → `APROVADO`/`REJEITADO` (só aprovados aparecem na vitrine) |
| HU9 | Dashboard geral do admin | MUST | Concluído | Métricas agregadas com filtro de período |
| HU10 | Acompanhamento operacional de pedidos | MUST | Concluído | Todos os pedidos, filtro por status, notas de intervenção |
| HU11 | Reservar produto de baixo estoque | SHOULD | Backlog | **Checkout atômico e concorrente** |
| HU12 | Receber alerta de compra | SHOULD | Em andamento | **Fila assíncrona e worker** |
| HU13 | Dashboard de pedidos do artesão | SHOULD | Concluído | Atualizar status; rastreio obrigatório para "Postado" |
| HU14 | Contatar produtor | SHOULD | Em andamento | Mensagem vinculada ao produto e notificação ao artesão |
| HU15 | Central de orientação ao artesão | SHOULD | Em andamento | Checklist de formalização persistido (o restante é conteúdo estático) |
| HU16 | Gestão de usuários e moderação | SHOULD | Backlog | Suspender/reativar e invalidar sessões |
| HU17 | Avaliar pedidos | COULD | Concluído | Avaliação 1–5 só para quem comprou e recebeu |
| HU18 | Visualizar dados regionais | COULD | Concluído | Faturamento, mais vendidos, pedidos por polo |

> "Concluído" no Trello indica que a etapa de requisitos/frontend foi entregue. **Nenhuma HU tem backend implementado.**

---

## 4. Regras de negócio

### Autenticação e autorização
- **RN01:** autenticação via **JWT** com expiração. Token expirado → **401** com mensagem `"Sessão expirada"` (TC07).
- **RN02:** três papéis: `CONSUMIDOR`, `ARTESAO`, `ADMIN`. Acesso a rota de outro papel → **403** (TC01).
- **RN03:** um comprador só acessa os próprios pedidos. Pedido de outro → **403 ou 404**, sem vazar dados (TC13, IDOR).
- **RN04:** senha com no mínimo 6 caracteres (regra atual do frontend), armazenada com hash (bcrypt).
- **RN05:** e-mail único, normalizado (trim + lowercase).
- **RN06:** cadastro de artesão exige cidade, UF e especialidade.
- **RN07:** usuário **suspenso** não autentica, tem as sessões ativas invalidadas e, se for artesão, os produtos somem da vitrine (HU16).

### Catálogo
- **RN08:** produto exige título, preço > 0, **técnica** e **polo de origem**. Payload inválido → **400** com a lista dos campos inválidos (TC05, TC09).
- **RN09:** produto novo entra como `PENDENTE`. Só `ATIVO` aparece na vitrine e no perfil público (HU8, HU3).
- **RN10:** reprovação exige **justificativa** e gera notificação ao artesão (TC04).
- **RN11:** listagem paginada: `?page&limit`, retornando `meta { page, limit, totalItems, totalPages }` (TC06).
- **RN12:** filtros: busca textual, categoria, técnica, polo, artesão, faixa de preço e ordenação (HU2 + filtros já existentes no frontend).
- **RN13:** upload aceita somente **JPG/PNG ≤ 5 MB**. Fora disso → 400, sem gravar nada no storage (TC10).

### Carrinho, frete e checkout
- **RN14:** quantidade no carrinho ≤ estoque disponível: `"Limite de estoque atingido para esta peça"` (HU4, TC14).
- **RN15:** **preços e totais são sempre calculados no servidor** a partir do banco; valores enviados pelo frontend são ignorados (TC08).
- **RN16:** frete simulado por CEP, com resposta em < 300 ms. CEP inválido → 400 (TC14).
- **RN17:** checkout **atômico**: estoque reservado (decrementado) na criação do pedido. Sem estoque → **400** `"Item esgotado durante a finalização"`. O estoque **nunca fica negativo** (HU11, TC02).
- **RN18:** com 50 requisições simultâneas para 1 unidade, exatamente **1 × 201** e **49 × 400** (TC02).

### Pagamento (simulado)
- **RN19 PIX:** gera QR Code e código "Copia e Cola" com **expiração de 30 min**. O pedido fica `AGUARDANDO_PAGAMENTO`. O webhook muda para `PAGO` em < 2 s e é **idempotente**: o callback duplicado é processado uma única vez (TC16).
- **RN20:** PIX expirado → pedido `CANCELADO` e **estoque devolvido** (TC16).
- **RN21 Cartão:** 1x a 6x, validação síncrona. Aprovado → `PAGO`. Recusado → estoque devolvido, carrinho intacto e mensagem amigável (HU5, TC15).
- **RN22 Boleto:** link do PDF e linha digitável, vencimento em **3 dias úteis** (HU5).

### Pedidos e entrega
- **RN23:** linha do tempo: Pagamento Confirmado → Em Produção no Ateliê → Despachado → Entregue (HU6, TC12).
- **RN24:** mudar para `DESPACHADO` ("Postado") **exige código de rastreio** (HU13).
- **RN25:** o admin registra **notas de intervenção** vinculadas ao log do pedido (HU10).
- **RN26:** pedido é considerado **"Atrasado"** quando `dataPrevista` < agora e o status ainda não é `ENTREGUE`. É um valor calculado, não armazenado (HU10).

### Notificações e mensagens
- **RN27:** o evento `NOVO_PEDIDO` é publicado na fila **somente após o commit** da transação do pedido. O worker notifica o artesão e grava o `NotificacaoLog` (HU12). Nenhuma mensagem pode ser perdida.
- **RN28:** a mensagem de contato não pode ser vazia (`"O campo de mensagem não pode ficar vazio"`) e gera notificação no painel do artesão (HU14).

### Avaliações
- **RN29:** só avalia quem tem pedido `ENTREGUE` contendo o produto; caso contrário → 403 (HU17).
- **RN30:** nota inteira de 1 a 5, uma avaliação por (consumidor, produto). A média do **produto e do artesão** é recalculada.

### Painéis
- **RN31 Admin:** receita bruta, pedidos concluídos e novos artesãos no mês, com filtro por período (HU9).
- **RN32 Artesão:** faturamento por período, peças mais vendidas, taxa de conclusão e pedidos por polo. Sem dados → zeros, nunca erro (HU18).

---

## 5. Contradições entre documentos e propostas de resolução

| # | Conflito | Proposta |
|---|---|---|
| C1 | **Status inicial do produto:** TC09 diz `Ativo`; HU8 e TC04 dizem `Pendente` → curadoria | Seguir HU8: nasce `PENDENTE`. Ajustar o TC09 no plano de testes |
| C2 | **Status do pedido:** o diagrama tem `CRIADO, AGUARDANDO_PAGAMENTO, PAGO, EM_PRODUCAO, DESPACHADO, ENTREGUE`; HU10/HU13 citam "Atrasado", "Aguardando Envio", "Postado"; o frontend usa "Processando/Enviado/Cancelado"; TC16 exige cancelamento | Usar o enum do diagrama **+ `CANCELADO`**. "Postado" = `DESPACHADO`; "Aguardando Envio" = `PAGO`/`EM_PRODUCAO`; "Atrasado" é calculado (RN26). Atualizar o diagrama |
| C3 | **`Produto` sem técnica e polo** no diagrama, mas HU1, HU2 e TC09 exigem esses campos | Adicionar `tecnica` e `poloOrigem` ao `Produto` |
| C4 | **Escopo do plano de testes** exclui rastreio, chat, central de orientação, suspensão e avaliações, mas TC12 testa rastreio e HU13/HU17 estão concluídas | Implementar rastreio (MUST no fluxo). Avaliações, contato, suspensão e checklist ficam como fase 3 |
| C5 | **Carga do teste de concorrência:** README diz 20 threads; plano diz 50 | Validar com 50 (superset) |
| C6 | **Código HTTP para estoque esgotado:** plano diz 400 | Manter **400** para bater com o TC02 (409 seria semanticamente melhor; se mudar, atualizar o TC02) |
| C7 | **Mensagem de estoque esgotado:** HU11 `"Item esgotado durante a finalização"` vs. TC02 `"Estoque Insuficiente"` | Usar a mensagem da HU11 e alinhar o TC02 |
| C8 | **Usuário:** HU16 cita ativar/inativar/suspender; o diagrama só tem `ATIVO, SUSPENSO` | Enum `ATIVO, INATIVO, SUSPENSO` |
| C9 | **Pedido com itens de vários artesãos:** cada artesão atualiza o status, mas o pedido é único | **[DECIDIR]**: proposta = dividir o checkout em **um `Pedido` por artesão**, agrupados por um `codigoCompra` (ver §16) |
| C10 | **HU8** cita aprovar também "cadastros de novos artesãos" | ✅ Feito: `Artesao.statusCadastro` (`PENDENTE`, `APROVADO`, `REJEITADO`) com fila no painel do admin |
| C11 | O Doc. de Substituição usa `VITE_API_URL`, mas o projeto migrou para Next.js | Usar `NEXT_PUBLIC_API_URL` |

---

## 6. Arquitetura proposta

**[DECIDIR]**: proposta abaixo; alternativas em §16.

```
┌──────────────────┐   HTTPS/REST   ┌───────────────────────┐     ┌──────────────┐
│ Frontend Next.js │ ─────────────► │ API (Node/TS)         │ ──► │ PostgreSQL   │
│ (Vercel)         │                │ Express + Zod + Prisma│     │ (Neon/Render)│
└──────────────────┘                │ Swagger em /api/docs  │     └──────────────┘
                                    └──────────┬────────────┘            ▲
                                       enqueue │  cache                  │
                                               ▼                         │
                                         ┌──────────┐   consome   ┌──────┴──────┐
                                         │  Redis   │ ──────────► │ Worker      │
                                         │ (BullMQ) │             │ (processo à │
                                         └──────────┘             │  parte)     │
                                                                  └─────────────┘
```

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Linguagem | TypeScript | Mesma do frontend; tipos compartilháveis |
| HTTP | Express | Curva de aprendizado baixa (risco nº 1 do plano de testes) |
| Validação | Zod | Gera erros por campo (RN08) e o schema OpenAPI (`zod-to-openapi`) |
| ORM / migrations | Prisma | Reduz a necessidade de SQL manual (a equipe não cursa Banco de Dados) |
| Banco | PostgreSQL | Relacional (exigência do plano), transações e locks de linha |
| Fila | BullMQ + Redis | Retry, backoff e worker separado (FCCPD) |
| Cache | Redis | Mesmo Redis da fila; cache do catálogo |
| Auth | JWT (`jsonwebtoken`) + bcrypt | Exigido pelos TC01, TC07 e TC13 |
| Upload | Multer + Sharp (no worker) + storage (Cloudinary/S3/Supabase) | "Processado e otimizado" (HU7) pode ir para a fila (FCCPD) |
| Docs | Swagger UI em `/api/docs` | Exigência do Notion |
| Testes | Jest + Supertest; k6 para carga | Previstos no plano de testes |
| Local | `docker-compose` (Postgres + Redis) | Contingência prevista no plano de testes |
| Deploy | API + worker no Render/Railway; frontend na Vercel | A Vercel não mantém worker de longa duração |

### Estrutura de pastas (monorepo)

```
/                     ← frontend Next.js atual (inalterado)
/backend
  ├── prisma/
  │   ├── schema.prisma
  │   └── seed.ts                 ← migra data/mockData.ts + massa para teste de carga
  ├── src/
  │   ├── app.ts                  ← Express, middlewares, Swagger
  │   ├── server.ts               ← processo da API
  │   ├── worker.ts               ← processo do worker (BullMQ)
  │   ├── config/                 ← env, prisma, redis
  │   ├── shared/                 ← ApiResult, erros, paginação, auth middleware
  │   ├── modules/
  │   │   ├── auth/               ← controller · service · schemas
  │   │   ├── usuarios/
  │   │   ├── artesaos/
  │   │   ├── produtos/
  │   │   ├── curadoria/
  │   │   ├── carrinho/
  │   │   ├── frete/
  │   │   ├── checkout/
  │   │   ├── pagamentos/         ← Strategy: PixSimulado, CartaoSimulado, BoletoSimulado
  │   │   ├── pedidos/
  │   │   ├── avaliacoes/
  │   │   ├── mensagens/
  │   │   ├── notificacoes/
  │   │   └── dashboard/
  │   └── jobs/                   ← producers/consumers da fila
  ├── tests/                      ← unit, integration, load (k6)
  └── docker-compose.yml
```

### Padrões de projeto (para a justificativa SOLID/GRASP/GoF)
- **Facade:** mantém o papel do `fakeApi` no frontend, agora chamando HTTP.
- **Strategy:** `MetodoPagamento` (PIX / Cartão / Boleto) e `CalculadoraFrete`.
- **State:** transições válidas do `Pedido` e do `Produto` (§10).
- **Observer / Pub-Sub:** eventos de domínio → fila → worker.
- **Repository (via Prisma) + Service Layer:** controller (Controller GRASP) → service (Information Expert) → repositório.
- **Middleware chain (Chain of Responsibility):** auth → papel → validação → handler.
- **SRP/DIP:** cada módulo depende de interfaces (`GatewayPagamento`, `ServicoFrete`, `Notificador`), o que permite simular serviços externos.

---

## 7. Contrato de resposta da API

Preserva o `ApiResult<T>` já usado pelo frontend, com dois campos opcionais:

```ts
type ApiResult<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: { page: number; limit: number; totalItems: number; totalPages: number }; // listagens paginadas (TC06)
  errors?: { campo: string; mensagem: string }[];                               // falhas de validação (TC05)
};
```

| Situação | HTTP | Exemplo de `error` |
|---|---|---|
| Sucesso | 200 / 201 / 204 | `null` |
| Validação | 400 | `"Dados inválidos"` + `errors[]` |
| Estoque esgotado | 400 | `"Item esgotado durante a finalização"` |
| Sem token / token expirado | 401 | `"Sessão expirada"` |
| Papel sem permissão / recurso de outro usuário | 403 | `"Acesso negado"` |
| Não encontrado | 404 | `"Produto não encontrado"` |
| Conflito (e-mail já cadastrado) | 409 | `"E-mail já cadastrado"` |
| Erro inesperado | 500 | `"Erro interno"` (sem stack trace) |

---

## 8. Endpoints

Prefixo `/api` (conforme o plano de testes). Papéis: **P** = público, **C** = consumidor, **A** = artesão, **ADM** = admin.

### Autenticação e conta
| Método | Rota | Papel | Descrição | Ref. |
|---|---|---|---|---|
| POST | `/api/auth/cadastro` | P | Cria consumidor ou artesão | RN04–06 |
| POST | `/api/auth/login` | P | Retorna JWT e perfil | TC01, TC07 |
| POST | `/api/auth/logout` | C/A/ADM | Invalida a sessão (incrementa `tokenVersion`) | HU16 |
| GET | `/api/me` | C/A/ADM | Perfil do usuário logado | |
| PUT | `/api/me` | C/A/ADM | Atualiza dados básicos | |
| DELETE | `/api/me` | C/A | Exclui a conta (já existe no frontend) | |

### Artesãos
| Método | Rota | Papel | Descrição | Ref. |
|---|---|---|---|---|
| GET | `/api/artesaos` | P | Lista artesãos (substitui `fakeApi.getArtesaos`) | |
| GET | `/api/artesaos/:id` | P | Perfil público com peças `ATIVO` | HU3, TC11 |
| PUT | `/api/artesao/perfil` | A | Bio, técnicas, polo, ateliê | HU7, TC10 |
| POST | `/api/artesao/perfil/fotos` | A | Upload de foto (JPG/PNG ≤ 5 MB) | HU7, TC10 |
| GET | `/api/artesao/indicadores?de&ate` | A | Faturamento, mais vendidos, por polo | HU18 |
| GET/PUT | `/api/artesao/checklist` | A | Checklist de formalização | HU15 |

### Produtos e catálogo
| Método | Rota | Papel | Descrição | Ref. |
|---|---|---|---|---|
| GET | `/api/produtos?page&limit&busca&categoria&tecnica&polo&artesaoId&precoMin&precoMax&ordenacao` | P | Vitrine (apenas `ATIVO`), **com cache** | HU2, TC03, TC06 |
| GET | `/api/produtos/:id` | P | Detalhe, com média de avaliações | |
| GET | `/api/categorias` | P | Lista categorias | |
| GET | `/api/artesao/produtos` | A | Produtos do artesão (todos os status) | HU1 |
| POST | `/api/produtos` | A | Cria como `PENDENTE` | HU1, TC05, TC09 |
| PUT | `/api/produtos/:id` | A (dono) | Edita; volta para `PENDENTE` se alterar dados curados | HU1 |
| PATCH | `/api/produtos/:id/estoque` | A (dono) | Ajusta estoque | UC "Gerenciar estoque" |
| DELETE | `/api/produtos/:id` | A (dono) / ADM | Remove | |
| POST | `/api/produtos/:id/imagens` | A (dono) | Upload de imagens | HU1 |

### Curadoria e administração
| Método | Rota | Papel | Descrição | Ref. |
|---|---|---|---|---|
| GET | `/api/admin/curadoria?status=PENDENTE` | ADM | Fila de curadoria | HU8 |
| POST | `/api/admin/produtos/:id/aprovar` | ADM | → `ATIVO`, notifica | HU8 |
| POST | `/api/admin/produtos/:id/reprovar` | ADM | → `REJEITADO`, `justificativa` obrigatória | HU8, TC04 |
| GET | `/api/admin/usuarios?tipo&status` | ADM | Lista usuários | HU16 |
| POST | `/api/admin/usuarios/:id/suspender` | ADM | `motivo` obrigatório; invalida sessões | HU16 |
| POST | `/api/admin/usuarios/:id/reativar` | ADM | | HU16 |
| GET | `/api/admin/pedidos?status&atrasado&page` | ADM | Todos os pedidos | HU10, TC01 |
| POST | `/api/admin/pedidos/:id/intervencoes` | ADM | Nota interna | HU10 |
| GET | `/api/admin/dashboard/metricas?de&ate` | ADM | Indicadores gerais | HU9, TC01 |

### Carrinho e frete
| Método | Rota | Papel | Descrição | Ref. |
|---|---|---|---|---|
| GET | `/api/carrinho` | C | Carrinho persistido | TC14 |
| POST | `/api/carrinho/itens` | C | Adiciona (valida estoque) | HU4, TC14 |
| PATCH | `/api/carrinho/itens/:produtoId` | C | Altera quantidade (≤ estoque) | TC14 |
| DELETE | `/api/carrinho/itens/:produtoId` | C | Remove item | |
| POST | `/api/carrinho/calcular` | C | Subtotal calculado no servidor | **TC08** |
| GET | `/api/frete?cep=` | P | Frete simulado: valor e prazo | HU4, TC14 |

### Checkout, pagamento e pedidos
| Método | Rota | Papel | Descrição | Ref. |
|---|---|---|---|---|
| POST | `/api/checkout` | C | Reserva atômica e cria pedido(s) → 201 / 400 | **HU11, TC02** |
| POST | `/api/pedidos/:id/pagamento` | C (dono) | `{ metodo, parcelas?, cartao? }` | HU5, TC15, TC16 |
| POST | `/api/pagamentos/webhook` | gateway simulado | Confirmação PIX/boleto (idempotente) | TC16 |
| GET | `/api/comprador/pedidos` | C | Meus pedidos | HU6, TC13 |
| GET | `/api/pedidos/:id` | C (dono) / A (dono) / ADM | Detalhe e linha do tempo | HU6, TC12, TC13 |
| GET | `/api/artesao/pedidos?status` | A | Pedidos recebidos | HU13 |
| PATCH | `/api/artesao/pedidos/:id/status` | A (dono) | `{ status, codigoRastreio? }` | HU13 |

### Interação
| Método | Rota | Papel | Descrição | Ref. |
|---|---|---|---|---|
| POST | `/api/avaliacoes` | C | Só com pedido `ENTREGUE` | HU17 |
| GET | `/api/produtos/:id/avaliacoes` | P | Lista avaliações | HU17 |
| POST | `/api/produtos/:id/mensagens` | C | Contatar produtor | HU14 |
| GET | `/api/artesao/mensagens` | A | Caixa de mensagens | HU14 |
| GET | `/api/notificacoes` | C/A | Notificações do usuário | HU8, HU12, HU14 |
| PATCH | `/api/notificacoes/:id/lida` | C/A | Marca como lida | |
| POST/DELETE | `/api/favoritos/:produtoId` | C | Favoritar | Diagrama de classes |

### Infra
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Health check (deploy) |
| GET | `/api/docs` | Swagger UI |

---

## 9. Schema do banco (Prisma)

Baseado no diagrama de classes, com os ajustes de §5 marcados com `// ⚠`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ───────────── Enums ─────────────
enum TipoUsuario      { ADMIN ARTESAO CONSUMIDOR }
enum StatusUsuario    { ATIVO INATIVO SUSPENSO }                       // ⚠ C8: + INATIVO
enum StatusProduto    { PENDENTE ATIVO REJEITADO }
enum StatusPedido     { CRIADO AGUARDANDO_PAGAMENTO PAGO EM_PRODUCAO DESPACHADO ENTREGUE CANCELADO } // ⚠ C2: + CANCELADO
enum MetodoPagamento  { PIX CARTAO BOLETO }
enum StatusPagamento  { PENDENTE APROVADO RECUSADO EXPIRADO }          // ⚠ + EXPIRADO (TC16)
enum TipoEvento       { NOVO_PEDIDO PRODUTO_APROVADO PRODUTO_REJEITADO NOVA_MENSAGEM PEDIDO_ATUALIZADO }

// ───────────── Usuários ─────────────
model Usuario {
  id              String        @id @default(uuid())
  nome            String
  email           String        @unique
  senhaHash       String
  telefone        String?
  tipo            TipoUsuario
  status          StatusUsuario @default(ATIVO)
  motivoSuspensao String?
  tokenVersion    Int           @default(0)   // ⚠ incrementado para invalidar sessões (HU16)
  dataCadastro    DateTime      @default(now())

  consumidor      Consumidor?
  artesao         Artesao?
  administrador   Administrador?
}

model Consumidor {
  id               String   @id @default(uuid())
  usuarioId        String   @unique
  usuario          Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  enderecoPadraoId String?

  enderecos        Endereco[]
  carrinho         Carrinho?
  pedidos          Pedido[]
  avaliacoes       Avaliacao[]
  favoritos        Favorito[]
  mensagens        MensagemContato[]
}

model Administrador {
  id           String  @id @default(uuid())
  usuarioId    String  @unique
  usuario      Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  nivelAcesso  String  @default("PADRAO")
}

model Artesao {
  id                 String   @id @default(uuid())
  usuarioId          String   @unique
  usuario            Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  nomeAtelie         String?
  biografia          String?
  tecnicasPrincipais String[]
  especialidade      String?               // ⚠ usado pelo frontend atual
  poloRegional       String?               // ⚠ ex.: "Alto do Moura", "Agreste"
  cidade             String
  estado             String   @default("PE")
  cepOrigem          String?
  fotoPerfilUrl      String?
  fotoAtelieUrl      String?
  aceitaEncomenda    Boolean  @default(false)
  avaliacaoMedia     Float    @default(0)
  dataCadastro       DateTime @default(now())

  produtos           Produto[]
  itensVendidos      ItemPedido[]
  pedidos            Pedido[]
  notificacoes       NotificacaoLog[]
  mensagens          MensagemContato[]
  checklist          ChecklistFormalizacao?
}

model Endereco {
  id           String     @id @default(uuid())
  consumidorId String
  consumidor   Consumidor @relation(fields: [consumidorId], references: [id], onDelete: Cascade)
  cep          String
  rua          String
  numero       String
  complemento  String?
  cidade       String
  estado       String
  entregas     Entrega[]
}

// ───────────── Catálogo ─────────────
model CategoriaProduto {
  id       String    @id @default(uuid())
  nome     String    @unique
  produtos Produto[]
}

model Produto {
  id                     String        @id @default(uuid())
  artesaoId              String
  artesao                Artesao       @relation(fields: [artesaoId], references: [id], onDelete: Cascade)
  categoriaId            String?
  categoria              CategoriaProduto? @relation(fields: [categoriaId], references: [id])
  titulo                 String
  descricao              String?
  tecnica                String        // ⚠ C3: obrigatório (HU1/HU2)
  poloOrigem             String        // ⚠ C3: obrigatório (HU1/HU2)
  preco                  Decimal       @db.Decimal(10, 2)
  materiaisUtilizados    String?
  dimensoes              String?       // ⚠ usado pelo frontend atual
  prontaEntrega          Boolean       @default(true)
  tempoProducaoDias      Int?
  imagensUrls            String[]
  avaliacaoMedia         Float         @default(0)
  status                 StatusProduto @default(PENDENTE)
  justificativaCuradoria String?
  criadoEm               DateTime      @default(now())
  atualizadoEm           DateTime      @updatedAt

  estoque                Estoque?
  itensCarrinho          ItemCarrinho[]
  itensPedido            ItemPedido[]
  avaliacoes             Avaliacao[]
  favoritos              Favorito[]
  mensagens              MensagemContato[]

  @@index([status, categoriaId])
  @@index([status, tecnica, poloOrigem])
}

model Estoque {
  id                   String  @id @default(uuid())
  produtoId            String  @unique
  produto              Produto @relation(fields: [produtoId], references: [id], onDelete: Cascade)
  quantidadeDisponivel Int     @default(0)   // CHECK (quantidadeDisponivel >= 0) via migration SQL
  versao               Int     @default(0)   // lock otimista (diagrama de classes)
}

// ───────────── Carrinho ─────────────
model Carrinho {
  id           String         @id @default(uuid())
  consumidorId String         @unique
  consumidor   Consumidor     @relation(fields: [consumidorId], references: [id], onDelete: Cascade)
  itens        ItemCarrinho[]
  atualizadoEm DateTime       @updatedAt
}

model ItemCarrinho {
  id         String   @id @default(uuid())
  carrinhoId String
  carrinho   Carrinho @relation(fields: [carrinhoId], references: [id], onDelete: Cascade)
  produtoId  String
  produto    Produto  @relation(fields: [produtoId], references: [id], onDelete: Cascade)
  quantidade Int

  @@unique([carrinhoId, produtoId])
}

// ───────────── Pedidos ─────────────
model Pedido {
  id             String       @id @default(uuid())
  codigoCompra   String                       // ⚠ C9: agrupa pedidos do mesmo checkout (um por artesão)
  consumidorId   String
  consumidor     Consumidor   @relation(fields: [consumidorId], references: [id])
  artesaoId      String                       // ⚠ C9
  artesao        Artesao      @relation(fields: [artesaoId], references: [id])
  dataPedido     DateTime     @default(now())
  valorProdutos  Decimal      @db.Decimal(10, 2)
  valorFrete     Decimal      @db.Decimal(10, 2)
  valorTotal     Decimal      @db.Decimal(10, 2)
  status         StatusPedido @default(CRIADO)
  reservaExpiraEm DateTime?                  // ⚠ expiração do PIX (30 min) → devolve estoque

  itens          ItemPedido[]
  pagamento      Pagamento?
  entrega        Entrega?
  historico      HistoricoStatusPedido[]     // ⚠ linha do tempo (HU6)
  intervencoes   IntervencaoPedido[]         // ⚠ substitui o campo notasIntervencaoAdmin (HU10)
  notificacoes   NotificacaoLog[]

  @@index([consumidorId])
  @@index([artesaoId, status])
  @@index([codigoCompra])
}

model ItemPedido {
  id            String  @id @default(uuid())
  pedidoId      String
  pedido        Pedido  @relation(fields: [pedidoId], references: [id], onDelete: Cascade)
  produtoId     String
  produto       Produto @relation(fields: [produtoId], references: [id])
  artesaoId     String
  artesao       Artesao @relation(fields: [artesaoId], references: [id])
  tituloProduto String                      // ⚠ snapshot: o pedido não muda se o produto mudar
  quantidade    Int
  precoUnitario Decimal @db.Decimal(10, 2)  // snapshot do preço no momento da compra (TC08)
}

model HistoricoStatusPedido {
  id        String       @id @default(uuid())
  pedidoId  String
  pedido    Pedido       @relation(fields: [pedidoId], references: [id], onDelete: Cascade)
  status    StatusPedido
  criadoEm  DateTime     @default(now())
  autorId   String?
}

model IntervencaoPedido {
  id        String   @id @default(uuid())
  pedidoId  String
  pedido    Pedido   @relation(fields: [pedidoId], references: [id], onDelete: Cascade)
  adminId   String
  nota      String
  criadoEm  DateTime @default(now())
}

model Pagamento {
  id                       String          @id @default(uuid())
  pedidoId                 String          @unique
  pedido                   Pedido          @relation(fields: [pedidoId], references: [id], onDelete: Cascade)
  metodo                   MetodoPagamento
  status                   StatusPagamento @default(PENDENTE)
  parcelas                 Int             @default(1)
  codigoTransacao          String          @unique  // garante idempotência do webhook (TC16)
  linkBoletoOuPixCopiaCola String?
  expiraEm                 DateTime?
  dataProcessamento        DateTime?
}

model Entrega {
  id             String    @id @default(uuid())
  pedidoId       String    @unique
  pedido         Pedido    @relation(fields: [pedidoId], references: [id], onDelete: Cascade)
  enderecoId     String
  endereco       Endereco  @relation(fields: [enderecoId], references: [id])
  codigoRastreio String?
  transportadora String?   @default("Correios")
  dataPostagem   DateTime?
  dataPrevista   DateTime?
}

// ───────────── Interação ─────────────
model Avaliacao {
  id            String     @id @default(uuid())
  consumidorId  String
  consumidor    Consumidor @relation(fields: [consumidorId], references: [id], onDelete: Cascade)
  produtoId     String
  produto       Produto    @relation(fields: [produtoId], references: [id], onDelete: Cascade)
  nota          Int        // 1..5 (CHECK via migration SQL)
  comentario    String?
  dataAvaliacao DateTime   @default(now())

  @@unique([consumidorId, produtoId])
}

model Favorito {
  id           String     @id @default(uuid())
  consumidorId String
  consumidor   Consumidor @relation(fields: [consumidorId], references: [id], onDelete: Cascade)
  produtoId    String
  produto      Produto    @relation(fields: [produtoId], references: [id], onDelete: Cascade)

  @@unique([consumidorId, produtoId])
}

model MensagemContato {
  id           String     @id @default(uuid())
  consumidorId String
  consumidor   Consumidor @relation(fields: [consumidorId], references: [id], onDelete: Cascade)
  artesaoId    String
  artesao      Artesao    @relation(fields: [artesaoId], references: [id], onDelete: Cascade)
  produtoId    String
  produto      Produto    @relation(fields: [produtoId], references: [id], onDelete: Cascade)
  mensagem     String
  dataEnvio    DateTime   @default(now())
}

model NotificacaoLog {
  id                 String     @id @default(uuid())
  artesaoId          String?
  artesao            Artesao?   @relation(fields: [artesaoId], references: [id], onDelete: Cascade)
  usuarioId          String?                 // ⚠ destinatário genérico (consumidor)
  pedidoId           String?
  pedido             Pedido?    @relation(fields: [pedidoId], references: [id], onDelete: SetNull)
  tipoEvento         TipoEvento
  payload            Json?
  enviadoComSucesso  Boolean    @default(false)
  tentativas         Int        @default(0)
  lida               Boolean    @default(false)
  dataEnvio          DateTime   @default(now())
}

model ChecklistFormalizacao {
  id                  String   @id @default(uuid())
  artesaoId           String   @unique
  artesao             Artesao  @relation(fields: [artesaoId], references: [id], onDelete: Cascade)
  itensConcluidos     Json     @default("[]")
  percentualConclusao Int      @default(0)
  atualizadoEm        DateTime @updatedAt
}

// ⚠ Transactional Outbox: garante "sem perda de mensagens" (critério do plano de testes)
model EventoOutbox {
  id          String    @id @default(uuid())
  tipo        TipoEvento
  payload     Json
  criadoEm    DateTime  @default(now())
  publicadoEm DateTime?

  @@index([publicadoEm])
}
```

**Restrições SQL extras** (migration manual, já que o Prisma não gera `CHECK`):
```sql
ALTER TABLE "Estoque"   ADD CONSTRAINT estoque_nao_negativo CHECK ("quantidadeDisponivel" >= 0);
ALTER TABLE "Avaliacao" ADD CONSTRAINT nota_1_a_5          CHECK ("nota" BETWEEN 1 AND 5);
ALTER TABLE "Produto"   ADD CONSTRAINT preco_positivo      CHECK ("preco" > 0);
```

---

## 10. Máquinas de estado

### Produto
```
            aprovar                 reprovar(justificativa)
PENDENTE ───────────► ATIVO    PENDENTE ───────────────────► REJEITADO
   ▲                                                            │
   └──────────────── artesão edita e reenvia ◄──────────────────┘
```

### Pedido
```
CRIADO ─► AGUARDANDO_PAGAMENTO ─► PAGO ─► EM_PRODUCAO ─► DESPACHADO ─► ENTREGUE
               │                    │                     (exige codigoRastreio)
               │ PIX expirado /     │ (cartão aprovado vai direto para PAGO)
               │ cartão recusado    │
               ▼                    ▼
           CANCELADO ◄──────── cancelamento antes do despacho
       (devolve estoque)
```
Transições inválidas → **400**. Cada transição grava `HistoricoStatusPedido` e publica `PEDIDO_ATUALIZADO`.

| Rótulo na UI (HU6) | Status |
|---|---|
| Pagamento Confirmado | `PAGO` |
| Em Produção no Ateliê | `EM_PRODUCAO` |
| Despachado / Postado | `DESPACHADO` |
| Entregue | `ENTREGUE` |

### Usuário
`ATIVO ⇄ SUSPENSO` (com motivo; incrementa `tokenVersion`), `ATIVO ⇄ INATIVO`.

---

## 11. Checkout concorrente: algoritmo

Requisito: HU11, TC02 e FCCPD. Estratégia: **UPDATE condicional atômico** dentro de uma transação. É mais simples e mais robusto que `SELECT ... FOR UPDATE` + verificação na aplicação, e o `versao` do diagrama permanece como contador de alterações.

```
POST /api/checkout  { enderecoId, cep }   ← itens vêm do carrinho no BANCO, não do body
│
BEGIN TRANSACTION
│  1. Carrega itens do carrinho + preços atuais do banco (RN15)
│  2. Para cada item, ordenado por produtoId (evita deadlock):
│       UPDATE "Estoque"
│          SET "quantidadeDisponivel" = "quantidadeDisponivel" - :qtd,
│              "versao" = "versao" + 1
│        WHERE "produtoId" = :id AND "quantidadeDisponivel" >= :qtd;
│       → 0 linhas afetadas?  ROLLBACK → 400 "Item esgotado durante a finalização"
│  3. Agrupa itens por artesão → cria 1 Pedido por artesão (mesmo codigoCompra),
│     status AGUARDANDO_PAGAMENTO, reservaExpiraEm = agora + 30 min
│  4. Cria ItemPedido com snapshot de preço/título
│  5. Grava EventoOutbox(NOVO_PEDIDO) para cada pedido   ← mesma transação
│  6. Esvazia o carrinho
COMMIT
│
└─► 201 { codigoCompra, pedidos[], valorTotal }
```

- O `CHECK (quantidadeDisponivel >= 0)` é a **segunda barreira**: mesmo um bug de código não deixa o estoque negativo.
- **Devolução do estoque:** um job agendado (BullMQ repeatable, a cada 1 min) cancela pedidos `AGUARDANDO_PAGAMENTO` com `reservaExpiraEm < agora` e faz `UPDATE ... + qtd`, na mesma transação da mudança de status.
- **Teste de carga (k6):** 50 VUs → `POST /api/checkout` sobre um produto com estoque 1, cada VU com um usuário distinto (seed). Verificar: 1 × 201, 49 × 400, estoque final = 0 e 1 mensagem `NOVO_PEDIDO` processada.

---

## 12. Fila assíncrona e worker

| Fila / Job | Produtor | Consumidor (worker) | Ref. |
|---|---|---|---|
| `outbox-relay` (repetível, 1 s) | — | Lê `EventoOutbox` não publicados → publica nas filas → marca `publicadoEm` | RN27 |
| `notificacoes` | relay | Grava `NotificacaoLog`, envia e-mail simulado (log/console ou Mailtrap), com retry e backoff | HU12, HU8, HU14 |
| `expirar-reservas` (repetível, 1 min) | — | Cancela pedidos expirados e devolve estoque | TC16 |
| `processar-imagem` | upload | Redimensiona/otimiza com Sharp e grava URL final | HU7, FCCPD |
| `relatorios` | dashboard | Agregações pesadas em paralelo (`Promise.all`/worker threads) com resultado em cache | HU9, HU18, FCCPD |

**Por que outbox:** se a API publicasse direto no Redis após o commit e caísse no meio, a mensagem se perderia. Com a outbox, o evento é gravado **na mesma transação** do pedido, e o relay garante a entrega pelo menos uma vez. O consumidor é idempotente por `eventoId`.

**Cache do catálogo:** chave `produtos:{hash(query)}`, TTL de 60 s; invalidada (por prefixo) quando um produto é aprovado, editado ou removido, ou quando o estoque zera.

---

## 13. Migração do frontend (Fake API → API real)

Segue os 9 passos do *Documento de Substituição*. Pontos concretos no código atual:

| Arquivo atual | Hoje | Passa a ser |
|---|---|---|
| `src/services/api.ts` | `fakeApi` com dados mock | `api` com `fetch(${NEXT_PUBLIC_API_URL}/api/...)`, mesmo `ApiResult<T>` |
| `src/services/demoAuth.ts` | Contas, sessão e pedidos em `localStorage` | `authService` (login/cadastro/me) + token em memória/cookie |
| `src/services/produtoService.ts` | `localStorage['ponto_da_terra_products_v1']` | `GET/POST/PUT/DELETE /api/produtos` |
| `src/services/artesaoService.ts` | `localStorage['ponto_da_terra_artesans_v1']` | `/api/artesaos`, `/api/artesao/perfil` |
| `src/store/cartStore.tsx` | Carrinho em `localStorage` | `/api/carrinho` (logado); `localStorage` só para visitante |
| `src/app/(comprador)/checkout/page.tsx` | Cria pedido local; frete fixo R$ 15 | `GET /api/frete`, `POST /api/checkout`, `POST /api/pedidos/:id/pagamento` |
| `src/components/OrderManager.tsx` | Altera status no `localStorage` | `PATCH /api/artesao/pedidos/:id/status` |
| `src/app/admin/page.tsx` | `status: 'pendente'` via `as any` | `/api/admin/curadoria`, `/aprovar`, `/reprovar` |
| `src/types/produto.ts` | `emEstoque?: boolean` | `estoque: number`, `status`, `tecnica`, `poloOrigem` |

Variáveis de ambiente:
- Frontend: `NEXT_PUBLIC_API_URL`
- Backend: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `STORAGE_*`

Chaves de `localStorage` a remover ao final: `ponto_da_terra_session`, `_accounts_v1`, `_profile_overrides_v1`, `_deleted_accounts_v1`, `_orders_v1`, `_products_v1`, `_artesans_v1`.

O `data/mockData.ts` vira o **`prisma/seed.ts`**.

---

## 14. Rastreabilidade HU → Endpoint → Caso de teste

| Caso de teste | Endpoint(s) | HU |
|---|---|---|
| TC01 Proteção de rotas admin | `GET /api/admin/dashboard/metricas`, `/api/admin/pedidos` | HU9, HU10 |
| TC02 Concorrência no checkout | `POST /api/checkout` | HU11, HU12 |
| TC03 Filtro sem correspondência | `GET /api/produtos?tecnica=...` | HU2 |
| TC04 Curadoria reprovada | `POST /api/admin/produtos/:id/reprovar` | HU8 |
| TC05 Validação de payload | `POST /api/produtos` | HU1 |
| TC06 Paginação | `GET /api/produtos?page=2&limit=10` | HU2 |
| TC07 JWT expirado | `GET /api/artesao/perfil` | — |
| TC08 Subtotal no backend | `POST /api/carrinho/calcular` | HU4 |
| TC09 Cadastro de peça | `POST /api/produtos` | HU1 |
| TC10 Perfil e upload | `PUT /api/artesao/perfil`, `POST /api/artesao/perfil/fotos` | HU7 |
| TC11 Perfil público | `GET /api/artesaos/:id` | HU3 |
| TC12 Linha do tempo e rastreio | `GET /api/pedidos/:id` | HU6, HU13 |
| TC13 IDOR | `GET /api/comprador/pedidos`, `GET /api/pedidos/:id` | HU6 |
| TC14 Limite de estoque e frete | `/api/carrinho/itens`, `GET /api/frete` | HU4 |
| TC15 Cartão aprovado/recusado | `POST /api/pedidos/:id/pagamento` | HU5 |
| TC16 PIX, webhook e expiração | `POST /api/pedidos/:id/pagamento`, `POST /api/pagamentos/webhook`, job `expirar-reservas` | HU5 |

---

## 15. Ordem de implementação sugerida

| Fase | Entregas | Cobre |
|---|---|---|
| **0. Fundação** | `backend/` com Express + Prisma + Docker Compose (Postgres/Redis), `ApiResult`, tratamento de erros, Swagger, `/health`, seed a partir do `mockData.ts`, CI com Jest | Infra |
| **1. Auth e catálogo** | Cadastro/login JWT, middleware de papel, CRUD de produtos com validação, vitrine paginada com filtros e cache, perfil do artesão, curadoria | TC01, 03–07, 09–11 · HU1–3, 7, 8 |
| **2. Fluxo de compra (núcleo FCCPD)** | Carrinho no servidor, frete simulado, **checkout atômico**, outbox + worker de notificações, pagamento simulado (PIX/cartão/boleto), webhook idempotente, expiração de reservas, pedidos e status, rastreio, **teste k6 com 50 VUs** | TC02, 08, 12–16 · HU4–6, 11–13 |
| **3. Painéis** | Dashboard do admin e indicadores do artesão (agregações em paralelo, com cache), gestão de pedidos do admin com intervenções | HU9, 10, 18 |
| **4. Should/Could** | Avaliações, contatar produtor, suspensão de usuários, checklist de formalização, favoritos, processamento de imagem na fila | HU14–17 |
| **5. Integração e deploy** | Trocar `services/` do frontend, remover `localStorage`, deploy (API + worker + DB + Redis), benchmark e relatórios | Notion: Entregáveis |

**Andamento (11/11/2026):**
- **Fase 0 concluída:** projeto `backend/`, Docker Compose (projeto `ponto-da-terra`), schema, migration com `CHECK`s, seed, Swagger, health check e Jest.
- **Fase 1 concluída**, com 65 testes passando.
- **Antecipados da fase 2** por causa do relatório de testes:
  - `POST /api/carrinho/calcular` (TC08);
  - `GET /api/frete` (TC14);
  - upload de fotos com validação no servidor (TC10).
- **Fase 2 concluída:**
  - **Compra:** checkout com reserva atômica de estoque, um pedido por artesão (D5), com frete próprio.
  - **Pagamentos simulados:** PIX com QR e expiração, cartão de 1x a 6x com recusa, boleto em PDF. Webhook idempotente e expiração das reservas.
  - **Fila:** outbox + relay + worker BullMQ em processo separado.
  - **Testes:** script k6 com 50 acessos simultâneos.
- **Fases 3 e 4 concluídas:** dashboard do admin (HU9), pedidos e intervenções (HU10), indicadores do artesão (HU18), moderação de usuários (HU16), avaliações (HU17), contato com o produtor (HU14) e central de orientação com checklist (HU15).
- **Fase 5 (integração) concluída:**
  - **Telas:** todas usam a API; o `mockData` e o `demoAuth.ts` foram removidos.
  - **Qualidade:** lint zerado (eram 31 avisos), `package-lock.json` sincronizado e CI no GitHub Actions.
- **Deploy concluído** na Vercel (site + API serverless, Neon, Upstash Redis/QStash, Vercel Blob).
- **Integração completa (pontas soltas fechadas):** perfil público do artesão (HU3), aprovação de novos artesãos (HU8), inativar conta (HU16), favoritos e sacola salvos na conta, notificações para todos os perfis (sino com contador e "marcar todas como lidas"), aceite dos Termos com data registrada e texto dos Termos atualizado.
- **Testes:** 114 testes de API (Jest) e 58 verificações de fluxo no navegador (`e2e/`, Playwright), todos passando.
- **Falta:** definir a "IA" (D6) e os relatórios das disciplinas (benchmark, diagramas, 2ª rodada de testes).

---

## 16. Decisões pendentes

| # | Decisão | Opções | Recomendação |
|---|---|---|---|
| D1 | **Framework do backend** | ✅ **ADOTADO: Express 5 + Zod + Prisma** (11/11/2026), em `backend/` | — |
| D2 | **Banco** | ✅ **DECIDIDO: PostgreSQL** (11/11/2026). Falta escolher onde hospedar em produção: Neon, Supabase, Render Postgres ou Railway | Local via Docker; produção no Neon ou Supabase (plano gratuito) |
| D3 | ✅ **ADOTADO: BullMQ + Redis**, worker em processo separado (`npm run worker`) | — | — |
| D4 | **Hospedagem da API e do worker** | Render, Railway, Fly.io | Render (2 serviços: web + background worker) |
| D5 | ✅ **ADOTADO: (a)** uma `Compra` (um pagamento) dividida em um `Pedido` por artesão, cada um com frete e rastreio próprios | — | — |
| D6 | **"IA" exigida pelo Notion** | Ex.: gerar descrição da peça a partir do título/técnica; busca semântica; moderação automática de imagem/texto na curadoria | Confirmar com o professor. Sugestão: **pré-curadoria por IA** (sinaliza descrição/imagem suspeita para o admin), rodando **na fila** (cumpre IA e fila ao mesmo tempo) |
| D7 | **Storage de imagens** | Cloudinary, Supabase Storage, S3 | Cloudinary ou Supabase (plano gratuito) |
| D8 | **Token** | Bearer no header (como nos TCs) vs. cookie httpOnly | Bearer: é o que os casos de teste descrevem |
| D9 | **Ajustes nos documentos** | Atualizar diagrama de classes (C2, C3, C8), TC09 (C1), TC02 (C7) | Fazer antes do relatório de testes |

---

## 17. Melhorias a partir do Relatório de Execução de Testes (09/11/2026)

A rodada teve **3 aprovados, 3 reprovados e 10 bloqueados**, com recomendação "Não liberar". O que já foi tratado na API:

| Caso | Problema apontado no relatório | Correção no backend |
|---|---|---|
| **TC04** (reprovado, "ponto mais urgente") | A reprovação não pedia motivo, **apagava a peça**, não avisava o artesão, e peças não aprovadas apareciam na vitrine | A reprovação exige justificativa (mínimo de 10 caracteres) e muda o status para `REJEITADO`, sem apagar a peça. Gera notificação ao artesão (`/api/notificacoes`) e um evento na outbox. A vitrine filtra só peças `ATIVO` de artesãos com conta ativa. A decisão usa `SELECT ... FOR UPDATE`, então dois admins não decidem a mesma peça ao mesmo tempo |
| **TC08** (reprovado) | O subtotal era calculado no navegador: "quem alterar o preço no navegador altera também o total" | `POST /api/carrinho/calcular` busca os preços no banco e descarta qualquer preço enviado. A soma usa `Decimal`, sem erro de ponto flutuante |
| **TC14** (reprovado) | Não havia quantidade em estoque (só "disponível sim/não"), o frete era fixo em R$ 15 e o CEP não era validado | `Estoque.quantidadeDisponivel`; quantidade acima do disponível retorna 400 "Limite de estoque atingido para esta peça". O frete é calculado por região do CEP (Strategy) e CEP inválido retorna 400 |
| **TC10** (bloqueado) | O frontend aceitava GIF, não limitava o tamanho e não tinha foto da oficina | Upload só de JPG/PNG até 5 MB, com o tipo conferido pelo conteúdo do arquivo (*magic bytes*), não pela extensão. Arquivo recusado nunca é gravado. Fotos de perfil e de oficina separadas (`?tipo=perfil` ou `?tipo=atelie`) |
| **TC01** (bloqueado) | O bloqueio do painel admin era "só uma verificação no navegador, fácil de burlar" | O middleware `somente(ADMIN)` roda no servidor para todo `/api/admin/*`: 401 sem token, 403 para outro perfil |
| **TC05, TC06, TC07** (bloqueados) | Não havia endpoint, paginação nem JWT | Implementados e cobertos por testes automatizados |

**Situação atual:** os 16 casos de teste deixaram de estar bloqueados. Todos têm teste automatizado de API, e os fluxos de tela (TC04, TC08, TC09, TC12, TC14, TC15, TC16) também têm teste no navegador. O mapeamento caso a caso está em [`backend/README.md`](backend/README.md#testes).

**Para a 2ª rodada:**
- **Reexecutar os 16 casos.** Use o site, o Swagger em `/api/docs` ou o Postman, e anexe como evidência a saída de `npm test` (backend) e de `npm test` (e2e).
- **Ajustar o TC09 no plano de testes.** A peça nasce `PENDENTE` (decisão C1), não `Ativo`.
- **Ajustar o TC02.** A mensagem é "Item esgotado durante a finalização" (C7). Para a evidência de carga, rode o `npm run test:carga` (k6).
- **Registrar defeitos.** O relatório da 1ª rodada tem "0 defeitos" mesmo com 3 reprovações. Cada reprovação deveria virar um defeito rastreável (Trello ou GitHub Issues), ligado ao caso de teste.
