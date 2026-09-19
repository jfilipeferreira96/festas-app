import nodemailer, { type Transporter } from "nodemailer";

/**
 * Envio de email via SMTP do alojamento (cPanel) - ex.: mail.baselandia.pt:465.
 * Config: SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASS
 *         EMAIL_FROM_ADDRESS / EMAIL_FROM_NAME
 * Sem credenciais (dev): degrada graciosamente - apenas regista e sai.
 */

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = (process.env.SMTP_SECURE || "true") === "true"; // 465 = TLS implícito
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

const fromAddress = process.env.EMAIL_FROM_ADDRESS || smtpUser || "noreply@example.com";
const fromName = process.env.EMAIL_FROM_NAME || "Baselandia - Festas";

export const isEmailConfigurado = (): boolean =>
  Boolean(smtpHost && smtpUser && smtpPass);

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
    });
  }
  return transporter;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  if (!isEmailConfigurado()) {
    // Sem credenciais (dev): não rebenta - registar e sair.
    console.warn("[email] SMTP não configurado - email não enviado para", to);
    return;
  }

  const info = await getTransporter().sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    html,
    text: text || "",
  });

  if (info.rejected && info.rejected.length > 0) {
    throw new Error(`SMTP rejeitou o destinatário: ${info.rejected.join(", ")}`);
  }
}

// Entidades HTML por partes (téc. de print-bolos.ts) para não serem
// descodificadas no transporte do código.
const ENT_AMP = String.fromCharCode(38) + "amp;";
const ENT_LT = String.fromCharCode(38) + "lt;";
const ENT_GT = String.fromCharCode(38) + "gt;";
const ENT_QUOT = String.fromCharCode(38) + "quot;";

/** Escapa HTML de valores livres (nomes, notas, etc.). */
export function escapeHtmlEmail(texto: unknown): string {
  return String(texto ?? "")
    .replace(/&/g, ENT_AMP)
    .replace(/</g, ENT_LT)
    .replace(/>/g, ENT_GT)
    .replace(/"/g, ENT_QUOT);
}

/** Wrapper de estilo comum para os emails do app. */
export function emailShell(titulo: string, conteudoHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="utf-8"><title>${escapeHtmlEmail(titulo)}</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
      <div style="background:#465fff;color:#ffffff;padding:20px 24px;">
        <h1 style="margin:0;font-size:20px;">${escapeHtmlEmail(titulo)}</h1>
      </div>
      <div style="padding:24px;">${conteudoHtml}</div>
      <div style="padding:16px 24px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
        Este email foi enviado automaticamente. Não responda.
      </div>
    </div>
  </div>
</body>
</html>`;
}
