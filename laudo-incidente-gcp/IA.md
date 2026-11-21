# Registro de uso de IA

**Ferramenta:** Claude Code (Anthropic), usado no VS Code com acesso ao repositório e ao Docker local.

**Para que usamos:** escolher o artigo a partir do código do nosso projeto, ler o
relatório do Google e separar citações literais, escrever o código da miniatura e
dos scripts, e revisar o texto do laudo.

**O que veio só das nossas execuções:** todos os números do laudo. Eles saem dos
arquivos brutos em [`logs/`](logs/), gerados pelo `docker compose` na nossa máquina,
e são calculados por [`app/analisar.py`](app/analisar.py) e [`app/comparar.py`](app/comparar.py).

---

## 1. Prompts mais importantes

### Prompt 1 — escolha do artigo
> "Antes de fazer, escolha o melhor artigo da lista para o nosso caso."

- **O que a IA fez:** comparou os artigos 1, 2 e 3 pela facilidade de reproduzir com 3
  containers, pelo encaixe com um conceito da disciplina e, principalmente, por
  procurar no código do Ponto da Terra um trecho com o mesmo mecanismo. Achou
  `backend/src/worker.ts:28` (backoff exponencial sem jitter) e recomendou o artigo 2 (Google Cloud).
- **Aceitamos** o artigo 2.
- **Descartamos** a segunda opção sugerida (AWS, condição de corrida). O checkout do
  projeto já se protege com `FOR UPDATE` e `UPDATE` condicional, então o parecer da
  Parte D ficaria mais fraco.

### Prompt 2 — citações do artigo
> "Leia o relatório do Google e traga as frases literais, com os horários, para a linha do tempo."

- **O que a IA fez:** leu a página oficial e devolveu as frases literais de cada evento,
  com a seção onde aparecem.
- **Aceitamos** só as citações conferidas na página.
- **Mudamos** a linha do tempo para não inventar o que o artigo não diz. O relatório não dá
  o horário exato em que os crashes começaram, então usamos os intervalos que ele dá
  ("Within 2 minutes", "Within 10 minutes", "~25 minutes", "Within 40 minutes").
- **Registramos no laudo** que o próprio artigo traz horários diferentes para o início
  (10:45, 10:49 e 10:51) e para o fim (13:49 e 18:18) do incidente.

### Prompt 3 — a miniatura
> "Monte com Docker Compose uma miniatura que mostre o efeito manada do incidente e meça
> tempo até a falha, tempo até a recuperação e porcentagem de requisições com erro."

- **O que a IA fez:** propôs 3 serviços (`banco`, `service-control` com 12 réplicas e
  `cliente`), escritos em Python sem dependências, com log JSON Lines e um script de análise.
- **Aceitamos** a arquitetura e o banco simulado (fila e capacidade controladas), em vez de
  um Postgres real. Essa escolha está nas limitações do laudo.
- **Mudamos** a calibração, o log e a análise depois de rodar (erros 1, 4 e 5 abaixo).

### Prompt 4 — o parecer (Parte D)
> "Procure no nosso projeto onde o mesmo mecanismo poderia aparecer, com arquivo e trecho."

- **O que a IA fez:** encontrou `src/app/(comprador)/compra/[codigo]/page.tsx:46-51`
  (consulta a cada 4 s, com intervalo fixo, mesmo com erro) e `backend/src/worker.ts:28`.
- **Aceitamos** os dois trechos.
- **Conferimos** no código-fonte do BullMQ 6.7.4 (a versão do `backend/package.json`)
  que a opção `jitter` existe e vale 0 por padrão, antes de recomendar a correção.

### Prompt 5 — revisão do laudo
> "Revise o laudo: no máximo 6 páginas, e todo número precisa apontar para um arquivo de logs/."

- **O que a IA fez:** gerou o laudo lendo os números direto de `logs/*/resumo.json`, para
  não haver erro de digitação, e indicou o arquivo de origem de cada número.
- **Aceitamos** a estrutura.
- **Mudamos** o texto onde ele afirmava mais do que medimos. Por exemplo, a vantagem do
  jitter sobre o exponencial puro aparece no laudo como pequena e com variação.

---

## 2. Erros da IA encontrados ao rodar o código

### Erro 1 — a primeira calibração não produzia efeito manada
- **O que aconteceu:** a primeira versão usava 0,1 s por carga no banco. Ao rodar, o banco
  nunca encheu a fila: nenhum pedido foi desperdiçado e a recuperação foi rápida mesmo
  **sem backoff**. A miniatura não mostrava o mecanismo do incidente. A explicação: o
  reinício de um processo Python leva centenas de milissegundos, e isso limitou a
  demanda abaixo da capacidade do banco.
- **Evidência:** a rodada `logs/calibracao-custo-0.1/` reproduz essa configuração
  (veja `resumo.json`: `banco_apos_red_button.desperdicadas`).
