"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lancheApi } from "@/lib/api/lanche";

export function useLanchesDoDia(data?: string) {
  return useQuery({
    queryKey: ["lanches", data],
    queryFn: () => lancheApi.getLanchesDoDia(data),
  });
}

export function useAlergias(data?: string) {
  return useQuery({
    queryKey: ["alergias", data],
    queryFn: () => lancheApi.getAlergias(data),
  });
}

export function useAtualizarNotasLanche() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reservaId,
      data,
    }: {
      reservaId: string;
      data: { notasLanche?: string; itensLanche?: unknown; observacoesLesoes?: string; horaLanche?: string | null };
    }) => lancheApi.atualizarNotas(reservaId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lanches"] });
      qc.invalidateQueries({ queryKey: ["alergias"] });
    },
  });
}

export function useAtualizarEstadoLanche() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reservaId, estado }: { reservaId: string; estado: string }) =>
      lancheApi.atualizarEstado(reservaId, estado),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lanches"] });
    },
  });
}

export function useAtualizarEstadoLancheEntrada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entradaLivreId, estado }: { entradaLivreId: string; estado: string }) =>
      lancheApi.atualizarEstadoEntrada(entradaLivreId, estado),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lanches"] });
    },
  });
}
