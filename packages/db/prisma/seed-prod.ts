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
  await seedMonitores();

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
  const locais: { id: string; nome: string; isSalaLanche: boolean }[] = [
    { id: "local-001", nome: "Zona 1 Baloiço / Parque crianças pequenas", isSalaLanche: false },
    { id: "local-002", nome: "Zona 2 Ninja e Slide", isSalaLanche: false },
    { id: "local-003", nome: "Zona 3 Trampolins", isSalaLanche: false },
    { id: "local-004", nome: "Zona 4 Futebol / Discoteca", isSalaLanche: false },
    { id: "local-005", nome: "Zona 5 Playground", isSalaLanche: false },
    // Salas de refeições/lanche: são ESTAS que se reservam no formulário de
    // festas (plano diário) - ficam marcadas com isSalaLanche = true.
    { id: "local-006", nome: "Sala Refeições 1", isSalaLanche: true },
    { id: "local-007", nome: "Sala Refeições 2", isSalaLanche: true },
  ];

  for (const local of locais) {
    await prisma.local.upsert({
      where: { id: local.id },
      update: { nome: local.nome, isSalaLanche: local.isSalaLanche },
      create: local,
    });
  }
  console.log(`  ✓ ${locais.length} locais (5 zonas + 2 salas de refeições)\n`);
}

