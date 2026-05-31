import { config } from "dotenv";
import { resolve } from "path";

/**
 * Global test setup.
 * This file runs before all test files (configured in vitest.config.ts setupFiles).
 * 
 * It loads environment variables from the server's .env file.
 * 
 * IMPORTANT: Before running tests for the first time, ensure:
 *   1. PostgreSQL is running
 *   2. The 'test' schema exists with all tables:
 *      cd packages/db && DATABASE_URL="<your-url>?schema=testfestas" npx prisma db push
 */

// Load .env from the server directory (resolve relative to this file's location)
config({ path: resolve(import.meta.dirname, "../../.env") });
