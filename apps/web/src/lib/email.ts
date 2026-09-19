/**
 * Cliente MailJet v3.1 (REST) para emails transacionais do app.
 * Config: MAILJET_API_KEY / MAILJET_API_SECRET / MAILJET_SENDER_EMAIL / MAILJET_SENDER_NAME.
 * Sem SDK - fetch direto, igual ao pacote @festas/auth (emails de autenticação).
 */

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const isEmailConfigurado = (): boolean =>
  Boolean(process.env.MAILJET_API_KEY && process.env.MAILJET_API_SECRET);

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  const API_KEY = process.env.MAILJET_API_KEY;
  const API_SECRET = process.env.MAILJET_API_SECRET;

  if (!API_KEY || !API_SECRET) {
    // Sem credenciais (dev): não rebenta - registar e sair.
    console.warn("[email] MAILJET não configurado - email não enviado para", to);
    return;
  }

  const senderAddress = process.env.MAILJET_SENDER_EMAIL || "hello@example.com";
  const senderName = process.env.MAILJET_SENDER_NAME || "Gestão de Festas Infantis";

  const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");
  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: senderAddress, Name: senderName },
          To: [{ Email: to }],
          Subject: subject,
          HTMLPart: html,
          TextPart: text || "",
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { ErrorMessage?: string; Messages?: Array<{ Errors?: Array<{ ErrorMessage?: string }> }> }
      | null;
    const detalhe =
      body?.ErrorMessage ||
      body?.Messages?.[0]?.Errors?.[0]?.ErrorMessage ||
      `HTTP ${response.status}`;
    throw new Error(`Mailjet API error: ${detalhe}`);
  }
}

// Entidades HTML construídas por partes (mesma técnica de print-bolos.ts)
// para não serem descodificadas por formatação/transporte do código.
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
        Este email foi enviado automaticamente — não responda.
      </div>
    </div>
  </div>
</body>
</html>`;
}
