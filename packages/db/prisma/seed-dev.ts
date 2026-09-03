/**
 * Dev seed script — Comprehensive sample data for development.
 *
 * Creates:
 * - 5 Users (with Better Auth) + RBAC permissions
 * - 3 Locais (salas)
 * - 12 Extras (6 EXTRA + 6 MENU) + ExtraLocal associations
 * - 6 Monitores (perfil: nome, contacto)
 * - Alocações de monitores (escalonamento por dia + intervalo horário)
 * - 1 Configuração Cacifos + 40 Cacifos
 * - 8 Clientes with 10 Aniversariantes
 * - 10 Reservas (past, today, future — various states) ALL with:
 *   → cor, tema, bolo, previsaoCriancas, observações
 *   → pagamento (metodo, valor, pago, caução)
 *   → menus
 *   → cacifos preenchidos com nomes das crianças
 *   → extras, monitores, etapas
 * - 6 Etapas de festa config
 * - Marketing: segmento + newsletter + campanha
 */

import { FESTA_COLOR_VALUES } from "@saas/shared-defaults";
import { PrismaClient } from "@prisma/client";

// Type assertion helper for MetodoPagamento enum values
const MP = (s: string) => s as "DINHEIRO" | "MULTIBANCO" | "MBWAY" | "TRANSFERENCIA" | "CARTAO" | "OUTRO";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { config } from "dotenv";
import { getSeedUsers } from "./seed-roles";
import { createPrismaClient } from "../src/mariadb-adapter";
import { wipeDatabase } from "../src/wipe-database";

config({ path: "../../apps/web/.env" });

// Driver adapter (mariadb) — ver packages/db/src/mariadb-adapter.ts
const prisma = createPrismaClient(process.env.DATABASE_URL!);

