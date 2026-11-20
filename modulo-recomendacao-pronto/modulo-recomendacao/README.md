# Ponto da Terra — Módulo de recomendação "Descubra Mais"

**Grupo:** Pedro Marrocos e Lucas Vinicius · **Turma:** ADS - Embarque Digital · **Projeto:** Ponto da Terra

Serviço HTTP em **BentoML** que recomenda peças de artesanato pernambucano. Nesta
entrega (AV2) o módulo passou a:

1. ler os dados de **arquivos versionados** em [`dados/`](dados/) (antes era uma lista dentro do código);
2. chegar a esses dados **só por funções de acesso** ([`acesso_dados.py`](acesso_dados.py)): nenhuma rota abre arquivo;
3. **registrar em log** cada uso dos dados ([`logs/uso_dados.jsonl`](logs/)) e **resumir** esse log ([`resumo_log.py`](resumo_log.py)).

```text
 requisição HTTP ──> app.py (rotas) ──> acesso_dados.py ──> dados/*.json
                          │                    │
                          │                    └──> logs/uso_dados.jsonl  (1 linha por chamada)
                          └──> recomendador.py (regra de pontuação, sem I/O)
```

Todos os dados são **fictícios**; não há dado pessoal real no repositório.

---

## 1. Como instalar e rodar

Requisito: **Python 3.10 ou mais novo**.

```bash
git clone https://github.com/comparoto/Ponto-da-Terra.git
cd Ponto-da-Terra
git checkout modulo-ia-dados-log
cd modulo-recomendacao-pronto/modulo-recomendacao
```

Crie o ambiente virtual e instale as dependências:

| Windows (PowerShell) | macOS / Linux |
|---|---|
| `python -m venv .venv` | `python3 -m venv .venv` |
| `.venv\Scripts\activate` | `source .venv/bin/activate` |
| `pip install -r requirements.txt` | `pip install -r requirements.txt` |

Suba o serviço (deixe este terminal aberto):

```bash
bentoml serve app.py:RecomendacaoService
```

Quando aparecer `Starting production HTTP BentoServer ... listening on http://localhost:3000`, o
serviço está no ar. Abra **outro terminal**, ative o mesmo `.venv` e entre na mesma
pasta para fazer as chamadas das próximas seções.

Testes automatizados (opcional): `pytest` → `15 passed`. Eles usam uma cópia
temporária dos dados e não mexem no log real.

---

## 2. Dicionário de dados

Os dados ficam em [`dados/`](dados/). O módulo lê os arquivos **a cada chamada**,
então uma alteração no arquivo vale para a próxima requisição, sem reiniciar o serviço.

### `dados/produtos.json` — catálogo (15 registros, conjunto principal)

| Campo | Significado no negócio |
|---|---|
| `id` | Código da peça no catálogo. É por ele que as rotas, o log e o histórico se referem à peça. |
| `nome` | Nome da peça como aparece na vitrine. |
| `categoria` | Família do artesanato (Cerâmica, Têxtil, Cestaria, Madeira…). É o sinal mais forte de semelhança: **+3 pontos**. |
| `tecnica` | Técnica de produção (Modelagem, Bordado, Trançado, Entalhe…). Quem gosta de uma técnica tende a gostar de outras peças feitas com ela: **+2 pontos**. |
| `regiao` | Município de origem da peça. Liga peças de um mesmo polo artesanal: **+1 ponto**. |
| `artesao_id` / `artesao` | Quem produziu a peça (nome artístico fictício). Vai na resposta para apoiar o RF-02 (artesãos relacionados). |
| `preco` | Preço de venda em reais; só é exibido, não entra na pontuação. |
| `ativo` | `false` = peça fora de linha. Nunca é oferecida como recomendação, mas continua existindo porque pode estar no histórico de alguém. |
| `destaque` | `true` = peça escolhida pela curadoria para a vitrine. É o que o módulo mostra a quem não tem histórico (cold start, RF-04). |

### `dados/usuarios.json` — compradores (5 registros)

