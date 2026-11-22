# ADR-001: Revogar o acesso de forma imediata com JWT e contador de versão (tokenVersion) conferido a cada requisição

- **Status:** Proposta (já implementada no backend; a ser validada pela equipe)
- **Data:** 2026-11-22
- **Autor:** PAULO CESAR DA SILVA MARROCOS (pcsm@cesar.school)
- **Turma:** Embarque Digital
- **Projeto:** Ponto da Terra · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

O Ponto da Terra tem três perfis (comprador, artesão e administrador) e uma curadoria que protege a confiança da vitrine. Pela HU16, o administrador pode suspender ou inativar uma conta, por exemplo a de um artesão que vende peças industrializadas como se fossem artesanais, e essa conta precisa perder o acesso na hora. O mesmo vale para o logout, a troca de senha e a recuperação de senha: as sessões abertas devem cair.

As restrições pesam na escolha. O frontend (Next.js) e a API (Express) ficam em domínios diferentes, a API roda em funções serverless da Vercel, sem memória compartilhada entre instâncias, e a equipe é pequena, com um semestre de prazo e a stack já definida: Express, Prisma e PostgreSQL. O requisito TC07 exige que um token vencido responda 401 "Sessão expirada", e o TC01 exige 403 para perfil sem permissão.

## Preocupações

segurança, revogação de acesso, funcionamento sem estado em serverless, desempenho, simplicidade, prazo, testabilidade

## Decisão

A autenticação usa um JWT assinado com validade de 2 horas, que carrega o id do usuário, o perfil e um número de versão (`tv`). A cada requisição autenticada, o middleware `autenticar` verifica a assinatura e a validade e depois busca o usuário no banco pela chave primária. Ele compara a versão do banco (`tokenVersion`) com a do token e confere o status da conta: versão diferente ou usuário inexistente dá 401 "Sessão expirada", e conta suspensa ou inativa dá 403.

Qualquer evento que precise derrubar sessões soma 1 ao `tokenVersion` do usuário: logout, suspensão, inativação, troca de senha e redefinição de senha. Com isso, todos os tokens já emitidos para aquela conta, em qualquer aparelho, deixam de valer na requisição seguinte. A reativação não soma, porque o token antigo já estava invalidado e a pessoa entra de novo.

## Justificativa

A decisão cumpre a HU16 com uma coluna inteira e uma comparação, sem infraestrutura nova. O estado fica no banco, e não na instância, então funciona igual em qualquer instância serverless. A revogação é por conta, não por token: uma única atualização derruba todos os aparelhos, sem precisar guardar a lista dos tokens emitidos.

O custo extra da revogação é pequeno, porque a consulta ao usuário já seria necessária de qualquer forma. É ela que traz o nome, o perfil e os ids de comprador, artesão e administrador usados pelas rotas, já que o token não os carrega. A comparação de versão e o teste de status aproveitam essa mesma ida ao banco. Por fim, o sistema falha de forma segura: se o usuário sumiu ou a versão não confere, o acesso é negado.

## Consequências

Ganha-se bloqueio de acesso na próxima requisição, vale para todos os aparelhos, e mudanças de status ou de perfil passam a valer na hora. Também se ganha uma regra simples e coberta por testes, sem Redis nem serviço externo.

Perde-se em quatro pontos:

- **Custo por requisição:** cada chamada autenticada faz uma consulta ao banco, e o JWT deixa de ser puramente sem estado. Medi em ambiente local (PostgreSQL em Docker, 500 medições, em duas execuções): a verificação da assinatura leva 0,055 ms de mediana, enquanto a consulta do usuário leva de 5,8 a 7,7 ms (p95 entre 13,6 e 15 ms), de 100 a 140 vezes mais. Uma ida e volta simples ao banco já custa 1,6 ms. Em produção soma-se a latência de rede até o Neon. As rotas públicas, como a vitrine, não pagam esse custo.
- **Disponibilidade:** com o banco fora do ar, nenhuma área logada funciona, porque a decisão nega o acesso quando não consegue conferir a versão.
- **Granularidade:** a revogação é por conta. Sair em um aparelho derruba todos os outros.
- **Janela de roubo de token:** a decisão não impede o uso de um token roubado antes de a revogação acontecer. Ela só encerra esse uso quando a conta é bloqueada ou a senha é trocada.

