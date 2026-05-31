"use client";

import { useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { permissoesApi } from "@/lib/api/permissoes";
import type { PermissaoInput, Modulo } from "@/lib/api/permissoes";

const LEVEL_ORDER: Record<string, number> = {
  sem_acesso: 0,
  leitura: 1,
  escrita: 2,
  administracao: 3,
};

/**
 * Hook for the current user's permissions.
 * Cached for 60 minutes (staleTime) to avoid excessive requests.
 * Provides canRead/canWrite/isAdmin helpers.
 */
export function useMinhasPermissoes() {
  const query = useQuery({
    queryKey: ["minhas-permissoes"],
    queryFn: permissoesApi.minhas,
    staleTime: 60 * 60 * 1000, // 60 minutes
    retry: 1,
  });

  const permissoes = query.data?.permissoes ?? {};

  const hasLevel = useCallback(
    (modulo: Modulo, minLevel: "leitura" | "escrita" | "administracao") => {
      const nivel = permissoes[modulo];
      if (!nivel) return false;
      return (LEVEL_ORDER[nivel] ?? 0) >= LEVEL_ORDER[minLevel];
    },
    [permissoes]
  );

  const helpers = useMemo(
    () => ({
      canRead: (modulo: Modulo) => hasLevel(modulo, "leitura"),
      canWrite: (modulo: Modulo) => hasLevel(modulo, "escrita"),
      isAdmin: (modulo: Modulo) => hasLevel(modulo, "administracao"),
      funcao: query.data?.funcao ?? null,
      permissoes,
    }),
    [hasLevel, permissoes, query.data?.funcao]
  );

  return { ...query, ...helpers };
}

export function usePermissoes() {
  return useQuery({
    queryKey: ["permissoes"],
    queryFn: permissoesApi.list,
  });
}

export function usePermissoesPorFuncao(funcao: string) {
  return useQuery({
    queryKey: ["permissoes", funcao],
    queryFn: () => permissoesApi.getByFuncao(funcao),
    enabled: !!funcao,
  });
}

export function useUpdatePermissao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PermissaoInput) => permissoesApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissoes"] });
      queryClient.invalidateQueries({ queryKey: ["minhas-permissoes"] });
    },
  });
}

export function useBulkUpdatePermissoes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (permissoes: PermissaoInput[]) => permissoesApi.bulkUpdate(permissoes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissoes"] });
      queryClient.invalidateQueries({ queryKey: ["minhas-permissoes"] });
    },
  });
}

export function useRestaurarDefaults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: permissoesApi.restaurarDefaults,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissoes"] });
      queryClient.invalidateQueries({ queryKey: ["minhas-permissoes"] });
    },
  });
}
