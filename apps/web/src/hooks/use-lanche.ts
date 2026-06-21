"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lancheApi, type AtualizarNotasInput } from "@/lib/api/lanche";

export function useLanchesDoDia(data?: string) {
  return useQuery({
    queryKey: ["lanche", "dia", data ?? "hoje"],
    queryFn: () => lancheApi.getLanchesDoDia(data),
  });
}

export function useAlergias(data?: string) {
  return useQuery({
    queryKey: ["lanche", "alergias", data ?? "hoje"],
    queryFn: () => lancheApi.getAlergias(data),
  });
}

export function useAtualizarNotasLanche() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reservaId, data }: { reservaId: string; data: AtualizarNotasInput }) =>
      lancheApi.atualizarNotas(reservaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lanche"] });
    },
  });
}
