import { PrismaClient } from "@prisma/client";

// ─── DB Target Resolution ────────────────────────────────────
/**
 * Resolve qual DATABASE_URL usar conforme DB_TARGET (apenas em dev).
 *
 * Em produção (NODE_ENV === "production"), DB_TARGET é ignorado.
 * A app usa o DATABASE_URL do .env.production.
 *
 * Targets disponíveis:
 *   local-prod   → DATABASE_URL_LOCAL_PROD  (default)
 *   local-test   → DATABASE_URL_LOCAL_TEST
 *   remote-prod  → DATABASE_URL_REMOTE_PROD (cPanel — DADOS REAIS!)
 */
export type DbTarget = "local-prod" | "local-test" | "remote-prod";

export interface DbInfo {
  target: DbTarget;
  host: string;
  port: string;
  schema: string;
  ambiente: string;
  isRemote: boolean;
  isTest: boolean;
}

function resolveDbTarget(): DbTarget {
  const raw = (process.env.DB_TARGET || "local-prod").toLowerCase().trim();
  if (raw === "local-test" || raw === "remote-prod" || raw === "local-prod") {
    return raw;
  }
  return "local-prod";
}

function parseDbUrl(url: string): { host: string; port: string; schema: string } {
  try {
    // mysql://user:pass@host:port/schema
    const match = url.match(/@([^:/]+):(\d+)\/(\w+)/);
    if (match) {
      return { host: match[1]!, port: match[2]!, schema: match[3]! };
    }
  } catch {
    // ignore
  }
  return { host: "?", port: "?", schema: "?" };
}

function resolveDatabaseUrl(): { url: string; info: DbInfo } {
  const isProd = process.env.NODE_ENV === "production";

  // Em produção, usar DATABASE_URL diretamente (.env.production)
  if (isProd) {
    const url = process.env.DATABASE_URL || "";
    const parsed = parseDbUrl(url);
    return {
      url,
      info: {
        target: "local-prod",
        host: parsed.host,
        port: parsed.port,
        schema: parsed.schema,
        ambiente: "production",
        isRemote: false,
        isTest: false,
      },
    };
  }

  // Em dev, resolver conforme DB_TARGET
  const target = resolveDbTarget();
  const urlMap: Record<DbTarget, string> = {
    "local-prod": process.env.DATABASE_URL_LOCAL_PROD || process.env.DATABASE_URL || "",
    "local-test": process.env.DATABASE_URL_LOCAL_TEST || process.env.DATABASE_URL_TEST || "",
    "remote-prod": process.env.DATABASE_URL_REMOTE_PROD || "",
  };

  const url = urlMap[target];
  if (!url) {
    console.error(`❌ DB_TARGET="${target}" mas a URL correspondente não está definida no .env`);
    console.error(`   Variável esperada: DATABASE_URL_${target.replace("-", "_").toUpperCase()}`);
    process.exit(1);
  }

  const parsed = parseDbUrl(url);

  // Override DATABASE_URL para que o Prisma use a BD correta
  process.env.DATABASE_URL = url;

  return {
    url,
    info: {
      target,
      host: parsed.host,
      port: parsed.port,
      schema: parsed.schema,
      ambiente: "development",
      isRemote: target === "remote-prod",
      isTest: target === "local-test",
    },
  };
}

// Resolver antes de criar o PrismaClient
const { info: dbInfo } = resolveDatabaseUrl();

// ─── Startup Log ─────────────────────────────────────────────
function printDbBanner(info: DbInfo) {
  const colors = {
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
    dim: "\x1b[2m",
    reset: "\x1b[0m",
    bold: "\x1b[1m",
  };

  const colorByTarget: Record<DbTarget, string> = {
    "local-prod": colors.green,
    "local-test": colors.yellow,
    "remote-prod": colors.red,
  };

  const iconByTarget: Record<DbTarget, string> = {
    "local-prod": "🟢",
    "local-test": "🟡",
    "remote-prod": "🔴",
  };

  const c = colorByTarget[info.target]!;
  const icon = iconByTarget[info.target]!;

  const lines = [
    `${c}╔══════════════════════════════════════════════╗${colors.reset}`,
    `${c}║  ${icon}  DATABASE — Baselandia                     ${c}║${colors.reset}`,
    `${c}║  Target:    ${info.target.padEnd(34)}║${colors.reset}`,
    `${c}║  Host:      ${(info.host + ":" + info.port).padEnd(34)}║${colors.reset}`,
    `${c}║  Schema:    ${info.schema.padEnd(34)}║${colors.reset}`,
    `${c}║  Ambiente:  ${info.ambiente.padEnd(34)}║${colors.reset}`,
    `${c}╚══════════════════════════════════════════════╝${colors.reset}`,
  ];

  if (info.isRemote) {
    lines.push(`${colors.red}${colors.bold}⚠️  ATENÇÃO: LIGADO À BD REMOTA DE PRODUÇÃO!${colors.reset}`);
    lines.push(`${colors.red}   Dados reais — cuidado com alterações.${colors.reset}`);
  }

  console.log(lines.join("\n"));
}

printDbBanner(dbInfo);

// ─── Prisma Client ───────────────────────────────────────────
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  __dbInfo: DbInfo | undefined;
};

const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn", "error"],
  });

// Guardar dbInfo no global para persistir através de HMR
if (!globalForPrisma.__dbInfo) {
  globalForPrisma.__dbInfo = dbInfo;
}

// In development, store on globalThis to survive HMR
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown: disconnect on process exit
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export { dbInfo };
export default prisma;