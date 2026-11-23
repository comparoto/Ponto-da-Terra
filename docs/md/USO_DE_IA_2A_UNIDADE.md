# Uso de IA na 2ª unidade

Este documento declara como a IA generativa foi usada no desenvolvimento da 2ª unidade do **Origem: Ponto da Terra** (integração do frontend com o backend, testes e documentação). Complementa o log de uso de IA da 1ª unidade, listado no [README](../../README.md).

## Ferramenta e forma de uso

- **Ferramenta:** Claude Code (Anthropic), usado no terminal e no VS Code, com acesso ao repositório.
- **Autor responsável:** Paulo Marrocos, que definiu os pedidos, revisou os resultados e decidiu o que entrava no repositório.
- **Rastreabilidade:** os commits recentes feitos com apoio da IA trazem a linha `Co-Authored-By: Claude ... <noreply@anthropic.com>` na mensagem (20 dos 55 commits do repositório até 22/11/2026; os mais antigos não têm a marca). Para listar: `git log --grep="Co-Authored-By: Claude"`.

## Onde a IA foi usada

| Área | O que a IA fez | Onde está |
|---|---|---|
| Código do backend e da integração | Escreveu e alterou código a partir de pedidos do autor: API Express, banco com Prisma, fila de eventos, e-mails, redefinição de senha, otimização de imagens, integração das telas com a API | `backend/`, `src/` |
| Testes | Escreveu os testes de API (Jest + Supertest), o teste de contrato, o teste de carga (k6) e os roteiros de navegador (Playwright) | `backend/tests/`, `e2e/` |
| Refatoração de code smells | Apontou os smells em `usuarios.routes.ts` e propôs a extração do `usuarios.service.ts`. Os testes de caracterização foram escritos **antes** de mexer no código | [REFATORACAO_MODERACAO_CONTAS.md](REFATORACAO_MODERACAO_CONTAS.md) |
| ADR | Ajudou a redigir o ADR de revogação imediata de acesso (JWT + `tokenVersion`) e escreveu o teste do cenário e o script de medição de custo. O ADR está na branch `adr-paulo-marrocos` | branch `adr-paulo-marrocos` |
| Relatório da 2ª rodada de testes | Executou os 16 casos, coletou os resultados e redigiu o relatório | [RELATORIO_2A_RODADA_TESTES.md](RELATORIO_2A_RODADA_TESTES.md) |
| Documentação | Redigiu e atualizou README, documentos de requisitos, deploy e este diagrama de classes (gerado do schema por um script) | raiz e `docs/` |
| Remoção do tipo `any` | Trocou os usos de `any` por tipos, ativou regras de lint (`no-explicit-any` e `no-unsafe-*`) e criou um teste que varre o código em busca do tipo | `backend/tests/sem-any.test.ts`, `eslint.config.mjs` |

## O que não é da IA

- **Escolha do tema, escopo, requisitos e histórias de usuário:** vêm da equipe, na 1ª unidade e nas definições do documento de requisitos.
- **Decisões de produto e de arquitetura:** as decisões estão registradas (conflitos C1 a C11 e decisões D1 a D9 em [REQUISITOS_BACKEND.md](REQUISITOS_BACKEND.md)) e foram tomadas pela equipe. A IA propôs alternativas e implementou a escolhida.
- **Operação em produção:** publicação na Vercel, variáveis de ambiente, credenciais e apagar dados do banco de produção foram feitos pelo autor. A IA não recebeu acesso a essas credenciais.
- **Trabalho dos outros integrantes:** a IA não alterou o que outros integrantes entregaram em suas atividades individuais.

## Como o resultado foi verificado

Nada foi aceito só porque a IA disse que estava certo. A verificação é feita por meios que qualquer pessoa pode repetir:

- **143 testes de API** (`cd backend && npm test`), incluindo testes de caracterização e um teste de contrato que compara as respostas reais com a documentação Swagger.
- **Lint e checagem de tipos** (`npm run lint`, `npm run typecheck`), executados também na integração contínua do GitHub.
- **Roteiros de navegador, segurança e carga** (`e2e/` e `backend/tests/carga/`), executados à mão.
- **Revisão do autor** antes de cada commit.

## Erros da IA que foram encontrados e corrigidos

Registrar os erros faz parte da declaração. Exemplos reais desta unidade:

| O que a IA afirmou ou fez | O que estava errado | Como foi achado e corrigido |
|---|---|---|
| "O frontend não tem nenhum `any`" | Havia 6 `any` inferidos, que a busca por texto não encontra | O lint com regras que usam o sistema de tipos achou; os 6 foram corrigidos |
| "O CI roda na branch do ADR" | O CI só roda em `main`, `integracao-backend` e pull requests | Conferido no arquivo do workflow; a afirmação foi retirada |
| "A 1ª rodada de testes foi manual" | A 1ª rodada combinou execução manual e automatizada | Corrigido no relatório da 2ª rodada |
| Custo da verificação do token: "6 a 8 ms" | Valor sem medição repetível | Foi criado um script de medição; o valor correto medido foi de 2 a 5 ms (mediana local), e o ADR foi corrigido |
| "60 rotas documentadas" | São 60 caminhos e 69 operações | Corrigido no README do backend e nos documentos |
| Teste de contrato passando só localmente | A URL do boleto saía relativa quando `PUBLIC_URL` não estava definida, e o CI falhou | Corrigido o teste para comparar só o caminho da URL |
| Teste do ADR com dois tokens iguais | Dois tokens emitidos no mesmo segundo são idênticos, e o teste não provava a revogação | O teste passou a esperar 1,1 s entre as emissões |
| "Ajustamos o diagrama de classes e o TC02" | Os documentos externos não tinham sido alterados | A frase foi trocada por uma pendência explícita (D9) |

## Limites e cuidados

- **A IA pode errar com segurança.** Por isso o que importa é o que os testes e a revisão confirmam, não o texto da resposta.
- **Dados pessoais e segredos:** nenhuma senha, token ou chave é guardada no repositório (os valores ficam em variáveis de ambiente e nos arquivos `.env`, que estão no `.gitignore`).
- **Pagamentos, frete e e-mail real são simulados ou adiados**, conforme o escopo do projeto. O envio real de e-mail (Brevo) ficou para uma etapa futura; em produção, o envio usa a caixa de testes do Mailtrap.
- **Funcionalidade de IA no produto:** a decisão D6, que previa recursos de IA dentro da plataforma, **não foi implementada**. A IA descrita aqui é só ferramenta de desenvolvimento.
- **Este arquivo reflete o uso até 22/11/2026.** Novos usos devem ser acrescentados com data.
