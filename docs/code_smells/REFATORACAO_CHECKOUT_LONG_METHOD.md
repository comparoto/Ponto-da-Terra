# Desafio: revisão de código, code smells e refatoração

**Parte analisada:** finalização da compra (HU11 / TC02), método `checkout` de `backend/src/modules/compras/compras.service.ts`.
**Smell principal:** *Long Method* (método longo).
**Decisão:** refatorar.
**Técnica:** *Extract Function* (Fowler), aplicada sete vezes, uma por etapa do método, com *Introduce Parameter Object* para os dados do carrinho.
**Validação:** 5 testes de caracterização novos em `backend/tests/checkout-etapas.test.ts`, somados aos testes de checkout e pagamento que já existiam.

---

## 1. Code smell identificado

### 1.1 *Long Method*: principal

Antes da mudança, `comprasService.checkout` tinha **102 linhas** (161 a 262), quase todas dentro de um único callback de `prisma.$transaction`. O método fazia sete coisas diferentes, uma depois da outra, separadas só por comentários:

| # | O que o trecho fazia | Linhas (antes) |
|---|---|---|
| 1 | Somar quantidades de itens repetidos e lembrar a posição original de cada um | 162–168 |
| 2 | Buscar as peças visíveis na vitrine e rejeitar as inválidas | 171–179 |
| 3 | Reservar o estoque com `UPDATE ... WHERE qtd >= n` | 181–190 |
| 4 | Agrupar os itens por artesão | 192–197 |
| 5 | Cotar o frete por artesão e calcular os valores de cada pedido | 198–210 |
| 6 | Gravar endereço, compra, pedidos, itens, entregas e histórico | 202, 212–244 |
| 7 | Registrar o evento `NOVO_PEDIDO` de cada pedido na outbox | 246–255 |

Os comentários (`// Reserva atômica, linha a linha`, `// Agrupa por artesão...`) são o sinal clássico apontado por Fowler: **quando você sente necessidade de comentar um bloco, ele está pedindo para virar uma função com aquele nome.**

**Impactos na qualidade:**

- **Legibilidade:** para responder "o que acontece no checkout?" era preciso ler 100 linhas e montar o roteiro de cabeça. Variáveis como `porId`, `grupos`, `unidades`, `fretePorArtesao` e `pedidos` ficavam todas vivas no mesmo escopo, e o leitor precisava acompanhar quais ainda eram usadas.
- **Coesão:** a mesma função misturava regra de negócio pura (agrupar, somar `Decimal`, cotar frete) com SQL bruto de concorrência e com a montagem de um `create` aninhado do Prisma de 30 linhas.
- **Manutenibilidade:** este é o método mais crítico do sistema. Ele trata dinheiro, estoque concorrente e ordem de locks. Uma mudança simples, como "frete grátis acima de R$ 300", exigia editar o meio de um bloco longo dentro de uma transação, com risco de mexer sem querer na parte de reserva.
- **Extensibilidade:** cupom de desconto, limite de itens por artesão e outras regras novas só tinham onde entrar "no meio" do método, o que tenderia a deixá-lo ainda maior.
- **Acoplamento:** não havia acoplamento entre módulos novo, mas as etapas se comunicavam por variáveis locais compartilhadas, o que é um acoplamento implícito e difícil de ver.

### 1.2 Outros pontos vistos e **não tratados** (ver seção 3)

- `pagar` escolhe o meio de pagamento e trata o resultado com `if/else` por tipo (*Switch Statements*).
- `agendarExpiracao(...).catch(err => console.error(...))` aparece duas vezes, igual (*Duplicated Code*, pequeno).
- `compraDto` é longo (37 linhas).
- O agrupamento por artesão copia o array a cada item (`[...(grupos.get(...) ?? []), novo]`).

---

## 2. Análise e decisão

**A refatoração era necessária?** Sim.

1. **É o ponto mais sensível do sistema.** Um erro aqui vende peça sem estoque, cobra o frete errado ou cria pedido sem evento para o artesão. Código difícil de ler num lugar assim é um risco concreto, não só estético.
2. **O método já tinha as divisões marcadas.** Os comentários mostravam onde cortar, então a extração não exigia redesenho, só dar nome ao que já existia.
3. **O risco é controlável.** *Extract Function* é uma das refatorações mais seguras que existem, porque não muda o que é executado, só onde o código está escrito. Para garantir, escrevi testes de caracterização antes de mexer.