// ─── Extras & Menus BasyLandy (catálogo real) ────────────────
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
    boloTipo?: string;
    fimDeSemana?: boolean;
  }[] = [
    // ─── Menus (5) ─────────────────────────────────────────────
    { id: "extra-menu-basy-semana", nome: "Menu Basy (Semana)", precoUnitario: 14.5, descricao: "Menu de dia de semana (exclui feriados).", categoria: "MENU", subcategoria: "BasyLandy", requerTexto: false, fimDeSemana: false },
    { id: "extra-menu-basy-fimsemana", nome: "Menu Basy (Fim de semana)", precoUnitario: 15.9, descricao: "Menu de fim-de-semana e feriados.", categoria: "MENU", subcategoria: "BasyLandy", requerTexto: false, fimDeSemana: true },
    { id: "extra-menu-landy-semana", nome: "Menu Landy (Semana)", precoUnitario: 16.5, descricao: "Menu mais procurado, de dia de semana (exclui feriados).", categoria: "MENU", subcategoria: "BasyLandy", requerTexto: false, fimDeSemana: false },
    { id: "extra-menu-landy-fimsemana", nome: "Menu Landy (Fim de semana)", precoUnitario: 17.9, descricao: "Menu mais procurado, de fim-de-semana e feriados.", categoria: "MENU", subcategoria: "BasyLandy", requerTexto: false, fimDeSemana: true },
    { id: "extra-menu-almoco-jantar", nome: "Almoço/Jantar (Suplemento)", precoUnitario: 3.5, descricao: "Pizza, fruta e nuggets. Suplemento a acrescentar ao menu base (almoço/jantar).", categoria: "MENU", subcategoria: "BasyLandy", requerTexto: false },
    // ─── Extras ao lanche (9) ─────────────────────────────────
    { id: "extra-lanche-bolachas", nome: "Bolachas", precoUnitario: 1.0, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-cenoura", nome: "Cenoura Baby", precoUnitario: 1.0, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-donuts", nome: "Donuts", precoUnitario: 1.0, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-fruta", nome: "Fruta da época", precoUnitario: 1.0, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-gomas", nome: "Gomas", precoUnitario: 1.0, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-muffins", nome: "Muffins", precoUnitario: 1.5, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-nuggets", nome: "Nuggets", precoUnitario: 1.5, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-pipocas", nome: "Pipocas", precoUnitario: 1.0, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-pizzas", nome: "Pizzas", precoUnitario: 1.5, descricao: "Extras ao lanche", categoria: "EXTRA", subcategoria: "Extras ao lanche", requerTexto: false },
    // ─── Bolos (5) ─────────────────────────────────────────────
    // boloTipo = ponte com Reserva.bolo (cozinha/email/lanche)
    { id: "extra-bolo-1kg-hostia", nome: "Bolo 1KG (Hóstia personalizada)", precoUnitario: 18.0, descricao: "Bolo 1kg com hóstia personalizada.", categoria: "EXTRA", subcategoria: "Bolos", requerTexto: false, boloTipo: "NOSSO_1KG" },
    { id: "extra-bolo-1kg-simples", nome: "Bolo 1kg (Simples)", precoUnitario: 15.0, descricao: "Bolo 1kg simples.", categoria: "EXTRA", subcategoria: "Bolos", requerTexto: false, boloTipo: "NOSSO_1KG" },
    { id: "extra-bolo-2kg-hostia", nome: "Bolo 2KG (hóstia personalizada)", precoUnitario: 33.0, descricao: "Bolo 2kg com hóstia personalizada.", categoria: "EXTRA", subcategoria: "Bolos", requerTexto: false, boloTipo: "NOSSO_2KG" },
    { id: "extra-bolo-2kg-simples", nome: "Bolo 2KGS (Simples)", precoUnitario: 27.0, descricao: "Bolo 2kg simples.", categoria: "EXTRA", subcategoria: "Bolos", requerTexto: false, boloTipo: "NOSSO_2KG" },
    { id: "extra-bolo-artistico", nome: "Bolo Artístico", precoUnitario: 50.0, descricao: "Bolo artístico personalizado.", categoria: "EXTRA", subcategoria: "Bolos", requerTexto: true, boloTipo: "BOLO_ARTISTICO" },
    // ─── Extras à diversão (7) ─────────────────────────────────
    { id: "extra-diversao-brinde-1", nome: "Brinde 1", precoUnitario: 1.0, descricao: "Brinde por criança. Extras à diversão.", categoria: "EXTRA", subcategoria: "Extras à diversão", requerTexto: false },
    { id: "extra-diversao-brinde-2", nome: "Brinde 2", precoUnitario: 2.0, descricao: "Brinde por criança. Extras à diversão.", categoria: "EXTRA", subcategoria: "Extras à diversão", requerTexto: false },
    { id: "extra-diversao-convites", nome: "Convites Personalizados", precoUnitario: 15.0, descricao: "Pacote de convites personalizados. Extras à diversão.", categoria: "EXTRA", subcategoria: "Extras à diversão", requerTexto: false },
    { id: "extra-diversao-boloes", nome: "Modelagem de Balões", precoUnitario: 1.0, descricao: "Modelagem de balões por criança. Extras à diversão.", categoria: "EXTRA", subcategoria: "Extras à diversão", requerTexto: false },
    { id: "extra-diversao-pinturas", nome: "Pinturas faciais", precoUnitario: 60.0, descricao: "Pinturas faciais. Extras à diversão.", categoria: "EXTRA", subcategoria: "Extras à diversão", requerTexto: false },
    { id: "extra-diversao-prol1h", nome: "Prolongamento +1h", precoUnitario: 5.0, descricao: "Prolongamento de 1 hora por criança. Extras à diversão.", categoria: "EXTRA", subcategoria: "Extras à diversão", requerTexto: false },
    { id: "extra-diversao-prol30m", nome: "Prolongamento +30min", precoUnitario: 3.0, descricao: "Prolongamento de 30 minutos por criança. Extras à diversão.", categoria: "EXTRA", subcategoria: "Extras à diversão", requerTexto: false },
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
        boloTipo: extra.boloTipo,
        requerTexto: extra.requerTexto,
        fimDeSemana: extra.fimDeSemana,
      },
      create: extra,
    });
  }

  // Cobrança por pessoa (por criança) - idempotente
  await prisma.extra.updateMany({
    where: {
      id: {
        in: [
          "extra-lanche-bolachas", "extra-lanche-cenoura", "extra-lanche-donuts",
          "extra-lanche-fruta", "extra-lanche-gomas", "extra-lanche-muffins",
          "extra-lanche-nuggets", "extra-lanche-pipocas", "extra-lanche-pizzas",
          "extra-diversao-brinde-1", "extra-diversao-brinde-2", "extra-diversao-boloes",
          "extra-diversao-prol1h", "extra-diversao-prol30m",
        ],
      },
    },
    data: { baseCobranca: "POR_PESSOA" },
  });

  // Associar todos os extras/menus BasyLandy a todos os locais
  const basyLandyIds = extras.map((e) => e.id);
  const locaisIds = ["local-001", "local-002", "local-003", "local-004", "local-005"];
  const basyLandyLocais = basyLandyIds.flatMap((eid) =>
    locaisIds.map((localId) => ({ extraId: eid, localId }))
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
    { aniversariantes: 4, minimo: 25 },
  ];

  const tarifario = {
    precoCriancaSemana: 14.5,
    precoCriancaFimSemana: 15.9,
    precoEntradaHoraSemana: 10,
    precoEntradaHoraFimSemana: 12,
    precoEntrada1h: 6,
    precoEntrada2h: 10,
    precoEntradaHoraAdicional: 5,
    minimosCriancasPorAniversariante: minimos,
    precoMeias: 2.5,
    precoExcessoFixo: 5,
    caucaoDefault: 50,
    precoLancheEntrada: 4.5,
    precoAdulto: 6,
    valorHoraMonitorDefault: 6,
    duracaoDefaultFestaMin: 135,
    duracaoExcessoBlocoMin: 30,
  };

  const existing = await prisma.configuracaoPreco.findFirst();
  if (existing) {
    // Re-seed actualiza o tarifário para os valores oficiais BasyLandy
    await prisma.configuracaoPreco.update({ where: { id: existing.id }, data: tarifario });
  } else {
    await prisma.configuracaoPreco.create({ data: tarifario });
  }

  console.log("  ✓ Pricing config (preço por criança + mínimos + meias + adulto)\n");
}

