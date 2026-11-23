/**
 * Ponto de entrada da API na Vercel (função serverless).
 * O vercel.json redireciona todas as rotas para esta função; o Express recebe a URL original.
 * Localmente a API continua rodando com `npm run dev` (src/server.ts).
 */
import { criarApp } from '../src/app';

export default criarApp();
