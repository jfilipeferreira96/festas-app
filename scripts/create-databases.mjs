/**
 * Cria as bases de dados lógicas no MySQL LOCAL (XAMPP) — root sem password.
 *   - baselandia_prod  → base de dados principal de desenvolvimento (espelha o esquema de produção)
 *   - baselandia_test  → base de dados de testes (vitest)
 *
 * Usa mysql2 (sem a restrição P3004 do Prisma) e liga-se sem seleccionar uma
 * base de dados, pelo que consegue executar CREATE DATABASE sem problemas.
 *
 * Uso: node scripts/create-databases.mjs
 */
import mysql from "mysql2/promise";

const DBS = ["baselandia_prod", "baselandia_test"];

const conn = await mysql.createConnection({
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  // sem password (predefinição do XAMPP)
});

console.log("Ligado ao MySQL local (XAMPP) como root.\n");
for (const db of DBS) {
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log(`✅ Base de dados garantida: ${db}`);
}
await conn.end();
console.log("\nFeito — separação lógica criada (prod + test).");
