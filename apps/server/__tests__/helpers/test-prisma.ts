import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env from server directory before anything else
config({ path: resolve(import.meta.dirname, "../../.env") });

/**
 * Prisma client configured for the 'test' schema.
 * This ensures test data is isolated from development/production data.
 */
function getTestDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Remove any existing schema parameter
  const urlWithoutSchema = baseUrl.replace(/[?&]schema=[^&]+/, "");

  // Add the test schema parameter
  const separator = urlWithoutSchema.includes("?") ? "&" : "?";
  return `${urlWithoutSchema}${separator}schema=testfestas`;
}

const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: getTestDatabaseUrl(),
    },
  },
});

export default testPrisma;