| Campo | Significado no negócio |
|---|---|
| `id` | Código interno do comprador. Não há nome, e-mail nem CPF: o módulo não precisa disso para recomendar. |
| `historico` | Ids das peças que o comprador já visitou, em ordem. É a base da recomendação personalizada. |
| `cadastrado_em` | Data de cadastro; ajuda a explicar por que um cliente novo ainda não tem histórico. |

### `dados/eventos.jsonl` — eventos gravados pelo módulo (criado ao rodar)

| Campo | Significado no negócio |
|---|---|
| `id` | Número sequencial do evento. |
| `tipo_evento` | `visualizacao`, `clique_recomendacao` ou `compra`: mede se a recomendação está funcionando (RF-06). |
| `usuario_id` / `produto_id` | Quem fez o quê, só por identificador. |
| `registrado_em` | Data e hora do evento. |

### Casos difíceis incluídos de propósito

| Caso | Onde está | O que o módulo faz |
|---|---|---|
| **Peça sem semelhantes** | produto `10`, *Colar de Renda* (única de Renda, de técnica Renda e de Igarassu) | devolve `"tipo": "sem_similares_fallback"` e mostra os destaques |
| **Usuário sem histórico** | usuário `103` (`"historico": []`) | devolve `"tipo": "fallback"` com os destaques |
| **Peça inativa no histórico** | produto `14` e usuário `105` | usa a peça como referência, mas nunca a recomenda |
| **Identificador inexistente** | produto ou usuário `999` | HTTP 404 com mensagem clara, e erro registrado no log |

---

## 3. Funções de acesso

Todas estão em [`acesso_dados.py`](acesso_dados.py), o **único** arquivo que abre a
pasta `dados/`. Cada uma recebe o argumento obrigatório `chamador` (ex.:
`"rota:/recomendar_produto"`) e grava uma linha no log.

| Função | O que faz | Quando não encontra nada | Rota que usa |
|---|---|---|---|
| `buscar_produto(produto_id)` | devolve uma peça | erro claro `RegistroNaoEncontrado` → HTTP 404 | todas as de produto |
| `listar_produtos_relacionados(produto_id)` | peças **ativas** com a mesma categoria, técnica ou região | lista vazia (é o caso do produto 10) | `/recomendar_produto`, `/recomendar_usuario` |
| `listar_destaques(limite)` | peças ativas marcadas como destaque | lista vazia | fallback das duas rotas de recomendação |
| `buscar_usuario(usuario_id)` | devolve o comprador com o histórico | erro claro `RegistroNaoEncontrado` → HTTP 404 | `/recomendar_usuario` |
| `registrar_evento(tipo_evento, usuario_id, produto_id)` | **grava** um evento em `dados/eventos.jsonl` | tipo inválido → `DadoInvalido` → HTTP 400 | `/registrar_evento` |
| `listar_eventos()` | lê os eventos gravados | lista vazia | `/metricas` |

A **regra de recomendação** fica separada, em [`recomendador.py`](recomendador.py),
e não abre arquivo nenhum: soma **+3** pela mesma categoria, **+2** pela mesma técnica
e **+1** pela mesma região, e ordena pela pontuação. Na recomendação por usuário, as
pontuações de cada peça do histórico são somadas e as peças já vistas ficam de fora.

### Experiência: alterar um dado muda a resposta

O *Colar de Renda* (id 10) não tem nenhum semelhante. Com o serviço rodando:

1. Peça a recomendação: `python chamar_modulo.py recomendar_produto produto_id=10 limite=3`
   → `"tipo": "sem_similares_fallback"` (vêm os destaques: Vaso de Barro, Boneca de Pano, Cesto de Palha).
2. Abra `dados/produtos.json` e, **no registro de id 10**, troque `"regiao": "Igarassu"` por `"regiao": "Recife"`. Salve.
3. Repita a mesma chamada, **sem reiniciar o serviço**
   → `"tipo": "similares"`: Boneca de Pano, Toalha Bordada e Rede de Dormir Bordada, todas com `"motivo": "mesma região"`.