**O que precisava ser preservado à risca:**

- A **ordem das operações dentro da transação**: buscar → reservar → cotar frete (que valida o CEP) → gravar endereço → gravar compra → registrar eventos. Por exemplo, se o CEP for inválido, o erro precisa acontecer *depois* da reserva e *antes* de gravar o endereço, para que o rollback devolva o estoque e não sobre endereço órfão.
- A **ordem dos locks** (ids ordenados), que evita deadlock entre compras concorrentes (TC02).
- As **mensagens e os campos dos erros** (`itens.<posição>.produtoId`, `itens.<posição>.quantidade`), que o frontend usa para marcar o item certo.

### Testes de caracterização (escritos antes da refatoração)

A suíte já cobria o caminho feliz com dois artesãos e a concorrência de 50 compradores. Ficavam sem teste vários ramos do método:

| Teste novo | Ramo coberto |
|---|---|
| mesmo produto repetido vira 1 item com a soma | etapa 1 (consolidação) |
| peça inexistente → 400 com `itens.1.produtoId` e nada reservado | etapa 2 e o índice original |
| item esgotado → 400 com campo e título; reserva dos outros desfeita | etapa 3 e rollback parcial |
| CEP fictício → 400; estoque devolvido; sem compra nem endereço | ordem etapa 3 → 5 → 6 |
| frete por artesão (R$ 27,90 + R$ 24,90), endereço único ligado às entregas, histórico inicial e evento `NOVO_PEDIDO` com o resumo dos itens | etapas 4 a 7 |

### Técnicas aplicadas

1. **Extract Function** (sete vezes): cada etapa da tabela 1.1 virou uma função privada do módulo, com o nome da etapa: `consolidarItens`, `buscarProdutosVendaveis`, `reservarEstoque`, `agruparPorArtesao`, `orcarPorArtesao`, `criarCompra` e `registrarNovosPedidos`.
2. **Introduce Parameter Object:** os três valores que andavam juntos (`ids`, `quantidades`, `indiceOriginal`) viraram o tipo `Carrinho`, e as funções recebem só o que usam, por desestruturação.
3. **Funções puras separadas das que acessam o banco:** `consolidarItens`, `agruparPorArtesao` e `orcarPorArtesao` não recebem `tx`. Dá para ver pela assinatura quais etapas tocam no banco.

As funções ficaram **no mesmo arquivo**, numa seção "Etapas do checkout", e **não são exportadas**. Isso mantém a API pública do serviço idêntica e não cria novos pontos de acoplamento.

---

## 3. O que foi mantido de propósito (decisão de não refatorar)

| Ponto | Decisão | Justificativa |
|---|---|---|
| `if/else` por tipo em `pagar` | **Manter** | São 3 casos fixos (pendente, aprovado, recusado), já tipados por união discriminada. A escolha do meio de pagamento já usa polimorfismo (`MeioDePagamento`). Trocar os 3 ramos por classes espalharia uma regra curta por vários arquivos sem ganho. |
| `.catch(console.error)` repetido | **Manter** | São 2 linhas. Extrair uma função para isso esconderia, no ponto de chamada, que a falha ao agendar é tolerada de propósito. |
| `compraDto` longo | **Manter** | É um mapeamento declarativo, campo a campo, do banco para o contrato da API. Cada linha é independente, então dividir só faria o leitor pular entre funções para ver o formato da resposta. |
| Cópia do array em `agruparPorArtesao` | **Manter** | O carrinho tem no máximo 50 itens (validação do Zod), então o custo é irrelevante. Mudar isso seria uma alteração de comportamento interno fora do escopo de *Extract Function*. |
| Mover as etapas para outro arquivo (`checkout.ts`) | **Não fazer agora** | Elas só são usadas pelo `checkout`. Com 389 linhas, o arquivo ainda é navegável, e a seção nomeada já dá a separação visual. Se o checkout ganhar mais regras (cupom, por exemplo), mover para um arquivo próprio passa a valer a pena. |

---

