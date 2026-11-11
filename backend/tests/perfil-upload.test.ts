import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { StatusProduto } from '@prisma/client';
import { api, bearer, ciclo, login, prisma } from './helpers';

ciclo();

const MB = 1024 * 1024;
const jpg = (tamanho: number) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(tamanho - 4)]);
const png = (tamanho: number) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(tamanho - 8)]);
const gif = () => Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(1000)]);

const pastaUploads = resolve(__dirname, '..', process.env.UPLOAD_DIR!, 'artesaos');
const arquivosSalvos = () => {
  try {
    return readdirSync(pastaUploads).length;
  } catch {
    return 0;
  }
};

/** TC10 — relatório de 09/11/2026: BLOQUEADO (sem endpoint; frontend aceitava GIF e não limitava o tamanho). */
describe('TC10 · Atualização do perfil e upload de fotos', () => {
  let token: string;
  let artesaoId: string;

  beforeAll(async () => {
    const sessao = await login('artesao');
    token = sessao.token;
    artesaoId = sessao.usuario.artesaoId;
  });

  it('PUT /api/artesao/perfil atualiza e a página pública reflete imediatamente', async () => {
    await api().get(`/api/artesaos/${artesaoId}`); // aquece o cache

    const res = await api()
      .put('/api/artesao/perfil')
      .set(bearer(token))
      .send({ biografia: 'Nova biografia do ateliê', tecnicasPrincipais: ['barro', 'rendas'], poloRegional: 'Alto do Moura' });

    expect(res.status).toBe(200);
    const publico = await api().get(`/api/artesaos/${artesaoId}`);
    expect(publico.headers['x-cache']).toBe('MISS');
    expect(publico.body.data).toMatchObject({ biografia: 'Nova biografia do ateliê', tecnicasPrincipais: ['barro', 'rendas'], poloRegional: 'Alto do Moura' });
  });

  it('aceita JPG de 4,9 MB (perfil) e PNG de 1 MB (oficina)', async () => {
    const perfil = await api().post('/api/artesao/perfil/fotos?tipo=perfil').set(bearer(token)).attach('foto', jpg(4.9 * MB), 'perfil.jpg');
    expect(perfil.status).toBe(201);
    expect(perfil.body.data.fotoPerfilUrl).toMatch(/\/uploads\/artesaos\/.+\.jpg$/);

    const oficina = await api().post('/api/artesao/perfil/fotos?tipo=atelie').set(bearer(token)).attach('foto', png(1 * MB), 'oficina.png');
    expect(oficina.status).toBe(201);
    expect(oficina.body.data.fotoAtelieUrl).toMatch(/\.png$/);

    // A imagem é servida
    const caminho = new URL(oficina.body.data.fotoAtelieUrl, 'http://x').pathname;
    expect((await api().get(caminho)).status).toBe(200);
  });

  it('recusa JPG de 5,1 MB com mensagem sobre o limite, sem gravar nada', async () => {
    const antes = arquivosSalvos();
    const res = await api().post('/api/artesao/perfil/fotos').set(bearer(token)).attach('foto', jpg(5.1 * MB), 'grande.jpg');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('A imagem deve ter no máximo 5 MB');
    expect(arquivosSalvos()).toBe(antes);
  });

  it('recusa GIF (inclusive renomeado para .jpg) sem gravar nada', async () => {
    const antes = arquivosSalvos();
    for (const nome of ['animacao.gif', 'disfarcado.jpg']) {
      const res = await api().post('/api/artesao/perfil/fotos').set(bearer(token)).attach('foto', gif(), { filename: nome, contentType: 'image/jpeg' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/JPG ou PNG/);
    }
    expect(arquivosSalvos()).toBe(antes);
  });

  it('foto da peça: sem parâmetro acumula; com ?substituir=true vira a única foto', async () => {
    const criado = await api()
      .post('/api/produtos')
      .set(bearer(token))
      .send({ titulo: 'Peça com fotos', tecnica: 'Barro', poloOrigem: 'Caruaru', preco: 50, estoque: 1, imagensUrls: ['https://exemplo.com/1.jpg'] });
    const id = criado.body.data.id;

    const acumula = await api().post(`/api/produtos/${id}/imagens`).set(bearer(token)).attach('imagem', jpg(2000), 'a.jpg');
    expect(acumula.status).toBe(201);
    expect(acumula.body.data.imagensUrls).toHaveLength(2);

    const troca = await api().post(`/api/produtos/${id}/imagens?substituir=true`).set(bearer(token)).attach('imagem', png(2000), 'b.png');
    expect(troca.body.data.imagensUrls).toHaveLength(1);
    expect(troca.body.data.imagensUrls[0]).toMatch(/\.png$/);
  });

  it('comprador não pode enviar foto de ateliê → 403', async () => {
    const comprador = await login('comprador');
    const res = await api().post('/api/artesao/perfil/fotos').set(bearer(comprador.token)).attach('foto', jpg(1000), 'x.jpg');
    expect(res.status).toBe(403);
  });
});

/** TC11 — perfil público com peças ativas; biografia vazia não quebra. */
describe('TC11 · Perfil público do artesão', () => {
  it('lista apenas peças ATIVAS do artesão', async () => {
    const artesao = await prisma.artesao.findFirstOrThrow({ where: { usuario: { email: 'artesao2@pontodaterra.com' } } });
    await prisma.produto.create({
      data: {
        titulo: 'Peça inativa TC11',
        tecnica: 'Madeira entalhada',
        poloOrigem: 'Petrolina',
        preco: 10,
        status: StatusProduto.REJEITADO,
        artesaoId: artesao.id,
      },
    });

    const res = await api().get(`/api/artesaos/${artesao.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.produtos.length).toBeGreaterThan(0);
    expect(res.body.data.produtos.map((p: { titulo: string }) => p.titulo)).not.toContain('Peça inativa TC11');
  });

  it('artesão sem biografia → biografia null, demais dados presentes', async () => {
    const cadastro = await api()
      .post('/api/auth/cadastro')
      .send({ nome: 'Sem Bio', email: 'sembio@teste.com', senha: 'segredo1', tipo: 'ARTESAO', cidade: 'Olinda', estado: 'PE', especialidade: 'Xilogravura' });
    const res = await api().get(`/api/artesaos/${cadastro.body.data.usuario.artesaoId}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ nome: 'Sem Bio', cidade: 'Olinda', estado: 'PE', biografia: null, produtos: [] });
  });

  it('id inexistente → 404; id malformado → 400', async () => {
    expect((await api().get('/api/artesaos/00000000-0000-4000-8000-000000000000')).status).toBe(404);
    expect((await api().get('/api/artesaos/abc')).status).toBe(400);
  });
});
