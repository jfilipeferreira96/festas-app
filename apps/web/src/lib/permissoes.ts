// ============================================
// RBAC — Permissões HARDCODED (sem tabela na BD)
// ============================================
// Fonte de verdade para permissões por papel. Isomórfico (client + server).
// O papel vem de `session.user.funcao` (Better Auth + campo `funcao` no modelo User).

import type { FuncaoUtilizador } from "@saas/shared-types";

// ── Tipos ────────────────────────────────────
export type Modulo =
  | "reservas"
  | "cacifos"
  | "menus"
  | "lanche"
  | "relatorios"
  | "divulgacoes"
  | "configuracoes";

export type NivelAcesso = "sem_acesso" | "leitura" | "escrita" | "administracao";

export const MODULOS: Modulo[] = [
  "reservas",
  "cacifos",
  "menus",
  "lanche",
  "relatorios",
  "divulgacoes",
  "configuracoes",
];

export const NIVEIS_ACESSO: { value: NivelAcesso; label: string }[] = [
  { value: "sem_acesso", label: "Sem acesso" },
  { value: "leitura", label: "Leitura" },
  { value: "escrita", label: "Escrita" },
  { value: "administracao", label: "Administração" },
];

export const MODULO_LABELS: Record<Modulo, string> = {
  reservas: "Festas & Reservas",
  cacifos: "Cacifos",
  menus: "Menus",
  lanche: "Lanche",
  relatorios: "Relatórios",
  divulgacoes: "Marketing",
  configuracoes: "Configurações",
};

export const FUNCAO_LABELS: Record<FuncaoUtilizador, string> = {
  ADMINISTRADOR: "Administrador",
  LANCHE: "Lanche",
  CACIFOS: "Cacifos",
};

export const FUNCOES: FuncaoUtilizador[] = ["ADMINISTRADOR", "LANCHE", "CACIFOS"];

// ── Matriz papel → módulo → nível ────────────
// ADMINISTRADOR: tudo. LANCHE: lanche (escrita) + menus (leitura). CACIFOS: cacifos (escrita).
export const PERMISSOES: Record<FuncaoUtilizador, Partial<Record<Modulo, NivelAcesso>>> = {
  ADMINISTRADOR: {
    reservas: "administracao",
    cacifos: "administracao",
    menus: "administracao",
    lanche: "administracao",
    relatorios: "administracao",
    divulgacoes: "administracao",
    configuracoes: "administracao",
  },
  LANCHE: {
    lanche: "escrita",
    menus: "leitura",
  },
  CACIFOS: {
    cacifos: "escrita",
  },
};

const LEVEL_ORDER: Record<NivelAcesso, number> = {
  sem_acesso: 0,
  leitura: 1,
  escrita: 2,
  administracao: 3,
};

// ── Helpers ──────────────────────────────────

/** Retorna o nível de acesso de um papel num módulo (ou `sem_acesso`). */
export function getNivel(funcao: FuncaoUtilizador | undefined | null, modulo: Modulo): NivelAcesso {
  if (!funcao) return "sem_acesso";
  return PERMISSOES[funcao]?.[modulo] ?? "sem_acesso";
}

/** Verifica se um papel tem pelo menos `minLevel` num módulo. */
export function hasAccess(
  funcao: FuncaoUtilizador | undefined | null,
  modulo: Modulo,
  minLevel: NivelAcesso = "leitura"
): boolean {
  const nivel = getNivel(funcao, modulo);
  return LEVEL_ORDER[nivel] >= LEVEL_ORDER[minLevel];
}

/** Helpers de conveniência. */
export function canRead(funcao: FuncaoUtilizador | undefined | null, modulo: Modulo): boolean {
  return hasAccess(funcao, modulo, "leitura");
}
export function canWrite(funcao: FuncaoUtilizador | undefined | null, modulo: Modulo): boolean {
  return hasAccess(funcao, modulo, "escrita");
}
export function isModuleAdmin(funcao: FuncaoUtilizador | undefined | null, modulo: Modulo): boolean {
  return hasAccess(funcao, modulo, "administracao");
}

/** É administrador global (papel ADMINISTRADOR). */
export function isAdmin(funcao: FuncaoUtilizador | undefined | null): boolean {
  return funcao === "ADMINISTRADOR";
}

/** Mapa módulo→nível para um papel (para uso em hooks/UI). */
export function getPermissoesPorFuncao(
  funcao: FuncaoUtilizador | undefined | null
): Partial<Record<Modulo, NivelAcesso>> {
  if (!funcao) return {};
  return PERMISSOES[funcao] ?? {};
}
