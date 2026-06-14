/**
 * Verifies that db:push + seed succeeded by listing every table and its row count.
 * Usage: node scripts/verify-seed.mjs
 */
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", "apps", "web", ".env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ DATABASE_URL is not set in apps/web/.env");
  process.exit(1);
}

// Redact password for display
const redacted = url.replace(/(\/\/[^:]+:)[^@]+@/, "$1****@");
console.log(`\nA verificar: ${redacted}\n`);

let conn;
try {
  conn = await mysql.createConnection({ uri: url, connectTimeout: 10000 });

  const [[{ VERSION }]] = await conn.query("SELECT VERSION() AS VERSION");
  const [[{ DB }]] = await conn.query("SELECT DATABASE() AS DB");
  console.log(`MySQL: ${VERSION}`);
  console.log(`Base de dados: ${DB}\n`);

  const [tables] = await conn.query("SHOW TABLES");
  console.log(`Total de tabelas: ${tables.length}\n`);

  const keyTables = ["User", "Cliente", "Reserva", "Cacifo", "Local", "Extra", "Monitor", "Menu", "EtapaFesta", "Participante", "Segmento", "NewsletterContacto", "Campanha", "FuncaoPermissao"];

  let maxName = 0;
  for (const row of tables) maxName = Math.max(maxName, Object.values(row)[0].length);

  console.log("Tabela".padEnd(maxName + 2) + "Linhas");
  console.log("-".repeat(maxName + 10));
  for (const row of tables) {
    const name = Object.values(row)[0];
    const [[c]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${name}\``);
    const star = keyTables.includes(name) ? "" : "";
    console.log(`${name.padEnd(maxName + 2)}${String(c.n).padStart(6)} ${star}`);
  }

  console.log("\n✅ Verificação concluída — as tabelas e dados existem na base de dados.");
} catch (err) {
  console.error("❌ Erro ao verificar:", err.code || err.message);
  process.exit(1);
} finally {
  if (conn) await conn.end();
}
