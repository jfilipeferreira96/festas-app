/**
 * Dev seed script — Comprehensive sample data for development.
 *
 * Creates:
 * - 5 Users (with Better Auth) + RBAC permissions
 * - 3 Locais (salas)
 * - 12 Extras (6 EXTRA + 6 MENU) + ExtraLocal associations
 * - 6 Monitores + MonitorLocal associations
 * - 1 Configuração Cacifos + 40 Cacifos
 * - 8 Clientes with 10 Aniversariantes
 * - 10 Reservas (past, today, future — various states) ALL with:
 *   → cor, tema, bolo, previsaoCriancas, observações
 *   → pagamento (metodo, valor, pago, caução)
 *   → menus
 *   → participantes (crianças) com cacifos associados
 *   → extras, monitores, etapas
 * - 6 Etapas de festa config
 * - Marketing: segmento + newsletter + campanha
 */

import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { config } from "dotenv";

config({ path: "../../apps/server/.env" });

const prisma = new PrismaClient();

const seedAuth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET!,
  trustedOrigins: [process.env.CORS_ORIGIN || "http://localhost:3000"],
  emailAndPassword: { enabled: true },
  emailVerification: {
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
  return d.toISOString().split("T")[0]!;
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

  await seedEssential();
  await seedLocais();
  await seedExtras();
  await seedMonitores();
  await seedCacifos();
  await seedClientes();
  await seedEtapasFestaConfig();
  await seedReservas();
  await seedMarketing();

  console.log("\n✅ Dev seed complete!");
}

// ─── Essential (Users + RBAC) ─────────────────────────────────
async function seedEssential() {
  console.log("  Creating auth users...");

  const users = [
    { id: "admin-001", name: "Maria Silva", email: "admin@festas.pt", password: "admin123", funcao: "ADMINISTRADOR" as const },
    { id: "gestor-001", name: "Ana Costa", email: "gestor@festas.pt", password: "gestor123", funcao: "GESTOR" as const },
    { id: "rececao-001", name: "Joana Rodrigues", email: "rececao@festas.pt", password: "rececao123", funcao: "RECECAO" as const },
    { id: "marketing-001", name: "Rui Fernandes", email: "marketing@festas.pt", password: "marketing123", funcao: "MARKETING" as const },
    { id: "rececao-002", name: "Sandra Lopes", email: "rececao2@festas.pt", password: "rececao2123", funcao: "RECECAO" as const },
  ];

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

  // RBAC
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
  console.log("  ✓ RBAC permissions\n");
}

// ─── Locais ───────────────────────────────────────────────────
async function seedLocais() {
  console.log("  Creating locais...");
  const locais = [
    { id: "local-001", nome: "Sala Azul", capacidade: 25 },
    { id: "local-002", nome: "Sala Arco-Íris", capacidade: 30 },
    { id: "local-003", nome: "Parque Trampolins", capacidade: 15 },
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
  ];
  for (const extra of extras) {
    await prisma.extra.upsert({ where: { id: extra.id }, update: {}, create: extra });
  }

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
  ];
  for (const el of extraLocals) {
    await prisma.extraLocal.upsert({
      where: { extraId_localId: { extraId: el.extraId, localId: el.localId } },
      update: {}, create: el,
    });
  }
  console.log("  ✓ 13 extras with local associations\n");
}

