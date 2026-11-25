/**
 * Mede o custo da checagem de sessão do ADR-001: o middleware `autenticar`, que verifica a assinatura
 * do token e consulta o usuário no banco (comparando o tokenVersion e o status da conta).
 *
 * Uso (na pasta backend/, com o banco do DATABASE_URL populado pelo seed):
 *   npm run medir:autenticacao                 → 500 medições, limite de 20 ms de mediana
 *   npm run medir:autenticacao -- 1000 15      → 1000 medições, limite de 15 ms
 *
 * Sai com código 1 se a mediana passar do limite. O resultado vale para a máquina e o banco usados:
 * em produção, soma-se a latência de rede até o banco.
 */
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { prisma } from '../src/config/prisma';
import { assinarToken, autenticar } from '../src/shared/auth';

const medicoes = Number(process.argv[2] ?? 500);
const limiteMs = Number(process.argv[3] ?? 20);

const mediana = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
const percentil95 = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length * 0.95)];

/** Executa o middleware de verdade, como o Express faria, e espera o `next()` */
const checarSessao = (token: string) =>
  new Promise<void>((resolver, rejeitar) => {
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    void autenticar(req, {} as Response, erro => (erro ? rejeitar(erro) : resolver()));
  });

async function main() {
  const usuario = await prisma.usuario.findFirstOrThrow({
    where: { email: 'comprador@pontodaterra.com' },
    select: { id: true, tipo: true, tokenVersion: true },
  });
  const token = assinarToken(usuario);

  for (let i = 0; i < 50; i++) await checarSessao(token); // aquecimento (conexão e cache de consulta)
  const tempos: number[] = [];
  for (let i = 0; i < medicoes; i++) {
    const inicio = performance.now();
    await checarSessao(token);
    tempos.push(performance.now() - inicio);
  }

  // Para comparar: só a verificação da assinatura, sem o banco
  const temposAssinatura: number[] = [];
  for (let i = 0; i < medicoes; i++) {
    const inicio = performance.now();
    jwt.verify(token, env.JWT_SECRET);
    temposAssinatura.push(performance.now() - inicio);
  }

  const med = mediana(tempos);
  console.log(`Checagem de sessão (verificação do token + consulta ao banco), ${medicoes} medições:`);
  console.log(`  mediana ${med.toFixed(2)} ms · p95 ${percentil95(tempos).toFixed(2)} ms · limite de mediana ${limiteMs} ms`);
  console.log(`Só a verificação da assinatura (sem banco), ${medicoes} medições:`);
  console.log(`  mediana ${mediana(temposAssinatura).toFixed(3)} ms · p95 ${percentil95(temposAssinatura).toFixed(3)} ms`);
  console.log(med <= limiteMs ? 'RESULTADO: dentro do limite' : 'RESULTADO: ACIMA do limite (avaliar o cache de tokenVersion e status no Redis)');
  process.exitCode = med <= limiteMs ? 0 : 1;
}

main()
  .catch(e => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
