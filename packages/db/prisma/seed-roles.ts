/**
 * SINGLE SOURCE OF TRUTH for seed users.
 *
 * Both seed-dev.ts and seed-prod.ts import this to guarantee that
 * the email prefix, password env var and display name are ALWAYS in sync.
 *
 * To add/remove a role: edit ONLY this file.
 */

import type { FuncaoUtilizador } from "@prisma/client";

export interface SeedRoleConfig {
  funcao: FuncaoUtilizador;
  prefix: string; // Email prefix → `{prefix}@{domain}`
  name: string;
  passwordEnv: string; // Env var name for the password
}

export const SEED_ROLE_CONFIG: SeedRoleConfig[] = [
  { funcao: "ADMINISTRADOR", prefix: "admin",         name: "Administrador",   passwordEnv: "SEED_ADMIN_PASSWORD" },
  { funcao: "LANCHE",        prefix: "lanche",        name: "Lanche",          passwordEnv: "SEED_LANCHE_PASSWORD" },
  { funcao: "CACIFOS",       prefix: "cacifos",       name: "Cacifos",         passwordEnv: "SEED_CACIFOS_PASSWORD" },
  { funcao: "MONITOR",       prefix: "monitor",       name: "Monitor",         passwordEnv: "SEED_MONITOR_PASSWORD" },
  { funcao: "FESTAS_ACABAR", prefix: "festas-acabar", name: "Festas a Acabar", passwordEnv: "SEED_FESTAS_ACABAR_PASSWORD" },
  { funcao: "STAFF",         prefix: "staff",         name: "Staff",           passwordEnv: "SEED_STAFF_PASSWORD" },
  { funcao: "RECECAO",       prefix: "rececao",       name: "Receção",         passwordEnv: "SEED_RECECAO_PASSWORD" },
];

/**
 * Build the full user list from env vars.
 * Used by both seed-dev and seed-prod so they NEVER diverge.
 */
export function getSeedUsers() {
  const emailDomain = process.env.SEED_EMAIL_DOMAIN || "baselandia.pt";
  const defaultPassword = process.env.SEED_USER_PASSWORD || "ExamplePass";

  return SEED_ROLE_CONFIG.map((r) => ({
    id: `${r.prefix}-001`,
    email: `${r.prefix}@${emailDomain}`,
    name: r.name,
    funcao: r.funcao,
    password: process.env[r.passwordEnv] || defaultPassword,
  }));
}