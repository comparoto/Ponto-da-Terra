# API · Origem: Ponto da Terra

Backend REST do marketplace, que substituiu a Fake API do frontend. Tem dois processos: a **API HTTP** e um **worker** de filas.
Requisitos, decisões e roadmap: [`../REQUISITOS_BACKEND.md`](../REQUISITOS_BACKEND.md).

**Stack:** Node.js + TypeScript · Express 5 · Prisma 7 (driver `pg`) · PostgreSQL 16 · Redis 7 + BullMQ · Zod 4 · JWT · Swagger · Nodemailer (SMTP) · sharp · Jest + Supertest · k6

```
Frontend (Next.js) ──HTTP──► API (Express) ──► PostgreSQL
                               │  └─ outbox (mesma transação)
                               └─ cache ──► Redis ◄── fila BullMQ ◄── relay ──┐
                                                         │                    │
                                                         ▼                    │
                                                  Worker (processo separado) ─┘
                                                  · notificações + e-mail simulado
                                                  · expiração de reservas (PIX/boleto)
```

## Como rodar

Pré-requisitos: **Node 20+** e **Docker Desktop** rodando.

```bash
cd backend
npm install
cp .env.example .env          # já vem com valores de desenvolvimento
npm run db:up                 # sobe PostgreSQL (porta 5434) e Redis (porta 6380)
npx prisma migrate deploy     # cria as tabelas
npm run db:seed               # popula com artesãos, peças e contas de demonstração
npm run dev                   # terminal 1: API em http://localhost:3333/api
npm run dev:worker            # terminal 2: worker das filas (notificações e expiração de reservas)
```

- **Swagger:** http://localhost:3333/api/docs (botão **Authorize** → cole o token do login)
- **Health check:** http://localhost:3333/api/health

Sem o worker, a API funciona normalmente, mas as notificações de "novo pedido" não são geradas e os PIX/boletos vencidos não liberam o estoque.

### Contas de demonstração (criadas pelo seed)

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@pontodaterra.com` | `admin123` |
| Comprador | `comprador@pontodaterra.com` | `comprador123` |
| Artesão (Mestre Severino Ramos) | `artesao@pontodaterra.com` | `artesao123` |
| Demais artesãos | `artesao2@` … `artesao6@pontodaterra.com` | `artesao123` |

### Pagamentos (simulados, sem gateway real, como pede o Notion)

| Meio | Comportamento |
|---|---|
| PIX | QR Code e "copia e cola" (formato BR Code com CRC16), válido por 30 min. Na tela da compra há um botão "Simular pagamento aprovado"; em produção a confirmação viria pelo webhook `POST /api/pagamentos/webhook` |
| Cartão | De 1x a 6x, aprovação síncrona. Teste aprovado: `4111 1111 1111 1111` · recusado: `4000 0000 0000 0002` |
| Boleto | Linha digitável e PDF, vencimento em 3 dias úteis |

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` / `npm run dev:worker` | API e worker com reload automático |
| `npm test` | Suíte Jest (usa o banco `pontodaterra_test`, nunca o de desenvolvimento) |
| `npm run test:carga` / `test:carga:vitrine` | k6: concorrência do checkout (50 compradores, 1 unidade) e benchmark do cache da vitrine |
| `npm run test:cobertura` | Testes com relatório de cobertura (`coverage/index.html`) |
| `npm run typecheck` | Checagem de tipos |
| `npm run build` / `npm start` / `npm run worker` | Build e execução de produção |
| `npm run db:up` / `db:down` | Sobe / derruba os contêineres Docker |
| `npm run db:seed` | **Apaga** e repopula o banco de desenvolvimento (bloqueado com `NODE_ENV=production`) |
| `npm run db:studio` | Interface visual do banco (Prisma Studio) |

## Estrutura

```
backend/
├── docker-compose.yml        # PostgreSQL + Redis (projeto "ponto-da-terra")
├── prisma/
│   ├── schema.prisma         # modelo de dados (baseado no Diagrama de Classes)
│   ├── migrations/           # SQL versionado (inclui CHECKs: estoque >= 0, nota 1..5, preço > 0)
│   ├── seed.ts               # dados iniciais
│   └── seed-data.json        # artesãos e peças iniciais (vieram da antiga Fake API do frontend)
├── src/
│   ├── app.ts / server.ts    # API HTTP
│   ├── worker.ts             # processo do worker (BullMQ)
│   ├── jobs/                 # relay da outbox, consumidor de eventos, configuração das filas
│   ├── config/               # env (validado com Zod), Prisma, Redis
│   ├── shared/               # ApiResult, erros, validação, auth JWT, cache, upload, eventos, paginação
│   ├── docs/                 # geração do OpenAPI a partir dos schemas Zod
│   └── modules/
│       ├── auth/  produtos/  artesaos/  carrinho/  notificacoes/
│       ├── compras/          # checkout atômico + gateway de pagamento simulado (Strategy)
│       ├── pedidos/          # status, rastreio, linha do tempo, visão do admin
│       ├── interacao/        # avaliações e contato com o produtor
│       ├── relatorios/       # indicadores do admin e do artesão (consultas em paralelo)
│       └── admin/            # curadoria, usuários, dashboard
└── tests/                    # Jest (integração) e carga/ (k6)
```

