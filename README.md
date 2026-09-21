<div align="center">

<img src="logo-pdt-png.png" alt="Logo Origem: Ponto da Terra" width="180">

# Origem: Ponto da Terra

**Uma vitrine digital para o artesanato pernambucano — direto de quem faz.**

[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=flat-square)](#)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

[Requisitos](https://app.notion.com/p/Projeto-Integrador-3c996fcfd27080df9bf3ef635f5bdf99?source=copy_link) ·
[Backlog](https://trello.com/b/KZIZUnYE/ponto-da-terra) ·
[Issues](https://github.com/comparoto/Ponto-da-Terra/issues)

</div>

---

## 📑 Índice

- [Sobre o projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Como executar](#-como-executar)
- [Disciplinas e entregas](#-disciplinas-e-entregas)
- [Equipe](#-equipe)

---

## 🎯 Sobre o projeto

**Origem: Ponto da Terra** é uma aplicação web full stack voltada ao artesanato pernambucano, desenvolvida como Projeto Integrador.

### O problema

Artesãos e produtores criativos têm pouca visibilidade digital, dependem de intermediários e enfrentam uma gestão precária de catálogo, pedidos e estoque. Falta um canal que conecte essa produção a compradores destacando origem, técnica e o impacto de comprar direto de quem faz.

### A solução

Uma plataforma que conecta artesãos e empreendedores a compradores de todo o país, valorizando a técnica e a origem de cada peça — com vitrine para o comprador, painel de gestão para o artesão, painel administrativo e indicadores de venda.

---

## ✨ Funcionalidades

| Perfil | Recursos |
|---|---|
| 🛍️ **Comprador** | Busca e filtros, perfil do artesão, carrinho, avaliações |
| 🧶 **Artesão** | Gestão de catálogo, controle de estoque, acompanhamento de pedidos |
| ⚙️ **Administrador** | Gestão da plataforma e indicadores de venda |

---

## 🛠️ Tecnologias

| Camada | Tecnologias |
|---|---|
| **Frontend** | React · TypeScript · Vite · Tailwind CSS · ESLint |
| **Backend** | *a definir* |
| **Banco de dados** | *a definir* |
| **Assíncrono / Filas** | *a definir* |

---

## 📁 Estrutura do projeto

```
.
├── public/              # Arquivos estáticos (favicon, ícones)
└── src/
    ├── assets/          # Imagens e recursos
    ├── components/      # Componentes reutilizáveis (Navbar, ProductCard)
    ├── hooks/           # Hooks customizados (useVoiceAssistant)
    ├── types/           # Tipagens TypeScript
    ├── App.tsx          # Componente raiz
    └── main.tsx         # Ponto de entrada
```

---

## 🚀 Como executar

### Pré-requisitos

- [Node.js](https://nodejs.org) 18 ou superior
- npm (já incluso no Node.js) ou outro gerenciador de pacotes
- [Git](https://git-scm.com)

### Passo a passo

**1. Clone o repositório**

```bash
git clone https://github.com/comparoto/Ponto-da-Terra.git
cd Ponto-da-Terra
```

**2. Instale as dependências**

```bash
npm install
```

**3. Configure as variáveis de ambiente**

```bash
cp .env.example .env
```

**4. Rode a aplicação**

```bash
npm run dev
```

A aplicação ficará disponível em `http://localhost:5173`.

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera a build de produção |
| `npm run preview` | Visualiza a build localmente |
| `npm run lint` | Verifica o código com o ESLint |

---

## 📚 Disciplinas e entregas

### Escopo por disciplina

| Disciplina | Responsabilidade |
|---|---|
| **Desenvolvimento Web** | Construir a aplicação full stack — frontend responsivo (vitrine, busca, carrinho, perfis) e backend (API e regras de negócio), integrando banco de dados e processamento assíncrono. |
| **Requisitos, Projeto de Software e Validação** | Analisar o domínio, definir e gerir requisitos, embasar decisões de arquitetura e projeto (SOLID/GRASP e padrões de projeto) e conduzir a estratégia de testes e validação contínua. |
| **Fundamentos de Computação Concorrente, Paralela e Distribuída** | Garantir desempenho, escalabilidade e tolerância a falhas, aplicando concorrência (checkout e baixa de estoque), paralelismo e arquitetura distribuída com filas e processamento assíncrono. |

📄 [Lista completa de requisitos](https://app.notion.com/p/Projeto-Integrador-3c996fcfd27080df9bf3ef635f5bdf99?source=copy_link)

### Primeira unidade

<details>
<summary><b>Desenvolvimento Web</b></summary>

<br>

*Entregas em andamento.*

</details>

<details open>
<summary><b>Requisitos, Projeto de Software e Validação</b></summary>

<br>

- [Backlog — Trello](https://trello.com/b/KZIZUnYE/ponto-da-terra)
- [Diagrama de Casos de Uso](https://drive.google.com/file/d/1j8Ej2N5DjwcfHfw6MvURt_CsS5oYxgQL/view?usp=sharing)
- [Diagrama de Classes](https://drive.google.com/file/d/1B3XJBb0NO-GSV3IqV8fT050-bVJqG5ad/view?usp=sharing)
- [Plano de Testes — Versão 1](https://docs.google.com/document/d/1g6MABX9mCtVXfg0vxMLuS0kMjwttT4BClnToPovFeB8/edit?usp=sharing)

</details>

<details>
<summary><b>Fundamentos de Computação Concorrente, Paralela e Distribuída</b></summary>

<br>

*Entregas em andamento.*

</details>

### Segunda unidade

<details>
<summary><b>Desenvolvimento Web</b></summary>

<br>

*Entregas em andamento.*

</details>

<details>
<summary><b>Requisitos, Projeto de Software e Validação</b></summary>

<br>

*Entregas em andamento.*

</details>

<details>
<summary><b>Fundamentos de Computação Concorrente, Paralela e Distribuída</b></summary>

<br>

*Entregas em andamento.*

</details>

### Bug tracker

Acompanhe bugs e tarefas técnicas nas [Issues do repositório](https://github.com/comparoto/Ponto-da-Terra/issues).

---

## 👩‍💻 Equipe

| Integrante | GitHub |
|---|---|
| Iza Malafaia | [@Iza-Malafaia](https://github.com/Iza-Malafaia) |
| Juliana Comparoto | [@comparoto](https://github.com/comparoto) |
| Joanna Farias | [@Joanna-Farias](https://github.com/Joanna-Farias) |
| Lucas Vinícius | [@Lucas-Viniicius](https://github.com/Lucas-Viniicius) |
| Maria Luiza | [@alumiria](https://github.com/alumiria) |
| Paulo Marrocos | [@paulosds2318](https://github.com/paulosds2318) |
| Pedro Marrocos | [@Pedrinhosds16](https://github.com/Pedrinhosds16) |

---

<div align="center">

</div>