// ─── Monitores ────────────────────────────────────────────────
async function seedMonitores() {
  console.log("  Creating monitores...");
  const monitores = [
    { id: "monitor-001", nome: "João Ferreira", contacto: "912345678" },
    { id: "monitor-002", nome: "Carolina Santos", contacto: "923456789" },
    { id: "monitor-003", nome: "Pedro Oliveira", contacto: "934567890" },
    { id: "monitor-004", nome: "Luísa Almeida", contacto: "945678901" },
    { id: "monitor-005", nome: "Tiago Moreira", contacto: "956789012" },
    { id: "monitor-006", nome: "Inês Cardoso", contacto: "967890123" },
  ];
  for (const mon of monitores) {
    await prisma.monitor.upsert({ where: { id: mon.id }, update: {}, create: mon });
  }
  const monitorLocals = [
    { monitorId: "monitor-001", localId: "local-001" }, { monitorId: "monitor-001", localId: "local-002" },
    { monitorId: "monitor-002", localId: "local-002" }, { monitorId: "monitor-002", localId: "local-003" },
    { monitorId: "monitor-003", localId: "local-001" }, { monitorId: "monitor-003", localId: "local-003" },
    { monitorId: "monitor-004", localId: "local-001" }, { monitorId: "monitor-004", localId: "local-003" },
    { monitorId: "monitor-005", localId: "local-002" }, { monitorId: "monitor-005", localId: "local-003" },
    { monitorId: "monitor-006", localId: "local-001" }, { monitorId: "monitor-006", localId: "local-002" },
  ];
  for (const ml of monitorLocals) {
    await prisma.monitorLocal.upsert({
      where: { monitorId_localId: { monitorId: ml.monitorId, localId: ml.localId } },
      update: {}, create: ml,
    });
  }
  console.log("  ✓ 6 monitores with local associations\n");
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
      update: { estado: "LIVRE", reservaId: null, criancas: null, notas: null, participante: { disconnect: true } },
      create: { numero: i, estado: "LIVRE", configuracaoId: "config-cacifo-001" },
    });
  }
  console.log("  ✓ 40 cacifos (all LIVRE)\n");
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
  ];
  await prisma.participante.deleteMany({ where: { reservaId: { in: oldReservaIds } } });
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

  // Helper to create participantes + assign cacifos for a reserva
  async function createParticipantes(
    reservaId: string,
    numCriancas: number,
    numPresentes: number,
    startCacifo: number,
    allPresent: boolean = false
  ) {
    const names = pickNames(numCriancas);
    const participantes: { id: string; nome: string; presente: boolean; cacifoNum: number | null }[] = [];

    for (let i = 0; i < numCriancas; i++) {
      const presente = allPresent ? true : i < numPresentes;
      const pId = `part-${reservaId}-${i + 1}`;
      const cacifoNum = presente ? startCacifo + i : null;
      participantes.push({ id: pId, nome: names[i] ?? `Criança ${i + 1}`, presente, cacifoNum });
    }

    // Create participantes with cacifo lookup
    for (const p of participantes) {
      let cacifoId: string | null = null;
      if (p.presente && p.cacifoNum !== null) {
        const cacifo = await prisma.cacifo.findUnique({ where: { numero: p.cacifoNum } });
        cacifoId = cacifo?.id ?? null;
      }

      await prisma.participante.upsert({
        where: { id: p.id },
        update: {},
        create: { id: p.id, nome: p.nome, presente: p.presente, reservaId, cacifoId },
      });
    }

    // Update cacifos for present kids
    for (const p of participantes.filter(p => p.presente && p.cacifoNum !== null)) {
      await prisma.cacifo.update({
        where: { numero: p.cacifoNum! },
        data: {
          estado: "OCUPADO",
          reservaId,
          criancas: p.nome,
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
        update: {},
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
  // PAST: -7 days — CONCLUIDA (Tomás, Dinossauros, Sala Azul)
  // ═══════════════════════════════════════════════════════════
  const p7 = dateAt(daysAgo(7), 10, 0);
  await prisma.reserva.upsert({
    where: { id: "reserva-past-001" },
    update: {},
    create: {
      id: "reserva-past-001",
      data: new Date(toDateStr(daysAgo(7))),
      horario: "10:00", duracaoMinutos: 120, numCriancas: 15, previsaoCriancas: 18,
      estado: "CONCLUIDA",
      inicioEm: p7, fimPrevisto: addMin(p7, 120), fimReal: addMin(p7, 135),
      tema: "Dinossauros", cor: "#2D6A4F",
      bolo: "Bolo de chocolate com decoração de dinossauros",
      observacoesGerais: "Tomás adora T-Rex. Decoração verde e casturo.",
      observacoesBrindes: "Sacos com mini-dinossauros para todos.",
      outrosExtras: "Palhaçada ao início (15 min)",
      metodoPagamento: "MULTIBANCO", valorPago: 185.00, pago: true,
      caucao: "PAGA", referenciaPagamento: "REF 123456789",
      cacifosHistorico: [
        { numero: 1, estado: "OCUPADO", criancas: "Tomás, Miguel" },
        { numero: 2, estado: "OCUPADO", criancas: "Ana, Rita, Pedro" },
        { numero: 3, estado: "OCUPADO", criancas: "João, Sofia" },
        { numero: 4, estado: "OCUPADO", notas: "Crianças pequenas", criancas: "Beatriz, Luísa, Clara" },
        { numero: 5, estado: "OCUPADO", criancas: "André, Carlos" },
      ],
      clienteId: "cliente-001", localId: "local-001",
    },
  });
  await prisma.reservaAniversariante.upsert({ where: { id: "ra-past-001" }, update: {}, create: { id: "ra-past-001", reservaId: "reserva-past-001", aniversarianteId: "aniv-002" } });
  await prisma.reservaMonitor.upsert({ where: { id: "rm-p1a" }, update: {}, create: { id: "rm-p1a", reservaId: "reserva-past-001", monitorId: "monitor-001" } });
  await prisma.reservaMonitor.upsert({ where: { id: "rm-p1b" }, update: {}, create: { id: "rm-p1b", reservaId: "reserva-past-001", monitorId: "monitor-002" } });
  await prisma.menu.upsert({ where: { id: "menu-past-001" }, update: {}, create: { id: "menu-past-001", nome: "Menu Dinossauro", preco: 9.50, notas: "Sumo, croissants, nuggets, bolo", reservaId: "reserva-past-001" } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-p1-1" }, update: {}, create: { id: "rext-p1-1", reservaId: "reserva-past-001", extraId: "extra-001", quantidade: 1 } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-p1-2" }, update: {}, create: { id: "rext-p1-2", reservaId: "reserva-past-001", extraId: "extra-005", quantidade: 15 } });
  await createEtapas("reserva-past-001", 6, 6, p7);

  // ═══════════════════════════════════════════════════════════
  // PAST: -3 days — CONCLUIDA (Matilde, Princesa, Parque)
  // ═══════════════════════════════════════════════════════════
  const p3 = dateAt(daysAgo(3), 15, 0);
  await prisma.reserva.upsert({
    where: { id: "reserva-past-002" },
    update: {},
    create: {
      id: "reserva-past-002",
      data: new Date(toDateStr(daysAgo(3))),
      horario: "15:00", duracaoMinutos: 90, numCriancas: 10, previsaoCriancas: 12,
      estado: "CONCLUIDA",
      inicioEm: p3, fimPrevisto: addMin(p3, 90), fimReal: addMin(p3, 95),
      tema: "Princesa", cor: "#F9A8D4",
      bolo: "Bolo de morango com coroa de princesa",
      observacoesGerais: "Matilde quer tudo cor-de-rosa.",
      observacoesLesoes: "Sem alergias conhecidas.",
      observacoesBrindes: "Coroas de princesa para as meninas.",
      metodoPagamento: "DINHEIRO", valorPago: 120.00, pago: true,
      caucao: "PAGA",
      cacifosHistorico: [
        { numero: 1, estado: "OCUPADO", criancas: "Matilde, Inês" },
        { numero: 2, estado: "OCUPADO", criancas: "Laura, Sofia, Maria" },
        { numero: 3, estado: "OCUPADO", criancas: "Carolina" },
        { numero: 4, estado: "OCUPADO", criancas: "Ana, Rita" },
      ],
      clienteId: "cliente-004", localId: "local-003",
    },
  });
  await prisma.reservaAniversariante.upsert({ where: { id: "ra-past-002" }, update: {}, create: { id: "ra-past-002", reservaId: "reserva-past-002", aniversarianteId: "aniv-005" } });
  await prisma.reservaMonitor.upsert({ where: { id: "rm-p2a" }, update: {}, create: { id: "rm-p2a", reservaId: "reserva-past-002", monitorId: "monitor-003" } });
  await prisma.menu.upsert({ where: { id: "menu-past-002" }, update: {}, create: { id: "menu-past-002", nome: "Menu Princesa", preco: 10.00, notas: "Sumo, sandes, bolo de morango", reservaId: "reserva-past-002" } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-p2-1" }, update: {}, create: { id: "rext-p2-1", reservaId: "reserva-past-002", extraId: "extra-004", quantidade: 1 } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-p2-2" }, update: {}, create: { id: "rext-p2-2", reservaId: "reserva-past-002", extraId: "extra-006", quantidade: 10 } });
  await createEtapas("reserva-past-002", 6, 6, p3);

  // ═══════════════════════════════════════════════════════════
  // PAST: -1 day — CONCLUIDA (Duarte, Piratas, Sala Azul)
  // ═══════════════════════════════════════════════════════════
  const p1 = dateAt(daysAgo(1), 9, 0);
  await prisma.reserva.upsert({
    where: { id: "reserva-past-003" },
    update: {},
    create: {
      id: "reserva-past-003",
      data: new Date(toDateStr(daysAgo(1))),
      horario: "09:00", duracaoMinutos: 150, numCriancas: 20, previsaoCriancas: 22,
      estado: "CONCLUIDA",
      inicioEm: p1, fimPrevisto: addMin(p1, 150), fimReal: addMin(p1, 155),
      tema: "Piratas", cor: "#92400E",
      bolo: "Bolo de baunilha com navio pirata",
      observacoesGerais: "Duarte adora piratas! Decoração com mapas do tesouro.",
      observacoesLesoes: "Diogo é alérgico a glúten.",
      observacoesBrindes: "Tapas de olho de pirata e bússolas.",
      outrosExtras: "Caça ao tesouro (organizado pelos pais)",
      metodoPagamento: "MBWAY", valorPago: 250.00, pago: true,
      caucao: "PAGA_NO_DIA",
      cacifosHistorico: [
        { numero: 1, estado: "OCUPADO", criancas: "Duarte, Tiago" },
        { numero: 2, estado: "OCUPADO", criancas: "Miguel, Rui, Paulo" },
        { numero: 3, estado: "OCUPADO", criancas: "Ana, Beatriz" },
        { numero: 4, estado: "OCUPADO", criancas: "Sofia, Marta, Clara" },
        { numero: 5, estado: "OCUPADO", criancas: "João, Pedro" },
        { numero: 6, estado: "OCUPADO", criancas: "André, Carlos, Luís" },
        { numero: 7, estado: "OCUPADO", notas: "Gêmeos", criancas: "Rita, Laura" },
      ],
      clienteId: "cliente-005", localId: "local-001",
    },
  });
  await prisma.reservaAniversariante.upsert({ where: { id: "ra-past-003" }, update: {}, create: { id: "ra-past-003", reservaId: "reserva-past-003", aniversarianteId: "aniv-006" } });
  await prisma.reservaMonitor.upsert({ where: { id: "rm-p3a" }, update: {}, create: { id: "rm-p3a", reservaId: "reserva-past-003", monitorId: "monitor-001" } });
  await prisma.reservaMonitor.upsert({ where: { id: "rm-p3b" }, update: {}, create: { id: "rm-p3b", reservaId: "reserva-past-003", monitorId: "monitor-004" } });
  await prisma.menu.upsert({ where: { id: "menu-past-003" }, update: {}, create: { id: "menu-past-003", nome: "Menu Pirata", preco: 8.00, notas: "Pizza, nuggets, sumo, bolo pirata", reservaId: "reserva-past-003" } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-p3-1" }, update: {}, create: { id: "rext-p3-1", reservaId: "reserva-past-003", extraId: "extra-001", quantidade: 1 } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-p3-2" }, update: {}, create: { id: "rext-p3-2", reservaId: "reserva-past-003", extraId: "extra-002", quantidade: 1 } });
  await createEtapas("reserva-past-003", 6, 6, p1);

  // ═══════════════════════════════════════════════════════════
  // TODAY — CONCLUIDA (Leonor, Fada, Sala Arco-Íris) — morning
  // ═══════════════════════════════════════════════════════════
  const t0start = dateAt(todayDate, 9, 0);
  await prisma.reserva.upsert({
    where: { id: "reserva-today-conc-001" },
    update: {},
    create: {
      id: "reserva-today-conc-001",
      data: new Date(todayStr),
      horario: "09:00", duracaoMinutos: 120, numCriancas: 12, previsaoCriancas: 14,
      estado: "CONCLUIDA",
      inicioEm: t0start, fimPrevisto: addMin(t0start, 120), fimReal: addMin(t0start, 118),
      tema: "Fada", cor: "#A78BFA",
      bolo: "Bolo de cenoura com decoração de fadas",
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
  await prisma.reservaAniversariante.upsert({ where: { id: "ra-tc1" }, update: {}, create: { id: "ra-tc1", reservaId: "reserva-today-conc-001", aniversarianteId: "aniv-007" } });
  await prisma.reservaMonitor.upsert({ where: { id: "rm-tc1a" }, update: {}, create: { id: "rm-tc1a", reservaId: "reserva-today-conc-001", monitorId: "monitor-005" } });
  await prisma.reservaMonitor.upsert({ where: { id: "rm-tc1b" }, update: {}, create: { id: "rm-tc1b", reservaId: "reserva-today-conc-001", monitorId: "monitor-006" } });
  await prisma.menu.upsert({ where: { id: "menu-tc1" }, update: {}, create: { id: "menu-tc1", nome: "Menu Fada", preco: 11.00, notas: "Croissants, sumo, iogurte, bolo", reservaId: "reserva-today-conc-001" } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-tc1-1" }, update: {}, create: { id: "rext-tc1-1", reservaId: "reserva-today-conc-001", extraId: "extra-004", quantidade: 1 } });
  await createEtapas("reserva-today-conc-001", 6, 6, t0start);

  // ═══════════════════════════════════════════════════════════
  // TODAY — CONCLUIDA (Rodrigo, Robôs, Sala Azul) — finished 30min ago
  // ═══════════════════════════════════════════════════════════
  const tRobStart = dateAt(todayDate, 10, 0);
  const tRobEnd = addMin(tRobStart, 150);
  await prisma.reserva.upsert({
    where: { id: "reserva-today-conc-002" },
    update: {},
    create: {
      id: "reserva-today-conc-002",
      data: new Date(todayStr),
      horario: "10:00", duracaoMinutos: 150, numCriancas: 18, previsaoCriancas: 20,
      estado: "CONCLUIDA",
      inicioEm: tRobStart, fimPrevisto: tRobEnd, fimReal: addMin(now, -30),
      tema: "Robôs", cor: "#3B82F6",
      bolo: "Bolo de chocolate com decoração robô",
      observacoesGerais: "Rodrigo gosta de tecnologia e robôs.",
      observacoesLesoes: "Nuno é intolerante à lactose.",
      observacoesBrindes: "Mini-robôs de brincar para os meninos.",
      outrosExtras: "Oficina de robótica (30 min)",
      metodoPagamento: "TRANSFERENCIA", valorPago: 220.00, pago: true,
      caucao: "PAGA", referenciaPagamento: "IBAN PT50 1234 5678",
      cacifosHistorico: [
        { numero: 25, estado: "OCUPADO", criancas: "Rodrigo, Afonso" },
        { numero: 26, estado: "OCUPADO", criancas: "Simão, Gonçalo, Vasco" },
        { numero: 27, estado: "OCUPADO", criancas: "Nuno, Diogo" },
        { numero: 28, estado: "OCUPADO", criancas: "Martim, Samuel, Guilherme" },
        { numero: 29, estado: "OCUPADO", criancas: "Miguel, Carlos" },
        { numero: 30, estado: "OCUPADO", criancas: "Pedro, André, Luís" },
      ],
      clienteId: "cliente-007", localId: "local-001",
    },
  });
  await prisma.reservaAniversariante.upsert({ where: { id: "ra-tc2" }, update: {}, create: { id: "ra-tc2", reservaId: "reserva-today-conc-002", aniversarianteId: "aniv-008" } });
  await prisma.reservaMonitor.upsert({ where: { id: "rm-tc2a" }, update: {}, create: { id: "rm-tc2a", reservaId: "reserva-today-conc-002", monitorId: "monitor-001" } });
  await prisma.reservaMonitor.upsert({ where: { id: "rm-tc2b" }, update: {}, create: { id: "rm-tc2b", reservaId: "reserva-today-conc-002", monitorId: "monitor-003" } });
  await prisma.menu.upsert({ where: { id: "menu-tc2" }, update: {}, create: { id: "menu-tc2", nome: "Menu Robô", preco: 9.00, notas: "Pizza, pipocas, sumo, bolo", reservaId: "reserva-today-conc-002" } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-tc2-1" }, update: {}, create: { id: "rext-tc2-1", reservaId: "reserva-today-conc-002", extraId: "extra-003", quantidade: 1 } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-tc2-2" }, update: {}, create: { id: "rext-tc2-2", reservaId: "reserva-today-conc-002", extraId: "extra-006", quantidade: 18 } });
  await createEtapas("reserva-today-conc-002", 6, 6, tRobStart);

  // ═══════════════════════════════════════════════════════════
  // TODAY — EM_CURSO (Marta, Princesa, Sala Azul)
  // ═══════════════════════════════════════════════════════════
  const tEmCurso = dateAt(todayDate, 10, 0);
  await prisma.reserva.upsert({
    where: { id: "reserva-001" },
    update: {},
    create: {
      id: "reserva-001",
      data: new Date(todayStr),
      horario: "10:00", duracaoMinutos: 150, numCriancas: 18, previsaoCriancas: 20,
      estado: "EM_CURSO",
      inicioEm: tEmCurso, fimPrevisto: addMin(tEmCurso, 150),
      tema: "Princesa", cor: "#FF69B4",
      bolo: "Bolo de chocolate com coroa dourada",
      observacoesGerais: "Marta faz 8 anos. Gosta de cor-de-rosa. Sem restrições alimentares.",
      observacoesBrindes: "Sacos com pulseiras e adesivos.",
      outrosExtras: "Palhaçada ao início (15 min)",
      metodoPagamento: "MBWAY", valorPago: 175.00, pago: true,
      caucao: "PAGA",
      notas: "Marta faz 8 anos. Decoração cor-de-rosa.",
      clienteId: "cliente-001", localId: "local-001",
    },
  });
  await prisma.reservaAniversariante.upsert({ where: { id: "ra-001" }, update: {}, create: { id: "ra-001", reservaId: "reserva-001", aniversarianteId: "aniv-001" } });
  await prisma.reservaMonitor.upsert({ where: { id: "rm-001a" }, update: {}, create: { id: "rm-001a", reservaId: "reserva-001", monitorId: "monitor-001" } });
  await prisma.reservaMonitor.upsert({ where: { id: "rm-001b" }, update: {}, create: { id: "rm-001b", reservaId: "reserva-001", monitorId: "monitor-003" } });
  await prisma.menu.upsert({ where: { id: "menu-001" }, update: {}, create: { id: "menu-001", nome: "Menu Completo", preco: 8.50, notas: "Sumo, croissants, nuggets, bolo, pipocas", reservaId: "reserva-001" } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-001-1" }, update: {}, create: { id: "rext-001-1", reservaId: "reserva-001", extraId: "extra-004", quantidade: 1 } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-001-2" }, update: {}, create: { id: "rext-001-2", reservaId: "reserva-001", extraId: "extra-005", quantidade: 18 } });
  await prisma.reservaExtra.upsert({ where: { id: "rext-001-3" }, update: {}, create: { id: "rext-001-3", reservaId: "reserva-001", extraId: "extra-006", quantidade: 18 } });
  // Participantes: 15 presentes de 18, cacifos 1-15
  await createParticipantes("reserva-001", 18, 15, 1, false);
  // Etapas: 2/6 concluídas
  await createEtapas("reserva-001", 2, 6, tEmCurso);

  // ═══════════════════════════════════════════════════════════
  // TODAY — CONFIRMADO (Beatriz, Unicórnios, Sala Arco-Íris, 15h)
  // ═══════════════════════════════════════════════════════════
  await prisma.reserva.upsert({
    where: { id: "reserva-002" },
    update: {},
    create: {
      id: "reserva-002",
      data: new Date(todayStr),
      horario: "15:00", duracaoMinutos: 120, numCriancas: 22, previsaoCriancas: 25,
      estado: "CONFIRMADO",
      tema: "Unicórnios", cor: "#E8A0BF",
      bolo: "Bolo arco-íris com unicórnio no topo",
      observacoesGerais: "Beatriz quer decoração de unicórnios. Muito glitter!",
      observacoesLesoes: "Laura é alérgica a amendoim.",
      observacoesBrindes: "Mini-unicórnios de pelúcia para todos.",
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

  // ═══════════════════════════════════════════════════════════
  // TOMORROW — RESERVA (Francisco, Futebol, Sala Arco-Íris)
  // ═══════════════════════════════════════════════════════════
  const tomorrowStr = toDateStr(daysFromNow(1));
  await prisma.reserva.upsert({
    where: { id: "reserva-003" },
    update: {},
    create: {
      id: "reserva-003",
      data: new Date(tomorrowStr),
      horario: "14:00", duracaoMinutos: 120, numCriancas: 12, previsaoCriancas: 15,
      estado: "RESERVA",
      tema: "Futebol", cor: "#16A34A",
      bolo: "Bolo em formato de bola de futebol",
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
    create: {
      id: "reserva-future-001",
      data: new Date(future3Str),
      horario: "10:00", duracaoMinutos: 150, numCriancas: 16, previsaoCriancas: 18,
      estado: "CONFIRMADO",
      tema: "Super-Heróis", cor: "#1E40AF",
      bolo: "Bolo com logo dos Vingadores",
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
  // ═══════════════════════════════════════════════════════════
  const future5Str = toDateStr(daysFromNow(5));
  await prisma.reserva.upsert({
    where: { id: "reserva-future-002" },
    update: {},
    create: {
      id: "reserva-future-002",
      data: new Date(future5Str),
      horario: "15:00", duracaoMinutos: 120, numCriancas: 10, previsaoCriancas: 12,
      estado: "RESERVA",
      tema: "Safari", cor: "#D97706",
      bolo: "Bolo com animais da selva",
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
      horario: "10:00", duracaoMinutos: 90, numCriancas: 10, previsaoCriancas: 12,
      estado: "RESERVA",
      tema: "Sereia", cor: "#06B6D4",
      bolo: "Bolo oceano com sereia",
      observacoesGerais: "Mariana adora o mar e sereias.",
      metodoPagamento: "CARTAO", valorPago: 0, pago: false,
      caucao: "NAO_PAGA",
      clienteId: "cliente-008", localId: "local-003",
    },
  });
  await prisma.reservaAniversariante.upsert({ where: { id: "ra-f3" }, update: {}, create: { id: "ra-f3", reservaId: "reserva-future-003", aniversarianteId: "aniv-009" } });
  await prisma.menu.upsert({ where: { id: "menu-f3" }, update: {}, create: { id: "menu-f3", nome: "Menu Pequeno", preco: 6.00, notas: "Sumo e bolo", reservaId: "reserva-future-003" } });

  console.log("  ✓ 10 reservas (4 passadas, 1 em curso, 1 confirmado hoje, 4 futuras)");
  console.log("  ✓ Menus, extras, participantes, etapas para todas\n");
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

// ─── Run ──────────────────────────────────────────────────────
main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error("❌ Dev seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });