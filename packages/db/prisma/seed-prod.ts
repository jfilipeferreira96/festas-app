/**
 * Production seed — MINIMUM data to bring the app online.
 *
 * Creates ONLY:
 *   - 1 admin user (via Better Auth)
 *   - Cacifos config (40 cacifos LIVRE)
 *
 * NO reservas, clientes, extras, monitores, marketing, entradas livres, etc.
 * Idempotent: safe to re-run.
 *
 * Admin credentials (override via env):
 *   SEED_ADMIN_EMAIL     (default: admin@baselandia.pt)
 *   SEED_ADMIN_PASSWORD  (default: Alterar!2025)
 *
 * Usage:
 *   npm run db:seed:prod                    # → DATABASE_URL (prod)
 *   DB_TARGET=test npm run db:seed:prod     # → DATABASE_URL_TEST
 *
 * (The target DB is chosen by packages/db/scripts/db.js before this runs.)
 */

import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { config } from "dotenv";

// Load env from apps/web/.env when run directly.
// (db.js also passes --env-file; dotenv ignores a missing file silently.)
config({ path: "../../apps/web/.env" });

const prisma = new PrismaClient();

const seedAuth = betterAuth({
  database: prismaAdapter(prisma, { provider: "mysql" }),
  secret: process.env.BETTER_AUTH_SECRET!,
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    process.env.CORS_ORIGIN || "http://localhost:3000",
  ],
  emailAndPassword: { enabled: true },
  emailVerification: {
    sendVerificationEmail: async () => {},
    sendOnSignUp: false,
  },
});

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Production seed (minimum)...\n");

  await seedUsers();
  await seedConfiguracaoPreco();
  await seedExcecoesCalendario();
  await seedSlotsHorario();
  await seedCacifos();

  console.log("\n✅ Production seed complete!");
}

// ─── Users (admin + role accounts) ───────────────────────────
const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD || "Alterar!2025";

const ROLE_USERS: { email: string; funcao: import("@prisma/client").FuncaoUtilizador; name: string }[] = [
  { email: process.env.SEED_ADMIN_EMAIL || "admin@festas.pt", funcao: "ADMINISTRADOR", name: "Administrador" },
  { email: "cacifos@festas.pt", funcao: "CACIFOS", name: "Cacifos" },
  { email: "lanches@festas.pt", funcao: "LANCHE", name: "Lanches" },
  { email: "monitor@festas.pt", funcao: "MONITOR", name: "Monitor" },
  { email: "festas-acabar@festas.pt", funcao: "FESTAS_ACABAR", name: "Festas a Acabar" },
  { email: "staff@festas.pt", funcao: "STAFF", name: "Staff" },
  { email: "rececao@festas.pt", funcao: "RECECAO", name: "Receção" },
];

async function seedUsers() {
  console.log("  Creating users...\n");

  for (const u of ROLE_USERS) {
    // Idempotent: remove a previous user with the same email before creating.
    await prisma.account.deleteMany({ where: { user: { email: u.email } } });
    await prisma.session.deleteMany({ where: { user: { email: u.email } } });
    await prisma.user.deleteMany({ where: { email: u.email } });

    const result = await seedAuth.api.signUpEmail({
      body: { name: u.name, email: u.email, password: DEFAULT_PASSWORD },
    });
    if (!result?.user) throw new Error(`Failed to create user ${u.email}`);

    await prisma.user.update({
      where: { id: result.user.id },
      data: { emailVerified: true, funcao: u.funcao, activo: true },
    });

    console.log(`  ✓ ${u.funcao}: ${u.email} / ${DEFAULT_PASSWORD}`);
  }

  console.log("\n  ⚠️  Altera as palavras-passe após o primeiro login!\n");
}

// ─── Configuração de Preços (singleton) ───────────────────────
async function seedConfiguracaoPreco() {
  console.log("  Creating pricing config...");

  const minimos = [
    { aniversariantes: 1, minimo: 10 },
    { aniversariantes: 2, minimo: 15 },
    { aniversariantes: 3, minimo: 20 },
  ];

  const existing = await prisma.configuracaoPreco.findFirst();
  if (!existing) {
    await prisma.configuracaoPreco.create({
      data: {
        precoCriancaSemana: 15,
        precoCriancaFimSemana: 20,
        precoEntradaHoraSemana: 10,
        precoEntradaHoraFimSemana: 12,
        minimosCriancasPorAniversariante: minimos,
        precoMeias: 2,
        precoExcessoFixo: 5,
        caucaoDefault: 40,
        duracaoDefaultFestaMin: 135,
        duracaoExcessoBlocoMin: 30,
      },
    });
  }

  console.log("  ✓ Pricing config (preço por criança + mínimos + meias)\n");
}

// ─── Exceções de Calendário (feriados PT) ─────────────────────
async function seedExcecoesCalendario() {
  console.log("  Creating calendar exceptions (PT holidays)...");

  const anoAtual = new Date().getFullYear();
  // [mês-01, dia-01, nome] — feriados nacionais fixos de Portugal
  const feriadosFixos: [string, string, string][] = [
    ["01", "01", "Ano Novo"],
    ["05", "01", "Dia do Trabalhador"],
    ["06", "10", "Dia de Portugal"],
    ["08", "15", "Assunção de Nossa Senhora"],
    ["12", "08", "Imaculada Conceição"],
    ["12", "25", "Natal"],
  ];

  for (const ano of [anoAtual, anoAtual + 1]) {
    for (const [mes, dia, nome] of feriadosFixos) {
      const data = new Date(`${ano}-${mes}-${dia}T00:00:00Z`);
      await prisma.excecaoCalendario.upsert({
        where: { data },
        update: {},
        create: {
          data,
          tipo: "FERIADO",
          nome,
          afectaPreco: true,
          bloqueiaReserva: false,
          recorrenciaAnual: true,
        },
      });
    }
  }

  console.log(`  ✓ ${feriadosFixos.length} feriados PT × 2 anos (recorrência anual)\n`);
}

// ─── Slots Horários (festa default 2h15m) ─────────────────────
async function seedSlotsHorario() {
  console.log("  Creating time slots...");

  const slots = [
    { horaInicio: "10:00", duracaoMin: 135, ordem: 1 },
    { horaInicio: "14:00", duracaoMin: 135, ordem: 2 },
    { horaInicio: "16:30", duracaoMin: 135, ordem: 3 },
    { horaInicio: "18:30", duracaoMin: 135, ordem: 4 },
  ];

  for (const s of slots) {
    const existing = await prisma.slotHorario.findFirst({
      where: { horaInicio: s.horaInicio },
    });
    if (!existing) {
      await prisma.slotHorario.create({ data: s });
    }
  }

  console.log(`  ✓ ${slots.length} slots horários (default 2h15m)\n`);
}

// ─── Cacifos ──────────────────────────────────────────────────
async function seedCacifos() {
  console.log("  Creating cacifos config...");

  const total = 40;
  await prisma.configuracaoCacifo.upsert({
    where: { id: "config-cacifo-001" },
    update: { totalCacifos: total },
    create: { id: "config-cacifo-001", totalCacifos: total },
  });

  for (let i = 1; i <= total; i++) {
    await prisma.cacifo.upsert({
      where: { numero: i },
      update: {
        estado: "LIVRE",
        reservaId: null,
        criancas: null,
        notas: null,
        participante: { disconnect: true },
      },
      create: { numero: i, estado: "LIVRE", configuracaoId: "config-cacifo-001" },
    });
  }

  console.log(`  ✓ Config cacifos + ${total} cacifos LIVRE\n`);
}

// ─── Run ──────────────────────────────────────────────────────
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Production seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