## Concorrência e filas (FCCPD)

| Mecanismo | Onde | Garantia |
|---|---|---|
| `UPDATE ... WHERE quantidadeDisponivel >= n` em transação, com produtos em ordem de id | `compras.service.ts` (checkout) | Sem overselling: 50 compras simultâneas de 1 unidade → 1 sucesso, 49 recusas |
| `CHECK (quantidadeDisponivel >= 0)` | migration | Segunda barreira no banco |
| `SELECT ... FOR UPDATE` na compra, na mesma ordem em todas as operações | pagamento, webhook, expiração | Webhook duplicado processado uma vez; sem corrida entre pagar e expirar |
| `FOR UPDATE SKIP LOCKED` | relay da outbox e expiração de reservas | Vários workers em paralelo sem pegar o mesmo item |
| Transactional Outbox + `jobId` = id do evento | `shared/eventos.ts`, `jobs/outbox.ts` | Nenhum evento perdido nem duplicado |
| `eventoId` único na notificação | `jobs/processar-evento.ts` | Reprocessamento (retry) não duplica notificação |
| `Promise.all` nas agregações | `relatorios.service.ts` | Relatórios em paralelo (tempo = consulta mais lenta, não a soma) |

## Rotas

São 60 rotas, todas documentadas no Swagger. Principais grupos:

| Área | Rotas |
|---|---|
| Autenticação | `POST /api/auth/cadastro`, `/login` (ambos aceitam `aceiteTermos`, que grava a data do aceite), `/logout`, `GET/PUT/DELETE /api/me` (o perfil traz `termosAceitosEm` e a situação do cadastro do artesão), `PUT /api/me/senha` (troca com a senha atual), `POST /api/auth/esqueci-senha` e `/redefinir-senha` (link por e-mail, uso único, 60 min) |
| Vitrine | `GET /api/produtos` (filtros, paginação, cache), `GET /api/produtos/:id`, `GET /api/categorias`, `GET /api/produtos/:id/avaliacoes` |
| Artesão | peças (`/api/artesao/produtos`, `POST/PUT/DELETE /api/produtos`, estoque, fotos), perfil e fotos, `/api/artesao/pedidos`, `/api/artesao/mensagens`, `/api/artesao/indicadores`, `/api/artesao/checklist` |
| Compra | `POST /api/carrinho/calcular`, `GET /api/frete`, `POST /api/checkout`, `GET /api/compras/:codigo`, `POST /api/compras/:codigo/pagamento`, `POST /api/pagamentos/webhook`, `GET /api/pagamentos/:tx/boleto.pdf` |
| Comprador | `GET /api/comprador/favoritos`, `POST/DELETE /api/favoritos/:produtoId`, `GET/PUT /api/carrinho` (sacola salva na conta), `GET /api/comprador/pedidos`, `GET /api/pedidos/:id`, `POST /api/pedidos/:id/confirmar-recebimento`, `POST /api/avaliacoes`, `POST /api/produtos/:id/mensagens` |
| Admin | curadoria (`/api/admin/curadoria`, aprovar/reprovar), cadastros de novos artesãos (`GET /api/admin/cadastros`, `POST /api/admin/artesaos/:id/aprovar-cadastro` e `/reprovar-cadastro`), `/api/admin/usuarios` (suspender/inativar/reativar), `/api/admin/pedidos` (+ intervenções), `/api/admin/dashboard/metricas` |
| Geral | `GET /api/artesaos/:id` (perfil público), `GET /api/notificacoes`, `PATCH /api/notificacoes/:id/lida`, `POST /api/notificacoes/marcar-todas-lidas`, `GET /api/health` |

## E-mails e imagens

