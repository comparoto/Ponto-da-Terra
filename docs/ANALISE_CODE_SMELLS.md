# Análise e Refatoração de Code Smell - Projeto Integrador

- **Aluno(a):** Juliana Comparoto
- **Módulo analisado:** `backend/src/modules/relatorios/relatorios.service.ts`
- **Método:** `indicadoresArtesao` (HU18)

---

## 1. Revisão e Identificação de Code Smells

*   **Code Smell Identificado:** *Long Method* (Inchaço / Bloater), manifestado através de acúmulo de responsabilidades e busca repetida desnecessária.
*   **Localização:** Bloco de código responsável pela montagem da "Série mensal com zeros nos meses sem venda" no método `indicadoresArtesao`.
*   **Problema (O cenário original):** Antes da refatoração, a montagem da resposta `faturamentoPorMes` percorria cada mês do período solicitado em um laço `while`. Para *cada* mês desse período, o código utilizava `porMes.find(...)` para procurar o mês correspondente, instanciando objetos `Date` repetidamente dentro da busca. A lógica funcionava, mas misturava a responsabilidade de procurar dados com a responsabilidade de montar a série temporal.

### Impactos Potenciais na Qualidade
*   **Legibilidade:** Prejudicada. A busca por datas dentro do laço exigia acompanhar a comparação manual de ano e mês instanciando novas datas (`new Date(m.mes)`) a cada volta, ocultando a intenção real (que era apenas cruzar as informações).
*   **Coesão:** Baixa neste trecho. A iteração da série mensal acumulava duas tarefas: pesquisar repetidamente os resultados vindos do banco e montar a série final.
*   **Acoplamento:** Não criava dependência externa, mas acoplava fortemente a geração da série à representação temporal exata retornada pela consulta SQL.
*   **Manutenibilidade e Extensibilidade:** Dificultada. Futuras alterações na granularidade (ex: mudar para agrupamento semanal) exigiriam reescrever lógicas aninhadas complexas de comparação de datas.
*   **Desempenho (Complexidade Acidental):** O código original escalava como $O(M \times V)$ (onde $M$ são os meses do período e $V$ os meses com vendas no banco).

---

## 2. Análise Crítica e Decisão de Refatoração

*   **Decisão:** Refatorar. A correção era estritamente localizada, mantinha a interface e contrato do endpoint intactos e eliminava processamento ineficiente.
*   **Técnica Utilizada:** *Replace Repeated Search with a Map* (Substituição de busca repetida por indexação prévia).

### O que exatamente mudou?
Extraí a lógica de associação de dados para fora do laço principal. 
1. **Criação de um Índice:** Utilizei a estrutura `Map` do JavaScript (`dadosPorMes`) para indexar previamente os dados vindos do banco de dados, utilizando como chave uma string formatada em UTC `AAAA-MM`.
2. **Simplificação do Laço:** O laço `while` agora foca apenas em iterar sobre o período desejado, fazendo uma busca direta no mapa (`dadosPorMes.get(chave)`) que tem custo computacional instantâneo.
3. 
   **Antes:** <img width="1160" height="675" alt="before_refactor" src="https://github.com/user-attachments/assets/b36fcfdb-430f-4729-b9ef-15723782fe9e" />
   **Depois:** <img width="1832" height="759" alt="refactor" src="https://github.com/user-attachments/assets/fd6fce13-28d1-4b78-a6d7-bd7bb396fe53" />


### Por que mudou? (Benefícios)
1. **Otimização de Desempenho:** A complexidade assintótica caiu de $O(M \times V)$ para $O(V + M)$. Embora para períodos curtos (padrão) a diferença de performance seja discreta, a refatoração previne degradação caso o usuário requisite relatórios de longos períodos (anos).
2. **Clareza de Intenção:** Separou-se a "indexação" da "geração de resposta". Agora fica evidente que o código pega os dados do banco e os distribui em uma linha do tempo, preenchendo as lacunas com o valor `0` (operador `?? 0`).

---

## 3. Registro das Intervenções e Validação

A alteração não modificou nenhuma regra de negócio. A saída continua retornando os meses corretamente, preservando os arredondamentos da função `dinheiro()` e respeitando os padrões de fuso horário (UTC).

*   **Validação (Testes):** 
    *   Todos os 10 testes relacionados de histórias de usuário passaram (`npm test -- --runTestsByPath tests/historias-restantes.test.ts`).
    *   A integridade dos tipos do TypeScript foi garantida (`npm run typecheck` executado com sucesso).
    *   <img width="1062" height="177" alt="testes" src="https://github.com/user-attachments/assets/2a66ef88-bece-494b-bc63-d62e0eb8417c" />


### Riscos e Limitações
A estrutura de `Map` pressupõe no máximo um resultado do banco de dados por mês. Como a agregação original no banco utiliza `date_trunc('month', ...)`, essa unicidade já é garantida pelo SQL, tornando a abordagem 100% segura no escopo atual.

---

