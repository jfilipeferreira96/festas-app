// scripts/deploy-db.js - launcher de comandos de BD para cPanel (CommonJS)
// -----------------------------------------------------------------------------
// Copiado para deploy/scripts/db.js por scripts/build-deploy.mjs.
//
// Resolve módulos de node_modules_deps (compat. CloudLinux) via NODE_PATH,
// carrega apps/web/.env e despacha:
//   seed      → admin + RBAC + cacifos (idempotente)
//   verify    → tabelas + contagem de linhas
//   truncate  → apagar TODOS os dados (mantém tabelas) [--keep-auth preserva auth]
//   reset     → truncate + seed (recria o admin)
//
// Uso (cPanel, via SSH ou "Run NPM Script"):
//   node scripts/db.js seed
//   npm run db:verify
//   npm run db:truncate --keep-auth
// -----------------------------------------------------------------------------
const fs = require("fs");
const path = require("path");
const Module = require("module");

const here = __dirname;
const appRoot = path.join(here, "..");

// --- NODE_PATH → node_modules_deps (a pasta foi renomeada para compat. CloudLinux) ---
process.env.NODE_PATH = path.join(appRoot, "node_modules_deps");
Module._initPaths();

// --- carregar apps/web/.env manualmente (sem dependências) ---
// Vars já definidas no ambiente (ex.: UI do cPanel) NÃO são sobrescritas.
const envPath = path.join(appRoot, "apps", "web", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL não definido. Confirma apps/web/.env ou as variáveis de ambiente do cPanel.");
  process.exit(1);
}

const command = process.argv[2];

// --- Driver adapter (mariadb) - mesma lógica de packages/db/src/mariadb-adapter.ts ---
// A engine Rust do Prisma criava ~64 threads (1 por CPU do host) contadas no
// limite nproc=100 do CloudLinux. Com o adapter, queries em JS puro.
// CJS inline porque este script corre no cPanel sem TS/tsx.
function mariadbConfigFromUrl(raw) {
  const u = new URL(raw);
  const q = Number(u.searchParams.get("connection_limit"));
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\/+/, ""),
    connectionLimit: Number.isFinite(q) && q > 0 ? q : 5,
    connectTimeout: 10000,
  };
}

function getPrisma() {
  const { PrismaClient } = require("@prisma/client");
  const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
  return new PrismaClient({
    adapter: new PrismaMariaDb(mariadbConfigFromUrl(process.env.DATABASE_URL)),
    log: ["warn", "error"],
  });
}

// Mostra a BD com a password redigida (confirmação visual).
function showDb() {
  const url = process.env.DATABASE_URL || "";
  const redacted = url.replace(/(\/\/[^:]+:)[^@]+@/, "$1****@");
  console.log("🎯 BD: " + redacted + "\n");
}

async function cmdSeed() {
  showDb();
  console.log("🌱 A correr seed mínimo (admin + RBAC + cacifos)...\n");
  // O bundle seed-prod.js corre a sua main() ao ser required.
  require("./seed-prod.js");
}

async function cmdVerify() {
  showDb();
  const prisma = getPrisma();
  try {
    const tables = await prisma.$queryRawUnsafe("SHOW TABLES");
    const names = tables.map((r) => Object.values(r)[0]);
    const maxLen = names.reduce((m, n) => Math.max(m, String(n).length), 0);
    console.log("Total de tabelas: " + names.length + "\n");
    console.log("Tabela".padEnd(maxLen + 2) + "Linhas");
    console.log("-".repeat(maxLen + 10));
    for (const n of names) {
      const c = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM \`${n}\``);
      console.log(String(n).padEnd(maxLen + 2) + String(c[0].n).padStart(6));
    }
    console.log("\n✅ Verificação concluída.");
  } finally {
    await prisma.$disconnect();
  }
}

const AUTH_TABLES = ["user", "session", "account", "verification"];

async function cmdTruncate(keepAuth) {
  showDb();
  const scope = keepAuth ? " EXCETO tabelas de auth (user/session/account/verification)." : " de TODAS as tabelas.";
  console.warn("⚠️  ATENÇÃO: apagar TODOS os dados" + scope + "\n");

  const prisma = getPrisma();
  try {
    const rows = await prisma.$queryRawUnsafe("SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'");
    const names = rows.map((r) => r.t).filter((n) => !keepAuth || !AUTH_TABLES.includes(String(n).toLowerCase()));

    // Tudo numa transacção interactiva → mesma ligação → FK_CHECKS persiste.
    // Usa DELETE (DML) em vez de TRUNCATE (DDL faz commit implícito e quebra a tx).
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
      for (const n of names) {
        await tx.$executeRawUnsafe(`DELETE FROM \`${n}\``);
        console.log("  delete: " + n);
      }
      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
    });

    console.log("\n✅ Dados apagados (" + names.length + " tabelas). Schema intacto.");
    console.log("   (O AUTO_INCREMENT não é reiniciado - para reiniciar usa db:reset.)");
  } finally {
    await prisma.$disconnect();
  }
}

(async () => {
  try {
    if (command === "seed") {
      await cmdSeed();
    } else if (command === "verify") {
      await cmdVerify();
    } else if (command === "truncate") {
      const keepAuth = process.argv.includes("--keep-auth");
      await cmdTruncate(keepAuth);
    } else if (command === "reset") {
      await cmdTruncate(false);
      console.log("\n--- a correr seed ---\n");
      await cmdSeed();
    } else {
      console.error("❌ Comando desconhecido: " + command);
      console.error("   Disponíveis: seed | truncate [--keep-auth] | reset | verify");
      process.exit(1);
    }
  } catch (e) {
    console.error("❌ Erro:", e && e.message ? e.message : e);
    process.exit(1);
  }
})();
