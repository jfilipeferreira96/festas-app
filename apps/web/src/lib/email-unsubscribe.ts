import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Token de cancelamento de comunicações (unsubscribe) - HMAC do email com o
 * segredo da app. Permite links seguros: só quem recebeu o email o tem.
 */

const segredo = () => process.env.BETTER_AUTH_SECRET || "festas-dev-secret";

export function tokenRemover(email: string): string {
  return createHmac("sha256", segredo()).update(email.toLowerCase().trim()).digest("hex").slice(0, 32);
}

export function validarTokenRemover(email: string, token: string): boolean {
  const esperado = tokenRemover(email);
  const a = Buffer.from(esperado);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Link completo de cancelamento de comunicações para incluir no rodapé dos emails. */
export function linkRemover(email: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "";
  return `${base}/api/emails/remover?email=${encodeURIComponent(email)}&token=${tokenRemover(email)}`;
}
