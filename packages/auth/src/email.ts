import nodemailer, { type Transporter } from "nodemailer";
import { createWelcomeEmailHTML, createPasswordResetEmailHTML, createVerificationEmailHTML } from "./email-templates";

// ── Configuração SMTP (cPanel) ─────────────────────────────────────
// Ex.: SMTP_HOST=mail.baselandia.pt · SMTP_PORT=465 · SMTP_USER=reservas@baselandia.pt
const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: (process.env.SMTP_SECURE || "true") === "true", // 465 = TLS implícito
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
};

const fromAddress = process.env.EMAIL_FROM_ADDRESS || smtpConfig.user || "noreply@example.com";
const fromName = process.env.EMAIL_FROM_NAME || "Gestão de Festas Infantis";

// Typings
export interface User {
  name: string | null;
  email: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailResult {
  success: true;
  messageId: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
    throw new Error("SMTP_HOST, SMTP_USER and SMTP_PASS environment variables are not set");
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
    });
  }
  return transporter;
}

// sendEmail via SMTP do alojamento (cPanel)
export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions): Promise<SendEmailResult> => {
  try {
    const info = await getTransporter().sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      html,
      text: text || "",
    });
    return { success: true, messageId: info.messageId || "sent" };
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

// Generic wrapper to log email sending
const sendEmailWithLogging = async (options: SendEmailOptions) => {
  try {
    console.log(`Sending email to: ${options.to}, subject: ${options.subject}`);
    const result = await sendEmail(options);
    console.log(`Email sent successfully to: ${options.to}, messageId: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`Error sending email to: ${options.to}`, error);
    throw error;
  }
};

// --- Specific email functions ---

export const sendWelcomeEmail = (user: User) =>
  sendEmailWithLogging({
    to: user.email,
    subject: "Bem-vindo à Gestão de Festas Infantis!",
    html: createWelcomeEmailHTML(user),
    text: `Bem-vindo à Gestão de Festas Infantis, ${user.name || "utilizador"}! Estamos contentes por ter consigo.`,
  });

export const sendPasswordResetEmail = (user: User, resetUrl: string) =>
  sendEmailWithLogging({
    to: user.email,
    subject: "Recuperar palavra-passe",
    html: createPasswordResetEmailHTML(user, resetUrl),
    text: `Olá ${user.name || "utilizador"}, clique no seguinte link para recuperar a sua palavra-passe: ${resetUrl}`,
  });

export const sendEmailVerificationEmail = (user: User, verificationUrl: string) =>
  sendEmailWithLogging({
    to: user.email,
    subject: "Verificar endereço de email",
    html: createVerificationEmailHTML(user, verificationUrl),
    text: `Olá ${user.name || "utilizador"}, clique no seguinte link para verificar o seu endereço de email: ${verificationUrl}`,
  });
