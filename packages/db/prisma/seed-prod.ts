/**
 * Production seed — MINIMUM data to bring the app online.
 *
 * Creates ONLY:
 *   - 1 admin user (via Better Auth) + RBAC permissions (FuncaoPermissao)
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

  await seedAdmin();
  await seedRBAC();
  await seedCacifos();

  console.log("\n✅ Production seed complete!");
}

// ─── Admin user ───────────────────────────────────────────────
async function seedAdmin() {
  console.log("  Creating admin user...");

  const email = process.env.SEED_ADMIN_EMAIL || "admin@baselandia.pt";
  const password = process.env.SEED_ADMIN_PASSWORD || "Alterar!2025";
  const name = "Administrador";

  // Idempotent: remove a previous admin with the same email before creating.
  await prisma.account.deleteMany({ where: { user: { email } } });
  await prisma.session.deleteMany({ where: { user: { email } } });
  await prisma.user.deleteMany({ where: { email } });

  const result = await seedAuth.api.signUpEmail({
    body: { name, email, password },
  });
  if (!result?.user) throw new Error(`Failed to create admin ${email}`);

  await prisma.user.update({
    where: { id: result.user.id },
    data: { emailVerified: true, funcao: "ADMINISTRADOR", activo: true },
  });

  console.log(`  ✓ Admin: ${email} / ${password}`);
  console.log("  ⚠️  Altera a palavra-passe após o primeiro login!\n");
}

// ─── RBAC (FuncaoPermissao) ───────────────────────────────────
async function seedRBAC() {
  console.log("  Creating RBAC permissions...");

  const perms = [
    { funcao: "ADMINISTRADOR" as const, modulo: "reservas", nivelAcesso: "administracao" },
    { funcao: "ADMINISTRADOR" as const, modulo: "cacifos", nivelAcesso: "administracao" },
    { funcao: "ADMINISTRADOR" as const, modulo: "menus", nivelAcesso: "administracao" },
    { funcao: "ADMINISTRADOR" as const, modulo: "relatorios", nivelAcesso: "administracao" },
    { funcao: "ADMINISTRADOR" as const, modulo: "divulgacoes", nivelAcesso: "administracao" },
    { funcao: "ADMINISTRADOR" as const, modulo: "configuracoes", nivelAcesso: "administracao" },
    { funcao: "GESTOR" as const, modulo: "reservas", nivelAcesso: "escrita" },
    { funcao: "GESTOR" as const, modulo: "cacifos", nivelAcesso: "escrita" },
    { funcao: "GESTOR" as const, modulo: "menus", nivelAcesso: "escrita" },
    { funcao: "GESTOR" as const, modulo: "relatorios", nivelAcesso: "leitura" },
    { funcao: "GESTOR" as const, modulo: "divulgacoes", nivelAcesso: "leitura" },
    { funcao: "GESTOR" as const, modulo: "configuracoes", nivelAcesso: "leitura" },
    { funcao: "RECECAO" as const, modulo: "reservas", nivelAcesso: "escrita" },
    { funcao: "RECECAO" as const, modulo: "cacifos", nivelAcesso: "escrita" },
    { funcao: "RECECAO" as const, modulo: "menus", nivelAcesso: "leitura" },
    { funcao: "RECECAO" as const, modulo: "relatorios", nivelAcesso: "sem_acesso" },
    { funcao: "RECECAO" as const, modulo: "divulgacoes", nivelAcesso: "sem_acesso" },
    { funcao: "RECECAO" as const, modulo: "configuracoes", nivelAcesso: "sem_acesso" },
    { funcao: "MARKETING" as const, modulo: "reservas", nivelAcesso: "leitura" },
    { funcao: "MARKETING" as const, modulo: "cacifos", nivelAcesso: "sem_acesso" },
    { funcao: "MARKETING" as const, modulo: "menus", nivelAcesso: "sem_acesso" },
    { funcao: "MARKETING" as const, modulo: "relatorios", nivelAcesso: "leitura" },
    { funcao: "MARKETING" as const, modulo: "divulgacoes", nivelAcesso: "escrita" },
    { funcao: "MARKETING" as const, modulo: "configuracoes", nivelAcesso: "sem_acesso" },
  ];

  for (const perm of perms) {
    await prisma.funcaoPermissao.upsert({
      where: { funcao_modulo: { funcao: perm.funcao, modulo: perm.modulo } },
      update: { nivelAcesso: perm.nivelAcesso },
      create: perm,
    });
  }
  console.log(`  ✓ ${perms.length} RBAC permissions\n`);
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
