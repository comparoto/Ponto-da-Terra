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

> **Branch principal:** `main`, com o frontend na raiz e o backend em [`backend/`](docs/md/README_BACKEND.md). A 1ª entrega (somente frontend, com Fake API) está descrita em "Histórico da 1ª entrega" e no deploy da 1ª entrega.

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

Configuração e publicação na nuvem: [`docs/md/DEPLOY_VERCEL.md`](docs/md/DEPLOY_VERCEL.md).

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
├── data/           # Listas fixas (estados, áreas) e o conteúdo da Central de Orientação; os dados de peças e artesãos vêm da API
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
├── types/                          # Extensões de tipos do Express (dados validados na requisição)
└── docs/                           # Esquemas Zod usados para gerar o Swagger
```

### Padrões e princípios aplicados
- **Camadas desacopladas (SOLID/GRASP):** as telas não conhecem as URLs da API; toda a comunicação passa por `src/services/`, com o contrato `ApiResult<T>`.
- **Cadeia de middlewares no backend:** `autenticar` → `autorizar` → `validate` (Zod) → controlador → serviço.
- **Padrões de projeto:** *Strategy* nos meios de pagamento (PIX, cartão e boleto simulados), *Transactional Outbox* para publicar eventos com segurança e consumidores idempotentes.
- **Modelo de dados:** 24 modelos e 9 enumerações no Prisma. O [diagrama de classes](docs/md/DIAGRAMA_DE_CLASSES.md) é gerado do próprio schema (`cd backend && npm run docs:diagrama`).
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

Todas as evidências abaixo, com capturas de tela, logs e medições, estão reunidas em [**docs/md/EVIDENCIAS_AVALIACAO_2.md**](docs/md/EVIDENCIAS_AVALIACAO_2.md). Foram coletadas em 22/11/2026, em ambiente local.

<details>
<summary><b>🗄️ Banco de dados: persistência real (PostgreSQL + Prisma)</b></summary>

- **Implementação:** PostgreSQL 16 gerenciado pelo Prisma 7 (`backend/prisma/`), com **24 modelos**, **9 enumerações**, **7 migrations** versionadas e seed com contas de demonstração.
- **Persistência comprovada:** uma compra foi criada pela API e, depois de **reiniciar o contêiner do PostgreSQL**, a mesma consulta devolveu os mesmos dados. Em produção, os dados ficam no **Neon (PostgreSQL)**.
- **Modelagem:** [diagrama de classes gerado do schema](docs/md/DIAGRAMA_DE_CLASSES.md).
- **Testes:** 148 testes de API usam o banco de verdade ([relatório da 2ª rodada](docs/md/RELATORIO_2A_RODADA_TESTES.md)).

</details>

<details>
<summary><b>✨ Recomendação: "Feitas para você"</b></summary>

- **Onde aparece:** na página inicial (`/home`), abaixo dos destaques. Código: [`recomendacaoService.ts`](src/services/recomendacaoService.ts).
- **Como funciona:** cada peça aberta no detalhe entra no histórico de visualização (até 20, guardado no navegador). Cada peça candidata recebe uma pontuação de afinidade com as peças vistas e com as favoritas: **categoria** vale 4, **técnica** 3, **polo de origem** 2 e **mesmo artesão** 1; as vistas mais recentes e os favoritos pesam mais. Peças já vistas, favoritas ou em destaque não são sugeridas, e as 4 de maior pontuação aparecem.
- **Limites:** o cálculo é feito no navegador, por regras de similaridade. Não usa IA nem aprendizado de máquina.
- **Evidência:** ao abrir o *Vaso Bojudo Terracota Esculpido* (barro), as 4 peças recomendadas passaram a ser todas de barro. Capturas em [docs/md/EVIDENCIAS_AVALIACAO_2.md](docs/md/EVIDENCIAS_AVALIACAO_2.md#2-evidência-de-recomendação).

</details>

<details>
<summary><b>⚡ Processamento assíncrono: filas, outbox e worker</b></summary>

- **Implementação:** padrão **Transactional Outbox** (o evento é gravado na mesma transação da compra), publicado numa fila (**BullMQ** localmente e **QStash** na Vercel) e consumido por um worker separado (`backend/src/worker.ts`), com processamento idempotente.
- **Fluxos assíncronos:** notificações (em `/notificacoes`, com contador), e-mails em caixa de testes, processamento de imagens e expiração de PIX e boleto vencidos, que devolve o estoque.
- **Evidência:** uma compra feita pela API gerou o evento `NOVO_PEDIDO`; o log do worker mostrou o processamento, o banco ligou o evento à notificação e o artesão passou a ver a notificação na tela. Detalhes em [docs/md/EVIDENCIAS_AVALIACAO_2.md](docs/md/EVIDENCIAS_AVALIACAO_2.md#3-evidência-de-assíncrono).
- **Executar localmente:** `cd backend && npm run dev:worker`. Sem o worker, a API funciona, mas os avisos não são gerados.

</details>

<details>
<summary><b>🚀 Cache: onde foi aplicado e por quê (Redis)</b></summary>

- **Onde foi aplicado:** no catálogo da vitrine (`GET /api/produtos`), nas categorias e nas páginas de artesãos, com **Redis** (código em `backend/src/shared/cache.ts`).
- **Por quê:** a vitrine concentra o maior volume de leituras repetidas e a consulta é cara (peças, artesãos, categorias e estoque, com filtros e paginação). Guardar a resposta reduz o tempo de resposta e alivia o PostgreSQL.
- **Como:** chave por consulta, validade de 60 s e **invalidação por versão**: aprovação na curadoria, edição de peça, mudança de estoque e alterações de conta aumentam a versão, e as chaves antigas deixam de ser lidas. A resposta traz o cabeçalho `X-Cache: HIT` ou `MISS`. Se o Redis falhar, a API responde direto do banco.
- **Medição** (50 usuários simultâneos por 15 s, em máquina de desenvolvimento): com cache, **145 req/s e mediana de 301 ms**; sem cache, **27 req/s e mediana de 2.019 ms**. Os números valem como comparação, não como capacidade de produção. Metodologia e limites em [docs/md/EVIDENCIAS_AVALIACAO_2.md](docs/md/EVIDENCIAS_AVALIACAO_2.md#4-evidência-de-cache).

</details>

<details>
<summary><b>🔒 Concorrência, teste de carga e CI</b></summary>

- **Checkout atômico:** a reserva de estoque é um `UPDATE` condicional somado à restrição `CHECK (estoque >= 0)` no PostgreSQL, o que impede a sobrevenda.
- **Teste de carga (k6):** 50 compradores simultâneos disputando 1 unidade (`cd backend && npm run test:carga`) resultaram em **1 venda, 49 recusas e estoque final 0**.
- **Qualidade contínua:** o GitHub Actions (`.github/workflows/ci.yml`) roda lint, checagem de tipos, testes de API e build a cada push em `main` e `integracao-backend` e em pull requests. Os roteiros de navegador, de carga e de segurança são executados à mão.
- **Testes:** [relatório da 2ª rodada](docs/md/RELATORIO_2A_RODADA_TESTES.md): os 16 casos do plano de testes passaram.

</details>

---

## FCCPD · Unidade 2: arquitetura distribuída, paralelismo e desempenho

Entrega de **Fundamentos de Computação Concorrente, Paralela e Distribuída**. O relatório completo está em [docs/md/RELATORIO_FCCPD_U2.md](docs/md/RELATORIO_FCCPD_U2.md) ([PDF](docs/fccpd/Relatorio-FCCPD-Unidade-2.pdf)) e as evidências, em [docs/md/EVIDENCIAS_FCCPD_U2.md](docs/md/EVIDENCIAS_FCCPD_U2.md).

<details open>
<summary><b>01. Arquitetura distribuída</b></summary>

### Descrição da arquitetura
O sistema é um **monólito modular em camadas**, dividido em poucos componentes que rodam em processos e ambientes diferentes: o frontend, a API (backend), o banco de dados, o cache, a fila de eventos e o worker. Não são microsserviços: o estoque e a compra exigem uma **transação única** no mesmo banco, e dividir o domínio em serviços traria rede, deploy múltiplo e consistência distribuída sem benefício para o escopo.

### Tecnologias utilizadas
| Componente | Tecnologia (local → produção) |
|---|---|
| Frontend | Next.js 16, React 19 e Chakra UI (Vercel) |
| Backend | Node.js 22, Express 5 e TypeScript (função serverless na Vercel) |
| Banco de dados | PostgreSQL 16 com Prisma 7 e pool de conexões (Docker → Neon) |
| Cache | Redis 7 (Docker → Upstash) |
| Fila de eventos | BullMQ (local) → Upstash QStash (Vercel), com *Transactional Outbox* |
| Processamento assíncrono | Worker separado (local) → rota `/api/jobs/evento` da própria API (Vercel) |
| Arquivos e e-mail | Disco → Vercel Blob; SMTP de testes (Mailtrap) |

### Diagrama da arquitetura distribuída
![Arquitetura distribuída do Ponto da Terra](docs/fccpd/arquitetura.png)

Código-fonte do diagrama (Mermaid): [`docs/fccpd/arquitetura.mmd`](docs/fccpd/arquitetura.mmd). Linhas cheias: fluxo síncrono. Linhas tracejadas: fluxo assíncrono (eventos).

### Responsabilidade de cada módulo e serviço
| Componente | Responsabilidade |
|---|---|
| **Frontend** | Telas, estado do cliente e acesso à API pela camada `src/services`, com o contrato `ApiResult<T>`. |
| **Backend** | Regras de negócio, autenticação e autorização (JWT) e validação (Zod), em módulos no padrão rota → serviço: `auth`, `artesaos`, `produtos`, `carrinho`, `compras`, `pedidos`, `comprador`, `interacao`, `notificacoes`, `admin`, `jobs` e `relatorios`. |
| **PostgreSQL** | Persistência e consistência transacional (reserva atômica de estoque, compra dividida em pedidos). |
| **Redis** | Cache da vitrine (resposta `HIT` ou `MISS`), ranking dos termos mais buscados e as filas locais. |
| **Fila e worker** | Notificações, e-mail simulado, otimização de imagens (Sharp) e expiração de reservas de PIX e boleto. |
| **Módulo de relatórios** | Agregações do administrador e do artesão, executadas em paralelo (seção 02). |

### Justificativa da separação dos serviços
- **Frontend separado do backend:** a interface muda por motivos diferentes das regras de negócio, e as regras precisam ficar no servidor porque o cliente não é confiável (preço, perfil e estoque são conferidos lá).
- **PostgreSQL para persistência:** o modelo é relacional e o estoque exige transação.
- **Redis para cache:** leituras repetidas da vitrine não devem sobrecarregar o banco.
- **Fila e worker separados:** trabalhos lentos ou que podem falhar não devem atrasar a resposta ao comprador, e o worker pode falhar e escalar de forma independente.

### Como os serviços se comunicam
| De → Para | Protocolo |
|---|---|
| Navegador → Frontend | HTTPS |
| Frontend → Backend | HTTP/REST com JSON e JWT no cabeçalho |
| Backend → PostgreSQL | SQL pelo Prisma e pelo driver `pg`, com pool de conexões |
| Backend → Redis | Protocolo Redis (`ioredis`): cache e ranking |
| Backend → fila | Evento gravado na tabela *outbox*, na mesma transação da operação |
| Relay → fila → worker | BullMQ (local) ou QStash por HTTP (Vercel), consumo idempotente |

As evidências de execução dessa comunicação estão em [`docs/fccpd/evidencias/`](docs/fccpd/evidencias).

</details>

<details open>
<summary><b>02. Implementação do paralelismo</b></summary>

### Funcionalidade escolhida
Os **relatórios do produto**: o dashboard do administrador (HU9), com 8 consultas independentes (7 no PostgreSQL e 1 no Redis), e os indicadores do artesão (HU18), com 5 consultas no PostgreSQL. As consultas não dependem umas das outras, então podem rodar ao mesmo tempo. Uma única consulta depende de outra (os nomes dos artesãos do ranking) e por isso ficou **fora** do grupo paralelo.

### Como funcionava a execução sequencial
Cada consulta só começa depois que a anterior termina, e o tempo total é a **soma** do tempo de todas. Esse modo foi criado como linha de base da comparação: ele executa exatamente as mesmas consultas, uma por vez. (A versão original do código já disparava as consultas juntas com `Promise.all`, mas não havia modo sequencial para comparar nem medição de que elas realmente se sobrepunham.)

### Como funciona a execução paralela
Todas as consultas do grupo são **disparadas ao mesmo tempo**. Cada uma usa uma conexão diferente do pool, e o PostgreSQL atende cada conexão em um processo próprio. O tempo total tende ao da consulta **mais lenta**, e não à soma.

### Estratégia de paralelismo
É **concorrência assíncrona de E/S** (várias consultas em andamento ao mesmo tempo, com `Promise.all`) sobre um **pool de conexões**, e não threads. O Node.js executa o JavaScript em uma única thread; o paralelismo real acontece **fora** do Node, nos processos do PostgreSQL. Usar `Promise.all` não é prova de paralelismo, então a sobreposição foi **medida**: no cliente (início e fim de cada consulta) e no servidor (processos ativos em `pg_stat_activity`).

### Arquivos de código responsáveis
| Arquivo | O que contém |
|---|---|
| [`backend/src/shared/execucao.ts`](backend/src/shared/execucao.ts) | `executarGrupo`: executa um grupo de tarefas nos modos `sequencial` e `concorrente`, e mede a sobreposição |
| [`backend/src/modules/relatorios/relatorios.service.ts`](backend/src/modules/relatorios/relatorios.service.ts) | `dashboardAdmin` e `indicadoresArtesao`, com as consultas passadas ao `executarGrupo` |
| [`backend/src/config/prisma.ts`](backend/src/config/prisma.ts) | Pool de conexões (10 no local, 3 na Vercel) |
| [`backend/tests/relatorios-modos.test.ts`](backend/tests/relatorios-modos.test.ts) | 9 testes: os dois modos dão o mesmo resultado, o sequencial nunca sobrepõe e o concorrente dispara todas juntas |

O modo padrão da API continua sendo o concorrente, e o contrato HTTP não mudou.

### Benefícios e limitações
**Benefícios** (mediana de 15 repetições, um cliente por vez): o tempo dos relatórios caiu entre **28,6% e 55,8%** (*speedup* de 1,40× a 2,26×), com resultados **idênticos** aos do modo sequencial. No caso mais pesado (dashboard de 12 meses com 300 mil pedidos), caiu de **1.334 ms para 923 ms** (1,45×).

| Pedidos | Dashboard, 12 meses: sequencial → concorrente | *Speedup* |
|---:|---|---:|
| 20.000 | 140,9 ms → 79,4 ms | 1,77× |
| 100.000 | 486,1 ms → 281,9 ms | 1,72× |
| 300.000 | 1.334,2 ms → 923,3 ms | 1,45× |

**Limitações:**
- O ganho depende do pool de conexões: com **1 conexão** foi 1,04×; com 4, 1,48×.
- É **limitado pela consulta mais lenta** (lei de Amdahl) e **diminui com o volume**, porque uma consulta passa a dominar e as demais disputam CPU, memória e disco. O próprio PostgreSQL já paraleliza essa consulta por dentro, o que também compete pelos mesmos núcleos.
- Reduz a **latência de um pedido isolado**, mas **não aumenta a capacidade total** do banco. Sob carga com vários clientes o resultado foi inconclusivo (uma execução de 30 s por célula).
- Tudo foi medido em uma só máquina, com dados sintéticos; os números valem como comparação entre os modos, não como capacidade de produção. As limitações completas estão no [relatório](docs/md/RELATORIO_FCCPD_U2.md#15-limitações).

</details>

<details open>
<summary><b>03. Metodologia do benchmark</b></summary>

### O que foi medido
O **tempo de resposta** de cada relatório nos modos sequencial e concorrente: média, mediana, p95, desvio-padrão, mínimo e máximo. Também a **vazão** (relatórios por segundo), o ***speedup*** (sequencial ÷ concorrente), a **redução percentual** do tempo, a **sobreposição** das consultas (no cliente e no servidor) e a **equivalência** dos resultados (conferida em toda repetição). As tabelas usam a mediana.

### Ferramentas utilizadas
Node.js e TypeScript (`tsx`), Prisma e `pg`, Docker, PostgreSQL 16 e Redis 7. O script é [`backend/scripts/benchmark-paralelismo.ts`](backend/scripts/benchmark-paralelismo.ts). Os gráficos e o PDF vêm de roteiros em `e2e/` (Playwright). Não há atrasos artificiais no código.

### Especificações da máquina utilizada
| Item | Valor |
|---|---|
| Processador | Intel Core i7-1355U (12 threads) |
| Memória | 15,7 GB de RAM (8 GB disponíveis para o Docker, com 12 CPUs) |
| Sistema | Windows 11, Docker 29.8.2 |
| Banco | PostgreSQL 16.15 em contêiner (`shared_buffers` 128 MB, `work_mem` 4 MB, `max_parallel_workers_per_gather` 2) |
| Aplicação | Node.js v24.22.0, Prisma 7.10.1, pool de 10 conexões |

### Volume de dados processados
Dados sintéticos e **determinísticos** (os mesmos em toda execução), em um banco isolado:

| Volume | Pedidos | Itens de pedido |
|---|---:|---:|
| Pequeno | 20.000 | 60.000 |
| Médio | 100.000 | 300.000 |
| Grande | 300.000 | 900.000 |

Todos com 200 artesãos, 4.000 produtos e 5.000 compradores, e pedidos distribuídos em 12 meses.

### Número de repetições
**15 repetições** por célula, mais **3 de aquecimento** descartadas. Foram 12 comparações (3 volumes × 2 períodos × 2 relatórios), mais a variação do pool (1, 2, 4 e 10 conexões) e a carga com 1, 4 e 10 clientes simultâneos (30 s cada).

### Condições de execução
- Banco **isolado** (`pontodaterra_bench`, no Docker local). O script **recusa** rodar em qualquer banco cujo nome não termine em `_bench`, para não tocar em desenvolvimento nem em produção.
- A **ordem dos modos é alternada** a cada repetição, para nenhum modo se favorecer do cache do banco.
- Cliente, API, PostgreSQL e Redis na mesma máquina; resultados salvos em [`docs/fccpd/resultados/`](docs/fccpd/resultados) (JSON e CSV).

### Comandos para reproduzir os testes
```bash
cd backend && npm install && npm run db:up                       # PostgreSQL e Redis (Docker)
docker exec ponto-da-terra-postgres psql -U pdt -d pontodaterra -c "CREATE DATABASE pontodaterra_bench"
DATABASE_URL="postgresql://pdt:pdt@localhost:5434/pontodaterra_bench?schema=public" \
DATABASE_URL_UNPOOLED="postgresql://pdt:pdt@localhost:5434/pontodaterra_bench?schema=public" \
npx prisma migrate deploy                                        # cria as tabelas no banco do benchmark

