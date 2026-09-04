/**
 * Factory do PrismaClient com DRIVER ADAPTER (mariadb).
 * -----------------------------------------------------------------------------
 * Substitui a engine Rust do Prisma (binário nativo) por um driver JavaScript
 * (@prisma/adapter-mariadb + mariadb). Motivo: no cPanel/CloudLinux, a engine
 * Rust criava ~1 thread por CPU visível (nproc=64 no servidor → 64 threads),
 * que eram contadas no limite de processos do LVE (nproc=100) e causavam
 * "Unable to fork". Com o adapter, as queries correm em JS puro sobre o event
 * loop - zero threads extra. Ver plans/diagnostico-processos-cpanel.md.
 *
 * A biblioteca `mariadb` é um CLIENTE JavaScript (como a mysql2): não instala
 * nada no servidor e liga-se a servidores MySQL/MariaDB via protocolo MySQL,
 * sem qualquer alteração à DATABASE_URL.
 *
 * Usado por:
 *   - src/index.ts            (singleton da app)
 *   - prisma/seed-*.ts        (seeds via tsx)
 *   - apps/web/__tests__/helpers/test-prisma.ts (via subpath @festas/db/mariadb-adapter)
 *   - scripts/deploy-db.js    (cPanel, versão CJS inline)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import type { PoolConfig } from "mariadb";

/** Níveis de log aceites pelo PrismaClient. */
export type PrismaLogLevel = "info" | "query" | "warn" | "error";

export interface CreatePrismaClientOptions {
  /** Nº máximo de ligações no pool (default 5 - MySQL partilhado do cPanel). */
  connectionLimit?: number;
  /** Timeout (ms) para obter uma ligação do pool (default 10s). */
  acquireTimeout?: number;
  /** Log do Prisma (default: ["warn", "error"]). */
  log?: PrismaLogLevel[];
}

/** Config do pool mariadb construída a partir de uma mysql:// URL. */
export function buildMariaDbConfig(url: string, options: CreatePrismaClientOptions = {}): PoolConfig {
  const u = new URL(url);

  // O build-deploy garante ?connection_limit=5&pool_timeout=10 na .env de
  // produção; honramos esses parâmetros quando presentes.
  const urlLimit = Number(u.searchParams.get("connection_limit"));
  const urlPoolTimeout = Number(u.searchParams.get("pool_timeout")); // segundos

  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\/+/, ""),
    connectionLimit:
      options.connectionLimit ?? (Number.isFinite(urlLimit) && urlLimit > 0 ? urlLimit : 5),
    acquireTimeout:
      options.acquireTimeout ??
      (Number.isFinite(urlPoolTimeout) && urlPoolTimeout > 0 ? urlPoolTimeout * 1000 : 10_000),
    connectTimeout: 10_000,
    // O Prisma gere transações/datas ele próprio - nada de timezone no driver.
  };
}

/**
 * Cria um PrismaClient ligado via driver adapter (JS puro, sem engine Rust).
 *
 * Com `previewFeatures = ["driverAdapters"]` no schema, o adapter é OBRIGATÓRIO
 * no construtor - TODAS as instanciações de PrismaClient têm de passar por aqui.
 * O Prisma é dono do pool: `$disconnect()` fecha-o.
 */
export function createPrismaClient(url: string, options: CreatePrismaClientOptions = {}): PrismaClient {
  if (!url) {
    throw new Error("createPrismaClient: URL da base de dados vazia (verifica DATABASE_URL).");
  }

  const adapter = new PrismaMariaDb(buildMariaDbConfig(url, options));

  return new PrismaClient({
    adapter,
    log: options.log ?? ["warn", "error"],
  });
}
