# Deploy na Vercel · Origem: Ponto da Terra

## ✅ Situação atual (11/11/2026): publicado

| | Endereço |
|---|---|
| **Site** | https://ponto-da-terra-eight.vercel.app |
| **API** | https://ponto-da-terra-api.vercel.app/api · documentação em [/api/docs](https://ponto-da-terra-api.vercel.app/api/docs) |
| **Time na Vercel** | `ponto-da-terra` (plano Hobby) · projetos `ponto-da-terra` (site) e `ponto-da-terra-api` |
| **Serviços conectados** | Neon `ponto-da-terra-db` · Upstash Redis `ponto-da-terra-redis` · Upstash QStash `ponto-da-terra-fila` · Vercel Blob `ponto-da-terra-fotos` |

O endereço `ponto-da-terra.vercel.app` pertence ao deploy da 1ª entrega, em outra conta; por isso a Vercel gerou `ponto-da-terra-eight`. Para trocar, adicione um domínio em **Settings → Domains** do projeto do site e inclua o novo endereço no `CORS_ORIGIN` da API.

**Verificado em produção:**
- Segurança: 20 de 20 ataques bloqueados. O JWT forjado com `alg: none` é barrado já pelo firewall da Vercel (403).
- Fluxos no navegador: 18 de 18 e 23 de 23 verificações.
- Fila: o QStash entregou a notificação de "Novo pedido" ao artesão.
- Expiração agendada: um PIX não pago foi cancelado sozinho após 30 min, com o estoque devolvido.

Para publicar uma nova versão pela linha de comando: `cd backend && npx vercel deploy --prod` (API) e, na raiz, `npx vercel deploy --prod` (site).

A aplicação vira **dois projetos na Vercel**, ligados ao mesmo repositório:

| Projeto Vercel | Root Directory | O que roda |
|---|---|---|
| `ponto-da-terra-api` | `backend` | API Express como função serverless (`backend/api/index.ts`), rotas da fila e tarefas agendadas |
| `ponto-da-terra` | *(raiz)* | Site Next.js |

E quatro serviços gratuitos do **Marketplace da Vercel**, conectados ao projeto da API:

| Serviço | Para quê | Variáveis que a integração cria sozinha |
|---|---|---|
| **Neon** (Postgres) | Banco de dados | `DATABASE_URL`, `DATABASE_URL_UNPOOLED` |
| **Upstash Redis** | Cache da vitrine e termos mais buscados | `REDIS_URL` ou `KV_URL` |
| **Upstash QStash** | Fila (substitui o worker BullMQ) | `QSTASH_TOKEN`, `QSTASH_URL`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` |
| **Vercel Blob** | Fotos das peças e dos ateliês | `BLOB_READ_WRITE_TOKEN` |

> Os nomes das variáveis criadas pelas integrações podem mudar de um provedor para outro. Depois de conectar, confira em **Settings → Environment Variables** se existem os nomes acima. A API aceita `REDIS_URL` ou `KV_URL` para o Redis.

## Como a fila funciona na Vercel

A Vercel não mantém processos ligados o tempo todo, então o worker BullMQ dá lugar ao QStash. Localmente, nada muda: continua BullMQ + `npm run dev:worker`.

```
Checkout ──(mesma transação)──► EventoOutbox
   └─ logo após responder ──► relay ──► QStash ──HTTP──► POST /api/jobs/evento ──► notificação + e-mail simulado
PIX/boleto criado ──► mensagem agendada para o vencimento ──► POST /api/jobs/expirar-reservas
Vercel Cron (1x por dia) ──► expirar-reservas e outbox-relay (rede de segurança)
```

O código escolhe o modo sozinho: com `QSTASH_TOKEN` usa QStash; sem ele, usa BullMQ.

---

## Passo a passo (pelo painel, com o repositório no GitHub)

### 0. Pré-requisito
O código precisa estar no GitHub (veja "Alternativa: pela linha de comando" se ainda não estiver).

### 1. Projeto da API
1. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
2. **Project Name:** `ponto-da-terra-api` · **Root Directory:** `backend` · **Framework Preset:** Other.
   O resto (instalação, build, rotas e cron) vem do `backend/vercel.json`.
3. **Antes de fazer o deploy**, abra **Storage** no projeto e conecte o **Neon**, o **Upstash Redis**, o **Upstash QStash** e o **Vercel Blob** (Create/Connect → plano gratuito → marque o projeto `ponto-da-terra-api`, em Production e Preview).
4. Em **Settings → Environment Variables**, adicione:

   | Variável | Valor |
   |---|---|
   | `JWT_SECRET` | um segredo aleatório (comando abaixo) |
   | `WEBHOOK_SECRET` | outro segredo aleatório |
   | `CRON_SECRET` | outro segredo aleatório |
   | `CORS_ORIGIN` | `https://ponto-da-terra.vercel.app,https://ponto-da-terra-*.vercel.app` (troque pelo endereço real do site no passo 3; o `*` libera as URLs de preview) |

   Para gerar cada segredo: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

   `PUBLIC_URL` e `NODE_ENV` **não** precisam ser definidas: a API usa a URL de produção que a Vercel informa, e a Vercel já define `NODE_ENV=production`.
