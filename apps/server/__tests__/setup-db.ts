import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from server directory
config({ path: resolve(__dirname, "../.env") });

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl)
{
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

// Remove any existing schema parameter and add test schema
const urlWithoutSchema = baseUrl.replace(/[?&]schema=[^&]+/, "");
const separator = urlWithoutSchema.includes("?") ? "&" : "?";
const testUrl = `${urlWithoutSchema}${separator}schema=testfestas`;

console.log("Test URL schema param set");

const { execSync } = await import("child_process");

// Step 1: Create test schema using prisma db execute (url only)
console.log("Creating test schema in PostgreSQL...");
try
{
    execSync(
    `npx prisma db execute --url "${testUrl}" --stdin`,
    {
      input: "CREATE SCHEMA IF NOT EXISTS testfestas;",
      cwd: resolve(__dirname),
      stdio: ["pipe", "inherit", "inherit"],
    }
  );
  console.log("✅ Test schema created");
} catch (error)
{
  console.error("❌ Failed to create test schema:", error);
  process.exit(1);
}

// Step 2: Push the Prisma schema to the test schema
console.log("Pushing Prisma schema to test schema...");
try
{
  execSync(
    `npx prisma db push --schema ../../packages/db/prisma/schema.prisma --accept-data-loss`,
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
} catch (error)
{
  console.error("❌ Failed to push schema:", error);
  process.exit(1);
}