/**
 * Production seed - MINIMUM data to bring the app online.
 *
 * Creates ONLY:
 *   - 7 users (admin + role accounts via Better Auth)
 *   - Locais, Extras, Configuração Preços, Exceções Calendário
 *   - Salas Lanche, Slots Horário (com defaults de cor/lanche/sala)
 *   - Etapas de Festa (configuração padrão)
 *   - Cacifos config (200 cacifos LIVRE)
 *
 * NO reservas, clientes, monitores, marketing, entradas livres, etc.
 * ⚠️  WIPES ALL DATA before seeding (idempotent: safe to re-run).
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

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { config } from "dotenv";
import { FESTA_COLORS } from "@saas/shared-defaults";
import { getSeedUsers } from "./seed-roles";
import { createPrismaClient } from "../src/mariadb-adapter";
import { wipeDatabase } from "../src/wipe-database";

// Load env from apps/web/.env when run directly.
// (db.js also passes --env-file; dotenv ignores a missing file silently.)
config({ path: "../../apps/web/.env" });

// Driver adapter (mariadb) - ver packages/db/src/mariadb-adapter.ts
const prisma = createPrismaClient(process.env.DATABASE_URL!);

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

  await wipeDatabase(prisma);
  await seedUsers();
  await seedLocais();
  await seedExtras();
  await seedConfiguracaoPreco();
  await seedExcecoesCalendario();
  await seedSalasLanche();
  await seedSlotsHorario();
  await seedEtapasFestaConfig();
  await seedCacifos();

  console.log("\n✅ Production seed complete!");
}

// ─── Users (admin + role accounts) - single source: seed-roles.ts ──
async function seedUsers() {
  console.log("  Creating users...\n");

  const ROLE_USERS = getSeedUsers();

  for (const u of ROLE_USERS) {
    // Idempotent: remove a previous user with the same email before creating.
    await prisma.account.deleteMany({ where: { user: { email: u.email } } });
    await prisma.session.deleteMany({ where: { user: { email: u.email } } });
    await prisma.user.deleteMany({ where: { email: u.email } });

    const password = u.password;

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

// ─── Locais ───────────────────────────────────────────────────
async function seedLocais() {
  console.log("  Creating locais...");
  const locais = [
    { id: "local-001", nome: "Sala Azul" },
    { id: "local-002", nome: "Sala Arco-Íris" },
    { id: "local-003", nome: "Parque Trampolins" },
  ];
  for (const local of locais) {
    await prisma.local.upsert({ where: { id: local.id }, update: {}, create: local });
  }
  console.log("  ✓ 3 locais\n");
}

// ─── Extras & Menus BasyLandy ────────────────────────────────
async function seedExtras() {
  console.log("  Creating extras & menus (BasyLandy)...");

  const extras: {
    id: string;
    nome: string;
    precoUnitario: number;
    descricao: string;
    categoria: "MENU" | "EXTRA";
    subcategoria: string;
    requerTexto: boolean;
    fimDeSemana?: boolean;
  }[] = [
    // ─── Menus BasyLandy ────────────────────────────────────────
    { id: "extra-menu-basy-semana", nome: "Menu BasyLandy (Semana)", precoUnitario: 14.0, descricao: "Gelatina; Água e sumo; Batatas fritas; Pão de forma (queijo, fiambre, chocolate ou manteiga); Convites digitais/físicos; Prenda para o aniversariante. Preço de dia de semana (exclui feriados).", categoria: "MENU", subcategoria: "BasyLandy", requerTexto: false, fimDeSemana: false },
    { id: "extra-menu-basy-fimsemana", nome: "Menu BasyLandy (Fim-de-semana)", precoUnitario: 15.9, descricao: "Gelatina; Água e sumo; Batatas fritas; Pão de forma (queijo, fiambre, chocolate ou manteiga); Convites digitais/físicos; Prenda para o aniversariante. Aplicado a sábados, domingos e feriados.", categoria: "MENU", subcategoria: "BasyLandy", requerTexto: false, fimDeSemana: true },
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
        fimDeSemana: extra.fimDeSemana,
      },
      create: extra,
    });
  }

  // Cobrança por pessoa (idempotente)
  await prisma.extra.updateMany({
    where: { id: { in: ["extra-diversao-brinde", "extra-diversao-boloes", "extra-diversao-prol1h", "extra-diversao-prol30m"] } },
    data: { baseCobranca: "POR_PESSOA" },
  });

  // Associar todos os extras/menus BasyLandy a todos os locais
  const basyLandyIds = [
    "extra-menu-basy-semana", "extra-menu-basy-fimsemana", "extra-menu-almoco-jantar",
    "extra-lanche-cenoura", "extra-lanche-babybel", "extra-lanche-pipocas",
    "extra-lanche-pizzas", "extra-lanche-bolachas", "extra-lanche-nuggets",
    "extra-lanche-donuts", "extra-lanche-fruta", "extra-lanche-muffins",
    "extra-diversao-brinde", "extra-diversao-boloes", "extra-diversao-convites",
    "extra-diversao-prol1h", "extra-diversao-prol30m",
    "extra-bolo-1kg", "extra-bolo-2kg", "extra-bolo-artistico",
  ];
  const basyLandyLocais = basyLandyIds.flatMap(eid =>
    [{ extraId: eid, localId: "local-001" }, { extraId: eid, localId: "local-002" }, { extraId: eid, localId: "local-003" }]
  );

  for (const el of basyLandyLocais) {
    await prisma.extraLocal.upsert({
      where: { extraId_localId: { extraId: el.extraId, localId: el.localId } },
      update: {},
      create: el,
    });
  }

  console.log(`  ✓ ${extras.length} extras & menus BasyLandy (globais) + ${basyLandyLocais.length} associações a locais\n`);
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
        valorHoraMonitorDefault: 8,
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
  // [mês-01, dia-01, nome] - feriados nacionais fixos de Portugal
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

// ─── Salas de Lanche ──────────────────────────────────────────
async function seedSalasLanche() {
  console.log("  Creating salas de lanche...");

  const salas = [
    { id: "sala-lanche-1", nome: "Sala 1", activo: true },
    { id: "sala-lanche-2", nome: "Sala 2", activo: true },
  ];

  for (const s of salas) {
    await prisma.salaLanche.upsert({
      where: { id: s.id },
      update: { nome: s.nome, activo: s.activo },
      create: s,
    });
  }

  console.log(`  ✓ ${salas.length} salas de lanche\n`);
}

// ─── Cores de pulseira — FONTE ÚNICA: FESTA_COLORS (@saas/shared-defaults) ───
// Nomes do plano diário → nomes da paleta (Turquesa = "Verde-água", Roxa = "Roxo").
// NÃO usar hex literais aqui: qualquer alteração de cor é feita em
// packages/shared/shared-defaults/src/defaults/festa-colors.ts
const corDaPaleta = (nome: string): string => {
  const c = FESTA_COLORS.find((x) => x.name === nome);
  if (!c) throw new Error(`Cor "${nome}" não existe em FESTA_COLORS (@saas/shared-defaults)`);
  return c.value;
};
const COR = {
  AZUL: corDaPaleta("Azul"),
  VERDE: corDaPaleta("Verde"),
  AMARELA: corDaPaleta("Amarelo"),
  LARANJA: corDaPaleta("Laranja"),
  ROSA: corDaPaleta("Rosa"),
  TURQUESA: corDaPaleta("Verde-água"),
  ROXA: corDaPaleta("Roxo"),
  CINZENTA: corDaPaleta("Cinzento"),
} as const;

// ─── Grelha diária BaseLandia (plano diário de aniversários) ────
// 15 slots/dia (6 manhã + 9 tarde), festas de 2h15m, lanche = entrada+1h30
// em salas alternadas, cores em rotação de 7 (sem coexistência no parque).
const GRELHA_SLOTS = [
  { horaInicio: "09:15", horaLanche: "10:45", salaLancheId: "sala-lanche-1", cor: COR.AZUL }, // 1  Azul
  { horaInicio: "09:30", horaLanche: "11:00", salaLancheId: "sala-lanche-2", cor: COR.VERDE }, // 2  Verde
  { horaInicio: "09:45", horaLanche: "11:15", salaLancheId: "sala-lanche-1", cor: COR.AMARELA }, // 3  Amarela
  { horaInicio: "10:15", horaLanche: "11:45", salaLancheId: "sala-lanche-2", cor: COR.LARANJA }, // 4  Laranja
  { horaInicio: "10:30", horaLanche: "12:00", salaLancheId: "sala-lanche-1", cor: COR.ROSA }, // 5  Rosa
  { horaInicio: "10:45", horaLanche: "12:15", salaLancheId: "sala-lanche-2", cor: COR.TURQUESA }, // 6  Turquesa
  { horaInicio: "14:00", horaLanche: "15:30", salaLancheId: "sala-lanche-1", cor: COR.ROXA }, // 7  Roxa
  { horaInicio: "14:15", horaLanche: "15:45", salaLancheId: "sala-lanche-2", cor: COR.AZUL }, // 8  Azul
  { horaInicio: "14:45", horaLanche: "16:15", salaLancheId: "sala-lanche-1", cor: COR.VERDE }, // 9  Verde
  { horaInicio: "15:15", horaLanche: "16:45", salaLancheId: "sala-lanche-2", cor: COR.AMARELA }, // 10 Amarela
  { horaInicio: "15:45", horaLanche: "17:15", salaLancheId: "sala-lanche-1", cor: COR.LARANJA }, // 11 Laranja
  { horaInicio: "16:00", horaLanche: "17:30", salaLancheId: "sala-lanche-2", cor: COR.ROSA }, // 12 Rosa
  { horaInicio: "16:45", horaLanche: "18:15", salaLancheId: "sala-lanche-1", cor: COR.TURQUESA }, // 13 Turquesa
  { horaInicio: "17:15", horaLanche: "18:45", salaLancheId: "sala-lanche-2", cor: COR.ROXA }, // 14 Roxa
  { horaInicio: "17:45", horaLanche: "19:15", salaLancheId: "sala-lanche-1", cor: COR.AZUL }, // 15 Azul
] as const;

// ─── Slots Horários (grelha diária 15 slots, 2h15m + defaults cor/lanche/sala) ──
async function seedSlotsHorario() {
  console.log("  Creating time slots...");

  for (const [i, s] of GRELHA_SLOTS.entries()) {
    const data = {
      horaInicio: s.horaInicio,
      duracaoMin: 135,
      ordem: i + 1,
      corDefault: s.cor,
      horaLancheDefault: s.horaLanche,
      salaLancheId: s.salaLancheId,
    };
    const existing = await prisma.slotHorario.findFirst({
      where: { horaInicio: s.horaInicio },
    });
    if (existing) {
      await prisma.slotHorario.update({
        where: { id: existing.id },
        data: { ...data, activo: true },
      });
    } else {
      await prisma.slotHorario.create({ data });
    }
  }

  // Slots antigos fora da grelha (ex.: 10:00/16:30/18:30) → inactivos.
  // Não apagar: reservas históricas podem apontar a essas horas.
  const horasGrelha = GRELHA_SLOTS.map((s) => s.horaInicio);
  const foraDaGrelha = await prisma.slotHorario.findMany({
    where: { horaInicio: { notIn: [...horasGrelha] }, activo: true },
  });
  for (const s of foraDaGrelha) {
    await prisma.slotHorario.update({ where: { id: s.id }, data: { activo: false } });
  }

  console.log(`  ✓ ${GRELHA_SLOTS.length} slots horários (grelha diária 2h15m + defaults cor/lanche/sala)`);
  if (foraDaGrelha.length > 0) {
    console.log(`  ✓ ${foraDaGrelha.length} slots antigos desactivados (fora da grelha)\n`);
  } else {
    console.log("");
  }
}

// ─── Etapas de Festa (configuração padrão) ────────────────────
async function seedEtapasFestaConfig() {
  console.log("  Creating etapas config...");

  const etapas = [
    { id: "etapa-001", nome: "Receção dos Convidados", descricao: "Receção e acolhimento", ordem: 1, icone: "Users" },
    { id: "etapa-002", nome: "Jogos e Actividades", descricao: "Jogos dirigidos pelos monitores", ordem: 2, icone: "Gamepad2" },
    { id: "etapa-003", nome: "Lanche Servido", descricao: "Serviço do lanche", ordem: 3, icone: "UtensilsCrossed" },
    { id: "etapa-004", nome: "Bolo de Aniversário", descricao: "Parabéns e corte do bolo", ordem: 4, icone: "Cake" },
    { id: "etapa-005", nome: "Parabéns Cantados", descricao: "Momento dos parabéns com música", ordem: 5, icone: "Music" },
    { id: "etapa-006", nome: "Entrega de Lembranças", descricao: "Distribuição das lembranças", ordem: 6, icone: "Package" },
  ];

  for (const etapa of etapas) {
    await prisma.etapaFesta.upsert({
      where: { id: etapa.id },
      update: { nome: etapa.nome, descricao: etapa.descricao, ordem: etapa.ordem, icone: etapa.icone },
      create: etapa,
    });
  }

  console.log(`  ✓ ${etapas.length} etapas de festa\n`);
}

// ─── Cacifos ──────────────────────────────────────────────────
async function seedCacifos() {
  console.log("  Creating cacifos config...");

  const total = 200;
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
