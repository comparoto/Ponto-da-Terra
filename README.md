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
- 👩‍💻 Integrantes
- 🧱 Arquitetura
  - Concorrência, paralelismo e distribuição
- 🔄 Fluxos implementados
- 🛠️ Tecnologias utilizadas
- ⚙️ Como executar localmente
- 🔐 Variáveis de ambiente
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

> 📌 **Status atual do projeto:** esta versão da aplicação conta apenas com **frontend responsivo** e uma **Fake API** (dados mockados diretamente no código, nas pastas `data/` e `services/`), simulando o comportamento de um backend real enquanto a integração com a API definitiva não é implementada.

O projeto integra três frentes acadêmicas complementares:

| Disciplina | Responsabilidade |
|---|---|
| **Desenvolvimento Web** | Frontend responsivo (vitrine, busca, carrinho, perfis) e, futuramente, backend (API e regras de negócio) |
| **Requisitos, Projeto de Software e Validação** | Análise de domínio, gestão de requisitos, arquitetura (SOLID/GRASP, padrões de projeto) e estratégia de testes |
| **Fundamentos de Computação Concorrente, Paralela e Distribuída** | Desempenho, escalabilidade e tolerância a falhas — concorrência no checkout/baixa de estoque, filas e processamento assíncrono |

📄 [Lista de requisitos detalhada (Notion)](https://app.notion.com/p/Projeto-Integrador-3c996fcfd27080df9bf3ef635f5bdf99?source=copy_link)

---

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

Nesta etapa, a aplicação é **100% client-side**: não há backend nem banco de dados em produção. Toda a "API" é simulada dentro do próprio código-fonte, o que permite validar fluxos de tela e regras de negócio de UI antes da integração com um backend real.

```
src/
├── app/                    # Rotas e páginas (Next.js App Router)
│   ├── (comprador)/            # Rotas da experiência do comprador
│   ├── admin/                  # Rotas do painel administrativo
│   ├── artesao/                 # Rotas do painel do artesão
│   ├── cadastro/                # Fluxo de cadastro
│   ├── home/                    # Página inicial
│   ├── login/                   # Fluxo de autenticação
│   ├── perfil/                  # Perfil do usuário
│   └── termos/                  # Termos de uso
├── components/              # Componentes de UI reutilizáveis
│   ├── CartDrawer.tsx           # Painel lateral do carrinho
│   ├── Navbar.tsx                # Barra de navegação
│   ├── OrderManager.tsx          # Gestão de pedidos (artesão)
│   ├── Portal.tsx                # Componente de portal (modais/overlays)
│   ├── ProductCard.tsx           # Card de produto na vitrine
│   ├── ProductManager.tsx        # Gestão de catálogo (artesão)
│   └── ProductModal.tsx          # Modal de detalhes do produto
├── data/                     # Fake API — dados mockados
│   ├── index.ts                  # Ponto de exportação dos dados
│   └── mockData.ts               # Dados mockados (artesãos, peças etc.)
├── services/                 # Camada de serviços / Fake API
│   ├── api.ts                    # Objeto fachada `fakeApi` (ver seção "Fake API")
│   ├── artesaoService.ts         # Regras/consultas sobre artesãos
│   ├── produtoService.ts         # Regras/consultas sobre produtos/peças
│   └── demoAuth.ts               # Autenticação simulada (login/cadastro demo)
├── store/                    # Gerenciamento de estado global
│   └── cartStore.ts/.tsx         # Estado do carrinho de compras
└── types/                    # Tipagens e contratos (TypeScript)
    ├── artesao.ts                 # Tipo `Artesao`
    ├── produto.ts                 # Tipo `Peca`/produto
    └── index.ts                   # Ponto de exportação dos tipos
```

**Como a Fake API funciona:**
- Os dados vivem como objetos/arrays estáticos em `data/` (ex.: lista de artesãos, peças/produtos).
- A camada `services/` é organizada em três partes:
  - **Serviços de domínio** (`artesaoService`, `produtoService`, ...) — cada um responsável por ler/manipular os dados mockados de uma entidade específica.
  - **`fakeApi`** (definido em `services/api.ts`) — um objeto fachada (*facade*) que expõe os métodos consumidos pelo restante da aplicação (ex.: `getArtesaos()`, `getPecas()`), delegando internamente para os serviços de domínio.
  - **`ApiResult<T>`** — um tipo padronizado de retorno (`{ success, data, error }`) usado por toda a Fake API, simulando o formato de resposta de uma API HTTP real, inclusive com tratamento de erro via `try/catch` e normalização da mensagem de erro.
- Essa padronização faz com que os componentes/`store/` consumam a Fake API exatamente como consumiriam uma API real — a troca futura por chamadas HTTP deve preservar o mesmo contrato `ApiResult<T>`, minimizando o impacto no restante do código.
- O `store/` consome os métodos de `fakeApi` e mantém o estado em memória durante a sessão do usuário (o estado **não persiste** entre reloads, a não ser que algo seja salvo explicitamente em `localStorage`).

**Princípios de projeto aplicados:**
- Separação entre **apresentação** (`components`), **estado** (`store`) e **acesso a dados** (`services`), reduzindo o acoplamento entre a UI e a origem dos dados (alinhado a SOLID/GRASP).
- Essa separação foi pensada de forma intencional: quando a API real existir, basta trocar a implementação interna de `services/` (Fake API → chamadas HTTP), sem alterar `components/` nem `store/`.
- Tipagem centralizada em `types/`, garantindo contratos consistentes entre camadas mesmo sem um backend tipado.

### Concorrência, paralelismo e distribuição

Para validar a consistência de um cenário de checkout/estoque sob alta carga — mesmo sem backend definitivo integrado — foi desenvolvido um módulo independente de teste de stress:

- **`TesteDeStress`**: script à parte da aplicação principal, que simula acessos simultâneos ao fluxo de checkout, disparando **20 threads paralelas** de forma sincronizada com `CountDownLatch` (garantindo largada simultânea e controle de conclusão), com o objetivo de validar a consistência do estoque e comprovar a ausência de *race conditions*.
  - 📦 [Arquivo ZIP](https://drive.google.com/file/d/1ITK4Tarze59MlXn2-qVx2QE2MADOqIVR/view?usp=sharing)
  - 🖼️ [Slides](https://canva.link/yesnpw11bo8hgas)

> Este módulo foi construído para validar o conceito de concorrência de forma independente do estágio atual do frontend, servindo de base para a futura implementação real de baixa de estoque no backend.

---

## 🔄 Fluxos implementados

Com base no progresso registrado no repositório, os seguintes fluxos já estão implementados no frontend, operando sobre a Fake API:

- **Fluxo de compra**: navegação na vitrine → seleção de produto → carrinho → checkout do comprador (usando dados e regras simuladas em `services/`).
- **Área de pedidos do comprador**: visualização dos pedidos "realizados" pelo comprador, a partir dos dados mockados.
- **Fluxo de gestão do artesão**: cadastro/gestão de catálogo, estoque e acompanhamento de pedidos, todos operando sobre a Fake API.
- **Estrutura de layout**: refinamento visual e organizacional das telas principais (vitrine, welcome, pedidos), com foco em responsividade.

---

## 🛠️ Tecnologias utilizadas

| Camada | Tecnologia |
|---|---|
| **Frontend** | Next.js + TypeScript |
| **Gerenciamento de estado** |  |
| **Estilização** | Chakra UI |
| **Fake API** | Dados mockados em código (`data/`) consumidos via camada de serviços (`services/`) |
| **Backend real** | Ainda não implementado nesta versão |
| **Banco de dados** | Ainda não implementado nesta versão |
| **Autenticação** | Autenticação simulada (`services/demoAuth.ts`), sem backend/token real |
| **Testes de concorrência** | Java (`CountDownLatch`, simulação de 20 threads paralelas) — módulo `TesteDeStress`, independente da aplicação |
| **Controle de versão** | Git / GitHub |

---

## ⚙️ Como executar localmente

Como não há backend nesta versão, basta rodar o frontend — a Fake API já está embutida no próprio código.

### 1. Pré-requisitos
- Node.js
- npm ou yarn

### 2. Clonar o repositório
```bash
git clone https://github.com/comparoto/Ponto-da-Terra.git
cd Ponto-da-Terra
```

### 3. Instalar dependências
```bash
npm install
```

### 4. Executar a aplicação
```bash
npm run dev
```
A aplicação ficará disponível em `http://localhost:3000`. Não é necessário subir nenhum serviço adicional — a Fake API roda junto com o frontend.

---

## 🔐 Variáveis de ambiente

Nesta versão, **não há variáveis de ambiente obrigatórias**, já que não existe integração com backend, banco de dados ou serviços externos — todos os dados vêm da Fake API embutida no código.

---

## ✅ Funcionalidades implementadas

- [x] **Home / Vitrine do comprador** (`app/home`, `app/(comprador)`) — navegação e exibição de peças
- [x] **Login e Cadastro** (`app/login`, `app/cadastro`) — com autenticação simulada via `demoAuth.ts`
- [x] **Perfil do usuário** (`app/perfil`)
- [x] **Carrinho de compras** (`components/CartDrawer.tsx` + `store/cartStore`)
- [x] **Área de pedidos do comprador** — `OrderManager.tsx`
- [x] **Painel do artesão** (`app/artesao`) — gestão de catálogo (`ProductManager.tsx`) e pedidos
- [x] **Painel administrativo** (`app/admin`)
- [x] **Página de termos de uso** (`app/termos`)
- [x] **Detalhe de produto em modal** (`ProductModal.tsx`)
- [x] Integração com backend/API real (planejado para próxima etapa)

---

## 🔌 "Rotas" da Fake API

Como não há backend, não existem rotas HTTP reais. A "API" é o objeto `fakeApi` (`services/api.ts`), que funciona como uma **fachada** sobre os serviços de domínio (`artesaoService`, `produtoService`) e é o que os componentes e o `store/` efetivamente consomem.

Todo retorno segue o mesmo formato padronizado, simulando a resposta de uma API HTTP real:

```ts
type ApiResult<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
};
```

- `success`: indica se a operação foi concluída sem erros;
- `data`: o payload da entidade solicitada (`null` em caso de erro);
- `error`: mensagem de erro tratada (`error instanceof Error ? error.message : 'Erro ao carregar os dados.'`), ou `null` em caso de sucesso.

| Método `fakeApi` | Equivalente a | Descrição | Retorno |
|---|---|---|---|
| `fakeApi.getArtesaos()` | `GET /artesaos` | Retorna a lista de artesãos, delegando para `artesaoService.getArtesaos()` | `ApiResult<Artesao[]>` |
| `fakeApi.getPecas()` | `GET /pecas` | Retorna a lista de peças/produtos, delegando para `produtoService.getProdutos()` | `ApiResult<Peca[]>` |

`artesaoService` e `produtoService` também são exportados diretamente de `fakeApi.ts`, caso algum consumidor precise acessar métodos específicos de domínio que ainda não estejam expostos pela fachada `fakeApi`.

---

## 🚀 Deploy

`[LINK]`
- Frontend: `[link]`
- (Backend/API real ainda não existe nesta versão — a aplicação em produção também depende da Fake API)

---

## 🧪 Evidências

- [Backlog — Trello](https://trello.com/b/KZIZUnYE/ponto-da-terra)
- [Diagrama de Casos de Uso](https://drive.google.com/file/d/1j8Ej2N5DjwcfHfw6MvURt_CsS5oYxgQL/view?usp=sharing)
- [Diagrama de Classes](https://drive.google.com/file/d/1B3XJBb0NO-GSV3IqV8fT050-bVJqG5ad/view?usp=sharing)
- [Plano de Testes — Versão 1](https://docs.google.com/document/d/1g6MABX9mCtVXfg0vxMLuS0kMjwttT4BClnToPovFeB8/edit?usp=sharing)
- [Script de Simulação de Carga — ZIP](https://drive.google.com/file/d/1ITK4Tarze59MlXn2-qVx2QE2MADOqIVR/view?usp=sharing)
- [Slides do teste de concorrência](https://canva.link/yesnpw11bo8hgas)
- [Log de Uso de IA](https://docs.google.com/document/d/1suMTaLtk8SR1g8WeNKN4IzYHL_MzHw9sh-mnHzTPREI/edit?usp=sharing)
- [Issues / Bug Tracker](https://github.com/comparoto/Ponto-da-Terra/issues)
- [Screencast]().

---

## 📃 Documentações exigidas

- Documentação sobre o uso de IA: [Uso_de_IA_documentacao.pdf](https://github.com/user-attachments/files/32670671/Uso_de_IA_documentacao.pdf)
- Documentação sobre a Fake API: [Documentacao_Fake_API.pdf](https://github.com/user-attachments/files/32670674/Documentacao_Fake_API.pdf)
- Migração futura da FakeAPI para Back-end: [Documento_Substituicao_Fake_API_Backend_Real.pdf](https://github.com/user-attachments/files/32671712/Documento_Substituicao_Fake_API_Backend_Real.pdf)


---

## 📋 Índice de entregas por unidade

<details>
<summary><b>Primeira Unidade</b></summary>

**Desenvolvimento Web**
- Entregas:

**Requisitos, Projeto de Software e Validação**
- [Backlog - Trello](https://trello.com/b/KZIZUnYE/ponto-da-terra)
- [Diagrama de Casos de Uso](https://drive.google.com/file/d/1j8Ej2N5DjwcfHfw6MvURt_CsS5oYxgQL/view?usp=sharing)
- [Diagrama de Classes](https://drive.google.com/file/d/1B3XJBb0NO-GSV3IqV8fT050-bVJqG5ad/view?usp=sharing)
- [Plano de Testes - Versão 1](https://docs.google.com/document/d/1g6MABX9mCtVXfg0vxMLuS0kMjwttT4BClnToPovFeB8/edit?usp=sharing)

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

**Fundamentos de Computação Concorrente, Paralela e Distribuída**
- Entregas: 

**Issues/Bug Tracker**
- [Issues](https://github.com/comparoto/Ponto-da-Terra/issues)

</details>

---

<p align="center">Projeto acadêmico desenvolvido para a cadeira de Desenvolvimento Web sem fins lucrativos</p>
<p align="center"> Cesar School | 4º Período</p>
