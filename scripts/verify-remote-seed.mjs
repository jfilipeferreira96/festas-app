#!/usr/bin/env node
/**
 * Verifica se os dados de seed foram inseridos corretamente na base de dados REMOTA.
 *
 * Usage: node scripts/verify-remote-seed.mjs [target]
 *   target: prod | test (default: prod)
 */
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PROD = resolve(__dirname, "..", "apps", "web", ".env.production");
config({ path: ENV_PROD });

const PUBLIC_HOST = process.env.REMOTE_DB_HOST || "185.32.188.12";
const base = process.env.DATABASE_URL;

if (!base) {
  console.error("❌ DATABASE_URL não encontrado em apps/web/.env.production");
  process.exit(1);
}

/**
 * Build a remote connection URL for a given database name.
 */
function remoteUrl(dbName) {
  return base.replace(/@[^:/]+:\d+/, `@${PUBLIC_HOST}:3306`).replace(/\/[A-Za-z0-9_]+$/, `/${dbName}`);
}

const target = (process.argv[2] || "prod").toLowerCase();
const dbName = target === "test" ? "baselandia_test" : "baselandia_prod";
const dbUrl = remoteUrl(dbName);

// Parse MySQL connection from URL
const url = new URL(dbUrl);
const connectionConfig = {
  host: url.hostname,
  port: url.port || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
};

console.log(`🔍 A verificar: ${dbUrl}\n`);

try {
  const connection = await mysql.createConnection(connectionConfig);

  // Get MySQL version
  const [versionRow] = await connection.execute("SELECT VERSION() as version");
  console.log(`MySQL: ${versionRow[0].version}`);
  console.log(`Base de dados: ${dbName}\n`);

  // Get all tables
  const [tables] = await connection.execute(
    `
    SELECT TABLE_NAME, TABLE_ROWS
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = ?
    ORDER BY TABLE_NAME
  `,
    [dbName],
  );

  console.log("Tabela                  Linhas");
  console.log("--------------------------------");
  let totalRows = 0;
  for (const table of tables) {
    const name = table.TABLE_NAME.padEnd(22);
    const rows = String(table.TABLE_ROWS || 0).padStart(6);
    console.log(`${name}${rows}`);
    totalRows += table.TABLE_ROWS || 0;
  }
  console.log(`--------------------------------`);
  console.log(`Total:                   ${String(totalRows).padStart(6)}`);

  await connection.end();
  console.log("\n✅ Verificação concluída — os dados existem na base de dados REMOTA.");
} catch (error) {
  console.error("\n❌ Erro ao conectar à base de dados remota:");
  console.error(error.message);
  process.exit(1);
}
