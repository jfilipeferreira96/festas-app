// scripts/deploy-db.js - launcher de comandos de BD para cPanel (CommonJS)
// -----------------------------------------------------------------------------
// Copiado para deploy/scripts/db.js por scripts/build-deploy.mjs.
//
// Resolve módulos de node_modules_deps (compat. CloudLinux) via NODE_PATH,
// carrega apps/web/.env e despacha:
//   seed        → admin + RBAC + cacifos (idempotente)
//   verify      → tabelas + contagem de linhas
//   truncate    → apagar TODOS os dados (mantém tabelas) [--keep-auth preserva auth]
//   reset       → truncate + seed (recria o admin)
//   sync-schema → aplicar prisma/schema-diff.sql (gerado no PC pelo build-deploy)
//                 de forma IDEMPOTENTE: instruções já aplicadas são ignoradas.
//                 É o passo que garante o sync do schema em TODO o deploy.
//
// Uso (cPanel, via SSH ou "Run NPM Script"):
//   node scripts/db.js seed
//   node scripts/db.js sync-schema
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

// ── sync-schema: aplicar prisma/schema-diff.sql (idempotente) ───────────────
// O build-deploy.mjs gera o diff (estado real da BD remota ↔ schema.prisma)
// ANTES de empacotar e inclui-o no bundle. Assim o schema fica sincronizado
// MESMO quando o push a partir do PC falha (ex.: IP não whitelistado).
//
// MySQL errno tolerados ("já aplicado" → skip):
//   1050 ER_TABLE_EXISTS_ERROR   1054 ER_BAD_FIELD_ERROR (drop já feito)
//   1060 ER_DUP_FIELDNAME        1061 ER_DUP_KEYNAME
//   1091 ER_CANT_DROP_FIELD_OR_KEY
const TOLERATED_ERRNOS = new Set([1050, 1054, 1060, 1061, 1091]);

function splitSqlStatements(sql) {
  return sql
    .split(/\r?\n/)
    .filter((line) => !/^\s*--/.test(line)) // remover comentários do migrate diff
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function cmdSyncSchema() {
  showDb();
  const prismaDir = path.join(appRoot, "prisma");
  const diffPath = path.join(prismaDir, "schema-diff.sql");
  const fullPath = path.join(prismaDir, "schema-full.sql");

  const hasDiff = fs.existsSync(diffPath) && fs.statSync(diffPath).size > 0;
  const hasFull = fs.existsSync(fullPath) && fs.statSync(fullPath).size > 0;

  if (!hasDiff && !hasFull) {
    console.log("ℹ️  Sem prisma/schema-diff.sql nem schema-full.sql no bundle - nada a aplicar.");
    console.log("   (O schema é sincronizado no PC: npm run deploy → remote-db push prod.)");
    return;
  }

  // Ligação direta via driver mariadb (mesmo adapter do app, já no bundle) -
  // a BD é LOCALHOST no servidor, não precisa de whitelist nenhuma.
  const mariadb = require("mariadb");
  const cfg = mariadbConfigFromUrl(process.env.DATABASE_URL);
  const conn = await mariadb.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
  });

  let applied = 0;
  let skipped = 0;
  const tryApply = async (st) => {
    const label = st.replace(/\s+/g, " ").slice(0, 90);
    try {
      await conn.query(st);
      applied++;
      console.log("  ok  : " + label);
    } catch (e) {
      if (TOLERATED_ERRNOS.has(e.errno)) {
        skipped++;
        console.log("  skip: " + label + "  (já aplicado)");
      } else {
        console.error("  ERRO: " + label);
        throw e;
      }
    }
  };

  try {
    // 1) DIFF INCREMENTAL (gerado no PC quando este conseguiu ler a BD remota)
    if (hasDiff) {
      const statements = splitSqlStatements(fs.readFileSync(diffPath, "utf8"));
      if (statements.length > 0) {
        console.warn("⚠️  SYNC: a aplicar diff incremental (" + statements.length + " instrução(ões))...\n");
        for (const st of statements) await tryApply(st);
      } else {
        console.log("✅ Diff incremental vazio - sem alterações pendentes.");
      }
    }

    // 2) SCHEMA COMPLETO em modo ESPERTO: cria tabelas em falta e adiciona
    //    colunas em falta a tabelas existentes (lendo information_schema).
    //    Funciona SEMPRE - o schema-full.sql é gerado offline no PC.
    if (hasFull) {
      const ddl = splitSqlStatements(fs.readFileSync(fullPath, "utf8")).filter((s) => /^CREATE TABLE/i.test(s));
      console.warn("\n⚠️  SYNC: a validar " + ddl.length + " tabelas do schema (modo completo)...\n");
      for (const st of ddl) {
        const m = /CREATE TABLE `?(\w+)`?/i.exec(st);
        if (!m) continue;
        const table = m[1];
        const existsRows = await conn.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?", [table]);
        if (Number(existsRows[0].n) === 0) {
          console.log("  + tabela nova: " + table);
          await tryApply(st);
          continue;
        }
        // Tabela existe → garantir colunas em falta
        const body = st.slice(st.indexOf("(") + 1, st.lastIndexOf(")"));
        const colDefs = body
          .split(/\r?\n/)
          .map((l) => l.trim().replace(/,$/, ""))
          .filter((l) => /^`/.test(l)); // definições de coluna começam por `nome`
        const colRows = await conn.query("SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?", [table]);
        const existing = new Set(colRows.map((r) => String(r.column_name).toLowerCase()));
        for (const def of colDefs) {
          const colName = /^`([^`]+)`/.exec(def);
          if (!colName || existing.has(colName[1].toLowerCase())) continue;
          console.log("  + coluna nova em " + table + ": " + colName[1]);
          await tryApply("ALTER TABLE `" + table + "` ADD COLUMN " + def);
        }
      }
    }
  } finally {
    await conn.end();
  }
  console.log("\n✅ Schema sincronizado (" + applied + " aplicadas, " + skipped + " já existentes).");
}

(async () => {
  try {
    if (command === "seed") {
      await cmdSeed();
    } else if (command === "sync-schema") {
      await cmdSyncSchema();
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
      console.error("   Disponíveis: seed | sync-schema | truncate [--keep-auth] | reset | verify");
      process.exit(1);
    }
  } catch (e) {
    console.error("❌ Erro:", e && e.message ? e.message : e);
    process.exit(1);
  }
})();
