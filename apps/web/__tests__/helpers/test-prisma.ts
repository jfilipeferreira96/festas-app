import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createPrismaClient } from "@festas/db/mariadb-adapter";

// Load .env from the apps/web directory. fileURLToPath is used because
// import.meta.dirname is undefined under tsx/vitest CJS transpilation.
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

/**
 * Prisma client configured for the TEST database.
 *
 * MySQL uses a separate DATABASE for test isolation (PostgreSQL used a "schema").
 *
 * Uses the shared driver-adapter factory (@festas/db/mariadb-adapter) -
 * required because the schema has `previewFeatures = ["driverAdapters"]`
 * (the PrismaClient constructor no longer accepts a bare `datasources` URL).
 *
 * Resolution priority:
 *   1. DATABASE_URL_TEST - explicit test connection string
 *   2. Derived from DATABASE_URL by appending "_test" to the database name
 *      (e.g. mysql://user:pass@host:3306/festas -> .../festas_test)
 */
function getTestDatabaseUrl(): string {
  const explicit = process.env.DATABASE_URL_TEST;
  if (explicit) return explicit;

  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Replace only the database name segment of the mysql connection string.
  return baseUrl.replace(/(\/)([^/?]+)(\?.*)?$/, "$1$2_test$3");
}

const testPrisma = createPrismaClient(getTestDatabaseUrl());

export default testPrisma;
