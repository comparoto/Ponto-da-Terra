import nodemailer, { type Transporter } from 'nodemailer';
import { env, isTest } from '../config/env';

/**
 * Envio de e-mails transacionais (notificações e recuperação de senha).
 *
 * Com SMTP_URL configurada, envia de verdade por SMTP — funciona com Mailtrap (caixa de testes),
 * Resend, Brevo, Gmail etc. Sem ela, só registra no log (desenvolvimento). Nos testes, os e-mails
 * ficam guardados em memória para as verificações.
 */
export type Email = { para: string; assunto: string; titulo: string; paragrafos: string[]; botao?: { texto: string; url: string }; eventoId?: string };

let transporte: Transporter | null = null;
const obterTransporte = () => (transporte ??= nodemailer.createTransport(env.SMTP_URL!));

/** Endereço do site (links dos e-mails) */
export const urlDoSite = (caminho = '') => `${env.SITE_URL.replace(/\/$/, '')}${caminho}`;

const escapar = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Modelo com a identidade do Ponto da Terra (HTML simples, compatível com os clientes de e-mail) */
export function montarHtml(email: Email) {
  const botao = email.botao
    ? `<p style="margin:28px 0"><a href="${escapar(email.botao.url)}" style="background:#D9B596;color:#171412;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">${escapar(email.botao.texto)}</a></p>`
    : '';
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F5EEE8;font-family:Arial,Helvetica,sans-serif;color:#2C2724">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#2C2724;padding:20px 28px;color:#D9B596;font-family:Georgia,serif;font-size:20px;font-weight:bold">Origem: Ponto da Terra</td></tr>
<tr><td style="padding:28px">
<h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px">${escapar(email.titulo)}</h1>
${email.paragrafos.map(p => `<p style="font-size:15px;line-height:1.6;margin:0 0 12px">${escapar(p)}</p>`).join('')}
${botao}
</td></tr>
<tr><td style="padding:16px 28px;background:#FAF6F2;font-size:12px;color:#7A6E66">Você recebeu este e-mail porque tem uma conta no Ponto da Terra, marketplace de artesanato pernambucano. Dúvidas: contato@pontodaterra.com.br</td></tr>
</table></td></tr></table></body></html>`;
}

export const montarTexto = (email: Email) =>
  [email.titulo, '', ...email.paragrafos, ...(email.botao ? ['', `${email.botao.texto}: ${email.botao.url}`] : [])].join('\n');

/** E-mails "enviados" durante os testes automatizados */
export const emailsDeTeste: Email[] = [];

async function enviarPadrao(email: Email): Promise<void> {
  if (isTest) {
    emailsDeTeste.push(email);
    return;
  }
  if (!env.SMTP_URL) {
    console.info(`[e-mail] (sem SMTP_URL, apenas registrado) para ${email.para}: ${email.assunto}`);
    return;
  }
  await obterTransporte().sendMail({ from: env.EMAIL_REMETENTE, to: email.para, subject: email.assunto, text: montarTexto(email), html: montarHtml(email) });
}

let enviar = enviarPadrao;
export const enviarEmail = (email: Email) => enviar(email);
/** Troca o envio (usado nos testes para simular falhas do provedor) */
export const definirEnvioDeEmail = (fn: (email: Email) => Promise<void>) => {
  enviar = fn;
};
export const restaurarEnvioDeEmail = () => {
  enviar = enviarPadrao;
};
