# Análise de code smell: série mensal de faturamento

## Parte analisada

Indicadores do artesão (HU18), no método `indicadoresArtesao` de
`backend/src/modules/relatorios/relatorios.service.ts`.

## Problema identificado

Antes da refatoração, a montagem de `faturamentoPorMes` percorria cada mês do
período e, para cada um, procurava o mês correspondente com `porMes.find(...)`.
Assim, a lista produzida pelo banco era percorrida repetidamente. É um caso de
complexidade acidental: a lógica funciona, mas escala como O(meses do período ×
meses com vendas), em vez de indexar os resultados uma única vez.

Esse trecho também tornava a intenção menos evidente: encontrar a receita de
um mês e preencher com zero quando não há registro estavam misturados na busca.

## Impactos potenciais na qualidade

- **Legibilidade:** a busca por datas dentro do laço exige acompanhar a
  comparação de ano e mês para entender uma associação simples.
- **Coesão:** a iteração da série mensal também fazia o trabalho de pesquisar
  repetidamente nos resultados, em vez de apenas montar a série.
- **Acoplamento:** o trecho não cria dependência entre módulos, mas associa a
  geração da série à representação temporal específica retornada pela consulta.
- **Manutenibilidade e extensibilidade:** futuras alterações na granularidade
  ou no preenchimento dos meses teriam que preservar uma busca aninhada e sua
  comparação de datas.
- **Desempenho:** períodos maiores aumentam o número de comparações. O intervalo
  padrão é curto, então o impacto atual tende a ser pequeno; o parâmetro aceita
  períodos maiores.

## Análise e decisão

Decidi refatorar porque a correção é localizada, mantém o formato público da
resposta e elimina trabalho repetido sem alterar as regras de negócio. Embora o
ganho no período padrão seja modesto, a alteração deixa a intenção explícita e
evita que períodos maiores ampliem desnecessariamente o custo de processamento.

## Técnica e implementação

Foi aplicada a técnica **Replace Repeated Search with a Map**: os resultados
agregados por mês são indexados uma vez pela chave UTC `AAAA-MM`. A iteração
continua gerando todos os meses do intervalo e consulta o mapa; quando não há
vendas naquele mês, os valores continuam sendo `0`.

Complexidade da associação: de O(M × V) para O(V + M), em que M é o número de
meses do intervalo e V é o número de meses com vendas.

## Preservação de comportamento e validação

A saída continua contendo um item por mês, com receita arredondada pela função
existente e pedidos iguais a zero quando não há registro. A conversão e a chave
continuam usando UTC. O endpoint existente tem cobertura para faturamento
mensal e para um período sem vendas, verificando que os meses sejam preenchidos
com zeros. Nesta intervenção, os 10 testes de `historias-restantes.test.ts`
passaram e `npm run typecheck` também foi concluído com sucesso:

```sh
cd backend
npm test -- --runTestsByPath tests/historias-restantes.test.ts
npm run typecheck
```

## Riscos e limitações

O mapa pressupõe, como a agregação SQL atual, no máximo um resultado por mês.
Como o agrupamento é por `date_trunc('month', ...)`, essa condição é garantida
pela consulta. A mudança não limita a duração do período solicitada; portanto,
períodos excepcionalmente longos ainda geram uma série proporcional ao número
de meses requisitados.
