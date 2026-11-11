/**
 * Remove os dados criados pelos testes automatizados (e2e/) de um banco: contas "@teste.com",
 * peças "Peça E2E…" / "Peça de teste E2E…", as compras ligadas a elas e o que depende delas.
 * Contas de demonstração (@pontodaterra.com) e peças reais não são tocadas.
 *
 * Uso (na pasta backend/, com DATABASE_URL apontando para o banco desejado):
 *   npm run limpar:testes             → só lista o que seria apagado
 *   npm run limpar:testes -- --apagar → apaga (tudo numa transação)
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)! }) });
const apagar = process.argv.includes('--apagar');
const TERMOS_DE_TESTE = /e2e|drop table|<script|or 1=1/i;

async function main() {
  const banco = new URL(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || 'postgresql://?').host;
  console.log(`Banco: ${banco}${apagar ? '' : '  (apenas listando; use --apagar para remover)'}`);

  const usuarios = await prisma.usuario.findMany({
    where: { email: { endsWith: '@teste.com' } },
    select: { id: true, email: true, consumidor: { select: { id: true } }, artesao: { select: { id: true } } },
  });
  const consumidorIds = usuarios.flatMap(u => (u.consumidor ? [u.consumidor.id] : []));
  const artesaoIds = usuarios.flatMap(u => (u.artesao ? [u.artesao.id] : []));
  const produtos = await prisma.produto.findMany({
    where: { OR: [{ titulo: { startsWith: 'Peça E2E' } }, { titulo: { startsWith: 'Peça de teste E2E' } }, { artesaoId: { in: artesaoIds } }] },
    select: { id: true, titulo: true },
  });
  const produtoIds = produtos.map(p => p.id);
  const compras = await prisma.compra.findMany({
    where: { OR: [{ consumidorId: { in: consumidorIds } }, { pedidos: { some: { itens: { some: { produtoId: { in: produtoIds } } } } } }] },
    select: { id: true, codigo: true, pedidos: { select: { id: true } } },
  });
  const pedidoIds = compras.flatMap(c => c.pedidos.map(p => p.id));

  console.log(`Contas de teste: ${usuarios.length}${usuarios.length ? ` (${usuarios.slice(0, 3).map(u => u.email).join(', ')}${usuarios.length > 3 ? '…' : ''})` : ''}`);
  console.log(`Peças de teste: ${produtos.length}${produtos.length ? ` (${produtos.slice(0, 3).map(p => p.titulo).join(', ')}${produtos.length > 3 ? '…' : ''})` : ''}`);
  console.log(`Compras de teste: ${compras.length}`);
  if (!apagar || (!usuarios.length && !produtos.length && !compras.length)) return;

  const ids = [...produtoIds, ...pedidoIds, ...usuarios.map(u => u.id)];
  await prisma.$transaction(
    async tx => {
      // Notificações e eventos que citam os dados de teste
      await tx.notificacaoLog.deleteMany({ where: { OR: [{ pedidoId: { in: pedidoIds } }, { usuarioId: { in: usuarios.map(u => u.id) } }] } });
      await tx.$executeRaw`DELETE FROM "NotificacaoLog" WHERE "payload"->>'produtoId' = ANY(${produtoIds}) OR "payload"->>'pedidoId' = ANY(${pedidoIds})`;
      await tx.$executeRaw`DELETE FROM "EventoOutbox" WHERE "publicadoEm" IS NOT NULL AND ("payload"->>'produtoId' = ANY(${ids}) OR "payload"->>'pedidoId' = ANY(${ids}) OR "payload"->>'usuarioId' = ANY(${ids}))`;
      await tx.compra.deleteMany({ where: { id: { in: compras.map(c => c.id) } } }); // cascata: pedidos, itens, histórico, entrega, pagamento
      await tx.produto.deleteMany({ where: { id: { in: produtoIds } } }); // cascata: estoque, favoritos, avaliações, mensagens
      await tx.endereco.deleteMany({ where: { consumidorId: { in: consumidorIds } } });
      await tx.usuario.deleteMany({ where: { id: { in: usuarios.map(u => u.id) } } }); // cascata: perfis, carrinho, tokens…
      // Médias de avaliação sem as notas dos testes
      await tx.$executeRaw`UPDATE "Artesao" a SET "avaliacaoMedia" = COALESCE((SELECT ROUND(AVG(av.nota)::numeric, 1) FROM "Avaliacao" av JOIN "Produto" p ON p.id = av."produtoId" WHERE p."artesaoId" = a.id), 0)`;
      await tx.$executeRaw`UPDATE "Produto" p SET "avaliacaoMedia" = COALESCE((SELECT ROUND(AVG(av.nota)::numeric, 1) FROM "Avaliacao" av WHERE av."produtoId" = p.id), 0)`;
    },
    { timeout: 60_000, maxWait: 20_000 },
  );

  // Redis: termos de busca dos testes (painel do admin) e cache do catálogo
  const urlRedis = process.env.REDIS_URL || process.env.KV_URL;
  if (urlRedis) {
    const redis = new Redis(urlRedis, { maxRetriesPerRequest: 2 });
    const termos = await redis.zrange('busca:termos', '0', '-1');
    const deTeste = termos.filter(t => TERMOS_DE_TESTE.test(t));
    if (deTeste.length) await redis.zrem('busca:termos', ...deTeste);
    await redis.incr('catalogo:versao');
    redis.disconnect();
  }
  console.log('Dados de teste apagados.');
}

main()
  .catch(e => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
