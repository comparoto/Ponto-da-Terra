# ADR-001: Adotar cache no Redis com fallback para o PostgreSQL na camada de serviços da vitrine

- **Status:** Aceita
- **Data:** 2026-11-22
- **Autor:** JULIANA COMPAROTO BAPTISTA (jcb5@cesar.school)
- **Turma:** Embarque (segundas)
- **Projeto:** Origem · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

O Ponto da Terra (Origem) é um marketplace de artesanato pernambucano desenvolvido por uma equipe pequena no prazo de um semestre, com stack definida em Next.js, Express, Prisma, PostgreSQL e Redis. Pela HU 2, a vitrine pública (GET /api/produtos) precisa suportar paginação e filtros combinados por técnica e polo de origem com tempo de resposta inferior a 200 ms, exibindo apenas peças ativas e aprovadas na curadoria (HU 8). Durante picos como a Semana do Artesanato (até 1.000 usuários simultâneos e 200 compradores filtrando e paginando ao mesmo tempo), a vitrine não pode sair do ar nem retornar peças inativas caso o cache falhe temporariamente.

## Preocupações

confiabilidade, tolerância a falhas, disponibilidade da vitrine, desempenho (< 200 ms), consistência de catálogo, manutenibilidade, prazo

## Decisão

Organizar a API de produtos em Camadas, centralizando na camada de serviços a leitura da vitrine em cache no Redis e um mecanismo de fallback automático para o PostgreSQL via Prisma em caso de indisponibilidade ou timeout do Redis. Rotas e frontend ficam proibidos de acessar diretamente o Redis ou o PostgreSQL, mantendo o fluxo de dependências estritamente unidirecional

## Justificativa

Em operação normal sob pico (200 compradores simultâneos na vitrine dentro de 1.000 usuários ativos), o Redis absorve a carga repetitiva de buscas e paginações, mantendo as respostas abaixo de 200 ms. Se o Redis falhar temporariamente, o serviço captura o erro e consulta o PostgreSQL diretamente sem derrubar a requisição, atendendo à tolerância a falhas e garantindo que apenas produtos ativos e disponíveis sejam retornados. Em Camadas, encapsular essa lógica no serviço impede que detalhes de cache ou banco vazem para as rotas ou para o frontend.

## Consequências

Ganha-se continuidade da vitrine mesmo com falha temporária do cache, baixa latência nas buscas paginadas e isolamento claro entre rotas, regras de negócio e infraestrutura. Perde-se em quatro pontos: primeiro, durante uma queda do Redis, toda a carga recai sobre o PostgreSQL, podendo elevar a latência acima da meta de 200 ms; segundo, o uso de cache com TTL cria uma breve janela de dados defasados até a expiração ou invalidação quando um estoque muda ou uma peça é inativada; terceiro, adiciona-se a latência marginal da passagem entre camadas e o risco de camadas virarem sumidouro se não agregarem regra; quarto, exige disciplina em revisão de código para garantir que nenhuma rota acesse o Prisma ou o Redis diretamente.

## Alternativas consideradas

Portas e Adaptadores (Arquitetura Hexagonal): descartada por exigir separação formal do domínio em relação ao frontend, PostgreSQL, Redis e gateway via portas e adaptadores, adicionando complexidade acima do necessário para o prazo e o escopo do projeto.   Consulta direta ao PostgreSQL sem cache: descartada porque, sob pico de 200 buscas simultâneas com múltiplos filtros (HU 2), sobrecarregaria o banco que já processa reservas de estoque e checkout concorrentes.   Cache obrigatório sem fallback: descartado porque transformaria uma falha temporária do Redis em indisponibilidade total da vitrine (ponto único de falha), violando a tolerância a falhas.

## Rastreabilidade

**Atributo de qualidade:** Confiabilidade · Tolerância a falhas

**Cenário que originou a decisão:**

> Durante a Semana do Artesanato, com até 1.000 usuários simultâneos, 200 compradores acessam a vitrine da aplicação ao mesmo tempo, realizam buscas filtradas por peças de artesanato pernambucano e paginam os resultados por meio da API de produtos (GET /api/produtos). A API consulta o Redis para obter dados em cache e recorre ao banco PostgreSQL em caso de indisponibilidade do cache, garantindo informações atualizadas dos artesãos e categorias. A aplicação deve recuperar apenas os produtos ativos, disponíveis e aprovados na curadoria. O teste é considerado bem-sucedido se 100% das requisições retornarem HTTP 200 (sem erros 5xx), com tempo de resposta abaixo de 200 ms com o Redis ativo e continuidade da vitrine via fallback ao PostgreSQL quando o Redis falhar. Será considerado falho se houver indisponibilidade (erro 5xx) na queda do cache ou exibição de peças rejeitadas/inativas.

**Padrão arquitetural adotado:** Camadas

**Táticas empacotadas:** Encapsular responsabilidades por faixa; Restringir dependências a uma direção

HU 2 (Filtrar busca em vitrine — GET /api/produtos, meta < 200 ms), HU 8 (Curadoria — peças rejeitadas invisíveis na vitrine), TC03 (TS03), TC04 (TS04) e TC06 (TS06) do Plano de Testes v3.0. Módulos: rotas e serviço de produtos (produtos.service.ts), integração com Redis e persistência via Prisma/PostgreSQL.

## Verificação

- **Teste do cenário:** Os casos TC06 (paginação em GET /api/produtos?page=2&limit=10 com 25+ produtos ativos e aprovados retornando HTTP 200 e metadados corretos), TC03 (filtros via query params na vitrine) e TC04 (garantia de que peças rejeitadas não aparecem na vitrine pública) já validam o comportamento funcional da busca. Para exercitar a medida de carga e tolerância a falhas da etapa 2, executar um script em k6 ou JMeter (ferramentas definidas no Plano de Testes) simulando 200 compradores simultâneos filtrando e paginando GET /api/produtos em pico de 1.000 usuários: primeiro com o Redis ativo (exigindo 100% de respostas HTTP 200, latência < 200 ms e retorno apenas de produtos ativos) e, em seguida, com o Redis interrompido para comprovar que o fallback ao PostgreSQL mantém a vitrine respondendo sem erros 5xx.

---

_Gerado pelo estudo dirigido de Arquitetura de Software · ADS020 · 2026.2._
- _Nota de uso de IA: Este ADR contou com o auxílio de inteligência artificial para a organização, estruturação e revisão textual das respostas, mantendo a autoria das decisões e o alinhamento com os artefatos do projeto._

