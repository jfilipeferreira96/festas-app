import { config } from 'dotenv';
import { resolve } from 'path';
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { localization } from "better-auth-localization";
import prisma from "@festas/db";
import { sendEmailVerificationEmail, sendPasswordResetEmail } from "./email";

// Carregar variáveis de ambiente. O Next.js carrega automaticamente apps/web/.env;
// o ciclo abaixo mantém o pacote utilizável fora do Next (ex.: testes/vitest).
for (const candidate of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "apps/web/.env"),
]) {
  config({ path: candidate });
}

const envConfig = {
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  COOKIE_SECURE: process.env.COOKIE_SECURE,
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE,
  NODE_ENV: process.env.NODE_ENV || "development",
} as const;

// Required environment variables
const REQUIRED_ENV_VARS = ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL"] as const;

function validateEnv(config: typeof envConfig, required: readonly string[]) {
  const missing = required.filter((key) => !config[key as keyof typeof config]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

// Validate environment on module load
validateEnv(envConfig, REQUIRED_ENV_VARS);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  secret: envConfig.BETTER_AUTH_SECRET!,
  trustedOrigins: (() => {
    const rawOrigins = [
      envConfig.BETTER_AUTH_URL,
      envConfig.NEXT_PUBLIC_APP_URL,
      envConfig.CORS_ORIGIN,
      "http://localhost:4444",
      "http://localhost:5555",
      "http://localhost:3000",
    ].filter(Boolean) as string[];

    // Para cada URL, adicionar também a variante com protocolo alternativo
    const expanded = new Set<string>(rawOrigins);
    for (const url of rawOrigins) {
      try {
        const parsed = new URL(url);
        const altProto = parsed.protocol === "https:" ? "http:" : "https:";
        expanded.add(`${altProto}//${parsed.host}`);
      } catch {
        // URL inválida — ignorar
      }
    }
    return [...expanded];
  })(),
  baseURL: envConfig.BETTER_AUTH_URL || "http://localhost:5555",
  user: {
    additionalFields: {
      funcao: { type: "string", required: true, defaultValue: "ADMINISTRADOR" },
      activo: { type: "boolean", required: true, defaultValue: true },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user, url);
    },
    onPasswordReset: async ({ user }) => {
      if (envConfig.NODE_ENV !== "production") {
        console.log(`Password for user ${user.email} has been reset.`);
      }
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmailVerificationEmail(user, url);
    },
    sendOnSignUp: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 365, // 365 days (1 ano)
    updateAge: 60 * 60 * 24, // 1 day (sliding window)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60, // 1 hour (reduz hits à BD em hosting partilhado)
    },
  },
  account: {
    accountLinking: { enabled: false },
  },
  advanced: {
    defaultCookieAttributes: {
      // sameSite="none" + secure=true só funciona com HTTPS. Se o cPanel serve
      // via HTTP (sem SSL), usar sameSite="lax" + secure=false para que os
      // cookies funcionem. A variável COOKIE_SECURE permite override.
      sameSite: (envConfig.COOKIE_SAMESITE as "none" | "lax") || (envConfig.NODE_ENV === "production" && envConfig.COOKIE_SECURE !== "false" ? "none" : "lax"),
      secure: envConfig.COOKIE_SECURE === undefined ? (envConfig.NODE_ENV === "production") : envConfig.COOKIE_SECURE === "true",
      httpOnly: true,
    },
    cors: {
      origin: envConfig.CORS_ORIGIN || envConfig.NEXT_PUBLIC_APP_URL || "http://localhost:4444",
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    useSecureCookies: envConfig.COOKIE_SECURE === undefined ? (envConfig.NODE_ENV === "production") : envConfig.COOKIE_SECURE === "true",
  },
  plugins: [
    localization({
      defaultLocale: "pt-PT",
      fallbackLocale: "default"
    })
  ],
});

// ------------------------
// Export Types
// ------------------------
export type { Session, User, AuthSession, AuthenticatedExpressRequest, PossiblyAuthenticatedRequest, AuthenticatedControllerRequest, isAuthenticated } from "./types";
