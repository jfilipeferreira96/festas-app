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
  | "configuracoes"
  | "monitores"
  | "festas_acabar"
  | "clientes";

export type NivelAcesso = "sem_acesso" | "leitura" | "escrita" | "administracao";

export const MODULOS: Modulo[] = [
  "reservas",
  "cacifos",
  "menus",
  "lanche",
  "relatorios",
  "divulgacoes",
  "configuracoes",
  "monitores",
  "festas_acabar",
  "clientes",
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
  monitores: "Monitores",
  festas_acabar: "Festas a Acabar",
  clientes: "Clientes",
};

export const FUNCAO_LABELS: Record<FuncaoUtilizador, string> = {
  ADMINISTRADOR: "Administrador",
  LANCHE: "Lanche",
  CACIFOS: "Cacifos",
  MONITOR: "Monitor",
  FESTAS_ACABAR: "Festas a Acabar",
  STAFF: "Staff",
  RECECAO: "Receção",
};

export const FUNCOES: FuncaoUtilizador[] = [
  "ADMINISTRADOR",
  "LANCHE",
  "CACIFOS",
  "MONITOR",
  "FESTAS_ACABAR",
  "STAFF",
  "RECECAO",
];

// ── Matriz papel → módulo → nível ────────────
// ADMINISTRADOR: tudo.
// LANCHE: lanche (escrita) + menus (leitura).
// CACIFOS: cacifos (escrita) + reservas (leitura — ponto de vista festas/crianças).
// MONITOR: monitores (leitura — vê Gantt + notas diárias).
// FESTAS_ACABAR: festas_acabar (escrita — tabela de festas a acabar).
// RECECAO: reservas (escrita), clientes (escrita), cacifos (leitura) — faz check-in e cria reservas.
// STAFF: reservas (leitura), cacifos (escrita), festas_acabar (leitura) — apoio geral no parque.
export const PERMISSOES: Record<FuncaoUtilizador, Partial<Record<Modulo, NivelAcesso>>> = {
  ADMINISTRADOR: {
    reservas: "administracao",
    cacifos: "administracao",
    menus: "administracao",
    lanche: "administracao",
    relatorios: "administracao",
    divulgacoes: "administracao",
    configuracoes: "administracao",
    monitores: "administracao",
    festas_acabar: "administracao",
    clientes: "administracao",
  },
  LANCHE: {
    lanche: "escrita",
    menus: "leitura",
  },
  CACIFOS: {
    cacifos: "escrita",
    reservas: "leitura",
  },
  MONITOR: {
    monitores: "leitura",
  },
  FESTAS_ACABAR: {
    festas_acabar: "escrita",
  },
  RECECAO: {
    reservas: "escrita",
    clientes: "leitura",
    cacifos: "leitura",
  },
  STAFF: {
    reservas: "leitura",
    cacifos: "escrita",
    festas_acabar: "leitura",
  },
};

// ── Rota inicial por role ────────────────────
/**
 * Retorna a rota inicial (landing page) para um papel.
 * O tipo de retorno é uma união de literais de rotas reais para satisfazer
 * o `typedRoutes` do Next.js ao usar com `redirect()` / `<Link href>`.
 */
export type HomeRoute = "/dashboard" | "/lanche" | "/festas" | "/cacifos" | "/monitores" | "/festas-acabar" | "/reservas";

export function getHomeRoute(funcao: FuncaoUtilizador | undefined | null): HomeRoute {
  switch (funcao) {
    case "LANCHE":
      return "/lanche";
    case "CACIFOS":
      return "/cacifos";
    case "MONITOR":
      return "/monitores";
    case "FESTAS_ACABAR":
      return "/festas-acabar";
    case "RECECAO":
      return "/reservas";
    case "STAFF":
      return "/festas";
    default:
      return "/dashboard";
  }
}

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
