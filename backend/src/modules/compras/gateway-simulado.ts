import { randomBytes, randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import type { ErroCampo } from '../../shared/api-result';

/**
 * Gateway de pagamento SIMULADO (HU5 / TC15 / TC16).
 *
 * O Notion restringe o projeto a "simulação de pagamentos (sem integração com gateways reais)".
 * Cada meio de pagamento é uma Strategy com a mesma interface; trocar por um gateway real
 * (ex.: Mercado Pago, Pagar.me) significa só criar outra implementação de `MeioDePagamento`.
 *
 * Cartões de teste:
 *   4111 1111 1111 1111 → aprovado
 *   4000 0000 0000 0002 → recusado (saldo insuficiente)
 */
export const CARTAO_APROVADO = '4111111111111111';
export const CARTAO_RECUSADO = '4000000000000002';

export type DadosCartao = { numero: string; validade: string; cvv: string; titular: string };

export type ResultadoPagamento =
  | { tipo: 'PENDENTE'; codigoTransacao: string; expiraEm: Date; pixCopiaECola?: string; pixQrCode?: string; linhaDigitavel?: string }
  | { tipo: 'APROVADO'; codigoTransacao: string; cartaoFinal: string }
  | { tipo: 'RECUSADO'; codigoTransacao: string; cartaoFinal: string; motivo: string };

export interface MeioDePagamento {
  iniciar(valor: number, referencia: string): Promise<ResultadoPagamento>;
}

const novoCodigoTransacao = () => `TX-${randomUUID()}`;

// ───────────── PIX ─────────────

/** CRC16-CCITT (0x1021, inicial 0xFFFF), exigido no final do "copia e cola" do PIX (padrão EMV/BR Code). */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (const byte of Buffer.from(payload, 'utf8')) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

const campo = (id: string, valor: string) => `${id}${String(valor.length).padStart(2, '0')}${valor}`;

/** Monta um BR Code no formato do PIX, com chave fictícia (não pagável em bancos reais). */
export function gerarPixCopiaECola(valor: number, txid: string): string {
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', 'pagamentos-simulados@pontodaterra.com');
  const semCrc =
    campo('00', '01') +
    campo('26', conta) +
    campo('52', '0000') +
    campo('53', '986') +
    campo('54', valor.toFixed(2)) +
    campo('58', 'BR') +
    campo('59', 'PONTO DA TERRA') +
    campo('60', 'RECIFE') +
    campo('62', campo('05', txid.replace(/[^A-Za-z0-9]/g, '').slice(0, 25))) +
    '6304';
  return semCrc + crc16(semCrc);
}

export class PixSimulado implements MeioDePagamento {
  constructor(private readonly minutosValidade = 30) {}

  async iniciar(valor: number): Promise<ResultadoPagamento> {
    const codigoTransacao = novoCodigoTransacao();
    const pixCopiaECola = gerarPixCopiaECola(valor, codigoTransacao);
    return {
      tipo: 'PENDENTE',
      codigoTransacao,
      expiraEm: new Date(Date.now() + this.minutosValidade * 60_000),
      pixCopiaECola,
      pixQrCode: await QRCode.toDataURL(pixCopiaECola, { margin: 1, width: 280 }),
    };
  }
}

// ───────────── Boleto ─────────────

/** Soma N dias úteis (segunda a sexta) e fixa o vencimento no fim do dia. Feriados não são considerados. */
export function somarDiasUteis(inicio: Date, dias: number): Date {
  const d = new Date(inicio);
  let adicionados = 0;
  while (adicionados < dias) {
    d.setDate(d.getDate() + 1);
    const semana = d.getDay();
    if (semana !== 0 && semana !== 6) adicionados++;
  }
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Linha digitável fictícia (banco 000), com o valor nos 10 últimos dígitos. */
export function gerarLinhaDigitavel(valor: number): string {
  const aleatorio = Array.from(randomBytes(30), b => String(b % 10)).join('');
  const centavos = String(Math.round(valor * 100)).padStart(10, '0');
  const d = `0009${aleatorio}`.slice(0, 33);
  return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d.slice(32, 33)} 0000${centavos}`;
}

export class BoletoSimulado implements MeioDePagamento {
  constructor(private readonly diasUteis = 3) {}

  async iniciar(valor: number): Promise<ResultadoPagamento> {
    return {
      tipo: 'PENDENTE',
      codigoTransacao: novoCodigoTransacao(),
      expiraEm: somarDiasUteis(new Date(), this.diasUteis),
      linhaDigitavel: gerarLinhaDigitavel(valor),
    };
  }
}

// ───────────── Cartão ─────────────

export function luhnValido(numero: string): boolean {
  let soma = 0;
  let dobrar = false;
  for (let i = numero.length - 1; i >= 0; i--) {
    let n = Number(numero[i]);
    if (dobrar) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
    dobrar = !dobrar;
  }
  return numero.length >= 13 && soma % 10 === 0;
}

/** Valida os dados do cartão e devolve a lista de erros por campo (vazia se estiver tudo certo). */
export function validarCartao(c: DadosCartao, agora = new Date()): ErroCampo[] {
  const erros: ErroCampo[] = [];
  const numero = c.numero.replace(/\D/g, '');
  if (!luhnValido(numero)) erros.push({ campo: 'cartao.numero', mensagem: 'Número de cartão inválido' });

  const m = /^(\d{2})\/(\d{2})$/.exec(c.validade.trim());
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) erros.push({ campo: 'cartao.validade', mensagem: 'Validade inválida (use MM/AA)' });
  else {
    const fimDoMes = new Date(2000 + Number(m[2]), Number(m[1]), 0, 23, 59, 59);
    if (fimDoMes < agora) erros.push({ campo: 'cartao.validade', mensagem: 'Cartão vencido' });
  }
  if (!/^\d{3,4}$/.test(c.cvv)) erros.push({ campo: 'cartao.cvv', mensagem: 'CVV inválido' });
  if (c.titular.trim().length < 3) erros.push({ campo: 'cartao.titular', mensagem: 'Informe o nome impresso no cartão' });
  return erros;
}

export class CartaoSimulado implements MeioDePagamento {
  constructor(private readonly cartao: DadosCartao) {}

  /** Autorização síncrona (HU5 cenário 2). Os dados do cartão não são armazenados — só os 4 últimos dígitos. */
  async iniciar(): Promise<ResultadoPagamento> {
    const numero = this.cartao.numero.replace(/\D/g, '');
    const cartaoFinal = numero.slice(-4);
    const codigoTransacao = novoCodigoTransacao();
    if (numero === CARTAO_RECUSADO) return { tipo: 'RECUSADO', codigoTransacao, cartaoFinal, motivo: 'Saldo insuficiente' };
    return { tipo: 'APROVADO', codigoTransacao, cartaoFinal };
  }
}

// ───────────── PDF do boleto ─────────────

/** Gera um PDF simples de uma página (texto), suficiente para o boleto simulado. */
export function gerarPdfTexto(linhas: string[]): Buffer {
  const escapar = (t: string) => t.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const conteudo = ['BT', '/F1 12 Tf', '50 790 Td', '16 TL', ...linhas.map(l => `(${escapar(l)}) '`), 'ET'].join('\n');
  const corpo = Buffer.from(conteudo, 'latin1');

  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];

  const partes: Buffer[] = [Buffer.from('%PDF-1.4\n', 'latin1')];
  const offsets: number[] = [];
  let tamanho = partes[0].length;
  const adicionar = (b: Buffer) => {
    partes.push(b);
    tamanho += b.length;
  };

  objetos.forEach((o, i) => {
    offsets.push(tamanho);
    adicionar(Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`, 'latin1'));
  });
  offsets.push(tamanho);
  adicionar(Buffer.concat([Buffer.from(`5 0 obj\n<< /Length ${corpo.length} >>\nstream\n`, 'latin1'), corpo, Buffer.from('\nendstream\nendobj\n', 'latin1')]));

  const inicioXref = tamanho;
  const xref = ['xref', `0 ${offsets.length + 1}`, '0000000000 65535 f ', ...offsets.map(o => `${String(o).padStart(10, '0')} 00000 n `)].join('\n');
  adicionar(Buffer.from(`${xref}\ntrailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`, 'latin1'));
  return Buffer.concat(partes);
}
