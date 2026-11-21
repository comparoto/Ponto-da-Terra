# Comparação das rodadas

Gerado por `app/comparar.py` a partir de `logs/<rodada>/resumo.json`; cada resumo é calculado
por `app/analisar.py` sobre `cliente.jsonl`, `banco.jsonl` e `service-control-*.jsonl` da mesma pasta.

## Por rodada

Rodadas marcadas como inválidas (o cliente ficou mais de 1 s sem enviar requisições) aparecem
na tabela, mas ficam fora das médias. As que os scripts refizeram estão em `logs/_invalidas/`.

| Rodada | Válida | Estratégia | Tempo até a falha | Tempo até a recuperação | % erro total | % erro após o red-button | Banco: pedidos desperdiçados após o botão | Banco: rejeitados (503) após o botão |
|---|---|---|---|---|---|---|---|---|
| `calibracao-custo-0.1` | sim | sem_backoff | 2 s | 1 s | 17.85% | 1.29% | 0 | 0 |
| `sem_backoff-r1` | sim | sem_backoff | 2 s | não recuperou (> 60.0 s) | 55.32% | 60.23% | 475 | 44005 |
| `sem_backoff-r2` | sim | sem_backoff | 2 s | 40 s | 22.53% | 16.34% | 480 | 1008 |
| `sem_backoff-r3` | sim | sem_backoff | 2 s | não recuperou (> 60.0 s) | 65.5% | 74.99% | 477 | 47167 |
| `exponencial-r1` | sim | exponencial | 2 s | 2 s | 12.53% | 1.46% | 0 | 0 |
| `exponencial-r2` | sim | exponencial | 3 s | 2 s | 11.44% | 1.58% | 0 | 0 |
| `exponencial-r3` | sim | exponencial | 2 s | 8 s | 21.65% | 11.13% | 25 | 0 |
| `exponencial_jitter-r1` | sim | exponencial_jitter | 2 s | 6 s | 14.97% | 3.63% | 2 | 0 |
| `exponencial_jitter-r2` | sim | exponencial_jitter | 12 s | 11 s | 16.74% | 10.3% | 73 | 0 |
| `exponencial_jitter-r3` | sim | exponencial_jitter | 2 s | 4 s | 14.43% | 2.39% | 1 | 0 |

## Média por estratégia (e custo de carga do banco), só rodadas válidas

| Estratégia | Custo da carga no banco | Rodadas | Recuperou | Tempo até a recuperação (média das que recuperaram) | % erro após o red-button (média) | % erro total (média) |
|---|---|---|---|---|---|---|
| sem_backoff | 0.1 s | 1 | 1 de 1 | 1 s | 1.29% | 17.85% |
| sem_backoff | 0.25 s | 3 | 1 de 3 | 40 s | 50.52% | 47.78% |
| exponencial | 0.25 s | 3 | 3 de 3 | 4 s | 4.72% | 15.21% |
| exponencial_jitter | 0.25 s | 3 | 3 de 3 | 7 s | 5.44% | 15.38% |
