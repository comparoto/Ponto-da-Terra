import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { TipoEvento } from '@prisma/client';
import { publicarPendentes, type EventoPublicado } from '../src/jobs/outbox';
import { processarEvento } from '../src/jobs/processar-evento';
import { api, bearer, ciclo, login, prisma } from './helpers';

ciclo();

/** Foto "de câmera": 3000 x 2000 px, JPEG, com metadados EXIF */
const fotoGrande = () =>
  sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 180, g: 110, b: 60 } } })
    .jpeg({ quality: 90 })
    .withExif({ IFD0: { Make: 'Camera de Teste', Model: 'PT-1' } })
    .toBuffer();

const caminhoDe = (url: string) => resolve(__dirname, '..', process.env.UPLOAD_DIR!, url.slice(url.indexOf('/uploads/') + '/uploads/'.length));

/** Publica a outbox e devolve o evento IMAGEM_ENVIADA da URL informada */
async function eventoDaImagem(url: string) {
  const fila: EventoPublicado[] = [];
  await publicarPendentes(async e => {
    fila.push(e);
  });
  return fila.find(e => e.tipo === TipoEvento.IMAGEM_ENVIADA && (e.payload as { url: string }).url === url)!;
}

describe('Fila · otimização das fotos enviadas', () => {
  it('foto de peça: a fila gera WebP de até 1600 px sem EXIF, troca a URL e apaga o original (uma única vez)', async () => {
    const token = (await login('artesao')).token;
    const criada = await api()
      .post('/api/produtos')
      .set(bearer(token))
      .send({ titulo: 'Peça com foto grande', tecnica: 'Barro', poloOrigem: 'Caruaru', preco: 80, estoque: 1, imagensUrls: ['https://exemplo.com/capa.jpg'] });
    const id = criada.body.data.id;

    const envio = await api().post(`/api/produtos/${id}/imagens`).set(bearer(token)).attach('imagem', await fotoGrande(), 'camera.jpg');
    expect(envio.status).toBe(201);
    const original = envio.body.data.imagensUrls[1] as string;
    expect(original).toMatch(/\.jpg$/);
    expect(existsSync(caminhoDe(original))).toBe(true);

    const evento = await eventoDaImagem(original);
    expect(evento).toBeDefined();

    const resultado = (await processarEvento(evento)) as { processada: boolean; url: string; bytesAntes: number; bytesDepois: number };
    expect(resultado.processada).toBe(true);
    expect(resultado.url).toMatch(/\/uploads\/produtos\/.+\.webp$/);
    expect(resultado.bytesDepois).toBeLessThan(resultado.bytesAntes);

    const produto = await prisma.produto.findUniqueOrThrow({ where: { id } });
    expect(produto.imagensUrls).toEqual(['https://exemplo.com/capa.jpg', resultado.url]); // mesma posição, outra URL

    const meta = await sharp(caminhoDe(resultado.url)).metadata();
    expect(meta.format).toBe('webp');
    expect(Math.max(meta.width!, meta.height!)).toBe(1600);
    expect(meta.exif).toBeUndefined();
    expect(existsSync(caminhoDe(original))).toBe(false);

    // Retry da fila: nada muda
    expect(await processarEvento(evento)).toEqual({ processada: false });
    expect((await prisma.produto.findUniqueOrThrow({ where: { id } })).imagensUrls).toEqual(produto.imagensUrls);

    // O evento técnico não vira notificação para ninguém
    expect(await prisma.notificacaoLog.count({ where: { eventoId: evento.id } })).toBe(0);
  });

  it('foto de perfil trocada antes do processamento: a versão nova é descartada e a URL atual fica', async () => {
    const token = (await login('artesao')).token;
    const primeira = await api().post('/api/artesao/perfil/fotos?tipo=perfil').set(bearer(token)).attach('foto', await fotoGrande(), 'a.jpg');
    const urlPrimeira = primeira.body.data.fotoPerfilUrl as string;
    const segunda = await api().post('/api/artesao/perfil/fotos?tipo=perfil').set(bearer(token)).attach('foto', await fotoGrande(), 'b.jpg');
    const urlSegunda = segunda.body.data.fotoPerfilUrl as string;

    const eventoPrimeira = await eventoDaImagem(urlPrimeira);
    expect(await processarEvento(eventoPrimeira)).toEqual({ processada: false });

    const artesao = await prisma.artesao.findUniqueOrThrow({ where: { id: segunda.body.data.id } });
    expect(artesao.fotoPerfilUrl).toBe(urlSegunda);
  });
});