4. Desfaça a alteração (`git checkout dados/produtos.json`).

No log, a linha de `listar_produtos_relacionados` com `"parametros": {"produto_id": 10}`
muda de `"registros": 0, "ids_retornados": []` para `"registros": 3, "ids_retornados": [3, 9, 12]`.
O teste `test_mudar_o_dado_muda_a_resposta` automatiza essa mesma experiência.

---

## 4. Como gerar o log: três chamadas

Com o serviço rodando, no segundo terminal, escolha **uma** das formas abaixo.

**A) Script do projeto** (igual em Windows, macOS e Linux, sem problema de aspas):

```bash
python chamar_modulo.py demo
```

**B) curl (macOS / Linux / Git Bash)**

```bash
curl -X POST http://localhost:3000/recomendar_produto -H "Content-Type: application/json" -d '{"produto_id": 1, "limite": 3}'
curl -X POST http://localhost:3000/recomendar_usuario -H "Content-Type: application/json" -d '{"usuario_id": 103}'
curl -X POST http://localhost:3000/recomendar_produto -H "Content-Type: application/json" -d '{"produto_id": 999}'
```

**C) PowerShell (Windows)**

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/recomendar_produto -ContentType "application/json" -Body '{"produto_id": 1, "limite": 3}'
Invoke-RestMethod -Method Post -Uri http://localhost:3000/recomendar_usuario -ContentType "application/json" -Body '{"usuario_id": 103}'
Invoke-RestMethod -Method Post -Uri http://localhost:3000/recomendar_produto -ContentType "application/json" -Body '{"produto_id": 999}'
```
(a terceira mostra o erro 404 em vermelho, que é o esperado)

| # | Chamada | Resposta esperada |
|---|---|---|
| 1 | recomendação para a peça 1 (Vaso de Barro) | HTTP 200, `"tipo": "similares"`, peças 2, 7 e 13 |
| 2 | recomendação para o usuário 103 (sem histórico) | HTTP 200, `"tipo": "fallback"`, 5 destaques |
| 3 | recomendação para a peça 999 (não existe) | HTTP 404, `"erro": "Produto 999 não encontrado"` |

### Abrir o log

```bash
cat logs/uso_dados.jsonl                 # macOS / Linux / Git Bash
Get-Content logs\uso_dados.jsonl         # Windows PowerShell
```

As três chamadas acrescentam **5 linhas** (o arquivo nunca é apagado, só cresce):

```json
{"data_hora": "2026-11-20T19:54:59-03:00", "funcao": "buscar_produto", "chamador": "rota:/recomendar_produto", "tabela": "produtos", "parametros": {"produto_id": 1}, "registros": 1, "ids_retornados": [1], "sucesso": true, "erro": null, "duracao_ms": 20.04}
{"data_hora": "2026-11-20T19:54:59-03:00", "funcao": "listar_produtos_relacionados", "chamador": "rota:/recomendar_produto", "tabela": "produtos", "parametros": {"produto_id": 1}, "registros": 4, "ids_retornados": [2, 7, 13, 15], "sucesso": true, "erro": null, "duracao_ms": 0.41}
{"data_hora": "2026-11-20T19:55:01-03:00", "funcao": "buscar_usuario", "chamador": "rota:/recomendar_usuario", "tabela": "usuarios", "parametros": {"usuario_id": 103}, "registros": 1, "ids_retornados": [103], "sucesso": true, "erro": null, "duracao_ms": 0.47}
{"data_hora": "2026-11-20T19:55:01-03:00", "funcao": "listar_destaques", "chamador": "rota:/recomendar_usuario", "tabela": "produtos", "parametros": {"limite": 5}, "registros": 5, "ids_retornados": [1, 3, 4, 6, 9], "sucesso": true, "erro": null, "duracao_ms": 0.51}
{"data_hora": "2026-11-20T19:55:03-03:00", "funcao": "buscar_produto", "chamador": "rota:/recomendar_produto", "tabela": "produtos", "parametros": {"produto_id": 999}, "registros": 0, "ids_retornados": [], "sucesso": false, "erro": "RegistroNaoEncontrado: produto 999 não existe", "duracao_ms": 0.51}
```

**Três linhas que mostram o módulo usando os dados:**
- **linha 2**: para recomendar a partir da peça 1, o módulo buscou no catálogo 4 candidatas (2, 7, 13, 15) e devolveu as 3 melhores;
- **linha 4**: o usuário 103 não tem histórico, então o módulo foi buscar os destaques (1, 3, 4, 6, 9);
- **linha 5**: a peça 999 não existe; a função registrou `"sucesso": false` com o motivo, e a rota respondeu 404.

### Campos de cada linha do log

| Campo | Conteúdo |
|---|---|
| `data_hora` | data e hora da chamada, com fuso |
| `funcao` | função de acesso chamada |
| `chamador` | rota que chamou (`rota:/...`) |
| `tabela` | arquivo de dados envolvido (`produtos`, `usuarios`, `eventos`) |
| `parametros` | parâmetros em resumo: **somente identificadores e números**, nunca dado pessoal |
| `registros` | quantos registros voltaram |
| `ids_retornados` | ids dos registros que voltaram (é o que permite saber o que foi mais e menos consultado) |
| `sucesso` / `erro` | `true`/`null`, ou `false` com o tipo e o motivo do erro |
| `duracao_ms` | tempo da função em milissegundos |

---

## 5. Como ver o resumo

```bash
python resumo_log.py                                # resume o seu logs/uso_dados.jsonl
python resumo_log.py logs/exemplo_uso_dados.jsonl   # resume o log de exemplo do grupo
```

O resumo mostra quantas vezes cada função foi chamada e quantos erros teve, quem
chamou, a lista de erros e, para produtos e usuários, os mais consultados e os
nunca consultados.

[`logs/exemplo_uso_dados.jsonl`](logs/exemplo_uso_dados.jsonl) é o log de uma sessão
de demonstração do grupo (45 chamadas). Ela inclui as três chamadas acima, os cinco
usuários, a peça sem semelhantes, a gravação de eventos, duas entradas inválidas de
propósito e a experiência da seção 3. O resumo dele é:

```text
45 chamadas registradas, de 2026-11-20T19:54:59-03:00 a 2026-11-20T19:55:54-03:00

