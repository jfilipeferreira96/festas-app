#!/usr/bin/env node
/**
 * Run any db.js command against the REMOTE cPanel MySQL databases.
 *
 * Usage:  node scripts/remote-db.mjs <command> [target]
 *   command: push | push:force | seed:prod | seed:dev | generate | verify ...
 *   target:  prod | test   (default: prod)
 *
 * Examples:
 *   node scripts/remote-db.mjs push prod        # create tables on remote prod
 *   node scripts/remote-db.mjs push test        # create tables on remote test
 *   node scripts/remote-db.mjs seed:prod prod   # minimal seed (admin+RBAC+cacifos) on remote prod
 *   node scripts/remote-db.mjs seed:dev test    # full demo dataset on remote test
 *
 * Reads the remote connection string from apps/web/.env.production (DATABASE_URL),
 * then rewrites the host from "localhost" to the public host for remote access.
 * Override the public host with REMOTE_DB_HOST (default: 185.32.188.42).
 *
 * NOTE: requires the connecting IP to be whitelisted in cPanel -> "Remote MySQL".
 */
import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PROD = resolve(__dirname, "..", "apps", "web", ".env.production");
config({ path: ENV_PROD });

const PUBLIC_HOST = process.env.REMOTE_DB_HOST || "185.32.188.42";
const base = process.env.DATABASE_URL;

if (!base) {
  console.error("❌ DATABASE_URL não encontrado em apps/web/.env.production");
  process.exit(1);
}

/**
 * Build a remote connection URL for a given database name.
 *
 * The .env.production may use "localhost" or "127.0.0.1" as host (for in-server
 * access). We rewrite ANY host:port to the public host so we can connect remotely.
 * Matches: @localhost:3306 | @127.0.0.1:3306 | @185.32.188.42:3306
 * The host segment excludes ":" and "/" so the password (which may contain dots)
 * is never touched.
 */
function remoteUrl(dbName) {
  return base.replace(/@[^:/]+:\d+/, `@${PUBLIC_HOST}:3306`).replace(/\/[A-Za-z0-9_]+$/, `/${dbName}`);
}

// Parse args: <command> [target]  (ignore any --flags)
const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const cmd = positional[0] || "push";
const target = (positional[1] || "prod").toLowerCase();
const tgt = target === "test" ? "test" : "prod";

// Set env BEFORE spawning db.js. db.js loads apps/web/.env (local) via dotenv,
// but dotenv never overrides vars that are already set, so our remote URLs win.
process.env.DATABASE_URL = remoteUrl("baselandia_prod");
process.env.DATABASE_URL_TEST = remoteUrl("baselandia_test");

const shown = String(tgt === "test" ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL) ?? "";
console.log(`🌐 BD remoto (${tgt}): ${shown.replace(/:[^:@/]+@/, ":****@")}\n`);

const dbJs = resolve(__dirname, "..", "packages", "db", "scripts", "db.js");
const result = spawnSync(process.execPath, [dbJs, cmd, `--target=${tgt}`], {
  stdio: "inherit",
  env: { ...process.env },
});

process.exit(result.status ?? 1);
