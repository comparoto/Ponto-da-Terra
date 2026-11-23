# Documentação do projeto

Índice dos documentos do **Origem: Ponto da Terra**. O [README principal](../../README.md) apresenta o projeto, e o [README do backend](README_BACKEND.md) detalha a API.

## Requisitos e modelagem

| Documento | O que traz |
|---|---|
| [REQUISITOS_BACKEND.md](REQUISITOS_BACKEND.md) | Requisitos, regras de negócio, conflitos entre documentos (C1 a C11), decisões (D1 a D9) e roadmap do backend |
| [DIAGRAMA_DE_CLASSES.md](DIAGRAMA_DE_CLASSES.md) | Diagrama de classes do modelo de dados, **gerado do schema** (`cd backend && npm run docs:diagrama`), com os ajustes em relação ao diagrama da 1ª unidade |
| [DIAGRAMA_DE_CASOS_DE_USO.md](DIAGRAMA_DE_CASOS_DE_USO.md) | Diagrama de casos de uso atualizado, com cada caso ligado às histórias de usuário (`node e2e/gerar-diagrama-casos-de-uso.cjs`) |
| [`../diagramas/`](../diagramas) | Imagens (PNG) dos diagramas de classes e de casos de uso. As de classes são geradas do `.md` acima por `node e2e/gerar-imagens-diagrama.cjs`: o diagrama completo (`02-diagrama-completo.png`) e os diagramas por assunto |

## Testes e evidências

| Documento | O que traz |
|---|---|
| [RELATORIO_2A_RODADA_TESTES.md](RELATORIO_2A_RODADA_TESTES.md) | 2ª rodada dos 16 casos de teste do plano v3, com status e observação de cada caso |
| [RELATORIO_TESTES.md](RELATORIO_TESTES.md) | Histórico dos testes durante o desenvolvimento: defeitos encontrados e corrigidos, segurança, carga e desempenho do cache |
| [EVIDENCIAS_AVALIACAO_2.md](EVIDENCIAS_AVALIACAO_2.md) | Evidências da Avaliação 2: banco de dados, recomendação, assíncrono e cache. As capturas ficam em [`evidencias/`](../evidencias) |

## Qualidade de código e uso de IA

| Documento | O que traz |
|---|---|
| [REFATORACAO_MODERACAO_CONTAS.md](REFATORACAO_MODERACAO_CONTAS.md) | Atividade individual de code smells: refatoração da moderação de contas |
| [REFATORACAO_CHECKOUT_LONG_METHOD.md](REFATORACAO_CHECKOUT_LONG_METHOD.md) | Atividade individual de code smells: refatoração do checkout (*Long Method*) |
| [ANALISE_CODE_SMELLS.md](ANALISE_CODE_SMELLS.md) | Análise de code smells do código |
| [USO_DE_IA_2A_UNIDADE.md](USO_DE_IA_2A_UNIDADE.md) | Declaração de uso de IA na 2ª unidade: onde foi usada, como foi verificada e erros corrigidos |

## Instruções para agentes de IA

| Documento | O que traz |
|---|---|
| [AGENTS.md](AGENTS.md) | Instruções para agentes de código sobre o Next.js usado no projeto (gerado pelo `next dev`) |
| [CLAUDE.md](CLAUDE.md) | Arquivo de instruções do Claude Code, que importa o `AGENTS.md` |

## Publicação

| Documento | O que traz |
|---|---|
| [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md) | Como o projeto foi configurado e como publicar novas versões na Vercel |

> **ADR individual:** fica na branch `adr-paulo-marrocos`, fora desta branch.