const seedAuth = betterAuth({
  database: prismaAdapter(prisma, { provider: "mysql" }),
  secret: process.env.BETTER_AUTH_SECRET!,
  trustedOrigins: [process.env.CORS_ORIGIN || "http://localhost:3000"],
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

// ─── Helpers ──────────────────────────────────────────────────
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function toDateStr(d: Date): string {
  // Usa componentes locais (não toISOString) para evitar desvio de fuso horário.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function dateAt(d: Date, h: number, m: number): Date {
  const r = new Date(d);
  r.setHours(h, m, 0, 0);
  return r;
}
function addMin(d: Date, min: number): Date {
  const r = new Date(d);
  r.setMinutes(r.getMinutes() + min);
  return r;
}
function toTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Portuguese children's names pool
const NOMES_FEM = ["Ana", "Rita", "Sofia", "Carolina", "Inês", "Laura", "Maria", "Clara", "Luísa", "Joana", "Catarina", "Filipa", "Diana", "Mariana", "Teresa", "Eva", "Madalena", "Leonor", "Matilde", "Beatriz"];
const NOMES_MASC = ["Miguel", "João", "Pedro", "André", "Carlos", "Luís", "Tiago", "Rui", "Paulo", "Hugo", "Simão", "Gonçalo", "Afonso", "Rodrigo", "Vasco", "Nuno", "Diogo", "Guilherme", "Martim", "Samuel"];

function pickNames(n: number, existing: string[] = []): string[] {
  const pool = [...NOMES_FEM, ...NOMES_MASC].filter(name => !existing.includes(name));
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding development data...\n");

  await wipeDatabase(prisma);
  await seedEssential();
  await seedLocais();
  await seedSalasLanche();
  await seedExtras();
  await seedMonitores();
  await seedCacifos();
  await seedConfiguracaoPreco();
  await seedExcecoesCalendario();
  await seedSlotsHorario();
  await seedClientes();
  await seedEtapasFestaConfig();
  await seedReservas();
  await seedEntradasLivres();
  await seedAlocacoesMonitores();
  await seedMarketing();

  console.log("\n✅ Dev seed complete!");
}

  // ─── Essential (Users) — single source of truth: seed-roles.ts ─
  async function seedEssential() {
    console.log("  Creating auth users...");

    const users = getSeedUsers();

  await prisma.account.deleteMany({ where: { user: { email: { in: users.map(u => u.email) } } } });
  await prisma.session.deleteMany({ where: { user: { email: { in: users.map(u => u.email) } } } });
  await prisma.user.deleteMany({ where: { email: { in: users.map(u => u.email) } } });

  for (const user of users) {
    const result = await seedAuth.api.signUpEmail({
      body: { name: user.name, email: user.email, password: user.password },
    });
    if (!result?.user) throw new Error(`Failed to create user ${user.email}`);
    await prisma.user.update({
      where: { id: result.user.id },
      data: { emailVerified: true, funcao: user.funcao, activo: true },
    });
    console.log(`  ✓ ${user.email} / ${user.password}`);
  }
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

// ─── Extras ───────────────────────────────────────────────────
async function seedExtras() {
  console.log("  Creating extras...");
  const extras = [
    { id: "extra-001", nome: "Turbo Slide", precoUnitario: 50.0, descricao: "Tobogã inflável gigante", categoria: "EXTRA" as const, subcategoria: "Diversão", requerTexto: false },
    { id: "extra-002", nome: "Laser Show", precoUnitario: 40.0, descricao: "Espaço com lasers e névoa", categoria: "EXTRA" as const, subcategoria: "Diversão", requerTexto: false },
    { id: "extra-003", nome: "Máquina de Gelo", precoUnitario: 25.0, descricao: "Máquina de gelo seco", categoria: "EXTRA" as const, subcategoria: "Diversão", requerTexto: false },
    { id: "extra-004", nome: "Pinturas Faciais", precoUnitario: 30.0, descricao: "Pinturas faciais artísticas", categoria: "EXTRA" as const, subcategoria: "Diversão", requerTexto: false },
    { id: "extra-005", nome: "Algodão Doce", precoUnitario: 3.0, descricao: "Algodão doce por unidade", categoria: "EXTRA" as const, subcategoria: "Comida", requerTexto: false },
    { id: "extra-006", nome: "Lembranças", precoUnitario: 35.0, descricao: "Saco de lembranças por criança", categoria: "EXTRA" as const, subcategoria: "Brindes", requerTexto: true },
    { id: "extra-007", nome: "Brinde Personalizado", precoUnitario: 0.0, descricao: "Brinde com texto personalizado", categoria: "EXTRA" as const, subcategoria: "Brindes", requerTexto: true },
    { id: "extra-menu-001", nome: "Menu Principal", precoUnitario: 20.0, descricao: "Menu completo com sumo, croissants, nuggets, pipocas e bolo", categoria: "MENU" as const, subcategoria: "Completo", requerTexto: false },
    { id: "extra-menu-002", nome: "Menu Carne", precoUnitario: 15.0, descricao: "Menu com nuggets, pizza, sumo e bolo", categoria: "MENU" as const, subcategoria: "Completo", requerTexto: false },
    { id: "extra-menu-003", nome: "Menu Lanche", precoUnitario: 10.0, descricao: "Menu leve com croissants, sumo e pipocas", categoria: "MENU" as const, subcategoria: "Completo", requerTexto: false },
    { id: "extra-menu-004", nome: "Menu Premium", precoUnitario: 25.0, descricao: "Menu premium com pizza, nuggets, sumo natural, pipocas, bolo decorado e surpresa", categoria: "MENU" as const, subcategoria: "Premium", requerTexto: false },
    // ─── Menus BasyLandy ────────────────────────────────────────
    { id: "extra-menu-basy-semana", nome: "Menu BasyLandy (Semana)", precoUnitario: 14.0, descricao: "Gelatina; Água e sumo; Batatas fritas; Pão de forma (queijo, fiambre, chocolate ou manteiga); Convites digitais/físicos; Prenda para o aniversariante. Preço de dia de semana (exclui feriados).", categoria: "MENU" as const, subcategoria: "BasyLandy", requerTexto: false, fimDeSemana: false },
    { id: "extra-menu-basy-fimsemana", nome: "Menu BasyLandy (Fim-de-semana)", precoUnitario: 15.9, descricao: "Gelatina; Água e sumo; Batatas fritas; Pão de forma (queijo, fiambre, chocolate ou manteiga); Convites digitais/físicos; Prenda para o aniversariante. Aplicado a sábados, domingos e feriados.", categoria: "MENU" as const, subcategoria: "BasyLandy", requerTexto: false, fimDeSemana: true },
    { id: "extra-menu-almoco-jantar", nome: "Almoço/Jantar (Suplemento)", precoUnitario: 3.5, descricao: "Pizza, fruta e nuggets. Suplemento a acrescentar ao menu base (almoço/jantar).", categoria: "MENU" as const, subcategoria: "BasyLandy", requerTexto: false },
    // ─── Extras ao lanche BasyLandy ────────────────────────────
    { id: "extra-lanche-cenoura", nome: "Cenoura Baby", precoUnitario: 1.0, descricao: "Extras ao lanche", categoria: "EXTRA" as const, subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-babybel", nome: "Queijo babybel", precoUnitario: 1.5, descricao: "Extras ao lanche", categoria: "EXTRA" as const, subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-pipocas", nome: "Pipocas", precoUnitario: 0.5, descricao: "Extras ao lanche", categoria: "EXTRA" as const, subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-pizzas", nome: "Pizzas", precoUnitario: 1.5, descricao: "Extras ao lanche", categoria: "EXTRA" as const, subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-bolachas", nome: "Bolachas", precoUnitario: 1.0, descricao: "Extras ao lanche", categoria: "EXTRA" as const, subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-nuggets", nome: "Nuggets", precoUnitario: 1.5, descricao: "Extras ao lanche", categoria: "EXTRA" as const, subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-donuts", nome: "Donuts", precoUnitario: 1.0, descricao: "Extras ao lanche", categoria: "EXTRA" as const, subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-fruta", nome: "Fruta da época", precoUnitario: 1.0, descricao: "Extras ao lanche", categoria: "EXTRA" as const, subcategoria: "Extras ao lanche", requerTexto: false },
    { id: "extra-lanche-muffins", nome: "Muffins", precoUnitario: 1.5, descricao: "Extras ao lanche", categoria: "EXTRA" as const, subcategoria: "Extras ao lanche", requerTexto: false },
    // ─── Extras à diversão BasyLandy ────────────────────────────
    { id: "extra-diversao-brinde", nome: "Brinde", precoUnitario: 1.0, descricao: "Brinde por criança. Extras à diversão.", categoria: "EXTRA" as const, subcategoria: "Extras à diversão", requerTexto: false },
    { id: "extra-diversao-boloes", nome: "Modelagem de Balões", precoUnitario: 1.0, descricao: "Modelagem de balões por criança. Extras à diversão.", categoria: "EXTRA" as const, subcategoria: "Extras à diversão", requerTexto: false },
    { id: "extra-diversao-convites", nome: "Convites Personalizados", precoUnitario: 15.0, descricao: "Pacote de 30 convites personalizados. Extras à diversão.", categoria: "EXTRA" as const, subcategoria: "Extras à diversão", requerTexto: true },
    { id: "extra-diversao-prol1h", nome: "Prolongamento +1h", precoUnitario: 5.0, descricao: "Prolongamento de 1 hora por criança. Extras à diversão.", categoria: "EXTRA" as const, subcategoria: "Extras à diversão", requerTexto: false },
    { id: "extra-diversao-prol30m", nome: "Prolongamento +30min", precoUnitario: 3.0, descricao: "Prolongamento de 30 minutos por criança. Extras à diversão.", categoria: "EXTRA" as const, subcategoria: "Extras à diversão", requerTexto: false },
    // ─── Bolos BasyLandy ────────────────────────────────────────
    { id: "extra-bolo-1kg", nome: "Bolo 1KG", precoUnitario: 17.5, descricao: "Bolo de aniversário de 1kg.", categoria: "EXTRA" as const, subcategoria: "Bolos", requerTexto: false },
    { id: "extra-bolo-2kg", nome: "Bolo 2KG (hóstia incluída)", precoUnitario: 30.0, descricao: "Bolo de aniversário de 2kg com hóstia incluída.", categoria: "EXTRA" as const, subcategoria: "Bolos", requerTexto: false },
    { id: "extra-bolo-artistico", nome: "Bolo Artístico", precoUnitario: 50.0, descricao: "Bolo artístico personalizado.", categoria: "EXTRA" as const, subcategoria: "Bolos", requerTexto: true },
  ];
  for (const extra of extras) {
    await prisma.extra.upsert({ where: { id: extra.id }, update: {}, create: extra });
  }

  // Novos extras/menus BasyLandy → associados a todos os locais
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

  const extraLocals = [
    { extraId: "extra-001", localId: "local-001" }, { extraId: "extra-002", localId: "local-001" },
    { extraId: "extra-003", localId: "local-001" }, { extraId: "extra-004", localId: "local-001" },
    { extraId: "extra-005", localId: "local-001" }, { extraId: "extra-006", localId: "local-001" },
    { extraId: "extra-007", localId: "local-001" },
    { extraId: "extra-002", localId: "local-002" }, { extraId: "extra-004", localId: "local-002" },
    { extraId: "extra-005", localId: "local-002" }, { extraId: "extra-006", localId: "local-002" },
    { extraId: "extra-007", localId: "local-002" },
    { extraId: "extra-001", localId: "local-003" }, { extraId: "extra-003", localId: "local-003" },
    { extraId: "extra-005", localId: "local-003" }, { extraId: "extra-007", localId: "local-003" },
    ...basyLandyLocais,
  ];
  for (const el of extraLocals) {
    await prisma.extraLocal.upsert({
      where: { extraId_localId: { extraId: el.extraId, localId: el.localId } },
      update: {}, create: el,
    });
  }
  console.log("  ✓ 31 extras (7 EXTRA + 4 MENU + 3 Menu BasyLandy + 9 Extras ao lanche + 5 Extras à diversão + 3 Bolos) with local associations\n");
}

// ─── Monitores ────────────────────────────────────────────────
async function seedMonitores() {
  console.log("  Creating monitores...");
  const monitores = [
    { id: "monitor-001", nome: "João Ferreira", contacto: "912345678", valorHora: 8.50 },
    { id: "monitor-002", nome: "Carolina Santos", contacto: "923456789", valorHora: 9.00 },
    { id: "monitor-003", nome: "Pedro Oliveira", contacto: "934567890", valorHora: 7.75 },
    { id: "monitor-004", nome: "Luísa Almeida", contacto: "945678901", valorHora: 8.00 },
    { id: "monitor-005", nome: "Tiago Moreira", contacto: "956789012", valorHora: null },
    { id: "monitor-006", nome: "Inês Cardoso", contacto: "967890123", valorHora: 8.50 },
  ];
  for (const mon of monitores) {
    await prisma.monitor.upsert({
      where: { id: mon.id },
      update: { valorHora: mon.valorHora },
      create: mon,
    });
  }
  console.log("  ✓ 6 monitores (com valor/hora)\n");
}

// ─── Cacifos ──────────────────────────────────────────────────
async function seedCacifos() {
  console.log("  Creating cacifos...");
  await prisma.configuracaoCacifo.upsert({
    where: { id: "config-cacifo-001" },
    update: { totalCacifos: 40 },
    create: { id: "config-cacifo-001", totalCacifos: 40 },
  });
  for (let i = 1; i <= 40; i++) {
    await prisma.cacifo.upsert({
      where: { numero: i },
      update: { estado: "LIVRE", reservaId: null, criancas: null, notas: null },
      create: { numero: i, estado: "LIVRE", configuracaoId: "config-cacifo-001" },
    });
  }
  console.log("  ✓ 40 cacifos (all LIVRE)\n");
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
  } else {
    await prisma.configuracaoPreco.update({
      where: { id: existing.id },
      data: { minimosCriancasPorAniversariante: minimos },
    });
  }

  console.log("  ✓ Pricing config (preço por criança + mínimos + meias)\n");
}

// ─── Exceções de Calendário (feriados PT + demo bloqueado) ────
async function seedExcecoesCalendario() {
  console.log("  Creating calendar exceptions...");

  const anoAtual = new Date().getFullYear();
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

  // Demo: um dia bloqueado (manutenção) daqui a 20 dias
  const dataBloqueio = daysFromNow(20);
  dataBloqueio.setHours(0, 0, 0, 0);
  await prisma.excecaoCalendario.upsert({
    where: { data: dataBloqueio },
    update: {},
    create: {
      data: dataBloqueio,
      tipo: "BLOQUEADO",
      nome: "Manutenção (demo)",
      afectaPreco: false,
      bloqueiaReserva: true,
      recorrenciaAnual: false,
    },
  });

  console.log(`  ✓ ${feriadosFixos.length} feriados × 2 anos + 1 dia bloqueado (demo)\n`);
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

// ─── Slots Horários (festa default 2h15m + defaults de cor/lanche) ──
async function seedSlotsHorario() {
  console.log("  Creating time slots...");

  // Defaults: cada slot tem cor/hora-der lanche/sala de lanche sugeridos.
  // Cores alinhadas com a paleta FESTA_COLORS (@saas/shared-defaults).
  const COR = {
    AZUL: "#0095C8",
    VERDE: "#5CBE4A",
    AMARELO: "#FCE12D",
    ROSA: "#E54796",
  } as const;

  const slots = [
    { horaInicio: "10:00", duracaoMin: 135, ordem: 1, corDefault: COR.AZUL,    horaLancheDefault: "11:00", salaLancheId: "sala-lanche-1" },
    { horaInicio: "14:00", duracaoMin: 135, ordem: 2, corDefault: COR.VERDE,   horaLancheDefault: "15:00", salaLancheId: "sala-lanche-2" },
    { horaInicio: "16:30", duracaoMin: 135, ordem: 3, corDefault: COR.AMARELO, horaLancheDefault: "17:30", salaLancheId: "sala-lanche-1" },
    { horaInicio: "18:30", duracaoMin: 135, ordem: 4, corDefault: COR.ROSA,    horaLancheDefault: "19:30", salaLancheId: "sala-lanche-2" },
  ];

  for (const s of slots) {
    const existing = await prisma.slotHorario.findFirst({
      where: { horaInicio: s.horaInicio },
    });
    if (existing) {
      // Actualizar defaults caso já exista
      await prisma.slotHorario.update({
        where: { id: existing.id },
        data: {
          duracaoMin: s.duracaoMin,
          ordem: s.ordem,
          corDefault: s.corDefault,
          horaLancheDefault: s.horaLancheDefault,
          salaLancheId: s.salaLancheId,
        },
      });
    } else {
      await prisma.slotHorario.create({ data: s });
    }
  }

  console.log(`  ✓ ${slots.length} slots horários (2h15m + defaults cor/lanche)\n`);
}

// ─── Clientes & Aniversariantes ───────────────────────────────
async function seedClientes() {
  console.log("  Creating clientes...");
  const clientes = [
    { id: "cliente-001", nome: "Ricardo Mendes", email: "ricardo@email.pt", telefone: "911111111" },
    { id: "cliente-002", nome: "Sofia Lopes", email: "sofia@email.pt", telefone: "922222222" },
    { id: "cliente-003", nome: "Hugo Martins", email: "hugo@email.pt", telefone: "933333333" },
    { id: "cliente-004", nome: "Patrícia Rocha", email: "patricia@email.pt", telefone: "944444444" },
    { id: "cliente-005", nome: "André Costa", email: "andre@email.pt", telefone: "955555555" },
    { id: "cliente-006", nome: "Fernanda Nunes", email: "fernanda@email.pt", telefone: "966666666" },
    { id: "cliente-007", nome: "Miguel Ferreira", email: "miguel@email.pt", telefone: "977777777" },
    { id: "cliente-008", nome: "Cláudia Ribeiro", email: "claudia@email.pt", telefone: "988888888" },
  ];
  for (const cli of clientes) {
    await prisma.cliente.upsert({ where: { id: cli.id }, update: {}, create: cli });
  }
  const aniversariantes = [
    { id: "aniv-001", nome: "Marta Mendes", dataNascimento: new Date("2018-05-15"), clienteId: "cliente-001" },
    { id: "aniv-002", nome: "Tomás Mendes", dataNascimento: new Date("2020-09-22"), clienteId: "cliente-001" },
    { id: "aniv-003", nome: "Beatriz Lopes", dataNascimento: new Date("2019-08-10"), clienteId: "cliente-002" },
    { id: "aniv-004", nome: "Francisco Martins", dataNascimento: new Date("2017-12-03"), clienteId: "cliente-003" },
    { id: "aniv-005", nome: "Matilde Rocha", dataNascimento: new Date("2021-01-20"), clienteId: "cliente-004" },
    { id: "aniv-006", nome: "Duarte Costa", dataNascimento: new Date("2018-06-30"), clienteId: "cliente-005" },
    { id: "aniv-007", nome: "Leonor Nunes", dataNascimento: new Date("2019-03-12"), clienteId: "cliente-006" },
    { id: "aniv-008", nome: "Rodrigo Ferreira", dataNascimento: new Date("2017-11-05"), clienteId: "cliente-007" },
    { id: "aniv-009", nome: "Mariana Ribeiro", dataNascimento: new Date("2020-07-25"), clienteId: "cliente-008" },
    { id: "aniv-010", nome: "Afonso Ribeiro", dataNascimento: new Date("2022-02-14"), clienteId: "cliente-008" },
  ];
  for (const aniv of aniversariantes) {
    await prisma.aniversariante.upsert({ where: { id: aniv.id }, update: {}, create: aniv });
  }
  console.log("  ✓ 8 clientes, 10 aniversariantes\n");
}

// ─── Etapas de Festa Config ───────────────────────────────────
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
    await prisma.etapaFesta.upsert({ where: { id: etapa.id }, update: {}, create: etapa });
  }
  console.log("  ✓ 6 etapas de festa\n");
}

// ─── Reservas (COMPREHENSIVE) ─────────────────────────────────
async function seedReservas() {
  console.log("  Creating reservas (comprehensive)...");

  // Clean old seed data (reverse dependency order)
  const oldReservaIds = [
    "reserva-past-001", "reserva-past-002", "reserva-past-003",
    "reserva-today-conc-001", "reserva-today-conc-002",
    "reserva-001", "reserva-002", "reserva-003",
    "reserva-future-001", "reserva-future-002", "reserva-future-003",
    // Old em-curso extras (removidos — hoje tem apenas 3 festas)
    "reserva-em-curso-a", "reserva-em-curso-b", "reserva-em-curso-c", "reserva-em-curso-d",
    // Old confirmadas hoje (removidos)
    "reserva-conf-hoje-1", "reserva-conf-hoje-2", "reserva-conf-hoje-3",
    // Old semana/pasada
    "reserva-semana-1", "reserva-semana-2", "reserva-semana-3", "reserva-semana-4", "reserva-semana-5",
    "reserva-pasada-1", "reserva-pasada-2", "reserva-pasada-3", "reserva-pasada-4", "reserva-pasada-5",
    // New IDs
    "reserva-ontem-1", "reserva-ontem-2", "reserva-ontem-3", "reserva-ontem-4", "reserva-ontem-5", "reserva-ontem-6",
    "reserva-today-3", "reserva-tmr-2",
  ];
  await prisma.reservaEtapa.deleteMany({ where: { reservaId: { in: oldReservaIds } } });
  await prisma.reservaMonitor.deleteMany({ where: { reservaId: { in: oldReservaIds } } });
  await prisma.reservaAniversariante.deleteMany({ where: { reservaId: { in: oldReservaIds } } });
  await prisma.reservaExtra.deleteMany({ where: { reservaId: { in: oldReservaIds } } });
  await prisma.menu.deleteMany({ where: { reservaId: { in: oldReservaIds } } });
  await prisma.cacifo.updateMany({ where: { reservaId: { in: oldReservaIds } }, data: { estado: "LIVRE", reservaId: null, criancas: null, notas: null } });
  await prisma.reserva.deleteMany({ where: { id: { in: oldReservaIds } } });

  const now = new Date();
  const todayDate = today();
  const todayStr = toDateStr(todayDate);

  // Helper to fill cacifos with children names for a reserva
  async function fillCacifos(
    reservaId: string,
    numCriancas: number,
    numPreenchidos: number,
    startCacifo: number,
    allPreenchidos: boolean = false,
    notasPorCacifo: (string | undefined)[] = []
  ) {
    const names = pickNames(numCriancas);
    const numToFill = allPreenchidos ? numCriancas : numPreenchidos;

    for (let i = 0; i < numToFill; i++) {
      const cacifoNum = startCacifo + i;
      await prisma.cacifo.update({
        where: { numero: cacifoNum },
        data: {
          estado: "OCUPADO",
          reservaId,
          criancas: names[i] ?? `Criança ${i + 1}`,
          notas: notasPorCacifo[i] ?? null,
        },
      });
    }
  }

  // Helper to create etapas for a reserva
  async function createEtapas(reservaId: string, concluidas: number, total: number, baseTime: Date) {
    const etapaIds = ["etapa-001", "etapa-002", "etapa-003", "etapa-004", "etapa-005", "etapa-006"];
    for (let i = 0; i < total; i++) {
      const concluida = i < concluidas;
      await prisma.reservaEtapa.upsert({
        where: { id: `re-${reservaId}-${i + 1}` },
        update: { concluida, concluidaEm: concluida ? addMin(baseTime, i * 20) : null },
        create: {
          id: `re-${reservaId}-${i + 1}`,
          reservaId,
          etapaId: etapaIds[i]!,
          concluida,
          concluidaEm: concluida ? addMin(baseTime, i * 20) : null,
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // YESTERDAY (-1 dia) — 6 CONCLUIDA (5 em slots + 1 horário custom)
  // Slots: 10:00 / 14:00 / 16:30 / 18:30 — todos 135 min
  // ═══════════════════════════════════════════════════════════
  const ontemStr = toDateStr(daysAgo(1));
  const ontemConfigs = [
    { id: "reserva-ontem-1", hora: "10:00", min: 0, dur: 135, n: 15, p: 18, tema: "Dinossauros", cor: "#00A68A", local: "local-001", cli: "cliente-001", aniv: "aniv-002", mons: ["monitor-001", "monitor-002"], boloTipo: "BOLO_ARTISTICO" as const, bolo: "Bolo de chocolate com decoração de dinossauros", obs: "Tomás adora T-Rex. Decoração verde e castanho.", brindes: "Sacos com mini-dinossauros para todos.", menuNome: "Menu Dinossauro", menuPreco: 9.50 },
    { id: "reserva-ontem-2", hora: "14:00", min: 0, dur: 135, n: 12, p: 14, tema: "Princesa", cor: "#E54796", local: "local-002", cli: "cliente-004", aniv: "aniv-005", mons: ["monitor-003"], boloTipo: "NOSSO_1KG" as const, bolo: "Bolo de morango com coroa de princesa", obs: "Matilde quer tudo cor-de-rosa.", brindes: "Coroas de princesa para as meninas.", menuNome: "Menu Princesa", menuPreco: 10.00 },
    { id: "reserva-ontem-3", hora: "16:30", min: 30, dur: 135, n: 18, p: 20, tema: "Piratas", cor: "#8A8E91", local: "local-001", cli: "cliente-005", aniv: "aniv-006", mons: ["monitor-001", "monitor-004"], boloTipo: "BOLO_ARTISTICO" as const, bolo: "Bolo de baunilha com navio pirata", obs: "Duarte adora piratas! Decoração com mapas do tesouro.", brindes: "Tapas de olho de pirata e bússolas.", menuNome: "Menu Pirata", menuPreco: 8.00 },
    { id: "reserva-ontem-4", hora: "18:30", min: 30, dur: 135, n: 10, p: 12, tema: "Fada", cor: "#993B98", local: "local-003", cli: "cliente-006", aniv: "aniv-007", mons: ["monitor-005", "monitor-006"], boloTipo: "BOLO_ARTISTICO" as const, bolo: "Bolo de cenoura com decoração de fadas", obs: "Leonor quer tudo lilás e brilhante.", brindes: "Varinhas de condão para todos.", menuNome: "Menu Fada", menuPreco: 11.00 },
    { id: "reserva-ontem-5", hora: "14:00", min: 0, dur: 135, n: 20, p: 22, tema: "Robôs", cor: "#0095C8", local: "local-001", cli: "cliente-007", aniv: "aniv-008", mons: ["monitor-001", "monitor-003"], boloTipo: "NOSSO_2KG" as const, bolo: "Bolo de chocolate com decoração robô", obs: "Rodrigo gosta de tecnologia e robôs.", brindes: "Mini-robôs de brincar.", menuNome: "Menu Robô", menuPreco: 9.00 },
    // ─── Horário CUSTOM (não corresponde a nenhum slot → festasSemSlot) ──
    { id: "reserva-ontem-6", hora: "12:30", min: 30, dur: 90, n: 8, p: 10, tema: "Safari", cor: "#F59253", local: "local-002", cli: "cliente-008", aniv: "aniv-010", mons: ["monitor-006"], boloTipo: "BOLO_ARTISTICO" as const, bolo: "Bolo com animais da selva", obs: "Afonso quer tema safari com animais de pelúcia.", brindes: "Binóculos de brincar.", menuNome: "Menu Safari", menuPreco: 7.50 },
  ];

  for (const c of ontemConfigs) {
    const start = dateAt(daysAgo(1), Number(c.hora.split(":")[0]), c.min);
    const fim = addMin(start, c.dur);
    const fimReal = addMin(fim, Math.floor(Math.random() * 20));
    await prisma.reserva.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        data: new Date(ontemStr),
        horario: c.hora, duracaoMinutos: c.dur, numCriancas: c.n, previsaoCriancas: c.p,
        estado: "CONCLUIDA",
        inicioEm: start, fimPrevisto: fim, fimReal,
        tema: c.tema, cor: c.cor, bolo: c.boloTipo, boloTema: c.bolo,
        observacoesGerais: c.obs,
        observacoesBrindes: c.brindes,
        metodoPagamento: "MULTIBANCO", valorPago: c.dur * 1.4, pago: true,
        caucao: "PAGA",
        clienteId: c.cli, localId: c.local,
      },
    });
    await prisma.reservaAniversariante.upsert({ where: { id: `ra-${c.id}` }, update: {}, create: { id: `ra-${c.id}`, reservaId: c.id, aniversarianteId: c.aniv } });
    for (const [i, mId] of c.mons.entries()) {
      await prisma.reservaMonitor.upsert({ where: { id: `rm-${c.id}-${i}` }, update: {}, create: { id: `rm-${c.id}-${i}`, reservaId: c.id, monitorId: mId } });
    }
    await prisma.menu.upsert({ where: { id: `menu-${c.id}` }, update: {}, create: { id: `menu-${c.id}`, nome: c.menuNome, preco: c.menuPreco, notas: "Sumo, croissants, nuggets, bolo", reservaId: c.id } });
    await prisma.reservaExtra.upsert({ where: { id: `rext-${c.id}-0` }, update: {}, create: { id: `rext-${c.id}-0`, reservaId: c.id, extraId: "extra-005", quantidade: c.n, concluido: true } });
    await createEtapas(c.id, 6, 6, start);
  }

  // ═══════════════════════════════════════════════════════════
  // CONCLUIDA esta semana (-2 a -5 dias) — 5 reservas (todas em slots)
  // ═══════════════════════════════════════════════════════════
  const concluidasSemanaConfigs = [
    { dias: 2, hora: "10:00", min: 0, dur: 135, n: 14, p: 16, tema: "Safari", cor: "#00A68A", local: "local-001", cli: "cliente-002", aniv: "aniv-003", mons: ["monitor-001"], bolo: "Bolo selva", obs: "Animais de pelúcia.", menuNome: "Menu Safari", menuPreco: 8.50 },
    { dias: 3, hora: "16:30", min: 30, dur: 135, n: 10, p: 12, tema: "Circo", cor: "#F59253", local: "local-002", cli: "cliente-006", aniv: "aniv-007", mons: ["monitor-005", "monitor-006"], bolo: "Bolo circo", obs: "Palhaçada.", menuNome: "Menu Circo", menuPreco: 9.00 },
    { dias: 4, hora: "14:00", min: 0, dur: 135, n: 20, p: 22, tema: "Harry Potter", cor: "#8A8E91", local: "local-001", cli: "cliente-004", aniv: "aniv-005", mons: ["monitor-002", "monitor-003"], bolo: "Bolo Hogwarts", obs: "Magia.", menuNome: "Menu Potter", menuPreco: 11.00 },
    { dias: 5, hora: "18:30", min: 30, dur: 135, n: 12, p: 14, tema: "Cars", cor: "#F59253", local: "local-003", cli: "cliente-007", aniv: "aniv-008", mons: ["monitor-004"], bolo: "Bolo Cars", obs: "Corridas.", menuNome: "Menu Cars", menuPreco: 7.50 },
    { dias: 5, hora: "10:00", min: 0, dur: 135, n: 8, p: 10, tema: "Peppa Pig", cor: "#E54796", local: "local-002", cli: "cliente-001", aniv: "aniv-002", mons: ["monitor-006"], bolo: "Bolo Peppa", obs: "Crianças pequenas.", menuNome: "Menu Peppa", menuPreco: 6.00 },
  ];

  for (const [idx, c] of concluidasSemanaConfigs.entries()) {
    const start = dateAt(daysAgo(c.dias), Number(c.hora.split(":")[0]), c.min);
    const fim = addMin(start, c.dur);
    const fimReal = addMin(fim, Math.floor(Math.random() * 20));
    const id = `reserva-semana-${idx + 1}`;
    await prisma.reserva.upsert({
      where: { id },
      update: {},
      create: {
        id,
        data: new Date(toDateStr(daysAgo(c.dias))),
        horario: c.hora,
        duracaoMinutos: c.dur, numCriancas: c.n, previsaoCriancas: c.p,
        estado: "CONCLUIDA",
        inicioEm: start, fimPrevisto: fim, fimReal,
        tema: c.tema, cor: c.cor, bolo: "BOLO_ARTISTICO", boloTema: c.bolo,
        observacoesGerais: c.obs,
        metodoPagamento: "MULTIBANCO", valorPago: c.dur * 1.4, pago: true,
        caucao: "PAGA",
        clienteId: c.cli, localId: c.local,
      },
    });
    await prisma.reservaAniversariante.upsert({ where: { id: `ra-${id}` }, update: {}, create: { id: `ra-${id}`, reservaId: id, aniversarianteId: c.aniv } });
    for (const [i, mId] of c.mons.entries()) {
      await prisma.reservaMonitor.upsert({ where: { id: `rm-${id}-${i}` }, update: {}, create: { id: `rm-${id}-${i}`, reservaId: id, monitorId: mId } });
    }
    await prisma.menu.upsert({ where: { id: `menu-${id}` }, update: {}, create: { id: `menu-${id}`, nome: c.menuNome, preco: c.menuPreco, notas: "Sumo, pipocas, bolo", reservaId: id } });
    await prisma.reservaExtra.upsert({ where: { id: `rext-${id}-0` }, update: {}, create: { id: `rext-${id}-0`, reservaId: id, extraId: "extra-005", quantidade: c.n, concluido: true } });
    await createEtapas(id, 6, 6, start);
  }

  // ═══════════════════════════════════════════════════════════
  // CONCLUIDA semana passada (-7 a -11 dias) — 5 reservas (todas em slots)
  // ═══════════════════════════════════════════════════════════
  const concluidasPasConfigs = [
    { dias: 8, hora: "10:00", min: 0, dur: 135, n: 16, p: 18, tema: "Piratas", cor: "#8A8E91", local: "local-001", cli: "cliente-005", aniv: "aniv-006", mons: ["monitor-001"], bolo: "Bolo pirata", obs: "Caça ao tesouro.", menuNome: "Menu Pirata", menuPreco: 9.00 },
    { dias: 9, hora: "14:00", min: 0, dur: 135, n: 12, p: 14, tema: "Princesa", cor: "#E54796", local: "local-002", cli: "cliente-004", aniv: "aniv-005", mons: ["monitor-002", "monitor-006"], bolo: "Bolo princesa", obs: "Cor-de-rosa.", menuNome: "Menu Princesa", menuPreco: 10.00 },
    { dias: 10, hora: "16:30", min: 30, dur: 135, n: 22, p: 25, tema: "Marvel", cor: "#F59253", local: "local-001", cli: "cliente-007", aniv: "aniv-008", mons: ["monitor-003", "monitor-004"], bolo: "Bolo Vingadores", obs: "Super-heróis.", menuNome: "Menu Marvel", menuPreco: 11.00 },
    { dias: 11, hora: "18:30", min: 30, dur: 135, n: 10, p: 12, tema: "Sereia", cor: "#00A68A", local: "local-003", cli: "cliente-008", aniv: "aniv-009", mons: ["monitor-005"], bolo: "Bolo sereia", obs: "Decoração oceânica.", menuNome: "Menu Sereia", menuPreco: 8.00 },
    { dias: 7, hora: "14:00", min: 0, dur: 135, n: 6, p: 8, tema: "Teletubbies", cor: "#993B98", local: "local-002", cli: "cliente-001", aniv: "aniv-001", mons: ["monitor-006"], bolo: "Bolo teletubbies", obs: "Bebés.", menuNome: "Menu Bebé", menuPreco: 5.00 },
  ];

  for (const [idx, c] of concluidasPasConfigs.entries()) {
    const start = dateAt(daysAgo(c.dias), Number(c.hora.split(":")[0]), c.min);
    const fim = addMin(start, c.dur);
    const fimReal = addMin(fim, Math.floor(Math.random() * 15));
    const id = `reserva-pasada-${idx + 1}`;
    await prisma.reserva.upsert({
      where: { id },
      update: {},
      create: {
        id,
        data: new Date(toDateStr(daysAgo(c.dias))),
        horario: c.hora,
        duracaoMinutos: c.dur, numCriancas: c.n, previsaoCriancas: c.p,
        estado: "CONCLUIDA",
        inicioEm: start, fimPrevisto: fim, fimReal,
        tema: c.tema, cor: c.cor, bolo: "BOLO_ARTISTICO", boloTema: c.bolo,
        observacoesGerais: c.obs,
        metodoPagamento: "DINHEIRO", valorPago: c.dur * 1.2, pago: true,
        caucao: "PAGA_NO_DIA",
        clienteId: c.cli, localId: c.local,
      },
    });
    await prisma.reservaAniversariante.upsert({ where: { id: `ra-${id}` }, update: {}, create: { id: `ra-${id}`, reservaId: id, aniversarianteId: c.aniv } });
    for (const [i, mId] of c.mons.entries()) {
      await prisma.reservaMonitor.upsert({ where: { id: `rm-${id}-${i}` }, update: {}, create: { id: `rm-${id}-${i}`, reservaId: id, monitorId: mId } });
    }
    await prisma.menu.upsert({ where: { id: `menu-${id}` }, update: {}, create: { id: `menu-${id}`, nome: c.menuNome, preco: c.menuPreco, notas: "Sumo, bolo", reservaId: id } });
    await createEtapas(id, 6, 6, start);
  }

  // ═══════════════════════════════════════════════════════════
  // TODAY — 3 festas (todas em slots: 10:00 / 14:00 / 16:30)
  // ═══════════════════════════════════════════════════════════

  // ── 1) CONCLUIDA manhã — slot 10:00, 135 min (Leonor, Fada, Sala Arco-Íris)
  const tConcStart = dateAt(todayDate, 10, 0);
  await prisma.reserva.upsert({
    where: { id: "reserva-today-3" },
    update: {},
    create: {
      id: "reserva-today-3",
      data: new Date(todayStr),
      horario: "10:00", duracaoMinutos: 135, numCriancas: 12, previsaoCriancas: 14,
      estado: "CONCLUIDA",
      inicioEm: tConcStart, fimPrevisto: addMin(tConcStart, 135), fimReal: addMin(tConcStart, 130),
      tema: "Fada", cor: "#993B98",
      bolo: "NOSSO_1KG", boloTema: "Bolo de cenoura com decoração de fadas",
      observacoesGerais: "Leonor quer tudo lilás e brilhante.",
      observacoesBrindes: "Varinhas de condão para todos.",
      metodoPagamento: "CARTAO", valorPago: 145.00, pago: true,
      caucao: "PAGA",
      cacifosHistorico: [
        { numero: 21, estado: "OCUPADO", criancas: "Leonor, Diana" },
        { numero: 22, estado: "OCUPADO", criancas: "Catarina, Filipa, Eva" },
        { numero: 23, estado: "OCUPADO", criancas: "Mariana, Teresa" },
        { numero: 24, estado: "OCUPADO", criancas: "Inês, Madalena, Joana" },
      ],
      clienteId: "cliente-006", localId: "local-002",
    },
  });
  await prisma.reservaAniversariante.upsert({ where: { id: "ra-today-3" }, update: {}, create: { id: "ra-today-3", reservaId: "reserva-today-3", aniversarianteId: "aniv-007" } });
  await prisma.reservaMonitor.upsert({ where: { id: "rm-today-3a" }, update: {}, create: { id: "rm-today-3a", reservaId: "reserva-today-3", monitorId: "monitor-005" } });
  await prisma.reservaMonitor.upsert({ where: { id: "rm-today-3b" }, update: {}, create: { id: "rm-today-3b", reservaId: "reserva-today-3", monitorId: "monitor-006" } });
  await prisma.menu.upsert({ where: { id: "menu-today-3" }, update: {}, create: { id: "menu-today-3", nome: "Menu Fada", preco: 11.00, notas: "Croissants, sumo, iogurte, bolo", reservaId: "reserva-today-3" } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-today-3" }, update: {}, create: { id: "rext-today-3", reservaId: "reserva-today-3", extraId: "extra-004", quantidade: 1, concluido: true } });
  await createEtapas("reserva-today-3", 6, 6, tConcStart);

  // ── 2) EM_CURSO — slot 14:00, 135 min (Marta, Princesa, Sala Azul)
  // Começou há 60 min, dura 135 min → 75 min restantes
  const tEmCurso = addMin(now, -60);
  const fimPrevEmCurso = addMin(tEmCurso, 135);
  await prisma.reserva.upsert({
    where: { id: "reserva-001" },
    update: {
      estado: "EM_CURSO", inicioEm: tEmCurso, fimPrevisto: fimPrevEmCurso, fimReal: null,
      horario: "14:00", duracaoMinutos: 135,
      notasCacifos: "Cacifos 1, 3, 9 e 11 com alertas de saúde — confirmar com os pais no pagamento e na saída.",
      observacoesLesoes: "Marta tem gesso no braço direito — evitar escalada e trampolins.",
    },
    create: {
      id: "reserva-001",
      data: new Date(todayStr),
      horario: "14:00", duracaoMinutos: 135, numCriancas: 18, previsaoCriancas: 20,
      estado: "EM_CURSO",
      inicioEm: tEmCurso, fimPrevisto: fimPrevEmCurso,
      tema: "Princesa", cor: "#E54796",
      bolo: "NOSSO_2KG", boloTema: "Bolo de chocolate com coroa dourada",
      observacoesGerais: "Marta faz 8 anos. Gosta de cor-de-rosa. Sem restrições alimentares.",
      observacoesBrindes: "Sacos com pulseiras e adesivos.",
      observacoesLesoes: "Marta tem gesso no braço direito — evitar escalada e trampolins.",
      outrosExtras: "Palhaçada ao início (15 min)",
      metodoPagamento: "MBWAY", valorPago: 175.00, pago: true,
      caucao: "PAGA",
      notas: "Marta faz 8 anos. Decoração cor-de-rosa.",
      notasCacifos: "Cacifos 1, 3, 9 e 11 com alertas de saúde — confirmar com os pais no pagamento e na saída.",
      clienteId: "cliente-001", localId: "local-001",
    },
  });
  await prisma.reservaAniversariante.upsert({ where: { id: "ra-001" }, update: {}, create: { id: "ra-001", reservaId: "reserva-001", aniversarianteId: "aniv-001" } });
  await prisma.reservaMonitor.upsert({ where: { id: "rm-001a" }, update: {}, create: { id: "rm-001a", reservaId: "reserva-001", monitorId: "monitor-001" } });
  await prisma.reservaMonitor.upsert({ where: { id: "rm-001b" }, update: {}, create: { id: "rm-001b", reservaId: "reserva-001", monitorId: "monitor-003" } });
  await prisma.menu.upsert({ where: { id: "menu-001" }, update: {}, create: { id: "menu-001", nome: "Menu Completo", preco: 8.50, notas: "Sumo, croissants, nuggets, bolo, pipocas", reservaId: "reserva-001" } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-001-1" }, update: {}, create: { id: "rext-001-1", reservaId: "reserva-001", extraId: "extra-004", quantidade: 1, concluido: true } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-001-2" }, update: {}, create: { id: "rext-001-2", reservaId: "reserva-001", extraId: "extra-005", quantidade: 18, concluido: false } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-001-3" }, update: {}, create: { id: "rext-001-3", reservaId: "reserva-001", extraId: "extra-006", quantidade: 18, concluido: false } });
  // Cacifos: 15 preenchidos de 18, cacifos 1-15 (vários com notas para testar avisos)
  await fillCacifos("reserva-001", 18, 15, 1, false, [
    "Alergia a frutos secos — evitar bolo e bombons com amendoim",
    undefined,
    "Asma — bomba na mochila azul; avisar os pais na saída",
    undefined,
    undefined,
    "Sem meias — comprou no parque (talão colado à porta do cacifo)",
    undefined,
    undefined,
    "Alergia a lactose — bolo sem leite e sumo sem iogurte",
    undefined,
    "Sai apenas com a avó — não entregar a terceiros",
    undefined,
    undefined,
    undefined,
    "Meias tamanho 28 esquecidas no cacifo — devolver na saída",
  ]);
  // Etapas: 2/6 concluídas
  await createEtapas("reserva-001", 2, 6, tEmCurso);

  // ── 3) CONFIRMADO — slot 16:30, 135 min (Beatriz, Unicórnios, Sala Arco-Íris)
  await prisma.reserva.upsert({
    where: { id: "reserva-002" },
    update: {},
    create: {
      id: "reserva-002",
      data: new Date(todayStr),
      horario: "16:30", duracaoMinutos: 135, numCriancas: 22, previsaoCriancas: 25,
      estado: "CONFIRMADO",
      tema: "Unicórnios", cor: "#E54796",
      bolo: "BOLO_ARTISTICO", boloTema: "Bolo arco-íris com unicórnio no topo",
      observacoesGerais: "Beatriz quer decoração de unicórnios. Muito glitter!",
      observacoesLesoes: "Laura é alérgica a amendoim.",
      observacoesBrindes: "Mini-unicórnios de pelúcia para todos.",
      notasCacifos: "Cacifos 16 e 23 com alertas — verificar meias em falta no pagamento.",
      metodoPagamento: "DINHEIRO", valorPago: 100.00, pago: false,
      caucao: "PAGA_NO_DIA",
      notas: "Beatriz quer decoração de unicórnios.",
      clienteId: "cliente-002", localId: "local-002",
    },
  });
  await prisma.reservaAniversariante.upsert({ where: { id: "ra-002" }, update: {}, create: { id: "ra-002", reservaId: "reserva-002", aniversarianteId: "aniv-003" } });
  await prisma.menu.upsert({ where: { id: "menu-002" }, update: {}, create: { id: "menu-002", nome: "Menu Unicórnio", preco: 10.00, notas: "Pipocas, sumo, sandes, bolo arco-íris", reservaId: "reserva-002" } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-002-1" }, update: {}, create: { id: "rext-002-1", reservaId: "reserva-002", extraId: "extra-002", quantidade: 1 } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-002-2" }, update: {}, create: { id: "rext-002-2", reservaId: "reserva-002", extraId: "extra-004", quantidade: 1 } });
  await fillCacifos("reserva-002", 22, 8, 16, false, [
    "Alergia a amendoim (Laura) — separar do bolo com creme de chocolate",
    undefined,
    "Irmã mais velha vem buscar às 18:00 — contacto da mãe no balcão",
    undefined,
    "Sem meias — pagar 2,50€ no balcão",
    undefined,
    undefined,
    "Mochila com bomba de asma — entregar directamente à mãe",
  ]);

  // ── TOMORROW 1) RESERVA — slot 14:00, 135 min (Francisco, Futebol, Sala Arco-Íris)
  const tomorrowStr = toDateStr(daysFromNow(1));
  await prisma.reserva.upsert({
    where: { id: "reserva-003" },
    update: {},
    create: {
      id: "reserva-003",
      data: new Date(tomorrowStr),
      horario: "14:00", duracaoMinutos: 135, numCriancas: 12, previsaoCriancas: 15,
      estado: "RESERVA",
      tema: "Futebol", cor: "#5CBE4A",
      bolo: "A_DECIDIR", boloTema: "Bolo em formato de bola de futebol",
      observacoesGerais: "Francisco é alérgico a frutos secos.",
      observacoesBrindes: "Chinelos de futebol para os meninos.",
      metodoPagamento: "MULTIBANCO", valorPago: 0, pago: false,
      caucao: "NAO_PAGA",
      notas: "Francisco é alérgico a frutos secos.",
      clienteId: "cliente-003", localId: "local-002",
    },
  });
  await prisma.reservaAniversariante.upsert({ where: { id: "ra-003" }, update: {}, create: { id: "ra-003", reservaId: "reserva-003", aniversarianteId: "aniv-004" } });
  await prisma.menu.upsert({ where: { id: "menu-003" }, update: {}, create: { id: "menu-003", nome: "Menu Básico", preco: 5.00, notas: "Sumo, pipocas, bolo", reservaId: "reserva-003" } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-003-1" }, update: {}, create: { id: "rext-003-1", reservaId: "reserva-003", extraId: "extra-001", quantidade: 1 } });

  // ═══════════════════════════════════════════════════════════
  // +3 days — CONFIRMADO (Beatriz Lopes, Super-Heróis, Sala Azul)
  // ═══════════════════════════════════════════════════════════
  const future3Str = toDateStr(daysFromNow(3));
  await prisma.reserva.upsert({
    where: { id: "reserva-future-001" },
    update: {},
    // ── EXEMPLO DE CAUÇÃO PAGA: Total 200€ − Caução 40€ = Faltam 160€ ──
    create: {
      id: "reserva-future-001",
      data: new Date(future3Str),
      horario: "10:00", duracaoMinutos: 135, numCriancas: 16, previsaoCriancas: 18,
      estado: "CONFIRMADO",
      tema: "Super-Heróis", cor: "#993B98",
      bolo: "BOLO_ARTISTICO", boloTema: "Bolo com logo dos Vingadores",
      observacoesGerais: "Decoração temática super-heróis.",
      observacoesBrindes: "Capas de super-herói para as crianças.",
      metodoPagamento: "MBWAY", valorPago: 200.00, pago: true,
      caucao: "PAGA",
      clienteId: "cliente-002", localId: "local-001",
    },
  });
  await prisma.reservaAniversariante.upsert({ where: { id: "ra-f1" }, update: {}, create: { id: "ra-f1", reservaId: "reserva-future-001", aniversarianteId: "aniv-003" } });
  await prisma.menu.upsert({ where: { id: "menu-f1" }, update: {}, create: { id: "menu-f1", nome: "Menu Super", preco: 12.00, notas: "Pizza, nuggets, sumo, pipocas, bolo", reservaId: "reserva-future-001" } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-f1-1" }, update: {}, create: { id: "rext-f1-1", reservaId: "reserva-future-001", extraId: "extra-001", quantidade: 1 } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-f1-2" }, update: {}, create: { id: "rext-f1-2", reservaId: "reserva-future-001", extraId: "extra-006", quantidade: 16 } });

  // ═══════════════════════════════════════════════════════════
  // +5 days — RESERVA (Matilde, Safari, Sala Arco-Íris)
  // EXEMPLO DE HORÁRIO CUSTOM (não corresponde a nenhum slot → festasSemSlot)
  // ═══════════════════════════════════════════════════════════
  const future5Str = toDateStr(daysFromNow(5));
  await prisma.reserva.upsert({
    where: { id: "reserva-future-002" },
    update: {},
    create: {
      id: "reserva-future-002",
      data: new Date(future5Str),
      horario: "12:30", duracaoMinutos: 90, numCriancas: 10, previsaoCriancas: 12,
      estado: "RESERVA",
      tema: "Safari", cor: "#F59253",
      bolo: "A_DECIDIR", boloTema: "Bolo com animais da selva",
      observacoesGerais: "Matilde quer tema safari com animais de pelúcia.",
      observacoesBrindes: "Binóculos de brincar.",
      metodoPagamento: "DINHEIRO", valorPago: 50.00, pago: false,
      caucao: "NAO_PAGA",
      clienteId: "cliente-004", localId: "local-002",
    },
  });
  await prisma.reservaAniversariante.upsert({ where: { id: "ra-f2" }, update: {}, create: { id: "ra-f2", reservaId: "reserva-future-002", aniversarianteId: "aniv-005" } });
  await prisma.menu.upsert({ where: { id: "menu-f2" }, update: {}, create: { id: "menu-f2", nome: "Menu Safari", preco: 7.50, notas: "Croissants, sumo, bolo safari", reservaId: "reserva-future-002" } });

  // ═══════════════════════════════════════════════════════════
  // +7 days — RESERVA (Mariana, Mermaid, Parque Trampolins)
  // ═══════════════════════════════════════════════════════════
  const future7Str = toDateStr(daysFromNow(7));
  await prisma.reserva.upsert({
    where: { id: "reserva-future-003" },
    update: {},
    create: {
      id: "reserva-future-003",
      data: new Date(future7Str),
      horario: "18:30", duracaoMinutos: 135, numCriancas: 10, previsaoCriancas: 12,
      estado: "RESERVA",
      tema: "Sereia", cor: "#00A68A",
      bolo: "A_DECIDIR", boloTema: "Bolo oceano com sereia",
      observacoesGerais: "Mariana adora o mar e sereias.",
      metodoPagamento: "CARTAO", valorPago: 0, pago: false,
      caucao: "NAO_PAGA",
      clienteId: "cliente-008", localId: "local-003",
    },
  });
  await prisma.reservaAniversariante.upsert({ where: { id: "ra-f3" }, update: {}, create: { id: "ra-f3", reservaId: "reserva-future-003", aniversarianteId: "aniv-009" } });
  await prisma.menu.upsert({ where: { id: "menu-f3" }, update: {}, create: { id: "menu-f3", nome: "Menu Pequeno", preco: 6.00, notas: "Sumo e bolo", reservaId: "reserva-future-003" } });

  // ═══════════════════════════════════════════════════════════
  // TOMORROW (+1) — 2 festas (ambas em slots)
  // ═══════════════════════════════════════════════════════════
  // 2ª festa de amanhã: CONFIRMADO (Mariana, Sereia, Parque Trampolins, slot 10:00)
  await prisma.reserva.upsert({
    where: { id: "reserva-tmr-2" },
    update: {},
    create: {
      id: "reserva-tmr-2",
      data: new Date(tomorrowStr),
      horario: "10:00", duracaoMinutos: 135, numCriancas: 10, previsaoCriancas: 12,
      estado: "CONFIRMADO",
      tema: "Sereia", cor: "#00A68A",
      bolo: "NOSSO_1KG", boloTema: "Bolo oceano com sereia",
      observacoesGerais: "Mariana adora o mar e sereias.",
      observacoesBrindes: "Conchas e estrelas-do-mar de brincar.",
      metodoPagamento: "CARTAO", valorPago: 120.00, pago: true,
      caucao: "PAGA",
      clienteId: "cliente-008", localId: "local-003",
    },
  });
  await prisma.reservaAniversariante.upsert({ where: { id: "ra-tmr-2" }, update: {}, create: { id: "ra-tmr-2", reservaId: "reserva-tmr-2", aniversarianteId: "aniv-009" } });
  await prisma.menu.upsert({ where: { id: "menu-tmr-2" }, update: {}, create: { id: "menu-tmr-2", nome: "Menu Sereia", preco: 8.00, notas: "Sumo, sandes, bolo oceano", reservaId: "reserva-tmr-2" } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-tmr-2" }, update: {}, create: { id: "rext-tmr-2", reservaId: "reserva-tmr-2", extraId: "extra-004", quantidade: 1 } });

  // ─── Preencher horaLanche (45 min após início) + valorCaucao + observacoesBrindesPais ───
  const todasReservas = await prisma.reserva.findMany({
    select: { id: true, horario: true, observacoesBrindes: true, caucao: true },
  });
  for (const r of todasReservas) {
    let horaLanche: string | null = null;
    if (r.horario) {
      const [hStr, mStr] = r.horario.split(":").map(Number);
      const h = hStr ?? 0;
      const m = mStr ?? 0;
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        const total = h * 60 + m + 45;
        const hh = String(Math.floor((total % 1440) / 60)).padStart(2, "0");
        const mm = String(total % 60).padStart(2, "0");
        horaLanche = `${hh}:${mm}`;
      }
    }
    await prisma.reserva.update({
      where: { id: r.id },
      data: {
        horaLanche,
        valorCaucao: r.caucao === "NAO_PAGA" ? 0 : 40,
        observacoesBrindesPais: r.observacoesBrindes
          ? "Sacos-lembrança para os pais com foto da festa."
          : "Oferecer café e fatia de bolo aos pais durante a festa.",
      },
    });
  }

  const reservasParaSplit = await prisma.reserva.findMany({
    where: { pago: true, metodoPagamento: { not: null } },
    take: 3,
    orderBy: { data: "desc" },
  });
  for (const [i, r] of reservasParaSplit.entries()) {
    const metodos2 = [MP("DINHEIRO"), MP("MBWAY"), MP("TRANSFERENCIA")];
    const valorOriginal = Number(r.valorPago ?? 0);
    const valor2 = Math.round(valorOriginal * 0.3 * 100) / 100; // 30% no 2º método
    const valor1 = Math.round((valorOriginal - valor2) * 100) / 100;
    await prisma.reserva.update({
      where: { id: r.id },
      data: {
        valorPago: valor1,
        metodoPagamento2: metodos2[i],
        valorPago2: valor2,
        referenciaPagamento: i === 0 ? `REF-${r.id.slice(-6).toUpperCase()}` : null,
      },
    });
  }

  // Descontos em 2 reservas
  const reservasParaDesconto = await prisma.reserva.findMany({
    where: { pago: true },
    take: 2,
    skip: 3, // Diferentes das do split
    orderBy: { data: "desc" },
  });
  for (const [i, r] of reservasParaDesconto.entries()) {
    await prisma.reserva.update({
      where: { id: r.id },
      data: {
        descontoPercentagem: i === 0 ? 10 : 5,
        descontoMotivo: i === 0 ? "Cliente habitual" : "Promoção de temporada",
      },
    });
  }

  // Meias em 4 reservas (compra obrigatória no parque)
  const reservasParaMeias = await prisma.reserva.findMany({
    where: { estado: { in: ["CONCLUIDA", "EM_CURSO", "CONFIRMADO"] } },
    take: 4,
    orderBy: { data: "desc" },
  });
  for (const r of reservasParaMeias) {
    const qtd = Math.max(2, Math.floor((r.numCriancas ?? 5) / 2));
    await prisma.reserva.update({
      where: { id: r.id },
      data: {
        meiasQuantidade: qtd,
        meiasPrecoUnit: 2.5,
      },
    });
  }

  // Meias em 2 entradas livres ativas
  const entradasParaMeias = await prisma.entradaLivre.findMany({
    where: { estado: "ATIVA" },
    take: 2,
  });
  for (const e of entradasParaMeias) {
    await prisma.entradaLivre.update({
      where: { id: e.id },
      data: {
        meiasQuantidade: 2,
        meiasPrecoUnit: 2.5,
      },
    });
  }

  // horaLanche para entradas livres (45 min após início)
  const entradas = await prisma.entradaLivre.findMany({ select: { id: true, inicioEm: true } });
  for (const e of entradas) {
    if (!e.inicioEm) continue;
    const d = new Date(e.inicioEm);
    d.setMinutes(d.getMinutes() + 45);
    const horaLanche = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    await prisma.entradaLivre.update({ where: { id: e.id }, data: { horaLanche } });
  }

  // ─── Ajustes de pagamento (exemplos: acréscimo, desconto, redefinição) ───
  // Nota: os ajustes são write-through — os valores finais já refletem os acertos.
  const adminUser = await prisma.user.findFirst({ where: { funcao: "ADMINISTRADOR" } });

  // 1) ACRESCIMO na festa EM_CURSO de hoje (meias compradas no parque)
  await prisma.ajustePagamento.upsert({
    where: { id: "ajuste-seed-acrescimo-001" },
    update: {},
    create: {
      id: "ajuste-seed-acrescimo-001",
      tipo: "ACRESCIMO", valor: 15.00,
      motivo: "6 pares de meias compradas no parque (6 × 2,50€)",
      reservaId: "reserva-001",
      metodoPagamento: "DINHEIRO",
      criadoPorId: adminUser?.id ?? null,
    },
  });
  await prisma.reserva.update({ where: { id: "reserva-001" }, data: { valorPago: { increment: 15 } } });

  // 2) DESCONTO na festa CONCLUIDA de hoje (cortesia cliente habitual)
  await prisma.ajustePagamento.upsert({
    where: { id: "ajuste-seed-desconto-001" },
    update: {},
    create: {
      id: "ajuste-seed-desconto-001",
      tipo: "DESCONTO", valor: 10.00,
      motivo: "Cliente habitual — desconto de cortesia",
      reservaId: "reserva-today-3",
      criadoPorId: adminUser?.id ?? null,
    },
  });
  await prisma.reserva.update({ where: { id: "reserva-today-3" }, data: { valorPago: { decrement: 10 } } });

  // 3) REDEFINICAO POR_CRIANCA na festa CONFIRMADA de hoje (12€ × 22 crianças = 264€)
  await prisma.ajustePagamento.upsert({
    where: { id: "ajuste-seed-redefinicao-001" },
    update: {},
    create: {
      id: "ajuste-seed-redefinicao-001",
      tipo: "REDEFINICAO", valor: 264.00,
      modo: "POR_CRIANCA", precoPorCabeca: 12.00,
      motivo: "Preço combinado de 12€ por criança (22 crianças)",
      reservaId: "reserva-002",
      criadoPorId: adminUser?.id ?? null,
    },
  });
  await prisma.reserva.update({ where: { id: "reserva-002" }, data: { valorPago: 264.00 } });

  // 4) ACRESCIMO numa entrada livre com lanche (2 × 4,50€)
  // → criado em seedEntradasLivres() (a entrada só existe depois dessa fase)

  console.log("  ✓ 24 reservas (6 ontem + 3 hoje + 2 amanhã + 3 futuras + 5 esta semana + 5 semana passada)");
  console.log("  ✓ 4 ajustes de pagamento (acréscimo, desconto, redefinição por criança, lanche em entrada livre)");
  console.log("  ✓ ~92% em slots horários (10:00/14:00/16:30/18:30), 2 com horário custom");
  console.log("  ✓ Menus, extras, cacifos preenchidos (com notas de saúde/saída nas festas de hoje), etapas, horaLanche e brindes-pais para todas\n");
}

// ─── Marketing ────────────────────────────────────────────────
async function seedMarketing() {
  console.log("  Creating marketing data...");

  await prisma.segmento.upsert({
    where: { id: "segmento-001" },
    update: {},
    create: { id: "segmento-001", nome: "Famílias com festas realizadas", descricao: "Clientes que já realizaram festas" },
  });

  const contactos = [
    { id: "contacto-001", clienteId: "cliente-001" },
    { id: "contacto-002", clienteId: "cliente-002" },
    { id: "contacto-003", clienteId: "cliente-003" },
    { id: "contacto-004", clienteId: "cliente-004" },
    { id: "contacto-005", clienteId: "cliente-005" },
    { id: "contacto-006", clienteId: "cliente-006" },
  ];

  for (const c of contactos) {
    await prisma.newsletterContacto.upsert({ where: { id: c.id }, update: {}, create: c });
    await prisma.contactoSegmento.upsert({
      where: { contactoId_segmentoId: { contactoId: c.id, segmentoId: "segmento-001" } },
      update: {},
      create: { contactoId: c.id, segmentoId: "segmento-001" },
    });
  }

  await prisma.campanha.upsert({
    where: { id: "campanha-001" },
    update: {},
    create: {
      id: "campanha-001",
      tipo: "EMAIL",
      estado: "RASCUNHO",
      assunto: "🎂 Festas de Verão — Promoção 20%!",
      mensagem: "Olá!\n\nEste verão, as festas dos seus filhos têm desconto! Reserve até 30 de junho e garanta 20% de desconto.\n\nCom carinho,\nEquipa Festas",
      segmentoId: "segmento-001",
    },
  });

  console.log("  ✓ 1 segmento, 6 contactos, 1 campanha\n");
}

// ─── Entradas Livres ────────────────────────────────────────────
async function seedEntradasLivres() {
  console.log("  Creating entrada livre data...");

  const todayDate = today();

  // ─── Entrada ATIVA (hoje, às 9:00) ───────────────────────────────
  const ativaInicio = dateAt(todayDate, 9, 0);
  await prisma.entradaLivre.upsert({
    where: { id: "entrada-livre-ativa-001" },
    update: {},
    create: {
      id: "entrada-livre-ativa-001",
      encarregadoNome: "Pedro Santos",
      encarregadoTelefone: "910000001",
      encarregadoEmail: "pedro@email.pt",
      duracaoMinutos: 90,
      custoHora: 10.0,
      custoTotal: 15.0,
      inicioEm: ativaInicio,
      fimPrevisto: addMin(ativaInicio, 90),
      estado: "ATIVA",
      temLanche: false,
      numAdultos: 0,
      pago: true,
      metodoPagamento: "MBWAY",
      criancas: [{ nome: "Miguel", idade: 6 }, { nome: "Sofia", idade: 4 }],
    },
  });

  // ─── Entrada ATIVA (hoje, às 10:30) com cacifo ─────────────────────
  const ativaInicio2 = dateAt(todayDate, 10, 30);
  const cacifo31 = await prisma.cacifo.findUnique({ where: { numero: 31 } });
  await prisma.entradaLivre.upsert({
    where: { id: "entrada-livre-ativa-002" },
    update: {},
    create: {
      id: "entrada-livre-ativa-002",
      encarregadoNome: "Ana Costa",
      encarregadoTelefone: "920000002",
      duracaoMinutos: 60,
      custoHora: 8.0,
      custoTotal: 8.0,
      inicioEm: ativaInicio2,
      fimPrevisto: addMin(ativaInicio2, 60),
      estado: "ATIVA",
      temLanche: true,
      numAdultos: 1,
      cacifoId: cacifo31?.id,
      pago: false,
      criancas: [{ nome: "Beatriz", idade: 5 }],
    },
  });
  if (cacifo31) {
    await prisma.cacifo.update({
      where: { id: cacifo31.id },
      data: { estado: "OCUPADO", criancas: "Beatriz" },
    });
  }

  // ─── Entrada CONCLUIDA (ontem, com excesso) ───────────────────────
  const ontem = daysAgo(1);
  const concluidaInicio = dateAt(ontem, 14, 0);
  const concluidaFim = addMin(concluidaInicio, 120 + 30); // 120 min + 30 min excesso
  await prisma.entradaLivre.upsert({
    where: { id: "entrada-livre-conc-001" },
    update: {},
    create: {
      id: "entrada-livre-conc-001",
      encarregadoNome: "Ricardo Mendes",
      encarregadoTelefone: "930000003",
      duracaoMinutos: 120,
      custoHora: 10.0,
      custoTotal: 20.0,
      inicioEm: concluidaInicio,
      fimPrevisto: addMin(concluidaInicio, 120),
      fimReal: concluidaFim,
      estado: "CONCLUIDA",
      temLanche: false,
      numAdultos: 0,
      excessoMinutos: 30,
      custoExcesso: 6.0,
      custoTotalFinal: 26.0,
      pago: true,
      pagoExcesso: true,
      metodoPagamento: "MULTIBANCO",
      criancas: [{ nome: "Tomás", idade: 7 }, { nome: "João", idade: 5 }],
    },
  });

  // ─── Entrada CANCELADA (hoje, cancelada rapidamente) ────────────────
  const canceladaInicio = dateAt(todayDate, 8, 0);
  await prisma.entradaLivre.upsert({
    where: { id: "entrada-livre-canc-001" },
    update: {},
    create: {
      id: "entrada-livre-canc-001",
      encarregadoNome: "Cláudia Silva",
      encarregadoTelefone: "940000004",
      duracaoMinutos: 90,
      custoHora: 12.0,
      custoTotal: 18.0,
      inicioEm: canceladaInicio,
      fimPrevisto: addMin(canceladaInicio, 90),
      fimReal: addMin(canceladaInicio, 5),
      estado: "CANCELADA",
      temLanche: false,
      numAdultos: 0,
      observacoes: "Cancelado por emergência familiar",
      criancas: [{ nome: "Leonor", idade: 6 }],
    },
  });

  // ─── MAIS ATIVAS (hoje) — 5 entradas em vários estados ──────────
  const ativasExtras = [
    { id: "entrada-livre-ativa-003", hora: 11, min: 0, dur: 60, custo: 10.0, nome: "Mariana Alves", tel: "911111112", email: "mariana@email.pt", pago: true, met: MP("DINHEIRO"), lanche: false, adultos: 0, criancas: [{ nome: "João", idade: 5 }, { nome: "Rita", idade: 7 }] },
    { id: "entrada-livre-ativa-004", hora: 13, min: 30, dur: 90, custo: 12.0, nome: "Carlos Pereira", tel: "922222223", email: "carlos@email.pt", pago: false, met: undefined, lanche: true, adultos: 1, criancas: [{ nome: "Pedro", idade: 8 }, { nome: "Inês", idade: 6 }, { nome: "Tiago", idade: 4 }] },
    { id: "entrada-livre-ativa-005", hora: 14, min: 45, dur: 120, custo: 8.0, nome: "Filipa Dinis", tel: "933333334", email: "filipa@email.pt", pago: true, met: MP("MBWAY"), lanche: false, adultos: 0, criancas: [{ nome: "Sofia", idade: 5 }] },
    { id: "entrada-livre-ativa-006", hora: 15, min: 0, dur: 30, custo: 10.0, nome: "Hugo Cardoso", tel: "944444445", email: "hugo@email.pt", pago: false, met: undefined, lanche: false, adultos: 1, criancas: [{ nome: "Marta", idade: 6 }, { nome: "Guilherme", idade: 3 }] },
    { id: "entrada-livre-ativa-007", hora: 16, min: 15, dur: 60, custo: 12.0, nome: "Teresa Morais", tel: "955555556", email: "teresa@email.pt", pago: true, met: MP("CARTAO"), lanche: true, adultos: 0, criancas: [{ nome: "Afonso", idade: 7 }] },
  ];

  for (const a of ativasExtras) {
    const start = dateAt(todayDate, a.hora, a.min);
    await prisma.entradaLivre.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        encarregadoNome: a.nome,
        encarregadoTelefone: a.tel,
        encarregadoEmail: a.email,
        duracaoMinutos: a.dur,
        custoHora: a.custo,
        custoTotal: (a.custo / 60) * a.dur,
        inicioEm: start,
        fimPrevisto: addMin(start, a.dur),
        estado: "ATIVA",
        temLanche: a.lanche,
        numAdultos: a.adultos,
        pago: a.pago,
        metodoPagamento: a.met,
        criancas: a.criancas,
      },
    });
  }

  // ─── ENTRADA ATIVA HOJE — COM LANCHE + ADULTO (para teste visual) ────
  const entradaLancheStart = dateAt(todayDate, 12, 0);
  await prisma.entradaLivre.upsert({
    where: { id: "entrada-livre-ativa-lanche-001" },
    update: {},
    create: {
      id: "entrada-livre-ativa-lanche-001",
      encarregadoNome: "Sofia Lancheiro",
      encarregadoTelefone: "960000099",
      encarregadoEmail: "sofia.lancheiro@email.pt",
      duracaoMinutos: 120,
      custoHora: 10.0,
      custoTotal: 20.0,
      inicioEm: entradaLancheStart,
      fimPrevisto: addMin(entradaLancheStart, 120),
      estado: "ATIVA",
      temLanche: true,
      numAdultos: 1,
      pago: true,
      metodoPagamento: "MBWAY",
      criancas: [{ nome: "Tomás", idade: 5 }, { nome: "Madalena", idade: 3 }],
    },
  });

  // 4) ACRESCIMO nesta entrada livre com lanche (2 × 4,50€) — write-through
  const adminUserAjuste = await prisma.user.findFirst({ where: { funcao: "ADMINISTRADOR" } });
  await prisma.ajustePagamento.upsert({
    where: { id: "ajuste-seed-acrescimo-002" },
    update: {},
    create: {
      id: "ajuste-seed-acrescimo-002",
      tipo: "ACRESCIMO", valor: 9.00,
      motivo: "Lanche para 2 crianças (2 × 4,50€)",
      entradaLivreId: "entrada-livre-ativa-lanche-001",
      metodoPagamento: "MBWAY",
      criadoPorId: adminUserAjuste?.id ?? null,
    },
  });
  await prisma.entradaLivre.update({
    where: { id: "entrada-livre-ativa-lanche-001" },
    data: { custoTotalFinal: 29.00 },
  });

  // ─── CONCLUIDAS esta semana (-1 a -5 dias) — 7 entradas ──────────
  const concluidasSemana = [
    { dias: 1, hora: 10, min: 0, dur: 60, custo: 10.0, nome: "Rui Costa", tel: "966666667", met: MP("MBWAY"), excesso: 15, lanche: false, adultos: 0, criancas: [{ nome: "Diogo", idade: 6 }] },
    { dias: 2, hora: 14, min: 30, dur: 90, custo: 8.0, nome: "Sandra Ribeiro", tel: "977777778", met: MP("DINHEIRO"), excesso: 0, lanche: true, adultos: 0, criancas: [{ nome: "Beatriz", idade: 5 }, { nome: "Carlos", idade: 7 }] },
    { dias: 2, hora: 16, min: 0, dur: 120, custo: 12.0, nome: "Paulo Sousa", tel: "988888889", met: MP("MULTIBANCO"), excesso: 45, lanche: false, adultos: 1, criancas: [{ nome: "João", idade: 8 }, { nome: "Marta", idade: 6 }, { nome: "Pedro", idade: 5 }] },
    { dias: 3, hora: 11, min: 30, dur: 60, custo: 10.0, nome: "Catarina Lopes", tel: "999999990", met: MP("CARTAO"), excesso: 0, lanche: false, adultos: 0, criancas: [{ nome: "Ana", idade: 4 }] },
    { dias: 4, hora: 15, min: 0, dur: 90, custo: 8.0, nome: "Gonçalo Ferreira", tel: "910000011", met: MP("MBWAY"), excesso: 20, lanche: true, adultos: 0, criancas: [{ nome: "Rita", idade: 6 }, { nome: "Miguel", idade: 8 }] },
    { dias: 4, hora: 10, min: 0, dur: 30, custo: 12.0, nome: "Inês Martins", tel: "920000012", met: MP("DINHEIRO"), excesso: 0, lanche: false, adultos: 0, criancas: [{ nome: "Tiago", idade: 3 }] },
    { dias: 5, hora: 17, min: 0, dur: 120, custo: 10.0, nome: "André Santos", tel: "930000013", met: MP("TRANSFERENCIA"), excesso: 30, lanche: false, adultos: 1, criancas: [{ nome: "Sofia", idade: 7 }, { nome: "Laura", idade: 5 }, { nome: "Rodrigo", idade: 6 }] },
  ];

  for (const [idx, c] of concluidasSemana.entries()) {
    const id = `entrada-livre-conc-semana-${idx + 1}`;
    const start = dateAt(daysAgo(c.dias), c.hora, c.min);
    const fim = addMin(start, c.dur);
    const fimReal = addMin(fim, c.excesso);
    const custoTotal = (c.custo / 60) * c.dur;
    const custoExcesso = c.excesso > 0 ? ((c.custo * 1.2) / 60) * c.excesso : 0;
    await prisma.entradaLivre.upsert({
      where: { id },
      update: {},
      create: {
        id,
        encarregadoNome: c.nome,
        encarregadoTelefone: c.tel,
        duracaoMinutos: c.dur,
        custoHora: c.custo,
        custoTotal,
        inicioEm: start,
        fimPrevisto: fim,
        fimReal,
        estado: "CONCLUIDA",
        temLanche: c.lanche,
        numAdultos: c.adultos,
        excessoMinutos: c.excesso || null,
        custoExcesso: c.excesso > 0 ? custoExcesso : null,
        custoTotalFinal: custoTotal + custoExcesso,
        pago: true,
        pagoExcesso: c.excesso > 0,
        metodoPagamento: c.met,
        criancas: c.criancas,
      },
    });
  }

  // ─── CONCLUIDAS semana passada (-7 a -11 dias) — 5 entradas ──────
  const concluidasPas = [
    { dias: 7, hora: 14, min: 0, dur: 90, custo: 10.0, nome: "Luís Pereira", tel: "940000014", met: MP("DINHEIRO"), excesso: 0, lanche: false, adultos: 0, criancas: [{ nome: "Mariana", idade: 6 }] },
    { dias: 8, hora: 10, min: 30, dur: 60, custo: 8.0, nome: "Helena Costa", tel: "950000015", met: MP("MBWAY"), excesso: 10, lanche: true, adultos: 1, criancas: [{ nome: "João", idade: 5 }, { nome: "Beatriz", idade: 7 }] },
    { dias: 9, hora: 16, min: 0, dur: 120, custo: 12.0, nome: "Ricardo Silva", tel: "960000016", met: MP("MULTIBANCO"), excesso: 25, lanche: false, adultos: 0, criancas: [{ nome: "Pedro", idade: 8 }, { nome: "Inês", idade: 6 }, { nome: "Marta", idade: 4 }] },
    { dias: 10, hora: 11, min: 0, dur: 90, custo: 10.0, nome: "Sofia Mendes", tel: "970000017", met: MP("CARTAO"), excesso: 0, lanche: false, adultos: 0, criancas: [{ nome: "Tiago", idade: 6 }] },
    { dias: 11, hora: 15, min: 30, dur: 60, custo: 8.0, nome: "Nuno Ribeiro", tel: "980000018", met: MP("DINHEIRO"), excesso: 0, lanche: true, adultos: 0, criancas: [{ nome: "Ana", idade: 5 }, { nome: "Rita", idade: 7 }] },
  ];

  for (const [idx, c] of concluidasPas.entries()) {
    const id = `entrada-livre-conc-pas-${idx + 1}`;
    const start = dateAt(daysAgo(c.dias), c.hora, c.min);
    const fim = addMin(start, c.dur);
    const fimReal = addMin(fim, c.excesso);
    const custoTotal = (c.custo / 60) * c.dur;
    const custoExcesso = c.excesso > 0 ? ((c.custo * 1.2) / 60) * c.excesso : 0;
    await prisma.entradaLivre.upsert({
      where: { id },
      update: {},
      create: {
        id,
        encarregadoNome: c.nome,
        encarregadoTelefone: c.tel,
        duracaoMinutos: c.dur,
        custoHora: c.custo,
        custoTotal,
        inicioEm: start,
        fimPrevisto: fim,
        fimReal,
        estado: "CONCLUIDA",
        temLanche: c.lanche,
        numAdultos: c.adultos,
        excessoMinutos: c.excesso || null,
        custoExcesso: c.excesso > 0 ? custoExcesso : null,
        custoTotalFinal: custoTotal + custoExcesso,
        pago: true,
        pagoExcesso: c.excesso > 0,
        metodoPagamento: c.met,
        criancas: c.criancas,
      },
    });
  }

  // ─── CANCELADAS — 3 entradas ─────────────────────────────────────
  const canceladasExtras = [
    { dias: 2, hora: 9, min: 0, dur: 60, custo: 10.0, nome: "Vasco Almeida", tel: "990000019", obs: "Criança adoeceu", lanche: false, adultos: 0, criancas: [{ nome: "Leonor", idade: 5 }] },
    { dias: 4, hora: 14, min: 0, dur: 90, custo: 8.0, nome: "Marta Cardoso", tel: "901000020", obs: "Mudança de planos", lanche: false, adultos: 0, criancas: [{ nome: "Diogo", idade: 6 }, { nome: "Sofia", idade: 4 }] },
    { dias: 6, hora: 11, min: 30, dur: 120, custo: 12.0, nome: "Pedro Lourenço", tel: "912000021", obs: "Conflito de horário", lanche: false, adultos: 0, criancas: [{ nome: "Beatriz", idade: 7 }] },
  ];

  for (const [idx, c] of canceladasExtras.entries()) {
    const id = `entrada-livre-canc-${idx + 2}`;
    const start = dateAt(daysAgo(c.dias), c.hora, c.min);
    await prisma.entradaLivre.upsert({
      where: { id },
      update: {},
      create: {
        id,
        encarregadoNome: c.nome,
        encarregadoTelefone: c.tel,
        duracaoMinutos: c.dur,
        custoHora: c.custo,
        custoTotal: (c.custo / 60) * c.dur,
        inicioEm: start,
        fimPrevisto: addMin(start, c.dur),
        fimReal: addMin(start, 5),
        estado: "CANCELADA",
        temLanche: c.lanche,
        numAdultos: c.adultos,
        observacoes: c.obs,
        criancas: c.criancas,
      },
    });
  }

  // ─── CONCLUIDAS HOJE (para o relatório de hoje ter dados) ─────────
  const concluidasHoje = [
    { id: "entrada-livre-conc-hoje-001", hora: 11, min: 0, dur: 60, custo: 10.0, nome: "Patrícia Gomes", tel: "910000099", met: MP("DINHEIRO"), excesso: 0, lanche: false, adultos: 0, criancas: [{ nome: "Marta", idade: 5 }] },
    { id: "entrada-livre-conc-hoje-002", hora: 13, min: 30, dur: 90, custo: 8.0, nome: "Bruno Antunes", tel: "920000099", met: MP("MBWAY"), excesso: 15, lanche: true, adultos: 0, criancas: [{ nome: "Tomás", idade: 6 }, { nome: "Madalena", idade: 4 }] },
    { id: "entrada-livre-conc-hoje-003", hora: 15, min: 0, dur: 120, custo: 12.0, nome: "Sónia Rocha", tel: "930000099", met: MP("MULTIBANCO"), excesso: 0, lanche: false, adultos: 1, criancas: [{ nome: "Afonso", idade: 7 }] },
    { id: "entrada-livre-conc-hoje-004", hora: 16, min: 0, dur: 60, custo: 10.0, nome: "Daniel Faria", tel: "940000099", met: MP("TRANSFERENCIA"), excesso: 0, lanche: false, adultos: 0, criancas: [{ nome: "Leonor", idade: 5 }, { nome: "Vicente", idade: 3 }] },
  ];

  for (const c of concluidasHoje) {
    const start = dateAt(todayDate, c.hora, c.min);
    const fim = addMin(start, c.dur);
    const fimReal = addMin(fim, c.excesso);
    const custoTotal = (c.custo / 60) * c.dur;
    const custoExcesso = c.excesso > 0 ? ((c.custo * 1.2) / 60) * c.excesso : 0;
    await prisma.entradaLivre.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        encarregadoNome: c.nome,
        encarregadoTelefone: c.tel,
        duracaoMinutos: c.dur,
        custoHora: c.custo,
        custoTotal,
        inicioEm: start,
        fimPrevisto: fim,
        fimReal,
        estado: "CONCLUIDA",
        temLanche: c.lanche,
        numAdultos: c.adultos,
        excessoMinutos: c.excesso || null,
        custoExcesso: c.excesso > 0 ? custoExcesso : null,
        custoTotalFinal: custoTotal + custoExcesso,
        pago: true,
        pagoExcesso: c.excesso > 0,
        metodoPagamento: c.met,
        criancas: c.criancas,
      },
    });
  }

  // ─── Backfill: ligar encarregados das entradas livres a Clientes ──────
  // Garante que todos os encarregados entram na base de contactos (marketing).
  const semCliente = await prisma.entradaLivre.findMany({
    where: { clienteId: null },
    select: { id: true, encarregadoNome: true, encarregadoTelefone: true, encarregadoEmail: true },
  });

  for (const el of semCliente) {
    let clienteId: string | null = null;

    // 1. Procurar por email (unique)
    if (el.encarregadoEmail) {
      const byEmail = await prisma.cliente.findFirst({ where: { email: el.encarregadoEmail } });
      if (byEmail) clienteId = byEmail.id;
    }
    // 2. Procurar por telefone
    if (!clienteId && el.encarregadoTelefone) {
      const byTel = await prisma.cliente.findFirst({ where: { telefone: el.encarregadoTelefone } });
      if (byTel) clienteId = byTel.id;
    }
    // 3. Criar novo cliente
    if (!clienteId && el.encarregadoNome && el.encarregadoTelefone) {
      const novo = await prisma.cliente.create({
        data: {
          nome: el.encarregadoNome,
          telefone: el.encarregadoTelefone,
          email: el.encarregadoEmail || null,
        },
      });
      clienteId = novo.id;
    }

    if (clienteId) {
      await prisma.entradaLivre.update({
        where: { id: el.id },
        data: { clienteId },
      });
    }
  }

  console.log("  ✓ 3 configurações, 30 entradas livres (7 ativas, 16 concluídas, 4 canceladas — 4 concluídas hoje)\n");
  console.log(`  ✓ ${semCliente.length} encarregados de entradas livres ligados à base de clientes (marketing)\n`);
}

// ─── Alocações de Monitores (escalonamento) ──────────────────
async function seedAlocacoesMonitores() {
  console.log("  Creating alocacoes de monitores...");

  // Limpa alocações anteriores do seed (idempotente)
  await prisma.alocacaoMonitor.deleteMany({});

  // H:MM → minutos desde meia-noite
  const toMin = (h: number, m: number) => h * 60 + m;

  type Aloca = {
    dias: number; // relativo a hoje (0 = hoje, -1 = ontem, +1 = amanhã)
    monitorId: string;
    localId: string;
    horaInicio: number;
    horaFim: number;
    observacoes?: string;
  };

  const alocacoes: Aloca[] = [
    // ─── HOJE (timeline preenchida ao abrir a página) ─────────────
    { dias: 0, monitorId: "monitor-001", localId: "local-001", horaInicio: toMin(9, 0), horaFim: toMin(13, 0) },
    { dias: 0, monitorId: "monitor-001", localId: "local-002", horaInicio: toMin(14, 0), horaFim: toMin(18, 0), observacoes: "Turno da tarde" },
    { dias: 0, monitorId: "monitor-002", localId: "local-002", horaInicio: toMin(9, 0), horaFim: toMin(12, 0) },
    { dias: 0, monitorId: "monitor-002", localId: "local-003", horaInicio: toMin(13, 0), horaFim: toMin(17, 0) },
    { dias: 0, monitorId: "monitor-003", localId: "local-001", horaInicio: toMin(10, 0), horaFim: toMin(14, 0) },
    { dias: 0, monitorId: "monitor-004", localId: "local-003", horaInicio: toMin(9, 30), horaFim: toMin(13, 0), observacoes: "Reforço Parque" },
    { dias: 0, monitorId: "monitor-005", localId: "local-002", horaInicio: toMin(15, 0), horaFim: toMin(19, 0) },
    { dias: 0, monitorId: "monitor-006", localId: "local-001", horaInicio: toMin(14, 0), horaFim: toMin(18, 0) },

    // ─── ONTEM ────────────────────────────────────────────────────
    { dias: -1, monitorId: "monitor-001", localId: "local-001", horaInicio: toMin(10, 0), horaFim: toMin(14, 0) },
    { dias: -1, monitorId: "monitor-003", localId: "local-003", horaInicio: toMin(14, 0), horaFim: toMin(18, 0) },
    { dias: -1, monitorId: "monitor-005", localId: "local-002", horaInicio: toMin(9, 0), horaFim: toMin(13, 0) },

    // ─── ANTEONTEM (-3 dias) ──────────────────────────────────────
    { dias: -3, monitorId: "monitor-002", localId: "local-002", horaInicio: toMin(9, 0), horaFim: toMin(12, 30) },
    { dias: -3, monitorId: "monitor-006", localId: "local-001", horaInicio: toMin(15, 0), horaFim: toMin(19, 0) },

    // ─── AMANHÃ ───────────────────────────────────────────────────
    { dias: 1, monitorId: "monitor-004", localId: "local-001", horaInicio: toMin(9, 0), horaFim: toMin(13, 0) },
    { dias: 1, monitorId: "monitor-004", localId: "local-003", horaInicio: toMin(14, 0), horaFim: toMin(18, 0) },
    { dias: 1, monitorId: "monitor-001", localId: "local-002", horaInicio: toMin(10, 0), horaFim: toMin(16, 0) },

    // ─── DAQUI A 2 DIAS ───────────────────────────────────────────
    { dias: 2, monitorId: "monitor-003", localId: "local-001", horaInicio: toMin(9, 0), horaFim: toMin(13, 0) },
    { dias: 2, monitorId: "monitor-005", localId: "local-003", horaInicio: toMin(14, 0), horaFim: toMin(19, 0) },
    { dias: 2, monitorId: "monitor-006", localId: "local-002", horaInicio: toMin(10, 0), horaFim: toMin(14, 0) },
  ];

  let criadas = 0;
  for (const a of alocacoes) {
    await prisma.alocacaoMonitor.create({
      data: {
        data: new Date(toDateStr(daysFromNow(a.dias))),
        horaInicio: a.horaInicio,
        horaFim: a.horaFim,
        monitorId: a.monitorId,
        localId: a.localId,
        observacoes: a.observacoes ?? null,
      },
    });
    criadas++;
  }

  console.log(`  ✓ ${criadas} alocações de monitores (hoje, ontem, -3d, amanhã, +2d)\n`);
}

// ─── Run ──────────────────────────────────────────────────────
main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error("❌ Dev seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