- **E-mails:** notificações (novo pedido, peça aprovada/reprovada, pedido atualizado, cadastro aprovado...), aviso de troca de senha e link de "Esqueci minha senha" saem pelo SMTP configurado em `SMTP_URL` (Mailtrap, Resend, Brevo, Gmail...), num modelo HTML com a identidade do site. Sem `SMTP_URL`, ficam só registrados no log. `SITE_URL` define o endereço usado nos links.
- **Imagens:** o upload valida e grava o original na hora e registra o evento `IMAGEM_ENVIADA` na outbox. A fila (worker BullMQ local ou QStash na Vercel) gera uma versão WebP de no máximo 1600 px, corrige a rotação e remove os metadados EXIF (inclusive GPS), troca a URL no banco de forma atômica e apaga o original. Se a foto for trocada antes do processamento, a versão nova é descartada.

## Testes

- **API (Jest, 144 testes):** `npm test`. Cada caso de teste do plano tem seu teste: TC01–TC16, HU3, HU8–HU10, HU12–HU18, favoritos, sacola salva, aceite dos Termos, troca/recuperação de senha e otimização de imagens na fila.
- **Contrato das respostas:** `tests/contrato-respostas.test.ts` chama as rotas de verdade e compara cada resposta com o schema documentado no Swagger (`src/docs/respostas.ts`). Campo a mais ou a menos, na resposta ou na documentação, faz o teste falhar. Assim o Swagger descreve exatamente o que a API devolve, e nenhuma rota usa `z.any()`.
- **Sem `any`:** é regra do projeto. `npm run lint` (backend e frontend) proíbe o `any` escrito e, no código de produção, também o que entra por inferência (como o resultado de `JSON.parse`): esses dados são tratados como `unknown` e conferidos antes do uso. O lint roda no CI. O `tests/sem-any.test.ts` é uma segunda barreira dentro da suíte. A entrada validada pelo Zod é lida com `entrada(req, 'body', schema)` (`src/shared/validate.ts`), que devolve o tipo exato do schema. Nos testes só o `res.body` do supertest chega como `any`, porque a própria biblioteca o tipa assim.
- **Limpar dados de teste:** os roteiros E2E criam contas `@teste.com` e peças "Peça de teste E2E". `npm run limpar:testes` lista o que eles deixaram no banco do `DATABASE_URL`; `npm run limpar:testes -- --apagar` remove tudo numa transação (contas de demonstração e peças reais não são tocadas).
- **Carga (k6):** `npm run test:carga`, com a API rodando. Se o k6 não estiver instalado, use o Docker:
  `docker run --rm -i -e API=http://host.docker.internal:3333/api grafana/k6 run - < tests/carga/checkout-concorrente.k6.js`
- **Navegador e segurança:** pasta [`../e2e`](../e2e): 89 verificações de fluxo, 39 de responsividade e acessibilidade e 20 ataques de segurança. Resultados em [`../RELATORIO_TESTES.md`](../RELATORIO_TESTES.md).
- **CI:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) roda typecheck, testes e build da API e lint, typecheck e build do frontend em todo push e PR.

| Caso (plano v3) | 1ª rodada (09/11) | Coberto por |
|---|---|---|
| TC01 · Rotas administrativas | Bloqueado | `tests/seguranca.test.ts` |
| TC02 · Concorrência no checkout | Bloqueado | `tests/checkout-pagamentos.test.ts` (50 compradores) + `tests/carga/` (k6) |
| TC03 · Filtro sem correspondência | Aprovado | `tests/produtos.test.ts` |
| TC04 · Curadoria reprovada | **Reprovado** | `tests/curadoria.test.ts` + E2E |
| TC05 · Validação de payload | Bloqueado | `tests/produtos.test.ts` |
| TC06 · Paginação | Bloqueado | `tests/produtos.test.ts` |
| TC07 · JWT expirado | Bloqueado | `tests/auth.test.ts` |
| TC08 · Subtotal no backend | **Reprovado** | `tests/carrinho.test.ts` + E2E |
| TC09 · Cadastro de peça | Aprovado | `tests/produtos.test.ts` + E2E |
| TC10 · Perfil e upload | Bloqueado | `tests/perfil-upload.test.ts` |
| TC11 · Perfil público | Aprovado | `tests/perfil-upload.test.ts` |
| TC12 · Linha do tempo e rastreio | Bloqueado | `tests/pedidos-fila.test.ts` + E2E |
| TC13 · IDOR | Bloqueado | `tests/pedidos-fila.test.ts` |
| TC14 · Estoque e frete | **Reprovado** | `tests/carrinho.test.ts` + E2E |
| TC15 · Cartão aprovado/recusado | Bloqueado | `tests/checkout-pagamentos.test.ts` + E2E |
| TC16 · PIX, webhook e expiração | Bloqueado | `tests/checkout-pagamentos.test.ts` + E2E |
