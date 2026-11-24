# **Análise de Código \- Ponto da Terra**

## Duplicated code nos filtros de produtos

## Aluna: Joanna L M dos Santos Farias

---

1. ## **Descrição do problema**

Identificou-se o *code smell* de **Duplicated Code** (Código Duplicado) na implementação das regras de negócio responsáveis pela filtragem de produtos. A mesma lógica de negócio foi replicada em diferentes camadas e componentes da aplicação (tanto no *frontend* quanto no *backend*). O agravante é que essas cópias já começaram a divergir entre si, criando versões paralelas e assimétricas de uma funcionalidade que deveria ser única.

```ts
// produtos/page.tsx
p.nome.toLowerCase().includes(termo) ||
p.artesaoNome?.toLowerCase().includes(termo) ||
p.categoria?.toLowerCase().includes(termo) ||
p.artesaoCidade?.toLowerCase().includes(termo) ||
p.material?.toLowerCase().includes(termo)
```

```ts
// vitrine/page.tsx
[peca.nome, peca.material || '', nomeArtesao]
  .some(v => v.toLocaleLowerCase('pt-BR').includes(termo));
```

```ts
// backend produtos.service.ts
OR: [
  { titulo: contem(filtros.busca) },
  { descricao: contem(filtros.busca) },
  { tecnica: contem(filtros.busca) },
  { poloOrigem: contem(filtros.busca) },
  { artesao: { cidade: contem(filtros.busca) } },
  { artesao: { usuario: { nome: contem(filtros.busca) } } },
]
```

2. ## **Evidências**

* src/app/(comprador)/produtos/page.tsx, useMemo, linhas 95–150 (filtra no navegador).  
* src/app/(comprador)/vitrine/page.tsx, linhas 128–148 (outra versão no navegador).  
* backend/src/modules/produtos/produtos.service.ts, método vitrine, linhas 44–82 (filtra no servidor).  
* O backend já oferece busca, categoria, técnica, polo, artesão, preço e ordenação, mas o front não usa nada disso. produtoService.getProdutos chama /produtos apenas com page e limit (50 itens por página), repetindo até a última página, e as telas filtram o catálogo inteiro no navegador. O tipo FiltrosProduto ficou sem uso no front.

3. ## **Impactos**

	Atualmente não há erro. Pelo código, /produtos e /vitrine buscam em campos diferentes, então a mesma busca pode dar resultados diferentes entre as telas. Isso vem da leitura do código e não foi confirmado rodando o sistema. O front também baixa o catálogo inteiro, o que hoje pesa pouco por ser um catálogo pequeno. No entanto, com mais produtos e mais acessos, a tela tende a ficar mais lenta, mais requisições até mostrar qualquer resultado, o servidor é mais exigido e as buscas ficam mais inconsistentes.

4. ## **Decisão Técnica**

A decisão foi de não realizar a refatoração neste momento (aceitação temporária do débito técnico), uma vez que nenhum fluxo crítico do usuário está sendo prejudicado atualmente, uma vez que a implementação duplicada no *backend* (`produtos.service.ts`) não está sendo acionada com parâmetros de filtro em produção. A refatoração poderá ser priorizada em uma janela futura de melhoria arquitetural, centralizando a regra preferencialmente no servidor.

## 

