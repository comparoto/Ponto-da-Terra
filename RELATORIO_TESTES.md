# Relatório de Testes · Origem: Ponto da Terra

**Data da execução:** 11/11/2026 · **Versão:** integração completa (branch `integracao-backend`) · Next.js 16.4.6
**Ambiente:** Windows 11, Node 24, PostgreSQL 16 e Redis 7 em Docker, Microsoft Edge (Playwright). A API rodou em modo de desenvolvimento e o frontend em build de produção (`next start`).

## Resumo

| Tipo de teste | Ferramenta | Resultado |
|---|---|---|
| Testes automatizados da API (unidade + integração) | Jest + Supertest | **123 / 123** passaram |
| Cobertura de código da API | Jest (`npm run test:cobertura`) | **91,5 %** das instruções · **95,2 %** das linhas · 72,4 % dos desvios |
| Fluxos ponta a ponta no navegador | Playwright (`e2e/`) | **68 / 68** verificações (18 + 23 + 17 + 10) |
| Responsividade (celular 375 px, tablet 768 px, desktop 1366 px) | Playwright | **39 / 39** combinações (13 telas × 3 tamanhos) sem rolagem horizontal e sem erros de JavaScript |
| Acessibilidade (WCAG 2 A e AA) | axe-core 4.14 | **0 violações** nas 12 telas × 3 tamanhos (depois das correções abaixo) |
| Segurança caixa-preta | script próprio (`e2e/seguranca.mjs`) | **20 / 20** ataques bloqueados (depois da correção abaixo) |
| Concorrência no checkout (TC02) | k6 (Docker) | 50 compradores simultâneos para 1 unidade: **1 venda, 49 recusas, 0 inesperadas, estoque final 0** |
| Desempenho do cache da vitrine | k6 (Docker) | Com cache: **+85 % de vazão** e **−47 % de tempo mediano** |
| Dependências vulneráveis (`npm audit --omit=dev`) | npm | Frontend: **0**. Backend: **0** (eram 5 "altas"; corrigidas com Zod 4 e Prisma 7) |
| Qualidade estática | ESLint, TypeScript | Lint: **0** problemas. Tipos: **0** erros (frontend e backend) |
| Build de produção | `next build`, `tsc` | Frontend e backend compilam |

## Execução em produção (Vercel)

Depois do deploy em https://ponto-da-terra-eight.vercel.app (site) e https://ponto-da-terra-api.vercel.app (API serverless + Neon + Upstash + Vercel Blob):

| Teste | Resultado |
|---|---|
| Segurança caixa-preta | **20 / 20**. O JWT com `alg: none` é bloqueado já pelo firewall da Vercel (HTTP 403) |
| Fluxos de integração (TC04, TC08, TC09, TC14) | **18 / 18** |
| Fluxos da fase 2 (TC12, TC15, TC16, HU9–HU18) | **23 / 23** |
| Funcionalidades que completam a integração (HU3, HU8, HU16, favoritos, sacola, notificações, Termos) | **17 / 17** |
| Responsividade e acessibilidade | **36 / 36**, 0 violações WCAG A/AA |
| Fila serverless (QStash) | Notificação de "Novo pedido" entregue ao artesão |
| Expiração agendada (TC16) | PIX não pago cancelado automaticamente após 30 min, com estoque devolvido |

**Defeito encontrado em produção (D-07, corrigido):** a contagem regressiva do PIX usava o relógio do aparelho do comprador. Numa máquina com o relógio 2 min adiantado, o prazo aparecia como 27 min em vez de 29–30. Agora a API envia a própria hora e a tela calcula a diferença.

**Observação:** a primeira requisição depois de um deploy (função "fria") pode levar alguns segundos. Uma execução do roteiro falhou por isso logo após o deploy e passou na repetição.

## Funcionalidades que completam a integração (`e2e/pontas-soltas.cjs`, 17 / 17)

| Funcionalidade | Verificado |
|---|---|
| Aceite dos Termos | Cadastro sem aceite é bloqueado; a data do aceite fica gravada na conta |
| HU8 · aprovação de novos artesãos | Artesão novo vê o aviso "em análise"; o perfil não é público até o admin aprovar pela tela; depois da aprovação o aviso some e chega a notificação |
| HU3 · perfil público do artesão | `/artesaos/:id` mostra biografia, polo e as peças ativas |
| Notificações | Sino com contador na barra; "Marcar todas como lidas" zera as não lidas |
| Favoritos | Coração no card; a peça aparece em "Meus favoritos" |
| Sacola salva na conta | Os itens vão para o servidor; ao sair e entrar de novo, a sacola volta |
| HU16 · inativar conta | Conta inativada pelo admin não consegue entrar ("Conta inativa") |

