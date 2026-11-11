import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // Migrations usam a conexão direta (no Neon, sem o pooler); localmente é a mesma URL.
  // Opcional: `prisma generate` (no build da Vercel, por exemplo) roda sem banco configurado.
  datasource: { url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL },
});
