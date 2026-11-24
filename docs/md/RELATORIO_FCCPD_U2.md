# Relatório FCCPD · Unidade 2 · Arquitetura distribuída, paralelismo e desempenho

**Projeto:** Origem: Ponto da Terra (marketplace do artesanato pernambucano) · **Disciplina:** Fundamentos de Computação Concorrente, Paralela e Distribuída · **Equipe 06** · **Data:** 24/11/2026
**Repositório:** [github.com/comparoto/Ponto-da-Terra](https://github.com/comparoto/Ponto-da-Terra) · **Branch desta entrega:** `fccpd-u2-paralelismo`

> Todos os números deste relatório vêm de execuções reais, registradas em [`docs/fccpd/resultados/`](../fccpd/resultados) (JSON e CSV) e em [`docs/fccpd/evidencias/`](../fccpd/evidencias). As limitações estão na seção 15. A atividade foi executada com apoio do Claude Code, conforme a [declaração de uso de IA](USO_DE_IA_2A_UNIDADE.md).

## 1. Identificação do projeto

O **Ponto da Terra** é uma aplicação web full stack que conecta artesãos de Pernambuco a compradores de todo o país. Tem três perfis (comprador, artesão e administrador), vitrine com busca, carrinho, checkout com pagamentos simulados, pedidos com rastreio, painéis e notificações. Detalhes em [README.md](../../README.md) e [README_BACKEND.md](README_BACKEND.md).

## 2. Objetivo da atividade

Atender aos três critérios da Unidade 2: (1) **arquitetura distribuída**, com módulos de responsabilidades claras, comunicação entre eles, diagrama e justificativa; (2) **paralelismo com ganho**, em uma tarefa real do produto, comparando a execução sequencial com a paralela; (3) **avaliação de desempenho**, com benchmark de metodologia clara e interpretação dos resultados.

## 3. Diagrama da arquitetura distribuída

![Arquitetura distribuída do Ponto da Terra](../fccpd/arquitetura.png)

Código-fonte do diagrama (Mermaid): [`docs/fccpd/arquitetura.mmd`](../fccpd/arquitetura.mmd). Linhas cheias indicam fluxo síncrono (HTTP, SQL, Redis) e linhas tracejadas indicam fluxo assíncrono (eventos). O diagrama mostra apenas componentes que existem no código e distingue o ambiente **local** (BullMQ e worker) do de **produção** na Vercel (QStash, e a própria API como consumidor).

## 4. Justificativa da separação dos módulos e serviços

O sistema **não é um conjunto de microsserviços**: é um monólito modular em camadas, com poucos pontos de separação, cada um justificado por uma razão técnica.

| Componente | Responsabilidade | Por que está separado |
|---|---|---|
| **Frontend** (Next.js) | Telas, estado do cliente e acesso à API por `src/services` | A interface muda por motivos diferentes das regras de negócio e é publicada de forma independente. Os componentes só conhecem o contrato `ApiResult<T>`, o que permitiu trocar a Fake API pela API real sem reescrever as telas. |
| **Backend** (Express) | Regras de negócio, autorização e validação, em módulos (rota → serviço) | Concentrar as regras no servidor é obrigatório para a segurança: o cliente não é confiável (preço, perfil e estoque são conferidos no servidor). |
| **PostgreSQL** | Persistência e consistência transacional | O estoque exige **uma transação única** (`UPDATE` condicional mais `CHECK`), e o modelo é relacional (compra, pedidos, itens, pagamentos). |
| **Redis** | Cache da vitrine e ranking de termos buscados; filas locais (BullMQ) | Leituras repetidas da vitrine não devem sobrecarregar o banco; é um armazenamento em memória, adequado a dados descartáveis. |
| **Fila e worker** | Notificações, e-mail simulado, otimização de imagens e expiração de reservas | Trabalhos lentos ou que podem falhar não devem atrasar a resposta ao comprador. O worker é um processo separado para escalar e falhar de forma independente. |
| **Módulo de relatórios** | Agregações do administrador e do artesão, executadas em paralelo | São consultas independentes entre si, o que permite executá-las ao mesmo tempo (seção 6). |

**Por que não microsserviços:** a transação do estoque e a compra dividida em pedidos exigem consistência forte no mesmo banco, e dividir o domínio em serviços adicionaria rede, deploy múltiplo e consistência distribuída sem benefício para o escopo e a equipe (sete pessoas, um semestre).

## 5. Comunicação entre componentes

| De → Para | Protocolo | Onde está no código |
|---|---|---|
| Navegador → Frontend | HTTPS | Next.js (Vercel) |
| Frontend → Backend | HTTP/REST, JSON e JWT no cabeçalho | `src/services/http.ts` → `backend/src/app.ts` |
| Backend → PostgreSQL | SQL pelo Prisma 7 e driver `pg`, com pool de conexões | `backend/src/config/prisma.ts` |
| Backend → Redis | Protocolo Redis (`ioredis`): cache e `zrevrange` | `backend/src/shared/cache.ts`, `relatorios.service.ts` |
| Backend → fila | Evento gravado na **outbox**, na mesma transação da operação | `backend/src/shared/eventos.ts` |
| Relay → fila | BullMQ (local) ou QStash por HTTP (Vercel) | `backend/src/jobs/outbox.ts`, `serverless.ts` |
| Fila → Worker/consumidor | BullMQ (local) ou `POST /api/jobs/evento` (Vercel) | `backend/src/worker.ts`, `modules/jobs` |
| Consumidor → PostgreSQL, SMTP, armazenamento | SQL, SMTP e SDK de armazenamento | `jobs/processar-evento.ts`, `processar-imagem.ts` |

As evidências de execução dessa comunicação estão na seção 17.

## 6. Funcionalidade paralela implementada

**Tarefa real escolhida:** os relatórios do produto, que já existiam: o **dashboard do administrador** (HU9, 8 consultas independentes: 7 no PostgreSQL e 1 no Redis) e os **indicadores do artesão** (HU18, 5 consultas independentes no PostgreSQL). Eles foram escolhidos porque são tarefas do produto, com várias consultas **sem dependência entre si**.

**Uma dependência preservada:** no dashboard, a consulta dos *nomes* dos artesãos do ranking depende do resultado de `porArtesao`. Ela foi mantida **depois** do grupo e não foi paralelizada.

**Como foi implementado.** O código de [`backend/src/shared/execucao.ts`](../../backend/src/shared/execucao.ts) oferece `executarGrupo(tarefas, { modo })`. As consultas são passadas como funções (para o início de cada uma poder ser adiado) e rodam em dois modos, com **a mesma lógica de negócio**:

- **`sequencial`:** cada tarefa só inicia depois que a anterior termina (linha de base do benchmark).
- **`concorrente`** (padrão, e o que a API usa): todas são disparadas ao mesmo tempo com `Promise.all`.

O serviço ([`relatorios.service.ts`](../../backend/src/modules/relatorios/relatorios.service.ts)) recebe o modo como parâmetro opcional. As rotas da API não passam nada, então **o comportamento e o contrato HTTP não mudaram**. Os rankings ganharam desempate explícito por id, para a ordem ser determinística nos dois modos.

![Execução sequencial e concorrente do relatório](../fccpd/paralelismo.png)

**Concorrência assíncrona não é o mesmo que paralelismo computacional.** O Node.js executa o JavaScript em **uma thread**. O `Promise.all` apenas dispara as consultas e espera todas ao mesmo tempo (concorrência assíncrona de E/S). O **paralelismo real** acontece fora do processo Node: cada consulta usa uma conexão diferente do pool, e o PostgreSQL atende cada conexão em **um processo próprio**, em núcleos diferentes. Por isso:

- com pool de **1 conexão**, `Promise.all` não tem como paralelizar, e o ganho some (seção 11, tabela 2);
- usar `Promise.all` não é, por si só, evidência de paralelismo. A sobreposição foi **medida** de duas formas: no cliente (início e fim de cada consulta) e no servidor (processos ativos em `pg_stat_activity`).

## 7. Arquivos e trechos de código

| Arquivo | O que contém |
|---|---|
| [`backend/src/shared/execucao.ts`](../../backend/src/shared/execucao.ts) | `executarGrupo` (modos sequencial e concorrente) e `picoDeSobreposicao` |
| [`backend/src/modules/relatorios/relatorios.service.ts`](../../backend/src/modules/relatorios/relatorios.service.ts) | `dashboardAdmin` e `indicadoresArtesao`, com as consultas passadas ao `executarGrupo` |
| [`backend/src/config/prisma.ts`](../../backend/src/config/prisma.ts) | Pool de conexões (10 no local, 3 na Vercel); `DB_POOL_MAX` só para os experimentos |
| [`backend/tests/relatorios-modos.test.ts`](../../backend/tests/relatorios-modos.test.ts) | 9 testes de equivalência e de sobreposição |
| [`backend/scripts/benchmark-paralelismo.ts`](../../backend/scripts/benchmark-paralelismo.ts) | Benchmark automatizado (`npm run benchmark:paralelismo`) |
| [`backend/scripts/demonstrar-paralelismo.ts`](../../backend/scripts/demonstrar-paralelismo.ts) | Demonstração visual para a apresentação (`npm run demo:paralelismo`) |
| [`backend/docker-compose.yml`](../../backend/docker-compose.yml) | PostgreSQL 16 e Redis 7; `shm_size` do PostgreSQL ampliado (seção 15) |

## 8. Metodologia do benchmark

- **O que se compara:** `dashboardAdmin` e `indicadoresArtesao`, sequencial × concorrente, **a mesma lógica e os mesmos dados**.
- **Dados:** sintéticos e **determinísticos** (a mesma sequência em toda execução, gerada por SQL com `hashtext`), em um banco **isolado** (`pontodaterra_bench`, local). O script **recusa** rodar em qualquer banco cujo nome não termine em `_bench`. Nada é alterado em desenvolvimento ou produção.
- **Aquecimento:** 3 execuções de cada modo, descartadas.
- **Repetições:** 15 por célula, com a **ordem dos modos alternada** a cada repetição (para não favorecer um modo pelo cache do banco).
- **Equivalência:** o resultado dos dois modos é comparado em **toda** repetição (ignorando o campo de tempo medido). Divergências encontradas: **0**.
- **Métricas:** média, mediana, p95, desvio-padrão, mínimo e máximo do tempo de resposta; vazão (relatórios por segundo); *speedup* e redução percentual.
- **Fórmulas:** *speedup* = tempo sequencial ÷ tempo concorrente. Redução percentual = (sequencial − concorrente) ÷ sequencial × 100. As tabelas usam a **mediana**, mais robusta a valores atípicos.
- **Sobreposição:** no cliente, pelo início e o fim de cada consulta; no servidor, por uma conexão separada que consulta `pg_stat_activity` enquanto o relatório roda.
- **Variações estudadas:** três volumes de dados, dois períodos (12 meses e 1 mês), quatro tamanhos de pool (1, 2, 4 e 10) e carga com 1, 4 e 10 clientes simultâneos.
- **Ferramentas:** Node.js e TypeScript (`tsx`), Prisma, `pg`, Docker, PostgreSQL e Redis. Não há atrasos artificiais no código.

## 9. Ambiente de execução

| Item | Valor |
|---|---|
| Máquina | Notebook com Intel Core i7-1355U (12 threads), 15,7 GB de RAM, Windows 11 (win32 10.0.26200) |
| Docker | Docker 29.8.2, com 12 CPUs e 8 GB de memória para os contêineres |
| Banco | PostgreSQL 16.15 em contêiner (`max_connections` 100, `shared_buffers` 128 MB, `work_mem` 4 MB, `max_parallel_workers_per_gather` 2) |
| Cache | Redis 7 em contêiner (db 2, só para o benchmark) |
| Aplicação | Node.js v24.22.0; Prisma 7.10.1; pool de **10** conexões por instância |
| Data | 24/11/2026 |

## 10. Volume de dados e repetições

| Volume | Pedidos | Itens de pedido | Outros dados |
|---|---|---|---|
| Pequeno | 20.000 | 60.000 | 200 artesãos, 4.000 produtos, 5.000 compradores |
| Médio | 100.000 | 300.000 | (os mesmos) |
| Grande | 300.000 | 900.000 | (os mesmos) |

Os pedidos se distribuem por 12 meses (dezembro de 2025 a novembro de 2026) e por 6 status (5% aguardando pagamento, 5% cancelado, 15% pago, 15% em produção, 15% despachado e 45% entregue). O período "12 meses" lê todos os dados e o "1 mês" lê cerca de 1/12 deles. Foram feitas **15 repetições por célula**, com 3 de aquecimento.

## 11. Resultados

**Tabela 1 · Sequencial × concorrente** (mediana de 15 repetições, em ms; o limite é a soma das consultas ÷ a mais lenta, em modo sequencial):

| Pedidos | Relatório | Período | Sequencial | Concorrente | *Speedup* | Redução | p95 seq. → conc. | Limite |
|---:|---|---|---:|---:|---:|---:|---:|---:|
| 20.000 | Dashboard | 12 meses | 140,9 | 79,4 | **1,77×** | 43,6% | 198,8 → 131,0 | 2,67× |
| 20.000 | Indicadores | 12 meses | 30,2 | 15,2 | **1,99×** | 49,7% | 67,8 → 18,6 | 2,73× |
| 20.000 | Dashboard | 1 mês | 45,0 | 30,4 | **1,48×** | 32,4% | 92,7 → 63,2 | 2,57× |
| 20.000 | Indicadores | 1 mês | 24,0 | 10,6 | **2,26×** | 55,8% | 36,7 → 16,7 | 2,72× |
| 100.000 | Dashboard | 12 meses | 486,1 | 281,9 | **1,72×** | 42,0% | 643,9 → 503,7 | 1,92× |
| 100.000 | Indicadores | 12 meses | 67,1 | 45,0 | **1,49×** | 32,9% | 115,2 → 77,1 | 2,29× |
| 100.000 | Dashboard | 1 mês | 126,0 | 74,1 | **1,70×** | 41,2% | 140,7 → 86,7 | 1,74× |
| 100.000 | Indicadores | 1 mês | 75,8 | 42,6 | **1,78×** | 43,8% | 100,6 → 59,6 | 2,25× |
| 300.000 | Dashboard | 12 meses | 1.334,2 | 923,3 | **1,45×** | 30,8% | 1.748,5 → 1.268,1 | 1,63× |
| 300.000 | Indicadores | 12 meses | 182,3 | 108,9 | **1,67×** | 40,3% | 303,9 → 187,0 | 2,12× |
| 300.000 | Dashboard | 1 mês | 221,5 | 158,1 | **1,40×** | 28,6% | 304,7 → 253,9 | 1,48× |
| 300.000 | Indicadores | 1 mês | 183,4 | 106,7 | **1,72×** | 41,8% | 404,8 → 216,9 | 2,11× |

Em todas as 12 células houve **0 divergências** de resultado entre os modos, e o número de consultas simultâneas medido no cliente foi **1** no sequencial e **8** (dashboard) ou **5** (indicadores) no concorrente, o que comprova a sobreposição. A tabela completa (média, desvio-padrão, mínimo e máximo) está em [`benchmark-paralelismo-ultimo.json`](../fccpd/resultados/benchmark-paralelismo-ultimo.json) e no [CSV](../fccpd/resultados/benchmark-paralelismo-resumo.csv).

**Tabela 2 · Efeito do tamanho do pool de conexões** (dashboard, 12 meses, 300 mil pedidos, 15 repetições por pool):

| Pool | Sequencial (ms) | Concorrente (ms) | *Speedup* | Redução | Pico de processos ativos no PostgreSQL |
|---:|---:|---:|---:|---:|---:|
| 1 | 1.370,1 | 1.322,8 | 1,04× | 3,5% | 3 |
| 2 | 1.356,2 | 1.057,8 | 1,28× | 22,0% | 6 |
| 4 | 1.312,3 | 883,9 | **1,48×** | 32,6% | 10 |
| 10 | 1.294,3 | 901,4 | 1,44× | 30,4% | 9 |

**Tabela 3 · Vários clientes simultâneos** (dashboard, 12 meses, 300 mil pedidos; **uma execução** de 30 s por célula, sem erros):

| Clientes | Modo | Relatórios concluídos | Relatórios/s | Latência mediana (ms) | Latência p95 (ms) |
|---:|---|---:|---:|---:|---:|
| 1 | sequencial | 23 | 0,75 | 1.316 | 1.409 |
| 1 | concorrente | 33 | 1,08 | 896 | 1.075 |
| 4 | sequencial | 43 | 1,34 | 2.891 | 3.517 |
| 4 | concorrente | 36 | 1,10 | 2.656 | 6.623 |
| 10 | sequencial | 30 | 0,88 | 9.351 | 16.423 |
| 10 | concorrente | 39 | 1,14 | 6.976 | 13.798 |

## 12. Gráficos

![Tempo por volume de dados](../fccpd/resultados/grafico-1-tempo-por-volume.png)

![Speedup por relatório e volume](../fccpd/resultados/grafico-2-speedup.png)

![Efeito do pool de conexões](../fccpd/resultados/grafico-3-pool-de-conexoes.png)

![Vazão com vários clientes](../fccpd/resultados/grafico-4-carga-vazao.png)

![Latência p95 com vários clientes](../fccpd/resultados/grafico-5-carga-latencia-p95.png)

## 13. *Speedup* e redução percentual

Para um cliente isolado, o modo concorrente reduziu o tempo dos relatórios entre **28,6% e 55,8%**, com *speedup* de **1,40× a 2,26×**. No caso mais pesado (dashboard de 12 meses com 300 mil pedidos), o tempo caiu de **1.334 ms para 923 ms (1,45×, redução de 30,8%)**. Nos indicadores do artesão, o ganho ficou entre 1,49× e 2,26×.

## 14. Interpretação dos resultados

1. **O ganho é real e vem de usar várias conexões ao mesmo tempo.** Com pool de 1 conexão, o ganho praticamente desaparece (1,04×); com 2, 4 e 10 conexões ele sobe para 1,28×, 1,48× e 1,44×. Isso confirma que o benefício depende de o PostgreSQL receber as consultas em conexões diferentes, e não do `Promise.all` em si.
2. **O ganho é limitado pela consulta mais lenta (lei de Amdahl).** O tempo concorrente não pode ser menor que o da consulta mais demorada. No dashboard com 300 mil pedidos, `maisVendidas` leva em média 810 ms de um total sequencial de 1.323 ms (61%); por isso o limite teórico é 1,63× e o ganho medido foi 1,45×, ou seja, 89% do que seria possível. Com 20 mil pedidos, as consultas são curtas e equilibradas (limite 2,67×) e o ganho medido foi 1,77×.
3. **O ganho diminui com o volume de dados** (de 1,77× para 1,45× no dashboard de 12 meses), porque uma consulta passa a dominar o tempo total e porque as consultas disputam recursos: no modo concorrente, cada consulta individual fica **mais lenta** do que sozinha (por exemplo, `receita` passa de 169 ms para 285 ms e `maisVendidas` de 810 ms para 920 ms), já que dividem CPU, memória e disco. A [demonstração](../fccpd/evidencias/demonstracao-sequencial-vs-concorrente.txt) mostra isso em uma linha do tempo real.
4. **O PostgreSQL já paraleliza por conta própria a consulta dominante.** O plano de execução ([evidência](../fccpd/evidencias/explain-consulta-dominante.txt)) usa *Parallel Seq Scan* e *Parallel Hash Join* com 3 processos (`max_parallel_workers_per_gather` = 2). Há, portanto, dois níveis de paralelismo competindo pelos mesmos núcleos: o **entre consultas** (nossa implementação) e o **dentro da consulta** (do banco). Isso ajuda a explicar por que o ganho não chega ao limite teórico e por que o pico de processos ativos (até 10) passa do número de consultas.
5. **Sob carga com vários clientes o resultado não é conclusivo.** O modo concorrente foi melhor com 1 e 10 clientes e pior com 4 (menor vazão e p95 de 6.623 ms contra 3.517 ms). Quando vários clientes já mantêm o banco ocupado, o paralelismo dentro de cada pedido não cria capacidade nova: o trabalho total é o mesmo e o banco satura em torno de 1 relatório por segundo. Esse teste foi **uma única execução de 30 s por célula**, então as diferenças entre modos sob carga estão dentro do ruído esperado e **não devem ser lidas como ganho ou perda comprovados**. A conclusão segura é que o paralelismo reduz a **latência de um pedido isolado** e que **não aumenta a capacidade total** do banco.
6. **Relação com as decisões arquiteturais.**
   - O pool de **10** conexões local e de **3** na Vercel foi escolhido para não esgotar as conexões do PostgreSQL (e do pooler do Neon). Os resultados mostram que, a partir de 4 conexões, o ganho deste relatório se estabiliza (1,48× e 1,44×); com 3, o valor esperado fica entre os medidos para 2 e 4 (**3 conexões não foram medidas diretamente**).
   - O paralelismo foi aplicado onde as tarefas são **independentes e de E/S** (consultas ao banco), e não onde há dependência (nomes dos artesãos). A estratégia complementa o **cache da vitrine**, que ataca outro problema: reduzir o trabalho repetido. No benchmark do cache (execução de 22/11/2026, em [`EVIDENCIAS_AVALIACAO_2.md`](EVIDENCIAS_AVALIACAO_2.md)), a mesma consulta teve 145 req/s com cache contra 27 req/s sem cache.
   - A fila assíncrona e o worker (seção 4) tiram do caminho da resposta o que é lento e pode falhar, o que reduz a latência percebida de outra forma.

## 15. Limitações

- **Uma máquina só.** Cliente, API, PostgreSQL e Redis rodam no mesmo notebook (Docker sobre Windows/WSL), então as consultas disputam os mesmos núcleos. Em produção, banco e API ficam em máquinas separadas e há latência de rede, o que muda os valores absolutos. Os números valem como **comparação entre os modos**, não como capacidade de produção.
- **Dados sintéticos.** O conjunto é determinístico e regular (distribuição uniforme), diferente de dados reais.
- **O ganho é pequeno em termos absolutos nos volumes menores** (dezenas de milissegundos), onde o ruído é relativamente maior.
- **Teste de carga com uma execução por célula** (seção 14, item 5). Não permite concluir ganho ou perda sob carga.
- **O pico de processos ativos** vem de amostragens de `pg_stat_activity` e conta também os *workers* paralelos do próprio PostgreSQL, então não é igual ao número de conexões do pool.
- **Falha encontrada e corrigida:** na primeira execução da etapa de carga, o PostgreSQL do Docker respondeu `No space left on device` (erro 53100), porque a memória compartilhada (`/dev/shm`) tem 64 MB por padrão e as consultas paralelas simultâneas a esgotaram ([registro](../fccpd/evidencias/falha-memoria-compartilhada-carga.txt)). Foi corrigido com `shm_size: 256mb` no `docker-compose.yml`, e todos os resultados deste relatório foram coletados depois da correção. Também houve uma queda esporádica de conexão (`ECONNRESET`) em uma execução anterior, que levou a uma repetição automática das chamadas interrompidas; na execução final, o contador de repetições foi **0**.
- **Tamanho do pool 3 (Vercel) não medido** diretamente, e não houve medição em produção.
- **Não foram alterados índices nem o esquema do banco.** O plano de execução mostra uma leitura sequencial de cerca de 900 mil itens, que um índice não evitaria, pois a consulta lê a maior parte da tabela.

## 16. Conclusão

A aplicação está organizada em módulos com responsabilidades claras (frontend, backend em camadas, banco, cache, fila e worker), que se comunicam por HTTP, SQL, Redis e eventos com *Transactional Outbox*, sem transformar o sistema em microsserviços artificiais. Foi implementado e medido o paralelismo nos relatórios do produto: executar as consultas independentes ao mesmo tempo reduziu o tempo de um relatório isolado entre **28,6% e 55,8%** (1,40× a 2,26×), com resultados **idênticos** aos da execução sequencial. O ganho depende do número de conexões, é limitado pela consulta mais lenta e diminui com o volume de dados, e **não** aumenta a capacidade total do banco sob carga. Esses limites são consequência da arquitetura (um banco único e um pool pequeno) e orientam as decisões seguintes: o paralelismo é adequado para reduzir a latência de pedidos isolados, e o cache e a fila são os recursos para reduzir trabalho e aliviar o caminho da resposta.

## 17. Referências para as evidências

| Evidência | Onde está |
|---|---|
| Resultados brutos (JSON e CSV) e gráficos | [`docs/fccpd/resultados/`](../fccpd/resultados) |
| Infraestrutura em funcionamento (PostgreSQL e Redis) | [`01-infraestrutura-docker.txt`](../fccpd/evidencias/01-infraestrutura-docker.txt) |
| Backend → PostgreSQL e Redis (cache `MISS`/`HIT`) | [`02-backend-postgres-redis.txt`](../fccpd/evidencias/02-backend-postgres-redis.txt) |
| Evento na fila, consumo pelo worker e notificação | [`03-eventos-fila-worker.txt`](../fccpd/evidencias/03-eventos-fila-worker.txt) |
| Frontend → Backend e fluxo completo | [`04-comunicacao-frontend-backend-fila.txt`](../fccpd/evidencias/04-comunicacao-frontend-backend-fila.txt) |
| Tipos, lint, build e os 157 testes | [`05-testes-automatizados.txt`](../fccpd/evidencias/05-testes-automatizados.txt) |
| Testes de equivalência sequencial × concorrente | [`06-testes-equivalencia-sequencial-concorrente.txt`](../fccpd/evidencias/06-testes-equivalencia-sequencial-concorrente.txt) |
| Linha do tempo das consultas (sequencial e concorrente) | [`demonstracao-sequencial-vs-concorrente.txt`](../fccpd/evidencias/demonstracao-sequencial-vs-concorrente.txt) |
| Plano de execução da consulta dominante | [`explain-consulta-dominante.txt`](../fccpd/evidencias/explain-consulta-dominante.txt) |
| Falha de memória compartilhada (registro) | [`falha-memoria-compartilhada-carga.txt`](../fccpd/evidencias/falha-memoria-compartilhada-carga.txt) |
| Índice completo das evidências | [`EVIDENCIAS_FCCPD_U2.md`](EVIDENCIAS_FCCPD_U2.md) |

## Como reproduzir

```bash
# Pré-requisitos: Docker (PostgreSQL e Redis), Node.js 22
cd backend && npm install && npm run db:up
docker exec ponto-da-terra-postgres psql -U pdt -d pontodaterra -c "CREATE DATABASE pontodaterra_bench"
DATABASE_URL="postgresql://pdt:pdt@localhost:5434/pontodaterra_bench?schema=public" DATABASE_URL_UNPOOLED="$DATABASE_URL" npx prisma migrate deploy

npm run benchmark:paralelismo                       # benchmark completo (cerca de 10 minutos)
npm run benchmark:paralelismo -- --rapido           # teste rápido (2 minutos)
npm run benchmark:paralelismo -- --fase=carga --escalas=300000 --duracao-carga=30 --clientes=1,4,10
npm run demo:paralelismo                            # demonstração visual (linha do tempo das consultas)
npx jest --runInBand tests/relatorios-modos.test.ts # testes de equivalência
cd ../e2e && node gerar-graficos-fccpd.cjs          # gráficos a partir dos resultados
```

**Para a apresentação oral:** rodar `npm run demo:paralelismo` (30 segundos) e mostrar a linha do tempo dos dois modos; abrir o diagrama (seção 3) e a tabela 2 (efeito do pool); e citar a limitação da seção 15.
