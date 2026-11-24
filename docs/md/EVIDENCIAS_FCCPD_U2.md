# Evidências · FCCPD Unidade 2

Índice das evidências da atividade de arquitetura distribuída, paralelismo e desempenho. Os arquivos estão em [`docs/fccpd/evidencias/`](../fccpd/evidencias) e os resultados do benchmark em [`docs/fccpd/resultados/`](../fccpd/resultados). A interpretação está no [relatório](RELATORIO_FCCPD_U2.md).

Todos os arquivos são **saídas reais de execuções**, coletadas em 24/11/2026. Nenhum contém senhas, tokens ou variáveis de ambiente (os caminhos locais foram trocados por `<repo>` onde apareciam).

## Comunicação entre os componentes

| Arquivo | O que demonstra |
|---|---|
| [`01-infraestrutura-docker.txt`](../fccpd/evidencias/01-infraestrutura-docker.txt) | PostgreSQL 16 e Redis 7 em funcionamento (contêineres, saúde, versões e a memória compartilhada ampliada). |
| [`02-backend-postgres-redis.txt`](../fccpd/evidencias/02-backend-postgres-redis.txt) | Backend → PostgreSQL (compra, pagamento e pedido gravados) e backend → Redis (chaves de cache e versão). |
| [`03-eventos-fila-worker.txt`](../fccpd/evidencias/03-eventos-fila-worker.txt) | Evento gravado na outbox e publicado, consumido pelo worker (processo separado) e ligado à notificação criada. Mostra também que o checkout e o pagamento responderam sem esperar o worker. |
| [`04-comunicacao-frontend-backend-fila.txt`](../fccpd/evidencias/04-comunicacao-frontend-backend-fila.txt) | Roteiro completo: `/api/health` (API, banco e Redis ok), cache `MISS` e `HIT`, compra pela API, chamadas HTTP do navegador à API ao abrir a vitrine e notificação criada pelo worker. Gerado por `e2e/fccpd-evidencias.cjs`. |

## Paralelismo e desempenho

| Arquivo | O que demonstra |
|---|---|
| [`demonstracao-sequencial-vs-concorrente.txt`](../fccpd/evidencias/demonstracao-sequencial-vs-concorrente.txt) | Linha do tempo real das 8 consultas do dashboard: uma de cada vez no modo sequencial (pico de 1) e todas ao mesmo tempo no concorrente (pico de 8). É uma execução ilustrativa; os valores de referência são as medianas do relatório. Gerado por `npm run demo:paralelismo`. |
| [`explain-consulta-dominante.txt`](../fccpd/evidencias/explain-consulta-dominante.txt) | Plano de execução da consulta mais lenta, que o próprio PostgreSQL já paraleliza (*Parallel Seq Scan* e *Parallel Hash Join*). |
| [`06-testes-equivalencia-sequencial-concorrente.txt`](../fccpd/evidencias/06-testes-equivalencia-sequencial-concorrente.txt) | Os 9 testes que provam que os dois modos devolvem o mesmo resultado, que o sequencial nunca sobrepõe consultas e que o concorrente dispara todas ao mesmo tempo. |
| [`benchmark-paralelismo-ultimo.json`](../fccpd/resultados/benchmark-paralelismo-ultimo.json) · [`.csv`](../fccpd/resultados/benchmark-paralelismo-resumo.csv) | Resultados brutos de 12 comparações (3 volumes × 2 períodos × 2 relatórios) com 15 repetições, e a varredura do tamanho do pool. |
| [`benchmark-carga-*.json`](../fccpd/resultados) | Carga com 1, 4 e 10 clientes simultâneos (30 s por célula). |
| [`grafico-*.png`](../fccpd/resultados) | Cinco gráficos gerados dos resultados acima (`e2e/gerar-graficos-fccpd.cjs`). |

## Qualidade

| Arquivo | O que demonstra |
|---|---|
| [`05-testes-automatizados.txt`](../fccpd/evidencias/05-testes-automatizados.txt) | Verificação de tipos, lint (que proíbe o tipo `any`), build e a suíte completa: 18 suítes e 157 testes passando. |

## Resultado negativo registrado

| Arquivo | O que demonstra |
|---|---|
| [`falha-memoria-compartilhada-carga.txt`](../fccpd/evidencias/falha-memoria-compartilhada-carga.txt) | Falha real da primeira execução da etapa de carga (`No space left on device`, memória compartilhada de 64 MB do PostgreSQL no Docker). Foi corrigida com `shm_size: 256mb` no `docker-compose.yml`. |

## Como reproduzir as evidências

```bash
# infraestrutura, API, worker e site no ar (veja o README da raiz), depois:
cd e2e && FRONT_URL=http://localhost:3002 API_URL=http://localhost:3333/api node fccpd-evidencias.cjs
cd ../backend && npm run demo:paralelismo
```
