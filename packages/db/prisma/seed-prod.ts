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
  emailAndPassword: { 
    enabled: true,
    // Desativado envio de emails em ambiente de testes/seeds
    // sendResetPassword: async () => {},
  },
  emailVerification: {
    // Desativado envio de emails em ambiente de testes/seeds
    sendVerificationEmail: async () => {},
    sendOnSignUp: false,
  },
});

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Production seed (minimum)...\n");

  await seedUsers();
  await seedExtras();
  await seedConfiguracaoPreco();
  await seedExcecoesCalendario();
  await seedSlotsHorario();
  await seedCacifos();

  console.log("\n✅ Production seed complete!");
}

// ─── Users (admin + role accounts) ───────────────────────────
const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD || "Alterar!2025";
const emailDomain = process.env.SEED_EMAIL_DOMAIN || "baselandia.pt";

const ROLE_USERS: { email: string; funcao: import("@prisma/client").FuncaoUtilizador; name: string; password?: string }[] = [
  { email: process.env.SEED_ADMIN_EMAIL || `admin@${emailDomain}`, funcao: "ADMINISTRADOR", name: "Administrador", password: process.env.SEED_ADMIN_PASSWORD },
  { email: `cacifos@${emailDomain}`, funcao: "CACIFOS", name: "Cacifos", password: process.env.SEED_CACIFOS_PASSWORD },
  { email: `lanches@${emailDomain}`, funcao: "LANCHE", name: "Lanches", password: process.env.SEED_LANCHE_PASSWORD },
  { email: `monitor@${emailDomain}`, funcao: "MONITOR", name: "Monitor", password: process.env.SEED_MONITOR_PASSWORD },
  { email: `festas-acabar@${emailDomain}`, funcao: "FESTAS_ACABAR", name: "Festas a Acabar", password: process.env.SEED_FESTAS_ACABAR_PASSWORD },
  { email: `staff@${emailDomain}`, funcao: "STAFF", name: "Staff", password: process.env.SEED_STAFF_PASSWORD },
  { email: `rececao@${emailDomain}`, funcao: "RECECAO", name: "Receção", password: process.env.SEED_RECECAO_PASSWORD },
];

async function seedUsers() {
  console.log("  Creating users...\n");

  for (const u of ROLE_USERS) {
    // Idempotent: remove a previous user with the same email before creating.
    await prisma.account.deleteMany({ where: { user: { email: u.email } } });
    await prisma.session.deleteMany({ where: { user: { email: u.email } } });
    await prisma.user.deleteMany({ where: { email: u.email } });

    // Use role-specific password if set, otherwise use default
    const password = u.password || DEFAULT_PASSWORD;

    const result = await seedAuth.api.signUpEmail({
      body: { name: u.name, email: u.email, password },
    });
    if (!result?.user) throw new Error(`Failed to create user ${u.email}`);

    await prisma.user.update({
      where: { id: result.user.id },
      data: { emailVerified: true, funcao: u.funcao, activo: true },
    });

    console.log(`  ✓ ${u.funcao}: ${u.email} / ${password}`);
  }

  console.log("\n  ⚠️  Altera as palavras-passe após o primeiro login!\n");
}

