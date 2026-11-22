# Relatório de Execução de Testes · 2ª rodada

**Requisitos, Projeto de Software e Validação · ADS020_ED · Turma Embarque Digital · 2026.2**
Equipe 6 · Ponto da Terra · unidade 2 · executado em 22/11/2026

Esta rodada repete os mesmos 16 casos de teste (TC01 a TC16) da 1ª rodada, de 09/11/2026, agora com o backend integrado ao frontend.

## Identificação da rodada

| | |
|---|---|
| **Objeto de teste** | Plano de testes da Equipe 06: vitrine, catálogo, carrinho, checkout, pedidos, perfil de usuário e pagamentos |
| **Versão testada** | Plano v3. Código da branch `integracao-backend`, commit `5abf3e7` (frontend Next.js 16.4.6, API Express 5 com Prisma 7 e PostgreSQL 16) |
| **Data de execução** | 22/11/2026 |
| **Ambiente** | Local: Windows 11, Node 24, PostgreSQL 16 e Redis 7 em Docker, API, worker de filas e site rodando, Microsoft Edge (Playwright) e k6 (Docker) |
| **Tipo de execução** | Automatizada (Jest com Supertest, Playwright e k6). Na 1ª rodada, a execução foi manual |
| **Responsável** | Paulo César da Silva Marrocos, com apoio do Claude Code |
| **Base de comparação** | Relatório da 1ª rodada (09/11/2026): 3 aprovados, 3 reprovados e 10 bloqueados |

## Síntese dos resultados

| Resultado | 1ª rodada (09/11) | 2ª rodada (22/11) |
|---|---|---|
| Aprovados | 3 (TC03, TC09, TC11) | **16** |
| Reprovados | 3 (TC04, TC08, TC14) | **0** |
| Bloqueados | 10 | **0** |
| Defeitos abertos | 0 | **0** |

Os 10 casos que estavam bloqueados por falta de backend (TC01, TC02, TC05, TC06, TC07, TC10, TC12, TC13, TC15 e TC16) puderam ser executados, e os 3 reprovados (TC04, TC08 e TC14) passaram a atender os critérios. Os 3 que já estavam aprovados continuam aprovados.

**Recomendação:** liberar, com as ressalvas da seção "Limites desta rodada".

## O que foi executado

| Execução | Resultado |
|---|---|
| Testes de API (Jest + Supertest, 16 suítes) | 143 de 143 passaram |
| Teste de carga do checkout, 50 usuários simultâneos (k6) | 1 venda, 49 recusas, 0 respostas inesperadas, estoque final 0, 95% das respostas em 1,3 s (limite: 2 s) |
| Segurança caixa-preta (Playwright) | 20 de 20 verificações |
| Fluxos de integração: curadoria, carrinho, checkout (Playwright) | 18 de 18 |
| Fluxos de contato, pagamentos, pedidos, rastreio, avaliação e painéis (Playwright) | 23 de 23 |
| Casos que dependem da tela: TC03, TC10 e TC11 (Playwright) | 20 de 20 |
| Responsividade e acessibilidade, 13 telas em 3 tamanhos (Playwright, axe-core) | 39 de 39, 0 violações |

## Execução dos casos de teste

