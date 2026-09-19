#!/usr/bin/env node
/**
 * Teste de envio de email via SMTP do cPanel.
 *
 * Uso:
 *   node scripts/test-email.mjs <destinatario> [caminho-para-.env]
 *
 * Exemplos:
 *   node scripts/test-email.mjs sistema@baselandia.pt
 *   node scripts/test-email.mjs geral@baselandia.pt apps/web/.env
 *
 * Lê SMTP_HOST/SMTP_PORT/SMTP_SECURE/SMTP_USER/SMTP_PASS/EMAIL_FROM_ADDRESS/EMAIL_FROM_NAME
 * do ficheiro .env indicado (default: apps/web/.env) e envia um email de teste.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const destinatario = process.argv[2];
const envPath = resolve(__dirname, "..", process.argv[3] || "apps/web/.env");

if (!destinatario) {
  console.error("Uso: node scripts/test-email.mjs <destinatario> [caminho-para-.env]");
  process.exit(1);
}

// ── Carregar .env (parser simples, sem dependências) ──
const vars = {};
for (const linha of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) vars[m[1]] = m[2];
}

const host = vars.SMTP_HOST;
const port = Number(vars.SMTP_PORT || 465);
const secure = (vars.SMTP_SECURE || "true") === "true";
const user = vars.SMTP_USER;
const pass = vars.SMTP_PASS;
const from = `"${vars.EMAIL_FROM_NAME || "Baselandia"}" <${vars.EMAIL_FROM_ADDRESS || user}>`;

if (!host || !user || !pass) {
  console.error(`❌ SMTP não configurado em ${envPath} - faltam SMTP_HOST/SMTP_USER/SMTP_PASS`);
  process.exit(1);
}

console.log(`Servidor : ${host}:${port} (secure=${secure})`);
console.log(`Remetente: ${from}`);
console.log(`Destino  : ${destinatario}`);
console.log("A enviar...");

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  // Diagnóstico detalhado em caso de falha de TLS/handshake
  logger: false,
  debug: false,
  connectionTimeout: 15_000,
});

try {
  const info = await transporter.sendMail({
    from,
    to: destinatario,
    subject: "Teste de envio - Baselandia (SMTP cPanel)",
    html: `<html><body style="font-family:Arial,sans-serif;padding:20px;">
      <h2 style="color:#465fff;">✅ Email de teste enviado com sucesso</h2>
      <p>Se estás a ler isto, o SMTP do cPanel está a funcionar para o sistema de festas.</p>
      <p style="color:#666;font-size:12px;">Enviado em ${new Date().toLocaleString("pt-PT")}</p>
    </body></html>`,
    text: "Teste de envio SMTP - Baselandia. Se lês isto, está a funcionar.",
  });
  console.log(`✅ ENVIADO - messageId: ${info.messageId}`);
  console.log(`   Resposta do servidor: ${info.response}`);
} catch (err) {
  console.error("❌ FALHOU:", err instanceof Error ? err.message : err);
  console.error("Dicas: porta 465 bloqueada? secure=true? password certa da caixa? Email Deliverability ativo no cPanel?");
  process.exit(1);
}