5. Faça o **Deploy**. O build roda `prisma migrate deploy`, que cria as tabelas no Neon.
6. Teste: `https://ponto-da-terra-api.vercel.app/api/health` deve responder `"banco":"ok","redis":"ok"`. A documentação fica em `/api/docs`.

### 2. Dados iniciais (uma única vez)
O seed **apaga** as tabelas e cria as contas de demonstração e as 13 peças. Rode da sua máquina, com a URL **direta** do Neon (`DATABASE_URL_UNPOOLED`, em Settings → Environment Variables):

```bash
cd backend
DATABASE_URL="<url direta do Neon>" DATABASE_URL_UNPOOLED="<url direta do Neon>" npx tsx prisma/seed.ts
```

No PowerShell: `$env:DATABASE_URL="..."; $env:DATABASE_URL_UNPOOLED="..."; npx tsx prisma/seed.ts`

### 3. Projeto do site
1. Em [vercel.com/new](https://vercel.com/new), importe **o mesmo repositório** de novo.
2. **Project Name:** `ponto-da-terra` · **Root Directory:** *(deixe a raiz)* · **Framework Preset:** Next.js.
3. **Environment Variables:** `NEXT_PUBLIC_API_URL` = `https://ponto-da-terra-api.vercel.app/api`
4. Faça o **Deploy**.
5. Se o endereço final do site for diferente do que você pôs no `CORS_ORIGIN` da API, corrija lá e faça **Redeploy** da API.

### 4. Conferir
- Abra o site, entre com `comprador@pontodaterra.com / comprador123`, compre com PIX e clique em "Simular pagamento aprovado".
- Entre como `artesao@pontodaterra.com / artesao123`. Em **Notificações**, o "Novo pedido" deve aparecer em alguns segundos (via QStash).
- Testes automatizados contra produção (eles criam dados de teste):
  `cd e2e && FRONT_URL=https://ponto-da-terra.vercel.app API_URL=https://ponto-da-terra-api.vercel.app/api npm test`

---

## Alternativa: pela linha de comando (sem GitHub)

```bash
npx vercel login                       # abre o navegador para entrar na conta

cd backend
npx vercel link                        # cria o projeto "ponto-da-terra-api" (Root Directory já é esta pasta)
#  → conecte Neon, Upstash Redis, Upstash QStash e Vercel Blob pelo painel (Storage) e adicione as variáveis do passo 1.4
npx vercel --prod                      # deploy da API

cd ..
npx vercel link                        # cria o projeto "ponto-da-terra"
npx vercel env add NEXT_PUBLIC_API_URL production   # cole https://ponto-da-terra-api.vercel.app/api
npx vercel --prod                      # deploy do site
```

O `.vercelignore` da raiz impede que a pasta `backend/` seja enviada junto com o site.

---

## Limitações conhecidas no plano gratuito (Hobby)

- **Fotos acima de ~4,5 MB:** a Vercel limita o corpo das requisições das funções a 4,5 MB. A API aceita até 5 MB localmente; na Vercel, fotos entre 4,5 e 5 MB são recusadas pela plataforma (HTTP 413).
- **Cron diário:** no plano Hobby, as tarefas agendadas rodam 1 vez por dia. Isso não afeta o funcionamento normal: a expiração de cada PIX/boleto é agendada no QStash para o horário exato, e o cron é só uma rede de segurança.
- **Limite de tentativas de login por instância:** o contador fica na memória de cada instância da função. Sob carga, com várias instâncias, o limite efetivo é maior. Para endurecer, troque o armazenamento do `express-rate-limit` pelo Redis.
- **Previews usam o mesmo banco:** deploys de preview da API rodam as migrations no mesmo Neon da produção. Para isolar, crie uma *branch* do Neon para Preview nas configurações da integração.
- **Primeira requisição mais lenta:** uma função "fria" leva alguns segundos para abrir a conexão com o banco e o Redis.
- **Cotas gratuitas:** QStash, Neon, Upstash e Blob têm limites mensais, suficientes para demonstração acadêmica.

## Verificado antes do deploy

- **API:** `vercel build` executado num contêiner Linux com Node 22, igual ao ambiente de build da Vercel. A função empacotada foi executada e respondeu health, vitrine, login, Swagger e OpenAPI com HTTP 200; bloqueou as rotas internas sem autorização (401) e aceitou o CORS das URLs de preview.
- **Site:** `vercel build` do Next.js 16.4.6 concluído, com a URL da API embutida no bundle.
- **Modo serverless:** 114 testes de API passando, incluindo os novos, que cobrem as rotas de fila, o CORS com curinga e o ajuste da URL do Neon.