Defeitos encontrados nesta rodada (corrigidos):
- **D-08:** o contador vermelho de notificações e as etiquetas de status do pedido ("Cancelado", "Pago", "Entregue"…) tinham contraste de 3,0 a 4,1:1 (o mínimo AA é 4,5:1). As cores de fundo foram escurecidas.
- **D-09:** se o comprador tocasse num coração antes de a lista de favoritos terminar de carregar, a resposta atrasada apagava a marcação na tela. Agora as duas são combinadas.

## Conta, e-mails e imagens (`e2e/conta-e-midia.cjs`, 10 / 10)

| Funcionalidade | Verificado |
|---|---|
| Menu no celular | Botão ☰ abre a gaveta com todos os links, inclusive Contato |
| Esqueci minha senha | A tela confirma o envio; link inválido é recusado e oferece pedir outro |
| Alterar senha | No perfil, com a senha atual; a antiga deixa de funcionar e a pessoa continua conectada |
| Imagens na fila | PNG enviado vira WebP pelo worker; o original é apagado e a versão nova responde 200 |
| Limpeza | A conta de teste é excluída no final |

Na API, `tests/senha-email.test.ts` cobre o link de uso único (só o hash fica no banco, expira, um pedido novo anula o anterior, não revela quais e-mails existem) e o escape de HTML do modelo de e-mail; `tests/imagens-fila.test.ts` cobre a conversão (3000 × 2000 → 1600 px, sem EXIF), a idempotência e a troca da foto durante o processamento.

## Casos de teste do plano v3

Todos os 16 casos, que na 1ª rodada (09/11) tiveram 3 aprovados, 3 reprovados e 10 bloqueados, agora passam nos testes automatizados.

| Caso | 1ª rodada | Agora | Evidência |
|---|---|---|---|
| TC01 Rotas administrativas | Bloqueado | ✅ | `backend/tests/seguranca.test.ts` · `e2e/seguranca.mjs` |
| TC02 Concorrência no checkout | Bloqueado | ✅ | `backend/tests/checkout-pagamentos.test.ts` · `backend/tests/carga/checkout-concorrente.k6.js` |
| TC03 Filtro sem correspondência | Aprovado | ✅ | `backend/tests/produtos.test.ts` |
| TC04 Curadoria reprovada | Reprovado | ✅ | `backend/tests/curadoria.test.ts` · `e2e/integracao.cjs` |
| TC05 Validação de payload | Bloqueado | ✅ | `backend/tests/produtos.test.ts` |
| TC06 Paginação | Bloqueado | ✅ | `backend/tests/produtos.test.ts` |
| TC07 JWT expirado | Bloqueado | ✅ | `backend/tests/auth.test.ts` |
| TC08 Subtotal no backend | Reprovado | ✅ | `backend/tests/carrinho.test.ts` · `e2e/integracao.cjs` |
| TC09 Cadastro de peça | Aprovado | ✅ | `backend/tests/produtos.test.ts` · `e2e/integracao.cjs` |
| TC10 Perfil e upload | Bloqueado | ✅ | `backend/tests/perfil-upload.test.ts` |
| TC11 Perfil público | Aprovado | ✅ | `backend/tests/perfil-upload.test.ts` |
| TC12 Linha do tempo e rastreio | Bloqueado | ✅ | `backend/tests/pedidos-fila.test.ts` · `e2e/fase2.cjs` |
| TC13 IDOR | Bloqueado | ✅ | `backend/tests/pedidos-fila.test.ts` · `e2e/seguranca.mjs` |
| TC14 Estoque e frete | Reprovado | ✅ | `backend/tests/carrinho.test.ts` · `e2e/integracao.cjs` |
| TC15 Cartão aprovado/recusado | Bloqueado | ✅ | `backend/tests/checkout-pagamentos.test.ts` · `e2e/fase2.cjs` |
| TC16 PIX, webhook e expiração | Bloqueado | ✅ | `backend/tests/checkout-pagamentos.test.ts` · `e2e/fase2.cjs` |

