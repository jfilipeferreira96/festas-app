"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { festasAcabarApi } from "@/lib/api/festasAcabar";
import type { EstadoLanche } from "@saas/shared-types";

export function useFestasAcabar() {
  return useQuery({
    queryKey: ["festas-acabar"],
    queryFn: () => festasAcabarApi.getAll(),
    refetchInterval: 60_000,
  });
}

export function useEntradasAcabar() {
  return useQuery({
    queryKey: ["festas-acabar-entradas"],
    queryFn: () => festasAcabarApi.getEntradas(),
    refetchInterval: 60_000,
  });
}

export function useAtualizarFestaAcabar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reservaId,
      data,
    }: {
      reservaId: string;
      data: { observacoesLesoes?: string; observacoesBrindes?: string; observacoesBrindesPais?: string };
    }) => festasAcabarApi.atualizar(reservaId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["festas-acabar"] });
    },
  });
}

/** Confirmação do lanche de uma entrada livre (balcão). */
export function useAtualizarLancheEntradaAcabar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entradaLivreId, estadoLanche }: { entradaLivreId: string; estadoLanche: EstadoLanche }) =>
      festasAcabarApi.atualizarLancheEntrada(entradaLivreId, estadoLanche),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["festas-acabar-entradas"] });
      qc.invalidateQueries({ queryKey: ["lanches"] });
    },
  });
}

/** Finaliza (conclui) uma festa em curso. */
export function useFinalizarFesta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reservaId: string) => festasAcabarApi.finalizar(reservaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["festas-acabar"] });
      qc.invalidateQueries({ queryKey: ["reservas"] });
      qc.invalidateQueries({ queryKey: ["cacifos"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
