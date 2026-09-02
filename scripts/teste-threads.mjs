#!/usr/bin/env node
/**
 * teste-threads.mjs — prova empírica: o driver adapter elimina as threads tokio?
 *
 * Cria um PrismaClient (com adapter mariadb), corre uma query e conta as
 * threads do processo. Critério (cPanel nproc=100):
 *   ~10-15 threads → engine Rust NÃO carregou (fix válido)
 *   ~70+ threads   → engine Rust ainda carrega (falta engineType="client")
 */
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", "apps", "web", ".env") });

const url = process.env.DATABASE_URL_LOCAL_PROD || process.env.DATABASE_URL;
console.log("BD:", url.replace(/\/\/([^:]+):[^@]+@/, "//$1:****@"));

const { createPrismaClient } = await import("@festas/db/mariadb-adapter");
const prisma = createPrismaClient(url);

const countThreads = (label) => {
  if (process.platform === "win32") {
    const out = execSync(`powershell -Command "(Get-Process -Id ${process.pid}).Threads.Count"`).toString().trim();
    console.log(`threads [${label}]: ${out}`);
  } else {
    const out = execSync(`ls /proc/${process.pid}/task | wc -l`).toString().trim();
    console.log(`threads [${label}]: ${out}`);
  }
};

countThreads("antes da 1ª query");
const users = await prisma.user.count();
console.log("user.count:", users);
countThreads("depois da 1ª query");

const locais = await prisma.local.findMany({ take: 3 });
console.log("locais:", locais.length);
countThreads("depois de findMany");

await prisma.$disconnect();
countThreads("depois de $disconnect");
process.exit(0);