## Defeitos encontrados nesta rodada (todos corrigidos)

| # | Defeito | Onde | Como foi encontrado | Correção |
|---|---|---|---|---|
| D-01 | Login sem limite de tentativas: 30 senhas erradas seguidas sem bloqueio (força bruta) | API `POST /api/auth/login` | Teste de segurança | Após 10 falhas em 15 min (IP + e-mail), a API responde 429. Teste novo em `seguranca.test.ts` |
| D-02 | Next.js 16.3.6 com vulnerabilidades críticas (incluindo execução remota de código e cache poisoning) | Frontend | `npm audit` | Atualizado para 16.4.6 (sem quebra) e `npm audit fix` para `sharp` e `source-map-js` |
| D-03 | Contraste insuficiente (3,38:1; o mínimo é 4,5:1) nas abas ativas e no botão "Mês atual" | Painéis do artesão e do admin | axe-core | As abas ativas passaram para texto preto sobre `terra.500` |
| D-04 | Campos e seletores sem rótulo acessível (estoque, categoria, e-mail, UF, área de atuação) | Cadastro de peça e Perfil | axe-core | `aria-label` em todos os campos |
| D-05 | Texto do rodapé do relatório com contraste baixo | Painel do admin | axe-core | Cor ajustada |
| D-06 | Série mensal do relatório do artesão com um mês a mais por causa do fuso horário | API `/api/artesao/indicadores` | Teste automatizado da API | Datas tratadas em UTC; a data final vale até 23:59:59 |

## Benchmark (FCCPD)

**Checkout concorrente**, com 50 usuários virtuais disparando ao mesmo tempo contra 1 unidade em estoque:

| Métrica | Valor |
|---|---|
| Vendas / recusas "Item esgotado" / respostas inesperadas | 1 / 49 / 0 |
| Estoque final | 0 (sem overselling, sem valor negativo) |
| Tempo de resposta, mediana · p95 · máximo | 75 ms · 319 ms · 331 ms |

O k6 conta as 49 respostas 400 como `http_req_failed` (46,7 %), mas essas recusas são o resultado correto.

**Vitrine com e sem cache Redis**, com 50 usuários virtuais por 15 s em cada cenário:

| Cenário | Requisições | Vazão | Mediana | p95 | Erros |
|---|---|---|---|---|---|
| Com cache (mesma consulta, `X-Cache: HIT`) | 4.228 | ~282 req/s | 158 ms | 341 ms | 0 |
| Sem cache (consulta diferente a cada requisição, vai ao PostgreSQL) | 2.288 | ~152 req/s | 298 ms | 631 ms | 0 |

As 47 respostas MISS no cenário com cache são as primeiras requisições simultâneas, antes de o cache ser preenchido (cache frio).

## Riscos aceitos e limitações

- **Dependências:** as 5 vulnerabilidades "altas" do backend (Zod 3 e `deepmerge-ts` do Prisma 6) foram corrigidas com a migração para Zod 4.6 e Prisma 7.10 (driver `pg`). Os 123 testes passaram sem mudanças de comportamento. Restam avisos apenas em ferramentas de desenvolvimento (Jest/glob), que não vão para o servidor.
- **Ambiente dos números de desempenho:** os números vêm de uma máquina de desenvolvimento Windows, com a API em modo watch. Valem como comparação (com e sem cache), não como capacidade de produção.
- **Celular e tablet emulados:** a responsividade foi verificada por emulação de tela no Edge, não em aparelhos físicos.
- **CI:** o workflow `.github/workflows/ci.yml` roda na branch `integracao-backend` do GitHub. Todos os passos dele (lint, tipos, testes, build) também foram executados localmente com sucesso.
- **Pagamentos e frete simulados,** conforme a restrição de escopo do Notion. Não há integração com gateway nem com os Correios.

## Como reproduzir

```bash
# Infra + API + worker + frontend (ver README da raiz)
cd backend && npm test                     # 123 testes da API
cd backend && npm run test:cobertura       # relatório de cobertura (backend/coverage/index.html)
cd backend && npm run test:carga           # k6 (ou via Docker, ver backend/README.md)
cd e2e && npm install && npm test          # segurança + 3 roteiros de fluxo + responsividade/acessibilidade
```
