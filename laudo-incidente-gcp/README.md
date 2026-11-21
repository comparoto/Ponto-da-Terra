# Miniatura do incidente Google Cloud de 12/06/2025 — efeito manada no Service Control

Laudo técnico da equipe de SRE sobre o incidente
[Google Cloud, 12 jun 2025](https://status.cloud.google.com/incidents/ow5i3PPK96RduMcb1SsW):
uma política com campos em branco derrubou o Service Control em todas as regiões e,
quando as tarefas voltaram, **todas ao mesmo tempo e sem backoff**, sobrecarregaram
o banco (Spanner) e atrasaram a recuperação de us-central1.

A miniatura reproduz esse mecanismo com Docker Compose e mede o efeito de três
estratégias de nova tentativa: **sem backoff** (o caso do incidente), **backoff
exponencial** (o que o `backend/src/worker.ts` do Ponto da Terra usa) e **backoff
exponencial com jitter** (a mitigação).

- Laudo: [`LAUDO.pdf`](LAUDO.pdf)
- Registro de uso de IA: [`IA.md`](IA.md)
- Logs brutos das execuções citadas no laudo: [`logs/`](logs/)

---

## 1. Requisitos

- **Docker Desktop** (ou Docker Engine) com **Docker Compose v2**: o comando `docker compose version` precisa funcionar.
- Cerca de **1 GB de memória livre** para o Docker.
- Nada mais: as imagens usam só `python:3.12-slim` e a biblioteca padrão do Python (sem `pip install`).

## 2. Ver a falha acontecer (1 rodada, ~2 minutos)

```bash
git clone https://github.com/comparoto/Ponto-da-Terra.git
cd Ponto-da-Terra
git checkout laudo-sre-gcp
cd laudo-incidente-gcp
docker compose up --abort-on-container-exit --exit-code-from cliente
```

Na primeira vez, o Docker baixa a imagem `python:3.12-slim` (~50 MB).

O que acontece (relógio a partir de quando as 12 réplicas estão prontas):

| Tempo | Evento |
|---|---|
| 0 s – 10 s | tráfego normal: 40 requisições/s, 0% de erro |
| 10 s | o operador insere a **política com o campo de quota em branco**; as réplicas quebram com `TypeError` e entram em *crash loop* |
| 25 s | o operador aciona o **red-button** (desliga o caminho de código que lê a quota) |
| 25 s – 85 s | as réplicas tentam recarregar as políticas **todas juntas e sem backoff**: o banco enche a fila, desperdiça trabalho e a recuperação demora ou não acontece |

No fim, o container `cliente` imprime o resumo da rodada, por exemplo:

```text
Rodada manual  (estratégia: sem_backoff)
  tempo até a falha ............ 2 s   [cliente.jsonl]
  tempo até a recuperação ...... ...
  % de erro (total) ............ ...
```

Os logs ficam em `logs/manual/`. Para limpar os containers: `docker compose down`.

Para rodar **uma** rodada com outra estratégia:

```bash
# macOS / Linux / Git Bash
ESTRATEGIA=exponencial_jitter RODADA=manual-jitter docker compose up --abort-on-container-exit --exit-code-from cliente
```
```powershell
# Windows PowerShell
$env:ESTRATEGIA="exponencial_jitter"; $env:RODADA="manual-jitter"
docker compose up --abort-on-container-exit --exit-code-from cliente
Remove-Item Env:ESTRATEGIA, Env:RODADA
```

## 3. Reproduzir todas as medições do laudo (~20 minutos)

Roda os 3 cenários, 3 vezes cada, e gera `logs/comparacao.md`:

```powershell
.\rodar.ps1                       # Windows PowerShell
```
```bash
./rodar.sh                        # macOS / Linux / Git Bash
```

Para uma versão rápida (1 repetição, ~7 minutos): `.\rodar.ps1 -Repeticoes 1` ou `./rodar.sh 1`.

Cada rodada passa por um controle de qualidade: ela é **inválida** se o cliente ficou mais de 1 s
sem enviar requisições ou enviou menos de 97% das planejadas (PC suspenso, máquina sobrecarregada).
Os scripts guardam a rodada inválida em `logs/_invalidas/` e a refazem sozinhos. O `rodar.ps1`
também impede o Windows de suspender enquanto roda.

A rodada de calibração citada no laudo (custo de 0,1 s por carga, em que nem o cenário sem backoff
trava) é reproduzida assim:

```bash
# macOS / Linux / Git Bash
BANCO_CUSTO_CARGA_S=0.1 RODADA=calibracao-custo-0.1 docker compose up --abort-on-container-exit --exit-code-from cliente
```
```powershell
# Windows PowerShell
$env:BANCO_CUSTO_CARGA_S="0.1"; $env:RODADA="calibracao-custo-0.1"
docker compose up --abort-on-container-exit --exit-code-from cliente
Remove-Item Env:BANCO_CUSTO_CARGA_S, Env:RODADA
```

> Se o PowerShell bloquear o script ("execução de scripts foi desabilitada"), rode antes, na
> mesma janela: `Set-ExecutionPolicy -Scope Process Bypass`.

Os números variam um pouco de uma execução para outra (o sistema é concorrente e
depende do computador), mas a diferença entre as estratégias se repete.

## 4. Os containers

```text
            rede-api                         rede-dados
 ┌─────────┐  /check   ┌──────────────────┐  /carregar, /versao  ┌─────────┐
 │ cliente │──────────►│ service-control  │─────────────────────►│  banco  │
 │ (1x)    │           │ (12 réplicas,    │                      │  (1x)   │
 │         │           │  supervisor +    │                      │         │
 │         │           │  processo)       │                      │         │
 └────┬────┘           └──────────────────┘                      └────▲────┘
      │                  /admin/politica-com-campo-vazio, /admin/red-button  │
      └──────────────────────────────────────────────────────────────────────┘
```

| Container | Papel no incidente real | Arquivo |
|---|---|---|
| `banco` | tabela de políticas no **Spanner** regional, com capacidade limitada (2 consultas em paralelo, 0,25 s por carga, fila de até 100) | [`app/banco.py`](app/banco.py) |
| `service-control` ×12 | as **tarefas do Service Control**: carregam as políticas, quebram com o campo em branco e são reiniciadas na hora pelo supervisor | [`app/service_control.py`](app/service_control.py), [`app/supervisor.py`](app/supervisor.py) |
| `cliente` | os **clientes das APIs do Google** (40 req/s) e o **operador** que insere a política e aciona o red-button; no fim calcula as métricas | [`app/cliente.py`](app/cliente.py), [`app/analisar.py`](app/analisar.py) |

## 5. Os logs

Cada rodada grava em `logs/<rodada>/`:

| Arquivo | Conteúdo (uma linha JSON por evento) |
|---|---|
| `cliente.jsonl` | cada requisição (`req`: horário, réplica, status, latência) e os marcos `falha_injetada`, `red_button` |
| `banco.jsonl` | a cada segundo: pedidos recebidos, atendidos, **desperdiçados** (terminados depois que o cliente desistiu), rejeitados (503) e tamanho da fila |
| `service-control-<id>.jsonl` | por réplica: `processo_iniciado`, `pronta`, `crash` (com o `TypeError`), `processo_reiniciado` e tentativas de carga por segundo |
| `resumo.json` / `resumo.txt` | métricas da rodada, calculadas por `app/analisar.py` a partir dos arquivos acima (inclui o campo `valida`) |
| `serie_por_segundo.csv` | % de erro e estado do banco segundo a segundo (base do gráfico do laudo) |

Definições usadas em `app/analisar.py`:

- **tempo até a falha**: do instante em que o banco aplica a política com campo em branco até o fim do primeiro segundo com ≥ 50% de erro;
- **tempo até a recuperação**: do instante em que o banco aplica o red-button até o início do primeiro trecho de 5 s seguidos com ≤ 5% de erro;
- **% de erro**: requisições sem HTTP 200 (timeout, 503 ou conexão recusada) sobre o total.

Pastas em `logs/`:

| Pasta | O que é |
|---|---|
| `sem_backoff-r1..r3`, `exponencial-r1..r3`, `exponencial_jitter-r1..r3` | as 9 rodadas usadas no laudo |
| `calibracao-custo-0.1` | rodada de calibração citada no laudo (Parte B) |
| `comparacao.md` | tabela consolidada, gerada por `app/comparar.py` |
| `_descartadas-v1`, `_descartadas-v2` | baterias anteriores à correção dos erros descritos no `IA.md`; **não são usadas no laudo** e ficam só como evidência desses erros |

O laudo é gerado por [`laudo/gerar_laudo.py`](laudo/gerar_laudo.py), que lê os números direto desses
arquivos (nenhum é digitado à mão), e impresso em PDF a partir de `laudo/laudo.html`.

Para recalcular o resumo de uma rodada já gravada:
`docker compose run --rm --no-deps cliente python analisar.py /logs/<rodada>`.

## 6. Parâmetros

Ficam no [`docker-compose.yml`](docker-compose.yml). A estratégia vem da variável `ESTRATEGIA`
(`sem_backoff`, `exponencial` ou `exponencial_jitter`) e a pasta de log, da variável `RODADA`.
O custo de cada carga no banco pode ser trocado com `BANCO_CUSTO_CARGA_S` (padrão `0.25`).