## 4. Antes e depois

### Antes: 102 linhas, um único bloco dentro da transação (resumido)

```ts
async checkout(consumidorId, itensEntrada, endereco) {
  const quantidades = new Map<string, number>();
  const indiceOriginal = new Map<string, number>();
  itensEntrada.forEach(/* soma quantidades, guarda posição */);
  const ids = [...quantidades.keys()].sort();

  const compra = await prisma.$transaction(async tx => {
    const produtos = await tx.produto.findMany({ /* ... */ });
    const porId = new Map(produtos.map(p => [p.id, p]));
    const invalidos = ids.filter(/* ... */).map(/* ... */);
    if (invalidos.length) throw badRequest('Carrinho contém itens inválidos', invalidos);

    // Reserva atômica, linha a linha
    for (const id of ids) { /* UPDATE "Estoque" ... ; throw se esgotou */ }

    // Agrupa por artesão: cada artesão recebe o seu pedido, com frete próprio
    const grupos = new Map(/* ... */);
    for (const id of ids) { /* ... */ }
    const unidades = /* ... */;
    const frete = cotarPorArtesao(endereco.cep, unidades);
    const fretePorArtesao = /* ... */;
    const enderecoCriado = await tx.endereco.create({ /* ... */ });
    const pedidos = [...grupos.entries()].map(/* soma Decimal, frete, prazo */);
    const valorProdutos = /* ... */;
    const valorFrete = /* ... */;

    const criada = await tx.compra.create({ /* 32 linhas de create aninhado */ });

    // HU12: o evento "Novo Pedido" é gravado na mesma transação...
    for (const pedido of criada.pedidos) { await registrarEvento(/* ... */); }
    return criada;
  }, OPCOES_TX);
  // ...
}
```

### Depois: o método conta o que acontece, e cada etapa tem nome

```ts
async checkout(consumidorId: string, itensEntrada: ItemCheckout[], endereco: EnderecoCheckout) {
  const carrinho = consolidarItens(itensEntrada);

  const compra = await prisma.$transaction(async tx => {
    const produtos = await buscarProdutosVendaveis(tx, carrinho);
    await reservarEstoque(tx, carrinho, produtos);
    const orcamento = orcarPorArtesao(agruparPorArtesao(carrinho, produtos), endereco.cep);
    const enderecoCriado = await tx.endereco.create({ data: { consumidorId, ...endereco, cep: orcamento.cep } });
    const criada = await criarCompra(tx, consumidorId, enderecoCriado.id, orcamento);
    await registrarNovosPedidos(tx, criada);
    return criada;
  }, OPCOES_TX);

  await invalidarCatalogo(); // o estoque mudou
  await agendarExpiracao(compra.reservaExpiraEm).catch(err => console.error('[fila] falha ao agendar expiração:', err));
  return compraDto(compra);
},
```

Exemplo de etapa extraída:

```ts
/** 3. Reserva atômica, linha a linha, em ordem de id. Se uma peça esgotar, o erro desfaz a transação inteira. */
async function reservarEstoque(tx: Tx, { ids, quantidades, indiceOriginal }: Carrinho, produtos: Map<string, ProdutoVendavel>) {
  for (const id of ids) {
    const qtd = quantidades.get(id)!;
    const afetadas = await tx.$executeRaw`
      UPDATE "Estoque" SET "quantidadeDisponivel" = "quantidadeDisponivel" - ${qtd}, "versao" = "versao" + 1
      WHERE "produtoId" = ${id} AND "quantidadeDisponivel" >= ${qtd}`;
    if (afetadas === 0) throw badRequest(MSG_ESGOTADO, [/* campo e título da peça */]);
  }
}
```

### Métricas

| | Antes | Depois |
|---|---|---|
| Linhas do método `checkout` | 102 | 17 |
| Maior função do fluxo de checkout | 102 (`checkout`) | 36 (`criarCompra`, quase só o `create` declarativo) |
| Variáveis locais no escopo da transação | 12 | 4 |
| Comentários usados como "título" de bloco | 3 | 0 (viraram nomes de função) |
| Funções que acessam o banco / funções puras | 1 / 0 | 4 / 3 |
| Linhas do arquivo `compras.service.ts` | 392 | 389 |
| API pública do serviço e contrato HTTP | — | **idênticos** |
| Testes do fluxo de checkout | 3 (TC02) + uso indireto | +5 de caracterização |

