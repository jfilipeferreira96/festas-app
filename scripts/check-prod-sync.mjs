#!/usr/bin/env node
/**
 * check-prod-sync.mjs - Verifica (SÓ DE LEITURA) se a BD remota está
 * sincronizada com o packages/db/prisma/schema.prisma atual.
 *
 * Usa `prisma migrate diff` para comparar:
 *   from = BD remota introspectada (baselandia_prod | baselandia_test)
 *   to   = schema.prisma local
 *
 * NÃO altera nada na BD - apenas lê/introspecta.
 *
 * Uso:
 *   node scripts/check-prod-sync.mjs prod     (default)
 *   node scripts/check-prod-sync.mjs test
 *
 * Exit codes: 0 = sincronizada | 2 = diferenças (SQL impresso) | 1 = erro
 */
import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PROD = resolve(__dirname, "..", "apps", "web", ".env.production");
const SCHEMA = resolve(__dirname, "..", "packages", "db", "prisma", "schema.prisma");
const DB_PKG = resolve(__dirname, "..", "packages", "db");

config({ path: ENV_PROD });

const PUBLIC_HOST = process.env.REMOTE_DB_HOST || "185.32.188.42";
const base = process.env.DATABASE_URL;

if (!base) {
  console.error("❌ DATABASE_URL não encontrado em apps/web/.env.production");
  process.exit(1);
}

// Mesma lógica de remote-db.mjs: reescreve host para o IP público + nome da BD.
const target = (process.argv[2] || "prod").toLowerCase() === "test" ? "test" : "prod";
const dbName = target === "test" ? "baselandia_test" : "baselandia_prod";
const remoteUrl = base.replace(/@[^:/]+:\d+/, `@${PUBLIC_HOST}:3306`).replace(/\/[A-Za-z0-9_]+$/, `/${dbName}`);

// Schema mínimo para --from-schema-datasource: a URL vem do ambiente,
// nunca na linha de comandos (evita vazamento de credenciais no histórico).
const tmp = mkdtempSync(join(tmpdir(), "prisma-diff-"));
const fromSchema = join(tmp, "from.prisma");
writeFileSync(fromSchema, `datasource db {\n  provider = "mysql"\n  url      = env("REMOTE_CHECK_URL")\n}\n`);

console.log(`🔍 A comparar packages/db/prisma/schema.prisma  ↔  ${dbName} @ ${PUBLIC_HOST} (só de leitura)...\n`);

const res = spawnSync(`npx prisma migrate diff --from-schema-datasource "${fromSchema}" --to-schema-datamodel "${SCHEMA}" --script --exit-code`, {
  cwd: DB_PKG,
  encoding: "utf8",
  shell: true,
  env: { ...process.env, REMOTE_CHECK_URL: remoteUrl },
});

rmSync(tmp, { recursive: true, force: true });

if (res.status === 0) {
  console.log(`✅ BD remota (${dbName}) está ATUALIZADA - sincronizada com o schema.prisma.`);
  process.exit(0);
}

if (res.status === 2) {
  console.log(`⚠️  DIFERENÇAS DETETADAS - a BD remota (${dbName}) NÃO está atualizada.\n`);
  console.log("SQL que o `npm run db:push:remote` aplicaria:\n");
  console.log(res.stdout || "(sem output)");
  if (res.stderr && res.stderr.trim()) console.error(res.stderr);
  process.exit(2);
}

console.error(`❌ Falha ao comparar (exit ${res.status}):`);
console.error(res.stderr || res.stdout || "(sem output)");
console.error("\nPossíveis causas: IP não whitelistado (cPanel → Remote MySQL) ou BD inacessível.");
process.exit(res.status ?? 1);