// ─── Extras & Menus BasyLandy ────────────────────────────────
async function seedExtras() {
  console.log("  Creating extras & menus (BasyLandy)...");

  // Menus selecionáveis (categoria MENU) + extras de lanche (categoria EXTRA).
  // Sem associação a locais: ficam globais, associáveis posteriormente.
  const extras: {
    id: string;
    nome: string;
    precoUnitario: number;
    descricao: string;
    categoria: "MENU" | "EXTRA";
    subcategoria: string;
    requerTexto: boolean;
  }[] = [
    // ─── Menus BasyLandy ────────────────────────────────────────
    { id: "extra-menu-basy-semana", nome: "Menu BasyLandy (Semana)", precoUnitario: 14.0, descricao: "Gelatina; Água e sumo; Batatas fritas; Pão de forma (queijo, fiambre, chocolate ou manteiga); Convites digitais/físicos; Prenda para o aniversariante. Preço de dia de semana (exclui feriados).", categoria: "MENU", subcategoria: "BasyLandy", requerTexto: false },
    { id: "extra-menu-basy-fimsemana", nome: "Menu BasyLandy (Fim-de-semana)", precoUnitario: 15.9, descricao: "Gelatina; Água e sumo; Batatas fritas; Pão de forma (queijo, fiambre, chocolate ou manteiga); Convites digitais/físicos; Prenda para o aniversariante. Aplicado a sábados, domingos e feriados.", categoria: "MENU", subcategoria: "BasyLandy", requerTexto: false },
    { id: "extra-menu-almoco-jantar", nome: "Almoço/Jantar (Suplemento)", precoUnitario: 3.5, descricao: "Pizza, fruta e nuggets. Suplemento a acrescentar ao menu base (almoço/jantar).", categoria: "MENU", subcategoria: "BasyLandy", requerTexto: false },
    // ─── Extras ao lanche BasyLandy ────────────────────────────
    { id: "extra-lanche-cenoura", nome: "Cenoura Baby", precoUnitario: 1.0, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-babybel", nome: "Queijo babybel", precoUnitario: 1.5, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-pipocas", nome: "Pipocas", precoUnitario: 0.5, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-pizzas", nome: "Pizzas", precoUnitario: 1.5, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-bolachas", nome: "Bolachas", precoUnitario: 1.0, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-nuggets", nome: "Nuggets", precoUnitario: 1.5, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-donuts", nome: "Donuts", precoUnitario: 1.0, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-fruta", nome: "Fruta da época", precoUnitario: 1.0, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-muffins", nome: "Muffins", precoUnitario: 1.5, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    // ─── Extras à diversão BasyLandy ────────────────────────────
    { id: "extra-diversao-brinde", nome: "Brinde", precoUnitario: 1.0, descricao: "Brinde por criança. Extras à diversão.", categoria: "EXTRA", subcategoria: "Extras à diversão", requerTexto: false },
    { id: "extra-diversao-boloes", nome: "Modelagem de Balões", precoUnitario: 1.0, descricao: "Modelagem de balões por criança. Extras à diversão.", categoria: "EXTRA", subcategoria: "Extras à diversão", requerTexto: false },
    { id: "extra-diversao-convites", nome: "Convites Personalizados", precoUnitario: 15.0, descricao: "Pacote de 30 convites personalizados. Extras à diversão.", categoria: "EXTRA", subcategoria: "Extras à diversão", requerTexto: true },
    { id: "extra-diversao-prol1h", nome: "Prolongamento +1h", precoUnitario: 5.0, descricao: "Prolongamento de 1 hora por criança. Extras à diversão.", categoria: "EXTRA", subcategoria: "Extras à diversão", requerTexto: false },
    { id: "extra-diversao-prol30m", nome: "Prolongamento +30min", precoUnitario: 3.0, descricao: "Prolongamento de 30 minutos por criança. Extras à diversão.", categoria: "EXTRA", subcategoria: "Extras à diversão", requerTexto: false },
    // ─── Bolos BasyLandy ────────────────────────────────────────
    { id: "extra-bolo-1kg", nome: "Bolo 1KG", precoUnitario: 17.5, descricao: "Bolo de aniversário de 1kg.", categoria: "EXTRA", subcategoria: "Bolos", requerTexto: false },
    { id: "extra-bolo-2kg", nome: "Bolo 2KG (hóstia incluída)", precoUnitario: 30.0, descricao: "Bolo de aniversário de 2kg com hóstia incluída.", categoria: "EXTRA", subcategoria: "Bolos", requerTexto: false },
    { id: "extra-bolo-artistico", nome: "Bolo Artístico", precoUnitario: 50.0, descricao: "Bolo artístico personalizado.", categoria: "EXTRA", subcategoria: "Bolos", requerTexto: true },
  ];

  for (const extra of extras) {
    await prisma.extra.upsert({
      where: { id: extra.id },
      update: {
        nome: extra.nome,
        precoUnitario: extra.precoUnitario,
        descricao: extra.descricao,
        categoria: extra.categoria,
        subcategoria: extra.subcategoria,
        requerTexto: extra.requerTexto,
      },
      create: extra,
    });
  }

  console.log(`  ✓ ${extras.length} extras & menus BasyLandy (globais)\n`);
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
        precoCriancaSemana: 14,
        precoCriancaFimSemana: 15.9,
        precoEntradaHoraSemana: 10,
        precoEntradaHoraFimSemana: 12,
        precoEntrada1h: 6,
        precoEntrada2h: 10,
        precoEntradaHoraAdicional: 5,
        minimosCriancasPorAniversariante: minimos,
        precoMeias: 2.5,
        precoExcessoFixo: 5,
        caucaoDefault: 40,
        precoLancheEntrada: 4.5,
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
