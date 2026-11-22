# ADR-001: Adotar revogação imediata de acesso com JWT e tokenVersion conferido a cada requisição

- **Status:** Proposta (já implementada no backend; a ser validada pela equipe)
- **Data:** 2026-11-22
- **Autor:** PAULO CESAR DA SILVA MARROCOS (pcsm@cesar.school)
- **Turma:** Embarque Digital
- **Projeto:** Ponto da Terra · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

O Ponto da Terra tem três perfis (comprador, artesão e administrador) e uma curadoria que protege a confiança da vitrine. Pela HU16, o administrador pode suspender ou inativar uma conta, por exemplo a de um artesão que vende peças industrializadas como se fossem artesanais, e essa conta precisa perder o acesso na hora. O mesmo vale para o logout, a troca de senha e a recuperação de senha: as sessões abertas devem cair.

As restrições pesam na escolha. O frontend (Next.js) e a API (Express) ficam em domínios diferentes, a API roda em funções serverless da Vercel, sem memória compartilhada entre instâncias, e a equipe é pequena, com um semestre de prazo, a stack já acordada (Express, Prisma e PostgreSQL) e sem orçamento de infraestrutura. O requisito TC07 exige que um token vencido responda 401 "Sessão expirada", e o TC01 exige 403 para perfil sem permissão.

## Preocupações

segurança, revogação de acesso, funcionamento sem estado em serverless, desempenho, simplicidade, prazo, testabilidade

## Decisão

O login emite um JWT com validade de 2 horas que carrega o id do usuário, o perfil e um número de versão. A cada requisição autenticada, o middleware `autenticar` verifica a assinatura e compara essa versão com o `tokenVersion` do banco, além de conferir o status da conta. Suspensão, inativação, logout, troca de senha e redefinição de senha somam 1 ao `tokenVersion`, e todos os tokens anteriores da conta, em qualquer aparelho, deixam de valer na requisição seguinte.

## Justificativa

A comparação de versão no banco faz com que, a partir da resposta da suspensão, 100% dos tokens antigos sejam recusados em qualquer aparelho, que é a medida do cenário. O estado fica no banco, e não na instância, então funciona igual em qualquer função serverless, e uma única atualização derruba todos os aparelhos da conta. A checagem cabe no limite de 20 ms do cenário (medi de 2,8 a 3,7 ms de mediana em ambiente local), e a revogação quase não acrescenta custo, porque a consulta ao usuário já seria necessária para trazer o perfil e os ids de comprador, artesão e administrador, que o token não carrega. O sistema falha de forma segura: se o usuário sumiu ou a versão não confere, o acesso é negado.

No padrão Camadas, o middleware `autenticar` é o intermediário entre a requisição HTTP e os serviços, e a regra de derrubar sessões fica concentrada no serviço de moderação (`restringirConta`), usado por suspensão e inativação. Assim a regra existe em um lugar só.

## Consequências

Ganha-se bloqueio de acesso na requisição seguinte, vale para todos os aparelhos, e mudanças de status ou de perfil passam a valer na hora. Também se ganha uma regra simples e coberta por testes, sem Redis nem serviço externo.

Perde-se em cinco pontos:

- **Custo por requisição:** cada chamada autenticada faz uma consulta ao banco, e o JWT deixa de ser puramente sem estado. Em 8 execuções de 500 medições em ambiente local (PostgreSQL em Docker), a checagem completa levou de 2,8 a 3,7 ms de mediana (p95 de 6,6 a 8,9 ms), contra cerca de 0,03 ms para só verificar a assinatura, algo como 100 vezes mais. Em produção soma-se a latência de rede até o Neon, e esse número ainda não foi medido lá. As rotas públicas, como a vitrine, não pagam esse custo.
- **Disponibilidade:** com o banco fora do ar, nenhuma área logada funciona, porque a decisão nega o acesso quando não consegue conferir a versão.
- **Granularidade:** a revogação é por conta, e não por sessão. O token não tem identificador próprio (dois logins no mesmo segundo geram o mesmo token), então sair em um aparelho derruba todos os outros.
- **Janela de roubo de token:** a decisão não impede o uso de um token roubado antes de o bloqueio acontecer. Ela só encerra esse uso quando a conta é bloqueada ou a senha é trocada.
- **Disciplina do padrão Camadas:** a garantia de que toda rota protegida passa pelo middleware depende de cada rota declará-lo. Os testes de isolamento de perfis (TC01) cobrem uma lista de rotas de administrador mantida à mão, e não todas as rotas, então uma rota nova esquecida ficaria pública sem aviso.

Para reduzir o custo caso ele vire problema, há dois caminhos: guardar um cache curto de `tokenVersion` e `status` no Redis, apagado quando a versão mudar, ou colocar no token os ids de perfil para a consulta ficar mínima. Ficam como evolução. Há ainda uma limitação vizinha, registrada no `DEPLOY_VERCEL.md`: o contador de tentativas de login fica na memória de cada instância.

## Alternativas consideradas

JWT sem estado, só com expiração: descartado porque a conta suspensa continuaria operando por até 2 horas, o que contraria a HU16.

