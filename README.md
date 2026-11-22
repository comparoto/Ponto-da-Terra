<div align="center">

<img src="logo-pdt-png.png" alt="Logo Origem: Ponto da Terra" width="180">

# Origem: Ponto da Terra

**Uma vitrine digital para o artesanato pernambucano.**

[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=flat-square)](#)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Chakra UI](https://img.shields.io/badge/Chakra_UI-319795?style=flat&logo=chakraui&logoColor=white)](https://chakra-ui.com/)

[Requisitos](https://app.notion.com/p/Projeto-Integrador-3c996fcfd27080df9bf3ef635f5bdf99?source=copy_link) ·
[Backlog](https://trello.com/b/KZIZUnYE/ponto-da-terra) ·
[Issues](https://github.com/comparoto/Ponto-da-Terra/issues)

</div>

## Índice

- 📖 Descrição
- 🎞️ Screencast
- 👩‍💻 Integrantes
- 🧱 Arquitetura
  - Concorrência, paralelismo e distribuição
- 🔄 Fluxos implementados
- 🛠️ Tecnologias utilizadas
- ⚙️ Como executar localmente
- ✅ Funcionalidades implementadas
- 🔌 "Rotas" da Fake API
- 🚀 Deploy
- 🧪 Evidências
- 📃 Documentações exigidas
- 📋 Índice de entregas por unidade

---

## 📖 Descrição

O **Origem: Ponto da Terra** é uma aplicação web full stack voltada para o **Artesanato Pernambucano**, criada para resolver um problema real do setor: artesãos e produtores criativos têm pouca visibilidade digital, dependem de intermediários e enfrentam gestão precária de catálogo, pedidos e estoque.

A plataforma conecta esses artesãos diretamente a compradores de todo o país, por meio de:

- **Vitrine do comprador** — busca, filtros, perfil do artesão, carrinho e avaliações;
- **Painel do artesão** — gestão de catálogo, estoque e pedidos;
- **Painel administrativo** — indicadores de venda e gestão geral da plataforma.

> 📌 **Status atual do projeto (11/11/2026):** aplicação full stack integrada. O frontend consome a **API real** (pasta [`backend/`](backend/README.md): Node.js + Express + PostgreSQL + Redis/BullMQ + worker de filas) em todos os fluxos: login e cadastro (JWT), vitrine e catálogo, checkout com reserva atômica de estoque, pagamentos simulados (PIX, cartão e boleto), pedidos com rastreio, avaliações, contato com o produtor, favoritos e sacola salvos na conta, perfil público do artesão (`/artesaos/:id`), notificações com contador, aprovação de novos artesãos, painéis do artesão e do admin e a central de orientação. As 18 histórias de usuário do backlog estão implementadas. Requisitos e roadmap: [`REQUISITOS_BACKEND.md`](REQUISITOS_BACKEND.md).
>
> A Fake API da 1ª entrega foi substituída pela API real. Ela está descrita, só como histórico, na seção "Histórico: a Fake API da 1ª entrega", mais abaixo.

O projeto integra três frentes acadêmicas complementares:

| Disciplina | Responsabilidade |
|---|---|
| **Desenvolvimento Web** | Frontend responsivo (vitrine, busca, carrinho, perfis) e backend (API, banco de dados e regras de negócio) |
| **Requisitos, Projeto de Software e Validação** | Análise de domínio, gestão de requisitos, arquitetura (SOLID/GRASP, padrões de projeto) e estratégia de testes |
| **Fundamentos de Computação Concorrente, Paralela e Distribuída** | Desempenho, escalabilidade e tolerância a falhas — concorrência no checkout/baixa de estoque, filas e processamento assíncrono |

📄 [Lista de requisitos detalhada (Notion)](https://app.notion.com/p/Projeto-Integrador-3c996fcfd27080df9bf3ef635f5bdf99?source=copy_link)

## 👩‍💻 Integrantes

| Nome | GitHub |
|---|---|
| Iza Malafaia | [@Iza-Malafaia](https://github.com/Iza-Malafaia) |
| Juliana Comparoto | [@comparoto](https://github.com/comparoto) |
| Joanna Farias | [@Joanna-Farias](https://github.com/Joanna-Farias) |
| Lucas Vinícius | [@Lucas-Viniicius](https://github.com/Lucas-Viniicius) |
| Maria Luiza | [@alumiria](https://github.com/alumiria) |
| Paulo Marrocos | [@paulosds2318](https://github.com/paulosds2318) |
| Pedro Marrocos | [@Pedrinhosds16](https://github.com/Pedrinhosds16) |

---

## 🧱 Arquitetura

A aplicação é **full stack**: um frontend Next.js (raiz do projeto) que consome, por HTTP, uma API Node.js/Express (pasta [`backend/`](backend/README.md)) com banco PostgreSQL, cache Redis e fila de eventos.

```
Navegador ──▶ Frontend (Next.js, Vercel) ──HTTP/JSON──▶ API (Express, Vercel) ──▶ PostgreSQL (Neon)
                                                            │                        ▲
                                                            ├──▶ Redis (cache do catálogo)
                                                            └──▶ Fila de eventos (BullMQ local / QStash na Vercel)
                                                                   └──▶ Worker: e-mails, notificações, imagens
```

### Frontend (`src/`)

```
src/
├── app/                    # Rotas e páginas (Next.js App Router)
│   ├── (comprador)/            # vitrine, produtos, checkout, compra/[codigo], favoritos, meus-pedidos
│   ├── admin/                  # painel administrativo (curadoria, contas, indicadores)
│   ├── artesao/                # painel do artesão (catálogo, pedidos, perfil, checklist)
│   ├── artesaos/[id]/          # perfil público do artesão
│   ├── cadastro/ login/ esqueci-senha/ redefinir-senha/   # acesso e recuperação de senha
│   ├── home/ notificacoes/ orientacao/ perfil/ termos/
├── components/             # Componentes de UI (Navbar, CartDrawer, ProductCard, ProductManager,
│                           #   OrderManager, ContatoModal, Notificacoes, AlterarSenha, ...)
├── services/               # Acesso à API via HTTP (http.ts) e um serviço por assunto:
│                           #   authService, produtoService, artesaoService, carrinhoService,
│                           #   pedidoService, curadoriaService, interacaoService, cepService
├── hooks/                  # useSession, useCarregar
├── store/                  # Estado global (cartStore, favoritosStore)
└── types/                  # Tipagens e contratos (TypeScript)
```

- **Separação em camadas:** apresentação (`components`, `app`), estado (`store`) e acesso a dados (`services`). Os componentes não conhecem URLs da API, só os serviços.
- **Contrato `ApiResult<T>`:** os serviços devolvem `{ success, data, error }`, o mesmo formato da Fake API da 1ª entrega e das respostas da API real. A troca da Fake API pela API real não exigiu mudar telas.
- **Sessão:** o token JWT fica no navegador e é enviado a cada requisição. As permissões (comprador, artesão, administrador) são validadas **no servidor**, e não só nas telas.

### Backend (`backend/src/`)

```
backend/src/
├── app.ts, server.ts, worker.ts    # API, ponto de entrada local e worker de filas
├── config/                         # variáveis de ambiente validadas
├── modules/                        # um módulo por assunto: auth, artesaos, produtos, carrinho, compras,
│                                   #   pedidos, comprador, interacao, notificacoes, relatorios, admin, jobs
├── jobs/                           # fila, outbox, consumidores de eventos, processamento de imagem
├── shared/                         # middlewares e utilidades (auth, validação, erros, cache, rate limit, e-mail)
└── docs/                           # esquemas Zod usados no Swagger (OpenAPI)
```

- **Cadeia de middlewares:** `autenticar` → `autorizar` (perfil) → `validate` (Zod) → controlador → serviço.
- **Banco:** 24 modelos e 9 enumerações no Prisma, com migrations versionadas. O diagrama de classes gerado do schema está em [**docs/DIAGRAMA_DE_CLASSES.md**](docs/DIAGRAMA_DE_CLASSES.md).
- **Padrões e táticas:** Strategy nos meios de pagamento (PIX, cartão, boleto simulados), Transactional Outbox para eventos, consumidor idempotente, reserva atômica de estoque no checkout, revogação imediata de acesso com `tokenVersion`, rate limit no login.
- **Detalhes da API (rotas, variáveis, testes):** [backend/README.md](backend/README.md). Documentação interativa: [Swagger](https://ponto-da-terra-api.vercel.app/api/docs) (69 operações em 60 caminhos).

**Princípios de projeto aplicados:**
- Separação entre apresentação, estado e acesso a dados, reduzindo o acoplamento entre a UI e a origem dos dados (SOLID/GRASP).
- Camada de serviço no backend, mantendo as regras de negócio fora das rotas.
- Tipagem em todo o código: o projeto não usa o tipo `any`, e o lint e um teste (`backend/tests/sem-any.test.ts`) verificam isso.

### Concorrência, paralelismo e distribuição

- **Na API real:** o checkout reserva o estoque com um `UPDATE` condicional, com uma restrição no banco (`CHECK` estoque ≥ 0), e isso evita vender o que não existe. O teste de carga com 50 compradores disputando 1 unidade (k6, `npm run test:carga` em `backend/`) resultou em 1 venda, 49 recusas e estoque final 0. Os eventos passam por fila e por um worker com processamento idempotente.
- **Na 1ª entrega:** foi desenvolvido o módulo independente **`TesteDeStress`**, que simula acessos simultâneos ao checkout com **20 threads paralelas** sincronizadas por `CountDownLatch`, para validar o conceito de concorrência antes de haver backend.
  - 📦 [Arquivo ZIP](https://drive.google.com/file/d/1ITK4Tarze59MlXn2-qVx2QE2MADOqIVR/view?usp=sharing)
  - 🖼️ [Slides](https://canva.link/yesnpw11bo8hgas)

---

## 🔄 Fluxos implementados

Todos os fluxos abaixo funcionam sobre a API real:

- **Compra:** vitrine e filtros → peça → carrinho (salvo na conta) → cálculo de frete por CEP → checkout → pagamento simulado (PIX com expiração, cartão ou boleto) → acompanhamento do pedido, com um pedido por artesão.
- **Pedidos do comprador:** lista e detalhe da compra, linha do tempo de status, código de rastreio, avaliação da peça.
- **Gestão do artesão:** cadastro de peças (com análise da curadoria antes de aparecerem na vitrine), estoque, pedidos (produção, postagem com rastreio, entrega), perfil e fotos, checklist de formalização, indicadores.
- **Administração:** aprovação de novos artesãos, curadoria de peças (aprovar ou reprovar com motivo), moderação de contas (suspender, inativar, reativar), intervenção em pedidos e métricas.
- **Relacionamento:** contato com o produtor, favoritos, notificações com contador.
- **Conta:** cadastro, login, alteração e recuperação de senha por e-mail.

---

## 🛠️ Tecnologias utilizadas

| Camada | Tecnologia |
|---|---|
| **Frontend** | Next.js + TypeScript |
| **Estilização** | Chakra UI |
| **Camada de serviços** | `src/services/` consome a API via HTTP mantendo o contrato `ApiResult<T>` da antiga Fake API |
| **Backend** | Node.js + TypeScript + Express 5, documentado com Swagger (`backend/`) |
| **Banco de dados** | PostgreSQL 16 com Prisma 7 (migrations versionadas, driver `pg`) |
| **Cache** | Redis (catálogo) |
| **Autenticação** | JWT com perfis Comprador / Artesão / Administrador validados no servidor |
| **Testes de concorrência** | Java (`CountDownLatch`, simulação de 20 threads paralelas) — módulo `TesteDeStress`, independente da aplicação |
| **Controle de versão** | Git / GitHub |

---

## ⚙️ Como executar localmente

O frontend depende da API (pasta `backend/`), que precisa estar rodando.

### 1. Pré-requisitos
- Node.js 20+
- npm
- Docker Desktop (para o PostgreSQL e o Redis)

### 2. Clonar o repositório
```bash
git clone https://github.com/comparoto/Ponto-da-Terra.git
cd Ponto-da-Terra
```

### 3. Subir a API (terminal 1)
```bash
cd backend
npm install
cp .env.example .env
npm run db:up                 # PostgreSQL (porta 5434) e Redis (porta 6380) via Docker
npx prisma migrate deploy     # cria as tabelas
npm run db:seed               # dados iniciais + contas de demonstração
npm run dev                   # API em http://localhost:3333/api  ·  Swagger em /api/docs
```

### 4. Subir o worker de filas (terminal 2, na pasta backend)
```bash
npm run dev:worker            # notificações (fila) e expiração de reservas de PIX/boleto
```

### 5. Subir o frontend (terminal 3, na raiz do projeto)
```bash
npm install
npm run dev
```
A aplicação ficará disponível em `http://localhost:3000`. Se a API estiver em outro endereço, copie `.env.example` para `.env.local` e ajuste `NEXT_PUBLIC_API_URL`.

**Contas de demonstração:** `admin@pontodaterra.com / admin123`, `comprador@pontodaterra.com / comprador123`, `artesao@pontodaterra.com / artesao123`.
**Cartões de teste (pagamento simulado):** `4111 1111 1111 1111` aprovado · `4000 0000 0000 0002` recusado.

### 6. Testes
```bash
cd backend && npm test        # 143 testes de API (Jest), inclusive concorrência do checkout
cd e2e && npm install && npm test   # segurança, fluxos, responsividade e acessibilidade (requer passos 3 a 5)
```
Resultados da última execução: [`RELATORIO_TESTES.md`](RELATORIO_TESTES.md).

O CI do GitHub (`.github/workflows/ci.yml`) roda lint, typecheck, testes e build em cada push e pull request.

---

## ✅ Funcionalidades implementadas

As 18 histórias de usuário do backlog (10 *must*, 6 *should* e 2 *could*) estão implementadas. Resumo por área:

- [x] **Vitrine e catálogo** (`app/(comprador)`) — busca, filtros, paginação, detalhe da peça, avaliações e favoritos
- [x] **Perfil público do artesão** (`app/artesaos/[id]`)
- [x] **Login, cadastro e senha** (`app/login`, `app/cadastro`, `app/esqueci-senha`, `app/redefinir-senha`) — autenticação JWT, três perfis
- [x] **Carrinho e checkout** (`CartDrawer`, `app/(comprador)/checkout`) — limite de estoque, frete por CEP, reserva atômica de estoque
- [x] **Pagamentos simulados** — PIX com expiração e webhook, cartão e boleto
- [x] **Pedidos com rastreio** (`meus-pedidos`, `compra/[codigo]`, `OrderManager`)
- [x] **Painel do artesão** (`app/artesao`) — catálogo (`ProductManager`), pedidos, perfil, indicadores e checklist
- [x] **Painel administrativo** (`app/admin`) — curadoria, contas, intervenção em pedidos e métricas
- [x] **Notificações** (`app/notificacoes`) e **contato com o produtor** (`ContatoModal`)
- [x] **Central de orientação e termos** (`app/orientacao`, `app/termos`)
- [x] **Integração com a API real**, com testes automatizados (143 de API e roteiros de navegador, carga e segurança)
- [ ] Envio de e-mail real (hoje usa uma caixa de testes) e recursos de IA dentro da plataforma — fora do escopo desta etapa

---

## 🗂️ Histórico: a Fake API da 1ª entrega

Na 1ª entrega não havia backend: a "API" era o objeto `fakeApi` (`services/api.ts`), uma fachada sobre serviços de domínio que liam dados fixos de `data/mockData.ts`. Essa estrutura foi substituída pela API real, mas o contrato foi mantido.

<details>
<summary>Ver como a Fake API funcionava</summary>

Todo retorno seguia o formato `ApiResult<T>`, que continua sendo usado pelos serviços atuais:

```ts
type ApiResult<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
};
```

| Método `fakeApi` | Equivalente a | Hoje |
|---|---|---|
| `fakeApi.getArtesaos()` | `GET /artesaos` | `artesaoService`, que chama `GET /api/artesaos` na API real |
| `fakeApi.getPecas()` | `GET /pecas` | `produtoService`, que chama `GET /api/produtos` na API real |

Os documentos da época estão em "Documentações exigidas" (Fake API e migração para o backend real).

</details>

---

## 🚀 Deploy

- **Versão full stack (atual):** [site](https://ponto-da-terra-eight.vercel.app) · [API](https://ponto-da-terra-api.vercel.app/api/health) · [documentação da API](https://ponto-da-terra-api.vercel.app/api/docs)
- [1ª entrega](https://ponto-da-terra.vercel.app/) (somente frontend, com a Fake API)
- Como foi configurado e como publicar novas versões: [**DEPLOY_VERCEL.md**](DEPLOY_VERCEL.md)

---

## 🧪 Evidências

- [Backlog — Trello](https://trello.com/b/KZIZUnYE/ponto-da-terra)
- [Diagrama de Casos de Uso](https://drive.google.com/file/d/1j8Ej2N5DjwcfHfw6MvURt_CsS5oYxgQL/view?usp=sharing)
- [Diagrama de Classes (1ª unidade)](https://drive.google.com/file/d/1B3XJBb0NO-GSV3IqV8fT050-bVJqG5ad/view?usp=sharing) · [versão atualizada, gerada do schema](docs/DIAGRAMA_DE_CLASSES.md)
- [Plano de Testes — Versão 3](https://docs.google.com/document/d/1g6MABX9mCtVXfg0vxMLuS0kMjwttT4BClnToPovFeB8/edit?usp=sharing)
- [Script de Simulação de Carga — ZIP](https://drive.google.com/file/d/1ITK4Tarze59MlXn2-qVx2QE2MADOqIVR/view?usp=sharing)
- [Slides do teste de concorrência](https://canva.link/yesnpw11bo8hgas)
- [Log de Uso de IA (1ª unidade)](https://docs.google.com/document/d/1suMTaLtk8SR1g8WeNKN4IzYHL_MzHw9sh-mnHzTPREI/edit?usp=sharing) · [Uso de IA na 2ª unidade](docs/USO_DE_IA_2A_UNIDADE.md)
- [Relatórios de testes: 1ª rodada e 2ª rodada](docs/RELATORIO_2A_RODADA_TESTES.md)
- [Issues / Bug Tracker](https://github.com/comparoto/Ponto-da-Terra/issues)
- [Screencast](https://youtu.be/G3cyHzcV1Eo?si=K9olgvrcalE2YpW2)

---

## 📃 Documentações exigidas

**2ª unidade**
- [Requisitos, decisões e roadmap do backend](REQUISITOS_BACKEND.md)
- [Diagrama de classes atualizado (gerado do schema)](docs/DIAGRAMA_DE_CLASSES.md)
- [Relatório de testes · 1ª rodada](RELATORIO_TESTES.md) e [2ª rodada](docs/RELATORIO_2A_RODADA_TESTES.md)
- [Uso de IA na 2ª unidade](docs/USO_DE_IA_2A_UNIDADE.md)
- [Refatoração de code smells: moderação de contas](docs/REFATORACAO_MODERACAO_CONTAS.md)
- [API e como executar o backend](backend/README.md) · [Deploy](DEPLOY_VERCEL.md)

**1ª unidade**
- Documentação sobre o uso de IA: [Uso_de_IA_documentacao.pdf](https://github.com/user-attachments/files/32670671/Uso_de_IA_documentacao.pdf)
- Documentação sobre a Fake API: [Documentacao_Fake_API.pdf](https://github.com/user-attachments/files/32670674/Documentacao_Fake_API.pdf)
- Migração futura da FakeAPI para Back-end: [Documento_Substituicao_Fake_API_Backend_Real.pdf](https://github.com/user-attachments/files/32671712/Documento_Substituicao_Fake_API_Backend_Real.pdf)


---

## 📋 Índice de entregas por unidade

<details>
<summary><b>Primeira Unidade</b></summary>

**Requisitos, Projeto de Software e Validação**
- [Backlog - Trello](https://trello.com/b/KZIZUnYE/ponto-da-terra)
- [Diagrama de Casos de Uso](https://drive.google.com/file/d/1j8Ej2N5DjwcfHfw6MvURt_CsS5oYxgQL/view?usp=sharing)
- [Diagrama de Classes](https://drive.google.com/file/d/1B3XJBb0NO-GSV3IqV8fT050-bVJqG5ad/view?usp=sharing)
- [Plano de Testes](https://docs.google.com/document/d/1g6MABX9mCtVXfg0vxMLuS0kMjwttT4BClnToPovFeB8/edit?usp=sharing)

**Fundamentos de Computação Concorrente, Paralela e Distribuída**
- [Arquivo ZIP](https://drive.google.com/file/d/1ITK4Tarze59MlXn2-qVx2QE2MADOqIVR/view?usp=sharing)
- [Slides](https://canva.link/yesnpw11bo8hgas)
- [Log Uso de IA](https://docs.google.com/document/d/1suMTaLtk8SR1g8WeNKN4IzYHL_MzHw9sh-mnHzTPREI/edit?usp=sharing)

</details>

<details>
<summary><b>Segunda Unidade</b></summary>

**Desenvolvimento Web**
- Entregas:

**Requisitos, Projeto de Software e Validação**
- Entregas:
  - [Requisitos, decisões e roadmap do backend](REQUISITOS_BACKEND.md)
  - [Diagrama de classes atualizado](docs/DIAGRAMA_DE_CLASSES.md)
  - [Relatório de testes · 2ª rodada](docs/RELATORIO_2A_RODADA_TESTES.md) (e [1ª rodada, com o histórico de defeitos](RELATORIO_TESTES.md))
  - [Uso de IA na 2ª unidade](docs/USO_DE_IA_2A_UNIDADE.md)
  - [Refatoração de code smells](docs/REFATORACAO_MODERACAO_CONTAS.md) (atividade individual)
  - ADR individual: está em uma branch própria (`adr-paulo-marrocos`), fora desta

**Fundamentos de Computação Concorrente, Paralela e Distribuída**
- Entregas: 

**Issues/Bug Tracker**
- [Issues](https://github.com/comparoto/Ponto-da-Terra/issues)

</details>

---

<p align="center">Projeto acadêmico desenvolvido para a cadeira de Desenvolvimento Web sem fins lucrativos</p>
<p align="center"> Cesar School | 4º Período</p>