1. Chamadas por função de acesso
--------------------------------
função                           chamadas  erros
buscar_produto                         18      2
listar_produtos_relacionados           12      0
buscar_usuario                          6      1
registrar_evento                        4      1
listar_destaques                        3      0
listar_eventos                          2      0

2. Quem chamou
--------------
rota:/recomendar_usuario               19
rota:/recomendar_produto               15
rota:/registrar_evento                  9
rota:/metricas                          2

3. Erros: 4
-----------
1x buscar_produto -> RegistroNaoEncontrado: produto 999 não existe
1x buscar_usuario -> RegistroNaoEncontrado: usuário 999 não existe
1x registrar_evento -> DadoInvalido: tipo_evento 'curtida' inválido; use um de ['clique_recomendacao', 'compra', 'visualizacao']
1x buscar_produto -> RegistroNaoEncontrado: produto 77 não existe

4. Registros de produtos: mais consultados e nunca consultados
--------------------------------------------------------------
id    1 Vaso de Barro Decorativo              6x
id    2 Tigela de Cerâmica                    6x
id    3 Boneca de Pano                        6x
id    4 Cesto de Palha                        6x
id   11 Carranca de Madeira                   5x
Nunca consultados: nenhum
Nunca oferecidos como recomendação: 10 (Colar de Renda), 14 (Luminária de Palha [inativo])

