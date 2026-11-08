<div align="center">

<img src="logo-pdt-png.png" alt="Logo Origem: Ponto da Terra" width="180">

# Origem: Ponto da Terra

**Uma vitrine digital para o artesanato pernambucano.**

[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=flat-square)](#)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Chakra UI](https://img.shields.io/badge/Chakra_UI-319795?style=flat&logo=chakraui&logoColor=white)](https://chakra-ui.com/)

[🚀 Deploy](https://ponto-da-terra.vercel.app/) ·
[🎞️ Screencast](https://youtu.be/G3cyHzcV1Eo?si=K9olgvrcalE2YpW2) ·
[📋 Requisitos](https://app.notion.com/p/Projeto-Integrador-3c996fcfd27080df9bf3ef635f5bdf99?source=copy_link) ·
[🗂️ Backlog](https://trello.com/b/KZIZUnYE/ponto-da-terra) ·
[🐛 Issues](https://github.com/comparoto/Ponto-da-Terra/issues)

</div>

## Índice

1. [Sobre o projeto](#sobre-o-projeto)
2. [Como executar localmente](#como-executar-localmente)
3. [Tecnologias](#tecnologias)
4. [Funcionalidades](#funcionalidades)
5. [Arquitetura](#arquitetura)
6. [Fake API](#fake-api)
7. [Teste de concorrência](#teste-de-concorrência)
8. [Documentação e entregas](#documentação-e-entregas)
9. [Integrantes](#integrantes)

---

## Sobre o projeto

O **Origem: Ponto da Terra** é uma aplicação web full stack voltada para o **artesanato pernambucano**. Ela nasceu para resolver um problema real do setor: artesãos e produtores criativos têm pouca visibilidade digital, dependem de intermediários e enfrentam gestão precária de catálogo, pedidos e estoque.

A plataforma conecta esses artesãos diretamente a compradores de todo o país, por meio de:

- **Vitrine do comprador:** busca, filtros, perfil do artesão, carrinho e avaliações;
- **Painel do artesão:** gestão de catálogo, estoque e pedidos;
- **Painel administrativo:** indicadores de venda e gestão geral da plataforma.

> 📌 **Status atual:** esta versão tem apenas **frontend responsivo** e uma **Fake API** (dados mockados no código, em `data/` e `services/`), que simula um backend real até a integração com a API definitiva.

### Disciplinas envolvidas

O projeto integra três frentes acadêmicas:

| Disciplina | Responsabilidade |
|---|---|
| **Desenvolvimento Web** | Frontend responsivo (vitrine, busca, carrinho, perfis) e, futuramente, backend (API e regras de negócio) |
| **Requisitos, Projeto de Software e Validação** | Análise de domínio, gestão de requisitos, arquitetura (SOLID/GRASP, padrões de projeto) e estratégia de testes |
| **Fundamentos de Computação Concorrente, Paralela e Distribuída** | Desempenho, escalabilidade e tolerância a falhas: concorrência no checkout/baixa de estoque, filas e processamento assíncrono |

---

## Como executar localmente

Não há backend nesta versão: basta rodar o frontend, pois a Fake API já está embutida no código.

**Pré-requisitos:** Node.js e npm (ou yarn).

```bash
# 1. Clonar o repositório
git clone https://github.com/comparoto/Ponto-da-Terra.git
cd Ponto-da-Terra

# 2. Instalar dependências
npm install

# 3. Executar a aplicação
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000`. Não é necessário subir nenhum serviço adicional.

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| **Frontend** | Next.js + TypeScript |
| **Estilização** | Chakra UI |
| **Fake API** | Dados mockados em código (`data/`), consumidos via camada de serviços (`services/`) |
| **Autenticação** | Simulada (`services/demoAuth.ts`), sem backend/token real |
| **Testes de concorrência** | Java (`CountDownLatch`, 20 threads paralelas), módulo `TesteDeStress` independente da aplicação |
| **Controle de versão** | Git / GitHub |
| **Backend real** | ⏳ Ainda não implementado |
| **Banco de dados** | ⏳ Ainda não implementado, pois ninguém da equipe está na disciplina de Banco de Dados |

---

## Funcionalidades

### Já implementadas (sobre a Fake API)

| Área | Funcionalidade | Onde está |
|---|---|---|
| **Comprador** | Home / vitrine com navegação e exibição de peças | `app/home`, `app/(comprador)` |
| | Detalhe de produto em modal | `ProductModal.tsx` |
| | Carrinho de compras | `CartDrawer.tsx` + `store/cartStore` |
| | Fluxo de compra completo (vitrine → produto → carrinho → checkout) | `services/` |
| | Área de pedidos do comprador | `OrderManager.tsx` |
| **Artesão** | Gestão de catálogo e estoque | `app/artesao`, `ProductManager.tsx` |
| | Acompanhamento de pedidos | `app/artesao`, `OrderManager.tsx` |
| **Admin** | Painel administrativo | `app/admin` |
| **Geral** | Login e cadastro (autenticação simulada) | `app/login`, `app/cadastro`, `demoAuth.ts` |
| | Perfil do usuário | `app/perfil` |
| | Termos de uso | `app/termos` |
| | Layout responsivo nas telas principais | vitrine, welcome, pedidos |

### Próximas etapas

- [ ] Integração com backend/API real
- [ ] Banco de dados
- [ ] Baixa de estoque real com controle de concorrência no backend

---

## Arquitetura

Nesta etapa a aplicação é **100% client-side**: não há backend nem banco de dados em produção. Toda a "API" é simulada no próprio código-fonte, o que permite validar fluxos de tela e regras de negócio de UI antes da integração com um backend real.

<details>
<summary><b>📁 Estrutura de pastas</b></summary>

```
src/
├── app/                    # Rotas e páginas (Next.js App Router)
│   ├── (comprador)/            # Experiência do comprador
│   ├── admin/                  # Painel administrativo
│   ├── artesao/                # Painel do artesão
│   ├── cadastro/               # Fluxo de cadastro
│   ├── home/                   # Página inicial
│   ├── login/                  # Fluxo de autenticação
│   ├── perfil/                 # Perfil do usuário
│   └── termos/                 # Termos de uso
├── components/             # Componentes de UI reutilizáveis
│   ├── CartDrawer.tsx          # Painel lateral do carrinho
│   ├── Navbar.tsx              # Barra de navegação
│   ├── OrderManager.tsx        # Gestão de pedidos (artesão)
│   ├── Portal.tsx              # Portal (modais/overlays)
│   ├── ProductCard.tsx         # Card de produto na vitrine
│   ├── ProductManager.tsx      # Gestão de catálogo (artesão)
│   └── ProductModal.tsx        # Modal de detalhes do produto
├── data/                   # Dados mockados
│   ├── index.ts                # Exportação dos dados
│   └── mockData.ts             # Artesãos, peças etc.
├── services/               # Camada de serviços / Fake API
│   ├── api.ts                  # Fachada `fakeApi`
│   ├── artesaoService.ts       # Regras/consultas sobre artesãos
│   ├── produtoService.ts       # Regras/consultas sobre produtos/peças
│   └── demoAuth.ts             # Autenticação simulada
├── store/                  # Estado global
│   └── cartStore.ts/.tsx       # Estado do carrinho
└── types/                  # Tipagens e contratos (TypeScript)
    ├── artesao.ts              # Tipo `Artesao`
    ├── produto.ts              # Tipo `Peca`/produto
    └── index.ts                # Exportação dos tipos
```

</details>

### Princípios de projeto

- **Separação de camadas:** apresentação (`components`), estado (`store`) e acesso a dados (`services`), reduzindo o acoplamento entre a UI e a origem dos dados (alinhado a SOLID/GRASP).
- **Troca futura simples:** quando a API real existir, basta trocar a implementação interna de `services/` (Fake API → chamadas HTTP), sem alterar `components/` nem `store/`.
- **Tipagem centralizada** em `types/`, garantindo contratos consistentes entre as camadas mesmo sem um backend tipado.

---

## Fake API

Como não há backend, não existem rotas HTTP reais. A "API" é o objeto `fakeApi` (`services/api.ts`), uma **fachada** (*facade*) sobre os serviços de domínio (`artesaoService`, `produtoService`). É ela que os componentes e o `store/` consomem.

### Como funciona

- Os dados vivem como objetos/arrays estáticos em `data/`.
- Cada **serviço de domínio** lê/manipula os dados de uma entidade.
- A **`fakeApi`** expõe os métodos usados pela aplicação e delega para os serviços.
- O **`store/`** consome a `fakeApi` e mantém o estado em memória durante a sessão. O estado **não persiste** entre reloads, a menos que algo seja salvo em `localStorage`.
- `artesaoService` e `produtoService` também são exportados diretamente de `api.ts`, para quem precisar de métodos de domínio ainda não expostos pela fachada.

### Contrato de retorno

Todo retorno segue o mesmo formato, simulando uma resposta HTTP real:

```ts
type ApiResult<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
};
```

| Campo | Significado |
|---|---|
| `success` | Indica se a operação terminou sem erros |
| `data` | Payload da entidade solicitada (`null` em caso de erro) |
| `error` | Mensagem de erro tratada, ou `null` em caso de sucesso |

Os erros são tratados com `try/catch` e a mensagem é normalizada (`error instanceof Error ? error.message : 'Erro ao carregar os dados.'`). Na migração para HTTP real, o contrato `ApiResult<T>` deve ser preservado, minimizando o impacto no restante do código.

### Métodos disponíveis

| Método | Equivalente a | Descrição | Retorno |
|---|---|---|---|
| `fakeApi.getArtesaos()` | `GET /artesaos` | Lista de artesãos (via `artesaoService.getArtesaos()`) | `ApiResult<Artesao[]>` |
| `fakeApi.getPecas()` | `GET /pecas` | Lista de peças/produtos (via `produtoService.getProdutos()`) | `ApiResult<Peca[]>` |

---

## Teste de concorrência

Para validar a consistência de um cenário de checkout/estoque sob alta carga, mesmo sem backend definitivo, foi desenvolvido o módulo independente **`TesteDeStress`**:

- Script à parte da aplicação principal, escrito em Java.
- Simula acessos simultâneos ao checkout com **20 threads paralelas**, sincronizadas por `CountDownLatch` (largada simultânea e controle de conclusão).
- **Objetivo:** validar a consistência do estoque e comprovar a ausência de *race conditions*.
- Serve de base para a futura implementação real de baixa de estoque no backend.

📦 [Arquivo ZIP](https://drive.google.com/file/d/1ITK4Tarze59MlXn2-qVx2QE2MADOqIVR/view?usp=sharing) · 🖼️ [Slides](https://canva.link/yesnpw11bo8hgas)

---

## Documentação e entregas

### Documentos gerais

| Documento | Link |
|---|---|
| Lista de requisitos | [Notion](https://app.notion.com/p/Projeto-Integrador-3c996fcfd27080df9bf3ef635f5bdf99?source=copy_link) |
| Backlog | [Trello](https://trello.com/b/KZIZUnYE/ponto-da-terra) |
| Issues / Bug Tracker | [GitHub](https://github.com/comparoto/Ponto-da-Terra/issues) |
| Screencast | [YouTube](https://youtu.be/G3cyHzcV1Eo?si=K9olgvrcalE2YpW2) |
| Uso de IA (documentação) | [PDF](https://github.com/user-attachments/files/32670671/Uso_de_IA_documentacao.pdf) |
| Fake API (documentação) | [PDF](https://github.com/user-attachments/files/32670674/Documentacao_Fake_API.pdf) |
| Migração da Fake API para backend real | [PDF](https://github.com/user-attachments/files/32671712/Documento_Substituicao_Fake_API_Backend_Real.pdf) |

### Entregas por unidade

<details>
<summary><b>Primeira Unidade</b></summary>

**Requisitos, Projeto de Software e Validação**
- [Backlog (Trello)](https://trello.com/b/KZIZUnYE/ponto-da-terra)
- [Diagrama de Casos de Uso](https://drive.google.com/file/d/1j8Ej2N5DjwcfHfw6MvURt_CsS5oYxgQL/view?usp=sharing)
- [Diagrama de Classes](https://drive.google.com/file/d/1B3XJBb0NO-GSV3IqV8fT050-bVJqG5ad/view?usp=sharing)
- [Plano de Testes (versão 1)](https://docs.google.com/document/d/1g6MABX9mCtVXfg0vxMLuS0kMjwttT4BClnToPovFeB8/edit?usp=sharing)

**Fundamentos de Computação Concorrente, Paralela e Distribuída**
- [Script de simulação de carga (ZIP)](https://drive.google.com/file/d/1ITK4Tarze59MlXn2-qVx2QE2MADOqIVR/view?usp=sharing)
- [Slides do teste de concorrência](https://canva.link/yesnpw11bo8hgas)
- [Log de uso de IA](https://docs.google.com/document/d/1suMTaLtk8SR1g8WeNKN4IzYHL_MzHw9sh-mnHzTPREI/edit?usp=sharing)

</details>

<details>
<summary><b>Segunda Unidade</b></summary>

**Desenvolvimento Web**
- Entregas: _a definir_

**Requisitos, Projeto de Software e Validação**
- Entregas: _a definir_

**Fundamentos de Computação Concorrente, Paralela e Distribuída**
- Entregas: _a definir_

**Issues / Bug Tracker**
- [Issues](https://github.com/comparoto/Ponto-da-Terra/issues)

</details>

---

## Integrantes

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

<p align="center">Projeto acadêmico desenvolvido para a cadeira de Desenvolvimento Web, sem fins lucrativos.</p>
<p align="center">Cesar School | 4º Período</p>