npm run benchmark:paralelismo                                    # benchmark completo (cerca de 10 minutos)
npm run benchmark:paralelismo -- --rapido                        # teste rápido (2 minutos)
npm run benchmark:paralelismo -- --fase=carga --escalas=300000 --duracao-carga=30 --clientes=1,4,10
npm run demo:paralelismo                                         # linha do tempo das consultas, para demonstrar
npx jest --runInBand tests/relatorios-modos.test.ts              # testes de equivalência
```

</details>

## AED · Unidades 1 e 2: estruturas de dados e complexidade

Entrega de **Algoritmos e Estruturas de Dados**. Relatório completo: [docs/md/RELATORIO_AED.md](docs/md/RELATORIO_AED.md). É um **módulo independente** (`backend/src/aed/`): nenhuma rota o importa, então o produto não muda; o estoque real continua no PostgreSQL com transação atômica.

<details open>
<summary><b>01. Modelagem do domínio e estruturas</b></summary>

### Estruturas implementadas à mão
| Conceito do domínio | Estrutura | Arquivo |
|---|---|---|
| Estoque: lotes que saem por validade (FEFO) | **Lista encadeada** com **inserção ordenada** (estável, com atalho O(1) na cauda) | [`lista-encadeada.ts`](backend/src/aed/estruturas/lista-encadeada.ts) |
| Pedidos de saída de estoque | **Fila circular** (FIFO) e **fila de prioridade** (prioridade, depois ordem de chegada) | [`fila.ts`](backend/src/aed/estruturas/fila.ts) |
| Histórico de movimentos, com **desfazer** | **Pilha** | [`pilha.ts`](backend/src/aed/estruturas/pilha.ts) |
| Achar o produto pelo código | **Índice hash** (encadeamento, FNV-1a, redimensionamento com fator de carga 0,75) | [`indice-hash.ts`](backend/src/aed/estruturas/indice-hash.ts) |
| Índice ordenado | **Árvore binária de busca** iterativa (inserir, buscar, remover nos 3 casos, percurso em ordem) | [`arvore-binaria-busca.ts`](backend/src/aed/estruturas/arvore-binaria-busca.ts) |
| Busca em coleção ordenada | **Busca binária** e limite inferior | [`busca.ts`](backend/src/aed/estruturas/busca.ts) |
| Domínio integrado | `EstoqueFefo` (hash → lista de lotes + pilha de histórico) e `ProcessadorDePedidos` | [`estoque.ts`](backend/src/aed/estoque.ts), [`pedidos.ts`](backend/src/aed/pedidos.ts) |

![Composição das estruturas](docs/aed/estruturas.png)

Código-fonte do diagrama: [`docs/aed/estruturas.mmd`](docs/aed/estruturas.mmd).

### Regras implementadas e testadas
- A saída consome o lote que **vence primeiro**; lote sem validade vai para o fim.
- Se o estoque não basta, a saída é **recusada e não altera nada**.
- `desfazer()` restaura **exatamente** o estado anterior (lotes esgotados e lote parcial).
- Pedidos: o mais urgente sai primeiro; com estoque escasso, o de maior prioridade leva o estoque.

### Como usar
```ts
import { EstoqueFefo, ProcessadorDePedidos } from './aed';
const estoque = new EstoqueFefo();
estoque.entrada({ id: 'L1', codigoProduto: 'PT-001', quantidade: 10, validade: new Date('2027-03-01') });
estoque.saida('PT-001', 8);   // consome primeiro o lote que vence antes
estoque.desfazer();           // volta ao estado anterior
```

</details>

<details open>
<summary><b>02. Complexidade e benchmark com dados sintéticos</b></summary>

### O que foi medido
Tempo por operação em volumes de **1 mil a 1 milhão** de itens (500 a 16 mil nas operações O(n²)), com dados determinísticos (gerador com semente fixa), 2 repetições de aquecimento e **9 repetições** (mediana). A **inclinação** da reta no gráfico log-log compara o crescimento medido com a complexidade teórica (≈0 = O(1), ≈0,1 = O(log n), ≈1 = O(n), ≈2 = O(n²)).

### Resultados principais (µs por operação, mediana)
| Operação | Teórica | Inclinação medida | 1 mil | 10 mil | 100 mil |
|---|---|---:|---:|---:|---:|
| Busca linear por código | O(n) | 0,90 | 3,35 | 20,5 | **210** |
| Busca binária | O(log n) | 0,18 | 0,29 | 0,35 | 0,55 |
| **Índice hash** | O(1) | 0,18 | 0,20 | 0,17 | **0,32** |
| BST (chaves aleatórias) | O(log n) | 0,15 | 0,13 | 0,20 | 0,26 |
| BST degenerada (chaves em ordem) | O(n) | **1,07** | 1,09 | | (16 mil: **19,1**) |
| Lista: inserção ordenada aleatória | O(n) | 1,32 | 0,65 | | (16 mil: **31,6**) |

![Busca por código](docs/aed/resultados/grafico-1-busca-por-codigo.png)

Com 100 mil produtos, o índice hash acha um código **~650 vezes mais rápido** que a varredura. As operações O(1) e O(log n) saem com inclinação de 0,15 a 0,37, e não 0 e 0,1: é o efeito dos caches da CPU, discutido no relatório junto com uma anomalia do `Array.shift()`. Dados: [`docs/aed/resultados/`](docs/aed/resultados).

### Comandos
```bash
cd backend
npx jest tests/aed-                  # 32 testes: operações básicas, aleatórios contra Map/array ordenado, FEFO, desfazer
npm run benchmark:aed                # benchmark completo (~3 min); -- --rapido para fumaça
```

</details>

---

## SO · Unidades 1 e 2: threads, contêineres, redes e monitoramento

Entrega de **Sistemas Operacionais**. Relatórios: [Unidade 1](docs/md/RELATORIO_SO_U1.md) (threads, contêineres, CI/CD, cenários e orçamento) e [Unidade 2](docs/md/RELATORIO_SO_U2.md) (topologia, requisitos de rede, protocolos, benchmark e painel). **Dentro do produto entra apenas o painel de monitoramento do administrador**; o resto é módulo independente, infraestrutura e documentação.

<details open>
<summary><b>01. Threads, sincronização e condição de corrida (Unidade 1)</b></summary>

O worker do projeto (BullMQ) é outro **processo**, não uma thread. O módulo [`backend/src/so/`](backend/src/so) usa `worker_threads` com memória compartilhada (`SharedArrayBuffer`): várias threads reservam as últimas unidades de estoque, em duas versões, **sem** e **com** sincronização (`Atomics.compareExchange`, *compare-and-swap*).

| Versão (8 threads, 20 execuções, 6.000 pedidos) | Execuções com estoque inconsistente | Baixas perdidas (mediana) |
|---|---:|---:|
| Sem sincronização | **20 de 20** | 4.743 |
| Com compare-and-swap | **0 de 20** | 0 |

| Threads | 1 | 2 | 4 | 8 |
|---|---:|---:|---:|---:|
| Tempo (mediana) | 6.568 ms | 4.131 ms | 3.236 ms | 2.701 ms |
| *Speedup* | 1,00× | 1,59× | 2,03× | 2,43× |

O ganho **não é linear** (o tempo inclui criar as threads e carregar o `tsx`; o notebook tem núcleos desiguais); as causas estão no relatório, sem afirmar o que não foi medido. As threads são uma demonstração: a reserva real continua na transação do PostgreSQL ([ADR-002](docs/adr/adr-002-centralizar-a-reserva-de-estoque-no-servidor-com-transacao-atomica.md)). Testes: `npx jest tests/so-threads` (6). Benchmark: `npm run benchmark:threads`.

![Condição de corrida](docs/so/resultados/grafico-5-condicao-de-corrida.png)

</details>

<details open>
<summary><b>02. Containerização e CI/CD (Unidade 1)</b></summary>

| Arquivo | Função |
|---|---|
| [`backend/Dockerfile`](backend/Dockerfile) | Imagem da **API e do worker** (multi-stage, Node 22 Alpine, usuário sem privilégios, `HEALTHCHECK`, migrations ao iniciar) |
| [`backend/docker-compose.completo.yml`](backend/docker-compose.completo.yml) | Pilha completa: PostgreSQL, Redis, API, worker e site |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | CI: lint, tipos, testes, build e **job que constrói as imagens e sobe a pilha conferindo `/api/health`** |
| [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | CD para a Vercel após o CI na `main`; **só executa se os 4 segredos existirem** (sem eles, pula com aviso) |

```bash
cd backend && docker compose -f docker-compose.completo.yml up --build -d
curl http://localhost:3333/api/health        # {"api":"ok","banco":"ok","redis":"ok"}
docker compose -f docker-compose.completo.yml exec -e NODE_ENV=development api npx prisma db seed   # dados de demonstração
docker compose -f docker-compose.completo.yml down -v
```

**Verificado em 25/11/2026:** imagem da API construída (967 MB), pilha *healthy*, 7 migrations aplicadas, worker em execução; imagem do site construída. **Ressalvas honestas:** o deploy de produção segue manual por linha de comando até o dono da conta Vercel cadastrar os segredos, e os workflows ainda não rodaram no GitHub (sintaxe validada localmente).

</details>

<details open>
<summary><b>03. Cenários de carga e orçamento (Unidade 1)</b></summary>

Cenários **hipotéticos** (o projeto não tem dados de uso). Preços oficiais consultados em 25/11/2026; câmbio PTAX de venda R$ 5,8825.

| | Baixo | Moderado | Alto |
|---|---|---|---|
| Compradores ativos/mês · pedidos/mês | 200 · 300 | 5.000 · 5.000 | 100.000 · 100.000 |
| Pico | 2 req/s | 25 req/s | 300 req/s |
| Arquitetura | Vercel + Neon + Upstash (gratuitos) | Vercel Pro (`gru1`) + Neon Launch (São Paulo) | API em contêiner (ECS Fargate) + RDS Multi-AZ (São Paulo) + site na Vercel |
| Custo mensal estimado | US$ 0 (acadêmico) · **US$ 20** (comercial, ≈ R$ 117,65) | **≈ US$ 45,2** (≈ R$ 265,65) | **≈ US$ 372,9** (≈ R$ 2.193,30), **conta incompleta** |

O plano Hobby da Vercel **não permite uso comercial**; no cenário alto, faltam itens não confirmados (armazenamento do RDS, balanceador, transferência, logs). A memória de cálculo e as fontes estão no [relatório](docs/md/RELATORIO_SO_U1.md#4-cenários-de-carga-e-orçamento).

</details>

<details open>
<summary><b>04. Topologia, requisitos de rede e protocolos (Unidade 2)</b></summary>

![Topologia por fluxo de negócio](docs/so/topologia.png)

A topologia segue o fluxo coleta → curadoria → vitrine → pedido → pagamento → entrega ([`topologia.mmd`](docs/so/topologia.mmd)). Além dela, a **topologia de rede** mostra os pontos de acesso, a internet, a borda em São Paulo, a região da função e os serviços de dados, com o tipo de enlace, o que foi medido em cada trecho e os fluxos de **telemetria** (ajuste de estoque do ateliê, eventos de pedido e métricas do painel):

![Topologia de rede](docs/so/topologia-rede.png)

Fonte: [`topologia-rede.mmd`](docs/so/topologia-rede.mmd). `npm run benchmark:enlaces` decompõe uma requisição em produção: **TCP até São Paulo ≈ 19 ms**, TLS ≈ 117 ms (não explicado) e **espera pelo servidor ≈ 207 a 212 ms**. Requisitos de rede **derivados** das regras de negócio:

| Requisito | Origem | Medido em produção |
|---|---|---|
| Frete: p95 ≤ 300 ms | RN16 | **205 ms** |
| Webhook de pagamento < 2 s, idempotente | RN19 / TC16 | não medido (gateway simulado) |
| Vitrine ≤ 100 KB por página e p95 ≤ 800 ms | meta proposta pela equipe | 90,6 KB · 500 ms |
| Jitter da vitrine ≤ 100 ms | meta proposta pela equipe | **123 ms (não atende)** |
| TLS e HSTS em todo o tráfego | segurança | TLS 1.3 + HTTP/2 (ALPN `h2`) |
| Ajuste de estoque do ateliê reenviável sem efeito colateral | rota `PATCH /produtos/:id/estoque` define a quantidade absoluta | por desenho (reenvio automático no cliente é proposta) |
| Estoque na vitrine com defasagem ≤ 60 s e exatidão no checkout | TTL do cache (ADR-001) e reserva atômica (ADR-002) | por desenho |
| Telemetria de estoque e eventos: banda desprezível | 600 mil eventos/mês = 0,23 evento/s | conta a partir de premissas |

Protocolos justificados no [relatório](docs/md/RELATORIO_SO_U2.md#4-protocolos-e-apis): HTTPS + REST/JSON e JWT, PostgreSQL sobre TCP+TLS, RESP (Redis), webhook assinado (QStash e gateway, HMAC), SMTP/TLS, OpenAPI 3.

</details>

<details open>
<summary><b>05. Benchmarking de rede (Unidade 2)</b></summary>

`npm run benchmark:rede` mede latência (p50/p95/p99), vazão, perda e jitter com GETs de leitura, em três ambientes a partir do mesmo notebook (25/11/2026).

| Endpoint | Local (p95) | Contêiner (p95) | **Produção (p95)** | Jitter em produção |
|---|---:|---:|---:|---:|
| `/health` | 9,2 ms | 10,9 ms | **354,9 ms** | 34,5 ms |
| Vitrine | 15,4 ms | 12,8 ms | **499,9 ms** | **123,2 ms** |
| `/frete` | 2,9 ms | 6,3 ms | **205,1 ms** | 5,3 ms |

Perda de **0%** em todas as baterias (amostras pequenas: o resultado é "sem perda observável"). Vazão da vitrine: 568 req/s (Node direto), 193 req/s (contêiner) e 23,9 req/s em produção com apenas 10 conexões (limitado de propósito).

**Interpretação:** o `/frete` leva 1,2 ms de processamento e 197 ms em produção. O acesso do usuário não é o problema (TCP de ~19 ms até São Paulo); a espera de ~207 ms é igual com e sem banco. O cabeçalho `X-Vercel-Id: gru1::iad1::…` indica que a função executa nos EUA, o que é **compatível**, mas não isolado: o painel em produção mediu o banco a **2,7 ms** e o Redis a **1,2 ms** da função (colados a ela). A hipótese está **bem sustentada, mas não isolada**, e o plano de migração a testa; ele exige mover função e banco juntos. O ponto fraco é a vitrine (jitter e p99 de 925 ms).

![Latência p95](docs/so/resultados/grafico-6-latencia-p95.png)

</details>

<details open>
<summary><b>06. Painel de monitoramento (único item dentro do produto)</b></summary>

Somente o **administrador**: link *Monitoramento* no painel administrativo → `/admin/monitoramento`, dados de `GET /api/admin/monitoramento` (Swagger em `/api/docs`).

- **Medido de verdade:** vazão, latência p50/p95/p99, jitter, falhas e conexões interrompidas (middleware que mede cada requisição em um buffer circular), RTT/jitter/perda de sondas ao PostgreSQL e ao Redis, atraso do laço de eventos ("n/d" em serverless, onde não é confiável), memória, fila de eventos pendentes e, no navegador, RTT/jitter/perda até a API.
- **Acesso:** sem token → 401; comprador e artesão → 403; a tela redireciona quem não é administrador. Verificado por script de navegador (8/8, **em desenvolvimento e em produção**) e 15 testes automatizados.
- **Limite:** as amostras ficam na memória da instância; em serverless cada instância tem as suas. As sondas ao banco e ao Redis valem em qualquer ambiente.

![Painel de monitoramento em produção](docs/so/evidencias/monitoramento-painel-producao.png)

*Captura da **produção** (26/11/2026). Medido de dentro da função na Vercel: **banco a 2,7 ms e Redis a 1,2 ms** (15 leituras, perda 0%), e a consulta ao painel leva ~230 ms. Um defeito encontrado nessa captura (o cartão "Laço de eventos" mostrava 23.270 ms porque a função é congelada entre requisições) foi **corrigido**: em serverless o cartão agora mostra "n/d", como na imagem. As capturas de desenvolvimento local continuam em [`docs/so/evidencias/`](docs/so/evidencias).*

</details>

<details open>
<summary><b>07. Plano de implantação e migração (Unidade 2)</b></summary>

| Fase | Gatilho | O que muda | Validação | Reversão |
|---|---|---|---|---|
| 1 · Lançamento comercial | Primeira venda real | Vercel Pro, deploy automático (segredos), monitor externo de `/api/health` | Pipeline verde e saúde pós-deploy | Deploy manual por CLI; *rollback* da Vercel |
| 2 · Aproximar do usuário | p95 do frete > ~250 ms ou p95 da vitrine > 800 ms | Neon em `aws-sa-east-1` (`pg_dump`/`pg_restore` em janela curta) e função fixa em `gru1` | `benchmark:rede` antes e depois; **expectativa** de frete ≤ 100 ms (a confirmar) | Restaurar as variáveis do banco antigo (mantido por 7 dias) |
| 3 · Escala e alta disponibilidade | > ~100 req/s sustentados ou banco > 70% | API em contêiner (Fargate) com canário de 10%, depois RDS Multi-AZ | k6 a 300 req/s, p95 do frete ≤ 300 ms, 0% de falhas | DNS volta para a Vercel; banco de origem só leitura |

Antes de cada corte, o painel deve mostrar **0 eventos pendentes** na fila (nenhum evento da Outbox perdido). Riscos e detalhes no [relatório](docs/md/RELATORIO_SO_U2.md#9-plano-de-implantação-e-migração).

</details>

### Reprodução de tudo (AED e SO)
```bash
cd backend
npx jest tests/aed- tests/so-threads tests/monitoramento        # 52 testes novos
npm run benchmark:aed && npm run benchmark:threads                # complexidade e threads
npm run benchmark:rede -- --alvo=http://localhost:3333/api        # rede (acrescente --producao para a Vercel)
cd ../e2e && node gerar-graficos-aed-so.cjs                       # gráficos
```

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

Scripts e rotas do backend: [`docs/md/README_BACKEND.md`](docs/md/README_BACKEND.md).

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

> Índice de todos os documentos: [docs/md/INDICE.md](docs/md/INDICE.md).

- **Desenvolvimento Web:**
  - [Aplicação full stack (deploy)](https://ponto-da-terra-eight.vercel.app) · [Swagger](https://ponto-da-terra-api.vercel.app/api/docs)
  - [Documentação do backend](docs/md/README_BACKEND.md) · [Guia de deploy na Vercel](docs/md/DEPLOY_VERCEL.md)
- **Requisitos, Projeto de Software e Validação:**
  - [Requisitos, decisões e roadmap do backend](docs/md/REQUISITOS_BACKEND.md)
  - [Diagrama de classes atualizado (gerado do schema)](docs/md/DIAGRAMA_DE_CLASSES.md) · [Diagrama de casos de uso atualizado](docs/md/DIAGRAMA_DE_CASOS_DE_USO.md)
  - [Relatório de testes · 2ª rodada](docs/md/RELATORIO_2A_RODADA_TESTES.md) · [1ª rodada (histórico de defeitos)](docs/md/RELATORIO_TESTES.md)
  - [Evidências da Avaliação 2](docs/md/EVIDENCIAS_AVALIACAO_2.md)
  - [Uso de IA na 2ª unidade](docs/md/USO_DE_IA_2A_UNIDADE.md)
  - [Refatoração de code smells: moderação de contas](docs/code_smells/REFATORACAO_MODERACAO_CONTAS.md) · [Refatoração do checkout](docs/md/REFATORACAO_CHECKOUT_LONG_METHOD.md) · [Análise de code smells](docs/md/ANALISE_CODE_SMELLS.md)
  - ADR individual: disponível na branch `adr-paulo-marrocos`
- **Fundamentos de Computação Concorrente, Paralela e Distribuída:**
  - **Unidade 2:** [Relatório de arquitetura distribuída, paralelismo e desempenho](docs/md/RELATORIO_FCCPD_U2.md) ([PDF](docs/fccpd/Relatorio-FCCPD-Unidade-2.pdf)) · [Evidências](docs/md/EVIDENCIAS_FCCPD_U2.md) · [Diagrama da arquitetura](docs/fccpd/arquitetura.mmd) · benchmark: `cd backend && npm run benchmark:paralelismo`
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
  - [Plano de testes, versão 4](https://docs.google.com/document/d/1g6MABX9mCtVXfg0vxMLuS0kMjwttT4BClnToPovFeB8/edit?usp=sharing)
- **Fundamentos de Computação Concorrente, Paralela e Distribuída** (`TesteDeStress`, 20 threads com `CountDownLatch`):
  - [Script de simulação de carga (ZIP)](https://drive.google.com/file/d/1ITK4Tarze59MlXn2-qVx2QE2MADOqIVR/view?usp=sharing)
  - [Slides do teste de concorrência](https://canva.link/yesnpw11bo8hgas)
- **Uso de IA:**
  - [Log de uso de IA (Google Docs)](https://docs.google.com/document/d/1suMTaLtk8SR1g8WeNKN4IzYHL_MzHw9sh-mnHzTPREI/edit?usp=sharing) · [Documentação de uso de IA (PDF)](https://github.com/user-attachments/files/32670671/Uso_de_IA_documentacao.pdf)

</details>

---

## Integrantes e evidências de commits

A participação de cada integrante pode ser conferida no [histórico de commits](https://github.com/comparoto/Ponto-da-Terra/commits/main) e no [painel de contribuidores](https://github.com/comparoto/Ponto-da-Terra/graphs/contributors).

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
