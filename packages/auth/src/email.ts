import { createWelcomeEmailHTML, createPasswordResetEmailHTML, createVerificationEmailHTML } from "./email-templates";

// Sender configuration
const sender = {
  address: process.env.MAILJET_SENDER_EMAIL || "hello@example.com",
  name: process.env.MAILJET_SENDER_NAME || "Gestão de Festas Infantis",
};

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

interface MailjetMessageResponse {
  Status: string;
  To: Array<{ Email: string; MessageID: number }>;
}

interface MailjetApiResponse {
  Messages: MailjetMessageResponse[];
}

interface MailjetApiError {
  ErrorMessage?: string;
  ErrorCode?: string;
  Messages?: Array<{
    Status: string;
    Errors?: Array<{ ErrorMessage: string; ErrorCode: string }>;
  }>;
}

// Base sendEmail function using Mailjet API v3.1
export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions) => {
  const API_KEY = process.env.MAILJET_API_KEY;
  const API_SECRET = process.env.MAILJET_API_SECRET;

  if (!API_KEY || !API_SECRET) {
    throw new Error("MAILJET_API_KEY and MAILJET_API_SECRET environment variables are not set");
  }

  try {
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
            From: {
              Email: sender.address,
              Name: sender.name,
            },
            To: [
              {
                Email: to,
              },
            ],
            Subject: subject,
            HTMLPart: html,
            TextPart: text || "",
            Headers: {
              "X-Priority": "1",
              Importance: "high",
            },
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as MailjetApiError;
      const errorMessage =
        errorData.ErrorMessage ||
        errorData.Messages?.[0]?.Errors?.[0]?.ErrorMessage ||
        `HTTP ${response.status}`;
      throw new Error(`Mailjet API error: ${response.status} - ${errorMessage}`);
    }

    const successData = data as MailjetApiResponse;
    const messageId = successData.Messages[0]?.To[0]?.MessageID?.toString() || "sent";

    return {
      success: true,
      messageId,
    };
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
