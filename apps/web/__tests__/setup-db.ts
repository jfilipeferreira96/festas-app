import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the apps/web directory (one level up from __tests__)
config({ path: resolve(__dirname, "../.env") });

/**
 * Returns the MySQL connection string for the TEST database.
 * Priority: DATABASE_URL_TEST, otherwise append "_test" to the database name.
 */
function getTestDatabaseUrl(): string {
  const explicit = process.env.DATABASE_URL_TEST;
  if (explicit) return explicit;

  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  return baseUrl.replace(/(\/)([^/?]+)(\?.*)?$/, "$1$2_test$3");
}

/** Extracts the database name from a mysql connection string. */
function getDbName(url: string): string {
  const match = url.match(/\/([^/?]+)(?:\?|$)/);
  return match ? match[1] : "festas_test";
}

/** Returns a connection URL that points at the MySQL SERVER (no specific db). */
function getServerUrl(url: string): string {
  // Strip the trailing path segment (database name + any query string).
  return url.replace(/\/[^/]*$/, "");
}

const testUrl = getTestDatabaseUrl();
const testDbName = getDbName(testUrl);

console.log("Test database name:", testDbName);

const { execSync } = await import("child_process");

// Step 1: Create the test database (MySQL) if it doesn't exist.
// NOTE: In cPanel, databases are usually created via the UI (prefixed with the
// cPanel username). If the DB user lacks CREATE DATABASE privileges, create the
// database manually in cPanel and set DATABASE_URL_TEST. This command is a no-op
// when the database already exists.
console.log("Creating test database in MySQL...");
try {
  const serverUrl = getServerUrl(testUrl);
  execSync(`npx prisma db execute --url "${serverUrl}" --stdin`, {
    input: `CREATE DATABASE IF NOT EXISTS \`${testDbName}\`;`,
    cwd: resolve(__dirname),
    stdio: ["pipe", "inherit", "inherit"],
  });
  console.log("✅ Test database ready");
} catch (error) {
  console.error("❌ Failed to create test database:", error);
  console.error(
    "   If you lack CREATE DATABASE privileges (e.g. shared cPanel), create the database manually in cPanel and set DATABASE_URL_TEST."
  );
  process.exit(1);
}

// Step 2: Push the Prisma schema to the test database.
console.log("Pushing Prisma schema to test database...");
try {
  execSync(
    `npx prisma db push --schema ../../../packages/db/prisma/schema.prisma --accept-data-loss`,
    {
      cwd: resolve(__dirname),
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: testUrl,
      },
    }
  );
  console.log("✅ Test database tables created");
} catch (error) {
  console.error("❌ Failed to push schema:", error);
  process.exit(1);
}
