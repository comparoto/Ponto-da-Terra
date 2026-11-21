# Comparação das rodadas

Gerado por `app/comparar.py` a partir de `logs/<rodada>/resumo.json`; cada resumo é calculado
por `app/analisar.py` sobre `cliente.jsonl`, `banco.jsonl` e `service-control-*.jsonl` da mesma pasta.

## Por rodada

Rodadas marcadas como inválidas (o cliente ficou mais de 1 s sem enviar requisições) aparecem
na tabela, mas ficam fora das médias. As que os scripts refizeram estão em `logs/_invalidas/`.

| Rodada | Válida | Estratégia | Tempo até a falha | Tempo até a recuperação | % erro total | % erro após o red-button | Banco: pedidos desperdiçados após o botão | Banco: rejeitados (503) após o botão |
|---|---|---|---|---|---|---|---|---|
| `calibracao-custo-0.1` | NÃO (pausa de 2.174 s) | sem_backoff | 2 s | 1 s | 19.56% | 3.88% | 0 | 0 |
| `sem_backoff-r1` | sim | sem_backoff | 4 s | não recuperou (> 59.9 s) | 50.68% | 58.36% | 474 | 42335 |
| `sem_backoff-r2` | sim | sem_backoff | 2 s | 51 s | 33.65% | 26.89% | 540 | 9603 |
| `sem_backoff-r3` | sim | sem_backoff | 2 s | não recuperou (> 60.0 s) | 57.85% | 66.69% | 474 | 46220 |
| `exponencial-r1` | sim | exponencial | 2 s | 4 s | 14.97% | 2.67% | 0 | 0 |
| `exponencial-r2` | sim | exponencial | 3 s | 5 s | 11.5% | 9.85% | 0 | 0 |
| `exponencial-r3` | sim | exponencial | 11 s | 8 s | 17.56% | 11.45% | 27 | 0 |
| `exponencial_jitter-r1` | sim | exponencial_jitter | 3 s | 4 s | 10.55% | 1.94% | 0 | 0 |
| `exponencial_jitter-r2` | sim | exponencial_jitter | 11 s | 3 s | 13.18% | 8.02% | 0 | 0 |
| `exponencial_jitter-r3` | sim | exponencial_jitter | 2 s | 3 s | 15.44% | 8.8% | 0 | 0 |

## Média por estratégia (e custo de carga do banco), só rodadas válidas

| Estratégia | Custo da carga no banco | Rodadas | Recuperou | Tempo até a recuperação (média das que recuperaram) | % erro após o red-button (média) | % erro total (média) |
|---|---|---|---|---|---|---|
| sem_backoff | 0.25 s | 3 | 1 de 3 | 51 s | 50.65% | 47.39% |
| exponencial | 0.25 s | 3 | 3 de 3 | 5.7 s | 7.99% | 14.68% |
| exponencial_jitter | 0.25 s | 3 | 3 de 3 | 3.3 s | 6.25% | 13.06% |