| Caso de teste | 1ª rodada | 2ª rodada | Observação |
|---|---|---|---|
| **TC01** · Proteção de rotas administrativas | Bloqueado | **Aprovado** | Comprador e artesão recebem 403 e visitante recebe 401 nas três rotas de curadoria; o admin recebe 200. A checagem agora é feita no servidor (middleware), e não mais só no navegador. Comprador não cadastra peça (403) e artesão não edita peça de outro (403). Tokens forjados (sem assinatura, perfil trocado para administrador, segredo comum) são rejeitados. |
| **TC02** · Concorrência no checkout e consistência de estoque | Bloqueado | **Aprovado** | Teste de carga com 50 compradores ao mesmo tempo disputando 1 unidade: exatamente 1 resposta 201 e 49 respostas 400 ("Item esgotado durante a finalização"), nenhuma resposta inesperada, estoque final 0 e 95% das respostas em 1,3 s. O teste equivalente da suíte de API também passou. |
| **TC03** · Vitrine responsiva, filtro sem correspondência | Aprovado | **Aprovado** | A API devolve 200 com lista vazia e total 0. Na tela, tanto no celular (375 px) quanto no computador, aparecem "Nenhuma peça encontrada" e "Exibindo 0 peças", sem rolagem horizontal e sem erro de JavaScript; "Ver todas as peças" restaura o catálogo. |
| **TC04** · Moderação de catálogo, curadoria | Reprovado | **Aprovado** | Reprovar exige motivo (sem motivo, 400 e a peça continua pendente). A peça reprovada fica com o status "Reprovado" e não é mais apagada; sai da vitrine, o artesão é notificado e vê o motivo no painel. Não se reprova duas vezes. Peça ainda não aprovada não aparece na vitrine (o ponto mais urgente da 1ª rodada). |
| **TC05** · Validação de payload na criação de produto | Bloqueado | **Aprovado** | Sem título e com preço negativo, a API responde 400 listando exatamente os campos inválidos. Estoque negativo e preço com 3 casas decimais também recebem 400. |
| **TC06** · Paginação do catálogo | Bloqueado | **Aprovado** | Com 25 produtos, `page=2&limit=10` devolve os itens 11 a 20 com os metadados corretos; parâmetros de paginação inválidos recebem 400. |
| **TC07** · Bloqueio de acesso com token JWT expirado | Bloqueado | **Aprovado** | Token vencido recebe 401 "Sessão expirada"; token assinado com outro segredo recebe 401 "Token inválido". |
| **TC08** · Cálculo de subtotal do carrinho na API | Reprovado | **Aprovado** | `POST /api/carrinho/calcular` busca os preços no banco: 2 × R$ 50 + 1 × R$ 30 = R$ 130, ignorando os valores enviados. Na tela, mesmo com o preço adulterado para R$ 0,01 no navegador, o checkout mostra R$ 85,00 vindo do servidor. |
| **TC09** · Cadastro de peça e validação no formulário | Aprovado | **Aprovado** | Sem polo de origem e técnica, a API responde 400 destacando os dois campos. Com os dois, a peça é gravada como pendente, listada no painel como "Em análise" e fica fora da vitrine até a curadoria aprovar. O formulário vazio é bloqueado na tela com a lista de campos obrigatórios. |
| **TC10** · Atualização do perfil e upload de fotos | Bloqueado | **Aprovado** | `PUT /api/artesao/perfil` atualiza e a página pública reflete na hora. JPG de 4,9 MB e PNG são aceitos; JPG de 5,1 MB e GIF (inclusive renomeado para .jpg) são recusados sem gravar nada, tanto na API quanto na tela. O campo da foto da oficina funciona e a imagem fica gravada no perfil. |
| **TC11** · Acesso ao perfil público do artesão | Aprovado | **Aprovado** | A página pública lista só as peças ativas do artesão; sem biografia, o campo vem vazio e o resto aparece; id inexistente dá 404. Na tela, a foto e o nome do artesão na vitrine mostram as peças dele, e há também a página pública (link "Ver perfil" e o nome no detalhe da peça). |
| **TC12** · Linha do tempo e rastreio do pedido | Bloqueado | **Aprovado** | Fluxo completo: produção, postado (com código de rastreio) e entregue, com linha do tempo de 4 etapas. Transição inválida (entregue antes de postar) recebe 400; o artesão não altera pedido de outro (403). Na tela, o comprador vê o código de rastreio e o link dos Correios. |
| **TC13** · Isolamento de pedidos entre compradores (IDOR) | Bloqueado | **Aprovado** | O comprador A lista só os pedidos dele; o pedido do comprador B responde 404 e, sem token, 401. Compra inexistente ou alheia responde 404 sem expor dados. |
| **TC14** · Carrinho com limite de estoque e cálculo de frete | Reprovado | **Aprovado** | Com 2 unidades em estoque, 2 é aceito e 3 recebe 400 "Limite de estoque atingido para esta peça". O frete varia por região (não é mais R$ 15,00 fixo) e é calculado em menos de 300 ms. CEPs inválidos (00000-000, 1234, abcde-fgh, 11111111) recebem 400. Na tela, o botão "+" fica desabilitado no limite e a mensagem aparece. |
| **TC15** · Pagamento com cartão aprovado e recusado | Bloqueado | **Aprovado** | Cartão aprovado em 3x deixa a compra e os pedidos como pagos, com as parcelas registradas. Cartão recusado responde 402 com mensagem amigável, devolve o estoque e cancela a compra. Dados de cartão inválidos e mais de 6 parcelas recebem 400. Outro comprador não vê nem paga a compra (404). Na tela, a recusa mostra mensagem amigável e o carrinho continua intacto. |
| **TC16** · Pagamento via PIX com webhook e expiração | Bloqueado | **Aprovado** | O PIX gera QR Code e "copia e cola" com expiração de 30 minutos, e o pedido fica aguardando pagamento. Dois avisos simultâneos do gateway são processados uma só vez, sem baixa dupla de estoque; aviso sem o segredo recebe 401. PIX não pago depois do prazo cancela a compra e devolve o estoque. Na tela, aparecem o QR, o "copia e cola", a contagem regressiva e a confirmação. |

## Registro de defeitos

Nenhum defeito aberto nesta rodada. Os defeitos encontrados e corrigidos durante o desenvolvimento estão no `RELATORIO_TESTES.md`.

## Limites desta rodada

- **Execução automatizada, não manual.** A 1ª rodada foi manual, e esta foi feita por scripts. Eles repetem, de forma automática, o que o relatório anterior apontava como falha, mas não substituem uma rodada manual da equipe em sala.
- **Ambiente local.** O código testado é o da branch `integracao-backend`, rodando na máquina de desenvolvimento. A versão publicada na Vercel passou pelos mesmos roteiros em 11/11/2026, e os resultados estão no `RELATORIO_TESTES.md`.
- **Critérios do plano.** Cada caso foi avaliado contra o que o relatório da 1ª rodada apontava como falha e contra os requisitos do projeto. O texto completo do plano v3 não foi reaberto para esta rodada, então vale a equipe conferir, caso a caso, se algum critério adicional do plano ficou de fora.
- **Pagamentos e frete são simulados**, conforme a restrição de escopo do projeto: não há gateway real nem integração com os Correios.

## Como repetir a rodada

```bash
# Infraestrutura e serviços (ver README da raiz)
cd backend && npm run db:up && npm run dev          # API
cd backend && npm run dev:worker                    # worker de filas
npm run build && npx next start -p 3002             # site, na raiz do projeto

cd backend && npm test                              # 143 testes de API
cd backend && npm run test:carga                    # k6, TC02 (ou via Docker, ver backend/README.md)
cd e2e && FRONT_URL=http://localhost:3002 npm test  # segurança, fluxos, telas e responsividade
cd backend && npm run limpar:testes -- --apagar     # remove os dados criados pelos roteiros
```
