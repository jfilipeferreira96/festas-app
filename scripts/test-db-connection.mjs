// scripts/test-db-connection.mjs
// Testa a ligação MySQL definida por DATABASE_URL (apps/web/.env).
// Uso:  node scripts/test-db-connection.mjs

import { config } from "dotenv";
import { resolve } from "path";
import mysql from "mysql2/promise";

// Carregar .env: apps/web/.env primeiro, raiz .env como fallback
config({ path: resolve(process.cwd(), "apps/web/.env") });
config({ path: resolve(process.cwd(), ".env") });

const uri = process.env.DATABASE_URL;
if (!uri) {
  console.error("❌ DATABASE_URL não definido. Verifica apps/web/.env.");
  process.exit(1);
}

// Log redigido (esconde a password)
console.log("URL (redigido):", uri.replace(/:[^:@/]+@/, ":****@"));

let info;
try {
  info = new URL(uri);
} catch (e) {
  console.error("❌ DATABASE_URL inválido:", e.message);
  process.exit(1);
}

console.log(` → Host         : ${info.hostname}:${info.port || 3306}`);
console.log(` → Base de dados: ${info.pathname.replace(/^\//, "")}`);
console.log(` → Utilizador   : ${info.username}`);
console.log("A tentar ligar (timeout 10s)...\n");

const cfg = {
  host: info.hostname,
  port: Number(info.port) || 3306,
  user: decodeURIComponent(info.username),
  password: decodeURIComponent(info.password),
  database: info.pathname.replace(/^\//, ""),
  connectTimeout: 10000,
};

let conn;
try {
  conn = await mysql.createConnection(cfg);
  const [[ver]] = await conn.execute("SELECT VERSION() AS v, CURRENT_USER() AS u, DATABASE() AS d");
  console.log("✅ Ligação estabelecida com sucesso!");
  console.log("   Versão MySQL :", ver.v);
  console.log("   Utilizador   :", ver.u);
  console.log("   Base de dados:", ver.d);

  const [tables] = await conn.execute("SHOW TABLES");
  console.log(`   Tabelas      : ${tables.length}`);
} catch (err) {
  console.error("❌ Falha na ligação:", err.code || err.errno || err.message);
  switch (err.code) {
    case "ETIMEDOUT":
    case "ECONNREFUSED":
    case "ENOTFOUND":
    case "EHOSTUNREACH":
      console.error("   → Causa provável: host/porta incorretos OU acesso remoto bloqueado.");
      console.error("     No cPanel vai a 'Remote MySQL®' e adiciona o teu IP público (ou '%').");
      break;
    case "ER_ACCESS_DENIED_ERROR":
      console.error("   → Credenciais inválidas, OU o user não tem privilégios sobre esta BD.");
      break;
    case "ER_BAD_DB_ERROR":
      console.error("   → A base de dados não existe. Cria-a no cPanel (MySQL® Databases).");
      break;
    default:
      console.error("   → Código inesperado. Verifica os detalhes acima.");
  }
  process.exit(1);
} finally {
  if (conn) await conn.end();
}
