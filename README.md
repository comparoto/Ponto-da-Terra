<div align="center">

<img src="logo-pdt-png.png" alt="Logo Origem: Ponto da Terra" width="180">

# Origem: Ponto da Terra

**Vitrine digital full stack para o artesanato pernambucano.**

[![Status](https://img.shields.io/badge/status-full%20stack%20integrado-brightgreen?style=flat-square)](#)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Chakra UI](https://img.shields.io/badge/Chakra_UI-319795?style=flat-square&logo=chakraui&logoColor=white)](https://v2.chakra-ui.com/)
[![Node.js](https://img.shields.io/badge/Node.js-Express%205-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)

[Aplicação (Deploy)](https://ponto-da-terra-eight.vercel.app) ·
[API (Swagger)](https://ponto-da-terra-api.vercel.app/api/docs) ·
[Requisitos](https://app.notion.com/p/Projeto-Integrador-3c996fcfd27080df9bf3ef635f5bdf99?source=copy_link) ·
[Backlog](https://trello.com/b/KZIZUnYE/ponto-da-terra) ·
[Issues](https://github.com/comparoto/Ponto-da-Terra/issues)

</div>

---

## Sobre o projeto

O **Origem: Ponto da Terra** é uma aplicação web full stack voltada para o **artesanato pernambucano**. Artesãos e produtores criativos têm pouca visibilidade digital, dependem de intermediários e enfrentam gestão precária de catálogo, pedidos e estoque. A plataforma conecta esses artesãos diretamente a compradores de todo o país e reúne catálogo, estoque e pedidos em um só lugar.

A aplicação atende três perfis, com permissões validadas no servidor por JWT:
- **Comprador:** vitrine com busca e filtros, perfil do artesão, favoritos, recomendações, carrinho, checkout, pagamentos simulados, rastreio e avaliações.
- **Artesão:** gestão de catálogo (com curadoria), controle de estoque, pedidos, perfil, checklist de formalização e indicadores.
- **Administrador:** aprovação de novos artesãos, curadoria de peças, moderação de contas, intervenção em pedidos e métricas gerais.

O projeto integra três frentes acadêmicas:

| Disciplina | Responsabilidade |
|---|---|
| **Desenvolvimento Web** | Frontend responsivo e backend (API, banco de dados e regras de negócio) |
| **Requisitos, Projeto de Software e Validação** | Análise de domínio, gestão de requisitos, arquitetura (SOLID/GRASP, padrões de projeto) e estratégia de testes |
| **Fundamentos de Computação Concorrente, Paralela e Distribuída** | Desempenho, escalabilidade e tolerância a falhas: concorrência no checkout, filas e processamento assíncrono |

> **Branch desta versão:** `integracao-backend`, que contém o frontend na raiz e o backend em [`backend/`](backend/README.md). A `main` ainda guarda a versão da 1ª entrega (somente frontend).

---

## Acesso rápido: deploy, API e screencasts

| Entregável | Link | Descrição |
|---|---|---|
| **Deploy final (full stack)** | [ponto-da-terra-eight.vercel.app](https://ponto-da-terra-eight.vercel.app) | Aplicação integrada à API real |
| **API em produção (health)** | [ponto-da-terra-api.vercel.app/api/health](https://ponto-da-terra-api.vercel.app/api/health) | Backend Node.js/Express com PostgreSQL (Neon) |
| **Documentação da API (Swagger)** | [ponto-da-terra-api.vercel.app/api/docs](https://ponto-da-terra-api.vercel.app/api/docs) | 69 operações em 60 caminhos, geradas dos esquemas Zod (OpenAPI). Dá para testar ali mesmo, ver o passo a passo abaixo |
| **Screencast final (com Network)** | `[INSERIR LINK DO SCREENCAST FINAL]` | Fluxo completo com a aba Network aberta, mostrando as chamadas ao backend. **Ainda a gravar** |
| **Deploy da 1ª entrega** | [ponto-da-terra.vercel.app](https://ponto-da-terra.vercel.app/) | Versão inicial (frontend com Fake API) |
| **Screencast da 1ª entrega** | [Assistir no YouTube](https://youtu.be/G3cyHzcV1Eo?si=K9olgvrcalE2YpW2) | Demonstração dos fluxos da 1ª unidade |

**Testar a API no Swagger:** abra a página, rode `POST /api/auth/login` com *Try it out* (por exemplo `comprador@pontodaterra.com` e `comprador123`), copie o `token` da resposta, clique em **Authorize** e cole só o token. As rotas com cadeado passam a funcionar.

Configuração e publicação na nuvem: [`docs/DEPLOY_VERCEL.md`](docs/DEPLOY_VERCEL.md).

---

## Arquitetura e tecnologias

```text
Navegador ──▶ Frontend (Next.js / Vercel) ──HTTP/JSON──▶ API (Express / Vercel) ──▶ PostgreSQL (Neon)
                                                            │                          ▲
                                                            ├──▶ Redis (cache do catálogo)
                                                            └──▶ Fila de eventos (BullMQ local / QStash na Vercel)
                                                                   └──▶ Worker: notificações, e-mails, reservas e imagens
```

| Camada | Tecnologias |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5, Chakra UI |
| **Backend** | Node.js 22, TypeScript, Express 5, Zod 4, Swagger (OpenAPI) |
| **Banco de dados** | PostgreSQL 16 com Prisma 7 (migrations versionadas, driver `pg`) |
| **Cache** | Redis |
| **Assíncrono e filas** | BullMQ (local) e QStash (Vercel), com Transactional Outbox |
| **Segurança** | JWT com 3 perfis validados no servidor, revogação imediata por `tokenVersion`, rate limit no login, lint e teste que proíbem o tipo `any` |
| **Testes e CI** | Jest com Supertest (148 testes de API), Playwright (fluxos, segurança, responsividade e acessibilidade), k6 (carga), GitHub Actions |

<details>
<summary><b>📁 Estrutura de pastas e decisões arquiteturais</b></summary>

### Frontend (`src/`)
```text
src/
├── app/            # Rotas (App Router): (comprador), artesao, artesaos/[id], admin, login, cadastro, notificacoes, orientacao...
├── components/     # UI reutilizável (Navbar, CartDrawer, ProductCard, ProductManager, OrderManager, ContatoModal...)
├── services/       # Cliente HTTP (http.ts) e um serviço por assunto, todos devolvendo ApiResult<T>
├── store/          # Estado global (cartStore, favoritosStore)
├── hooks/          # useSession, useCarregar
└── types/          # Tipagens e contratos TypeScript
```

### Backend (`backend/src/`)
```text
backend/src/
├── app.ts, server.ts, worker.ts    # API, servidor local e worker de filas
├── config/                         # Variáveis de ambiente validadas
├── modules/                        # auth, artesaos, produtos, carrinho, compras, pedidos, comprador,
│                                   # interacao, notificacoes, relatorios, admin, jobs
├── jobs/                           # Fila, outbox, consumidores idempotentes e processamento de imagem
├── shared/                         # Middlewares e utilidades (auth, validação, erros, cache, rate limit, e-mail)
└── docs/                           # Esquemas Zod usados para gerar o Swagger
```

### Padrões e princípios aplicados
- **Camadas desacopladas (SOLID/GRASP):** as telas não conhecem as URLs da API; toda a comunicação passa por `src/services/`, com o contrato `ApiResult<T>`.
- **Cadeia de middlewares no backend:** `autenticar` → `autorizar` → `validate` (Zod) → controlador → serviço.
- **Padrões de projeto:** *Strategy* nos meios de pagamento (PIX, cartão e boleto simulados), *Transactional Outbox* para publicar eventos com segurança e consumidores idempotentes.
- **Modelo de dados:** 24 modelos e 9 enumerações no Prisma. O [diagrama de classes](docs/DIAGRAMA_DE_CLASSES.md) é gerado do próprio schema (`cd backend && npm run docs:diagrama`).
- **Sem `any`:** o lint (regras `no-explicit-any` e `no-unsafe-*`) e um teste automatizado verificam que o código não usa o tipo `any`.

</details>

---

## Fluxos implementados

<details>
<summary><b>🔄 Ver todos os fluxos integrados à API real (18 histórias de usuário)</b></summary>

As 18 histórias de usuário do backlog (10 *must*, 6 *should* e 2 *could*) estão implementadas e integradas:

- **Conta e autenticação:** cadastro, login (JWT com revogação imediata por `tokenVersion`), alteração e recuperação de senha por e-mail.
- **Vitrine e descoberta:** busca, filtros, paginação, detalhe da peça, perfil público do artesão (`/artesaos/:id`), favoritos e recomendações ("Feitas para você", na página inicial).
- **Carrinho e checkout:** sacola salva na conta, limite de estoque, frete por CEP e reserva atômica de estoque.
- **Pagamentos simulados:** PIX (com expiração e webhook), cartão de crédito e boleto.
- **Pedidos e relacionamento:** um pedido por artesão, linha do tempo de status, código de rastreio, avaliação da peça, contato com o produtor e notificações com contador.
- **Painel do artesão (`/artesao`):** cadastro de peças (sujeitas à curadoria), estoque, pedidos (produção, postagem e entrega), perfil e fotos, checklist de formalização e indicadores.
- **Painel administrativo (`/admin`):** aprovação de novos artesãos, curadoria de peças (aprovar ou reprovar com motivo), moderação de contas (suspender, inativar e reativar), intervenção em pedidos e métricas.
- **Institucional:** central de orientação (`/orientacao`) e termos de uso (`/termos`).

> **Fora do escopo desta etapa:** envio de e-mail real em produção (hoje usa uma caixa de testes) e recursos de IA embarcados na plataforma.

</details>

---

## Evidências técnicas

Todas as evidências abaixo, com capturas de tela, logs e medições, estão reunidas em [**docs/EVIDENCIAS_AVALIACAO_2.md**](docs/EVIDENCIAS_AVALIACAO_2.md). Foram coletadas em 22/11/2026, em ambiente local.

<details>
<summary><b>🗄️ Banco de dados: persistência real (PostgreSQL + Prisma)</b></summary>

- **Implementação:** PostgreSQL 16 gerenciado pelo Prisma 7 (`backend/prisma/`), com **24 modelos**, **9 enumerações**, **7 migrations** versionadas e seed com contas de demonstração.
- **Persistência comprovada:** uma compra foi criada pela API e, depois de **reiniciar o contêiner do PostgreSQL**, a mesma consulta devolveu os mesmos dados. Em produção, os dados ficam no **Neon (PostgreSQL)**.
- **Modelagem:** [diagrama de classes gerado do schema](docs/DIAGRAMA_DE_CLASSES.md).
- **Testes:** 148 testes de API usam o banco de verdade ([relatório da 2ª rodada](docs/RELATORIO_2A_RODADA_TESTES.md)).

</details>

<details>
<summary><b>✨ Recomendação: "Feitas para você"</b></summary>

- **Onde aparece:** na página inicial (`/home`), abaixo dos destaques. Código: [`recomendacaoService.ts`](src/services/recomendacaoService.ts).
- **Como funciona:** cada peça aberta no detalhe entra no histórico de visualização (até 20, guardado no navegador). Cada peça candidata recebe uma pontuação de afinidade com as peças vistas e com as favoritas: **categoria** vale 4, **técnica** 3, **polo de origem** 2 e **mesmo artesão** 1; as vistas mais recentes e os favoritos pesam mais. Peças já vistas, favoritas ou em destaque não são sugeridas, e as 4 de maior pontuação aparecem.
- **Limites:** o cálculo é feito no navegador, por regras de similaridade. Não usa IA nem aprendizado de máquina.
- **Evidência:** ao abrir o *Vaso Bojudo Terracota Esculpido* (barro), as 4 peças recomendadas passaram a ser todas de barro. Capturas em [docs/EVIDENCIAS_AVALIACAO_2.md](docs/EVIDENCIAS_AVALIACAO_2.md#2-evidência-de-recomendação).

</details>

<details>
<summary><b>⚡ Processamento assíncrono: filas, outbox e worker</b></summary>

- **Implementação:** padrão **Transactional Outbox** (o evento é gravado na mesma transação da compra), publicado numa fila (**BullMQ** localmente e **QStash** na Vercel) e consumido por um worker separado (`backend/src/worker.ts`), com processamento idempotente.
- **Fluxos assíncronos:** notificações (em `/notificacoes`, com contador), e-mails em caixa de testes, processamento de imagens e expiração de PIX e boleto vencidos, que devolve o estoque.
- **Evidência:** uma compra feita pela API gerou o evento `NOVO_PEDIDO`; o log do worker mostrou o processamento, o banco ligou o evento à notificação e o artesão passou a ver a notificação na tela. Detalhes em [docs/EVIDENCIAS_AVALIACAO_2.md](docs/EVIDENCIAS_AVALIACAO_2.md#3-evidência-de-assíncrono).
- **Executar localmente:** `cd backend && npm run dev:worker`. Sem o worker, a API funciona, mas os avisos não são gerados.

</details>

<details>
<summary><b>🚀 Cache: onde foi aplicado e por quê (Redis)</b></summary>

- **Onde foi aplicado:** no catálogo da vitrine (`GET /api/produtos`), nas categorias e nas páginas de artesãos, com **Redis** (código em `backend/src/shared/cache.ts`).
- **Por quê:** a vitrine concentra o maior volume de leituras repetidas e a consulta é cara (peças, artesãos, categorias e estoque, com filtros e paginação). Guardar a resposta reduz o tempo de resposta e alivia o PostgreSQL.
- **Como:** chave por consulta, validade de 60 s e **invalidação por versão**: aprovação na curadoria, edição de peça, mudança de estoque e alterações de conta aumentam a versão, e as chaves antigas deixam de ser lidas. A resposta traz o cabeçalho `X-Cache: HIT` ou `MISS`. Se o Redis falhar, a API responde direto do banco.
- **Medição** (50 usuários simultâneos por 15 s, em máquina de desenvolvimento): com cache, **145 req/s e mediana de 301 ms**; sem cache, **27 req/s e mediana de 2.019 ms**. Os números valem como comparação, não como capacidade de produção. Metodologia e limites em [docs/EVIDENCIAS_AVALIACAO_2.md](docs/EVIDENCIAS_AVALIACAO_2.md#4-evidência-de-cache).

</details>

<details>
<summary><b>🔒 Concorrência, teste de carga e CI</b></summary>

- **Checkout atômico:** a reserva de estoque é um `UPDATE` condicional somado à restrição `CHECK (estoque >= 0)` no PostgreSQL, o que impede a sobrevenda.
- **Teste de carga (k6):** 50 compradores simultâneos disputando 1 unidade (`cd backend && npm run test:carga`) resultaram em **1 venda, 49 recusas e estoque final 0**.
- **Qualidade contínua:** o GitHub Actions (`.github/workflows/ci.yml`) roda lint, checagem de tipos, testes de API e build a cada push em `main` e `integracao-backend` e em pull requests. Os roteiros de navegador, de carga e de segurança são executados à mão.
- **Testes:** [relatório da 2ª rodada](docs/RELATORIO_2A_RODADA_TESTES.md): os 16 casos do plano de testes passaram.

</details>

---

## Como executar localmente

### Pré-requisitos
- Node.js 22 e npm
- Docker Desktop (para subir o PostgreSQL e o Redis)

### Variáveis de ambiente
Os arquivos [`.env.example`](.env.example) (raiz) e [`backend/.env.example`](backend/.env.example) documentam as variáveis e **não contêm credenciais reais**.

<details open>
<summary><b>⚙️ Passo a passo (backend, worker, frontend e testes)</b></summary>

#### 1. Clonar o repositório
```bash
git clone https://github.com/comparoto/Ponto-da-Terra.git
cd Ponto-da-Terra
git checkout integracao-backend
```

#### 2. Subir banco, Redis e API (terminal 1)
```bash
cd backend
npm install
cp .env.example .env
npm run db:up                 # PostgreSQL (porta 5434) e Redis (porta 6380) via Docker
npx prisma migrate deploy     # cria as tabelas
npm run db:seed               # dados iniciais e contas de demonstração
npm run dev                   # API em http://localhost:3333/api · Swagger em /api/docs
```

#### 3. Subir o worker de filas (terminal 2, em `backend/`)
```bash
npm run dev:worker            # notificações e expiração de reservas de PIX e boleto
```

#### 4. Subir o frontend (terminal 3, na raiz do projeto)
```bash
npm install
cp .env.example .env.local    # ajuste NEXT_PUBLIC_API_URL se a API rodar em outra porta ou host
npm run dev                   # aplicação em http://localhost:3000
```

#### 5. Contas e cartões de teste
- **Contas do seed:** `admin@pontodaterra.com / admin123` · `comprador@pontodaterra.com / comprador123` · `artesao@pontodaterra.com / artesao123`
- **Cartões simulados:** `4111 1111 1111 1111` (aprovado) · `4000 0000 0000 0002` (recusado)

#### 6. Executar os testes
```bash
cd backend && npm test                   # 148 testes de API (Jest), com concorrência no checkout
cd backend && npm run test:carga         # carga com k6: disputa de estoque
cd backend && node tests/carga/vitrine-cache.mjs   # benchmark do cache, sem k6
cd e2e && npm install && npm test        # segurança, fluxos, responsividade e acessibilidade (exige os passos 2 a 4)
cd backend && npm run limpar:testes -- --apagar    # remove os dados criados pelos roteiros
```

Scripts e rotas do backend: [`backend/README.md`](backend/README.md).

</details>

---

## Histórico da 1ª entrega (Fake API e migração)

<details>
<summary><b>🗂️ Documentação da Fake API e da substituição pelo backend real</b></summary>

Na 1ª unidade, o frontend funcionava sem backend por meio da fachada `fakeApi` (`services/api.ts`), que lia dados fixos de `data/mockData.ts` e devolvia o contrato padronizado `ApiResult<T>`:

```ts
type ApiResult<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
};
```

**Como a migração foi feita:** a camada `src/services/` manteve o mesmo contrato `ApiResult<T>` e trocou as chamadas em memória por requisições HTTP (`http.ts`) à API Express. Por isso os componentes de tela não precisaram ser reescritos.

| Método da Fake API (1ª entrega) | Endpoint na API real | Serviço atual |
|---|---|---|
| `fakeApi.getArtesaos()` | `GET /api/artesaos` | `artesaoService` |
| `fakeApi.getPecas()` | `GET /api/produtos` | `produtoService` |

- [Documentação da Fake API (PDF)](https://github.com/user-attachments/files/32670674/Documentacao_Fake_API.pdf)
- [Plano de substituição da Fake API pelo backend real (PDF)](https://github.com/user-attachments/files/32671712/Documento_Substituicao_Fake_API_Backend_Real.pdf)

</details>

---

## Documentações e entregas por unidade

<details>
<summary><b>📘 Segunda unidade (atual)</b></summary>

> Índice de todos os documentos: [docs/README.md](docs/README.md).

- **Desenvolvimento Web:**
  - [Aplicação full stack (deploy)](https://ponto-da-terra-eight.vercel.app) · [Swagger](https://ponto-da-terra-api.vercel.app/api/docs)
  - [Documentação do backend](backend/README.md) · [Guia de deploy na Vercel](docs/DEPLOY_VERCEL.md)
- **Requisitos, Projeto de Software e Validação:**
  - [Requisitos, decisões e roadmap do backend](docs/REQUISITOS_BACKEND.md)
  - [Diagrama de classes atualizado (gerado do schema)](docs/DIAGRAMA_DE_CLASSES.md)
  - [Relatório de testes · 2ª rodada](docs/RELATORIO_2A_RODADA_TESTES.md) · [1ª rodada (histórico de defeitos)](docs/RELATORIO_TESTES.md)
  - [Evidências da Avaliação 2](docs/EVIDENCIAS_AVALIACAO_2.md)
  - [Uso de IA na 2ª unidade](docs/USO_DE_IA_2A_UNIDADE.md)
  - [Refatoração de code smells: moderação de contas](docs/REFATORACAO_MODERACAO_CONTAS.md) · [Refatoração do checkout](docs/REFATORACAO_CHECKOUT_LONG_METHOD.md) · [Análise de code smells](docs/ANALISE_CODE_SMELLS.md)
  - ADR individual: disponível na branch `adr-paulo-marrocos`
- **Fundamentos de Computação Concorrente, Paralela e Distribuída:**
  - Reserva atômica de estoque (`UPDATE` condicional e `CHECK`), fila de eventos (BullMQ ou QStash, com Transactional Outbox), worker idempotente (`backend/src/worker.ts`) e teste de carga com k6 (`npm run test:carga`).
- **Gestão e rastreamento:**
  - [Issues](https://github.com/comparoto/Ponto-da-Terra/issues) · [Backlog (Trello)](https://trello.com/b/KZIZUnYE/ponto-da-terra)

</details>

<details>
<summary><b>📗 Primeira unidade (histórico)</b></summary>

- **Desenvolvimento Web:**
  - [Deploy da 1ª entrega](https://ponto-da-terra.vercel.app/) · [Screencast da 1ª entrega](https://youtu.be/G3cyHzcV1Eo?si=K9olgvrcalE2YpW2)
  - [Documentação da Fake API (PDF)](https://github.com/user-attachments/files/32670674/Documentacao_Fake_API.pdf)
  - [Plano de migração para o backend real (PDF)](https://github.com/user-attachments/files/32671712/Documento_Substituicao_Fake_API_Backend_Real.pdf)
- **Requisitos, Projeto de Software e Validação:**
  - [Diagrama de casos de uso](https://drive.google.com/file/d/1j8Ej2N5DjwcfHfw6MvURt_CsS5oYxgQL/view?usp=sharing)
  - [Diagrama de classes (1ª unidade)](https://drive.google.com/file/d/1B3XJBb0NO-GSV3IqV8fT050-bVJqG5ad/view?usp=sharing)
  - [Plano de testes, versão 3](https://docs.google.com/document/d/1g6MABX9mCtVXfg0vxMLuS0kMjwttT4BClnToPovFeB8/edit?usp=sharing)
- **Fundamentos de Computação Concorrente, Paralela e Distribuída** (`TesteDeStress`, 20 threads com `CountDownLatch`):
  - [Script de simulação de carga (ZIP)](https://drive.google.com/file/d/1ITK4Tarze59MlXn2-qVx2QE2MADOqIVR/view?usp=sharing)
  - [Slides do teste de concorrência](https://canva.link/yesnpw11bo8hgas)
- **Uso de IA:**
  - [Log de uso de IA (Google Docs)](https://docs.google.com/document/d/1suMTaLtk8SR1g8WeNKN4IzYHL_MzHw9sh-mnHzTPREI/edit?usp=sharing) · [Documentação de uso de IA (PDF)](https://github.com/user-attachments/files/32670671/Uso_de_IA_documentacao.pdf)

</details>

---

## Integrantes e evidências de commits

A participação de cada integrante pode ser conferida no [histórico de commits](https://github.com/comparoto/Ponto-da-Terra/commits/integracao-backend) e no [painel de contribuidores](https://github.com/comparoto/Ponto-da-Terra/graphs/contributors).

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

<p align="center">Projeto acadêmico sem fins lucrativos · CESAR School | 4º Período</p>
