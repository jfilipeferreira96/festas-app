/**
 * Cross-platform database operations script for Prisma.
 * Works identically on Windows and Linux/macOS.
 *
 * Usage: node scripts/db.js <command>
 * Commands: generate, push, push:force, migrate, studio, reset, clean, seed
 */

import { execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readdirSync, rmSync } from "node:fs";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_ROOT = resolve(__dirname, "..");
const SCHEMA = join(DB_ROOT, "prisma", "schema.prisma");
const MIGRATIONS_DIR = join(DB_ROOT, "prisma", "migrations");
const ENV_FILE = resolve(DB_ROOT, "..", "..", "apps", "server", ".env");

// Load env with ABSOLUTE path — ensures DATABASE_URL is always available
if (existsSync(ENV_FILE)) {
  dotenv.config({ path: ENV_FILE });
} else {
  console.warn(`⚠️  Warning: .env file not found at ${ENV_FILE}`);
  console.warn("   Falling back to system environment variables.");
}

if (!process.env.DATABASE_URL) {
  console.error("❌ Error: DATABASE_URL is not set.");
  console.error("   Make sure it exists in apps/server/.env or in your environment.");
  process.exit(1);
}

const command = process.argv[2];

if (!command) {
  console.error("❌ Usage: node scripts/db.js <command>");
  console.error("   Commands: generate, push, push:force, migrate, studio, reset, clean, seed, seed:dev");
  process.exit(1);
}

/**
 * Execute a shell command with the correct CWD and environment.
 * Uses process.env so the loaded DATABASE_URL is available to Prisma.
 */
function run(cmd) {
  const isWin = process.platform === "win32";
  const shell = isWin ? "cmd.exe" : undefined;

  console.log(`\n▶ Running: ${cmd}\n`);
  execSync(cmd, {
    stdio: "inherit",
    cwd: DB_ROOT,
    env: { ...process.env },
    shell,
  });
}

/**
 * Get the Prisma CLI command.
 */
function prisma(args) {
  return `npx prisma ${args}`;
}

/**
 * Check if migrations directory has valid migration files.
 * Returns true if at least one migration.sql exists.
 */
function hasValidMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) return false;

  try {
    const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());

    return dirs.some((d) => {
      const migrationFile = join(MIGRATIONS_DIR, d.name, "migration.sql");
      return existsSync(migrationFile);
    });
  } catch {
    return false;
  }
}

/**
 * Delete all migration directories (keeps the migrations folder itself).
 * Useful when migrations are corrupted or when doing a full reset.
 */
function cleanMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) return;

  const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const d of dirs) {
    const dirPath = join(MIGRATIONS_DIR, d.name);
    console.log(`   Removing migration: ${d.name}`);
    rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * Drop stale "_old" enum types that Prisma leaves behind after failed enum alterations.
 * These block subsequent `db push` attempts with "cannot drop type X_old because other objects depend on it".
 */
function cleanStaleEnums() {
  const sqlFile = join(DB_ROOT, "scripts", "fix-enum.sql");
  if (!existsSync(sqlFile)) return;

  console.log("   Cleaning stale enum types...");
  try {
    execSync(prisma(`db execute --schema "${SCHEMA}" --file "${sqlFile}"`), {
      stdio: "pipe",
      cwd: DB_ROOT,
      env: { ...process.env },
      shell: process.platform === "win32" ? "cmd.exe" : undefined,
    });
    console.log("   ✅ Stale enum types cleaned.\n");
  } catch {
    console.warn("   ⚠️  Could not clean stale enums (non-critical, continuing...).\n");
  }
}

// Execute the requested command
switch (command) {
  case "generate":
    run(prisma(`generate --schema "${SCHEMA}"`));
    break;

  case "push":
    run(prisma(`db push --schema "${SCHEMA}"`));
    break;

  case "push:force":
    run(prisma(`db push --accept-data-loss --schema "${SCHEMA}"`));
    break;

  case "migrate": {
    const name = process.argv[3] || "init";
    run(prisma(`migrate dev --schema "${SCHEMA}" --name "${name}"`));
    break;
  }

  case "studio":
    run(prisma(`studio --schema "${SCHEMA}"`));
    break;

  case "reset": {
    console.log("🔄 Resetting database...\n");

    if (hasValidMigrations()) {
      // Use migrate reset when we have valid migrations (skip auto-generate to avoid EPERM)
      run(prisma(`migrate reset --force --skip-generate --schema "${SCHEMA}"`));
    } else {
      // No valid migrations — use db push approach (skip auto-generate to avoid EPERM)
      console.log("   No valid migrations found. Using db push approach.\n");
      cleanMigrations();
      cleanStaleEnums();
      run(prisma(`db push --accept-data-loss --skip-generate --schema "${SCHEMA}"`));
    }

    run(prisma(`generate --schema "${SCHEMA}"`));
    console.log("\n✅ Database reset successfully!");
    break;
  }

  case "clean": {
    console.log("🧹 Cleaning database: wipe migrations → clean stale enums → push:force → generate\n");

    // Step 1: Remove all migration directories
    console.log("   Step 1/4: Removing old migrations...");
    cleanMigrations();

    // Step 2: Clean stale enum types that block db push
    console.log("\n   Step 2/4: Cleaning stale enum types...");
    cleanStaleEnums();

    // Step 3: Push schema directly to DB (accepts data loss, skip auto-generate to avoid EPERM)
    console.log("   Step 3/4: Pushing schema to database...");
    run(prisma(`db push --accept-data-loss --skip-generate --schema "${SCHEMA}"`));

    // Step 4: Generate Prisma client
    console.log("\n   Step 4/4: Generating Prisma client...");
    run(prisma(`generate --schema "${SCHEMA}"`));

    console.log("\n✅ Database cleaned successfully!");
    break;
  }

  case "seed": {
    const seedPath = join(DB_ROOT, "prisma", "seed.ts");
    run(`npx tsx --env-file="${ENV_FILE}" "${seedPath}"`);
    break;
  }

  case "seed:dev": {
    const seedPath = join(DB_ROOT, "prisma", "seed-dev.ts");
    run(`npx tsx --env-file="${ENV_FILE}" "${seedPath}"`);
    break;
  }

  default:
    console.error(`❌ Unknown command: ${command}`);
    console.error("   Available: generate, push, push:force, migrate, studio, reset, clean, seed, seed:dev");
    process.exit(1);
}
