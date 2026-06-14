import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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
 */

// Robust __dirname for both vitest (Vite) and tsx/node (CJS). import.meta.dirname
// is undefined when these files are transpiled to CJS, so use fileURLToPath instead.
const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, "../.env") });
