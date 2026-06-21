"use client";

import { useMemo } from "react";
import {
  canRead as canReadFn,
  canWrite as canWriteFn,
  isModuleAdmin as isModuleAdminFn,
  isAdmin as isGlobalAdminFn,
  hasAccess as hasAccessFn,
  getPermissoesPorFuncao,
  type Modulo,
  type NivelAcesso,
} from "@/lib/permissoes";
import type { FuncaoUtilizador } from "@saas/shared-types";
import { useUser } from "@/contexts/AuthContext";

/**
 * Hook for the current user's permissions (client-side, hardcoded matrix).
 * No API call — reads `funcao` from the auth context and resolves access
 * synchronously via `lib/permissoes`.
 *
 * Provides canRead / canWrite / isAdmin (module-level) / isGlobalAdmin helpers.
 * `isLoading` is always `false` (synchronous resolution).
 */
export function useMinhasPermissoes() {
  const { user } = useUser();
  const funcao = (user?.funcao as FuncaoUtilizador | undefined) ?? undefined;

  const helpers = useMemo(
    () => ({
      canRead: (modulo: Modulo) => canReadFn(funcao, modulo),
      canWrite: (modulo: Modulo) => canWriteFn(funcao, modulo),
      isAdmin: (modulo: Modulo) => isModuleAdminFn(funcao, modulo),
      isGlobalAdmin: isGlobalAdminFn(funcao),
      hasAccess: (modulo: Modulo, minLevel: NivelAcesso) =>
        hasAccessFn(funcao, modulo, minLevel),
      funcao: funcao ?? null,
      permissoes: getPermissoesPorFuncao(funcao),
      isLoading: false as const,
    }),
    [funcao]
  );

  return helpers;
}

/**
 * Returns the permission matrix for a given role (synchronous, hardcoded).
 */
export function usePermissoesPorFuncao(
  funcao: FuncaoUtilizador | undefined | null
) {
  return useMemo(() => getPermissoesPorFuncao(funcao), [funcao]);
}
