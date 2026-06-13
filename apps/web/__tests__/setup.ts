import { config } from "dotenv";
import { resolve } from "path";

/**
 * Global test setup.
 * This file runs before all test files (configured in vitest.config.ts setupFiles).
 *
 * It loads environment variables from the apps/web .env file.
 *
 * IMPORTANT: Before running tests for the first time, ensure:
 *   1. MySQL is reachable and the test database exists
 *   2. Run the DB setup (creates the test DB + tables):
 *      npx tsx apps/web/__tests__/setup-db.ts
 *   (or set DATABASE_URL_TEST and run: npx prisma db push --schema packages/db/prisma/schema.prisma)
 */

// Load .env from the apps/web directory (one level up from __tests__)
config({ path: resolve(import.meta.dirname, "../.env") });
