# Ponto da Terra — Mockup do módulo de recomendação "Descubra Mais"
#Grupo: Pedro Marrocos e Lucas Vinicius
#Turma: ADS - Embarque Digital
#Projeto: Ponto da Terra

Mockup executável do módulo de recomendação especificado na AV1 do projeto
Ponto da Terra.

O objetivo desta entrega é demonstrar o contrato visível do módulo:

**entrada → recomendação mockada → saída**

Os dados usados neste projeto são sintéticos e servem apenas para demonstração.

## Requisitos da AV1 demonstrados

| Requisito | Implementação neste mockup |
|---|---|
| RF-01 — Produtos similares | `recomendar_produto` |
| RF-02 — Artesãos relacionados | Retorno das recomendações inclui o artesão |
| RF-04 — Fallback / cold start | `recomendar_usuario` sem histórico |
| RF-06 — Registro de eventos | `registrar_evento` |
| RF-08 — API de recomendação | APIs expostas pelo BentoML |

## Tecnologias

- Python
- BentoML
- Pytest
- Catálogo sintético de 10 produtos

## 1. Instalação

Clone o repositório:

```bash
git clone URL_DO_REPOSITORIO
cd modulo-recomendacao
```

Crie um ambiente virtual:

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Windows

```powershell
python -m venv .venv
.venv\Scripts\activate
```

Instale as dependências:

```bash
pip install -r requirements.txt
```

## 2. Executar o serviço

Na pasta do módulo:

```bash
bentoml serve app.py:RecomendacaoService
```

O BentoML exibirá no terminal o endereço local do serviço.

Normalmente será:

```text
http://localhost:3000
```

## 3. Teste rápido de funcionamento

Abra outro terminal e execute:

```bash
curl http://localhost:3000/health
```

Resultado esperado: resposta indicando que o serviço está funcionando.

## 4. Teste 1 — Recomendação de produtos similares

Execute:

```bash
curl -X POST http://localhost:3000/recomendar_produto -H "Content-Type: application/json" -d '{"produto_id":1,"limite":3}'
```

Resultado esperado:

- HTTP 200;
- `"sucesso": true`;
- retorno de uma lista em `"recomendacoes"`;
- produtos com características semelhantes ao produto 1.

O produto 1 é "Vaso de Barro Decorativo", da categoria Cerâmica,
com técnica Modelagem e região Caruaru.

## 5. Teste 2 — Fallback para visitante sem histórico

Execute:

```bash
curl -X POST http://localhost:3000/recomendar_usuario -H "Content-Type: application/json" -d '{"usuario_id":999,"historico":[]}'
```

Resultado esperado:

- HTTP 200;
- `"tipo": "fallback"`;
- lista de produtos recomendados;
- nenhuma lista vazia.

Esse teste demonstra o comportamento de cold start previsto no RF-04.

## 6. Teste 3 — Registro de evento

Execute:

```bash
curl -X POST http://localhost:3000/registrar_evento -H "Content-Type: application/json" -d '{"tipo_evento":"visualizacao","usuario_id":10,"produto_id":1}'
```

Resultado esperado:

```json
{
  "sucesso": true,
  "mensagem": "Evento registrado com sucesso"
}
```

Esse teste demonstra o registro de eventos previsto no RF-06.

## 7. Teste automatizado

Com o ambiente virtual ativado:

```bash
pytest
```

Resultado esperado:

```text
3 passed
```

## 8. Como funciona a recomendação

O mockup utiliza uma pontuação simples:

- mesma categoria: +3 pontos;
- mesma técnica artesanal: +2 pontos;
- mesma região: +1 ponto.

Os produtos são ordenados pela pontuação e os primeiros resultados são
retornados como recomendações.

Essa lógica é propositalmente simples porque esta entrega é um mockup
executável do contrato do módulo, e não um modelo de machine learning
completo.

## 9. Catálogo sintético

O projeto possui 10 produtos fictícios, todos relacionados ao domínio do
artesanato pernambucano.

Nenhum dado real de comprador é necessário para executar o mockup.

## 10. Estrutura

```text
modulo-recomendacao/
├── app.py
├── produtos.py
├── requirements.txt
├── README.md
└── tests/
    └── test_recomendacao.py
```