JWT de vida curta (por exemplo 5 minutos) com refresh token: descartado por ora porque exige guardar e girar refresh tokens, cria novos fluxos no frontend e ainda deixa uma janela de minutos entre o bloqueio e o efeito.

Sessão no servidor com cookie: descartada porque exige um armazenamento de sessão compartilhado entre instâncias e cookies entre domínios diferentes, com os cuidados de SameSite e CSRF.

Lista de revogação por token (jti) no Redis: descartada porque obriga a consultar o Redis a cada requisição, o mesmo custo de uma ida a um serviço, e para derrubar uma conta inteira seria preciso guardar todos os tokens que ela emitiu.

Provedor externo de identidade (Auth0, Cognito e semelhantes): descartado por prazo, por custo e por criar uma dependência externa para um requisito que o banco já resolve.

Padrão Orientado a Eventos para a revogação: descartado porque o cenário exige que, a partir da resposta da suspensão, nenhuma requisição com o token antigo seja aceita. Publicar um evento de "sessão revogada" abriria um intervalo entre o bloqueio e a reação dos consumidores, que é a janela que a decisão elimina. Os eventos continuam adequados para as notificações, onde já são usados (outbox e fila).

Padrão Portas e Adaptadores: descartado porque só compensaria se fosse preciso trocar de provedor de identidade. Para um único mecanismo de login local, com equipe pequena e um semestre, as interfaces e adaptadores extras seriam complexidade sem ganho.

## Rastreabilidade

**Atributo de qualidade:** Segurança (security) · Autenticidade

**Cenário que originou a decisão:**

> Em operação normal, com o artesão logado em dois aparelhos e com tokens ainda dentro da validade de 2 horas, o administrador, pelo painel de moderação, suspende a conta de um artesão que vendia peças industrializadas como artesanais (HU16). No serviço de autenticação da API e na vitrine de peças, o sistema recusa qualquer requisição feita com os tokens emitidos antes da suspensão (401, "Sessão expirada"), nega um novo login (403, "Conta suspensa") e passa a responder 404 no detalhe das peças do artesão, a partir do momento em que o administrador recebe a confirmação da suspensão (resposta 200), em 100% das tentativas e nos dois aparelhos, sem nenhuma requisição aceita, com a checagem de sessão (verificação do token mais consulta ao banco) levando até 20 ms de mediana em pelo menos 500 requisições medidas em ambiente local.

**Padrão arquitetural adotado:** Camadas

**Táticas empacotadas:** Encapsular responsabilidades por faixa; Usar intermediário entre camadas. A tática "Restringir dependências a uma direção" não foi marcada: o projeto a segue, mas ela organiza o código e não afeta a medida do cenário.

**Táticas de segurança complementares:** autenticar atores (JWT assinado com expiração); autorizar atores (perfis por rota, 403 para perfil errado); revogar acesso (`tokenVersion`); limitar acesso (10 falhas de login por IP e e-mail a cada 15 minutos).

HU16 (suspender, inativar e reativar contas), TC01 (rotas administrativas), TC07 (token expirado). Módulos: `backend/src/shared/auth.ts` (`assinarToken`, `autenticar`, `somente`), `backend/src/modules/auth/auth.service.ts` (logout, troca e redefinição de senha) e `backend/src/modules/admin/usuarios.service.ts` (`restringirConta`, usada por suspender e inativar).

## Verificação

- **Teste do cenário:** `backend/tests/cenario-adr-001.test.ts` faz o cenário completo. Cadastra um artesão com duas peças na vitrine, obtém dois tokens em momentos diferentes (dois aparelhos), suspende a conta pelo administrador e, depois da resposta 200, faz 10 tentativas (5 por aparelho). Exige 10 respostas 401 "Sessão expirada" e nenhuma aceita, um novo login com 403 "Conta suspensa" e 404 no detalhe de cada peça.
- **Outros caminhos de revogação:** `tests/historias-restantes.test.ts` (suspensão invalida a sessão e oculta as peças), `tests/moderacao-contas.test.ts` (suspender e inativar somam 1 ao `tokenVersion`, repetir a ação não soma de novo e reativar não soma), `tests/auth.test.ts` (logout, exclusão de conta, token vencido TC07 e token de outro segredo) e `tests/senha-email.test.ts` (troca e redefinição de senha derrubam as sessões antigas). O `e2e/seguranca.mjs` confirma que um JWT forjado com `alg: none` e perfil de administrador é rejeitado e que o login é limitado por tentativas.
- **Medida de custo:** `npm run medir:autenticacao`, na pasta `backend`, roda o middleware de verdade em 500 medições, compara com a verificação da assinatura sozinha e sai com erro se a mediana passar de 20 ms. Critério de revisão proposto: se a mediana passar de 20 ms em produção, adotar o cache curto no Redis.
- **Como rodar:** `cd backend && npx jest --runInBand tests/cenario-adr-001.test.ts tests/moderacao-contas.test.ts tests/historias-restantes.test.ts tests/auth.test.ts tests/senha-email.test.ts`

---

_Rascunho preparado com apoio do Claude Code a partir do código e dos testes do projeto, no formato do estudo dirigido de Arquitetura de Software · ADS020 · 2026.2. Revisado e validado pelo autor._
