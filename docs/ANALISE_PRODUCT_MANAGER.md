# Análise e Refatoração de Code Smell - Projeto Integrador

- **Aluno(a):** Iza Dantas Malafaia 
- **Módulo analisado:** `src/components/ProductManager.tsx`
- **Funcionalidade / Componente:** Gestão de Catálogo do Artesão (`ProductManager`)

---

## 1. Revisão e Identificação de Code Smells

- **Code Smell Identificado:** "Large Component / Mixed Responsibilities" (Inchaço / Bloater), caracterizado pela violação do Princípio da Responsabilidade Única (*Single Responsibility Principle* - SRP).
- **Localização:** Componente funcional `ProductManager` em `src/components/ProductManager.tsx`, especificamente nos estados do formulário (`name`, `price`, `category`, `imageUrl`, `message`, `editingId`), na leitura/validação de imagem (`selectImage`) e na submissão (`add`).
- **Problema (O cenário original):** Antes da refatoração, o componente `ProductManager` acumulava múltiplas responsabilidades no mesmo arquivo: controlava individualmente 6 estados de formulário, validava tamanho e tipo de arquivo via `FileReader`, aplicava regras de negócio de cadastro/edição (`add`), persistia dados no `produtoService` e renderizava toda a interface em Chakra UI.

### Impactos Potenciais na Qualidade
- **Legibilidade:** Prejudicada. A mistura de manipulação de `FileReader`, regras imperativas de validação e marcação JSX dificultava identificar rapidamente o fluxo da interface.
- **Coesão:** Baixa. O componente possuía múltiplos motivos para mudar: alterações nas regras de validação de imagem, campos do formulário ou layout visual exigiam editar o mesmo arquivo.
- **Acoplamento:** Elevado entre a lógica de formulário/validação e a camada visual, impedindo o reaproveitamento dessa lógica em outros pontos da aplicação.
- **Manutenibilidade e Extensibilidade:** Dificultada. Adicionar novos campos ou regras ao cadastro faria o componente crescer desordenadamente, aumentando o risco de regressões visuais.
- **Testabilidade:** Reduzida. Testar as regras de validação de preço ou upload de imagem exigia renderizar toda a árvore de componentes Chakra UI.

---

## 2. Análise Crítica e Decisão de Refatoração

- **Decisão:** Refatorar. O problema era bem delimitado ao fluxo de formulário e validação no frontend, permitindo extrair a lógica sem alterar o comportamento esperado pelo usuário.
- **Técnica Utilizada:** "Extract Custom Hook" (Extração de Hook Customizado - `useProductForm`), aplicando separação de preocupações (*Separation of Concerns*).

### O que exatamente mudou?
- **1. Criação do Custom Hook (`src/hooks/useProductForm.ts`):** Isolei os estados do formulário (`name`, `price`, `category`, `imageUrl`, `message`, `editingId`), a validação e conversão da imagem (`selectImage`) e a regra de validação e salvamento (`add`).
- **2. Simplificação do Componente (`src/components/ProductManager.tsx`):** O componente passou a chamar `useProductForm`, mantendo-se focado apenas na listagem, exclusão e renderização declarativa da UI.

### Por que mudou? (Benefícios)
- **1. Alta Coesão e Clareza de Intenção:** Separou-se a regra de negócio do formulário da camada de apresentação visual.
- **2. Testabilidade Unitária:** O hook `useProductForm` agora pode ser testado de forma isolada, sem depender da renderização da interface Chakra UI.
- **3. Reutilização e Manutenibilidade:** Facilita evoluções futuras no cadastro de peças sem impactar a estrutura visual do catálogo.

---

## 3. Registro das Intervenções e Validação

- A refatoração preservou integralmente o comportamento funcional esperado: validação de nome obrigatório e preço maior que zero, validação de tipo e tamanho máximo (1,5 MB) da imagem, envio via `produtoService.salvarProduto` e limpeza automática dos campos após salvar.
- **Validação (Tipagem e Integridade):**
  - Verificação de tipos do TypeScript executada sem erros (`npx tsc --noEmit`).

### Riscos e Limitações
- **Persistência em Demonstração:** O hook utiliza `produtoService` em modo demonstração com IDs gerados via `Date.now()`; quando o endpoint definitivo de backend for integrado, `add` deverá evoluir para tratar estados assíncronos (`loading` e erros de rede).
- **Gerenciamento da Listagem:** O estado `products` e a ação `remove` permaneceram em `ProductManager.tsx`; caso o catálogo cresça com filtros avançados ou paginação, recomenda-se extrair também um hook `useProductCatalog`.