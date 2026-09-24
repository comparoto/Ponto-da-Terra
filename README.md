# Origem: Ponto da Terra
<img src="logo-pdt-png.png" alt="logo" width="200">

O projeto Origem: Ponto da Terra está sendo desenvolvido com o objetivo de criar uma aplicação web full stack voltada para o Artesanato Pernambucano, visando solucionar o seguinte problema:

Artesãos e produtores criativos têm pouca visibilidade digital, dependem de intermediários e têm gestão precária de catálogo, pedidos e estoque. Falta um canal que conecte essa produção a compradores destacando origem, técnica e o impacto de comprar direto de quem faz.

## A Solução
Uma aplicação web full stack com vitrine do comprador (busca, filtros, perfil do artesão, carrinho, avaliações), painel do artesão (catálogo, estoque, pedidos) e painel administrativo, contando também com indicadores de venda. O objetivo é criar uma plataforma que conecte artesãos e empreendedores a compradores de todo o país, valorizando a técnica e a origem de cada peça. 

## Requisitos por disciplina

* **Desenvolvimento Web:** 
  Construir a aplicação web full stack, que é o núcleo do produto. Isso inclui o frontend responsivo (vitrine, busca, carrinho, perfis) e o backend (API e regras de negócio), integrando as demais partes como banco de dados e processamento assíncrono.

* **Requisitos, Projeto de Software e Validação:** 
  Ficar responsável por analisar o domínio, definir e gerir os requisitos, embasar as decisões de arquitetura e projeto (usando princípios SOLID/GRASP e padrões de projeto), além de conduzir a estratégia de testes e validação contínua da solução.

* **Fundamentos de Computação Concorrente, Paralela e Distribuída:** 
  Garantir o desempenho, a escalabilidade e a tolerância a falhas do sistema. Isso é feito aplicando conceitos de concorrência (como no checkout e na baixa de estoque), paralelismo e arquitetura distribuída, utilizando filas e processamento assíncrono.


### Requisitos detalhados
- [Lista](https://app.notion.com/p/Projeto-Integrador-3c996fcfd27080df9bf3ef635f5bdf99?source=copy_link)


# 📋 Índice

* [Primeira Unidade](#primeira-unidade)
  * [Desenvolvimento Web](#desenvolvimento-web)
  * [Requisitos, Projeto de Software e Validação](#requisitos-projeto-de-software-e-validação)
  * [Fundamentos de Computação Concorrente, Paralela e Distribuída](#fundamentos-de-computação-concorrente-paralela-e-distribuída)
* [Segunda Unidade](#segunda-unidade)
  * [Desenvolvimento Web](#desenvolvimento-web-1)
  * [Requisitos, Projeto de Software e Validação](#requisitos-projeto-de-software-e-validação-1)
  * [Fundamentos de Computação Concorrente, Paralela e Distribuída](#fundamentos-de-computação-concorrente-paralela-e-distribuída-1)

---

## Primeira Unidade

### Desenvolvimento Web
* **Entregas:**

### Requisitos, Projeto de Software e Validação
* **Entregas:**
- [Backlog - Trello](https://trello.com/b/KZIZUnYE/ponto-da-terra)
- [Diagrama de Casos de Uso](https://drive.google.com/file/d/1j8Ej2N5DjwcfHfw6MvURt_CsS5oYxgQL/view?usp=sharing)
- [Diagrama de Classes](https://drive.google.com/file/d/1B3XJBb0NO-GSV3IqV8fT050-bVJqG5ad/view?usp=sharing)
- [Plano de Testes - Versão 1](https://docs.google.com/document/d/1g6MABX9mCtVXfg0vxMLuS0kMjwttT4BClnToPovFeB8/edit?usp=sharing)


### Fundamentos de Computação Concorrente, Paralela e Distribuída
* **Entregas:**
#### Script de Simulação de Carga e Concorrência (`TesteDeStress`)

Este módulo consiste num código executável à parte da aplicação principal, desenvolvido especificamente para simular acessos simultâneos ao sistema de *checkout*[cite: 1]. O script submete múltiplas requisições paralelas (20 *threads*) de forma sincronizada — utilizando a classe `CountDownLatch` para garantir a largada simultânea e o controlo de conclusão[cite: 1] — com o objetivo de validar a consistência do *stock* e comprovar a ausência de condições de corrida (*race conditions*) sob alta pressão[cite: 1].
- [Arquivo ZIP](https://drive.google.com/file/d/1ITK4Tarze59MlXn2-qVx2QE2MADOqIVR/view?usp=sharing)
- [Slides](https://canva.link/yesnpw11bo8hgas)
- [Log Uso de IA](https://docs.google.com/document/d/1suMTaLtk8SR1g8WeNKN4IzYHL_MzHw9sh-mnHzTPREI/edit?usp=sharing)

---

## Segunda Unidade

### Desenvolvimento Web
* **Entregas:** 

### Requisitos, Projeto de Software e Validação
* **Entregas:** 

### Fundamentos de Computação Concorrente, Paralela e Distribuída
* **Entregas:** 

### Issues/Bug Tracker
- [Issues](https://github.com/comparoto/Ponto-da-Terra/issues)


## 👩‍💻 Equipe 
- [Iza Malafaia](https://github.com/Iza-Malafaia) 
- [Juliana Comparoto](https://github.com/comparoto) 
- [Joanna Farias](https://github.com/Joanna-Farias) 
- [Lucas Vinícius](https://github.com/Lucas-Viniicius)
- [Maria Luiza](https://github.com/alumiria)
- [Paulo Marrocos](https://github.com/paulosds2318)
- [Pedro Marrocos](https://github.com/Pedrinhosds16)

## ⚙️ Guia 
Montando o ambiente corretamente para execução do projeto:

<details>
<summary>🌐 <b>1. Tecnologias Utilizadas</b></summary>

* **Backend:** 
* **Banco de Dados:**
* **Frontend:** 

</details>

<details>
<summary>🛠️ <b>2. Como Configurar e Executar o Projeto</b></summary>

Siga os passos abaixo para montar o ambiente e rodar a aplicação localmente na sua máquina.

### 1. Pré-requisitos

### 2. Clonar o Repositório

### 3. Abrir e Compilar na ID

### 4. Executar a Aplicação

</details>

<details>
<summary>🌐 <b>3. URLs de acesso</b></summary>
