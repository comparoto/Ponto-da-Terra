import type { RequestHandler } from 'express';

/**
 * Página do Swagger UI que carrega a interface por CDN (versão fixa) e lê /api/openapi.json.
 *
 * Por que não usar os arquivos estáticos do pacote swagger-ui-dist: na Vercel, a API é uma função
 * serverless e esses arquivos não entram no empacotamento da função. Servir pela CDN deixa a função
 * menor e funciona igual em qualquer ambiente.
 */
const VERSAO = '5.17.14';
const CDN = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${VERSAO}`;

const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Ponto da Terra · API</title>
    <link rel="stylesheet" href="${CDN}/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${CDN}/swagger-ui-bundle.js" crossorigin="anonymous"></script>
    <script>
      window.ui = SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#swagger-ui', persistAuthorization: true, docExpansion: 'list' });
    </script>
  </body>
</html>`;

export const paginaSwagger: RequestHandler = (_req, res) => {
  // Política de segurança só desta página: permite a CDN do Swagger e o script de inicialização
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; connect-src 'self'",
  );
  res.type('html').send(html);
};