5. Registros de usuarios: mais consultados e nunca consultados
--------------------------------------------------------------
id  103 0 produto(s) no histórico             1x
id  101 2 produto(s) no histórico             1x
id  102 1 produto(s) no histórico             1x
id  104 2 produto(s) no histórico             1x
id  105 1 produto(s) no histórico             1x
Nunca consultados: nenhum
```

---

## 6. Respostas (sobre o log de exemplo)

**(a) Qual dado o módulo mais usa?**
O **catálogo de produtos**: 33 das 45 chamadas (73%) leem `produtos.json`, e
`buscar_produto` é a função mais chamada (18 vezes), porque toda recomendação começa
lendo a peça de referência. As peças mais consultadas são 1, 2, 3 e 4. As peças 1, 3
e 4 lideram porque são **destaques** e aparecem em todo fallback; a 2 lidera por ser a
vizinha mais próxima do Vaso de Barro e por ter sido usada nos eventos.

**(b) Algum dado nunca foi usado? O que isso sugere?**
Toda peça foi lida pelo menos uma vez, mas duas **nunca foram oferecidas como
recomendação**. Uma é o **Colar de Renda (10)**: não divide categoria, técnica nem
região com nenhuma outra peça, então só aparece se alguém pedir por ela. Isso mostra
uma lacuna no catálogo (falta mais renda) ou na regra, que poderia usar outro sinal,
como faixa de preço. A outra é a **Luminária de Palha (14)**, que está inativa e só
aparece como referência porque ficou no histórico do usuário 105. Isso indica que o
histórico guarda peças fora de linha e que vale tratá-las, por exemplo sugerindo uma
substituta do mesmo artesão.

**(c) Houve erro? Por quê?**
Sim, **4 erros**, todos provocados de propósito para testar as entradas inválidas. Foram
a peça **999** e o usuário **999**, que não existem; o tipo de evento **"curtida"**, que
não é aceito; e um evento para a peça **77**, que não existe. Nenhum foi falha do
módulo: cada um virou uma resposta 404 ou 400 com mensagem clara e ficou registrado no
log com o motivo. Em produção, ver o mesmo id inexistente se repetir no log indicaria
um link quebrado no site.

---

## 7. Declaração de uso de IA generativa

Usamos o **Claude Code** (Anthropic) como apoio para estruturar a camada de acesso aos
dados, escrever o registro em log, o script de resumo, os testes e este README. A
definição dos dados de negócio, dos casos difíceis e da regra de recomendação, a
conferência dos resultados (testes, chamadas reais ao serviço e leitura do log) e as
respostas da seção 6 foram revisadas e validadas pelo grupo.

---

## Anexo — estrutura e rotas

```text
modulo-recomendacao/
├── app.py                  # rotas BentoML (não abrem arquivo)
├── acesso_dados.py         # funções de acesso: único ponto que lê/grava dados/
├── log_uso.py              # decorador que grava 1 linha JSON por chamada
├── recomendador.py         # regra de pontuação (funções puras)
├── resumo_log.py           # resumo do log
├── chamar_modulo.py        # cliente simples para chamar o serviço
├── dados/
│   ├── produtos.json       # catálogo (15 peças)
│   ├── usuarios.json       # compradores (5)
│   └── eventos.jsonl       # gerado pelo /registrar_evento (fora do git)
├── logs/
│   ├── exemplo_uso_dados.jsonl   # log da sessão de demonstração (versionado)
│   └── uso_dados.jsonl           # seu log, gerado ao rodar (fora do git)
├── requirements.txt
└── tests/                  # pytest: funções de acesso, log e ranking
```

| Rota (POST) | Corpo JSON | Requisito |
|---|---|---|
| `/health` | `{}` | — |
| `/recomendar_produto` | `{"produto_id": 1, "limite": 3}` (`limite` opcional, 1–20) | RF-01, RF-02 |
| `/recomendar_usuario` | `{"usuario_id": 101, "limite": 5}` | RF-04 (fallback) |
| `/registrar_evento` | `{"tipo_evento": "compra", "usuario_id": 101, "produto_id": 2}` | RF-06 |
| `/metricas` | `{}` | RF-06 |

Mudança de contrato em relação à AV1: `/recomendar_usuario` não recebe mais o
`historico` no corpo da requisição; o histórico agora vem da base (`usuarios.json`).