// ─── Monitor default ──────────────────────────────────────────
async function seedMonitores() {
  console.log("  Creating default monitor...");

  await prisma.monitor.upsert({
    where: { id: "monitor-default" },
    update: {},
    create: {
      id: "monitor-default",
      nome: "Monitor BasyLandy",
      contacto: "",
      valorHora: null, // usa ConfiguracaoPreco.valorHoraMonitorDefault
      activo: true,
    },
  });

  console.log("  ✓ 1 monitor default (valor/hora: usa o tarifário global)\n");
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

// ─── Cores de pulseira - FONTE ÚNICA: FESTA_COLORS (@saas/shared-defaults) ───
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

// ─── Grelhas por tipo de dia (plano diário BaseLandia) ─────────
// FDS (15 slots): 6 manhã 09h15-10h45 + 9 tarde 14h00-17h45, lanche = entrada+1h30
//   (excepção oficial: slot 1 lanche às 10:30, 30 min mais cedo).
// Semana (6 slots): 15h30-18h00, lanche = entrada+1h, brincar final 45 min.
// Salas alternadas 1/2; cores em rotação (sem coexistência no parque);
// 17:15 e 17:45 existem nas DUAS grelhas - filtrar sempre por tipo de dia.
const GRELHA_SLOTS: {
  horaInicio: string;
  horaLanche: string;
  salaLancheId: string;
  cor: string;
  fds: boolean;
}[] = [
  // ── Fim-de-semana (15) ──
  { horaInicio: "09:15", horaLanche: "10:30", salaLancheId: "sala-lanche-1", cor: COR.AZUL, fds: true }, // 1  Azul (lanche 30 min mais cedo - excepção oficial)
  { horaInicio: "09:30", horaLanche: "11:00", salaLancheId: "sala-lanche-2", cor: COR.VERDE, fds: true }, // 2  Verde
  { horaInicio: "09:45", horaLanche: "11:15", salaLancheId: "sala-lanche-1", cor: COR.AMARELA, fds: true }, // 3  Amarela
  { horaInicio: "10:15", horaLanche: "11:45", salaLancheId: "sala-lanche-2", cor: COR.LARANJA, fds: true }, // 4  Laranja
  { horaInicio: "10:30", horaLanche: "12:00", salaLancheId: "sala-lanche-1", cor: COR.ROSA, fds: true }, // 5  Rosa
  { horaInicio: "10:45", horaLanche: "12:15", salaLancheId: "sala-lanche-2", cor: COR.TURQUESA, fds: true }, // 6  Turquesa
  { horaInicio: "14:00", horaLanche: "15:30", salaLancheId: "sala-lanche-1", cor: COR.ROXA, fds: true }, // 7  Roxa
  { horaInicio: "14:15", horaLanche: "15:45", salaLancheId: "sala-lanche-2", cor: COR.AZUL, fds: true }, // 8  Azul
  { horaInicio: "14:45", horaLanche: "16:15", salaLancheId: "sala-lanche-1", cor: COR.VERDE, fds: true }, // 9  Verde
  { horaInicio: "15:15", horaLanche: "16:45", salaLancheId: "sala-lanche-2", cor: COR.AMARELA, fds: true }, // 10 Amarela
  { horaInicio: "15:45", horaLanche: "17:15", salaLancheId: "sala-lanche-1", cor: COR.LARANJA, fds: true }, // 11 Laranja
  { horaInicio: "16:00", horaLanche: "17:30", salaLancheId: "sala-lanche-2", cor: COR.ROSA, fds: true }, // 12 Rosa
  { horaInicio: "16:45", horaLanche: "18:15", salaLancheId: "sala-lanche-1", cor: COR.TURQUESA, fds: true }, // 13 Turquesa
  { horaInicio: "17:15", horaLanche: "18:45", salaLancheId: "sala-lanche-2", cor: COR.ROXA, fds: true }, // 14 Roxa
  { horaInicio: "17:45", horaLanche: "19:15", salaLancheId: "sala-lanche-1", cor: COR.AZUL, fds: true }, // 15 Azul
  // ── Semana (6) - lanche = entrada+1h, salas alternadas ──
  { horaInicio: "15:30", horaLanche: "16:30", salaLancheId: "sala-lanche-1", cor: COR.AZUL, fds: false }, // S1 Azul
  { horaInicio: "16:00", horaLanche: "17:00", salaLancheId: "sala-lanche-2", cor: COR.VERDE, fds: false }, // S2 Verde
  { horaInicio: "17:15", horaLanche: "18:15", salaLancheId: "sala-lanche-1", cor: COR.AMARELA, fds: false }, // S3 Amarela
  { horaInicio: "17:30", horaLanche: "18:30", salaLancheId: "sala-lanche-2", cor: COR.LARANJA, fds: false }, // S4 Laranja
  { horaInicio: "17:45", horaLanche: "18:45", salaLancheId: "sala-lanche-1", cor: COR.ROSA, fds: false }, // S5 Rosa
  { horaInicio: "18:00", horaLanche: "19:00", salaLancheId: "sala-lanche-2", cor: COR.TURQUESA, fds: false }, // S6 Turquesa
];

// ─── Slots Horários (grelhas FDS 15 + semana 6, 2h15m + defaults cor/lanche/sala) ──
async function seedSlotsHorario() {
  console.log("  Creating time slots...");

  for (const [i, s] of GRELHA_SLOTS.entries()) {
    const data = {
      horaInicio: s.horaInicio,
      duracaoMin: 135,
      ordem: i + 1,
      fimDeSemana: s.fds,
      corDefault: s.cor,
      horaLancheDefault: s.horaLanche,
      salaLancheId: s.salaLancheId,
    };
    // 17:15/17:45 existem nas duas grelhas: match por hora + tipo de dia
    const existing = await prisma.slotHorario.findFirst({
      where: { horaInicio: s.horaInicio, fimDeSemana: s.fds },
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

  // Slots fora de AMBAS as grelhas (horas antigas ou sem aplicabilidade) → inactivos.
  // Não apagar: reservas históricas podem apontar a essas horas.
  const fdsHoras = GRELHA_SLOTS.filter((s) => s.fds).map((s) => s.horaInicio);
  const semanaHoras = GRELHA_SLOTS.filter((s) => !s.fds).map((s) => s.horaInicio);
  const foraDaGrelha = await prisma.slotHorario.findMany({
    where: {
      activo: true,
      NOT: {
        OR: [
          { horaInicio: { in: fdsHoras }, fimDeSemana: true },
          { horaInicio: { in: semanaHoras }, fimDeSemana: false },
        ],
      },
    },
  });
  for (const s of foraDaGrelha) {
    await prisma.slotHorario.update({ where: { id: s.id }, data: { activo: false } });
  }

  const fdsCount = GRELHA_SLOTS.filter((s) => s.fds).length;
  console.log(
    `  ✓ ${GRELHA_SLOTS.length} slots horários (FDS: ${fdsCount} · semana: ${GRELHA_SLOTS.length - fdsCount})`
  );
  if (foraDaGrelha.length > 0) {
    console.log(`  ✓ ${foraDaGrelha.length} slots antigos desactivados (fora das grelhas)\n`);
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
