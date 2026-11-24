# ADR — Controle de acesso por perfis no Ponto da Terra

- **Status:** Proposta
- **Data:** 2026-11-23
- **Autor:** Lucas Vinícius
- **Projeto:** ORIGEM — Ponto da Terra (marketplace de artesanato pernambucano)

## Contexto

O Ponto da Terra é um marketplace que aproxima artesãos e compradores. No sistema, o comprador consegue procurar produtos e acompanhar suas compras, enquanto o artesão precisa gerenciar seus produtos, estoque e pedidos. Também existe uma área administrativa.

Na versão descrita atualmente no README do repositório, essas telas funcionam com uma Fake API e autenticação simulada. Isso ajuda a desenvolver e testar as funcionalidades do frontend, mas, quando a aplicação passar a usar um backend de verdade, será necessário garantir que cada pessoa só consiga fazer aquilo que seu perfil permite.

Como o projeto é desenvolvido por uma equipe de estudantes e temos um prazo limitado, a solução precisa proteger as operações sem complicar demais o desenvolvimento e a manutenção.

## Preocupações

Segurança, controle de permissões, manutenção do código, simplicidade de implementação e prazo do projeto.

## Decisão

A proposta é adotar **controle de acesso baseado em papéis (RBAC)** nas operações protegidas do backend, considerando inicialmente três perfis: **comprador, artesão e administrador**.

Depois de identificar quem está fazendo a requisição, o backend deve conferir se aquele perfil tem permissão para executar a ação. Por exemplo, apenas um artesão autorizado deve poder cadastrar ou alterar produtos do seu catálogo. O frontend pode esconder opções que não fazem sentido para determinado perfil, mas **a decisão de permitir ou negar a operação deve acontecer no servidor**.

Além do perfil, algumas ações precisam conferir quem é o dono do recurso: um artesão não pode editar o produto de outro artesão só porque os dois têm o mesmo tipo de conta.

Essa decisão não exige definir agora um tipo específico de token ou biblioteca. A forma de autenticação será integrada ao backend na etapa correspondente.

## Justificativa

Escolhi essa abordagem porque o Ponto da Terra tem áreas com responsabilidades bem diferentes. Se a aplicação depender apenas das telas para controlar o acesso, alguém pode tentar chamar uma operação diretamente, sem passar pelos botões da interface.

Com regras de permissão no backend, fica mais fácil saber quais ações cada perfil pode realizar e reaproveitar essas verificações em várias operações. Também considero uma alternativa viável para o tamanho da nossa equipe, já que podemos começar com poucos perfis e ampliar as permissões conforme o projeto evoluir.

O principal cuidado é não confundir **estar logado** com **ter autorização**. Mesmo um usuário autenticado não pode acessar qualquer função do sistema.

## Consequências

**O que se ganha:** maior proteção das operações de cadastro e edição, divisão mais clara das responsabilidades de cada usuário e regras de acesso concentradas no backend. Isso também facilita criar testes para situações de acesso indevido.

**O que se perde:** será necessário manter as permissões atualizadas quando surgirem funcionalidades e perfis novos. Cada operação protegida terá uma etapa a mais de validação, e regras configuradas de forma errada podem bloquear usuários que deveriam ter acesso.

Outro limite importante: o RBAC, sozinho, não resolve toda a segurança do sistema. Ainda será preciso cuidar da autenticação, da validação dos dados recebidos e da proteção das informações dos usuários.

## Alternativas consideradas

**1. Controlar o acesso apenas no frontend.** Seria mais rápido no começo, porque bastaria esconder páginas e botões dependendo do usuário. Descartei essa opção como proteção principal porque a interface pode ser contornada e não impede, por si só, chamadas indevidas ao backend.

**2. Definir permissões individuais para cada usuário.** Daria mais liberdade para personalizar acessos, mas aumentaria o trabalho de configuração, revisão e testes. Para os três perfis previstos no projeto, achei uma complexidade desnecessária neste momento.

**3. Usar RBAC no backend (alternativa escolhida).** Não é a opção mais flexível para todos os cenários, mas oferece um equilíbrio melhor entre segurança, organização do código e esforço de implementação para o nosso projeto.

## Rastreabilidade

- **Atributo de qualidade:** Segurança, principalmente autorização e integridade das informações.
- **Cenário de qualidade:** Um comprador autenticado tenta acessar diretamente uma operação de cadastro de produto reservada a artesãos. O servidor deve negar a solicitação com **HTTP 403 (Forbidden)**, sem cadastrar nenhum produto nem modificar os dados existentes.
- **Outro cenário relevante:** Um artesão tenta editar um produto pertencente a outro artesão. Mesmo sendo do perfil correto, a operação deve ser negada, sem alterar o produto.
- **Padrão adotado:** RBAC (Role-Based Access Control), com verificação de propriedade do recurso quando necessário.
- **Táticas usadas:** validar identidade antes de acessar operações protegidas; verificar permissões no servidor; negar acessos não autorizados; aplicar o menor privilégio necessário.
- **Partes afetadas:** login/autenticação, gestão de produtos e estoque, pedidos e painel administrativo, na futura integração com o backend.

## Verificação

A proposta poderá ser verificada com testes de API quando as operações reais estiverem disponíveis:

1. Fazer uma tentativa de cadastro de produto sem autenticação: a API deve responder **401 (Unauthorized)** e não criar o produto.
2. Repetir a tentativa com um comprador autenticado: a API deve responder **403 (Forbidden)** e não criar o produto.
3. Fazer o cadastro com um artesão autenticado e autorizado: a operação deve ser aceita, desde que os dados enviados sejam válidos.
4. Tentar editar o produto de outro artesão: a API deve negar a alteração, e os dados do produto devem continuar iguais.
5. Tentar acessar uma operação administrativa com um perfil comum: a API deve negar o acesso.

O critério de sucesso é que **todos os casos de acesso não autorizado sejam bloqueados e nenhuma alteração indevida seja feita**. Esses são testes planejados para validar a decisão; não estou registrando aqui que já foram executados.

---

**Referência do projeto:** https://github.com/comparoto/Ponto-da-Terra

*Proposta individual para discussão com a equipe na atividade de Decisões Arquiteturais e Registro de ADR.*