- **Correção:** custo de 0,25 s por carga (capacidade de 8 cargas/s, abaixo da demanda das
  12 réplicas). Isso criou outro problema: as réplicas se afogavam já na subida inicial.
  Por isso, a primeira partida de cada réplica passou a ser escalonada em até 8 s,
  como num deploy gradual (`app/supervisor.py`).

### Erro 2 — o `rodar.ps1` mostrava erros vermelhos falsos no Windows
- **O que aconteceu:** no Windows PowerShell 5.1, o progresso que o `docker compose`
  escreve no stderr virava `NativeCommandError` em vermelho, embora o experimento
  estivesse rodando normalmente.
- **Correção:** `2>$null` nas chamadas do `docker compose` dentro do script.

### Erro 3 — o filtro com acento do `rodar.ps1` não funcionava
- **O que aconteceu:** o PowerShell 5.1 lê um `.ps1` salvo em UTF-8 sem BOM como ANSI. O
  padrão `réplicas` virava `rÃ©plicas` e as linhas "réplicas prontas" e "banco após"
  sumiam da saída. Achamos rodando o script numa cópia limpa da pasta.
- **Correção:** padrões só com letras sem acento (`plicas prontas`, `banco ap`).

### Erro 4 — o cliente parava de enviar requisições (e o primeiro diagnóstico da IA estava errado)
- **O que aconteceu:** em algumas rodadas, **o cliente ficou vários segundos sem enviar
  nada**, o que distorce a % de erro e o tempo até a recuperação.
- **Evidência da 1ª bateria:** em `logs/_descartadas-v1/exponencial-r2/` e
  `logs/_descartadas-v1/calibracao-custo-0.1/`, o evento `red_button` de `cliente.jsonl`
  e o `red_button_acionado` de `banco.jsonl` estão 4,15 s e 7,00 s afastados.
- **1º diagnóstico (errado):** a IA concluiu que a causa era o pedido do operador ao banco,
  feito no mesmo laço que gera o tráfego. A "correção" foi passar esse pedido para uma
  thread. Também passamos a medir a partir do instante em que o banco aplica a mudança
  (campo `atraso_do_operador`) e criamos o campo `maior_pausa_no_envio_s`.
- **O que mostrou o erro:** na 2ª bateria as pausas continuaram, por exemplo 8,913 s em
  `logs/_descartadas-v2/exponencial-r2/resumo.json` (`maior_pausa_no_envio_s`). Medindo onde
  elas aconteciam, vimos que caíam **sempre** no instante da injeção ou do red-button, nunca
  em outro momento. Era nesses instantes que o cliente gravava uma linha de log e as 12
  réplicas despejavam linhas de log ao mesmo tempo.
- **Causa real:** os logs eram gravados de forma síncrona numa pasta do Windows
  compartilhada com o Docker. Numa rajada de escrita, a gravação travava por segundos e o
  cliente parava junto.
- **Correção:**
  - log assíncrono: quem registra só põe a linha numa fila, e uma thread separada grava no
    disco (`app/comum.py`);
  - regra de validade em `app/analisar.py`: a rodada é inválida se o cliente ficou mais de
    1 s sem enviar ou enviou menos de 97% das requisições planejadas;
  - os scripts `rodar.ps1` e `rodar.sh` refazem sozinhos uma rodada inválida e guardam a
    inválida em `logs/_invalidas/`;
  - refizemos todas as rodadas. As antigas ficaram em `logs/_descartadas-v1/` e
    `logs/_descartadas-v2/` só como registro deste erro e **não são usadas no laudo**.

### Erro 5 — o resultado da análise mudava conforme o momento em que ela rodava
- **O que aconteceu:** o banco continua gravando uma linha por segundo até o
  `docker compose down`. O `analisar.py` não limitava a soma ao fim do experimento, então
  recalcular a mesma rodada mais tarde dava números maiores de pedidos recebidos e atendidos.
- **Correção:** a análise passou a considerar só até a última requisição enviada.
  Rodamos a análise duas vezes seguidas e conferimos que os números ficaram iguais.

### Erro 6 — o comando que impede o Windows de suspender não funcionava
- **O que aconteceu:** numa das rodadas, o cliente ficou cerca de 9 minutos sem registrar
  nada, provavelmente porque o notebook suspendeu. Ele enviou menos requisições do que o
  planejado (2.909 de 3.400, em `logs/_descartadas-v2/exponencial_jitter-r1/`). A IA acrescentou ao script uma chamada
  ao Windows para impedir a suspensão, mas escreveu o valor como `0x80000001`. O
  PowerShell leu esse número como negativo e recusou a chamada com o erro
  "Valor era muito grande ou muito pequeno para UInt32".
- **Correção:** o valor passou a ser escrito como `[uint32]2147483649` em `rodar.ps1`.