O arquivo quase não mudou de tamanho: a refatoração não remove lógica, ela **reorganiza** a mesma lógica em partes com nome.

---

## 5. Resultados, benefícios, riscos e limitações

**Benefícios**

- **Leitura em dois níveis:** quem quer entender o fluxo lê as 7 linhas da transação. Quem precisa mexer no frete abre só `orcarPorArtesao`, sem passar pelo SQL de reserva.
- **Mudanças localizadas:** "frete grátis acima de R$ 300" passa a ser uma alteração em `orcarPorArtesao`, uma função pura que não tem como afetar a ordem dos locks.
- **Fronteira visível com o banco:** pela assinatura (recebe ou não `tx`) já se sabe se a etapa pode travar linhas ou gravar dados.
- **Base para testes unitários:** as três funções puras podem ganhar testes rápidos, sem banco, se forem exportadas no futuro.

**Riscos e limitações**

- **Mais saltos na navegação:** para ver o detalhe de uma etapa é preciso ir até a função. Para reduzir isso, as funções estão no mesmo arquivo, na ordem em que são chamadas e numeradas no comentário (1 a 7).
- **Ordem implícita:** as etapas dependem de rodar na ordem certa (reservar antes de gravar, cotar antes do endereço). Isso continua garantido só pelo corpo do `checkout`. Os testes de caracterização do CEP inválido e do item esgotado travam essa ordem: se alguém inverter as etapas, eles falham.
- **Mesmo comportamento, inclusive o questionável:** a validação do CEP continua acontecendo *depois* da reserva do estoque, dentro da transação. Seria mais barato validar o CEP antes de abrir a transação, mas isso muda quando o erro aparece e sai do escopo de uma refatoração. Fica como sugestão separada para a equipe.
- **Funções privadas não são testadas diretamente:** a cobertura delas vem pelo endpoint (`POST /api/checkout`), que é o que importa para o comportamento. Isso é uma escolha, não uma limitação técnica.

### Como validar

```sh
cd backend
npm run db:up                                            # PostgreSQL e Redis de teste (Docker)
npx jest --runInBand tests/checkout-etapas.test.ts       # caracterização do checkout
npx jest --runInBand tests/checkout-pagamentos.test.ts   # TC02, TC15, TC16 e boleto
npm test                                                 # suíte completa
npm run typecheck
```

O fluxo recomendado para provar que o comportamento foi preservado: rodar `checkout-etapas.test.ts` **no código antigo** (todos devem passar), aplicar a refatoração e rodar de novo.

---

## 6. Declaração de uso de IA

Esta intervenção foi feita com o apoio do **Claude Code** (IA da Anthropic).

| | Quem fez |
|---|---|
| Revisão do código e identificação do smell | IA, com a revisão do integrante |
| Testes de caracterização, refatoração e este relatório | IA |
| Execução dos testes, conferência do antes e depois, commit | Pedro Henrique da Silva Marrocos |
| Apresentação e defesa das decisões | Pedro Henrique da Silva Marrocos |

---

## 7. Roteiro para a apresentação (3 a 5 minutos)

1. **Smell:** abrir a versão antiga do `checkout` (`git show 171d273:backend/src/modules/compras/compras.service.ts`, linhas 161–262). Rolar a tela inteira para mostrar o tamanho e apontar os três comentários que separavam os blocos.
2. **Impacto:** perguntar "onde eu mudo o frete?" e mostrar que a resposta está no meio de uma transação, entre o SQL de reserva e o `create` da compra.
3. **Decisão:** refatorar, porque é o método mais crítico do sistema e o corte já estava marcado pelos comentários. Explicar os testes de caracterização escritos antes.
4. **Antes e depois:** mostrar o `checkout` novo (17 linhas) e a tabela de métricas.
5. **Validação:** rodar `npx jest --runInBand tests/checkout-etapas.test.ts tests/checkout-pagamentos.test.ts`.
6. **Limites:** o que ficou de fora (seção 3) e a observação sobre o CEP validado depois da reserva (seção 5).
