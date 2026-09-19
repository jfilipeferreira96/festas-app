/**
 * Preview de TODOS os tipos de email da aplicação — envia uma amostra de cada
 * um para análise (pedido do cliente, 19/09/2026).
 *
 * Uso:
 *   npx tsx scripts/preview-emails.ts <destinatario>
 *   npx tsx scripts/preview-emails.ts sistema@baselandia.pt
 *
 * Emails enviados:
 *   [1/5] Boas-vindas (registo)
 *   [2/5] Verificação de email (registo)
 *   [3/5] Recuperação de palavra-passe
 *   [4/5] Confirmação de festa — caução PAGA
 *   [5/5] Confirmação de festa — caução POR PAGAR (com dados de pagamento)
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(__dirname, "..");
const destinatario = process.argv[2] || "sistema@baselandia.pt";

// ── Carregar apps/web/.env para process.env ANTES dos imports da app ──
const envPath = resolve(raiz, "apps/web/.env");
for (const linha of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) {
    const chave = m[1] as string;
    if (process.env[chave] === undefined) process.env[chave] = m[2] as string;
  }
}

// Imports dinâmicos (módulos TS que leem process.env no load)
const { sendEmail } = await import("../apps/web/src/lib/email");
const { buildReservaConfirmacaoHtml } = await import("../apps/web/src/services/email.service");
const {
  createWelcomeEmailHTML,
  createPasswordResetEmailHTML,
  createVerificationEmailHTML,
} = await import("../packages/auth/src/email-templates");

type EmailAmostra = { titulo: string; subject: string; html: string };

const utilizador = { name: "Maria Santos", email: destinatario };
const urlFalso = "https://baselandia.pt/reset-password?token=exemplo-token-123";

// Reserva fictícia (mesma forma do carregarReserva do email.service)
const reservaFicticia = {
  data: new Date(),
  horario: "15:00",
  duracaoMinutos: 135,
  local: { nome: "Sala 1" },
  cliente: { nome: "Maria Santos" },
  aniversariantes: [{ aniversariante: { nome: "Tomás" } }, { aniversariante: { nome: "Alice" } }],
  extras: [
    { extra: { nome: "Algodão Doce" }, quantidade: 20 },
    { extra: { nome: "Pinturas Faciais" }, quantidade: 20 },
  ],
  menu: { nome: "Menu Fim-de-Semana" },
  bolo: "NOSSO_2KG",
  boloTema: "Frozen",
  valorTotal: 320,
  numCriancas: 20,
  numCriancasConfirmadas: 18,
};

// Dados de pagamento de EXEMPLO - em produção vem de Configurações → Preços
const dadosPagamento = "MBWay: 912 345 678 (Baselandia)\nIBAN: PT50 0002 0123 1234 5678 9015 4";

type Params = Parameters<typeof buildReservaConfirmacaoHtml>[0];
const confirmacaoPaga = buildReservaConfirmacaoHtml(
  { ...reservaFicticia, caucao: "PAGA", valorCaucao: 40 } as Params,
  dadosPagamento
);
const confirmacaoPorPagar = buildReservaConfirmacaoHtml(
  { ...reservaFicticia, caucao: "NAO_PAGA", valorCaucao: 40 } as Params,
  dadosPagamento
);

const { buildAniversarioHtml } = await import("../apps/web/src/services/marketing.service");

const amostras: EmailAmostra[] = [
  {
    titulo: "[1/6] Boas-vindas (registo de utilizador)",
    subject: "[AMOSTRA 1/6] Bem-vindo!",
    html: createWelcomeEmailHTML(utilizador),
  },
  {
    titulo: "[2/6] Verificação de email (registo)",
    subject: "[AMOSTRA 2/6] Verificar endereço de email",
    html: createVerificationEmailHTML(utilizador, urlFalso),
  },
  {
    titulo: "[3/6] Recuperação de palavra-passe",
    subject: "[AMOSTRA 3/6] Recuperar palavra-passe",
    html: createPasswordResetEmailHTML(utilizador, urlFalso),
  },
  {
    titulo: "[4/6] Confirmação de festa - caução PAGA",
    subject: `[AMOSTRA 4/6] ${confirmacaoPaga.assunto}`,
    html: confirmacaoPaga.html,
  },
  {
    titulo: "[5/6] Confirmação de festa - caução POR PAGAR",
    subject: `[AMOSTRA 5/6] ${confirmacaoPorPagar.assunto}`,
    html: confirmacaoPorPagar.html,
  },
  {
    titulo: "[6/6] Marketing - aniversário a aproximar-se",
    subject: buildAniversarioHtml({
      encarregadoNome: "Maria Santos",
      criancaNome: "Tomás",
      idade: 8,
      dataAniversario: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      email: destinatario,
    }).assunto,
    html: buildAniversarioHtml({
      encarregadoNome: "Maria Santos",
      criancaNome: "Tomás",
      idade: 8,
      dataAniversario: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      email: destinatario,
    }).html,
  },
];

console.log(`A enviar ${amostras.length} amostras para ${destinatario}...\n`);

let ok = 0;
for (const [i, amostra] of amostras.entries()) {
  try {
    await sendEmail({ to: destinatario, subject: amostra.subject, html: amostra.html });
    console.log(`✅ [${i + 1}/${amostras.length}] ${amostra.titulo}`);
    ok++;
  } catch (err) {
    console.error(`❌ [${i + 1}/${amostras.length}] ${amostra.titulo}:`, err instanceof Error ? err.message : err);
  }
}

console.log(`\nConcluído: ${ok}/${amostras.length} enviados para ${destinatario}.`);
if (ok < amostras.length) process.exit(1);
