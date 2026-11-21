# Comparação das rodadas

Gerado por `app/comparar.py` a partir de `logs/<rodada>/resumo.json`; cada resumo é calculado
por `app/analisar.py` sobre `cliente.jsonl`, `banco.jsonl` e `service-control-*.jsonl` da mesma pasta.

## Por rodada

| Rodada | Estratégia | Tempo até a falha | Tempo até a recuperação | % erro total | % erro após o red-button | Banco: pedidos desperdiçados após o botão | Banco: rejeitados (503) após o botão |
|---|---|---|---|---|---|---|---|
| `calibracao-custo-0.1` | sem_backoff | 2 s | 9 s | 21.18% | 6.25% | 0 | 0 |
| `sem_backoff-r1` | sem_backoff | 2 s | 46 s | 36.71% | 29.71% | 494 | 9259 |
| `sem_backoff-r2` | sem_backoff | 2 s | não recuperou (> 61.5 s) | 58.03% | 66.67% | 481 | 43765 |
| `sem_backoff-r3` | sem_backoff | 2 s | não recuperou (> 61.5 s) | 79.32% | 91.67% | 482 | 44267 |
| `exponencial-r1` | exponencial | 3 s | 2 s | 11.47% | 1.79% | 0 | 0 |
| `exponencial-r2` | exponencial | 2 s | 6 s | 20.97% | 6.67% | 1 | 0 |
| `exponencial-r3` | exponencial | 2 s | 12 s | 22.53% | 12.58% | 34 | 0 |
| `exponencial_jitter-r1` | exponencial_jitter | 2 s | 6 s | 11.71% | 2.88% | 7 | 0 |
| `exponencial_jitter-r2` | exponencial_jitter | 2 s | 3 s | 15.0% | 1.79% | 0 | 0 |
| `exponencial_jitter-r3` | exponencial_jitter | 2 s | 4 s | 9.85% | 1.96% | 1 | 0 |

## Média por estratégia (e custo de carga do banco)

| Estratégia | Custo da carga no banco | Rodadas | Recuperou | Tempo até a recuperação (média das que recuperaram) | % erro após o red-button (média) | % erro total (média) |
|---|---|---|---|---|---|---|
| sem_backoff | 0.1 s | 1 | 1 de 1 | 9 s | 6.25% | 21.18% |
| sem_backoff | 0.25 s | 3 | 1 de 3 | 46 s | 62.68% | 58.02% |
| exponencial | 0.25 s | 3 | 3 de 3 | 6.7 s | 7.01% | 18.32% |
| exponencial_jitter | 0.25 s | 3 | 3 de 3 | 4.3 s | 2.21% | 12.19% |
