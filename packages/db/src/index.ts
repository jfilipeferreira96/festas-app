import { PrismaClient } from "@prisma/client";

// Global singleton pattern to prevent multiple PrismaClient instances
// during hot module reloading in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn", "error"],
    // Prisma handles connection pooling via the DATABASE_URL parameters
    // Make sure DATABASE_URL includes: ?connection_limit=10&pool_timeout=30
  });

// In development, store on globalThis to survive HMR
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown: disconnect on process exit
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export default prisma;