Para reduzir o custo caso ele vire problema, há dois caminhos: guardar um cache curto de `tokenVersion` e `status` no Redis, apagado quando a versão mudar, ou colocar no token os ids de perfil para a consulta ficar mínima. Ficam como evolução, sem necessidade hoje. Há ainda uma limitação vizinha, já registrada no `DEPLOY_VERCEL.md`: o contador de tentativas de login fica na memória de cada instância.

## Alternativas consideradas

JWT sem estado, só com expiração: descartado porque a conta suspensa continuaria operando por até 2 horas, o que contraria a HU16.

JWT de vida curta (por exemplo 5 minutos) com refresh token: descartado por ora porque exige guardar e girar refresh tokens, cria novos fluxos no frontend e ainda deixa uma janela de minutos entre o bloqueio e o efeito.

Sessão no servidor com cookie: descartada porque exige um armazenamento de sessão compartilhado entre instâncias e cookies entre domínios diferentes, com os cuidados de SameSite e CSRF, num cenário em que frontend e API ficam em domínios separados.

Lista de revogação por token (jti) no Redis: descartada porque obriga a consultar o Redis a cada requisição, o mesmo custo de uma ida a um serviço, e para derrubar uma conta inteira seria preciso guardar todos os tokens que ela emitiu.

Provedor externo de identidade (Auth0, Cognito e semelhantes): descartado por prazo, por custo e por criar uma dependência externa para um requisito que o banco já resolve.

## Rastreabilidade

**Atributo de qualidade:** Segurança · Autenticidade e controle de acesso

**Cenário que originou a decisão:**

> Em operação normal, o administrador suspende a conta de um artesão que está logado em dois aparelhos, com tokens ainda válidos por até 2 horas, no serviço de autenticação da API. Na requisição seguinte de qualquer um dos aparelhos, o sistema responde 401 "Sessão expirada"; uma nova tentativa de login responde 403 "Conta suspensa"; as peças do artesão somem da vitrine imediatamente; e nenhum token emitido antes da suspensão volta a funcionar.

**Padrão arquitetural adotado:** Camadas (a autenticação é uma preocupação transversal tratada no middleware da camada de API, e as regras ficam nos serviços)

**Táticas empacotadas:** Autenticar atores (JWT assinado com expiração); Autorizar atores (perfis por rota, 403 para perfil errado); Revogar acesso (`tokenVersion`); Limitar acesso (limite de 10 tentativas falhas de login por IP e e-mail a cada 15 minutos)

HU16 (suspender, inativar e reativar contas), TC01 (rotas administrativas), TC07 (token expirado). Módulos: `backend/src/shared/auth.ts` (`assinarToken`, `autenticar`, `somente`), `backend/src/modules/auth/auth.service.ts` (logout, troca e redefinição de senha) e `backend/src/modules/admin/usuarios.service.ts` (suspender e inativar).

## Verificação

- **Teste do cenário:** `tests/historias-restantes.test.ts` ("suspensão invalida a sessão, bloqueia o login e oculta as peças do artesão") exige 401 com o token antigo, 403 no login e 404 na peça da vitrine. `tests/moderacao-contas.test.ts` confere que suspender e inativar somam 1 ao `tokenVersion`, que repetir a ação não soma de novo e que reativar não soma.
- **Demais caminhos de revogação:** `tests/auth.test.ts` cobre o logout, a exclusão de conta, o token vencido (TC07) e o token assinado com outro segredo, e `tests/senha-email.test.ts` cobre a troca e a redefinição de senha derrubando as sessões antigas.
- **Ataques:** `e2e/seguranca.mjs` confirma que um JWT forjado com `alg: none` e perfil de administrador é rejeitado e que o login é limitado por tentativas.
- **Custo:** repetir a medição da seção de consequências (500 medições de `jwt.verify` contra a consulta do usuário). Critério de revisão proposto: se a mediana da checagem passar de 20 ms em produção, adotar o cache curto no Redis.
- **Como rodar:** `cd backend && npx jest --runInBand tests/auth.test.ts tests/moderacao-contas.test.ts tests/historias-restantes.test.ts tests/senha-email.test.ts`.

---

_Rascunho preparado com apoio do Claude Code a partir do código e dos testes do projeto, no formato do estudo dirigido de Arquitetura de Software · ADS020 · 2026.2. Revisado e validado pelo autor._
