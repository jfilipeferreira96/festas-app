import { config } from 'dotenv';
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { localization } from "better-auth-localization";
import prisma from "@festas/db";
import { sendEmailVerificationEmail, sendPasswordResetEmail } from "./email";

// Carregar variáveis de ambiente do .env do backend
config({ path: '../../apps/server/.env' });

const envConfig = {
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
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
    provider: "postgresql",
  }),
  secret: envConfig.BETTER_AUTH_SECRET!,
  trustedOrigins: [envConfig.CORS_ORIGIN || "http://localhost:4444"],
  baseURL: envConfig.BETTER_AUTH_URL || "http://localhost:5555",
  user: {
    additionalFields: {
      funcao: { type: "string", required: true, defaultValue: "RECECAO" },
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
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  account: {
    accountLinking: { enabled: false },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: envConfig.NODE_ENV === "production" ? "none" : "lax",
      secure: envConfig.NODE_ENV === "production",
      httpOnly: true,
    },
    cors: {
      origin: envConfig.CORS_ORIGIN || "http://localhost:4444",
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    useSecureCookies: envConfig.NODE_ENV === "production",
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
