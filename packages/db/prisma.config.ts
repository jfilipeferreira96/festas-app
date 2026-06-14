import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import type { PrismaConfig } from "prisma";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use absolute paths — works identically on Windows and Linux
dotenv.config({
	path: path.join(__dirname, "..", "..", "apps", "web", ".env"),
});

export default {
	schema: path.join(__dirname, "prisma", "schema.prisma"),
	migrations: {
		path: path.join(__dirname, "prisma", "migrations"),
	},
} satisfies PrismaConfig;