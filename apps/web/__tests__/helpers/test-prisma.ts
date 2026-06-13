import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env from the apps/web directory (resolve relative to this file's location)
config({ path: resolve(import.meta.dirname, "../../.env") });

/**
 * Prisma client configured for the TEST database.
 *
 * MySQL uses a separate DATABASE for test isolation (PostgreSQL used a "schema").
 *
 * Resolution priority:
 *   1. DATABASE_URL_TEST — explicit test connection string
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

const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: getTestDatabaseUrl(),
    },
  },
});

export default testPrisma;
