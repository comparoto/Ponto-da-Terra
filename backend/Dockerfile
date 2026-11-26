# API + worker do Origem: Ponto da Terra (SO · Unidade 1: containerização)
# A MESMA imagem serve os dois processos; o que muda é o comando:
#   API:     (padrão) aplica as migrations e sobe node dist/server.js
#   worker:  node dist/worker.js   (consumidor da fila BullMQ)
# Construir (a partir da pasta backend/):  docker build -t ponto-da-terra-api .

# Etapa 1: instalar dependências e compilar o TypeScript
FROM node:22-alpine AS construtor
WORKDIR /app
# O postinstall roda "prisma generate", que precisa do schema: copiar prisma/ antes do npm ci
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# Etapa 2: imagem de execução (sem código-fonte TypeScript, testes nem scripts)
FROM node:22-alpine AS execucao
WORKDIR /app
ENV NODE_ENV=production
# node_modules completo: a CLI do Prisma (devDependency) é necessária para "migrate deploy" ao iniciar
COPY --from=construtor --chown=node:node /app/node_modules ./node_modules
COPY --from=construtor --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3333
# Healthcheck: /api/health responde 200 com banco OK (503 se o banco cair)
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3333)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
