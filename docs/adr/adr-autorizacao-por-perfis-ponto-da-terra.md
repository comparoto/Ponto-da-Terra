# ADR — Autorização de operações por perfil no Origem: Ponto da Terra

- **Status:** Proposto (aguardando discussão com a equipe)
- **Data:** 2026-11-23
- **Projeto:** Origem: Ponto da Terra
- **Atributo de qualidade prioritário:** Segurança

## Contexto

O Origem: Ponto da Terra é um marketplace de artesanato que oferece uma vitrine para compradores, um painel de gestão para artesãos e uma área administrativa. Conforme o README do repositório `comparoto/Ponto-da-Terra`, a versão principal documentada utiliza Next.js e TypeScript no frontend, com dados mockados em `src/data/`, serviços de Fake API em `src/services/` e autenticação de demonstração em `src/services/demoAuth.ts`. Não há, nessa versão documentada, backend ou banco de dados reais integrados.

Essa arquitetura permite testar a experiência do usuário, mas uma interface que esconde botões ou páginas não basta para impedir operações indevidas quando a API real for integrada. Será necessário que o servidor verifique a identidade e as permissões do usuário em operações sensíveis, como cadastrar produtos, alterar estoque e acessar funcionalidades administrativas.

## Atributo de qualidade e justificativa

**Segurança**, especialmente o controle de acesso. Compradores, artesãos e administradores executam operações diferentes. Sem validação de permissões no servidor, uma pessoa poderia tentar realizar ações de outro perfil manipulando requisições, independentemente das restrições visuais do frontend.

## Cenário de qualidade verificável

- **Fonte do estímulo:** pessoa autenticada com perfil de comprador.
- **Estímulo:** envio direto de requisição à futura API para criar ou modificar um produto de um artesão.
- **Ambiente:** backend real integrado ao marketplace, com usuários de teste e operações de catálogo disponíveis.
- **Resposta esperada:** o servidor identifica o usuário, verifica seu perfil e rejeita a operação por falta de autorização, sem modificar o catálogo.
- **Medida de resposta:** 100% das tentativas não autorizadas do conjunto de testes devem receber HTTP `403 Forbidden`, sem alterações persistidas. Requisições sem autenticação válida devem receber HTTP `401 Unauthorized`. Um artesão autorizado deve conseguir executar a operação permitida, desde que as demais validações sejam satisfeitas.

## Decisão arquitetural proposta

**Centralizar no backend real a autenticação e a autorização por perfil (RBAC — Role-Based Access Control) para operações protegidas.** A API deverá identificar o usuário autenticado e verificar o papel associado a ele (`comprador`, `artesao` ou `administrador`) antes de executar regras de negócio sensíveis. O frontend poderá continuar ocultando funcionalidades indisponíveis por usabilidade, mas isso não será considerado uma barreira de segurança.

Na futura integração, os componentes deverão continuar consumindo a camada `src/services/`, que hoje encapsula a Fake API. A troca para chamadas HTTP deverá, sempre que adequado, preservar os contratos tipados e o padrão de retorno estabelecidos, evitando espalhar lógica de autorização pelos componentes da interface. A escolha exata do mecanismo de autenticação (por exemplo, sessão ou token) e do framework do backend será definida em outra decisão técnica; este ADR não presume que JWT ou Express já estejam implantados.

A verificação de papel não substitui a verificação de **propriedade do recurso**: um artesão não deverá modificar produtos de outro artesão apenas por possuir o papel `artesao`.

## Alternativas consideradas

1. **Restringir ações somente no frontend:** implementação simples para uma demonstração, mas insegura com API real, pois requisições podem ser feitas sem passar pela interface. **Rejeitada** para produção.
2. **Verificar permissões individualmente em cada função de negócio:** pode funcionar, mas tende a duplicar regras e facilitar esquecimentos em novas operações. **Não escolhida como estratégia principal**.
3. **Autorização centralizada no backend, combinada com verificações de propriedade nos serviços:** padroniza a checagem de perfis, facilita testes e reduz o risco de operações indevidas. **Escolhida como proposta**.

## Consequências e compromissos

### Benefícios

- Reduz o risco de acesso indevido aos catálogos e às funções administrativas.
- Oferece regras consistentes de acesso para diferentes clientes da API.
- Facilita testes automatizados dos perfis e manutenção das permissões.
- Mantém separação entre a interface, os serviços e o controle de acesso do servidor.

### Custos e limitações

- Exige implementação e manutenção de autenticação, perfis e verificações no backend real.
- Adiciona cenários de teste e tratamento de respostas `401` e `403` no frontend.
- Requer checagens adicionais por recurso, como propriedade de produtos e pedidos.
- Não é possível validar completamente esta decisão apenas com a Fake API atual.

## Como verificar a decisão

Quando o backend definitivo estiver disponível:

1. Criar usuários de teste com perfis de comprador, artesão e administrador.
2. Tentar cadastrar ou alterar um produto autenticado como comprador: esperar `403`, sem gravação de dados.
3. Repetir a operação sem autenticação válida: esperar `401`, sem gravação.
4. Executar uma operação permitida com o artesão proprietário: esperar sucesso, após as validações de negócio.
5. Tentar alterar um produto de outro artesão: esperar `403`, sem gravação.
6. Tentar uma ação exclusiva de administrador com perfis sem privilégio: esperar `403`.
7. Incluir esses cenários na suíte automatizada de testes da API e executá-los na integração contínua quando ela estiver configurada.

**Critério de aceitação:** todos os casos de acesso negado devem bloquear a operação e preservar os dados. A decisão passa de **Proposto** para **Aceito** somente após discussão e aprovação pela equipe.

## Referência do projeto

- Repositório: https://github.com/comparoto/Ponto-da-Terra
- README: https://github.com/comparoto/Ponto-da-Terra/blob/main/README.md
