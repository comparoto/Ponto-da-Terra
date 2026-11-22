# ADR-001: Adotar revogação imediata de acesso com JWT e tokenVersion conferido a cada requisição

- **Status:** Aceita
- **Data:** 2026-11-22
- **Autor:** PAULO CESAR DA SILVA MARROCOS (pcsm@cesar.school)
- **Turma:** Embarque (segundas)
- **Projeto:** Ponto da Terra · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

O Ponto da Terra tem três perfis (comprador, artesão e administrador) e uma curadoria que protege a confiança da vitrine. Pela HU16, o administrador pode suspender ou inativar uma conta, e ela precisa perder o acesso na hora. O mesmo vale para logout, troca e recuperação de senha. O frontend (Next.js) e a API (Express) ficam em domínios diferentes, a API roda em funções serverless da Vercel, sem memória compartilhada entre instâncias, e a equipe é pequena, com um semestre, a stack acordada (Express, Prisma, PostgreSQL) e sem orçamento de infraestrutura. O TC07 exige 401 "Sessão expirada" para token vencido e o TC01 exige 403 para perfil sem permissão.

## Preocupações

segurança, revogação de acesso, funcionamento sem estado em serverless, desempenho, simplicidade, prazo, testabilidade

## Decisão

O login emite um JWT de 2 horas com id, perfil e um número de versão; a cada requisição autenticada, o middleware verifica a assinatura e compara essa versão com o tokenVersion do banco, além de conferir o status da conta. Suspensão, inativação, logout, troca e redefinição de senha somam 1 ao tokenVersion, e todos os tokens anteriores da conta, em qualquer aparelho, deixam de valer na requisição seguinte.

## Justificativa

A comparação de versão no banco faz com que, a partir da resposta da suspensão, 100% dos tokens antigos sejam recusados em qualquer aparelho, que é a medida do cenário. O estado fica no banco, e não na instância, então funciona em qualquer função serverless, e uma única atualização derruba todos os aparelhos. A checagem cabe nos 20 ms do cenário (medi de 2,8 a 3,7 ms de mediana em ambiente local), e a revogação quase não acrescenta custo, porque a consulta ao usuário já seria necessária para trazer perfil e ids. Em Camadas, o middleware é o intermediário que protege os serviços, e a regra de derrubar sessões fica concentrada num serviço só.

## Consequências

Ganha-se bloqueio na requisição seguinte em todos os aparelhos, mudanças de status valendo na hora e uma regra simples e testada, sem infraestrutura nova. Perde-se em cinco pontos. Primeiro, cada requisição autenticada faz uma consulta ao banco, e o JWT deixa de ser puramente sem estado: 2,8 a 3,7 ms contra cerca de 0,03 ms só da assinatura, em ambiente local, e em produção soma-se a rede até o Neon. Segundo, com o banco fora do ar as áreas logadas não funcionam. Terceiro, a revogação é por conta e não por sessão: sair em um aparelho derruba todos. Quarto, um token roubado continua válido até o bloqueio acontecer. Quinto, a garantia de que toda rota protegida use o middleware depende de cada rota, e os testes TC01 cobrem uma lista de rotas mantida à mão.

## Alternativas consideradas

JWT só com expiração: descartado porque a conta suspensa operaria por até 2 horas. JWT curto com refresh token: descartado por ora pela complexidade e por ainda deixar uma janela de minutos. Sessão no servidor com cookie: descartada porque exige armazenamento compartilhado e cookies entre domínios diferentes. Lista de revogação por token no Redis: descartada porque custa uma consulta por requisição do mesmo jeito e exigiria guardar todos os tokens emitidos. Provedor externo de identidade: descartado por prazo, custo e dependência externa. Orientado a Eventos para a revogação: descartado porque abriria um intervalo entre o bloqueio e o efeito. Portas e Adaptadores: descartado porque só compensaria com troca de provedor de identidade.

## Rastreabilidade

**Atributo de qualidade:** Segurança (security) · Autenticidade

**Cenário que originou a decisão:**

> Em operação normal, com o artesão logado em dois aparelhos e com tokens ainda dentro da validade de 2 horas, o administrador, pelo painel de moderação suspende a conta de um artesão que vendia peças industrializadas como artesanais (HU16) no serviço de autenticação da API e na vitrine de peças. O sistema recusa qualquer requisição feita com os tokens emitidos antes da suspensão (401, "Sessão expirada"), nega um novo login (403, "Conta suspensa") e passa a responder 404 no detalhe das peças do artesão, a partir do momento em que o administrador recebe a confirmação da suspensão (resposta 200), em 100% das tentativas e nos dois aparelhos, sem nenhuma requisição aceita, com a checagem de sessão (verificação do token mais consulta ao banco) levando até 20 ms de mediana em pelo menos 500 requisições medidas em ambiente local.

**Padrão arquitetural adotado:** Camadas

**Táticas empacotadas:** Encapsular responsabilidades por faixa; Usar intermediário entre camadas

HU16, TC01, TC07. Módulos: backend/src/shared/auth.ts (autenticar, assinarToken, somente), backend/src/modules/auth/auth.service.ts (logout, troca e redefinição de senha), backend/src/modules/admin/usuarios.service.ts (restringirConta). Táticas de segurança complementares: autenticar atores, autorizar atores, revogar acesso e limitar acesso (10 falhas de login a cada 15 minutos).

## Verificação

- **Teste do cenário:** backend/tests/cenario-adr-001.test.ts: cadastra um artesão com duas peças, obtém dois tokens (dois aparelhos), suspende a conta pelo administrador e, depois da resposta 200, faz 10 tentativas, exigindo 10 respostas 401 "Sessão expirada" e nenhuma aceita, novo login com 403 e 404 no detalhe de cada peça. A medida de custo se verifica com npm run medir:autenticacao (500 medições, falha se a mediana passar de 20 ms).

---

_Gerado pelo estudo dirigido de Arquitetura de Software · ADS020 · 2026.2._

_Conteúdo preparado com apoio do Claude Code a partir do código e dos testes do projeto, com uso de IA declarado pelo autor, que revisou e validou o texto._
